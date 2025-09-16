import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Package, ChevronRight, AlertTriangle, Truck, Phone } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigationDelivery from '../components/BottomNavigationDelivery';

const DeliveryActive = () => {
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>(null);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/auth');
          return;
        }
        
        // Obtener datos del usuario
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData({
            uid: user.uid,
            ...data
          });
          
          // Cargar las entregas activas
          loadActiveDeliveries(user.uid);
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error al cargar datos de usuario:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus datos. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const loadActiveDeliveries = async (userId: string) => {
    try {
      setLoading(true);
      const activeDeliveriesList: any[] = [];
      
      // Buscar en la colección 'deliveries'
      const deliveriesQuery = query(
        collection(db, 'deliveries'),
        where('driverId', '==', userId),
        where('status', 'in', ['inDelivery', 'accepted', 'onTheWay'])
      );
      
      const deliveriesSnapshot = await getDocs(deliveriesQuery);
      
      for (const doc of deliveriesSnapshot.docs) {
        const deliveryData = {
          id: doc.id,
          ...doc.data(),
          source: 'deliveries'
        };
        activeDeliveriesList.push(deliveryData);
      }
      
      // Buscar en la colección 'orders'
      const ordersQuery = query(
        collection(db, 'orders'),
        where('assignedDelivery', '==', userId),
        where('status', 'in', ['inDelivery', 'accepted', 'onTheWay'])
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      
      for (const doc of ordersSnapshot.docs) {
        const orderData = {
          id: doc.id,
          ...doc.data(),
          source: 'orders'
        };
        activeDeliveriesList.push(orderData);
      }
      
      // Ordenar por fecha (más reciente primero)
      const sortedDeliveries = activeDeliveriesList.sort((a, b) => {
        const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
        const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setActiveDeliveries(sortedDeliveries);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar entregas activas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus entregas activas. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleViewDetails = (delivery: any) => {
    // Navegamos a la página de detalles con el ID y la fuente
    navigate(`/delivery-details/${delivery.id}?source=${delivery.source || 'orders'}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'inDelivery':
        return <Badge className="bg-blue-500">En entrega</Badge>;
      case 'onTheWay':
        return <Badge className="bg-green-500">En camino</Badge>;
      case 'accepted':
        return <Badge className="bg-purple-500">Aceptado</Badge>;
      default:
        return <Badge className="bg-gray-500">Pendiente</Badge>;
    }
  };

  const callPhone = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      toast({
        title: "Número no disponible",
        description: "No hay un número de teléfono disponible para contactar.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-blue-600 text-white py-4 px-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold flex items-center">
            <Truck className="mr-2" /> Mis Entregas Activas
          </h1>
          <p className="text-sm text-blue-100 mt-1">
            Entregas que has aceptado y están en proceso
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-4 px-4">
        {loading ? (
          // Loading skeletons
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 relative">
                <div className="flex flex-col space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-28" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : activeDeliveries.length > 0 ? (
          // List of active deliveries
          <div className="space-y-4">
            {activeDeliveries.map((delivery) => (
              <Card key={delivery.id} className="p-4 relative hover:shadow-md transition-shadow">
                <div className="border-l-4 border-blue-500 pl-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">
                      {delivery.clientName || delivery.requestClientName || "Cliente"}
                      {delivery.isUrgent && (
                        <Badge className="ml-2 bg-red-500">Urgente</Badge>
                      )}
                    </h3>
                    {getStatusBadge(delivery.status)}
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Asignado: {formatDate(delivery.assignedAt)}
                  </div>
                  
                  <div className="flex items-start mb-2">
                    <MapPin className="h-4 w-4 mr-1 text-red-500 mt-1 flex-shrink-0" />
                    <span className="text-sm">
                      {delivery.deliveryAddress || delivery.destination || "Dirección no disponible"}
                    </span>
                  </div>
                  
                  {delivery.description && (
                    <div className="text-sm text-gray-700 mb-2 border-t border-gray-100 pt-2">
                      <Package className="h-4 w-4 inline mr-1" />
                      <span className="font-medium">Descripción:</span> {delivery.description}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                    {delivery.clientPhone ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => callPhone(delivery.clientPhone)}
                        className="text-blue-600"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Contactar
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-500">Sin contacto</span>
                    )}
                    
                    <Button 
                      onClick={() => handleViewDetails(delivery)} 
                      className="bg-blue-600 text-white"
                      size="sm"
                    >
                      Ver detalles
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No tienes entregas activas</h2>
            <p className="text-gray-500 mb-6">
              Cuando aceptes pedidos para entrega, aparecerán aquí.
            </p>
            <Button 
              onClick={() => navigate('/delivery-dashboard')} 
              className="bg-blue-600 text-white"
            >
              Ir a pedidos disponibles
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigationDelivery />
    </div>
  );
};

export default DeliveryActive;
