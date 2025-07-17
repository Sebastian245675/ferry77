import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import RequestCard from '../components/RequestCard';
import CompanyCard from '../components/CompanyCard';
import { Link } from 'react-router-dom';
import { Plus, Package, Truck, Star, TrendingUp, AlertCircle, CheckCircle, Users, DollarSign, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';


const Index = () => {
  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  // Estado para solicitudes reales
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
        // 2. Obtener los IDs de esas solicitudes
        const requestIds = requests.map(r => r.id);
        let completedOrdersCount = 0;
        let allQuotes = [];
        if (requestIds.length > 0) {
          // Firestore solo permite 10 elementos en 'in', así que dividimos en lotes
          const batchSize = 10;
          const batches = [];
          for (let i = 0; i < requestIds.length; i += batchSize) {
            batches.push(requestIds.slice(i, i + batchSize));
          }
          for (const batch of batches) {
            const quotesSnapshot = await getDocs(query(
              collection(db, 'cotizaciones'),
              where('requestId', 'in', batch)
            ));
            allQuotes = allQuotes.concat(quotesSnapshot.docs.map(doc => doc.data()));
          }
          completedOrdersCount = allQuotes.filter(data =>
            ['accepted', 'confirmado'].includes(data.status) && data.deliveryStatus === 'entregado'
          ).length;
          // Actualizar puntos en el documento de usuario
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { points: completedOrdersCount * 50 }, { merge: true });
          } catch (err) {
            console.error('Error actualizando puntos:', err);
          }
        }
        setUserStats(prev => ({
          ...prev,
          activeRequests: requests.filter(
            r => (typeof r.status === 'string' && r.status.toLowerCase() === 'pendiente') &&
                 (typeof r.estado === 'string' && r.estado.toLowerCase() === 'activo')
          ).length,
          completedOrders: completedOrdersCount,
          points: completedOrdersCount * 50 // Actualiza puntos en el estado local
        }));
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

  const recommendedCompanies = [
    {
      id: '1',
      name: 'Ferretería Central',
      rating: 4.8,
      deliveryTime: '30-45 min',
      deliveryFee: 500,
      image: '/placeholder.svg',
      specialties: ['Herramientas', 'Construcción']
    },
    {
      id: '2',
      name: 'ToolMaster Pro',
      rating: 4.6,
      deliveryTime: '45-60 min',
      deliveryFee: 800,
      image: '/placeholder.svg',
      specialties: ['Herramientas Profesionales']
    },
    {
      id: '3',
      name: 'Construcciones Rápidas',
      rating: 4.9,
      deliveryTime: '20-30 min',
      deliveryFee: 300,
      image: '/placeholder.svg',
      specialties: ['Materiales', 'Urgentes']
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
      {/* Icono de perfil solo en móvil, lleva a perfil */}
      <div className="fixed bottom-20 right-4 z-40 md:hidden">
        <Link to="/profile">
          <button className="bg-white shadow-lg rounded-full p-3 border border-gray-200 flex items-center justify-center hover:bg-blue-50 transition">
            <UserCircle className="w-7 h-7 text-blue-600" />
          </button>
        </Link>
      </div>
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header de bienvenida */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {greeting}, Juan 👋
            </h1>
            <p className="text-gray-600">
              ¿Qué herramientas necesitas hoy?
            </p>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {todayStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-600">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Acciones rápidas */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Link key={index} to={action.link}>
                      <div className="flex flex-col items-center p-4 rounded-lg border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Solicitudes recientes */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Mis Solicitudes</h2>
                <Link to="/requests">
                  <Button variant="outline" size="sm">
                    Ver todas
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4">
                {loadingRequests ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                      <h3 className="font-medium text-gray-900 mb-2">Cargando solicitudes...</h3>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div style={{marginBottom:8, fontSize:13, color:'#666'}}>
                      Total solicitudes encontradas: {recentRequests.length}
                    </div>
                    {recentRequests.length > 0 ? (
                      recentRequests.map((request) => (
                        <RequestCard key={request.id} request={request} onViewDetails={handleViewDetails} />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="font-medium text-gray-900 mb-2">No tienes solicitudes</h3>
                          <p className="text-gray-600 mb-4">Crea tu primera solicitud para obtener cotizaciones</p>
                          <Link to="/new-request">
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Nueva Solicitud
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              {/* Empresas recomendadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Empresas Recomendadas</span>
                    <Link to="/companies">
                      <Button variant="outline" size="sm">Ver todas</Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recommendedCompanies.slice(0, 3).map((company) => (
                    <div key={company.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-blue-600">
                            {company.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{company.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
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

              {/* Tips y consejos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span>Consejos del día</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Ahorra en envíos</h4>
                      <p className="text-sm text-blue-700">
                        Agrupa tus pedidos para aprovechar envíos gratuitos desde $15.000
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Gana más puntos</h4>
                      <p className="text-sm text-green-700">
                        Completa tu perfil y gana 500 puntos adicionales
                      </p>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-1">Califica empresas</h4>
                      <p className="text-sm text-yellow-700">
                        Ayuda a otros usuarios calificando tus experiencias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de cuenta */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Cuenta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nivel actual:</span>
                      <Badge>Plata</Badge>
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
                        <Button variant="outline" className="w-full">
                          <Star className="w-4 h-4 mr-2" />
                          Ver Recompensas
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
