import React, { useEffect, useState } from 'react';
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import RequestCard from '../components/RequestCard';
import { Plus, Filter, Search, Calendar, TrendingUp, CheckCircle, Store, X, DollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Define the Request type
interface RequestItem {
  name: string;
  quantity: number;
  specifications?: string;
}

// Usamos la misma definición que en RequestCard.tsx pero con campos adicionales
interface AutoQuoteItem {
  name: string;
  quantity: number;
  specifications?: string;
  bestCompany?: string | null;
  bestCompanyName?: string | null;
  bestCompanyLogo?: string | null;
  bestCompanyRating?: number;
  bestCompanyVerified?: boolean;
  bestPrice?: number | null;
  bestProduct?: any;
  matchType?: 'exact' | 'partial' | null;
  totalMatchCount?: number;
  notFound?: boolean;
}

interface SelectedCompany {
  id: string;
  companyId: string;
  companyName?: string;
  companyLogo?: string | null;
  companyRating?: number;
  companyVerified?: boolean;
  productName?: string;
  productPrice?: number;
  productDetails?: any;
  name?: string; // fallback
}

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
  autoQuotes?: AutoQuoteItem[];
  selectedCompanies?: SelectedCompany[];
  savings?: number; // Campo opcional para el ahorro
}

import { useLocation } from 'react-router-dom';

// Función utilidad para depurar problemas con savings
function debugSavingsInfo(request: any) {
  console.group(`Depuración de Ahorro para Solicitud ${request.id}`);
  console.log(`- Estado actual: ${request.status}`);
  console.log(`- Valor de savings: ${request.savings} (tipo: ${typeof request.savings})`);
  
  if (request.autoQuotes && Array.isArray(request.autoQuotes)) {
    console.log(`- Tiene ${request.autoQuotes.length} cotizaciones automáticas`);
    let calculatedSavings = 0;
    
    request.autoQuotes.forEach((quote, index) => {
      console.group(`  Cotización #${index + 1}: ${quote.name}`);
      let suggested = 0;
      if (quote.price && !isNaN(quote.price)) suggested = Number(quote.price);
      else if (quote.suggestedPrice && !isNaN(quote.suggestedPrice)) suggested = Number(quote.suggestedPrice);
      
      const bestPrice = quote.bestPrice ? Number(quote.bestPrice) : null;
      console.log(`  - Precio sugerido: $${suggested}`);
      console.log(`  - Mejor precio: $${bestPrice}`);
      
      let diff = 0;
      if (suggested && bestPrice && suggested > bestPrice) {
        diff = suggested - bestPrice;
        calculatedSavings += diff;
        console.log(`  - Ahorro en este item: $${diff} ✅`);
      } else {
        console.log(`  - Sin ahorro en este item`);
      }
      console.groupEnd();
    });
    
    console.log(`- Ahorro total calculado: $${calculatedSavings}`);
    console.log(`- Ahorro guardado en DB: $${request.savings}`);
    
    if (Math.abs(calculatedSavings - (request.savings || 0)) > 1) {
      console.warn(`⚠️ DIFERENCIA DETECTADA entre ahorro calculado y guardado`);
    }
  } else {
    console.log(`- No tiene cotizaciones automáticas`);
  }
  
  console.groupEnd();
  return request.savings || 0;
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
  const [showAutoQuoteModal, setShowAutoQuoteModal] = useState(false);
  const [loadingAutoQuote, setLoadingAutoQuote] = useState(false);
  const [autoQuoteRequest, setAutoQuoteRequest] = useState<UserRequest | null>(null);
  // Agregar debug mode para verificar ahorros
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Detect autoQuoteId in URL
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const autoQuoteId = params.get('autoQuoteId');
    if (autoQuoteId && requests.length > 0) {
      // Find the request with this ID
      const req = requests.find(r => r.id === autoQuoteId);
      if (req && req.autoQuotes) {
        setLoadingAutoQuote(true);
        setTimeout(() => {
          setLoadingAutoQuote(false);
          setShowAutoQuoteModal(true);
          setAutoQuoteRequest(req);
        }, 1800); // Simulate loading
      }
    }
  }, [location.search, requests]);

  // Accept best offer: update status and close modal
  async function handleAcceptAutoQuote() {
    if (!autoQuoteRequest) return;
    try {
      console.log("[handleAcceptAutoQuote] Actualizando solicitud a estado 'cotizando'");
      
      // Calcular el ahorro nuevamente para asegurar que se guarde correctamente
      let calculatedSavings = 0;
      
      if (autoQuoteRequest.autoQuotes && autoQuoteRequest.autoQuotes.length > 0) {
        autoQuoteRequest.autoQuotes.forEach(quote => {
          // Buscar el precio original del producto en items (si existiera un campo price, pero no existe)
          // Por ahora, no se puede calcular el ahorro si no hay precio original
          // Si en el futuro se agrega un campo price a RequestItem, descomentar y ajustar:
          // let suggested = 0;
          // if (autoQuoteRequest.items && Array.isArray(autoQuoteRequest.items)) {
          //   const origItem = autoQuoteRequest.items.find(i => i.name === quote.name);
          //   if (origItem && origItem.price && !isNaN(origItem.price)) {
          //     suggested = Number(origItem.price);
          //   }
          // }
          // if (suggested && quote.bestPrice && !isNaN(quote.bestPrice)) {
          //   const diff = suggested - Number(quote.bestPrice);
          //   if (diff > 0) calculatedSavings += diff;
          // }
          // Por ahora, no sumar ahorro si no hay precio original
        });
      }
      
      console.log(`[handleAcceptAutoQuote] Ahorro calculado: $${calculatedSavings}`);
      
      const reqRef = doc(db, 'solicitud', autoQuoteRequest.id);
      await updateDoc(reqRef, { 
        status: 'cotizando',  // Cambiamos a cotizando en lugar de pendiente
        lastUpdated: new Date().toISOString(),
        // Asegurarnos que el ahorro se guarde correctamente
        savings: Math.round(calculatedSavings) 
      });
      
      setShowAutoQuoteModal(false);
      setAutoQuoteRequest(null);
      
      // No necesitamos actualizar la lista local porque el listener de onSnapshot lo hará automáticamente
      console.log(`[handleAcceptAutoQuote] Solicitud ${autoQuoteRequest.id} actualizada correctamente con ahorro de $${calculatedSavings}`);
    } catch (e) {
      console.error('[handleAcceptAutoQuote] Error:', e);
      alert('Error al aceptar la cotización automática');
    }
  }

  // Estado para controlar el modal de no hay más opciones
  const [showNoMoreOptionsModal, setShowNoMoreOptionsModal] = useState(false);
  
  // Dismiss modal and navigate to quotes page
  function handleDismissAutoQuote() {
    // Verificar si hay productos con más de una opción
    const hasMoreOptions = autoQuoteRequest && autoQuoteRequest.autoQuotes && 
      autoQuoteRequest.autoQuotes.some(q => q.totalMatchCount && q.totalMatchCount > 1);
    
    if (hasMoreOptions && autoQuoteRequest) {
      // Si hay más opciones, navegar a la página de cotizaciones
      navigate(`/quotes?requestId=${autoQuoteRequest.id}`);
      setShowAutoQuoteModal(false);
      setAutoQuoteRequest(null);
    } else {
      // Si no hay más opciones, mostrar un mensaje
      setShowNoMoreOptionsModal(true);
      setTimeout(() => {
        setShowNoMoreOptionsModal(false);
        // Ocultar modal principal después del mensaje
        setShowAutoQuoteModal(false);
        setAutoQuoteRequest(null);
      }, 3000); // Mostrar el mensaje por 3 segundos
    }
  }

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
        // Crear una consulta que use un listener en tiempo real para actualizar automáticamente
        const q = query(
          collection(db, collectionName),
          where("userId", "==", user.uid)
        );
        
        // Usar onSnapshot en lugar de getDocs para actualizaciones en tiempo real
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
          
          // Asegurarnos que selectedCompanies tenga datos válidos
          let selectedCompanies = data.selectedCompanies || [];
          if (selectedCompanies.length > 0) {
            // Verificar que cada empresa tenga un nombre
            selectedCompanies = selectedCompanies.map(company => {
              // Si no hay nombre de empresa, intentar obtenerlo de otras propiedades
              if (!company.companyName && !company.name) {
                console.warn(`[Request ${doc.id}] Empresa sin nombre detectada:`, company);
              }
              return company;
            });
          }
          
          // Asegurarse que el campo savings sea un número válido
          let savingsValue = 0;
          if (data.savings !== undefined && data.savings !== null) {
            // Convertir a número y verificar que no sea NaN
            savingsValue = Number(data.savings);
            if (isNaN(savingsValue)) {
              console.warn(`[Request ${doc.id}] Valor de ahorro inválido:`, data.savings);
              savingsValue = 0;
            }
          }
          
          console.log(`[Solicitud ${doc.id}] Ahorro detectado: $${savingsValue}`);
          
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
            autoQuotes: data.autoQuotes || null,
            selectedCompanies: selectedCompanies,
            selectedCompanyIds: data.selectedCompanyIds || [],
            savings: savingsValue, // Ahorro normalizado como número
          };
        }) as UserRequest[];

        // Estadísticas básicas
        setRequests(requestsData);
        setTotalSolicitudes(requestsData.length);
        setTotalCotizaciones(requestsData.reduce((acc, r) => acc + (r.quotesCount || 0), 0));
        
        // Implementación mejorada para calcular el ahorro total
        let totalAhorro = 0;
        
        // Iterar sobre todas las solicitudes y sumar los ahorros
        requestsData.forEach(request => {
          // Verificar el valor del ahorro y sumarlo si es válido
          if (request.savings !== undefined && request.savings !== null && !isNaN(Number(request.savings))) {
            totalAhorro += Number(request.savings);
            console.log(`[Cálculo Ahorro] Solicitud ${request.id}: $${request.savings} - Total acumulado: $${totalAhorro}`);
          }
        });
        
        // Actualizar el estado con el ahorro total calculado
        console.log(`[Ahorro Total] Valor final calculado: $${totalAhorro}`);
        setAhorroTotal(totalAhorro);
        
        // Contabilizar solicitudes en proceso
        setEnProceso(requestsData.filter(r => r.status === "cotizando").length);
        });

        // Devolver la función de limpieza para el listener
        return () => unsubscribe();
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
      case 'quoting': 
        return 'cotizando'; // Todas las nuevas solicitudes van aquí
      case 'confirmed': 
        return 'confirmado';
      case 'completed': 
        return 'completado';
      default: 
        return null;
    }
  };

  // Actualiza los tabs con los conteos reales (sin pendientes)
  const tabs = [
    { id: 'all', name: 'Todas', count: requests.length },
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


  // Estado para expandir/cerrar empresas responsables por solicitud (por request.id)
  const [showEmpresasMap, setShowEmpresasMap] = useState<{ [requestId: string]: boolean }>({});

  // Declarar filteredRequests aquí para evitar error de referencia
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.items && request.items.some(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    const matchesTab = activeTab === 'all' || request.status === getStatusFilter(activeTab);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* No More Options Modal */}
      {showNoMoreOptionsModal && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
            <X className="mr-2 h-5 w-5 text-gray-300" />
            <p>Sin más opciones disponibles por el momento.</p>
          </div>
        </div>
      )}
      
      {/* Loading screen for auto-quote */}
      {loadingAutoQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h2 className="text-lg font-semibold mb-2">Buscando la mejor opción para ti...</h2>
            <p className="text-gray-600">Comparando precios y empresas, por favor espera.</p>
          </div>
        </div>
      )}

      {/* Modal for best offer after auto-quote */}
      {showAutoQuoteModal && autoQuoteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
            <div className="flex items-center justify-center mb-5">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600 w-8 h-8" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center text-blue-700">¡Encontramos la mejor opción!</h2>
            <p className="mb-6 text-gray-700 text-center">Estos son los mejores precios para los artículos que solicitaste:</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              {autoQuoteRequest.autoQuotes && autoQuoteRequest.autoQuotes.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {autoQuoteRequest.autoQuotes.map((q, idx) => (
                    <li key={idx} className="py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {q.name} <span className="text-xs text-gray-500">x{q.quantity}</span>
                        </span>
                        {q.bestPrice !== null ? (
                          <span className="font-medium text-green-700">${q.bestPrice.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm text-gray-500">No disponible</span>
                        )}
                      </div>
                      
                      {q.specifications && (
                        <p className="text-xs text-gray-500 mb-1">{q.specifications}</p>
                      )}
                      
                      {q.notFound ? (
                        <div className="bg-red-50 rounded p-2 mt-1">
                          <p className="text-sm text-red-600">
                            No encontramos este producto. Prueba con otro nombre o especificaciones.
                          </p>
                        </div>
                      ) : q.bestCompanyName ? (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            {q.bestCompanyLogo ? (
                              <img 
                                src={q.bestCompanyLogo} 
                                alt={`Logo de ${q.bestCompanyName}`} 
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <Store className="w-8 h-8 text-blue-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {q.bestCompanyName}
                                {q.bestCompanyVerified && (
                                  <span className="ml-1 text-blue-500 text-xs">✓</span>
                                )}
                              </p>
                              {q.bestCompanyRating > 0 && (
                                <span className="text-yellow-400 text-xs">
                                  {Array(Math.floor(q.bestCompanyRating)).fill("★").join("")}
                                  {q.bestCompanyRating % 1 >= 0.5 ? "⯨" : ""}
                                  {Array(5 - Math.ceil(q.bestCompanyRating)).fill("☆").join("")}
                                  {" "}{q.bestCompanyRating.toFixed(1)}
                                </span>
                              )}
                              {q.totalMatchCount > 1 ? (
                                <span className="text-xs text-blue-600 block">
                                  +{q.totalMatchCount - 1} opciones más
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 block">
                                  Única opción disponible
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <span className="text-gray-500">No se encontraron cotizaciones automáticas.</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex-1 transition-all"
                onClick={handleAcceptAutoQuote}
              >
                Aceptar cotización
              </button>
              <button
                className="border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex-1 transition-all"
                onClick={handleDismissAutoQuote}
              >
                Ver otras opciones
              </button>
            </div>
          </div>
        </div>
      )}

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
          {/* Stats - Diseño mejorado para móvil */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 md:gap-0 md:block">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-0 md:mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Solicitudes</p>
                    <p className="text-lg md:text-xl font-bold text-gray-900">{totalSolicitudes}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 md:gap-0 md:block">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mb-0 md:mb-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">En Proceso</p>
                    <p className="text-lg md:text-xl font-bold text-gray-900">{enProceso}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 md:gap-0 md:block">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-0 md:mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                      <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 1.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cotizaciones</p>
                    <p className="text-lg md:text-xl font-bold text-gray-900">{totalCotizaciones}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 md:gap-0 md:block">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mb-0 md:mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-600">
                      <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152z" />
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-6a.75.75 0 01.75.75v.316a3.78 3.78 0 011.653.713c.426.33.744.74.925 1.2a.75.75 0 01-1.395.55 1.35 1.35 0 00-.447-.563 2.187 2.187 0 00-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 11-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 111.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 01-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 011.653-.713V4.75A.75.75 0 0110 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ahorro Total</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg md:text-xl font-bold text-gray-900">
                        ${typeof ahorroTotal === 'number' && !isNaN(ahorroTotal) ? 
                          ahorroTotal.toLocaleString() : '0'}
                      </p>
                      {ahorroTotal > 0 && (
                        <span className="text-xs text-green-600 font-semibold hidden md:inline-block">
                          ¡Ahorro!
                        </span>
                      )}
                    </div>
                    {ahorroTotal > 0 && (
                      <span className="text-2xs text-green-600 font-semibold md:hidden">
                        ¡Has ahorrado!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros mejorados para móvil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="p-4">
              {/* Tabs con scroll horizontal en móvil */}
              <div className="flex overflow-x-auto pb-2 hide-scrollbar">
                <div className="flex bg-gray-100 rounded-lg p-1 min-w-full md:min-w-0 whitespace-nowrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                        activeTab === tab.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.name} 
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Barra de búsqueda separada para mejor UX en móvil */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar solicitudes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                  />
                  {searchTerm && (
                    <button 
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchTerm('')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Botón de depuración para ahorros */}
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className={`p-2.5 rounded-lg flex items-center justify-center ${
                      showDebugInfo ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}
                    title="Mostrar información detallada de ahorros"
                  >
                    {showDebugInfo ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2.5 rounded-lg transition-colors flex items-center justify-center">
                    <Filter size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Agregar estilos para ocultar la barra de desplazamiento pero mantener la funcionalidad */}
            <style>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
          </div>

          {/* Requests Grid - Responsive design for mobile and desktop */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">

            {filteredRequests.map((request) => {
              // Mostrar el nombre de la empresa seleccionada (solo si hay una, o mostrar la primera si hay varias)
              let empresaNombre = null;
              // Log para depuración y verificar que sí hay empresas seleccionadas
              console.log(`[Request ${request.id}] Estado: ${request.status}, ¿Tiene selectedCompanies?:`, 
                request.selectedCompanies ? `Sí, ${request.selectedCompanies.length} empresas` : "No");
              console.log(`[Request ${request.id}] Detalle completo:`, JSON.stringify(request, null, 2));
              
              if (request.selectedCompanies && Array.isArray(request.selectedCompanies) && request.selectedCompanies.length > 0) {
                empresaNombre = request.selectedCompanies[0].companyName || request.selectedCompanies[0].name || null;
                console.log(`[Request ${request.id}] Nombre de empresa: ${empresaNombre}`);
                console.log(`[Request ${request.id}] Detalles de empresa seleccionada:`, JSON.stringify(request.selectedCompanies[0], null, 2));
              }


              // Calcular el total de la solicitud sumando los precios de los productos asignados a empresas
              let totalSolicitud = 0;
              if (request.selectedCompanies && Array.isArray(request.selectedCompanies)) {
                totalSolicitud = request.selectedCompanies.reduce((acc, ec) => {
                  if (typeof ec.productPrice === 'number' && !isNaN(ec.productPrice)) {
                    return acc + ec.productPrice;
                  }
                  return acc;
                }, 0);
              }

              return (
                <div key={request.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  {/* Header con estado y fecha */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        request.status === 'cotizando' ? 'bg-blue-500 animate-pulse' : 
                        request.status === 'confirmado' ? 'bg-orange-500' : 
                        request.status === 'completado' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-700 capitalize">
                        {request.status === 'cotizando' ? 'En cotización' : 
                         request.status === 'confirmado' ? 'Confirmada' :
                         request.status === 'completado' ? 'Completada' : request.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  
                  {/* Contenido principal */}
                  <div className="p-4">
                    {/* Mostrar el total de la solicitud si hay productos con precio */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {totalSolicitud > 0 && (
                        <div className="bg-blue-50 rounded-full px-3 py-1 flex items-center">
                          <DollarSign size={14} className="text-blue-600 mr-1" />
                          <span className="text-xs font-semibold text-blue-800">${totalSolicitud.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {/* Mostrar el ahorro si existe */}
                      {request.savings > 0 && (
                        <div className="bg-green-50 rounded-full px-3 py-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-green-600 mr-1">
                            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                          </svg>
                          <span className="text-xs font-semibold text-green-800">
                            Ahorro ${request.savings.toLocaleString()}
                            {totalSolicitud > 0 && (
                              <span className="ml-1">
                                ({Math.round((request.savings / (totalSolicitud + request.savings)) * 100)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Debug info, solo si está activado */}
                      {showDebugInfo && request.savings > 0 && (
                        <div className="bg-red-50 rounded-full px-3 py-1 flex items-center">
                          <span className="text-xs font-semibold text-red-800">
                            Debug: ${debugSavingsInfo(request)?.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Contenido de la solicitud - Reemplazo mejorado de RequestCard */}
                    <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">{request.title}</h3>
                    
                    {/* Lista de items mejorada */}
                    {request.items && request.items.length > 0 && (
                      <div className="mb-3">
                        <ul className="space-y-1.5">
                          {request.items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 flex-shrink-0"></div>
                              <div className="flex-1 flex items-center justify-between">
                                <span className="font-medium truncate mr-2">{item.name}</span>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">x{item.quantity}</span>
                              </div>
                            </li>
                          ))}
                          {request.items.length > 3 && (
                            <li className="text-xs text-blue-600 pl-3.5 mt-1">
                              + {request.items.length - 3} artículos más
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {/* Información adicional */}
                    <div className="flex flex-wrap gap-3 mb-4 mt-2">
                      {request.location && request.location !== "No especificada" && (
                        <div className="flex items-center text-xs text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1 text-gray-400">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                          </svg>
                          <span>{request.location}</span>
                        </div>
                      )}
                      
                      {request.profession && request.profession !== "general" && (
                        <div className="flex items-center text-xs text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1 text-gray-400">
                            <path fillRule="evenodd" d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 018.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 018.198-5.424zM6 11.459a29.747 29.747 0 00-2.455 1.45 32.28 32.28 0 00-.243 4.585v.188c0 .852.691 1.542 1.542 1.542h8.313c.85 0 1.54-.689 1.54-1.54v-.189a32.084 32.084 0 00-.242-4.585 29.747 29.747 0 00-2.456-1.45l-.001-.001a32.293 32.293 0 00-6 0h.002z" clipRule="evenodd" />
                          </svg>
                          <span className="capitalize">{request.profession}</span>
                        </div>
                      )}
                      
                      {request.urgency && (
                        <div className="flex items-center text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 mr-1 ${
                            request.urgency === 'alta' ? 'text-red-500' :
                            request.urgency === 'media' ? 'text-orange-400' : 'text-blue-400'
                          }`}>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                          </svg>
                          <span className={`${
                            request.urgency === 'alta' ? 'text-red-600' :
                            request.urgency === 'media' ? 'text-orange-600' : 'text-blue-600'
                          } font-medium`}>
                            {request.urgency === 'alta' ? 'Urgente' :
                             request.urgency === 'media' ? 'Media' : 'Normal'}
                          </span>
                        </div>
                      )}
                      
                      {request.quotesCount > 0 && (
                        <div className="flex items-center text-xs text-indigo-600 font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1 text-indigo-500">
                            <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.1a2.25 2.25 0 002.25 2.25h2.5a2.25 2.25 0 001.75-.84 2.25 2.25 0 00.859-1.754 2.25 2.25 0 00-1.25-1.985 41.4 41.4 0 014.779-1.573 41.41 41.41 0 013.712-.814c.19 1.174.29 2.359.29 3.546 0 2.8-.266 5.31-.78 7.305C20.266 16.564 19.089 17 17.5 17h-3.49c-.77 0-1.485-.22-2.01-.583-.527.363-1.242.583-2.01.583h-3.49c-1.589 0-2.766-.436-3.33-1.825A41.423 41.423 0 012 9.745a41.278 41.278 0 01.785-7.38C3.025 1.166 4.056.376 5.25.187c.03-.01.061-.016.093-.023z" />
                          </svg>
                          {request.quotesCount} cotizacion{request.quotesCount !== 1 ? 'es' : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Botón de acción principal solo si hay cotizaciones, completado o confirmado */}
                    {(request.status === 'completado' || request.status === 'confirmado' || request.quotesCount > 0) && (
                      <button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                        onClick={() => handleViewDetails(request)}
                      >
                        {request.status === 'completado' ? (
                          <>
                            <CheckCircle size={16} />
                            <span>Ver detalles de entrega</span>
                          </>
                        ) : request.status === 'confirmado' ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M10 1a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 2.94 7.3 5.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 1zm-2 6a2 2 0 114 0 2 2 0 01-4 0zm2 3a3 3 0 100-6 3 3 0 000 6zm-8 3a.75.75 0 01.75-.75h15.5a.75.75 0 010 1.5H2.75A.75.75 0 012 13zm1.75 1.5a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H3.75z" clipRule="evenodd" />
                            </svg>
                            <span>Seguir pedido</span>
                          </>
                        ) : request.quotesCount > 0 ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span>Ver cotizaciones ({request.quotesCount})</span>
                          </>
                        ) : null}
                      </button>
                    )}
                  </div>
                  
                  {/* Sección de Empresa Responsable - por producto si hay varias empresas */}
                  <div className="border-t border-gray-100">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-blue-600" />
                        Empresas responsables
                      </h3>
                      {request.selectedCompanies && Array.isArray(request.selectedCompanies) && request.selectedCompanies.length > 0 ? (
                        (() => {
                          // Agrupar por empresaId+producto para evitar duplicados
                          const empresasPorProducto = request.selectedCompanies.filter(ec => ec.productName);
                          // ¿Cuántas empresas únicas hay?
                          const empresasUnicas = Array.from(new Set(empresasPorProducto.map(ec => ec.companyId || ec.id)));
                          // Usar estado global por request.id
                          const showEmpresas = showEmpresasMap[request.id] || false;
                          const setShowEmpresas = (value: boolean) => setShowEmpresasMap(prev => ({ ...prev, [request.id]: value }));
                          
                          if (empresasUnicas.length === 1) {
                            // Solo una empresa, mostrar versión simplificada
                            const ec = empresasPorProducto[0];
                            return (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {ec.companyLogo ? (
                                    <img src={ec.companyLogo} alt={`Logo de ${ec.companyName || 'Empresa'}`} className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                                  ) : (
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <Store className="w-5 h-5 text-blue-700" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-900 text-sm">
                                        {ec.companyName || 'Empresa sin asignar'}
                                        {ec.companyVerified && (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600 inline-block ml-1">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </span>
                                    </div>
                                    {ec.companyRating > 0 && (
                                      <div className="text-yellow-500 text-xs flex items-center gap-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                        </svg>
                                        <span>{(ec.companyRating || 0).toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1.5 rounded-lg flex items-center text-xs font-medium transition"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/messages?companyId=${ec.id || ec.companyId}`);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5">
                                    <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
                                  </svg>
                                  Chat
                                </button>
                              </div>
                            );
                          } else {
                            // Varias empresas, mostrar con diseño mejorado
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-blue-700 font-medium">
                                      {empresasUnicas.length} empresas asignadas
                                    </span>
                                  </div>
                                  <button
                                    className="text-xs text-blue-700 flex items-center gap-1"
                                    onClick={e => { e.preventDefault(); setShowEmpresas(!showEmpresas); }}
                                  >
                                    {showEmpresas ? (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                          <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                                        </svg>
                                        Ocultar
                                      </>
                                    ) : (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                        Ver detalles
                                      </>
                                    )}
                                  </button>
                                </div>
                                
                                {/* Avatares de las empresas */}
                                {!showEmpresas && (
                                  <div className="flex -space-x-2 overflow-hidden mb-2">
                                    {empresasUnicas.slice(0, 3).map((companyId, idx) => {
                                      const company = empresasPorProducto.find(e => (e.companyId || e.id) === companyId);
                                      return (
                                        <div key={idx} className="inline-block relative">
                                          {company?.companyLogo ? (
                                            <img 
                                              src={company.companyLogo} 
                                              alt={company.companyName || 'Empresa'} 
                                              className="w-8 h-8 rounded-full border-2 border-white object-cover" 
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center">
                                              <Store className="w-4 h-4 text-blue-700" />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {empresasUnicas.length > 3 && (
                                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-700">
                                        +{empresasUnicas.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Lista expandida de empresas */}
                                {showEmpresas && (
                                  <div className="space-y-2 mt-1">
                                    {empresasPorProducto.map((ec, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center bg-gray-50 rounded-lg px-3 py-2 gap-2"
                                      >
                                        {/* Producto */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-xs text-gray-800">{ec.productName}</span>
                                            <span className="text-gray-400">→</span>
                                            <div className="flex items-center gap-1">
                                              {ec.companyLogo ? (
                                                <img src={ec.companyLogo} alt={ec.companyName || 'Empresa'} className="w-5 h-5 rounded-full" />
                                              ) : (
                                                <Store className="w-4 h-4 text-blue-700" />
                                              )}
                                              <span className="font-medium text-xs text-blue-800">{ec.companyName}</span>
                                            </div>
                                            {ec.productPrice !== undefined && ec.productPrice !== null && (
                                              <span className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
                                                ${ec.productPrice.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Botón contactar */}
                                        <button 
                                          className="bg-blue-100 text-blue-800 p-1 rounded-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/messages?companyId=${ec.id || ec.companyId}`);
                                          }}
                                          title="Contactar"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.1a2.25 2.25 0 002.25 2.25h2.5a2.25 2.25 0 001.75-.84 2.25 2.25 0 00.859-1.754 2.25 2.25 0 00-1.25-1.985 41.4 41.4 0 014.779-1.573 41.41 41.41 0 013.712-.814c.19 1.174.29 2.359.29 3.546 0 2.8-.266 5.31-.78 7.305C20.266 16.564 19.089 17 17.5 17h-3.49c-.77 0-1.485-.22-2.01-.583-.527.363-1.242.583-2.01.583h-3.49c-1.589 0-2.766-.436-3.33-1.825A41.423 41.423 0 012 9.745a41.278 41.278 0 01.785-7.38C3.025 1.166 4.056.376 5.25.187c.03-.01.061-.016.093-.023z" />
                                          </svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-orange-500">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Esperando asignación</p>
                              <p className="text-xs text-gray-500">Pronto te contactaremos</p>
                            </div>
                          </div>
                          <div className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-lg flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                              <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192z" />
                              <path fillRule="evenodd" d="M4.893 1.776a1 1 0 010 1.966l-2.11.421a1 1 0 00-.812.812l-.42 2.11a1 1 0 01-1.966 0l-.421-2.11a1 1 0 00-.812-.812l-2.11-.42a1 1 0 010-1.966l2.11-.421a1 1 0 00.812-.812l.42-2.11a1 1 0 011.967 0l.42 2.11a1 1 0 00.813.812l2.11.42z" clipRule="evenodd" />
                            </svg>
                            Pendiente
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección de comentarios mejorada */}
                  {/* Sección de comentarios mejorada */}
                  {request.status === "confirmado" && (
                    <div className="border-t border-gray-100 mt-2 pt-4 px-4 pb-4">
                      <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                          <path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 9.1a2.25 2.25 0 002.25 2.25h2.5a2.25 2.25 0 001.75-.84 2.25 2.25 0 00.859-1.754 2.25 2.25 0 00-1.25-1.985 41.4 41.4 0 014.779-1.573 41.41 41.41 0 013.712-.814c.19 1.174.29 2.359.29 3.546 0 2.8-.266 5.31-.78 7.305C20.266 16.564 19.089 17 17.5 17h-3.49c-.77 0-1.485-.22-2.01-.583-.527.363-1.242.583-2.01.583h-3.49c-1.589 0-2.766-.436-3.33-1.825A41.423 41.423 0 012 9.745a41.278 41.278 0 01.785-7.38C3.025 1.166 4.056.376 5.25.187c.03-.01.061-.016.093-.023z" />
                        </svg>
                        Comentarios
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Mostrar comentarios existentes */}
                        {comments[request.id]?.length > 0 ? (
                          <div className="space-y-2 mb-3">
                            {comments[request.id].map((comment, index) => (
                              <div
                                key={index}
                                className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 border border-gray-100"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-700">
                                      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                                    </svg>
                                  </div>
                                  <span className="text-xs font-medium text-gray-700">
                                    Comentario #{index + 1}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-auto">
                                    {new Date().toLocaleDateString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p>{comment}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 bg-gray-50 rounded-lg text-sm text-gray-500 mb-3">
                            Sin comentarios aún
                          </div>
                        )}

                        {/* Agregar nuevo comentario */}
                        <div className="flex items-center gap-2">
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
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                          />
                          <button
                            onClick={() => handleAddComment(request.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[80px]"
                            disabled={!newComment[request.id]?.trim()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                            </svg>
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Estado sin solicitudes */}
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 col-span-1 md:col-span-2 bg-white rounded-xl shadow-md p-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  {requests.length === 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-blue-600">
                      <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 3.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 17a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM17.25 17a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM9 10a.75.75 0 01-.75.75h-5.5a.75.75 0 010-1.5h5.5A.75.75 0 019 10zM17.25 10.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM14 10a2 2 0 10-4 0 2 2 0 004 0zM10 16.25a2 2 0 10-4 0 2 2 0 004 0z" />
                    </svg>
                  ) : (
                    <Search className="w-10 h-10 text-blue-600" />
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {requests.length === 0 
                    ? "Aún no tienes solicitudes" 
                    : `No se encontraron solicitudes ${activeTab !== 'all' ? 'en este estado' : ''}`}
                </h3>
                
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {requests.length === 0 
                    ? "Crea tu primera solicitud para recibir cotizaciones de proveedores y conseguir los mejores precios" 
                    : searchTerm 
                      ? `No se encontraron resultados para "${searchTerm}". Intenta con otros términos de búsqueda.`
                      : "Prueba seleccionando otro filtro de estado o crea una nueva solicitud"}
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link 
                    to="/new-request"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <Plus size={18} />
                    <span>{requests.length === 0 ? "Crear mi primera solicitud" : "Nueva solicitud"}</span>
                  </Link>
                  
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                      <span>Limpiar búsqueda</span>
                    </button>
                  )}
                </div>
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
