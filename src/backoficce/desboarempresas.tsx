import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa"; // <-- Importa el layout

// Simula datos de empresa (puedes traerlos de Firestore)
const company = {
  name: "Mi Empresa S.A.",
  isVerified: false,
  profileImage: "",
  rating: 4.7,
  completedJobs: 32,
  userId: "empresa123" // Nueva propiedad userId
};

// Extender el tipo Quote para incluir comentarios
interface Quote {
  id: string;
  status?: string;
  requestTitle?: string;
  description?: string;
  userId?: string;
  budget?: string;
  urgency?: string;
  createdAt?: any;
  location?: string;
  deliveryStatus?: string;
  clientName?: string;
  totalAmount?: number;
  deliveryTime?: string;
  comments?: Comment[]; // Nueva propiedad para comentarios
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
  const navigate = useNavigate();
  const [realQuotes, setRealQuotes] = useState<Quote[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);
  const [completedJobs, setCompletedJobs] = useState(0);

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

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const q = query(
          collection(db, "solicitud"),
          where("status", "==", "pendiente")
        );
        const querySnapshot = await getDocs(q);
        const quotes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRealQuotes(quotes);
      } catch (error) {
        // Manejo de error opcional
      }
    };
    fetchQuotes();

    // Cargar cotizaciones aceptadas/aprobadas
    const fetchAcceptedQuotes = async () => {
      try {
        // Obtener cotizaciones donde el estado sea "aceptada"
        const q = query(
          collection(db, "cotizaciones"),
          where("status", "==", "aceptada")
        );
        const querySnapshot = await getDocs(q);
        const quotes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Quote[];
        setAcceptedQuotes(quotes);
      } catch (error) {
        console.error("Error al cargar cotizaciones aceptadas:", error);
      }
    };
    fetchAcceptedQuotes();
  }, []);

  useEffect(() => {
    const fetchMyQuotes = async () => {
      try {
        // Aquí consultamos todas las cotizaciones
        const q = query(collection(db, "cotizaciones")); 
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          status: doc.data().status ?? "", // <-- fuerza que siempre exista status
          requestTitle: doc.data().requestTitle ?? "",
          description: doc.data().description ?? "",
          userId: doc.data().userId ?? "",
          budget: doc.data().budget ?? "",
          urgency: doc.data().urgency ?? "",
          createdAt: doc.data().createdAt ?? "",
          location: doc.data().location ?? "",
          deliveryStatus: doc.data().deliveryStatus ?? "",
          clientName: doc.data().clientName ?? "",
          totalAmount: doc.data().totalAmount ?? 0,
          deliveryTime: doc.data().deliveryTime ?? "",
          // ...otros campos que uses
        })) as Quote[];
        setMyQuotes(data);
        
        // Filtramos las aceptadas/confirmadas
        const accepted = data.filter(quote => 
          quote.status === "accepted" || 
          quote.status === "confirmado" ||
          quote.status === "pendiente" ||
          quote.status === "enviado" ||
          quote.status === "en_camino" ||
          quote.status === "entregado"
        );
        setAcceptedQuotes(accepted);
        
        // Calculamos los trabajos completados (con estado entregado)
        const completed = data.filter(quote => 
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
      budget: "3000-5000€",
      deadline: "2 semanas",
      status: "pending",
      createdAt: "Hace 2 horas",
      description: "Necesito renovar completamente mi cocina, incluyendo muebles, encimera y electrodomésticos.",
      location: "Madrid Centro"
    },
    {
      id: 2,
      clientName: "Carlos Rodríguez",
      project: "Instalación eléctrica nueva",
      category: "electricidad",
      budget: "1500-2500€",
      deadline: "1 semana",
      status: "urgent",
      createdAt: "Hace 4 horas",
      description: "Instalación eléctrica completa para vivienda de 90m²",
      location: "Barcelona"
    },
    {
      id: 3,
      clientName: "Ana López",
      project: "Construcción de terraza",
      category: "construccion",
      budget: "8000-12000€",
      deadline: "1 mes",
      status: "pending",
      createdAt: "Hace 6 horas",
      description: "Construcción de terraza de 25m² con cubierta",
      location: "Valencia"
    }
  ];

  const stats = [
    {
      title: "Solicitudes Pendientes",
      value: realQuotes.length.toString(),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      onClick: () => navigate("/backoffice/quotes")
    },
    {
      title: "Mensajes Sin Leer",
      value: "8",
      icon: MessageSquare,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Calificación Promedio",
      value: company.rating.toFixed(1),
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Trabajos Completados",
      value: completedJobs.toString(),
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
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
                {company.name.charAt(0)}
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
                <CardTitle className="text-xl font-bold">Solicitudes de Cotización Pendientes</CardTitle>
                <CardDescription>
                  Nuevas oportunidades de negocio para tu empresa
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{quote.requestTitle}</span>
                        {quote.status === "accepted" || quote.status === "confirmado" ? (
                          <Badge className="bg-green-100 text-green-800 ml-2">¡Aprobada!</Badge>
                        ) : quote.status === "declined" ? (
                          <Badge className="bg-red-100 text-red-800 ml-2">Rechazada</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 ml-2">Pendiente</Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{quote.description || ""}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {quote.userId || "Cliente"}
                        </span>
                        <span className="flex items-center">
                          <Euro className="h-4 w-4 mr-1" />
                          {quote.budget || ""}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {quote.urgency || ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 min-w-[120px]">
                      <p>{quote.createdAt ? String(quote.createdAt).replace("T", " ").substring(0, 19) : ""}</p>
                      <p className="font-medium text-gray-700">{quote.location || ""}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="company-card text-white bg-blue-600 hover:bg-blue-700"
                      onClick={() => navigate(`/backoffice/quote-proposal?id=${quote.id}`)}
                    >
                      Enviar Propuesta
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accepted/Confirmed Quotes Section */}
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Cotizaciones Aceptadas/Confirmadas</CardTitle>
                <CardDescription>
                  Seguimiento de tus cotizaciones exitosas
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate("/my-quotes")}
                className="company-card text-white bg-blue-600 hover:bg-blue-700"
              >
                Ver Todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {acceptedQuotes.length === 0 && (
                <div className="text-center text-gray-500 py-8">No hay cotizaciones aceptadas o confirmadas.</div>
              )}
              {acceptedQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className={`border rounded-lg p-4 flex flex-col md:flex-row items-start justify-between gap-4 transition-all ${
                    quote.status === "accepted"
                      ? "border-green-100 bg-green-50"
                      : "border-blue-100 bg-blue-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{quote.requestTitle}</span>
                      {quote.status === "accepted" ? (
                        <Badge className="bg-green-100 text-green-800">Aceptada</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">Confirmada</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{quote.description || ""}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {quote.userId || "Cliente"}
                      </span>
                      <span className="flex items-center">
                        <Euro className="h-4 w-4 mr-1" />
                        {quote.budget || ""}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {quote.urgency || ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 min-w-[120px]">
                    <p>{quote.createdAt ? String(quote.createdAt).replace("T", " ").substring(0, 19) : ""}</p>
                    <p className="font-medium text-gray-700">{quote.location || ""}</p>
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
                  onClick={() => navigate("/active-orders")}
                  className="company-card text-white bg-green-600 hover:bg-green-700"
                >
                  Ver Todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acceptedQuotes.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No hay pedidos activos.</div>
                )}
                {acceptedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-green-100 rounded-lg p-4 hover:bg-green-50/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{quote.requestTitle || "Cotización"}</span>
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
                        onClick={() => navigate(`/order-tracking?id=${quote.id}`)}
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