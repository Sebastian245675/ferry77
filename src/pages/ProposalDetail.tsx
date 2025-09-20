import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Package,
  FileText,
  Eye,
  DollarSign,
  MessageSquare
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
};

type Solicitud = {
  id: number;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  presupuesto: number;
  urgencia: string;
  fechaCreacion: string;
  usuarioId: string;
  categoria: string;
  clientName?: string;
  clientCity?: string;
};

const ProposalDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const proposalId = queryParams.get("id");

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (proposalId) {
      fetchProposalDetails();
    } else {
      setError("ID de propuesta no especificado");
      setLoading(false);
    }
  }, [proposalId]);

  const fetchProposalDetails = async () => {
    try {
      // Obtener detalles de la propuesta
      const proposalResponse = await fetch(`http://localhost:8090/api/proposals/${proposalId}`);
      
      if (!proposalResponse.ok) {
        throw new Error("Propuesta no encontrada");
      }

      const proposalData = await proposalResponse.json();
      setProposal(proposalData);

      // Obtener detalles de la solicitud
      const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${proposalData.solicitudId}`);
      
      if (solicitudResponse.ok) {
        const solicitudData = await solicitudResponse.json();
        
        // Obtener datos del cliente
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

        setSolicitud({
          ...solicitudData,
          clientName,
          clientCity
        });
      }

    } catch (error) {
      console.error("❌ Error al cargar detalles:", error);
      setError("Error al cargar los detalles de la propuesta");
    } finally {
      setLoading(false);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "alta": return "bg-red-100 text-red-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baja": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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

  if (error || !proposal) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => navigate("/backoffice/cotizadas")}>
                Volver a Cotizadas
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/backoffice/cotizadas")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Detalles de Propuesta #{proposal.id}
            </h1>
            <p className="text-gray-600">
              {solicitud?.titulo || "Propuesta enviada"}
            </p>
          </div>
          <Badge className={`${getStatusColor(proposal.status)} border px-3 py-1`}>
            {getStatusIcon(proposal.status)}
            <span className="ml-1">{getStatusText(proposal.status)}</span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información de la Solicitud */}
          <div className="lg:col-span-2 space-y-6">
            {solicitud && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Información de la Solicitud
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{solicitud.titulo}</h3>
                    <p className="text-gray-600">{solicitud.descripcion}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Cliente</p>
                        <p className="font-medium">{solicitud.clientName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Ubicación</p>
                        <p className="font-medium">{solicitud.clientCity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Presupuesto Cliente</p>
                        <p className="font-medium">{formatPrice(solicitud.presupuesto)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-500">Urgencia</p>
                        <Badge className={getUrgencyColor(solicitud.urgencia)}>
                          {solicitud.urgencia}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detalles de la Propuesta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Detalles de tu Propuesta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proposal.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.productName}</h4>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity} unidad{item.quantity !== 1 ? 'es' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(item.unitPrice)} c/u
                          </p>
                        </div>
                      </div>
                      {item.comments && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">Comentarios:</p>
                              <p className="text-sm text-gray-600">{item.comments}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {index < proposal.items.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen y Acciones */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Propuesta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ítems:</span>
                    <span>{proposal.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moneda:</span>
                    <span>{proposal.currency}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(proposal.total)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Enviada: {formatDate(proposal.createdAt)}</span>
                  </div>
                  {proposal.status.toLowerCase() === "enviada" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Propuesta activa</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Acciones */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    if (solicitud?.clientName && solicitud?.titulo) {
                      const message = `Hola ${solicitud.clientName}, he enviado una propuesta para "${solicitud.titulo}". ¿Te gustaría revisarla?`;
                      const phoneNumber = ""; // TODO: Obtener número del cliente
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                    }
                  }}
                  disabled={!solicitud?.clientName}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contactar Cliente
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/backoffice/quote-proposal?id=${proposal.solicitudId}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Solicitud Original
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProposalDetail;