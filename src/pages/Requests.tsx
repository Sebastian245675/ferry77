import React, { useEffect, useState } from 'react';
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import RequestCard from '../components/RequestCard';
import { Plus, Filter, Search, Calendar, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Define the Request type
interface RequestItem {
  name: string;
  quantity: number;
  specifications?: string;
}

// Usamos la misma definición que en RequestCard.tsx
interface UserRequest {
  id: string;
  title: string;
  items: RequestItem[];
  profession: 'carpintería' | 'construcción' | 'eléctrico' | string;
  location: string;
  urgency: 'baja' | 'media' | 'alta' | string;
  budget: number;
  status: 'pendiente' | 'confirmado' | 'cotizando' | 'completado' | 'cancelado' | string;
  createdAt: string | any;
  quotesCount: number;
  // Campos adicionales específicos de UserRequest
  userId?: string;
}

const Requests = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [totalCotizaciones, setTotalCotizaciones] = useState(0);
  const [ahorroTotal, setAhorroTotal] = useState(0);
  const [enProceso, setEnProceso] = useState(0);
  const [comments, setComments] = useState<{ [key: string]: string[] }>({});
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchSolicitudes = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setRequests([]);
        setTotalSolicitudes(0);
        setTotalCotizaciones(0);
        setAhorroTotal(0);
        setEnProceso(0);
        return;
      }

      let collectionName = "solicitud";
      try {
        const q = query(
          collection(db, collectionName),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setRequests([]);
          setTotalSolicitudes(0);
          setTotalCotizaciones(0);
          setAhorroTotal(0);
          setEnProceso(0);
          return;
        }

        // Mapeo compatible con tu estructura real
        const requestsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            status: data.status ?? "pendiente",
            title: data.title ?? "Sin título",
            items: Array.isArray(data.items) ? data.items : [],
            userId: data.userId ?? "",
            profession: data.profession ?? "general",
            location: data.location ?? "No especificada",
            urgency: data.urgency ?? "media",
            budget: data.budget && !isNaN(Number(data.budget)) ? Number(data.budget) : 0,
            createdAt: data.createdAt || new Date().toISOString(),
            quotesCount: data.quotesCount ?? 0,
            description: data.description ?? "",
            estado: data.estado ?? "",
          };
        }) as UserRequest[];

        // Estadísticas básicas
        setRequests(requestsData);
        setTotalSolicitudes(requestsData.length);
        setTotalCotizaciones(requestsData.reduce((acc, r) => acc + (r.quotesCount || 0), 0));
        setAhorroTotal(0); // Puedes calcularlo si tienes cotizaciones aceptadas
        setEnProceso(requestsData.filter(r => r.status === "pendiente" || r.status === "cotizando").length);

      } catch (error) {
        setRequests([]);
        setTotalSolicitudes(0);
        setTotalCotizaciones(0);
        setAhorroTotal(0);
        setEnProceso(0);
        console.error("Error al cargar solicitudes:", error);
      }
    };

    fetchSolicitudes();
  }, []);

  // Fetch comments from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "comments"), (snapshot) => {
      const commentsData: { [key: string]: string[] } = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const requestId = data.requestId;
        const comment = data.comment;

        if (requestId && comment) {
          if (!commentsData[requestId]) {
            commentsData[requestId] = [];
          }
          commentsData[requestId].push(comment);
        }
      });

      setComments(commentsData);
    });

    return () => unsubscribe();
  }, []);

  // Definir qué estados corresponden a cada pestaña del filtro
  const getStatusFilter = (status: string) => {
    switch (status) {
      case 'pending': 
        return 'pendiente'; // Solicitudes que aún están vigentes
      case 'quoting': 
        return 'cotizando'; // Solicitudes que están recibiendo cotizaciones (aceptadas)
      case 'confirmed': 
        return 'confirmado'; // Solicitudes con cotización aceptada
      case 'completed': 
        return 'completado'; // Solicitudes con entrega completada
      default: 
        return null;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.items && request.items.some(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    const matchesTab = activeTab === 'all' || request.status === getStatusFilter(activeTab);
    return matchesSearch && matchesTab;
  });

  // Actualiza los tabs con los conteos reales
  const tabs = [
    { id: 'all', name: 'Todas', count: requests.length },
    { id: 'pending', name: 'Pendientes', count: requests.filter(r => r.status === 'pendiente').length },
    { id: 'quoting', name: 'Cotizando', count: requests.filter(r => r.status === 'cotizando').length },
    { id: 'confirmed', name: 'Confirmadas', count: requests.filter(r => r.status === 'confirmado').length },
    { id: 'completed', name: 'Completadas', count: requests.filter(r => r.status === 'completado').length },
  ];

  const navigate = useNavigate();
  
  const handleViewDetails = async (request: UserRequest) => {
    try {
      // Primero verificamos si hay cotizaciones para esta solicitud
      const cotizacionesRef = collection(db, "cotizaciones");
      const cotizacionesQuery = query(
        cotizacionesRef,
        where("requestId", "==", request.id)
      );
      const cotizacionesSnapshot = await getDocs(cotizacionesQuery);
      
      // Si no hay cotizaciones, siempre redirigir a la página de cotizaciones 
      // para que el usuario pueda esperar ofertas
      if (cotizacionesSnapshot.empty) {
        navigate(`/quotes?requestId=${request.id}`);
        return;
      }
      
      // Buscar si hay alguna cotización aceptada
      const acceptedQuoteQuery = query(
        cotizacionesRef,
        where("requestId", "==", request.id),
        where("status", "==", "accepted")
      );
      const acceptedQuoteSnapshot = await getDocs(acceptedQuoteQuery);
      
      if (acceptedQuoteSnapshot.empty) {
        // Si hay cotizaciones pero ninguna aceptada, ir a la página de cotizaciones 
        // para que el usuario pueda ver y aceptar alguna
        navigate(`/quotes?requestId=${request.id}`);
        return;
      }
      
      // Si hay cotización aceptada, obtener su ID
      const cotizacionId = acceptedQuoteSnapshot.docs[0].id;
      
      // Si es confirmada o completada, ir a la página de seguimiento de orden
      if (request.status === 'confirmado' || request.status === 'completado') {
        navigate(`/order-status?id=${cotizacionId}`);
      } else {
        // Para cualquier otro estado, ir a la página de cotizaciones
        navigate(`/quotes?requestId=${request.id}`);
      }
    } catch (error) {
      console.error("Error al manejar la navegación:", error);
      // En caso de error, ir a la página de cotizaciones por defecto
      navigate(`/quotes?requestId=${request.id}`);
    }
  };

  const handleAddComment = async (requestId: string) => {
    if (!newComment[requestId]?.trim()) return;

    try {
      const commentRef = collection(db, "comments");
      await addDoc(commentRef, {
        requestId,
        comment: newComment[requestId],
        createdAt: new Date().toISOString(),
      });

      setComments((prev) => ({
        ...prev,
        [requestId]: [...(prev[requestId] || []), newComment[requestId]],
      }));
      setNewComment((prev) => ({ ...prev, [requestId]: "" }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
                <p className="text-gray-600">Gestiona todas tus solicitudes de herramientas</p>
              </div>
              
              <Link 
                to="/new-request"
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 w-fit"
              >
                <Plus size={20} />
                <span>Nueva Solicitud</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Solicitudes</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSolicitudes}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Proceso</p>
                  <p className="text-2xl font-bold text-gray-900">{enProceso}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cotizaciones</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCotizaciones}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">💬</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ahorro Total</p>
                  <p className="text-2xl font-bold text-gray-900">${ahorroTotal.toLocaleString()}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">💰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.name} ({tab.count})
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar solicitudes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                  <Filter size={16} />
                  <span>Filtros</span>
                </button>
              </div>
            </div>
          </div>

          {/* Requests Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl shadow-md p-6">
                <RequestCard
                  request={request}
                  onViewDetails={handleViewDetails}
                />

                {request.status === "confirmado" && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-gray-900">Comentarios</h3>
                    <div className="space-y-4">
                      {/* Existing comments */}
                      {comments[request.id]?.map((comment, index) => (
                        <div
                          key={index}
                          className="bg-gray-100 rounded-lg p-3 text-sm text-gray-800"
                        >
                          {comment}
                        </div>
                      ))}

                      {/* Add new comment */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Escribe un comentario..."
                          value={newComment[request.id] || ""}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleAddComment(request.id)}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {requests.length === 0 
                    ? "No tienes solicitudes aún" 
                    : `No se encontraron solicitudes ${activeTab !== 'all' ? 'en este estado' : ''}`}
                </h3>
                <p className="text-gray-600 mb-4">
                  {requests.length === 0 
                    ? "Crea tu primera solicitud para recibir cotizaciones de proveedores" 
                    : searchTerm 
                      ? "Intenta ajustar tus términos de búsqueda"
                      : "Intenta seleccionar otro filtro de estado"}
                </p>
                <Link 
                  to="/new-request"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>{requests.length === 0 ? "Crear Primera Solicitud" : "Nueva Solicitud"}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Requests;
