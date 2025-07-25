
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import RequestCard from '../components/RequestCard';
import CompanyCard from '../components/CompanyCard';
import { Plus, Package, Truck, Star, TrendingUp, AlertCircle, CheckCircle, Users, DollarSign, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';


const Index = () => {
  // Estado para saludo
  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // Estado para solicitudes recientes
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Estado para estadísticas del usuario
  const [userStats, setUserStats] = useState({
    activeRequests: 0,
    completedOrders: 0,
    totalSpent: 85000,
    savedAmount: 15000,
    points: 2450
  });

  // Cargar solicitudes y pedidos completados del usuario autenticado
  useEffect(() => {
    const auth = getAuth();
    let unsubscribe;
    const fetchData = async (user) => {
      setLoadingRequests(true);
      try {
        if (!user) {
          setRecentRequests([]);
          setUserStats(prev => ({ ...prev, activeRequests: 0, completedOrders: 0 }));
          setLoadingRequests(false);
          return;
        }
        // 1. Buscar solicitudes del usuario
        const q = query(
          collection(db, 'solicitud'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          let budget = 0;
          if (typeof data.budget === 'string') {
            budget = data.budget.trim() === '' ? 0 : parseInt(data.budget, 10) || 0;
          } else if (typeof data.budget === 'number') {
            budget = data.budget;
          }
          let createdAt = typeof data.createdAt === 'string' && data.createdAt
            ? data.createdAt
            : new Date().toISOString();
          let items = Array.isArray(data.items) ? data.items : [];
          return {
            id: doc.id,
            status: data.status ?? "pendiente",
            title: data.title ?? "Sin título",
            items,
            userId: data.userId ?? "",
            profession: data.profession ?? "general",
            location: data.location ?? "No especificada",
            urgency: data.urgency ?? "media",
            budget,
            createdAt,
            quotesCount: 0, // Se actualizará abajo
            description: data.description ?? "",
            estado: data.estado ?? "",
            deliveryStatus: data.deliveryStatus ?? ""
          };
        });
        // 2. Obtener el número real de cotizaciones por solicitud
        for (const req of requests) {
          const quotesSnapshot = await getDocs(query(
            collection(db, 'cotizaciones'),
            where('requestId', '==', req.id)
          ));
          req.quotesCount = quotesSnapshot.size;
        }
        setRecentRequests(requests);
        // Pedidos completados: solicitudes del usuario con deliveryStatus === 'entregado'
        const completedOrdersCount = requests.filter(
          r => r.deliveryStatus === 'entregado'
        ).length;
        // Actualizar puntos en el documento de usuario
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, { points: completedOrdersCount * 50 }, { merge: true });
        } catch (err) {
          console.error('Error actualizando puntos:', err);
        }
        // En desarrollo usaremos un valor fijo para facilitar el desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log("Modo desarrollo: Mostrando 3 solicitudes activas en dashboard");
          setUserStats(prev => ({
            ...prev,
            activeRequests: 3, // Valor fijo para desarrollo
            completedOrders: completedOrdersCount,
            points: completedOrdersCount * 50
          }));
        } else {
          // En producción, usamos el filtro correcto: status === "cotizando"
          setUserStats(prev => ({
            ...prev,
            // Solo status === 'cotizando' cuenta como solicitud activa
            activeRequests: requests.filter(
              r => typeof r.status === 'string' && r.status.toLowerCase() === 'cotizando'
            ).length,
            completedOrders: completedOrdersCount,
            points: completedOrdersCount * 50
          }));
        }
      } catch (e) {
        setRecentRequests([]);
        setUserStats(prev => ({ ...prev, activeRequests: 0, completedOrders: 0 }));
        console.error('Error trayendo solicitudes o pedidos:', e);
      }
      setLoadingRequests(false);
    };
    unsubscribe = onAuthStateChanged(auth, (user) => {
      fetchData(user);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  // Estado para el buscador principal
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Definir tipo para los items sugeridos (como en NewRequest)
  interface SuggestedItem {
    id: string;
    name?: string;
    specifications?: string;
    imageUrl?: string;
    price?: string;
    quantity?: number;
    empresa?: string;
    empresaId?: string;
    recomendado?: boolean;
    empresasCount?: number;
    unidadesCount?: number;
    empresas?: Set<string>;
    [key: string]: any; // Para otras propiedades que puedan existir
  }
  
  const navigate = useNavigate();

  // Buscar igual que la lógica de creación de solicitud: exacto y parcial, agrupando y recomendado solo exactos
  // Debounce function para mejorar rendimiento
  const debounce = (func, delay) => {
    let debounceTimer;
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    }
  };

  // Función de búsqueda mejorada con debounce
  const handleSearch = debounce(async (value) => {
    setSearchTerm(value);
    if (!value || value.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    
    setIsSearching(true);
    setShowSearchDropdown(true);
    
    try {
      console.log("Buscando:", value);
      
      // 1. Primero buscar en listado_supremo 
      const listadoSupremoRef = collection(db, "listado_supremo");
      const snapshot = await getDocs(listadoSupremoRef);
      
      // Convertir todos los documentos a objetos y aplicar normalización
      const allSupremoItems = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          name: data.name || '',
          specifications: data.specifications || data.descripcion || '',
          imageUrl: data.imageUrl || data.image || data.imagen || ''
        } as SuggestedItem;
      });
      
      console.log(`Encontrados ${allSupremoItems.length} items en listado_supremo`);
      
      // Filtrar por término de búsqueda - exacto primero (case insensitive)
      const normalizedSearchTerm = value.toLowerCase().trim();
      const exactSupremo = allSupremoItems.filter(item => 
        item.name && item.name.toLowerCase().trim() === normalizedSearchTerm
      );
      
      // Luego parcial
      const partialSupremo = allSupremoItems.filter(item => 
        item.name && 
        item.name.toLowerCase().includes(normalizedSearchTerm) && 
        item.name.toLowerCase() !== normalizedSearchTerm
      );
      
      console.log(`Coincidencias exactas: ${exactSupremo.length}, parciales: ${partialSupremo.length}`);
      
      // 2. Buscar también en productos de empresas (listados) para resultados más completos
      let allProducts = [];
      const listadosSnap = await getDocs(collection(db, 'listados'));
      
      listadosSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.products && Array.isArray(data.products)) {
          data.products.forEach(p => {
            // Normalizar datos de productos
            allProducts.push({
              ...p,
              id: p.id || `prod-${doc.id}-${Math.random().toString(36).substring(2, 9)}`,
              name: p.name || p.nombre || '',
              specifications: p.specifications || p.descripcion || p.description || '',
              imageUrl: p.imageUrl || p.image || p.imagen || '',
              empresa: data.companyName || data.nombreEmpresa || data.nick || data.name || data.razonSocial || data.empresa || data.nombre || '',
              empresaId: doc.id
            });
          });
        }
      });
      
      console.log(`Encontrados ${allProducts.length} productos en empresas`);
      
      // Coincidencia exacta y parcial para productos de empresas
      const exactProducts = allProducts.filter(prod => 
        prod.name && prod.name.toLowerCase().trim() === normalizedSearchTerm
      );
      
      const partialProducts = allProducts.filter(prod => 
        prod.name && 
        prod.name.toLowerCase().includes(normalizedSearchTerm) && 
        prod.name.toLowerCase().trim() !== normalizedSearchTerm
      );

      console.log(`Empresas - coincidencias exactas: ${exactProducts.length}, parciales: ${partialProducts.length}`);

      // Agrupar resultados por nombre de producto
      function aggregate(items: SuggestedItem[], recomendado: boolean) {
        const map = new Map();
        items.forEach(item => {
          const key = item.name?.toLowerCase();
          if (!key) return;
          if (!map.has(key)) {
            map.set(key, {
              id: item.id,
              name: item.name,
              unidadesCount: 0,
              empresas: new Set(),
              specifications: item.specifications || '',
              imageUrl: item.imageUrl || '',
              price: item.price || '',
              recomendado
            });
          }
          const entry = map.get(key);
          entry.unidadesCount += Number(item.quantity || 1);
          if (item.empresaId) entry.empresas.add(item.empresaId);
        });
        return Array.from(map.values()).map(e => ({
          ...e,
          empresasCount: e.empresas.size || 1
        }));
      }

      // Resultados exactos recomendados primero, luego parciales
      let results = [
        ...aggregate(exactSupremo, true),
        ...aggregate(exactProducts, true),
        ...aggregate(partialSupremo, false),
        ...aggregate(partialProducts, false)
      ];
      
      // Quitar duplicados por nombre
      const seen = new Set();
      results = results.filter(r => {
        if (!r.name) return false;
        if (seen.has(r.name.toLowerCase())) return false;
        seen.add(r.name.toLowerCase());
        return true;
      });
      
      console.log(`Resultados finales: ${results.length}`);
      
      // Limitar a máximo 15 resultados para mejor rendimiento
      setSearchResults(results.slice(0, 15));
    } catch (e) {
      console.error("Error al buscar:", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Al seleccionar sugerencia, ir a /new-request con el item prellenado y sus detalles
  const handleSelectSuggestion = (item) => {
    setShowSearchDropdown(false);
    setSearchTerm('');
    setSearchResults([]);
    
    // Construir URL con parámetros para prellenar la solicitud
    const params = new URLSearchParams();
    
    // Parámetros principales
    params.append('item', item.name);
    
    // Parámetros adicionales si existen
    if (item.specifications) params.append('specs', item.specifications);
    if (item.imageUrl) params.append('image', item.imageUrl);
    if (item.price) params.append('price', item.price);
    if (item.unidadesCount && item.unidadesCount > 1) params.append('quantity', item.unidadesCount.toString());
    
    // Navegar a nueva solicitud con los parámetros
    navigate(`/new-request?${params.toString()}`);
    
    // Registrar evento de búsqueda (se podría implementar analytics)
    console.log('Búsqueda seleccionada:', item.name);
  };


  const recommendedCompanies = [
    {
      id: '1',
      name: 'Ferretería Central',
      rating: 4.8,
      deliveryTime: '30-45 min',
      deliveryFee: 500,
      image: '/placeholder.svg',
      specialties: ['Herramientas', 'Construcción'],
      verified: true
    },
    {
      id: '2',
      name: 'ToolMaster Pro',
      rating: 4.6,
      deliveryTime: '45-60 min',
      deliveryFee: 800,
      image: '/placeholder.svg',
      specialties: ['Herramientas Profesionales'],
      verified: false
    },
    {
      id: '3',
      name: 'Construcciones Rápidas',
      rating: 4.9,
      deliveryTime: '20-30 min',
      deliveryFee: 300,
      image: '/placeholder.svg',
      specialties: ['Materiales', 'Urgentes'],
      verified: true
    }
  ];

  const quickActions = [
    {
      title: 'Nueva Solicitud',
      description: 'Solicita herramientas',
      icon: Plus,
      color: 'bg-blue-500',
      link: '/new-request'
    },
    {
      title: 'Rastrear Pedido',
      description: 'Sigue tu entrega',
      icon: Truck,
      color: 'bg-green-500',
      link: '/tracking'
    },
    {
      title: 'Ver Empresas',
      description: 'Explora opciones',
      icon: Users,
      color: 'bg-purple-500',
      link: '/companies'
    },
    {
      title: 'Mi Saldo',
      description: 'Gestiona dinero',
      icon: DollarSign,
      color: 'bg-yellow-500',
      link: '/balance'
    }
  ];

  const todayStats = [
    { label: 'Solicitudes activas', value: userStats.activeRequests, icon: Package, color: 'text-blue-600' },
    { label: 'Pedidos completados', value: userStats.completedOrders, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Puntos disponibles', value: userStats.points, icon: Star, color: 'text-yellow-600' },
    { label: 'Dinero ahorrado', value: `$${(userStats.savedAmount / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-purple-600' }
  ];

  const handleViewDetails = (request: any) => {
    // Aquí se podría navegar a una página de detalles
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* ...eliminado el icono flotante de perfil móvil... */}
      
      <main className="pb-20 md:pb-8">
        {/* Hero section with hardware pattern bg - only on mobile */}
        <div className="md:hidden bg-gradient-to-r from-blue-700 to-blue-900 bg-opacity-90 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: "url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            backgroundSize: '15px 15px',
          }}></div>
          <div className="px-5 py-6 relative z-10">
            <h1 className="text-2xl font-extrabold text-white mb-2 drop-shadow-md">
              {greeting}, Juan 🔧
            </h1>
            <p className="text-blue-100 text-sm mb-6 opacity-90">
              ¿Qué herramientas necesitas construir hoy?
            </p>
            
            {/* Enhanced search bar for mobile */}
            <div className="mb-6 space-y-2">
              <div className="relative rounded-xl overflow-hidden shadow-lg bg-white">
                <div className="absolute left-0 inset-y-0 w-10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="search"
                  className="w-full p-4 pl-12 bg-white placeholder-gray-500 text-gray-900 focus:outline-none"
                  placeholder="¿Qué necesitas para tu proyecto?"
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (searchTerm && searchTerm.length >= 2) {
                      setShowSearchDropdown(true);
                      handleSearch(searchTerm);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  autoComplete="off"
                  id="searchInputMobile"
                />
                {searchTerm && (
                  <button 
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
                    onClick={() => {
                      setSearchTerm('');
                      setSearchResults([]);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Quick search suggestions */}
              <div className="flex flex-wrap justify-center gap-2">
                {['Cemento', 'Martillo', 'Pintura', 'Cables', 'Tornillos'].map(suggestion => (
                  <button
                    key={suggestion}
                    className="bg-white/80 text-blue-800 text-xs px-3 py-1.5 rounded-full shadow-sm border border-white/50"
                    onClick={() => {
                      setSearchTerm(suggestion);
                      handleSearch(suggestion);
                      setShowSearchDropdown(true);
                      document.getElementById('searchInputMobile')?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              {/* Enhanced dropdown with better UI */}
              {showSearchDropdown && (searchResults.length > 0 || isSearching) && (
                <div className="absolute left-4 right-4 top-[140px] bg-white rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
                  {isSearching && (
                    <div className="p-6 flex items-center justify-center text-blue-700">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Buscando productos...</span>
                    </div>
                  )}
                  
                  {!isSearching && searchResults.length > 0 && (
                    <div>
                      <div className="py-2 px-4 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs font-medium text-blue-700">Resultados para "{searchTerm}"</p>
                      </div>
                      
                      <div className="divide-y divide-gray-100">
                        {searchResults.map((item, idx) => (
                          <button
                            key={item.id || idx}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3"
                            onMouseDown={() => handleSelectSuggestion(item)}
                          >
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain rounded bg-white border border-gray-100 p-1" />
                            ) : (
                              <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-blue-700">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 block">{item.name}</span>
                              {item.specifications && (
                                <span className="text-xs text-gray-500 block truncate">{item.specifications}</span>
                              )}
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <span>{item.unidadesCount || 1} unidades</span>
                                <span className="mx-1 text-gray-300">•</span>
                                <span>{item.empresasCount || 1} empresas</span>
                                {item.recomendado && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-sm text-[10px] font-medium flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-0.5">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    TOP
                                  </span>
                                )}
                              </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ))}
                      </div>
                      
                      <div className="py-3 px-4 bg-gray-50 border-t border-gray-100">
                        <button
                          className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                          onClick={() => navigate(`/new-request?term=${encodeURIComponent(searchTerm)}`)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Crear solicitud personalizada
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!isSearching && searchResults.length === 0 && (
                    <div className="p-6 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">No se encontraron productos para "{searchTerm}"</p>
                      <button
                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium transition-colors"
                        onClick={() => navigate(`/new-request?term=${encodeURIComponent(searchTerm)}`)}
                      >
                        Crear solicitud personalizada
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 py-6 md:pt-6">
          {/* Header - only visible on desktop */}
          <div className="hidden md:block mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {greeting}, Juan 👋
            </h1>
            <p className="text-gray-600">
              ¿Qué herramientas necesitas hoy?
            </p>
          </div>

          {/* Estadísticas rápidas - restyled for mobile with icons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            {todayStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="overflow-hidden border-0 md:border">
                  <CardContent className="p-0 md:p-4">
                    <div className="relative h-full">
                      {/* Mobile version - top accent bar with themed backgrounds */}
                      <div className="md:hidden">
                        <div className={`h-1.5 ${
                          index === 0 ? 'bg-blue-600' : 
                          index === 1 ? 'bg-green-600' : 
                          index === 2 ? 'bg-yellow-500' : 
                          'bg-purple-600'
                        }`}></div>
                        <div className="p-3 flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full ${
                            index === 0 ? 'bg-blue-100' : 
                            index === 1 ? 'bg-green-100' : 
                            index === 2 ? 'bg-yellow-100' : 
                            'bg-purple-100'
                          } flex items-center justify-center mb-2`}>
                            <Icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                          <p className="text-xs text-gray-600 text-center">{stat.label}</p>
                        </div>
                      </div>
                      
                      {/* Desktop version - original horizontal layout */}
                      <div className="hidden md:flex items-center space-x-3 p-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          <p className="text-xs text-gray-600">{stat.label}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Acciones rápidas - Herramientas Toolkit */}
          <div className="mb-8">
            <div className="flex items-center mb-4 md:mb-5">
              <div className="hidden md:block h-6 w-1.5 bg-yellow-500 rounded-full mr-3"></div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Caja de Herramientas</h2>
            </div>
            
            <div className="relative">
              {/* Mobile version - horizontal scroll with snap */}
              <div className="md:hidden mb-2 px-1 -mx-1">
                <div className="flex overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    const toolColors = [
                      { bg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' },
                      { bg: 'from-green-500 to-green-600', shadow: 'shadow-green-500/30' },
                      { bg: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
                      { bg: 'from-yellow-500 to-yellow-600', shadow: 'shadow-yellow-500/30' },
                    ];
                    
                    return (
                      <Link key={index} to={action.link} className="snap-start w-32 mr-3 shrink-0">
                        <div className={`h-32 rounded-xl overflow-hidden relative ${toolColors[index].shadow} shadow-lg hover:scale-105 transition-all`}>
                          <div className={`absolute inset-0 bg-gradient-to-br ${toolColors[index].bg}`}></div>
                          {/* Tool-inspired patterns */}
                          <div className="absolute inset-0 opacity-10">
                            {index === 0 && (
                              <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="1"/>
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#grid)" />
                              </svg>
                            )}
                            {index === 1 && (
                              <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
                                  <circle cx="5" cy="5" r="1.5" fill="white"/>
                                </pattern>
                                <rect width="100%" height="100%" fill="url(#dots)" />
                              </svg>
                            )}
                          </div>
                          <div className="relative z-10 h-full flex flex-col items-center justify-center p-3">
                            <Icon className="w-8 h-8 text-white mb-2" />
                            <h3 className="font-medium text-white text-center text-sm">{action.title}</h3>
                            <p className="text-xs text-white text-center opacity-80">{action.description}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="flex justify-center space-x-1.5 mt-1">
                  {quickActions.map((_, i) => (
                    <div key={i} className={`h-1 w-6 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  ))}
                </div>
              </div>

              {/* Desktop version */}
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <Link key={index} to={action.link}>
                          <div className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                            <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mb-3`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-medium text-center mb-1">{action.title}</h3>
                            <p className="text-sm text-gray-600 text-center">{action.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Solicitudes recientes */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="hidden md:block h-6 w-1.5 bg-blue-500 rounded-full mr-3"></div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Mis Solicitudes</h2>
                </div>
                <Link to="/requests">
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2">
                    <span className="md:block">Ver todas</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4">
                {loadingRequests ? (
                  <div className="bg-white rounded-lg md:border p-6 shadow-sm md:shadow-none">
                    <div className="flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Package className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">Cargando solicitudes...</h3>
                      <p className="text-sm text-gray-500">Buscando tus órdenes recientes</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {recentRequests.length > 0 ? (
                      <div className="relative">
                        <div className="absolute -left-1 md:hidden h-full w-1 bg-gradient-to-b from-blue-500 to-blue-300 rounded-full"></div>
                        <div className="pl-3 md:pl-0">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-medium text-gray-500">
                              Solicitudes encontradas: {recentRequests.length}
                            </span>
                            
                            {/* Mobile swipe indicator */}
                            <div className="md:hidden flex items-center text-xs text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12h22M8 5l-7 7 7 7M16 5l7 7-7 7"/>
                              </svg>
                              <span className="ml-1">Desliza</span>
                            </div>
                          </div>
                          
                          <div className="md:space-y-4">
                            {/* Mobile - horizontal scrollable cards */}
                            <div className="md:hidden flex overflow-x-auto -mx-4 px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                              {recentRequests.map((request, index) => (
                                <div 
                                  key={request.id} 
                                  className="snap-start w-11/12 shrink-0 mr-4 last:mr-0 rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                                  onClick={() => handleViewDetails(request)}
                                >
                                  <div className="bg-gradient-to-r from-gray-50 to-white p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <h3 className="font-bold text-gray-900 truncate max-w-[80%]">
                                        {request.title || `Solicitud ${index + 1}`}
                                      </h3>
                                      <div className="flex-shrink-0">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          request.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                                          request.status === 'completado' ? 'bg-green-100 text-green-800' :
                                          request.status === 'cotizando' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {request.status}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="mb-3">
                                      {request.items && request.items.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {request.items.slice(0, 3).map((item, idx) => (
                                            <span key={idx} className="inline-block bg-gray-100 rounded px-2 py-1 text-xs">
                                              {item.quantity}x {item.name}
                                            </span>
                                          ))}
                                          {request.items.length > 3 && (
                                            <span className="inline-block bg-gray-100 rounded px-2 py-1 text-xs">
                                              +{request.items.length - 3} más
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-500">Sin items</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center text-xs text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="10"/>
                                          <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <span className="ml-1">{new Date(request.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      
                                      <div className="flex items-center text-xs font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                        <span className="ml-1">{request.quotesCount || 0} cotizaciones</span>
                                      </div>
                                    </div>
                                    
                                    <button className="w-full mt-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded transition-colors">
                                      Ver detalles
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Desktop - normal list view */}
                            <div className="hidden md:block md:space-y-4">
                              {recentRequests.map((request) => (
                                <RequestCard key={request.id} request={request} onViewDetails={handleViewDetails} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <Package className="w-10 h-10 text-blue-500" />
                          </div>
                          <h3 className="font-bold text-gray-900 mb-2">Sin solicitudes aún</h3>
                          <p className="text-gray-600 text-center mb-6">Crea tu primera solicitud para encontrar las mejores herramientas al mejor precio</p>
                          <Link to="/new-request">
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4" />
                              Nueva Solicitud
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              {/* Empresas recomendadas - Mobile First Design */}
              <div className="md:hidden">
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center">
                      <div className="h-4 w-1 bg-amber-500 rounded-full mr-2"></div>
                      <h2 className="font-bold text-gray-900">Empresas Destacadas</h2>
                    </div>
                    <Link to="/companies">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-600">
                        Ver más
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {recommendedCompanies.slice(0, 3).map((company) => (
                      <Link key={company.id} to={`/company/${company.id}`}>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all">
                          {/* Company Hardware-themed logo */}
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-md relative overflow-hidden">
                            {/* Hardware pattern background */}
                            <div className="absolute inset-0 opacity-20">
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                <path d="M3,6H21V18H3V6M12,9A1,1 0 0,1 13,10A1,1 0 0,1 12,11A1,1 0 0,1 11,10A1,1 0 0,1 12,9M7,8A2,2 0 0,1 9,10V11A1,1 0 0,1 10,12H11V13H10A1,1 0 0,1 9,14V15A2,2 0 0,1 7,17H6V15H7V14A1,1 0 0,1 8,13A1,1 0 0,1 7,12V10H6V8H7M16,8A2,2 0 0,1 18,10V11A1,1 0 0,1 19,12H20V13H19A1,1 0 0,1 18,14V15A2,2 0 0,1 16,17H15V15H16V14A1,1 0 0,1 17,13A1,1 0 0,1 16,12V10H15V8H16M12,13A1,1 0 0,1 13,14A1,1 0 0,1 12,15A1,1 0 0,1 11,14A1,1 0 0,1 12,13Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" className="text-white" />
                              </svg>
                            </div>
                            <span className="font-bold text-white text-lg">
                              {company.name.charAt(0)}
                            </span>
                            {company.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{company.name}</h3>
                            
                            <div className="flex items-center text-xs text-gray-600 mt-1">
                              <div className="flex items-center bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                <Star className="w-3 h-3 fill-current mr-0.5" />
                                <span className="font-medium">{company.rating}</span>
                              </div>
                              <span className="mx-1.5 text-gray-300">•</span>
                              <span>{company.deliveryTime}</span>
                              <span className="mx-1.5 text-gray-300">•</span>
                              <span className="text-green-600 font-medium">
                                ${company.deliveryFee === 0 ? 'Gratis' : `$${company.deliveryFee}`}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {company.specialties.map((specialty, index) => (
                                <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Desktop version with Card */}
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="h-5 w-1.5 bg-amber-500 rounded-full mr-3"></div>
                    <span>Empresas Recomendadas</span>
                    <Link to="/companies" className="ml-auto">
                      <Button variant="outline" size="sm">Ver todas</Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendedCompanies.slice(0, 3).map((company) => (
                    <div key={company.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="font-bold text-white">
                            {company.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{company.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-amber-400 fill-current mr-1" />
                              <span>{company.rating}</span>
                            </div>
                            <span>•</span>
                            <span>{company.deliveryTime}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {company.specialties.map((specialty, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tips y consejos - Mobile First */}
              <div className="md:hidden">
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <div className="flex items-center p-4 border-b">
                    <div className="h-4 w-1 bg-green-500 rounded-full mr-2"></div>
                    <h2 className="font-bold text-gray-900">Tips del Maestro</h2>
                  </div>
                  
                  {/* Tips carousel for mobile */}
                  <div className="p-4">
                    <div className="overflow-x-auto snap-x snap-mandatory flex space-x-4 -mx-4 px-4 pb-4 scrollbar-hide">
                      {/* Tip 1 */}
                      <div className="snap-start w-[85%] shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl overflow-hidden relative shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mr-8 -mt-8"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-full -mr-4 -mt-4"></div>
                        <div className="p-4 relative z-10">
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-sm mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                                <path d="M9 18h6"/>
                                <path d="M10 22h4"/>
                              </svg>
                            </div>
                            <h4 className="font-bold text-blue-900">Ahorra en envíos</h4>
                          </div>
                          <p className="text-sm text-blue-700 mb-2">
                            Agrupa tus pedidos para aprovechar envíos gratuitos desde $15.000
                          </p>
                          <div className="text-xs text-blue-600 font-medium flex items-center">
                            <span>Saber más</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tip 2 */}
                      <div className="snap-start w-[85%] shrink-0 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl overflow-hidden relative shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mr-8 -mt-8"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-green-200 rounded-full -mr-4 -mt-4"></div>
                        <div className="p-4 relative z-10">
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-sm mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                              </svg>
                            </div>
                            <h4 className="font-bold text-green-900">Gana más puntos</h4>
                          </div>
                          <p className="text-sm text-green-700 mb-2">
                            Completa tu perfil y gana 500 puntos adicionales para canjear
                          </p>
                          <div className="text-xs text-green-600 font-medium flex items-center">
                            <span>Completar perfil</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tip 3 */}
                      <div className="snap-start w-[85%] shrink-0 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl overflow-hidden relative shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-full -mr-8 -mt-8"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-200 rounded-full -mr-4 -mt-4"></div>
                        <div className="p-4 relative z-10">
                          <div className="flex items-center mb-3">
                            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-sm mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                              </svg>
                            </div>
                            <h4 className="font-bold text-amber-900">Califica empresas</h4>
                          </div>
                          <p className="text-sm text-amber-700 mb-2">
                            Ayuda a otros usuarios calificando tus experiencias de compra
                          </p>
                          <div className="text-xs text-amber-600 font-medium flex items-center">
                            <span>Calificar ahora</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dots indicator */}
                    <div className="flex justify-center space-x-1.5 mt-2">
                      <div className="h-1 w-6 rounded-full bg-blue-500"></div>
                      <div className="h-1 w-6 rounded-full bg-gray-300"></div>
                      <div className="h-1 w-6 rounded-full bg-gray-300"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Desktop version */}
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="h-5 w-1.5 bg-green-500 rounded-full mr-3"></div>
                    <span>Consejos del día</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-900 mb-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-2">
                          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                          <path d="M9 18h6"/>
                          <path d="M10 22h4"/>
                        </svg>
                        Ahorra en envíos
                      </h4>
                      <p className="text-sm text-blue-700">
                        Agrupa tus pedidos para aprovechar envíos gratuitos desde $15.000
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <h4 className="font-medium text-green-900 mb-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mr-2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        Gana más puntos
                      </h4>
                      <p className="text-sm text-green-700">
                        Completa tu perfil y gana 500 puntos adicionales
                      </p>
                    </div>
                    
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <h4 className="font-medium text-amber-900 mb-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 mr-2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                        Califica empresas
                      </h4>
                      <p className="text-sm text-amber-700">
                        Ayuda a otros usuarios calificando tus experiencias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de cuenta - Mobile First */}
              <div className="md:hidden">
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <div className="flex items-center p-4 border-b">
                    <div className="h-4 w-1 bg-purple-500 rounded-full mr-2"></div>
                    <h2 className="font-bold text-gray-900">Tu Caja de Herramientas</h2>
                  </div>
                  
                  {/* Account summary - mobile theme */}
                  <div className="p-4">
                    {/* Reward level meter */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-purple-600 fill-current mr-1" />
                          <span className="text-xs font-medium">Nivel de Maestro</span>
                        </div>
                        <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-300 hover:to-gray-400 text-white">Plata</Badge>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{width: '65%'}}></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>0</span>
                        <span>85k puntos para Gold</span>
                        <span>120k</span>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Total gastado</div>
                        <div className="text-lg font-bold">${userStats.totalSpent.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="text-xs text-gray-500 mb-1">Ahorrado</div>
                        <div className="text-lg font-bold text-green-600">${userStats.savedAmount.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Hardware-themed reward button */}
                    <Link to="/rewards">
                      <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg relative overflow-hidden shadow-md hover:shadow-lg transition-all flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20">
                          <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                          </svg>
                        </div>
                        <Star className="w-5 h-5 mr-2 fill-current" />
                        <span>Canjear {userStats.points} puntos</span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Desktop version */}
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="h-5 w-1.5 bg-purple-500 rounded-full mr-3"></div>
                    <span>Resumen de Cuenta</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Nivel actual:</span>
                      <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-300 hover:to-gray-400 text-white">Plata</Badge>
                    </div>
                    
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{width: '65%'}}></div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total gastado:</span>
                      <span className="font-medium">${userStats.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dinero ahorrado:</span>
                      <span className="font-medium text-green-600">
                        ${userStats.savedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-3 border-t">
                      <Link to="/rewards">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                          <Star className="w-4 h-4 mr-2 fill-current" />
                          Canjear {userStats.points} puntos
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>


        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};


export default Index;
