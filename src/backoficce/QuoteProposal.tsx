import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa";
import { doc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuth } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  MapPin, 
  Euro, 
  Users, 
  ArrowLeft,
  Send,
  Plus,
  X,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuoteRequest = {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  budget?: number;
  urgency?: string;
  createdAt?: any;
  userId?: string;
  profession?: string;
  clientName?: string;
  clientCity?: string;
  items?: Array<{
    name: string;
    quantity: number;
    specifications?: string;
  }>;
};

const QuoteProposal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const auth = getAuth();
  const user = auth.currentUser;

  const queryParams = new URLSearchParams(location.search);
  const quoteId = queryParams.get("id");

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyData, setCompanyData] = useState<any>(null);

  // Nuevo: descuento general
  const [discount, setDiscount] = useState<{ type: "percent" | "amount"; value: number }>({ type: "percent", value: 0 });

  const [proposal, setProposal] = useState({
    items: [] as Array<{id: number, name: string, quantity: number, unitPrice: number, specifications: string, comments?: string}>,
    totalAmount: 0,
    deliveryTime: "",
    notes: "",
    paymentOptions: [] as Array<string>,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [paymentOption, setPaymentOption] = useState("");

  useEffect(() => {
    const fetchQuoteRequest = async () => {
      if (!quoteId) {
        setError("No se especificó el ID de la solicitud");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Usuario no autenticado");
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
        } else {
          console.warn("⚠️ Usuario no encontrado en MySQL, sincronizando...");
          // Si el usuario no existe en MySQL, sincronizarlo
          const syncResponse = await fetch(`http://localhost:8090/api/usuarios/sync-firebase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              userType: 'empresa', // Asumimos que está en el backoffice de empresas
              companyName: user.displayName // Usar displayName como companyName por defecto
            })
          });

          if (syncResponse.ok) {
            const syncedUser = await syncResponse.json();
            console.log("✅ Usuario sincronizado:", syncedUser);
            setCompanyData(syncedUser);
          } else {
            console.error("❌ Error sincronizando usuario");
          }
        }

        // 2. Obtener solicitud desde el backend MySQL
        console.log("🔍 Obteniendo solicitud desde backend para ID:", quoteId);
        const response = await fetch(`http://localhost:8090/api/solicitudes/${quoteId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("📦 Datos de solicitud desde backend:", data);
          
          // Obtener información del cliente
          let clientName = "Cliente Anónimo";
          let clientCity = data.ciudadOrigen || "Sin ciudad";
          
          if (data.usuarioId) {
            try {
              const clientResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${data.usuarioId}`);
              if (clientResponse.ok) {
                const clientData = await clientResponse.json();
                clientName = clientData.nombreCompleto || "Cliente Anónimo";
                clientCity = clientData.ciudad || data.ciudadOrigen || "Sin ciudad";
                console.log("👤 Datos del cliente:", clientData);
              }
            } catch (clientError) {
              console.warn("⚠️ No se pudo obtener datos del cliente:", clientError);
            }
          }
          
          // Mapear los datos del backend al formato esperado
          const mappedData: QuoteRequest = {
            id: data.id.toString(),
            title: data.titulo || "Sin título",
            description: data.descripcion || "Sin descripción",
            location: data.ciudadOrigen || "Sin ubicación",
            budget: data.presupuesto || 0,
            urgency: data.urgencia || "media",
            createdAt: data.fechaCreacion,
            userId: data.usuarioId || "Anónimo",
            profession: data.categoria || "Sin categoría",
            clientName: clientName,
            clientCity: clientCity,
            items: data.items || []
          };
          
          setQuoteRequest(mappedData);
          
          // Si hay items, mapearlos para la cotización
          if (data.items && data.items.length > 0) {
            const proposalItems = data.items.map((item: any, index: number) => ({
              id: index,
              name: item.nombre || item.name || "",
              quantity: item.cantidad || item.quantity || 1,
              unitPrice: 0,
              specifications: item.especificaciones || item.specifications || "",
              comments: ""
            }));
            setProposal(prev => ({ ...prev, items: proposalItems }));
          }
        } else if (response.status === 404) {
          // Si no se encuentra en el backend, intentar con Firebase como fallback
          console.log("⚠️ Solicitud no encontrada en backend, intentando con Firebase...");
          
          const quoteRef = doc(db, "solicitud", quoteId);
          const quoteSnap = await getDoc(quoteRef);
          
          if (quoteSnap.exists()) {
            const data = { id: quoteSnap.id, ...quoteSnap.data() } as QuoteRequest;
            console.log("📦 Datos de solicitud desde Firebase:", data);
            setQuoteRequest(data);
            
            if (data.items && data.items.length > 0) {
              const proposalItems = data.items.map((item, index) => ({
                id: index,
                name: item.name || "",
                quantity: item.quantity || 1,
                unitPrice: 0,
                specifications: item.specifications || "",
                comments: ""
              }));
              setProposal(prev => ({ ...prev, items: proposalItems }));
            }
          } else {
            setError("La solicitud no existe en ninguna base de datos");
          }
        } else {
          throw new Error(`Error del servidor: ${response.status}`);
        }
      } catch (err) {
        console.error("❌ Error al cargar la solicitud:", err);
        setError("Error al cargar los datos de la solicitud");
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteRequest();
  }, [quoteId]);

  // Calcular el monto total cuando cambien los items o el descuento
  useEffect(() => {
    const subtotal = proposal.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0
    );
    let total = subtotal;
    if (discount.type === "percent" && discount.value > 0) {
      total = subtotal - (subtotal * discount.value / 100);
    } else if (discount.type === "amount" && discount.value > 0) {
      total = subtotal - discount.value;
    }
    setProposal(prev => ({ ...prev, totalAmount: total > 0 ? total : 0 }));
  }, [proposal.items, discount]);

  const removeItem = (itemId: number) => {
    setProposal({
      ...proposal,
      items: proposal.items.filter(item => item.id !== itemId)
    });
  };

  const addPaymentOption = () => {
    if (paymentOption.trim()) {
      setProposal({
        ...proposal,
        paymentOptions: [...proposal.paymentOptions, paymentOption]
      });
      setPaymentOption("");
    }
  };

  const removePaymentOption = (index: number) => {
    setProposal({
      ...proposal,
      paymentOptions: proposal.paymentOptions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proposal.items.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un ítem a la cotización",
        variant: "destructive",
      });
      return;
    }
    if (!proposal.deliveryTime) {
      toast({
        title: "Error",
        description: "El tiempo de entrega es obligatorio",
        variant: "destructive",
      });
      return;
    }
    if (proposal.paymentOptions.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos una opción de pago",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("📤 Enviando cotización...");
      
      const subtotal = proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const quoteData = {
        solicitudId: parseInt(quoteId!),
        tituloSolicitud: quoteRequest?.title || "Sin título",
        empresa: {
          nombre: "Mi Empresa S.A.", // TODO: Obtener datos reales de la empresa
          logo: "",
          calificacion: 4.7,
          verificada: true,
        },
        subtotal: subtotal,
        descuento: discount,
        montoTotal: proposal.totalAmount,
        presupuestoOriginal: quoteRequest?.budget || 0,
        ahorro: (quoteRequest?.budget || 0) - proposal.totalAmount > 0 
          ? (quoteRequest?.budget || 0) - proposal.totalAmount 
          : 0,
        tiempoEntrega: proposal.deliveryTime,
        items: proposal.items.map(item => ({
          nombre: item.name,
          cantidad: item.quantity,
          precioUnitario: item.unitPrice,
          especificaciones: item.specifications,
          comentarios: item.comments || "",
          subtotal: item.quantity * item.unitPrice
        })),
        estado: "pendiente",
        validoHasta: new Date(proposal.validUntil + "T23:59:59").toISOString(),
        notas: proposal.notes,
        opcionesPago: proposal.paymentOptions,
      };

      // Intentar enviar al backend MySQL usando el nuevo endpoint de propuestas
      console.log("🔍 Datos de empresa obtenidos:", companyData);
      
      if (!companyData || !companyData.id) {
        throw new Error("No se pudo obtener el ID de la empresa. Por favor, verifica que la empresa esté registrada correctamente.");
      }

      const proposalData = {
        companyId: companyData.id, // Usar ID numérico de la tabla usuarios
        solicitudId: parseInt(quoteId!),
        currency: "COP",
        companyName: companyData?.companyName || companyData?.nick || companyData?.nombreCompleto || "Empresa",
        deliveryTime: proposal.deliveryTime,
        items: proposal.items.map(item => ({
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          comments: `${item.specifications ? 'Especificaciones: ' + item.specifications : ''}${item.comments ? (item.specifications ? ' | ' : '') + 'Comentarios: ' + item.comments : ''}`
        }))
      };

      console.log("📤 Enviando propuesta al backend:", proposalData);

      const backendResponse = await fetch('http://localhost:8090/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData),
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        console.log("✅ Propuesta guardada en backend:", result);
        toast({
          title: "Propuesta enviada",
          description: "Tu propuesta ha sido enviada correctamente al cliente",
        });
        navigate("/backoffice");
      } else {
        const errorData = await backendResponse.json();
        console.error("❌ Error del backend:", errorData);
        
        // Si hay un error específico, mostrarlo
        if (errorData.error) {
          toast({
            title: "Error",
            description: errorData.error,
            variant: "destructive",
          });
          return;
        }
        
        // Fallback a Firebase si el backend falla
        console.log("⚠️ Backend falló, guardando en Firebase...");
        
        const firebaseQuoteData = {
          requestId: quoteId,
          requestTitle: quoteRequest?.title || "Sin título",
          company: {
            name: "Mi Empresa S.A.",
            logo: "",
            rating: 4.7,
            verified: true,
          },
          subtotal: subtotal,
          discount: discount,
          totalAmount: proposal.totalAmount,
          originalBudget: quoteRequest?.budget || 0,
          savings: (quoteRequest?.budget || 0) - proposal.totalAmount > 0 
            ? (quoteRequest?.budget || 0) - proposal.totalAmount 
            : 0,
          deliveryTime: proposal.deliveryTime,
          items: proposal.items,
          status: "pending",
          createdAt: Timestamp.now(),
          validUntil: new Date(proposal.validUntil + "T23:59:59"),
          notes: proposal.notes,
          paymentOptions: proposal.paymentOptions,
        };
        
        await addDoc(collection(db, "cotizaciones"), firebaseQuoteData);
        console.log("✅ Cotización guardada en Firebase");
        
        toast({
          title: "Cotización enviada",
          description: "Tu cotización ha sido enviada correctamente al cliente",
        });
        navigate("/backoffice");
      }
    } catch (err) {
      console.error("❌ Error al enviar cotización:", err);
      toast({
        title: "Error",
        description: "Hubo un problema al enviar la cotización",
        variant: "destructive",
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "alta": return "bg-red-100 text-red-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baja": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos de la solicitud...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="mb-4 text-red-500 text-6xl">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/dashboard")}
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enviar Propuesta</h1>
            <p className="text-gray-600">Cotizar solicitud de cliente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Detalles de la solicitud */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{quoteRequest?.title || "Sin título"}</h3>
                <p className="text-gray-600 mb-4">{quoteRequest?.description || "Sin descripción"}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{quoteRequest?.clientCity || "Sin ciudad"}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      Presupuesto: ${quoteRequest?.budget?.toLocaleString() || "No especificado"}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      Fecha: {quoteRequest?.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString() : "No especificada"}
                    </span>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-medium">
                        {quoteRequest?.clientName || "Cliente Anónimo"}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {quoteRequest?.userId || "No disponible"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <Badge className="bg-blue-100 text-blue-800">
                      {quoteRequest?.profession || "Sin categoría"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Listado de items solicitados */}
              {quoteRequest?.items && quoteRequest.items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Items Solicitados:</h4>
                  <div className="space-y-2">
                    {quoteRequest.items.map((item: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Cantidad: {item.quantity}
                          {item.specifications && ` • ${item.specifications}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Formulario de propuesta */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear Propuesta</CardTitle>
              <CardDescription>Complete los detalles de su cotización</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Listado de items */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Artículos a Cotizar
                  </h3>
                  <div className="space-y-4">
                    {proposal.items.map((item, idx) => (
                      <Card key={item.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Información del artículo */}
                            <div className="lg:col-span-2">
                              <h4 className="font-semibold text-gray-900 mb-2">{item.name}</h4>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs text-gray-600">Cantidad Solicitada</Label>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={e => {
                                        const newItems = [...proposal.items];
                                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                                        setProposal(prev => ({ ...prev, items: newItems }));
                                      }}
                                      className="w-24"
                                    />
                                    <span className="text-sm text-gray-500">unidades</span>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">Especificaciones Adicionales</Label>
                                  <Textarea
                                    value={item.specifications}
                                    onChange={e => {
                                      const newItems = [...proposal.items];
                                      newItems[idx].specifications = e.target.value;
                                      setProposal(prev => ({ ...prev, items: newItems }));
                                    }}
                                    placeholder="Detalles adicionales, marca preferida, características especiales..."
                                    className="min-h-[60px]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Precio y totales */}
                            <div>
                              <Label className="text-xs text-gray-600">Precio por Unidad</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={e => {
                                    const newItems = [...proposal.items];
                                    newItems[idx].unitPrice = parseFloat(e.target.value) || 0;
                                    setProposal(prev => ({ ...prev, items: newItems }));
                                  }}
                                  className="pl-8"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                                <div className="text-sm text-gray-600">Subtotal</div>
                                <div className="text-lg font-bold text-green-700">
                                  ${(item.quantity * item.unitPrice).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>

                            {/* Comentarios específicos del artículo */}
                            <div>
                              <Label className="text-xs text-gray-600">Comentarios del Artículo</Label>
                              <Textarea
                                value={item.comments || ''}
                                onChange={e => {
                                  const newItems = [...proposal.items];
                                  newItems[idx] = { ...newItems[idx], comments: e.target.value };
                                  setProposal(prev => ({ ...prev, items: newItems }));
                                }}
                                placeholder="Garantía, tiempo de entrega específico, condiciones especiales..."
                                className="min-h-[80px]"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {proposal.items.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay artículos para cotizar</h3>
                      <p className="text-gray-500">Los artículos solicitados por el cliente aparecerán aquí automáticamente.</p>
                    </div>
                  )}
                </div>

                {/* Resumen de totales */}
                {proposal.items.length > 0 && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center">
                        <Euro className="w-5 h-5 mr-2 text-blue-600" />
                        Resumen de Cotización
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Descuento */}
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Aplicar Descuento:</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max={discount.type === "percent" ? 100 : undefined}
                            value={discount.value}
                            onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
                            className="w-20"
                            placeholder="0"
                          />
                          <select
                            value={discount.type}
                            onChange={e => setDiscount(d => ({ ...d, type: e.target.value as "percent" | "amount" }))}
                            className="border rounded px-3 py-2 text-sm bg-white"
                          >
                            <option value="percent">%</option>
                            <option value="amount">$ COP</option>
                          </select>
                        </div>
                      </div>

                      {/* Línea separadora */}
                      <hr className="border-blue-200" />

                      {/* Cálculos */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">
                            ${proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {discount.value > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>
                              Descuento ({discount.type === "percent" ? `${discount.value}%` : `$${discount.value.toLocaleString('es-CO')}`}):
                            </span>
                            <span className="font-medium">
                              -${(discount.type === "percent" 
                                ? (proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * discount.value / 100)
                                : discount.value
                              ).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        
                        <hr className="border-blue-200" />
                        
                        <div className="flex justify-between text-lg font-bold text-gray-900">
                          <span>Total Final:</span>
                          <span className="text-blue-600">
                            ${proposal.totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        {/* Ahorro comparado con presupuesto del cliente */}
                        {quoteRequest?.budget && proposal.totalAmount < quoteRequest.budget && (
                          <div className="bg-green-100 p-3 rounded-lg mt-3">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                ¡Excelente! Tu cotización está por debajo del presupuesto del cliente
                              </span>
                            </div>
                            <div className="text-sm text-green-700 mt-1">
                              Ahorro para el cliente: ${(quoteRequest.budget - proposal.totalAmount).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                              ({Math.round(((quoteRequest.budget - proposal.totalAmount) / quoteRequest.budget) * 100)}% menos)
                            </div>
                          </div>
                        )}
                        
                        {/* Advertencia si excede el presupuesto */}
                        {quoteRequest?.budget && proposal.totalAmount > quoteRequest.budget && (
                          <div className="bg-yellow-100 p-3 rounded-lg mt-3">
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">
                                Tu cotización excede el presupuesto del cliente
                              </span>
                            </div>
                            <div className="text-sm text-yellow-700 mt-1">
                              Diferencia: +${(proposal.totalAmount - quoteRequest.budget).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                              ({Math.round(((proposal.totalAmount - quoteRequest.budget) / quoteRequest.budget) * 100)}% más)
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Tiempo de entrega */}
                <div>
                  <Label htmlFor="deliveryTime">Tiempo de Entrega</Label>
                  <Input
                    id="deliveryTime"
                    placeholder="Ej: 24 horas, 2-3 días, etc."
                    value={proposal.deliveryTime}
                    onChange={(e) => setProposal({...proposal, deliveryTime: e.target.value})}
                    required
                  />
                </div>

                {/* Opciones de pago */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="paymentOption">Opciones de Pago</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="paymentOption"
                        placeholder="Ej: Efectivo -5%, Transferencia, etc."
                        value={paymentOption}
                        onChange={(e) => setPaymentOption(e.target.value)}
                        className="w-64"
                      />
                      <Button type="button" onClick={addPaymentOption} size="sm">
                        Agregar
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proposal.paymentOptions.map((option, index) => (
                      <Badge 
                        key={index} 
                        className="flex items-center bg-gray-100 text-gray-800 px-3 py-1"
                      >
                        {option}
                        <button 
                          type="button" 
                          onClick={() => removePaymentOption(index)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </Badge>
                    ))}
                    {proposal.paymentOptions.length === 0 && (
                      <p className="text-sm text-gray-500">No se han agregado opciones de pago</p>
                    )}
                  </div>
                </div>

                {/* Validez de la oferta */}
                <div>
                  <Label htmlFor="validUntil">Válido Hasta</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={proposal.validUntil}
                    onChange={(e) => setProposal({...proposal, validUntil: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* Comentarios generales de la cotización */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-green-600" />
                      Comentarios Generales de la Cotización
                    </CardTitle>
                    <CardDescription>
                      Información adicional sobre la propuesta, garantías, condiciones especiales, etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="notes"
                      placeholder="Ejemplo: 
• Garantía de 1 año en todos los productos
• Entrega incluida en el precio
• Posibilidad de financiación a 3 meses
• Atención postventa 24/7
• Instalación gratuita"
                      value={proposal.notes}
                      onChange={(e) => setProposal({...proposal, notes: e.target.value})}
                      rows={6}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>La cotización será enviada inmediatamente al cliente</span>
                  </div>
                  <div className="flex space-x-3">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => navigate(-1)}
                      className="px-6"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 shadow-lg"
                      disabled={proposal.items.length === 0 || !proposal.deliveryTime || proposal.paymentOptions.length === 0}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Cotización
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuoteProposal;
