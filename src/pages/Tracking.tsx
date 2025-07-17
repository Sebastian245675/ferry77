import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Star, 
  Navigation, 
  DollarSign, 
  Truck 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "../lib/firebase";
import { ref, push, onValue, off, serverTimestamp } from "firebase/database";

interface DeliveryMessage {
  id: string;
  message: string;
  timestamp: string;
  sender: 'user' | 'delivery';
}

interface TrackingOrder {
  id: string;
  orderNumber: string;
  company: string;
  companyName?: string;
  deliveryPerson: string;
  phone: string;
  status: 'preparando' | 'en_camino' | 'entregado';
  estimatedTime: string;
  currentLocation: string;
  items: any[];
  total: number;
  rating?: number;
  deliveryStatus?: string;
  requestTitle?: string;
  description?: string;
  statusNote?: string;
  statusUpdatedAt?: any;
}

const Tracking = () => {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [confirmedQuotes, setConfirmedQuotes] = useState<TrackingOrder[]>([]);
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Escuchar mensajes en tiempo real para el pedido seleccionado
  useEffect(() => {
    if (!selectedOrder) return;
    const chatRef = ref(rtdb, `deliveryChats/${selectedOrder}`);
    const handle = onValue(chatRef, (snapshot) => {
      const msgs = [];
      snapshot.forEach(child => {
        const val = child.val();
        msgs.push({
          id: child.key,
          message: val.message,
          timestamp: val.timestamp,
          sender: val.sender
        });
      });
      setMessages(msgs);
    });
    return () => off(chatRef, 'value', handle);
  }, [selectedOrder]);

  // Scroll al último mensaje cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const { toast } = useToast();
  
  // Función para obtener el color del estado de entrega
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparando': return 'bg-yellow-100 text-yellow-800';
      case 'en_camino': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el texto del estado de entrega
  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparando': return 'Preparando';
      case 'en_camino': return 'En camino';
      case 'entregado': return 'Entregado';
      default: return 'Desconocido';
    }
  };
  
  useEffect(() => {
    // Cargar cotizaciones confirmadas/aceptadas del usuario
    const fetchConfirmedQuotes = async () => {
      try {
        const q = query(
          collection(db, "cotizaciones"),
          where("status", "in", ["accepted", "confirmado"])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const quotes: TrackingOrder[] = [];
          snapshot.forEach((doc) => {
            const quoteData = doc.data();
            
            // Determinar el estado en el formato que espera la interfaz
            let orderStatus: 'preparando' | 'en_camino' | 'entregado' = 'preparando';
            if (quoteData.deliveryStatus === "enviado" || quoteData.deliveryStatus === "en_camino") {
              orderStatus = "en_camino";
            } else if (quoteData.deliveryStatus === "entregado") {
              orderStatus = "entregado";
            }
            
            // Convertir la cotización a formato de pedido para tracking
            quotes.push({
              id: doc.id,
              orderNumber: doc.id.slice(0, 6).toUpperCase(),
              company: quoteData.companyName || "Empresa",
              companyName: quoteData.companyName,
              deliveryPerson: quoteData.deliveryPerson || "Repartidor asignado",
              phone: quoteData.companyPhone || "+54 11 1234-5678",
              status: orderStatus,
              estimatedTime: quoteData.deliveryTime || "Pendiente",
              currentLocation: quoteData.currentLocation || "En preparación",
              items: quoteData.items || [{
                name: quoteData.requestTitle || "Producto",
                quantity: quoteData.quantity || 1,
                unitPrice: (quoteData.totalAmount || 0) / (quoteData.quantity || 1)
              }],
              total: quoteData.totalAmount || 0,
              deliveryStatus: quoteData.deliveryStatus || "pendiente",
              requestTitle: quoteData.requestTitle,
              description: quoteData.description,
              statusNote: quoteData.statusNote,
              statusUpdatedAt: quoteData.statusUpdatedAt
            });
          });
          
          setConfirmedQuotes(quotes);
          
          // Si hay cotizaciones y ninguna está seleccionada, seleccionar la primera
          if (quotes.length > 0 && !selectedOrder) {
            setSelectedOrder(quotes[0].id);
          }
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error al cargar cotizaciones confirmadas:", error);
      }
    };
    
    fetchConfirmedQuotes();
  }, [selectedOrder]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedOrder) return;
    const chatRef = ref(rtdb, `deliveryChats/${selectedOrder}`);
    await push(chatRef, {
      message: messageText,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      sender: 'user'
    });
    setMessageText('');
  };

  const callDelivery = (phone: string) => {
    toast({
      title: "Llamando...",
      description: `Conectando con ${phone}`,
    });
  };

  const openMap = () => {
    toast({
      title: "Abriendo mapa",
      description: "Mostrando ubicación en tiempo real",
    });
  };

  const currentOrder = confirmedQuotes.find(order => order.id === selectedOrder);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Rastrear Pedidos</h1>
            <p className="text-gray-600">Sigue el estado de tus pedidos en tiempo real</p>
          </div>

          {/* Búsqueda por número de pedido */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Buscar Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Ingresa el número de pedido (ej: ORD-001)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => {
                  const order = confirmedQuotes.find(o => o.orderNumber === trackingNumber);
                  if (order) {
                    setSelectedOrder(order.id);
                    toast({
                      title: "Pedido encontrado",
                      description: `Mostrando información de ${trackingNumber}`,
                    });
                  } else {
                    toast({
                      title: "Pedido no encontrado",
                      description: "Verifica el número de pedido",
                      variant: "destructive"
                    });
                  }
                }}>
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de pedidos */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Mis Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {confirmedQuotes.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOrder === order.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.company}</p>
                      <p className="text-sm text-gray-500">${order.total.toLocaleString()}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Detalles del pedido seleccionado */}
            <div className="lg:col-span-2 space-y-6">
              {currentOrder && (
                <>
                  {/* Estado del pedido */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Package className="w-5 h-5" />
                        <span>Pedido {currentOrder.orderNumber}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-semibold mb-3">Estado del Pedido</h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium">Pedido confirado</p>
                                <p className="text-sm text-gray-500">Hace 1 hora</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                currentOrder.status === 'preparando' || currentOrder.status === 'en_camino' || currentOrder.status === 'entregado'
                                  ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <Package className={`w-4 h-4 ${
                                  currentOrder.status === 'preparando' || currentOrder.status === 'en_camino' || currentOrder.status === 'entregado'
                                    ? 'text-blue-600' : 'text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">Preparando pedido</p>
                                <p className="text-sm text-gray-500">
                                  {currentOrder.status === 'preparando' ? 'En progreso...' : 'Completado'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                currentOrder.status === 'en_camino' || currentOrder.status === 'entregado'
                                  ? 'bg-blue-100' : 'bg-gray-100'
                              }`}>
                                <Truck className={`w-4 h-4 ${
                                  currentOrder.status === 'en_camino' || currentOrder.status === 'entregado'
                                    ? 'text-blue-600' : 'text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">En camino</p>
                                <p className="text-sm text-gray-500">
                                  {currentOrder.status === 'en_camino' ? `Llega en ${currentOrder.estimatedTime}` : 
                                   currentOrder.status === 'entregado' ? 'Entregado' : 'Pendiente'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                currentOrder.status === 'entregado' ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <CheckCircle className={`w-4 h-4 ${
                                  currentOrder.status === 'entregado' ? 'text-green-600' : 'text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">Entregado</p>
                                <p className="text-sm text-gray-500">
                                  {currentOrder.status === 'entregado' ? 'Pedido completado' : 'Pendiente'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3">Información del Delivery</h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-bold text-blue-600">
                                  {currentOrder.deliveryPerson.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{currentOrder.deliveryPerson}</p>
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-gray-600">{currentOrder.rating || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button 
                                onClick={() => callDelivery(currentOrder.phone)}
                                className="flex-1" 
                                variant="outline"
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                Llamar
                              </Button>
                              <Button 
                                onClick={openMap}
                                className="flex-1"
                                variant="outline"
                              >
                                <Navigation className="w-4 h-4 mr-2" />
                                Ver en Mapa
                              </Button>
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-800">Ubicación actual</span>
                              </div>
                              <p className="text-sm text-blue-700">{currentOrder.currentLocation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chat con delivery */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageCircle className="w-5 h-5" />
                        <span>Chat con Delivery</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="h-60 overflow-y-auto border rounded-lg p-4 space-y-3 bg-gray-50">
                          {messages.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              No hay mensajes aún. Envía el primer mensaje al repartidor.
                            </p>
                          ) : (
                            messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs p-3 rounded-lg ${
                                  msg.sender === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border text-gray-900'
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                                <span className={`text-xs mt-1 block ${
                                  msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {msg.timestamp}
                                </span>
                              </div>
                            </div>
                          ))
                          )}
                          <div ref={messagesEndRef} />
                          <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Escribe un mensaje..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={sendMessage}>
                            Enviar
                          </Button>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          Solo puedes enviar 2 mensajes por pedido
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detalles del pedido */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalles del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Empresa:</span>
                          <span>{currentOrder.company}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Tiempo estimado:</span>
                          <span>{currentOrder.estimatedTime}</span>
                        </div>
                        <div className="border-t pt-3">
                          <h4 className="font-medium mb-2">Productos:</h4>
                          <ul className="space-y-1">
                            {currentOrder.items.map((item, index) => (
                              <li key={index} className="text-sm text-gray-600">• {item.name} (x{item.quantity})</li>
                            ))}
                          </ul>
                        </div>
                        <div className="border-t pt-3 flex justify-between items-center font-semibold">
                          <span>Total:</span>
                          <span>${currentOrder.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Tracking;
