import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { MapPin, Phone, Calendar, Clock, CheckCircle, AlertTriangle, 
         Package, User, Truck, Navigation, ArrowLeft, MessageSquare,
         ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import DeliveryMiniMap from '@/components/DeliveryMiniMap';

const CompanyDeliveryTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverRating, setDriverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  const [deliverySteps, setDeliverySteps] = useState([
    { name: 'Pedido recibido', completed: false, time: null },
    { name: 'Pedido aceptado', completed: false, time: null },
    { name: 'Repartidor asignado', completed: false, time: null },
    { name: 'En camino', completed: false, time: null },
    { name: 'Entregado', completed: false, time: null }
  ]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        navigate('/auth');
        return;
      }
      
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || userSnap.data().rol !== 'empresa') {
          navigate('/');
          return;
        }
        
        setUserData(userSnap.data());
        setupDeliveryListener();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, id]);

  const setupDeliveryListener = () => {
    if (!id) return;
    
    try {
      // Suscribirse a cambios en la entrega
      const deliveryRef = doc(db, 'deliveries', id);
      const unsubscribe = onSnapshot(deliveryRef, (docSnap) => {
        if (docSnap.exists()) {
          const docData = docSnap.data();
          const deliveryData = { id: docSnap.id, ...(docData as Record<string, any>) };
          setDelivery(deliveryData);
          
          // Actualizar pasos de entrega
          updateDeliverySteps(deliveryData);
          setIsLoading(false);
        } else {
          // También intentar buscar en la colección de pedidos
          const orderRef = doc(db, 'orders', id);
          getDoc(orderRef).then(orderDoc => {
            if (orderDoc.exists()) {
              const docData = orderDoc.data();
              const orderData = { id: orderDoc.id, ...(docData as Record<string, any>) };
              setDelivery(orderData);
              updateDeliverySteps(orderData);
            }
            setIsLoading(false);
          }).catch(err => {
            console.error('Error al cargar el pedido:', err);
            setIsLoading(false);
          });
        }
      }, (error) => {
        console.error('Error al observar la entrega:', error);
        setIsLoading(false);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error al cargar la entrega:', error);
      setIsLoading(false);
    }
  };

  const updateDeliverySteps = (deliveryData: any) => {
    const updatedSteps = [...deliverySteps];
    
    // Pedido recibido (siempre es verdadero si tenemos datos)
    updatedSteps[0].completed = true;
    updatedSteps[0].time = deliveryData.createdAt || null;
    
    // Pedido aceptado
    if (deliveryData.acceptedAt) {
      updatedSteps[1].completed = true;
      updatedSteps[1].time = deliveryData.acceptedAt || null;
    }
    
    // Repartidor asignado
    if (deliveryData.driverId || deliveryData.assignedDelivery) {
      updatedSteps[2].completed = true;
      updatedSteps[2].time = deliveryData.assignedAt || null;
    }
    
    // En camino
    if (deliveryData.status && ['inTransit'].includes(deliveryData.status)) {
      updatedSteps[3].completed = true;
      updatedSteps[3].time = deliveryData.transitStartedAt || deliveryData.assignedAt || null;
    }
    
    // Entregado
    if (deliveryData.status && ['delivered'].includes(deliveryData.status)) {
      updatedSteps[4].completed = true;
      updatedSteps[4].time = deliveryData.deliveredAt || null;
    }
    
    setDeliverySteps(updatedSteps);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getEstimatedTime = () => {
    if (!delivery?.estimatedDeliveryTime) return null;
    
    try {
      const estimatedDate = new Date(delivery.estimatedDeliveryTime);
      const now = new Date();
      
      // Si la fecha estimada ya pasó
      if (estimatedDate < now) {
        return 'Llegando en cualquier momento';
      }
      
      // Calcular la diferencia en minutos
      const diffMs = estimatedDate.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      
      if (diffMinutes < 1) {
        return 'Llegando ahora';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minutos`;
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours} h ${mins} min`;
      }
    } catch (e) {
      return null;
    }
  };
  
  const handleRateDriver = async () => {
    if (!id || !driverRating || !delivery?.driverId) return;
    
    try {
      setIsSubmittingRating(true);
      
      // Actualizar la valoración en la entrega
      const deliveryRef = doc(db, 'deliveries', id);
      await updateDoc(deliveryRef, {
        driverRating: driverRating,
        ratedAt: serverTimestamp(),
        ratedBy: auth.currentUser?.uid || null
      });
      
      // Crear notificación para el repartidor
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        userId: delivery.driverId,
        title: '¡Has recibido una valoración!',
        message: `La empresa ${userData?.name || 'Una empresa'} ha valorado tu servicio con ${driverRating} estrellas.`,
        type: 'rating',
        deliveryId: id,
        read: false,
        timestamp: serverTimestamp(),
      });
      
      // También actualizar la calificación promedio del repartidor
      const driverRef = doc(db, 'users', delivery.driverId);
      const driverDoc = await getDoc(driverRef);
      
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        const currentRatings = driverData.ratings || [];
        
        // Añadir la nueva calificación
        currentRatings.push({
          deliveryId: id,
          rating: driverRating,
          ratedAt: new Date().toISOString(),
          companyId: auth.currentUser?.uid || null,
          companyName: userData?.name || null
        });
        
        // Calcular el promedio
        let sum = 0;
        currentRatings.forEach((r: any) => sum += r.rating);
        const averageRating = sum / currentRatings.length;
        
        // Actualizar datos del repartidor
        await updateDoc(driverRef, {
          ratings: currentRatings,
          averageRating: averageRating
        });
      }
      
      setShowRatingModal(false);
    } catch (error) {
      console.error('Error al valorar al repartidor:', error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de la entrega...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-medium">No se pudo cargar la información de la entrega</p>
          <Button onClick={() => navigate('/empresa')} className="mt-4">
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => navigate('/empresa/pedidos')} className="mr-2">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Seguimiento de Entrega</h1>
              <p className="text-sm text-blue-100">Pedido #{id?.substring(0, 6)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Tiempo estimado */}
        {getEstimatedTime() && delivery.status !== 'delivered' && (
          <Card className="mb-6 p-4 bg-blue-50 border-blue-100">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full mr-3">
                <Clock size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700">Tiempo estimado de entrega</h3>
                <p className="text-lg font-bold text-blue-600">{getEstimatedTime()}</p>
              </div>
            </div>
          </Card>
        )}
        
        {/* Estado de la entrega */}
        <Card className="mb-6 p-5 border-0 shadow-md">
          <h2 className="text-lg font-bold mb-4">Estado del Pedido</h2>
          <div className="relative">
            {/* Barra de progreso */}
            <div className="absolute top-4 left-3 w-[1px] h-[calc(100%-24px)] bg-gray-300">
              <div 
                className="bg-green-500"
                style={{ 
                  height: `${(deliverySteps.filter(step => step.completed).length / deliverySteps.length) * 100}%`,
                  width: '1px'
                }}
              ></div>
            </div>
            
            {/* Pasos */}
            <div className="space-y-6 pl-10">
              {deliverySteps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Indicador de paso */}
                  <div className={`absolute left-[-28px] top-0 w-7 h-7 rounded-full flex items-center justify-center
                    ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                    {step.completed ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      <span className="text-white font-bold text-xs">{index + 1}</span>
                    )}
                  </div>
                  
                  <div>
                    <p className={`font-medium ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                      {step.name}
                    </p>
                    {step.time && (
                      <p className="text-sm text-gray-500">
                        {formatDate(step.time)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        {/* Información del repartidor */}
        {(delivery.driverName || delivery.deliveryName) && (
          <Card className="mb-6 p-5 border-0 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Truck className="text-blue-600 mr-2" size={20} />
                <h2 className="text-lg font-bold">Información del Repartidor</h2>
              </div>
              
              {/* Botón de valoración */}
              {delivery.status === 'delivered' && !delivery.driverRating && (
                <Button 
                  size="sm"
                  onClick={() => setShowRatingModal(true)}
                  variant="outline"
                  className="flex items-center text-xs"
                >
                  <Star size={14} className="mr-1 text-yellow-500" />
                  Valorar
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="min-w-[24px] mt-1">
                  <User size={16} className="text-gray-400" />
                </div>
                <div className="ml-2">
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-medium">{delivery.driverName || delivery.deliveryName || 'No disponible'}</p>
                </div>
              </div>
              
              {(delivery.driverPhone || delivery.deliveryPhone) && (
                <div className="flex items-start">
                  <div className="min-w-[24px] mt-1">
                    <Phone size={16} className="text-gray-400" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <a 
                      href={`tel:${delivery.driverPhone || delivery.deliveryPhone}`} 
                      className="text-blue-600 font-medium"
                    >
                      {delivery.driverPhone || delivery.deliveryPhone}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Calificación del repartidor si ya fue valorado */}
              {delivery.driverRating && (
                <div className="flex items-start">
                  <div className="min-w-[24px] mt-1">
                    <Star size={16} className="text-yellow-500" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-gray-500">Valoración</p>
                    <div className="flex items-center">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span 
                            key={star}
                            className={`text-lg ${star <= delivery.driverRating ? 'text-yellow-500' : 'text-gray-300'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="ml-1 text-sm font-medium">
                        ({delivery.driverRating})
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center"
                  onClick={() => {
                    // Navegar a la conversación con el repartidor
                    const driverId = delivery.driverId || delivery.assignedDelivery;
                    if (driverId) {
                      navigate(`/messages/${driverId}`);
                    }
                  }}
                >
                  <MessageSquare size={16} className="mr-2" />
                  Contactar al Repartidor
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {/* Mapa */}
        <Card className="mb-6 overflow-hidden border-0 shadow-md">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <MapPin className="text-blue-600 mr-2" size={20} />
              <h2 className="text-lg font-bold">Ubicación de Entrega</h2>
            </div>
          </div>
          <div className="h-64">
            {(delivery.deliveryCoordinates || delivery.driverLocation) ? (
              <DeliveryMiniMap 
                centerLat={delivery.deliveryCoordinates?.lat || delivery.driverLocation?.lat || 0}
                centerLng={delivery.deliveryCoordinates?.lng || delivery.driverLocation?.lng || 0}
                markerLat={delivery.deliveryCoordinates?.lat || delivery.driverLocation?.lat || 0}
                markerLng={delivery.deliveryCoordinates?.lng || delivery.driverLocation?.lng || 0}
                zoom={15}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">No hay coordenadas disponibles</p>
              </div>
            )}
          </div>
          {delivery.deliveryAddress && (
            <div className="p-4 bg-gray-50">
              <div className="flex items-start">
                <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                <p className="ml-2 text-gray-600">{delivery.deliveryAddress}</p>
              </div>
            </div>
          )}
        </Card>
        
        {/* Información del cliente */}
        <Card className="mb-6 p-5 border-0 shadow-md">
          <div className="flex items-center mb-4">
            <User className="text-blue-600 mr-2" size={20} />
            <h2 className="text-lg font-bold">Información del Cliente</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="min-w-[24px] mt-1">
                <User size={16} className="text-gray-400" />
              </div>
              <div className="ml-2">
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{delivery.customerName || 'No disponible'}</p>
              </div>
            </div>
            
            {delivery.customerPhone && (
              <div className="flex items-start">
                <div className="min-w-[24px] mt-1">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <div className="ml-2">
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <a 
                    href={`tel:${delivery.customerPhone}`} 
                    className="text-blue-600 font-medium"
                  >
                    {delivery.customerPhone}
                  </a>
                </div>
              </div>
            )}
            
            <div className="flex items-start">
              <div className="min-w-[24px] mt-1">
                <MapPin size={16} className="text-gray-400" />
              </div>
              <div className="ml-2">
                <p className="text-sm text-gray-500">Dirección de entrega</p>
                <p className="font-medium">{delivery.deliveryAddress || 'No disponible'}</p>
              </div>
            </div>
            
            {delivery.customerNotes && (
              <div className="flex items-start">
                <div className="min-w-[24px] mt-1">
                  <AlertTriangle size={16} className="text-gray-400" />
                </div>
                <div className="ml-2">
                  <p className="text-sm text-gray-500">Notas del cliente</p>
                  <p className="font-medium">{delivery.customerNotes}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Productos */}
        {delivery.items && delivery.items.length > 0 && (
          <Card className="mb-6 p-5 border-0 shadow-md">
            <div className="flex items-center mb-4">
              <Package className="text-blue-600 mr-2" size={20} />
              <h2 className="text-lg font-bold">Productos ({delivery.items.length})</h2>
            </div>
            <div className="space-y-3">
              {delivery.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium">{item.name || 'Producto'}</p>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity || 1}</p>
                  </div>
                  {item.price && (
                    <p className="font-medium">
                      $ {(item.price * (item.quantity || 1)).toFixed(2)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      
      {/* Modal de valoración */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-bold mb-4">Valorar al Repartidor</h3>
            <p className="text-gray-600 mb-4">
              ¿Cómo calificarías el servicio de entrega de {delivery.driverName || 'el repartidor'}?
            </p>
            
            <div className="flex justify-center my-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setDriverRating(star)}
                  className="mx-1 focus:outline-none"
                >
                  <span 
                    className={`text-3xl ${star <= driverRating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline"
                onClick={() => setShowRatingModal(false)}
                disabled={isSubmittingRating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleRateDriver}
                disabled={driverRating === 0 || isSubmittingRating}
              >
                {isSubmittingRating ? 'Enviando...' : 'Enviar Valoración'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDeliveryTracking;
