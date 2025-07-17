import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa";
import { doc, getDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  FileText
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

  const queryParams = new URLSearchParams(location.search);
  const quoteId = queryParams.get("id");

  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Nuevo: descuento general
  const [discount, setDiscount] = useState<{ type: "percent" | "amount"; value: number }>({ type: "percent", value: 0 });

  const [proposal, setProposal] = useState({
    items: [] as Array<{id: number, name: string, quantity: number, unitPrice: number, specifications: string}>,
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
      try {
        const quoteRef = doc(db, "solicitud", quoteId);
        const quoteSnap = await getDoc(quoteRef);
        if (quoteSnap.exists()) {
          const data = { id: quoteSnap.id, ...quoteSnap.data() } as QuoteRequest;
          setQuoteRequest(data);
          if (data.items && data.items.length > 0) {
            const proposalItems = data.items.map((item, index) => ({
              id: index,
              name: item.name || "",
              quantity: item.quantity || 1,
              unitPrice: 0,
              specifications: item.specifications || ""
            }));
            setProposal(prev => ({ ...prev, items: proposalItems }));
          }
        } else {
          setError("La solicitud no existe");
        }
      } catch (err) {
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
      const quoteData = {
        requestId: quoteId,
        requestTitle: quoteRequest?.title || "Sin título",
        company: {
          name: "Mi Empresa S.A.",
          logo: "",
          rating: 4.7,
          verified: true,
        },
        subtotal: proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
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
      await addDoc(collection(db, "cotizaciones"), quoteData);
      toast({
        title: "Propuesta enviada",
        description: "Tu cotización ha sido enviada correctamente al cliente",
      });
      navigate("/dashboard");
    } catch (err) {
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
                    <span className="text-gray-700">{quoteRequest?.location || "Sin ubicación"}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      Presupuesto: ${quoteRequest?.budget?.toLocaleString() || "No especificado"}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <Badge className={getUrgencyColor(quoteRequest?.urgency || "")}>
                      {quoteRequest?.urgency === "alta" ? "Urgente" :
                        quoteRequest?.urgency === "media" ? "Media" :
                        quoteRequest?.urgency === "baja" ? "Baja" : "No especificada"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      Fecha: {quoteRequest?.createdAt ? new Date(quoteRequest.createdAt).toLocaleDateString() : "No especificada"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">
                      Cliente: {quoteRequest?.userId || "Anónimo"}
                    </span>
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
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Items a cotizar</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {proposal.items.map((item, idx) => (
                      <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <div>
                              <Label>Cantidad</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => {
                                  const newItems = [...proposal.items];
                                  newItems[idx].quantity = parseInt(e.target.value) || 1;
                                  setProposal(prev => ({ ...prev, items: newItems }));
                                }}
                                className="w-20"
                              />
                            </div>
                            <div>
                              <Label>Precio Unitario</Label>
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
                                className="w-24"
                              />
                            </div>
                            <div>
                              <Label>Especificaciones</Label>
                              <Input
                                value={item.specifications}
                                onChange={e => {
                                  const newItems = [...proposal.items];
                                  newItems[idx].specifications = e.target.value;
                                  setProposal(prev => ({ ...prev, items: newItems }));
                                }}
                                className="w-40"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-gray-900 mt-2 md:mt-0">
                          Total: ${(item.quantity * item.unitPrice).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {proposal.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No hay items para cotizar</p>
                    </div>
                  )}
                </div>

                {/* Total y descuento */}
                {proposal.items.length > 0 && (
                  <div className="mt-4 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Label>Descuento:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={discount.type === "percent" ? 100 : undefined}
                        value={discount.value}
                        onChange={e => setDiscount(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
                        className="w-20"
                      />
                      <select
                        value={discount.type}
                        onChange={e => setDiscount(d => ({ ...d, type: e.target.value as "percent" | "amount" }))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="percent">%</option>
                        <option value="amount">$</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">Subtotal: ${proposal.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}</p>
                      {discount.value > 0 && (
                        <p className="text-green-600 text-sm">
                          Descuento: {discount.type === "percent" ? `${discount.value}%` : `$${discount.value.toLocaleString()}`}
                        </p>
                      )}
                      <p className="text-xl font-bold text-gray-900">Total: ${proposal.totalAmount.toLocaleString()}</p>
                      {quoteRequest?.budget && proposal.totalAmount < quoteRequest.budget && (
                        <p className="text-sm text-green-600">
                          Ahorro: ${(quoteRequest.budget - proposal.totalAmount).toLocaleString()}
                          ({Math.round(((quoteRequest.budget - proposal.totalAmount) / quoteRequest.budget) * 100)}%)
                        </p>
                      )}
                    </div>
                  </div>
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

                {/* Notas adicionales */}
                <div>
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional sobre la cotización, garantías, condiciones, etc."
                    value={proposal.notes}
                    onChange={(e) => setProposal({...proposal, notes: e.target.value})}
                    rows={4}
                  />
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => navigate(-1)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    className="company-card text-white bg-blue-600 hover:bg-blue-700"
                    disabled={proposal.items.length === 0}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Propuesta
                  </Button>
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
