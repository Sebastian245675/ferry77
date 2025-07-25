import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getAuth } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  MessageSquare,
  Star,
  Clock,
  Users,
  Euro,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  TruckIcon,
  Package,
  DollarSign,
  Truck,
  MapPin,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa"; // <-- Importa el layout


// Hook para obtener y guardar la empresa real
const getCompanyData = async (userId: string) => {
  // Buscar SIEMPRE en users primero para obtener companyName real
  // Probamos varias consultas para cubrir diferentes estructuras
  let userQueries = [
    query(collection(db, "users"), where("uid", "==", userId)),
    query(collection(db, "users"), where("userId", "==", userId)),
    query(collection(db, "users"), where("id", "==", userId))
  ];
  
  let userData = null;
  
  // Intentamos las diferentes consultas
  for (const q of userQueries) {
    const userDoc = await getDocs(q);
    if (!userDoc.empty) {
      userData = userDoc.docs[0].data();
      console.log('[getCompanyData] Datos encontrados en users:', userData);
      break; // Si encontramos algo, salimos del bucle
    }
  }
  // Buscar también en empresas para fallback de logo y verificación
  let empresaData = null;
  let empresaQueries = [
    query(collection(db, "empresas"), where("userId", "==", userId)),
    query(collection(db, "empresas"), where("uid", "==", userId)),
    query(collection(db, "empresas"), where("id", "==", userId))
  ];
  
  // Intentamos las diferentes consultas
  for (const q of empresaQueries) {
    const snap = await getDocs(q);
    if (!snap.empty) {
      empresaData = snap.docs[0].data();
      console.log('[getCompanyData] Datos encontrados en empresas:', empresaData);
      break; // Si encontramos algo, salimos del bucle
    }
  }
  // Lógica de prioridad para el nombre (considerando los campos vistos en la estructura)
  const name =
    (userData && userData.companyName ? userData.companyName : null)
    || (userData && userData.nick ? userData.nick : null)
    || (userData && userData.displayName ? userData.displayName : null)
    || (empresaData && empresaData.companyName ? empresaData.companyName : null)
    || (empresaData && empresaData.name ? empresaData.name : null)
    || (empresaData && empresaData.nick ? empresaData.nick : null)
    || (empresaData && empresaData.empresa ? empresaData.empresa : null)
    || (empresaData && empresaData.nombreEmpresa ? empresaData.nombreEmpresa : null)
    || 'Empresa';
  // Lógica de prioridad para el logo
  const profileImage =
    (empresaData && (empresaData.logo || empresaData.companyLogo))
    || (userData && (userData.logo || userData.companyLogo))
    || '';
  // Lógica de prioridad para verificación
  const isVerified =
    (empresaData && empresaData.verified)
    || (userData && userData.verified)
    || false;
  // Siempre devolvemos un objeto con los datos encontrados
  return {
    companyName: name,
    isVerified,
    profileImage,
    userId: userId
  };
};

// Extender el tipo Quote para incluir comentarios
interface Quote {
  id: string;
  status?: string;
  requestTitle?: string;
  title?: string; // Título de la solicitud
  description?: string;
  userId?: string;
  userName?: string; // Nombre del usuario/cliente
  budget?: string;
  urgency?: string;
  createdAt?: any;
  location?: string;
  deliveryStatus?: string;
  selectedCompanies?: Array<any>;
  selectedCompanyIds?: Array<string>;
  clientName?: string;
  totalAmount?: number;
  deliveryTime?: string;
  comments?: Comment[]; // Nueva propiedad para comentarios
  estadoEmpresa?: string; // Estado específico para la empresa (en_espera, etc)
  source?: string; // Para identificar la colección de origen (cotizaciones o solicitud)
  items?: Array<{
    name?: string;
    quantity?: number;
    specifications?: string;
    price?: number | string;
    imageUrl?: string;
  }>;
}

// Definir el tipo Comment
interface Comment {
  id: string;
  requestId: string;
  userId: string;
  text: string;
  createdAt: string;
}

const Dashboard = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [company, setCompany] = useState<{ name: string; isVerified: boolean; profileImage: string; userId: string }>({
    name: '',
    isVerified: false,
    profileImage: '',
    userId: ''
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      try {
        const data = await getCompanyData(user.uid);
        setCompany({
          name: data.companyName || 'Empresa',
          isVerified: data.isVerified || false,
          profileImage: data.profileImage || '',
          userId: user.uid || ''
        });
      } catch (error) {
        console.error('[fetchCompany] Error al obtener datos de empresa:', error);
        setCompany({
          name: 'Empresa',
          isVerified: false,
          profileImage: '',
          userId: user.uid || ''
        });
      }
    };
    fetchCompany();
  }, [user]);
  const navigate = useNavigate();
  // Estado para mostrar todos los pedidos activos o solo los 4 más recientes
  const [showAllActiveOrders, setShowAllActiveOrders] = useState(false);
  const [realQuotes, setRealQuotes] = useState<Quote[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); // Estado para controlar los botones durante el procesamiento

  // Estadísticas de ejemplo para las tarjetas
  const stats = [
    {
      title: "Solicitudes Pendientes",
      value: realQuotes.length,
      bgColor: "bg-yellow-100",
      color: "text-yellow-700",
      icon: Clock,
    },
    {
      title: "Cotizaciones Aceptadas",
      value: acceptedQuotes.length,
      bgColor: "bg-green-100",
      color: "text-green-700",
      icon: CheckCircle,
    },
    {
      title: "Trabajos Completados",
      value: completedJobs,
      bgColor: "bg-blue-100",
      color: "text-blue-700",
      icon: Package,
    },
    {
      title: "Total Cotizaciones",
      value: myQuotes.length,
      bgColor: "bg-gray-100",
      color: "text-gray-700",
      icon: Users,
    },
  ];
  
  // Función para cargar solicitudes - accesible desde cualquier parte del componente
  const loadQuotes = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Obtener TODAS las solicitudes
      const q = query(collection(db, "solicitud"));
      const querySnapshot = await getDocs(q);
      const allQuotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quote[];

      // Filtrar para mostrar solo las solicitudes donde esta empresa esté seleccionada y que NO estén confirmadas
      const filteredQuotes = allQuotes.filter(quote => {
        // Solo mostrar solicitudes con estado pendiente o cotizando
        const validStatus = quote.status === "pendiente" || quote.status === "cotizando";
        if (!validStatus) {
          return false;
        }
        // 1. Verificar selectedCompanyIds (array simple de IDs)
        if (quote.selectedCompanyIds && Array.isArray(quote.selectedCompanyIds)) {
          if (quote.selectedCompanyIds.includes(user.uid)) {
            return true;
          }
        }
        // 2. Verificar en selectedCompanies (array de objetos)
        if (!quote.selectedCompanies || !Array.isArray(quote.selectedCompanies)) {
          return false;
        }
        const match = quote.selectedCompanies.some(company => {
          // Si es string directo
          if (typeof company === 'string') {
            return company === user.uid;
          }
          // Si es objeto con propiedades
          if (company && typeof company === 'object') {
            return (
              company.id === user.uid || 
              company.companyId === user.uid
            );
          }
          return false;
        });
        return match;
      });

      setRealQuotes(filteredQuotes);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    }
  };
  
  // Función para obtener el nombre de la empresa del pedido
  const getCompanyName = (quote: Quote) => {
    // Si no hay empresas seleccionadas
    if (!quote.selectedCompanies || !Array.isArray(quote.selectedCompanies) || quote.selectedCompanies.length === 0) {
      return "No especificada";
    }
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return "No especificada";
    
    // Buscar la empresa que coincide con el usuario actual
    const selectedCompany = quote.selectedCompanies.find(company => {
      if (typeof company === 'string') {
        return company === user.uid;
      }
      
      if (typeof company === 'object') {
        return (
          company.id === user.uid || 
          company.companyId === user.uid ||
          // También verificar por nombre si el ID no coincide
          (user.displayName && (
            company.companyName === user.displayName ||
            company.name === user.displayName
          ))
        );
      }
      
      return false;
    });
    
    // Si no encontramos la empresa específica, usar la primera disponible
    const companyToUse = selectedCompany || quote.selectedCompanies[0];
    
    if (typeof companyToUse === 'string') {
      return companyToUse; // Si es un string, devolver directamente
    }
    
    if (companyToUse && typeof companyToUse === 'object') {
      // Intentar obtener el nombre de la empresa con fallbacks
      return companyToUse.companyName || 
             companyToUse.name || 
             companyToUse.nombreEmpresa || 
             companyToUse.empresa || 
             "Esta empresa";
    }
    
    return "No especificada";
  };

  // Función para determinar el color del badge según el estado de entrega
  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'en_camino':
        return 'bg-purple-100 text-purple-800';
      case 'entregado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el icono según el estado de entrega
  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="h-3 w-3" />;
      case 'enviado':
        return <Package className="h-3 w-3" />;
      case 'en_camino':
        return <TruckIcon className="h-3 w-3" />;
      case 'entregado':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Cargar solicitudes cuando el componente se monta
  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    const fetchMyQuotes = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        // 1. Consultamos cotizaciones tradicionales
        const q = query(collection(db, "cotizaciones")); 
        const snapshot = await getDocs(q);
        const cotizacionesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: "cotizaciones"
        })) as Quote[];

        // 2. Consultamos solicitudes confirmadas
        const qSolicitudes = query(
          collection(db, "solicitud"),
          where("status", "==", "confirmado")
        );
        const snapshotSolicitudes = await getDocs(qSolicitudes);
        const solicitudesConfirmadas = snapshotSolicitudes.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          deliveryStatus: doc.data().deliveryStatus ?? "pendiente",
          source: "solicitud"
        })) as Quote[];

        // Función para saber si la solicitud/cotización es de la empresa logueada
        const isForCurrentCompany = (quote: Quote) => {
          // selectedCompanyIds
          if (quote.selectedCompanyIds && Array.isArray(quote.selectedCompanyIds)) {
            if (quote.selectedCompanyIds.includes(user.uid)) {
              return true;
            }
          }
          // selectedCompanies
          if (quote.selectedCompanies && Array.isArray(quote.selectedCompanies)) {
            return quote.selectedCompanies.some(company => {
              if (typeof company === 'string') {
                return company === user.uid;
              }
              if (company && typeof company === 'object') {
                return (
                  company.id === user.uid ||
                  company.companyId === user.uid
                );
              }
              return false;
            });
          }
          return false;
        };

        // Filtrar solo las cotizaciones y solicitudes de la empresa logueada
        const filteredCotizaciones = cotizacionesData.filter(isForCurrentCompany);
        const filteredSolicitudes = solicitudesConfirmadas.filter(isForCurrentCompany);
        const allData = [...filteredCotizaciones, ...filteredSolicitudes];
        setMyQuotes(allData);

        // Filtrar aceptadas/confirmadas SOLO de la empresa logueada
        const accepted = allData.filter(quote =>
          quote.status === "accepted" ||
          quote.status === "confirmado" ||
          quote.status === "pendiente" ||
          quote.status === "enviado" ||
          quote.status === "en_camino" ||
          quote.status === "entregado"
        );
        setAcceptedQuotes(accepted);

        // Trabajos completados SOLO de la empresa logueada
        const completed = allData.filter(quote =>
          quote.deliveryStatus === "entregado"
        ).length;
        setCompletedJobs(completed);
      } catch (error) {
        console.error("Error al obtener cotizaciones:", error);
      }
    };

    fetchMyQuotes();
  }, []);

  // Nuevo useEffect para cargar comentarios
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const q = query(
          collection(db, "comments"),
          where("userId", "==", company.userId || "") // Validar que userId no sea undefined
        );
        const querySnapshot = await getDocs(q);
        const commentsData: Comment[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          requestId: doc.data().requestId || "", // Validar que requestId no sea undefined
          userId: doc.data().userId || "", // Validar que userId no sea undefined
          text: doc.data().text || "", // Validar que text no sea undefined
          createdAt: doc.data().createdAt || new Date().toISOString(), // Validar que createdAt no sea undefined
        }));

        setRealQuotes((prevQuotes) =>
          prevQuotes.map((quote) => ({
            ...quote,
            comments: commentsData.filter((comment) => comment.requestId === quote.id),
          }))
        );
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, []);

  const recentQuotes = [
    {
      id: 1,
      clientName: "María García",
      project: "Reforma de cocina completa",
      category: "carpinteria",
      budget: "3000-5000€"
    },
    {
      id: 2,
      clientName: "Carlos Rodríguez",
      project: "Instalación eléctrica nueva",
      category: "electricidad",
      budget: "1500-2500€"
    },
    {
      id: 3,
      clientName: "Ana López",
      project: "Construcción de terraza",
      category: "construccion",
      budget: "8000-12000€"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'urgent':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge>Normal</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'carpinteria':
        return 'text-amber-700 bg-amber-100';
      case 'electricidad':
        return 'text-yellow-700 bg-yellow-100';
      case 'construccion':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };
  
  // Función para confirmar una solicitud
  const handleConfirmQuote = async (quoteId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handleConfirmQuote] Intentando confirmar solicitud ${quoteId}...`);
      
      const quoteRef = doc(db, "solicitud", quoteId);
      
      // Actualizar el estado de la solicitud a "confirmado"
      await updateDoc(quoteRef, {
        status: "confirmado",
        estadoEmpresa: "en_espera"
      });
      
      console.log(`[handleConfirmQuote] ✅ Solicitud ${quoteId} confirmada exitosamente en Firestore`);
      
      // Actualizar el estado local inmediatamente para feedback instantáneo
      setRealQuotes(prevQuotes => {
        const updated = prevQuotes.map(quote => 
          quote.id === quoteId 
            ? { ...quote, status: "confirmado", estadoEmpresa: "en_espera" } 
            : quote
        );
        console.log("[handleConfirmQuote] Estado local actualizado:", updated.find(q => q.id === quoteId));
        return updated;
      });
      
      // Mostrar alerta
      alert("Solicitud confirmada exitosamente. Estado: En espera");
      
      // Recargar todos los datos para asegurarnos de que todo está sincronizado
      setTimeout(() => {
        console.log("[handleConfirmQuote] Recargando datos...");
        loadQuotes();
      }, 1000); // Pequeño delay para asegurar que Firestore se ha actualizado
      
    } catch (error) {
      console.error("Error al confirmar la solicitud:", error);
      alert("Error al confirmar la solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Función para denegar una solicitud
  const handleDenyQuote = async (quoteId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handleDenyQuote] Intentando denegar solicitud ${quoteId}...`);
      
      const quoteRef = doc(db, "solicitud", quoteId);
      
      // Actualizar el estado de la solicitud a "denegado"
      await updateDoc(quoteRef, {
        status: "denegado"
      });
      
      console.log(`[handleDenyQuote] ❌ Solicitud ${quoteId} denegada en Firestore`);
      
      // Actualizar el estado local
      setRealQuotes(prevQuotes => {
        const filtered = prevQuotes.filter(quote => quote.id !== quoteId);
        console.log("[handleDenyQuote] Eliminando solicitud del estado local");
        return filtered;
      });
      
      // Opcional: mostrar alguna notificación
      alert("Solicitud denegada correctamente");
      
      // Refrescar los datos
      setTimeout(() => {
        console.log("[handleDenyQuote] Recargando datos...");
        loadQuotes();
      }, 1000); // Pequeño delay para asegurar que Firestore se ha actualizado
      
    } catch (error) {
      console.error("Error al denegar la solicitud:", error);
      alert("Error al denegar la solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="company-card rounded-xl p-6 text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                ¡Bienvenido, {company.name}!
              </h1>
              <p className="text-blue-100 mb-4">
                Gestiona tu negocio de forma eficiente desde tu panel de control
              </p>
              <div className="flex items-center space-x-4">
                {company.isVerified ? (
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-green-300" />
                    <span className="text-green-100">Empresa Verificada</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-300" />
                    <span className="text-yellow-100">Verificación Pendiente</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      onClick={() => navigate("/verification")}
                    >
                      Verificar Ahora
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Avatar className="h-20 w-20 border-4 border-white/30">
              <AvatarImage src={company.profileImage} />
              <AvatarFallback className="bg-white/20 text-white text-2xl">
                {company.name ? company.name.charAt(0).toUpperCase() : 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="glass-effect hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Quote Requests */}
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Solicitudes Pendientes para tu Empresa</CardTitle>
                <CardDescription>
                  Solicitudes de cotización dirigidas específicamente a tu empresa
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate("/backoffice/quotes")}
                className="company-card text-white bg-blue-600 hover:bg-blue-700"
              >
                Ver Todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {realQuotes.length === 0 && (
                <div className="text-center text-gray-500 py-8">No hay solicitudes pendientes.</div>
              )}
              {realQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-blue-100 rounded-lg p-4 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{quote.title || quote.requestTitle || "Solicitud sin título"}</span>
                        {quote.status === "accepted" ? (
                          <Badge className="bg-green-100 text-green-800 ml-2">¡Aprobada!</Badge>
                        ) : quote.status === "confirmado" ? (
                          <Badge className="bg-green-100 text-green-800 ml-2">Confirmado</Badge>
                        ) : quote.status === "declined" || quote.status === "denegado" ? (
                          <Badge className="bg-red-100 text-red-800 ml-2">Rechazada</Badge>
                        ) : quote.status === "cotizando" ? (
                          <Badge className="bg-blue-100 text-blue-800 ml-2">Cotizando</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 ml-2">Pendiente</Badge>
                        )}
                        {quote.estadoEmpresa === "en_espera" && (
                          <Badge className="bg-purple-100 text-purple-800 ml-2">En espera</Badge>
                        )}
                        {/* Badge de empresa asignada */}
                        {quote.selectedCompanies && quote.selectedCompanies.length > 0 && (
                          <Badge className="bg-blue-100 text-blue-800 ml-2 flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {getCompanyName(quote)}
                          </Badge>
                        )}
                      </div>
                      {/* Mostrar detalle de productos solicitados */}
                      {quote.items && Array.isArray(quote.items) && quote.items.length > 0 && (
                        <div className="mb-2">
                          <span className="font-semibold text-gray-700 text-sm">Productos solicitados:</span>
                          <ul className="text-gray-600 text-sm mt-1">
                            {quote.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 mb-1">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-8 h-8 object-cover rounded border" />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                <span>
                                  {item.quantity ? `${item.quantity} x ` : ''}{item.name}
                                  {item.specifications ? ` (${item.specifications})` : ''}
                                  {item.price ? ` - $${Number(item.price).toLocaleString()}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {/* Mostrar el total del pedido debajo de los productos */}
                          <div className="mt-2 font-semibold text-blue-700 text-base">
                            Total del pedido: {quote.totalAmount ? `$${Number(quote.totalAmount).toLocaleString()}` : (quote.budget ? quote.budget : 'N/A')}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {quote.userName || quote.userId || "Cliente"}
                        </span>
                        <span className="flex items-center">
                          <Euro className="h-4 w-4 mr-1" />
                          {/* Mostrar valor total si existe, si no mostrar presupuesto */}
                          {quote.totalAmount ? `$${Number(quote.totalAmount).toLocaleString()}` : (quote.budget || "")}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {quote.urgency || ""}
                        </span>
                        {quote.selectedCompanies && quote.selectedCompanies.length > 0 && (
                          <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                            <Building2 className="h-4 w-4 mr-1" />
                            Pedido para: {getCompanyName(quote)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 min-w-[120px]">
                      <p>{quote.createdAt ? String(quote.createdAt).replace("T", " ").substring(0, 19) : ""}</p>
                      <p className="font-medium text-gray-700">{quote.location || ""}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 ${
                        (isProcessing || quote.status === "confirmado" || quote.status === "denegado") 
                        ? "opacity-50 cursor-not-allowed" 
                        : ""
                      }`}
                      onClick={() => {
                        console.log("Denegar clicked for quote ID:", quote.id);
                        handleDenyQuote(quote.id);
                      }}
                      disabled={isProcessing || quote.status === "confirmado" || quote.status === "denegado"}
                    >
                      Denegar
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm font-medium text-white bg-green-600 hover:bg-green-700 ${
                        (isProcessing || quote.status === "confirmado" || quote.status === "denegado") 
                        ? "opacity-50 cursor-not-allowed" 
                        : ""
                      }`}
                      onClick={() => {
                        console.log("Confirmar clicked for quote ID:", quote.id);
                        handleConfirmQuote(quote.id);
                      }}
                      disabled={isProcessing || quote.status === "confirmado" || quote.status === "denegado"}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


        {/* Cotizaciones Aprobadas / Pedidos Activos */}
        {acceptedQuotes.length > 0 && (
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Pedidos Activos</CardTitle>
                  <CardDescription>
                    Cotizaciones aprobadas por clientes que requieren seguimiento
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAllActiveOrders(true)}
                  className="company-card text-white bg-green-600 hover:bg-green-700"
                >
                  Ver más
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acceptedQuotes.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No hay pedidos activos.</div>
                )}
                {(showAllActiveOrders ? [...acceptedQuotes].reverse() : [...acceptedQuotes].reverse().slice(0, 4)).map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-green-100 rounded-lg p-4 hover:bg-green-50/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{quote.title || quote.requestTitle || "Cotización"}</span>
                          <Badge className="bg-green-100 text-green-800">Aprobada</Badge>
                          {quote.deliveryStatus && (
                            <Badge className={getDeliveryStatusColor(quote.deliveryStatus)}>
                              {getDeliveryStatusIcon(quote.deliveryStatus)}
                              <span className="ml-1">
                                {quote.deliveryStatus === 'pendiente' ? 'Pendiente' : 
                                 quote.deliveryStatus === 'enviado' ? 'Enviado' : 
                                 quote.deliveryStatus === 'en_camino' ? 'En camino' : 
                                 quote.deliveryStatus === 'entregado' ? 'Entregado' : 
                                 'Pendiente'}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          Cliente: {quote.clientName || quote.userId || "Cliente"}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            ${quote.totalAmount?.toLocaleString() || "N/A"}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {quote.deliveryTime || "Por definir"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        onClick={() => navigate(`/backoffice/order-chat?id=${quote.id}`)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Contactar Cliente
                      </Button>
                      <Button
                        size="sm"
                        className="company-card text-white bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          console.log("Actualizando pedido:", quote);
                          if (!quote.id) {
                            alert('Error: No se encontró el ID del pedido.');
                            console.error('Pedido sin ID:', quote);
                            return;
                          }
                          
                          // Debug: Mostrar información completa del pedido
                          console.log("ID del pedido:", quote.id);
                          console.log("Estado del pedido:", quote.status);
                          console.log("Fuente del pedido:", quote.source || "No especificada");
                          console.log("Pedido completo:", JSON.stringify(quote));
                          
                          // Usar ruta absoluta para evitar problemas de navegación
                          const url = `/backoffice/order-tracking?id=${quote.id}`;
                          console.log("Navegando a:", url);
                          navigate(url);
                        }}
                      >
                        Actualizar Estado
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-effect hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/profile")}>
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-blue-50 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Actualizar Perfil</h3>
              <p className="text-sm text-gray-600">
                Mantén tu información actualizada para atraer más clientes
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/messages")}>
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mensajes</h3>
              <p className="text-sm text-gray-600">
                Comunícate directamente con tus clientes
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/reviews")}>
            <CardContent className="p-6 text-center">
              <div className="p-3 bg-yellow-50 rounded-full w-fit mx-auto mb-4">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Reseñas</h3>
              <p className="text-sm text-gray-600">
                Revisa los comentarios de tus clientes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;