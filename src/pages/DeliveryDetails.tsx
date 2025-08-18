import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  MapPin, Phone, Calendar, Clock, CheckCircle, AlertTriangle, Package, 
  User, Truck, Navigation, DollarSign, Building, ShoppingBag, ExternalLink,
  Info, MessageCircle, ArrowRight, Store, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DeliveryMiniMap from '@/components/DeliveryMiniMap';
import { useToast } from '@/hooks/use-toast';

const DeliveryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [delivery, setDelivery] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [deliverySteps, setDeliverySteps] = useState([
    { name: 'Pedido recibido', completed: true, time: null },
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
        
        if (!userSnap.exists() || (userSnap.data().rol !== 'repartidor' && userSnap.data().type !== 'deliveryDriver')) {
          navigate('/');
          return;
        }
        
        setUserData(userSnap.data());
        await loadDeliveryData();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Obtener ubicación actual
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
        }
      );
    }
  }, [navigate, id]);

  const loadDeliveryData = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      // Primero intentamos buscar en la colección 'orders'
      const deliveryRef = doc(db, 'orders', id);
      let deliverySnap = await getDoc(deliveryRef);
      
      // Si no está en 'orders', intentamos buscarlo en 'deliveries'
      if (!deliverySnap.exists()) {
        const deliveriesRef = doc(db, 'deliveries', id);
        deliverySnap = await getDoc(deliveriesRef);
        
        if (!deliverySnap.exists()) {
          toast({
            title: "Pedido no encontrado",
            description: "No se pudo encontrar el pedido solicitado en el sistema.",
            variant: "destructive",
          });
          navigate('/delivery-dashboard');
          return;
        }
      }
      
      const deliveryData = { 
        id: deliverySnap.id, 
        ...deliverySnap.data(),
        source: deliverySnap.ref.path.includes('orders') ? 'orders' : 'deliveries'
      } as any;
      
      // Normalizar campos para manejar diferentes estructuras de datos
      const normalizedData = {
        ...deliveryData,
        // Información del pedido
        status: deliveryData.status || 'pendingDelivery',
        deliveryStatus: deliveryData.deliveryStatus || deliveryData.status || 'pendingDelivery',
        
        // Información del cliente
        customerName: deliveryData.customerName || deliveryData.clientName || 'Cliente',
        clientName: deliveryData.clientName || deliveryData.customerName || 'Cliente',
        customerPhone: deliveryData.customerPhone || deliveryData.clientPhone || deliveryData.phone || '',
        clientPhone: deliveryData.clientPhone || deliveryData.customerPhone || deliveryData.phone || '',
        phone: deliveryData.phone || deliveryData.customerPhone || deliveryData.clientPhone || '',
        deliveryAddress: deliveryData.deliveryAddress || deliveryData.address || '',
        
        // Información de la empresa
        companyName: deliveryData.companyName || deliveryData.businessName || deliveryData.storeName || 'Empresa',
        companyPhone: deliveryData.companyPhone || deliveryData.businessPhone || '',
        companyAddress: deliveryData.companyAddress || deliveryData.businessAddress || deliveryData.storeAddress || '',
        
        // Información del producto
        productName: deliveryData.productName || deliveryData.itemName || deliveryData.item || 'Producto',
        productDescription: deliveryData.productDescription || deliveryData.description || deliveryData.itemDescription || '',
        productImage: deliveryData.productImage || deliveryData.itemImage || deliveryData.image || '',
        productQuantity: deliveryData.quantity || deliveryData.productQuantity || '1',
        
        // Información de coordenadas
        deliveryCoordinates: deliveryData.deliveryCoordinates || null,
        companyCoordinates: deliveryData.companyCoordinates || deliveryData.businessCoordinates || null,
        
        // Información de pagos
        deliveryFee: deliveryData.deliveryFee || deliveryData.offeredPrice || 0,
        totalAmount: deliveryData.totalAmount || deliveryData.total || 0,
        paymentMethod: deliveryData.paymentMethod || 'No especificado',
        
        // Fechas
        createdAt: deliveryData.createdAt || null,
        assignedAt: deliveryData.assignedAt || null,
        deliveredAt: deliveryData.deliveredAt || null,
        
        // ID del asignado
        assignedDelivery: deliveryData.assignedDelivery || deliveryData.driverId || null,
        
        // Items/productos si existen
        items: deliveryData.items || [
          {
            name: deliveryData.productName || deliveryData.itemName || deliveryData.item || 'Producto',
            price: deliveryData.productPrice || 0,
            quantity: deliveryData.productQuantity || deliveryData.quantity || 1,
            image: deliveryData.productImage || deliveryData.itemImage || deliveryData.image || '',
            description: deliveryData.productDescription || deliveryData.description || '',
          }
        ]
      };
      
      console.log('Datos normalizados del pedido:', normalizedData);
      setDelivery(normalizedData);
      
      // Calcular distancias si tenemos coordenadas
      if (currentLocation && normalizedData.deliveryCoordinates) {
        const distance = calculateDistance(
          currentLocation.lat, 
          currentLocation.lng,
          normalizedData.deliveryCoordinates.lat,
          normalizedData.deliveryCoordinates.lng
        );
        setEstimatedDistance(distance);
        setEstimatedDuration(calculateDuration(distance));
      }
      
      // Actualizar pasos de entrega
      const updatedSteps = [...deliverySteps];
      updatedSteps[0].completed = true;
      updatedSteps[0].time = normalizedData.createdAt || null;
      
      if (normalizedData.assignedAt) {
        updatedSteps[1].completed = true;
        updatedSteps[1].time = normalizedData.assignedAt;
      }
      
      if (normalizedData.status === 'inDelivery') {
        updatedSteps[2].completed = true;
        updatedSteps[2].time = normalizedData.assignedAt || null;
      }
      
      if (normalizedData.status === 'delivered') {
        updatedSteps[1].completed = true;
        updatedSteps[2].completed = true;
        updatedSteps[3].completed = true;
        updatedSteps[3].time = normalizedData.deliveredAt || null;
      }
      
      setDeliverySteps(updatedSteps);
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar el pedido:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al cargar los detalles del pedido.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  // Función para calcular distancia entre dos coordenadas
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    // Implementación básica de la fórmula del Haversine
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distancia en km
    
    return Math.round(distance * 10) / 10; // Redondear a 1 decimal
  };
  
  // Función para estimar el tiempo de viaje
  const calculateDuration = (distanceKm: number): string => {
    // Velocidad promedio estimada en km/h
    const avgSpeed = 30;
    const timeHours = distanceKm / avgSpeed;
    
    // Convertir a minutos
    const timeMinutes = timeHours * 60;
    
    if (timeMinutes < 1) {
      return "Menos de un minuto";
    } else if (timeMinutes < 60) {
      return `${Math.round(timeMinutes)} min`;
    } else {
      const hours = Math.floor(timeHours);
      const minutes = Math.round((timeHours - hours) * 60);
      return `${hours} h ${minutes} min`;
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id || !auth.currentUser) return;
    
    try {
      setUpdatingStatus(true);
      const deliveryRef = doc(db, 'orders', id);
      
      const updates: any = {
        status: newStatus
      };
      
      if (newStatus === 'inDelivery' && !delivery.assignedAt) {
        updates.assignedAt = new Date().toISOString();
        updates.assignedDelivery = auth.currentUser.uid;
        
        // Actualizar datos del repartidor - incrementar entregas activas
        if (userData) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            activeDeliveries: (userData.activeDeliveries || 0) + 1,
          });
        }
        
        // Mostrar toast y redirigir a Mis Entregas cuando se acepta una entrega
        toast({
          title: "Entrega aceptada",
          description: "Has aceptado la entrega correctamente. Redirigiendo a Mis Entregas...",
        });
        
        await updateDoc(deliveryRef, updates);
        
        // Redirigir a la página de Mis Entregas después de un breve retraso
        setTimeout(() => {
          navigate('/delivery-active');
        }, 1000);
        
        return; // Salimos de la función para evitar el loadDeliveryData
        
      } else if (newStatus === 'delivered') {
        updates.deliveredAt = new Date().toISOString();
        
        // Actualizar datos del repartidor - decrementar entregas activas, incrementar entregas totales
        if (userData) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            activeDeliveries: Math.max(0, (userData.activeDeliveries || 0) - 1),
            totalDeliveries: (userData.totalDeliveries || 0) + 1
          });
        }
      }
      
      await updateDoc(deliveryRef, updates);
      await loadDeliveryData();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la entrega. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles de la entrega...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 text-lg font-medium">No se pudo cargar la información del pedido</p>
          <Button onClick={() => navigate('/delivery-dashboard')} className="mt-4">
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => navigate('/delivery-dashboard')} className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">Detalles de Entrega</h1>
              <p className="text-sm text-blue-100">Pedido #{id?.substring(0, 6)}</p>
            </div>
            
            {/* Badge de estado */}
            {delivery && (
              <div className="ml-auto">
                <Badge 
                  className={`px-3 py-1.5 text-xs font-medium ${
                    delivery.status === 'pendingDelivery' ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-200' : 
                    delivery.status === 'inDelivery' ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200' : 
                    delivery.status === 'delivered' ? 'bg-green-100 hover:bg-green-200 text-green-800 border-green-200' : 
                    'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200'
                  }`}
                >
                  {delivery.status === 'pendingDelivery' ? 'Pendiente' : 
                   delivery.status === 'inDelivery' ? 'En Entrega' : 
                   delivery.status === 'delivered' ? 'Entregado' : 'Desconocido'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Resumen rápido */}
        {delivery && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-md border border-blue-50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center mb-2">
                  <Package className="text-blue-600 mr-2" size={18} />
                  <h2 className="text-lg font-bold text-gray-800">Entrega #{id?.substring(0, 6)}</h2>
                  {delivery.isUrgent && (
                    <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-md font-semibold animate-pulse">
                      Urgente
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Clock size={14} className="mr-1 flex-shrink-0" />
                    <span>{delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'}) : 'Fecha desconocida'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Store size={14} className="mr-1 flex-shrink-0" />
                    <span>{delivery.companyName || 'Empresa no especificada'}</span>
                  </div>
                  {delivery.deliveryFee !== undefined && (
                    <div className="flex items-center text-green-600 font-medium">
                      <DollarSign size={14} className="mr-1 flex-shrink-0" />
                      <span>${delivery.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {estimatedDistance !== null && (
                <div className="flex flex-col items-end bg-blue-50 p-2 rounded-lg text-blue-800">
                  <div className="flex items-center mb-1">
                    <MapPin size={14} className="mr-1" />
                    <span className="font-medium text-sm">{estimatedDistance} km</span>
                  </div>
                  <p className="text-xs text-blue-600">~{estimatedDuration}</p>
                </div>
              )}
            </div>
          </div>
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
        
        {/* Detalles de entrega */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {/* Mapa - Cambiado para aparecer primero en móviles */}
            <Card className="mb-6 overflow-hidden border-0 shadow-md">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center">
                  <MapPin className="text-blue-600 mr-2" size={20} />
                  <h2 className="text-lg font-bold">Ruta de Entrega</h2>
                </div>
              </div>
              <div className="h-72">
                {delivery?.deliveryCoordinates ? (
                  <DeliveryMiniMap 
                    centerLat={delivery.deliveryCoordinates.lat}
                    centerLng={delivery.deliveryCoordinates.lng}
                    markerLat={delivery.deliveryCoordinates.lat}
                    markerLng={delivery.deliveryCoordinates.lng}
                    pickupLat={delivery.companyCoordinates?.lat}
                    pickupLng={delivery.companyCoordinates?.lng}
                    showRoute={true}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <AlertTriangle size={24} className="text-yellow-500 mx-auto mb-2" />
                      <p className="text-gray-500">No hay coordenadas disponibles</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {/* Dirección de recogida (empresa) */}
                {delivery?.companyAddress && (
                  <div className="p-3 flex items-start bg-green-50">
                    <div className="p-1 bg-green-100 rounded-full mr-2 flex-shrink-0">
                      <Store size={14} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-green-700 font-medium mb-0.5">Punto de recogida (Empresa)</p>
                      <p className="text-sm">{delivery.companyAddress}</p>
                      {delivery.companyPhone && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <Phone size={10} className="mr-1" />
                          {delivery.companyPhone}
                        </p>
                      )}
                    </div>
                    {delivery.companyCoordinates && currentLocation && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1 h-auto"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${delivery.companyCoordinates.lat},${delivery.companyCoordinates.lng}&travelmode=driving`;
                          window.open(url, '_blank');
                        }}
                      >
                        <Navigation size={16} className="text-green-600" />
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Flecha de dirección */}
                <div className="p-2 flex justify-center">
                  <ArrowRight className="text-gray-400" size={20} />
                </div>
                
                {/* Dirección de entrega (cliente) */}
                <div className="p-3 flex items-start bg-red-50">
                  <div className="p-1 bg-red-100 rounded-full mr-2 flex-shrink-0">
                    <MapPin size={14} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-red-700 font-medium mb-0.5">Punto de entrega (Cliente)</p>
                    <p className="text-sm">{delivery?.deliveryAddress || 'No disponible'}</p>
                    {delivery?.customerPhone && (
                      <p className="text-xs text-red-600 mt-1 flex items-center">
                        <Phone size={10} className="mr-1" />
                        {delivery.customerPhone}
                      </p>
                    )}
                  </div>
                  {delivery?.deliveryCoordinates && currentLocation && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-auto"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${delivery.deliveryCoordinates.lat},${delivery.deliveryCoordinates.lng}&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Navigation size={16} className="text-red-600" />
                    </Button>
                  )}
                </div>
                
                {/* Botones de navegación */}
                <div className="p-4 flex gap-2">
                  {delivery?.deliveryCoordinates && currentLocation && (
                    <Button 
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${delivery.deliveryCoordinates.lat},${delivery.deliveryCoordinates.lng}&travelmode=driving`;
                        window.open(url, '_blank');
                      }}
                      className="w-full flex items-center justify-center"
                      variant="default"
                    >
                      <Navigation className="mr-2" size={16} />
                      Abrir en Google Maps
                    </Button>
                  )}
                  
                  {delivery?.customerPhone && (
                    <Button 
                      onClick={() => {
                        window.location.href = `tel:${delivery.customerPhone}`;
                      }}
                      className="w-1/3"
                      variant="outline"
                    >
                      <Phone className="mr-2" size={16} />
                      Llamar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            
            {/* Detalles del producto principal */}
            {delivery?.productName && (
              <Card className="mb-6 overflow-hidden border-0 shadow-md">
                <div className="flex flex-col">
                  {(delivery.productImage) && (
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        src={delivery.productImage} 
                        alt={delivery.productName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://via.placeholder.com/400x200?text=Producto";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="p-4 text-white">
                          <h3 className="font-bold text-lg">{delivery.productName}</h3>
                          <p className="text-sm text-white/80">Cantidad: {delivery.productQuantity}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        {!delivery.productImage && (
                          <h3 className="font-bold text-lg mb-2">{delivery.productName}</h3>
                        )}
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <ShoppingBag size={14} className="mr-1.5 text-blue-500" />
                          <span>Cantidad: {delivery.productQuantity}</span>
                        </div>
                      </div>
                      {delivery.productPrice && (
                        <div className="bg-green-50 px-3 py-1 rounded-full text-green-700 font-medium text-sm">
                          ${delivery.productPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    {delivery.productDescription && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 font-medium mb-1">Descripción:</p>
                        <p className={`text-sm text-gray-700 ${!showFullDescription && delivery.productDescription.length > 150 ? 'line-clamp-3' : ''}`}>
                          {delivery.productDescription}
                        </p>
                        {delivery.productDescription.length > 150 && (
                          <button 
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="text-xs text-blue-600 mt-1 hover:underline"
                          >
                            {showFullDescription ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
          
          <div>
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
                    <p className="font-medium">{delivery?.customerName || delivery?.clientName || 'No disponible'}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="min-w-[24px] mt-1">
                    <Phone size={16} className="text-gray-400" />
                  </div>
                  <div className="ml-2 flex-1">
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{delivery?.customerPhone || delivery?.clientPhone || delivery?.phone || 'No disponible'}</p>
                      {delivery?.customerPhone && (
                        <button 
                          onClick={() => window.location.href = `tel:${delivery.customerPhone}`}
                          className="bg-blue-50 text-blue-600 rounded-full p-1.5 hover:bg-blue-100 transition-colors"
                        >
                          <Phone size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="min-w-[24px] mt-1">
                    <MapPin size={16} className="text-gray-400" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-gray-500">Dirección de entrega</p>
                    <p className="font-medium">{delivery?.deliveryAddress || 'No disponible'}</p>
                  </div>
                </div>
                {delivery?.customerNotes && (
                  <div className="flex items-start">
                    <div className="min-w-[24px] mt-1">
                      <AlertTriangle size={16} className="text-yellow-500" />
                    </div>
                    <div className="ml-2">
                      <p className="text-sm text-gray-500">Notas del cliente</p>
                      <p className="font-medium text-yellow-700 bg-yellow-50 p-2 rounded-lg text-sm mt-1">{delivery.customerNotes}</p>
                    </div>
                  </div>
                )}
                {/* Botón para contactar */}
                {delivery?.customerPhone && (
                  <button 
                    onClick={() => window.location.href = `tel:${delivery.customerPhone}`}
                    className="w-full mt-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium p-2 rounded-lg flex items-center justify-center text-sm transition-colors"
                  >
                    <Phone size={16} className="mr-1.5" />
                    Contactar al cliente
                  </button>
                )}
              </div>
            </Card>
            
            {/* Información de la empresa */}
            <Card className="mb-6 p-5 border-0 shadow-md">
              <div className="flex items-center mb-4">
                <Building className="text-blue-600 mr-2" size={20} />
                <h2 className="text-lg font-bold">Información de la Empresa</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="min-w-[24px] mt-1">
                    <Building size={16} className="text-gray-400" />
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{delivery?.companyName || 'No disponible'}</p>
                  </div>
                </div>
                {delivery?.companyPhone && (
                  <div className="flex items-start">
                    <div className="min-w-[24px] mt-1">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <div className="ml-2 flex-1">
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{delivery.companyPhone}</p>
                        <button 
                          onClick={() => window.location.href = `tel:${delivery.companyPhone}`}
                          className="bg-blue-50 text-blue-600 rounded-full p-1.5 hover:bg-blue-100 transition-colors"
                        >
                          <Phone size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {delivery?.companyAddress && (
                  <div className="flex items-start">
                    <div className="min-w-[24px] mt-1">
                      <Store size={16} className="text-gray-400" />
                    </div>
                    <div className="ml-2">
                      <p className="text-sm text-gray-500">Dirección</p>
                      <p className="font-medium">{delivery.companyAddress}</p>
                    </div>
                  </div>
                )}
                {/* Botón para contactar */}
                {delivery?.companyPhone && (
                  <button 
                    onClick={() => window.location.href = `tel:${delivery.companyPhone}`}
                    className="w-full mt-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium p-2 rounded-lg flex items-center justify-center text-sm transition-colors"
                  >
                    <Phone size={16} className="mr-1.5" />
                    Contactar a la empresa
                  </button>
                )}
              </div>
            </Card>

            {/* Detalles del pedido */}
            <Card className="mb-6 p-5 border-0 shadow-md">
              <div className="flex items-center mb-4">
                <Package className="text-blue-600 mr-2" size={20} />
                <h2 className="text-lg font-bold">Detalles del Pedido</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID del pedido</span>
                  <span className="font-medium">{delivery?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de pedido</span>
                  <span className="font-medium">{formatDate(delivery?.createdAt || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Empresa</span>
                  <span className="font-medium">{delivery?.companyName || 'No especificado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Método de pago</span>
                  <span className="font-medium">{delivery?.paymentMethod || 'No especificado'}</span>
                </div>
                {delivery?.deliveryFee !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tarifa de entrega</span>
                    <span className="font-medium text-green-600">$ {delivery.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {delivery?.totalAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Importe total</span>
                    <span className="font-semibold text-blue-600">$ {delivery.totalAmount.toFixed(2)}</span>
                  </div>
                )}
                {estimatedDistance !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Distancia estimada</span>
                    <span className="font-medium">{estimatedDistance} km</span>
                  </div>
                )}
                {estimatedDuration && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tiempo estimado</span>
                    <span className="font-medium">{estimatedDuration}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Productos */}
            {delivery?.items && delivery.items.length > 0 && (
              <Card className="mb-6 p-5 border-0 shadow-md">
                <div className="flex items-center mb-4">
                  <Package className="text-blue-600 mr-2" size={20} />
                  <h2 className="text-lg font-bold">Productos ({delivery.items.length})</h2>
                </div>
                <div className="space-y-3">
                  {delivery.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                      {/* Imagen del producto si existe */}
                      {item.image && (
                        <div className="w-12 h-12 rounded-md overflow-hidden mr-3 flex-shrink-0 bg-gray-100">
                          <img 
                            src={item.image} 
                            alt={item.name || 'Producto'} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://via.placeholder.com/100?text=Producto";
                            }}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name || 'Producto'}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                        )}
                        <p className="text-sm text-gray-500">Cantidad: {item.quantity || 1}</p>
                      </div>
                      {item.price && (
                        <div className="ml-2 text-right">
                          <p className="font-medium text-green-600">
                            $ {(item.price * (item.quantity || 1)).toFixed(2)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-500">
                              ${item.price.toFixed(2)} x {item.quantity}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Total */}
                {delivery.totalAmount && (
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
                    <span className="font-medium">Total del pedido</span>
                    <span className="font-bold text-blue-700">${delivery.totalAmount.toFixed(2)}</span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      {delivery?.status !== 'delivered' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/delivery-dashboard')}
                variant="outline" 
                className="sm:w-1/3"
              >
                Volver al panel
              </Button>
              
              {delivery?.status === 'pendingDelivery' && delivery.assignedDelivery !== auth.currentUser?.uid && (
                <Button 
                  onClick={() => handleUpdateStatus('inDelivery')}
                  className="sm:w-2/3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Truck size={18} className="mr-2" />
                      Aceptar Entrega
                    </>
                  )}
                </Button>
              )}
              
              {(delivery?.status === 'pendingDelivery' || delivery?.status === 'inDelivery') && 
               delivery?.assignedDelivery === auth.currentUser?.uid && (
                <Button 
                  onClick={() => handleUpdateStatus('delivered')}
                  className="sm:w-2/3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2" />
                      Marcar como Entregado
                    </>
                  )}
                </Button>
              )}
              
              {/* Botón adicional para contacto */}
              {(delivery?.status === 'pendingDelivery' || delivery?.status === 'inDelivery') && 
               delivery?.assignedDelivery === auth.currentUser?.uid && (
                <Button 
                  onClick={() => {
                    if (delivery.customerPhone) {
                      window.location.href = `tel:${delivery.customerPhone}`;
                    } else {
                      toast({
                        title: "No hay teléfono disponible",
                        description: "No se encontró un número de teléfono para este cliente.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline" 
                  className="sm:w-1/3 border-blue-200 hover:bg-blue-50 text-blue-700"
                >
                  <Phone size={18} className="mr-2" />
                  Llamar al cliente
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetails;
