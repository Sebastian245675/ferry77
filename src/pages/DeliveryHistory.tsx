import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Calendar, Clock, MapPin, ChevronRight, Search, Filter } from 'lucide-react';
import BottomNavigationDelivery from '@/components/BottomNavigationDelivery';

const DeliveryHistory = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCompletedDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 'week', 'month', 'year'
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Obtener datos del usuario
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserData(userData);
            
            // Verificar si es un repartidor
            if (userData.rol !== 'repartidor' && userData.type !== 'deliveryDriver') {
              console.log('No es un repartidor, redirigiendo...');
              navigate('/');
              return;
            }
            
            // Cargar historial de entregas
            await loadDeliveryHistory(userData);
          } else {
            console.log('No se encontraron datos de usuario');
            navigate('/');
          }
        } catch (error) {
          console.error('Error al cargar datos:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        navigate('/auth');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const loadDeliveryHistory = async (userData: any) => {
    if (!auth.currentUser) return;
    
    try {
      setIsLoading(true);
      
      const ordersRef = collection(db, 'orders');
      let q = query(
        ordersRef, 
        where('assignedDelivery', '==', auth.currentUser.uid),
        where('status', '==', 'delivered'),
        orderBy('deliveredAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      let totalEarnings = 0;
      let totalRating = 0;
      let ratingCount = 0;
      
      const deliveries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Calcular estadísticas
        if (data.deliveryFee) {
          totalEarnings += data.deliveryFee;
        }
        
        if (data.deliveryRating) {
          totalRating += data.deliveryRating;
          ratingCount++;
        }
        
        return {
          id: doc.id,
          ...data
        };
      });
      
      setDeliveries(deliveries);
      setStats({
        totalCompletedDeliveries: deliveries.length,
        totalEarnings: totalEarnings,
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0
      });
    } catch (error) {
      console.error('Error al cargar historial de entregas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Filtrar entregas por término de búsqueda
  const filteredDeliveries = deliveries.filter(delivery => {
    const searchLower = searchTerm.toLowerCase();
    return (
      delivery.id.toLowerCase().includes(searchLower) ||
      (delivery.customerName && delivery.customerName.toLowerCase().includes(searchLower)) ||
      (delivery.deliveryAddress && delivery.deliveryAddress.toLowerCase().includes(searchLower))
    );
  });
  
  // Filtrar por período
  const getFilteredDeliveries = () => {
    if (filterPeriod === 'all') return filteredDeliveries;
    
    const now = new Date();
    let compareDate = new Date();
    
    if (filterPeriod === 'week') {
      compareDate.setDate(now.getDate() - 7);
    } else if (filterPeriod === 'month') {
      compareDate.setMonth(now.getMonth() - 1);
    } else if (filterPeriod === 'year') {
      compareDate.setFullYear(now.getFullYear() - 1);
    }
    
    return filteredDeliveries.filter(delivery => {
      if (!delivery.deliveredAt) return false;
      const deliveryDate = new Date(delivery.deliveredAt);
      return deliveryDate >= compareDate;
    });
  };
  
  const finalDeliveries = getFilteredDeliveries();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Historial de Entregas</h1>
          <p className="text-blue-100">Visualiza todas tus entregas completadas</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 shadow-md border-0 bg-white">
            <h3 className="text-gray-500 text-sm mb-1">Entregas Completadas</h3>
            <p className="text-2xl font-bold">{stats.totalCompletedDeliveries}</p>
          </Card>
          
          <Card className="p-4 shadow-md border-0 bg-white">
            <h3 className="text-gray-500 text-sm mb-1">Ingresos Totales</h3>
            <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
          </Card>
          
          <Card className="p-4 shadow-md border-0 bg-white">
            <h3 className="text-gray-500 text-sm mb-1">Calificación Promedio</h3>
            <p className="text-2xl font-bold flex items-center">
              {stats.averageRating.toFixed(1)}
              <span className="text-yellow-500 ml-1">★</span>
            </p>
          </Card>
        </div>

        {/* Búsqueda y filtros */}
        <div className="bg-white rounded-lg p-4 shadow-md mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar entregas..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant={filterPeriod === 'all' ? 'default' : 'outline'} 
                onClick={() => setFilterPeriod('all')}
                className={filterPeriod === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Todas
              </Button>
              <Button 
                variant={filterPeriod === 'week' ? 'default' : 'outline'} 
                onClick={() => setFilterPeriod('week')}
                className={filterPeriod === 'week' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Semana
              </Button>
              <Button 
                variant={filterPeriod === 'month' ? 'default' : 'outline'} 
                onClick={() => setFilterPeriod('month')}
                className={filterPeriod === 'month' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Mes
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de entregas */}
        {finalDeliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay entregas en tu historial</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'Aún no has completado ninguna entrega.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {finalDeliveries.map((delivery) => (
              <Card 
                key={delivery.id} 
                className="p-4 shadow-md border-0 hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/delivery-details/${delivery.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Pedido #{delivery.id.substring(0, 6)}</h3>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Calendar size={16} className="mr-1" />
                      <span>{formatDate(delivery.deliveredAt)}</span>
                    </div>
                  </div>
                  {delivery.deliveryRating && (
                    <div className="bg-yellow-100 px-3 py-1 rounded-full flex items-center">
                      <span className="text-yellow-700 font-medium mr-1">{delivery.deliveryRating.toFixed(1)}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-gray-700">
                    <MapPin size={16} className="mr-2 text-blue-600 flex-shrink-0" />
                    <span className="line-clamp-1">{delivery.deliveryAddress || 'Dirección no disponible'}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <Package size={16} className="mr-2 text-blue-600 flex-shrink-0" />
                    <span>{delivery.items?.length || 0} productos</span>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between items-center">
                  {delivery.deliveryFee !== undefined && (
                    <span className="font-medium">
                      Tarifa: ${delivery.deliveryFee.toFixed(2)}
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/delivery-details/${delivery.id}`);
                    }}
                  >
                    <span className="mr-1">Ver detalles</span>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <BottomNavigationDelivery />
    </div>
  );
};

export default DeliveryHistory;
