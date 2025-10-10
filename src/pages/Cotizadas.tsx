import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuth } from "firebase/auth";
import { 
  Clock, 
  MapPin, 
  Euro, 
  Users, 
  Search,
  Eye,
  Calendar,
  CheckCircle,
  AlertCircle,
  Package,
  Image,
  FileText,
  MessageSquare,
  Download
} from "lucide-react";

type ProposalItem = {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  comments?: string;
};

type Proposal = {
  id: number;
  companyId: number;
  solicitudId: number;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  items: ProposalItem[];
  // Datos de la solicitud
  solicitud?: {
    titulo: string;
    ubicacion: string;
    clientName: string;
    clientCity: string;
  };
};

type QuickResponse = {
  id: number;
  companyId: number;
  companyName: string;
  solicitudId: number;
  responseType: string; // 'message', 'image', 'excel'
  message?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  fileSize?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  // Datos de la solicitud
  solicitud?: {
    titulo: string;
    ubicacion: string;
    clientName: string;
    clientCity: string;
  };
};

type CombinedProposal = (Proposal | QuickResponse) & {
  type: 'traditional' | 'quick';
};

const Cotizadas = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<CombinedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [companyData, setCompanyData] = useState<any>(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchCompanyDataAndProposals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Obtener datos de la empresa actual
        console.log("🔍 Obteniendo datos de empresa para UID:", user.uid);
        const companyResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
        
        if (companyResponse.ok) {
          const userData = await companyResponse.json();
          console.log("🏢 Datos de empresa obtenidos:", userData);
          setCompanyData(userData);
          
          // 2. Obtener propuestas de esta empresa
          await fetchProposals(userData.id);
        } else {
          console.error("❌ No se pudo obtener datos de la empresa");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error obteniendo datos:", error);
        setLoading(false);
      }
    };

    fetchCompanyDataAndProposals();
  }, [user]);

  const fetchProposals = async (companyId: number) => {
    try {
      console.log("🔍 Obteniendo propuestas para empresa ID:", companyId);
      console.log("📡 URL propuestas tradicionales:", `http://localhost:8090/api/proposals/company/${companyId}?page=0&size=20`);
      console.log("📡 URL respuestas rápidas:", `http://localhost:8090/api/proposals/quick-responses/company/${companyId}?page=0&size=20`);
      
      // Cargar propuestas tradicionales
      const proposalsResponse = await fetch(`http://localhost:8090/api/proposals/company/${companyId}?page=0&size=20`);
      console.log("📊 Response status propuestas:", proposalsResponse.status);
      
      // Cargar respuestas rápidas  
      const quickResponsesResponse = await fetch(`http://localhost:8090/api/proposals/quick-responses/company/${companyId}?page=0&size=20`);
      console.log("📱 Response status respuestas rápidas:", quickResponsesResponse.status);
      
      let allProposals: CombinedProposal[] = [];
      
      // Procesar propuestas tradicionales
      if (proposalsResponse.ok) {
        const proposalsData = await proposalsResponse.json();
        console.log("📦 Propuestas tradicionales obtenidas:", proposalsData);
        console.log("📦 Número de propuestas tradicionales:", proposalsData.length || (proposalsData.content && proposalsData.content.length) || 0);
        
        const proposalsList = proposalsData.content || proposalsData;
        
        const enrichedProposals = await Promise.all(
          proposalsList.map(async (proposal: Proposal) => {
            const enrichedProposal = await enrichProposalWithSolicitud(proposal);
            return {
              ...enrichedProposal,
              type: 'traditional' as const
            };
          })
        );
        
        console.log("✅ Propuestas tradicionales procesadas:", enrichedProposals.length);
        allProposals = [...allProposals, ...enrichedProposals];
      } else {
        console.error("❌ Error al obtener propuestas tradicionales:", proposalsResponse.status, await proposalsResponse.text());
      }
      
      // Procesar respuestas rápidas
      if (quickResponsesResponse.ok) {
        const quickResponsesData = await quickResponsesResponse.json();
        console.log("📱 Respuestas rápidas obtenidas:", quickResponsesData);
        console.log("📱 Número de respuestas rápidas:", quickResponsesData.length || (quickResponsesData.content && quickResponsesData.content.length) || 0);
        
        const quickResponsesList = quickResponsesData.content || quickResponsesData;
        
        const enrichedQuickResponses = await Promise.all(
          quickResponsesList.map(async (quickResponse: QuickResponse) => {
            const enrichedResponse = await enrichQuickResponseWithSolicitud(quickResponse);
            return {
              ...enrichedResponse,
              type: 'quick' as const
            };
          })
        );
        
        console.log("✅ Respuestas rápidas procesadas:", enrichedQuickResponses.length);
        allProposals = [...allProposals, ...enrichedQuickResponses];
      } else {
        console.error("❌ Error al obtener respuestas rápidas:", quickResponsesResponse.status, await quickResponsesResponse.text());
      }
      
      // Ordenar por fecha de creación (más recientes primero)
      allProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log("🎯 Total de propuestas combinadas:", allProposals.length);
      console.log("📊 Propuestas finales:", allProposals);
      
      setProposals(allProposals);
      
    } catch (error) {
      console.error("❌ Error al cargar propuestas:", error);
    } finally {
      setLoading(false);
    }
  };

  const enrichProposalWithSolicitud = async (proposal: Proposal) => {
    try {
      const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${proposal.solicitudId}`);
      if (solicitudResponse.ok) {
        const solicitudData = await solicitudResponse.json();
        
        let clientName = "Cliente Anónimo";
        let clientCity = solicitudData.ciudadOrigen || "Sin ciudad";
        
        if (solicitudData.usuarioId) {
          try {
            const clientResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${solicitudData.usuarioId}`);
            if (clientResponse.ok) {
              const clientData = await clientResponse.json();
              clientName = clientData.nombreCompleto || "Cliente Anónimo";
              clientCity = clientData.ciudad || solicitudData.ciudadOrigen || "Sin ciudad";
            }
          } catch (error) {
            console.warn("⚠️ No se pudo obtener datos del cliente:", error);
          }
        }
        
        return {
          ...proposal,
          solicitud: {
            titulo: solicitudData.titulo || "Sin título",
            ubicacion: solicitudData.ciudadOrigen || "Sin ubicación",
            clientName,
            clientCity
          }
        };
      }
      return proposal;
    } catch (error) {
      console.warn("⚠️ Error obteniendo datos de solicitud:", error);
      return proposal;
    }
  };

  const enrichQuickResponseWithSolicitud = async (quickResponse: QuickResponse) => {
    try {
      const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${quickResponse.solicitudId}`);
      if (solicitudResponse.ok) {
        const solicitudData = await solicitudResponse.json();
        
        let clientName = "Cliente Anónimo";
        let clientCity = solicitudData.ciudadOrigen || "Sin ciudad";
        
        if (solicitudData.usuarioId) {
          try {
            const clientResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${solicitudData.usuarioId}`);
            if (clientResponse.ok) {
              const clientData = await clientResponse.json();
              clientName = clientData.nombreCompleto || "Cliente Anónimo";
              clientCity = clientData.ciudad || solicitudData.ciudadOrigen || "Sin ciudad";
            }
          } catch (error) {
            console.warn("⚠️ No se pudo obtener datos del cliente:", error);
          }
        }
        
        return {
          ...quickResponse,
          solicitud: {
            titulo: solicitudData.titulo || "Sin título",
            ubicacion: solicitudData.ciudadOrigen || "Sin ubicación",
            clientName,
            clientCity
          }
        };
      }
      return quickResponse;
    } catch (error) {
      console.warn("⚠️ Error obteniendo datos de solicitud:", error);
      return quickResponse;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "enviada": return "bg-blue-100 text-blue-800 border-blue-200";
      case "aceptada": return "bg-green-100 text-green-800 border-green-200";
      case "rechazada": return "bg-red-100 text-red-800 border-red-200";
      case "pendiente": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "en_revision": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "enviada": return <Clock className="h-4 w-4" />;
      case "aceptada": return <CheckCircle className="h-4 w-4" />;
      case "rechazada": return <AlertCircle className="h-4 w-4" />;
      case "pendiente": return <Clock className="h-4 w-4" />;
      case "en_revision": return <Eye className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "enviada": return "Enviada al cliente";
      case "aceptada": return "Aceptada por cliente";
      case "rechazada": return "Rechazada";
      case "pendiente": return "Pendiente de revisión";
      case "en_revision": return "En revisión";
      default: return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.solicitud?.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.solicitud?.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || proposal.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Propuestas Enviadas</h1>
            <p className="text-gray-600">Gestiona todas las cotizaciones que has enviado</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {proposals.length} respuesta{proposals.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              {proposals.filter(p => p.type === 'traditional').length} detallada{proposals.filter(p => p.type === 'traditional').length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {proposals.filter(p => p.type === 'quick').length} rápida{proposals.filter(p => p.type === 'quick').length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por título o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="all">Todos los estados</option>
            <option value="enviada">Enviadas</option>
            <option value="aceptada">Aceptadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>

        {/* Lista de propuestas */}
        {filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== "all" ? "No se encontraron respuestas" : "No has enviado respuestas aún"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== "all" 
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Cuando envíes cotizaciones o respuestas rápidas, aparecerán aquí"
                }
              </p>
              {(!searchTerm && filterStatus === "all") && (
                <Button onClick={() => navigate("/backoffice")}>
                  Ver Solicitudes Pendientes
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProposals.map((proposal) => (
              <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          {proposal.solicitud?.titulo || `${proposal.type === 'quick' ? 'Respuesta Rápida' : 'Propuesta'} #${proposal.id}`}
                        </CardTitle>
                        <Badge variant="outline" className={
                          proposal.type === 'quick' 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }>
                          {proposal.type === 'quick' ? '⚡ Rápida' : '📋 Detallada'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {proposal.solicitud?.clientName || "Cliente Anónimo"}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {proposal.solicitud?.clientCity || "Sin ubicación"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(proposal.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(proposal.status)} border px-3 py-1`}>
                        {getStatusIcon(proposal.status)}
                        <span className="ml-1">{getStatusText(proposal.status)}</span>
                      </Badge>
                      {proposal.status.toLowerCase() === "enviada" && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          ✓ Activa
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {proposal.type === 'traditional' ? (
                      // Renderizado para propuestas tradicionales
                      <>
                        {/* Resumen de ítems */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-sm">Ítems cotizados:</span>
                          </div>
                          <div className="space-y-1">
                            {(proposal as Proposal & { type: 'traditional' }).items.slice(0, 2).map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.quantity}x {item.productName}
                                </span>
                                <span className="font-medium">
                                  {formatPrice(item.totalPrice)}
                                </span>
                              </div>
                            ))}
                            {(proposal as Proposal & { type: 'traditional' }).items.length > 2 && (
                              <div className="text-xs text-gray-500 pt-1">
                                +{(proposal as Proposal & { type: 'traditional' }).items.length - 2} ítem{(proposal as Proposal & { type: 'traditional' }).items.length - 2 !== 1 ? 's' : ''} más
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Total y acciones */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              Total de la propuesta
                            </p>
                            <p className="text-2xl font-bold text-primary">
                              {formatPrice((proposal as Proposal & { type: 'traditional' }).total)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(proposal as Proposal & { type: 'traditional' }).items.length} ítem{(proposal as Proposal & { type: 'traditional' }).items.length !== 1 ? 's' : ''} • {(proposal as Proposal & { type: 'traditional' }).currency}
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/backoffice/proposal-detail?id=${proposal.id}`)}
                            className="bg-white hover:bg-blue-50 border-blue-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </div>
                      </>
                    ) : (
                      // Renderizado para respuestas rápidas
                      <>
                        {/* Contenido de respuesta rápida */}
                        <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {(proposal as QuickResponse & { type: 'quick' }).responseType === 'image' && <Image className="h-4 w-4 text-blue-600" />}
                              {(proposal as QuickResponse & { type: 'quick' }).responseType === 'excel' && <FileText className="h-4 w-4 text-green-600" />}
                              {(proposal as QuickResponse & { type: 'quick' }).responseType === 'message' && <MessageSquare className="h-4 w-4 text-gray-600" />}
                              <span className="font-medium text-sm text-blue-800">
                                Respuesta Rápida - {(proposal as QuickResponse & { type: 'quick' }).responseType === 'image' ? 'Imagen' : (proposal as QuickResponse & { type: 'quick' }).responseType === 'excel' ? 'Archivo Excel' : 'Mensaje'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Contenido según el tipo */}
                          {(proposal as QuickResponse & { type: 'quick' }).responseType === 'message' && (proposal as QuickResponse & { type: 'quick' }).message && (
                            <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                              {(proposal as QuickResponse & { type: 'quick' }).message}
                            </div>
                          )}
                          
                          {(proposal as QuickResponse & { type: 'quick' }).responseType === 'image' && (proposal as QuickResponse & { type: 'quick' }).fileUrl && (
                            <div className="space-y-2">
                              <img 
                                src={(proposal as QuickResponse & { type: 'quick' }).fileUrl} 
                                alt="Respuesta de la empresa"
                                className="max-w-full h-auto rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => window.open((proposal as QuickResponse & { type: 'quick' }).fileUrl, '_blank')}
                              />
                              <p className="text-xs text-gray-500">
                                {(proposal as QuickResponse & { type: 'quick' }).fileName} • 
                                {(proposal as QuickResponse & { type: 'quick' }).fileSize && ` ${Math.round((proposal as QuickResponse & { type: 'quick' }).fileSize! / 1024)} KB`}
                              </p>
                            </div>
                          )}
                          
                          {(proposal as QuickResponse & { type: 'quick' }).responseType === 'excel' && (proposal as QuickResponse & { type: 'quick' }).fileUrl && (
                            <div className="flex items-center gap-3 bg-white p-3 rounded border">
                              <FileText className="h-8 w-8 text-green-600" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{(proposal as QuickResponse & { type: 'quick' }).fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {(proposal as QuickResponse & { type: 'quick' }).fileSize && `${Math.round((proposal as QuickResponse & { type: 'quick' }).fileSize! / 1024)} KB`} • 
                                  {(proposal as QuickResponse & { type: 'quick' }).fileType}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open((proposal as QuickResponse & { type: 'quick' }).fileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Descargar
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Acciones para respuesta rápida */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">
                              Respuesta enviada el {formatDate((proposal as QuickResponse & { type: 'quick' }).createdAt)}
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/backoffice/quick-response-detail?id=${proposal.id}`)}
                            className="bg-white hover:bg-blue-50 border-blue-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Conversación
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Cotizadas;