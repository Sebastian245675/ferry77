import React, { useState, useEffect, useRef } from 'react';
import MiniMap from '../components/MiniMap';
import { useNavigate, Link } from 'react-router-dom';
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
  Truck,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, rtdb } from "../lib/firebase";
import { ref, push, onValue, off, serverTimestamp } from "firebase/database";
import { getAuth } from "firebase/auth";

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
  status: 'en_espera' | 'preparando' | 'en_camino' | 'entregado';
  createdAt?: string | Date;
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
  const [filteredQuotes, setFilteredQuotes] = useState<TrackingOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [messages, setMessages] = useState<DeliveryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  // Estado para lat/lng de la empresa
  const [companyCoords, setCompanyCoords] = useState<{ lat: number; lng: number } | null>(null);
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
      case 'en_espera': return 'bg-orange-100 text-orange-800';
      case 'preparando': return 'bg-yellow-100 text-yellow-800';
      case 'en_camino': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el texto del estado de entrega
  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_espera': return 'En espera de aprobación';
      case 'preparando': return 'Preparando';
      case 'en_camino': return 'En camino';
      case 'entregado': return 'Entregado';
      default: return 'Desconocido';
    }
  };
  
  // Función para determinar el estado de una orden basado en sus propiedades
  const determineOrderStatus = (orderData: any): 'en_espera' | 'preparando' | 'en_camino' | 'entregado' => {
    console.log("Determinando estado para:", orderData.id, "status:", orderData.status, "deliveryStatus:", orderData.deliveryStatus);
    
    // Verificar primero si está entregado (prioridad máxima)
    if (orderData.status === "completado" || 
        orderData.deliveryStatus === "entregado" || 
        orderData.deliveryStatus === "completado") {
      console.log("→ Orden ENTREGADA");
      return "entregado";
    }
    // Si no está entregado, verificar si está en camino
    else if (orderData.deliveryStatus === "enviado" || 
             orderData.deliveryStatus === "en_camino") {
      console.log("→ Orden EN CAMINO");
      return "en_camino";
    }
    // Si no está en camino, verificar si está en preparación
    else if (orderData.status === "confirmado" || 
             orderData.deliveryStatus === "preparando") {
      console.log("→ Orden PREPARANDO");
      return "preparando";
    }
    
    // Estado por defecto: en espera
    console.log("→ Orden EN ESPERA");
    return "en_espera";
  };
  
  useEffect(() => {
    // Cargar cotizaciones confirmadas/aceptadas del usuario actual
    const fetchConfirmedQuotes = async () => {
      if (!user) {
        console.log("No hay usuario autenticado, esperando...");
        return;
      }
      setLoading(true);
      try {
        console.log("Cargando pedidos para el usuario:", user.uid);
        let allQuotes: TrackingOrder[] = [];
        // 1. PRIMERO CONSULTAMOS LA COLECCIÓN "solicitud"
        try {
          console.log("Consultando colección 'solicitud'...");
          const solicitudQuery = query(
            collection(db, "solicitud"),
            where("userId", "==", user.uid),
            where("status", "in", ["confirmado", "completado", "cotizando", "pendiente", "entregado"])
          );
          const solicitudSnapshot = await getDocs(solicitudQuery);
          console.log(`Solicitudes encontradas: ${solicitudSnapshot.size}`);
          for (const docSnap of solicitudSnapshot.docs) {
            const solicitudData = docSnap.data();
            console.log(`Datos de solicitud ${docSnap.id}:`, solicitudData);
            if (solicitudData) {
              // Determinar el estado de la orden utilizando la función auxiliar
              const orderStatus = determineOrderStatus(solicitudData);
              let companyInfo = {
                name: "Empresa",
                phone: "No disponible"
              };
              let companyId = null;
              if (solicitudData.selectedCompanies && solicitudData.selectedCompanies.length > 0) {
                const company = solicitudData.selectedCompanies[0];
                if (typeof company === 'object') {
                  companyInfo.name = company.companyName || company.name || "Empresa";
                  companyId = company.companyId || company.id || null;
                }
              }
              // Buscar el teléfono real de la empresa en la colección users
              if (companyId) {
                try {
                  const userDoc = await getDoc(doc(db, "users", companyId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    companyInfo.phone = userData.phone || "No disponible";
                  }
                } catch (e) {
                  console.warn("No se pudo obtener el teléfono de la empresa:", e);
                }
              }
              // Extraer información del precio desde autoQuotes si existe
              let totalAmount = 0;
              if (solicitudData.autoQuotes && solicitudData.autoQuotes.length > 0) {
                const bestQuote = solicitudData.autoQuotes[0];
                totalAmount = bestQuote.bestPrice || 0;
              }
              allQuotes.push({
                id: docSnap.id,
                orderNumber: docSnap.id.slice(0, 6).toUpperCase(),
                company: companyInfo.name,
                companyName: companyInfo.name,
                deliveryPerson: solicitudData.deliveryPerson || companyInfo.name,
                phone: companyInfo.phone,
                status: orderStatus,
                estimatedTime: solicitudData.deliveryTime || "Pendiente",
                currentLocation: solicitudData.currentLocation || "En preparación",
                items: solicitudData.items || [{
                  name: solicitudData.title || "Producto",
                  quantity: solicitudData.quantity || 1,
                  unitPrice: totalAmount
                }],
                total: totalAmount,
                deliveryStatus: solicitudData.deliveryStatus || "pendiente",
                requestTitle: solicitudData.title || "Solicitud",
                description: solicitudData.description,
                statusNote: solicitudData.statusNote,
                statusUpdatedAt: solicitudData.statusUpdatedAt,
                createdAt: solicitudData.createdAt || new Date()
              });
            }
          }
        } catch (error) {
          console.error("Error al consultar solicitudes:", error);
        }
        
        // 2. LUEGO CONSULTAMOS LA COLECCIÓN "cotizaciones"
        try {
          console.log("Consultando colección 'cotizaciones'...");
          const quotesQuery = query(
            collection(db, "cotizaciones"),
            where("userId", "==", user.uid)
          );
          const quotesSnapshot = await getDocs(quotesQuery);
          console.log(`Cotizaciones encontradas: ${quotesSnapshot.size}`);
          for (const docSnap of quotesSnapshot.docs) {
            const quoteData = docSnap.data();
            console.log(`Datos de cotización ${docSnap.id}:`, quoteData);
            if (quoteData) {
              // Determinar el estado de la orden utilizando la función auxiliar
              const orderStatus = determineOrderStatus(quoteData);
              let companyId = quoteData.companyId || (quoteData.company && (quoteData.company.id || quoteData.company.companyId)) || null;
              let companyName = quoteData.companyName || (quoteData.company && quoteData.company.name) || "Empresa";
              let companyPhone = "No disponible";
              if (companyId) {
                try {
                  const userDoc = await getDoc(doc(db, "users", companyId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    companyPhone = userData.phone || "No disponible";
                  }
                } catch (e) {
                  console.warn("No se pudo obtener el teléfono de la empresa:", e);
                }
              }
              allQuotes.push({
                id: docSnap.id,
                orderNumber: docSnap.id.slice(0, 6).toUpperCase(),
                company: companyName,
                companyName: companyName,
                deliveryPerson: quoteData.deliveryPerson || companyName,
                phone: companyPhone,
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
                statusUpdatedAt: quoteData.statusUpdatedAt,
                createdAt: quoteData.createdAt || new Date()
              });
            }
          }
        } catch (error) {
          console.error("Error al consultar cotizaciones:", error);
        }
        
        // Mostrar resumen
        console.log(`Total de pedidos encontrados: ${allQuotes.length}`);
        
        // Actualizar el estado con todos los pedidos encontrados
        setConfirmedQuotes(allQuotes);
        
        // Si hay pedidos y ninguno está seleccionado, seleccionar el primero
        if (allQuotes.length > 0 && !selectedOrder) {
          setSelectedOrder(allQuotes[0].id);
        }
        
      } catch (error) {
        console.error("Error al cargar datos de pedidos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus pedidos. Intenta nuevamente.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfirmedQuotes();
  }, [selectedOrder, toast, user]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedOrder) return;
    // Contar mensajes enviados por el usuario en este pedido
    const userMessages = messages.filter(m => m.sender === 'user').length;
    if (userMessages >= 2) {
      toast({
        title: 'Límite alcanzado',
        description: 'Solo puedes enviar 2 mensajes por pedido.',
        variant: 'destructive'
      });
      return;
    }
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

  // Comprobar si hay un usuario autenticado
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        console.log("Usuario no autenticado, redirigiendo...");
        toast({
          title: "Acceso denegado",
          description: "Debes iniciar sesión para ver tus pedidos",
          variant: "destructive"
        });
        navigate("/auth");
      }
    });
    
    return () => unsubscribe();
  }, [navigate, toast]);

  // Filtrar por estado
  useEffect(() => {
    console.log("Estado actual:", statusFilter);
    console.log("Pedidos disponibles:", confirmedQuotes);
    
    // Revisar estados de todos los pedidos para depuración
    confirmedQuotes.forEach(order => {
      console.log(`Pedido ${order.orderNumber} - status: ${order.status}, deliveryStatus: ${order.deliveryStatus}`);
    });
    
    if (statusFilter === 'all') {
      setFilteredQuotes(confirmedQuotes);
    } else {
      const filtered = confirmedQuotes.filter(order => order.status === statusFilter);
      console.log("Pedidos filtrados:", filtered);
      setFilteredQuotes(filtered);
    }
  }, [statusFilter, confirmedQuotes]);

  // Obtener el pedido seleccionado con lógica de fallback
  const currentOrder = confirmedQuotes.find(order => order.id === selectedOrder) || 
                     (confirmedQuotes.length > 0 ? confirmedQuotes[0] : null);

  // Buscar lat/lng de la empresa cuando cambia el pedido
  useEffect(() => {
    const fetchCompanyCoords = async () => {
      setCompanyCoords(null);
      if (!currentOrder) return;
      // Buscar companyId en selectedCompanies
      let companyId = null;
      if (currentOrder && currentOrder.companyName) {
        // Buscar en la colección users por nombre (mejor sería por ID, pero depende del modelo)
        // Si tienes el ID real, úsalo aquí
        // Aquí intentamos buscar por nombre, pero lo ideal es tener el ID
        try {
          // Buscar por nombre exacto (puede haber colisiones)
          const q = query(collection(db, 'users'), where('companyName', '==', currentOrder.companyName));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.latitude && data.longitude) {
              setCompanyCoords({ lat: data.latitude, lng: data.longitude });
              return;
            }
          }
        } catch (e) {
          // ignorar
        }
      }
      // Si no hay lat/lng, no mostrar minimapa
      setCompanyCoords(null);
    };
    fetchCompanyCoords();
  }, [currentOrder]);

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
                  <div className="flex items-center gap-2 mt-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los pedidos</SelectItem>
                        <SelectItem value="en_espera">En espera</SelectItem>
                        <SelectItem value="preparando">Preparando</SelectItem>
                        <SelectItem value="en_camino">En camino</SelectItem>
                        <SelectItem value="entregado">Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ) : confirmedQuotes.length > 0 ? (
                    filteredQuotes.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order.id);
                          setShowDetailView(false); // Resetear la vista detallada al cambiar de pedido
                        }}
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
                        <p className="text-xs text-gray-400 mt-1">{order.createdAt ? (typeof order.createdAt === 'string' ? order.createdAt : new Date(order.createdAt).toLocaleString('es-AR')) : ''}</p>
                        <div className="flex justify-end mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order.id);
                              setShowDetailView(true);
                            }}
                          >
                            Ver <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">No tienes pedidos</h3>
                      <p className="text-gray-500 mt-1">Aún no has realizado ninguna compra</p>
                      <Button 
                        onClick={() => navigate('/requests')} 
                        className="mt-4"
                      >
                        Crear nueva solicitud
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detalles del pedido seleccionado */}
            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-40 bg-gray-200 rounded"></div>
                </div>
              ) : currentOrder ? (
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
                          {/* Pasos del pedido con estados futuros en gris */}
                          {(() => {
                            const steps = [
                              {
                                key: 'confirmado',
                                label: 'Pedido confirmado',
                                icon: <CheckCircle className="w-4 h-4" />, // verde si pasado/actual
                                color: 'bg-green-100 text-green-600',
                              },
                              {
                                key: 'preparando',
                                label: 'Preparando pedido',
                                icon: <Package className="w-4 h-4" />, // azul si actual/pasado
                                color: 'bg-blue-100 text-blue-600',
                              },
                              {
                                key: 'en_camino',
                                label: 'En camino',
                                icon: <Truck className="w-4 h-4" />, // azul si actual/pasado
                                color: 'bg-blue-100 text-blue-600',
                              },
                              {
                                key: 'entregado',
                                label: 'Entregado',
                                icon: <CheckCircle className="w-4 h-4" />, // verde si actual
                                color: 'bg-green-100 text-green-600',
                              },
                            ];
                            // Determinar el índice del estado actual
                            const statusOrder = {
                              'confirmado': 0,
                              'preparando': 1,
                              'en_camino': 2,
                              'entregado': 3,
                            };
                            // Mapear deliveryStatus/status a step
                            let currentStep = 0;
                            if (currentOrder.status === 'entregado') currentStep = 3;
                            else if (currentOrder.status === 'en_camino') currentStep = 2;
                            else if (currentOrder.status === 'preparando') currentStep = 1;
                            else currentStep = 0;

                            return (
                              <div className="space-y-3">
                                {steps.map((step, idx) => {
                                  const isDone = idx <= currentStep;
                                  const bgClass = isDone ? step.color.split(' ')[0] : 'bg-gray-100';
                                  const textClass = isDone ? step.color.split(' ')[1] : 'text-gray-400';
                                  return (
                                    <div key={step.key} className="flex items-center space-x-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`}> 
                                        {React.cloneElement(step.icon, { className: `w-4 h-4 ${textClass}` })}
                                      </div>
                                      <div>
                                        <p className={`font-medium ${isDone ? '' : 'text-gray-400'}`}>{step.label}</p>
                                        <p className="text-sm text-gray-500">
                                          {/* Mensaje contextual */}
                                          {step.key === 'preparando' && currentOrder.status === 'preparando' && 'En progreso...'}
                                          {step.key === 'en_camino' && currentOrder.status === 'en_camino' && `Llega en ${currentOrder.estimatedTime}`}
                                          {step.key === 'entregado' && currentOrder.status === 'entregado' && 'Pedido completado'}
                                          {isDone ? '' : 'Pendiente'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <h3 className="font-semibold mb-3">Empresa encargada</h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="font-bold text-blue-600">
                                  {currentOrder.company.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-lg">{currentOrder.company}</p>
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-gray-600">{currentOrder.rating || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <a
                                href={`tel:${currentOrder.phone}`}
                                className="flex-1"
                                onClick={() => callDelivery(currentOrder.phone)}
                                style={{ textDecoration: 'none' }}
                              >
                                <Button className="w-full" variant="outline">
                                  <Phone className="w-4 h-4 mr-2" />
                                  Llamar
                                </Button>
                              </a>
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
                              {companyCoords ? (
                                <MiniMap lat={companyCoords.lat} lng={companyCoords.lng} label={currentOrder.company} />
                              ) : (
                                <p className="text-sm text-blue-700">{currentOrder.currentLocation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chat con delivery */}
                  {!showDetailView && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4" />
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
                  )}
                  
                  {/* Vista detallada del pedido */}
                  {showDetailView && (
                    <Card>
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowDetailView(false)}
                            className="flex items-center text-blue-600"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
                          </Button>
                          <CardTitle className="text-base">Detalles del pedido {currentOrder.orderNumber}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          {/* Información general */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <h3 className="font-semibold flex items-center text-gray-700">
                                <Calendar className="w-4 h-4 mr-1" /> Información general
                              </h3>
                              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Estado:</span>
                                  <Badge className={getStatusColor(currentOrder.status)}>
                                    {getStatusText(currentOrder.status)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Fecha:</span>
                                  <span className="text-sm font-medium">
                                    {currentOrder.createdAt ? (typeof currentOrder.createdAt === 'string' 
                                      ? currentOrder.createdAt 
                                      : new Date(currentOrder.createdAt).toLocaleString('es-AR')) 
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Tiempo estimado:</span>
                                  <span className="text-sm font-medium">{currentOrder.estimatedTime || 'Pendiente'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Ubicación actual:</span>
                                  <span className="text-sm font-medium">{currentOrder.currentLocation || 'En preparación'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h3 className="font-semibold flex items-center text-gray-700">
                                <User className="w-4 h-4 mr-1" /> Información de la empresa
                              </h3>
                              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Empresa:</span>
                                  <span className="text-sm font-medium">{currentOrder.company}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Persona de entrega:</span>
                                  <span className="text-sm font-medium">{currentOrder.deliveryPerson || 'Pendiente'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Contacto:</span>
                                  <a 
                                    href={`tel:${currentOrder.phone}`}
                                    className="text-sm font-medium text-blue-600 hover:underline"
                                  >
                                    {currentOrder.phone}
                                  </a>
                                </div>
                                {currentOrder.rating && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Calificación:</span>
                                    <div className="flex items-center">
                                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                      <span className="text-sm font-medium ml-1">{currentOrder.rating}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Detalles de los items */}
                          <div className="space-y-3">
                            <h3 className="font-semibold flex items-center text-gray-700">
                              <Tag className="w-4 h-4 mr-1" /> Detalles de los productos
                            </h3>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Producto
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cantidad
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Precio
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {currentOrder.items && currentOrder.items.map((item, index) => (
                                      <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                          ${item.price ? (item.price * (item.quantity || 1)).toLocaleString() : 
                                             item.unitPrice ? (item.unitPrice * (item.quantity || 1)).toLocaleString() : 'N/A'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50">
                                    <tr>
                                      <td colSpan={2} className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                        Total:
                                      </td>
                                      <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                                        ${currentOrder.total.toLocaleString()}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </div>
                          
                          {/* Botones de acción */}
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowDetailView(false)}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Ir al chat
                            </Button>
                            {currentOrder.status === 'entregado' && (
                              <Button 
                                onClick={() => navigate('/reviews')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Calificar pedido
                              </Button>
                            )}
                            {currentOrder.status === 'en_camino' && (
                              <Button 
                                onClick={openMap}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Navigation className="w-4 h-4 mr-2" />
                                Seguir en mapa
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Selecciona un pedido</h3>
                    <p className="text-gray-500 mt-1">Elige un pedido de la lista para ver sus detalles</p>
                  </CardContent>
                </Card>
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
