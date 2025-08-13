import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot, orderBy, limit, writeBatch } from 'firebase/firestore';
import { 
  MapPin, Package, Clock, CheckCircle, XCircle, AlertTriangle, 
  TrendingUp, Truck, Award, RefreshCw, Zap, Filter, Search, 
  User, LogOut, Bell, ChevronRight, DollarSign, Coffee,
  Utensils, Sunset, Activity, ChevronDown, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigationDelivery from '@/components/BottomNavigationDelivery';

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest'|'oldest'|'nearest'|'highest'>('newest');
  const [driverStatus, setDriverStatus] = useState<string>('disponible');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const statusPickerRef = useRef<HTMLDivElement>(null);
  
  // Lista de estados disponibles para el repartidor
  const driverStatusOptions = [
    { value: 'disponible', label: 'Disponible', icon: <Zap size={14} className="text-green-500" />, color: 'bg-green-500' },
    { value: 'desayunando', label: 'Desayunando', icon: <Coffee size={14} className="text-amber-500" />, color: 'bg-amber-500' },
    { value: 'almorzando', label: 'Almorzando', icon: <Utensils size={14} className="text-orange-500" />, color: 'bg-orange-500' },
    { value: 'varado', label: 'Varado', icon: <AlertTriangle size={14} className="text-red-500" />, color: 'bg-red-500' },
    { value: 'descanso', label: 'En descanso', icon: <Clock size={14} className="text-blue-500" />, color: 'bg-blue-500' },
    { value: 'terminando', label: 'Terminando turno', icon: <Sunset size={14} className="text-purple-500" />, color: 'bg-purple-500' },
  ];
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    averageRating: 0,
    totalEarnings: 0,
    todayEarnings: 0,
    weeklyEarnings: 0,
  });

  // Cerrar panel de notificaciones y estado al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (statusPickerRef.current && !statusPickerRef.current.contains(event.target as Node)) {
        setShowStatusPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Obtener ubicación del dispositivo
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error obteniendo ubicación: ", error);
          toast({
            title: "Error de ubicación",
            description: "No se pudo acceder a tu ubicación. Algunas funciones podrían estar limitadas.",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

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
            
            // Cargar el estado del repartidor
            if (userData.status) {
              setDriverStatus(userData.status);
            }
            
            // Verificar si es un repartidor
            if (userData.rol !== 'repartidor' && userData.type !== 'deliveryDriver') {
              console.log('No es un repartidor, redirigiendo...');
              navigate('/');
              return;
            }
            
            // Cargar pedidos pendientes
            loadDeliveries(userData);
            loadStats(userData);
            loadNotifications(user.uid);
            
            // Configurar escucha en tiempo real para notificaciones nuevas
            setupNotificationsListener(user.uid);
          } else {
            console.log('No se encontraron datos de usuario');
            navigate('/');
          }
        } catch (error) {
          console.error('Error al cargar datos:', error);
          toast({
            title: "Error de conexión",
            description: "No se pudieron cargar tus datos. Intenta de nuevo más tarde.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        navigate('/auth');
      }
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  // Cargar notificaciones
  const loadNotifications = async (userId: string) => {
    try {
      const notificationsRef = collection(db, 'notifications');
      let q;
      
      try {
        // Intentamos la consulta completa primero
        q = query(
          notificationsRef, 
          where('userId', '==', userId)
          // Eliminamos orderBy para evitar errores de índices
          // limit(20)
        );
      } catch (indexError) {
        console.warn("Error con índices de notificaciones, usando consulta básica", indexError);
        // Consulta alternativa si hay problemas de índices
        q = query(notificationsRef, where('userId', '==', userId));
      }
      
      const notificationsSnapshot = await getDocs(q);
      // Ordenamos manualmente para evitar problemas con índices
      const notificationsList = notificationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...(doc.data() as Record<string, any>)
        }))
        .sort((a, b) => {
          // Ordenar por timestamp manualmente
          const timeA = a && typeof a === 'object' && 'timestamp' in a ? new Date(a.timestamp as string).getTime() : 0;
          const timeB = b && typeof b === 'object' && 'timestamp' in b ? new Date(b.timestamp as string).getTime() : 0;
          return timeB - timeA; // Orden descendente
        })
        .slice(0, 20); // Limitamos a 20 elementos manualmente
      
      setNotifications(notificationsList);
      
      // Contar no leídas
      const unread = notificationsList.filter((notif: any) => !notif.read).length;
      setUnreadNotifications(unread);
      
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };
  
  // Configurar escucha en tiempo real para notificaciones
  const setupNotificationsListener = (userId: string) => {
    const notificationsRef = collection(db, 'notifications');
    try {
      // Simplificamos la consulta para evitar problemas de índices
      const q = query(
        notificationsRef, 
        where('userId', '==', userId)
        // Eliminamos orderBy y limit para evitar errores de índices
      );
      
      return onSnapshot(q, (snapshot) => {
        const newNotifications = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...(data as Record<string, any>)
          };
        });
        
        // Ordenamos manualmente para evitar problemas con índices
        newNotifications.sort((a, b) => {
          // Ordenar por timestamp manualmente
          const timeA = a && typeof a === 'object' && 'timestamp' in a ? new Date(a.timestamp as string).getTime() : 0;
          const timeB = b && typeof b === 'object' && 'timestamp' in b ? new Date(b.timestamp as string).getTime() : 0;
          return timeB - timeA; // Orden descendente
        });
        
        // Limitar el número de notificaciones para la interfaz
        const limitedNotifications = newNotifications.slice(0, 20);
        
        // Mostrar toast para notificaciones nuevas
        snapshot.docChanges().forEach((change) => {
          const changeData = change.doc.data() as Record<string, any>;
          if (change.type === "added" && changeData.timestamp > Date.now() - 10000) {
            toast({
              title: changeData.title,
              description: changeData.message,
              variant: "default",
            });
          }
        });
        
        setNotifications(limitedNotifications);
        const unread = limitedNotifications.filter((notif: any) => !notif.read).length;
        setUnreadNotifications(unread);
      });
    } catch (error) {
      console.error('Error al configurar el listener de notificaciones:', error);
      return () => {}; // Devolver una función de limpieza vacía en caso de error
    }
  };

  const loadDeliveries = async (userData: any) => {
    try {
      setIsRefreshing(true);
      
        // Pedidos disponibles (no asignados)
      if (activeTab === 'available') {
        // Primero buscamos en la colección de órdenes tradicionales
        const ordersRef = collection(db, 'orders');
        let q;
        
        try {
          // Cambiamos la consulta para evitar problemas de índices
          // Nota: Esta consulta simplificada no requiere índices compuestos
          q = query(
            ordersRef, 
            where('status', '==', 'pendingDelivery')
          );
        } catch (indexError) {
          console.warn("Error con el índice de la consulta, usando consulta simplificada", indexError);
          q = query(ordersRef);
        }
        
        // Marcar cuántas consultas se realizan para debugging
        console.log("[DeliveryDashboard] Consultando órdenes pendientes (orders collection)");
        
        const querySnapshot = await getDocs(q);        // Ahora buscamos también en la colección de deliveries (donde se publican los nuevos pedidos)
        const deliveriesRef = collection(db, 'deliveries');
        let qDeliveries;
        
        try {
          // Simplificamos la consulta para evitar errores de índices
          qDeliveries = query(
            deliveriesRef,
            where('status', '==', 'pendingDriver')
            // Eliminamos las otras condiciones para evitar problemas con índices compuestos
          );
          console.log("[DeliveryDashboard] Consultando entregas pendientes (deliveries collection)");
        } catch (indexError) {
          console.warn("Error con índices en la consulta de deliveries, usando consulta básica", indexError);
          qDeliveries = query(deliveriesRef);
        }
        
        const deliveriesSnapshot = await getDocs(qDeliveries);
        
        // Combinamos los resultados de ambas colecciones
        const orderDeliveries = querySnapshot.docs
          .filter(doc => {
            // Solo incluir pedidos sin repartidor asignado
            const data = doc.data() as Record<string, any>;
            const isValidDelivery = data.status === 'pendingDelivery' && !data.assignedDelivery;
            return isValidDelivery;
          })
          .map(doc => {
            const data = doc.data() as Record<string, any>;
            
            // Extraer datos enriquecidos con información detallada
            return {
              id: doc.id,
              ...data,
              // Log all keys for debugging
              title: data.title || data.name || data.requestName || data.requestTitle || "Solicitud sin título",
              source: 'orders',
              distance: calculateDistance(data),
              
              // Status de la entrega - añadir explícitamente
              status: data.status || 'pendingDelivery',
              deliveryStatus: data.deliveryStatus || 'pendingDelivery',
              
              // Asegurarse de que todos los campos necesarios estén presentes
              companyName: data.companyName || data.businessName || data.storeName || 'Empresa',
              // Direcciones de la empresa
              companyAddress: data.companyAddress || data.businessAddress || data.storeAddress || '',
              businessAddress: data.businessAddress || data.companyAddress || data.storeAddress || '',
              
              // Información del producto
              productName: (() => {
                // Access properties safely with index signature
                const name = data.productName || data['itemName'] || data['item'] || 'Producto';
                console.log(`Mapping productName for order ${doc.id}: source=${JSON.stringify({productName: data.productName, itemName: data['itemName'], item: data['item']})}, final=${name}`);
                return name;
              })(),
              
              // Debug titles/names
              _debugNames: {
                title: data.title,
                name: data.name,
                requestName: data.requestName,
                requestTitle: data.requestTitle,
                productName: data.productName,
                itemName: data.itemName,
                item: data.item,
              },
              productDescription: data.productDescription || data.description || data.itemDescription || '',
              productImage: data.productImage || data.itemImage || data.image || '',
              productQuantity: data.quantity || data.productQuantity || '1',
              
              // Información del cliente - añadir explícitamente para evitar errores de TypeScript
              customerName: data.customerName || data.clientName || 'Cliente',
              clientName: data.clientName || data.customerName || 'Cliente',
              customerPhone: data.customerPhone || data.clientPhone || data.phone || '',
              clientPhone: data.clientPhone || data.customerPhone || data.phone || '',
              phone: data.phone || data.customerPhone || data.clientPhone || '',
              
              // Información de precio
              offeredPrice: data.offeredPrice || data.price || data.deliveryFee || 0,
              deliveryFee: data.deliveryFee || data.offeredPrice || data.price || 0,
              
              // Información del usuario solicitante
              requestedBy: data.requestedBy || data.userId || data.customerName || ''
            };
          });
        
        const newDeliveries = deliveriesSnapshot.docs
          .filter(doc => {
            // Solo incluir entregas con status pendingDriver y que no tengan driverId asignado
            const data = doc.data() as Record<string, any>;
            const isValidDelivery = data.status === 'pendingDriver' && !data.driverId;
            
            if (!isValidDelivery) {
              console.log(`Skipping delivery ${doc.id}: status=${data.status}, hasDriverId=${!!data.driverId}`);
            }
            
            return isValidDelivery;
          })
          .map(doc => {
            const data = doc.data() as Record<string, any>;
            
            // Extraer todos los campos disponibles
            return {
              id: doc.id,
              ...data,
              // Log all keys for debugging
              title: data.title || data.name || data.requestName || data.requestTitle || "Solicitud sin título",
              // Campos básicos de la entrega
              source: 'deliveries',
              customerName: data.clientName || data.customerName || 'Cliente',
              clientName: data.clientName || data.customerName || 'Cliente',
              deliveryStatus: 'pendingDelivery',
              status: 'pendingDelivery',
              distance: calculateDistance(data),
              
              // Información de la empresa
              companyName: data.companyName || data.businessName || 'Empresa',
              // Direcciones de la empresa
              companyAddress: data.companyAddress || data.businessAddress || data.storeAddress || '',
              businessAddress: data.businessAddress || data.companyAddress || data.storeAddress || '',
              
              // Información del producto
              productName: (() => {
                // Access properties safely with index signature
                const name = data.productName || data['itemName'] || data['item'] || 'Producto';
                console.log(`Mapping productName for delivery ${doc.id}: source=${JSON.stringify({productName: data.productName, itemName: data['itemName'], item: data['item']})}, final=${name}`);
                return name;
              })(),
              
              // Debug titles/names
              _debugNames: {
                title: data.title,
                name: data.name,
                requestName: data.requestName,
                requestTitle: data.requestTitle,
                productName: data.productName,
                itemName: data.itemName,
                item: data.item,
              },
              productDescription: data.productDescription || data.description || data.itemDescription || '',
              productImage: data.productImage || data.itemImage || data.image || '',
              productQuantity: data.quantity || data.productQuantity || '1',
              
              // Información del cliente - teléfono del cliente
              customerPhone: data.customerPhone || data.clientPhone || data.phone || '',
              clientPhone: data.clientPhone || data.customerPhone || data.phone || '',
              phone: data.phone || data.customerPhone || data.clientPhone || '',
              
              // Información de precio
              offeredPrice: data.offeredPrice || data.price || data.deliveryFee || 0,
              deliveryFee: data.deliveryFee || data.offeredPrice || data.price || 0,
              
              // Información del usuario solicitante
              requestedBy: data.requestedBy || data.userId || data.clientName || ''
            };
          });
        
        const combinedDeliveries = [...orderDeliveries, ...newDeliveries];
        console.log('Entregas disponibles encontradas:', combinedDeliveries.length, 'Desglose:', {
          orders: orderDeliveries.length,
          deliveries: newDeliveries.length
        });
        
        // Agregar información de debugging para ver los datos de las entregas
        if (combinedDeliveries.length > 0) {
          const firstDelivery = combinedDeliveries[0];
          // Usamos el operador de acceso seguro ? para evitar errores cuando las propiedades no existen
          console.log('Ejemplo de datos en la primera entrega:', {
            id: firstDelivery?.id || '',
            source: firstDelivery?.source || '',
            status: firstDelivery?.status || '',
            // Title-related fields
            title: firstDelivery?.title || '',
            name: firstDelivery?.name || '',
            requestName: firstDelivery?.requestName || '',
            requestTitle: firstDelivery?.requestTitle || '',
            titleExists: 'title' in (firstDelivery || {}),
            nameExists: 'name' in (firstDelivery || {}),
            // Usamos operador de acceso seguro
            companyName: firstDelivery?.companyName || '',
            productName: firstDelivery?.productName || '',
            productNameType: typeof firstDelivery?.productName,
            productNameExists: 'productName' in (firstDelivery || {}),
            allNameFields: {
              title: firstDelivery?.title,
              name: firstDelivery?.name,
              requestName: firstDelivery?.requestName,
              requestTitle: firstDelivery?.requestTitle,
              productName: firstDelivery?.productName,
              itemName: firstDelivery?.itemName,
              item: firstDelivery?.item
            },
            productImage: firstDelivery?.productImage || '',
            price: firstDelivery?.offeredPrice || 0,
            deliveryFee: firstDelivery?.deliveryFee || 0,
            // Usamos operadores lógicos para acceder de manera segura
            customerName: firstDelivery?.customerName || '',
            clientName: firstDelivery?.clientName || '',
            customer: firstDelivery?.customerName || firstDelivery?.clientName || '',
            requestedBy: firstDelivery?.requestedBy || '',
            // Examining the raw data
            rawData: firstDelivery
          });
        }
        
        // Añadir logging detallado para debug
        if (combinedDeliveries.length === 0) {
          console.log('No se encontraron entregas disponibles');
          console.log('Total de documentos en orders:', querySnapshot.size);
          console.log('Total de documentos en deliveries:', deliveriesSnapshot.size);
        }
        
        setDeliveries(combinedDeliveries);
        applyFiltersAndSearch(combinedDeliveries);
      } 
      // Pedidos asignados a este repartidor
      else if (activeTab === 'active') {
        const ordersRef = collection(db, 'orders');
        try {
          // Simplificamos la consulta para evitar problemas de índices
          const q = query(
            ordersRef, 
            where('assignedDelivery', '==', userData.uid)
            // Eliminamos otras condiciones para evitar problemas con índices
          );
          
          const querySnapshot = await getDocs(q);
          
          // Filtramos manualmente los pedidos activos
          const deliveries = querySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return ['inDelivery', 'pendingDelivery'].includes(data.status);
            })
            .map(doc => {
              const data = doc.data() as Record<string, any>;
              return {
                id: doc.id,
                ...data,
                status: data.status || 'pendingDelivery',
                deliveryStatus: data.deliveryStatus || 'pendingDelivery',
                distance: calculateDistance(data)
              };
            })
            // Ordenar manualmente por fecha
            .sort((a, b) => {
              const dateA = a && typeof a === 'object' && 'assignedAt' in a ? new Date(a.assignedAt as string).getTime() : 0;
              const dateB = b && typeof b === 'object' && 'assignedAt' in b ? new Date(b.assignedAt as string).getTime() : 0;
              return dateB - dateA; // orden descendente
            });
          
          setDeliveries(deliveries);
          applyFiltersAndSearch(deliveries);
        } catch (error) {
          console.error('Error al cargar pedidos activos:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar tus entregas activas.",
            variant: "destructive",
          });
        }
      }
      // Historial de pedidos completados por este repartidor
      else if (activeTab === 'completed') {
        const ordersRef = collection(db, 'orders');
        try {
          // Simplificamos la consulta para evitar problemas de índices
          const q = query(
            ordersRef, 
            where('assignedDelivery', '==', userData.uid)
            // Eliminamos otras condiciones para evitar problemas con índices
          );
          
          const querySnapshot = await getDocs(q);
          
          // Filtramos manualmente los pedidos completados
          const deliveries = querySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              return data.status === 'delivered';
            })
            .map(doc => {
              const data = doc.data() as Record<string, any>;
              return {
                id: doc.id,
                ...data,
                status: data.status || 'delivered',
                deliveryStatus: data.deliveryStatus || 'delivered',
                distance: calculateDistance(data)
              };
            })
            // Ordenar manualmente por fecha de entrega
            .sort((a, b) => {
              const dateA = a && typeof a === 'object' && 'deliveredAt' in a ? new Date(a.deliveredAt as string).getTime() : 0;
              const dateB = b && typeof b === 'object' && 'deliveredAt' in b ? new Date(b.deliveredAt as string).getTime() : 0;
              return dateB - dateA; // orden descendente
            });
          
          setDeliveries(deliveries);
          applyFiltersAndSearch(deliveries);
        } catch (error) {
          console.error('Error al cargar el historial de entregas:', error);
          toast({
            title: "Error",
            description: "No se pudo cargar tu historial de entregas.",
            variant: "destructive",
          });
        }
      }
      
      // Simular carga para una mejor experiencia de usuario
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
      
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };
  
  // Calcular distancia aproximada entre entrega y ubicación actual
  const calculateDistance = (delivery: any) => {
    if (!currentLocation || !delivery.deliveryCoordinates) return null;
    
    const lat1 = currentLocation.lat;
    const lng1 = currentLocation.lng;
    const lat2 = delivery.deliveryCoordinates.lat;
    const lng2 = delivery.deliveryCoordinates.lng;
    
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
  
  // Aplicar filtros y búsqueda a las entregas
  const applyFiltersAndSearch = (deliveryList: any[] = deliveries) => {
    // Filtrar por término de búsqueda
    let filtered = deliveryList;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(delivery => 
        (delivery.customerName && delivery.customerName.toLowerCase().includes(term)) ||
        (delivery.clientName && delivery.clientName.toLowerCase().includes(term)) || // Añadido para compatibilidad
        (delivery.deliveryAddress && delivery.deliveryAddress.toLowerCase().includes(term)) ||
        (delivery.address && delivery.address.toLowerCase().includes(term)) || // Añadido para compatibilidad
        (delivery.companyName && delivery.companyName.toLowerCase().includes(term)) ||
        (delivery.productName && delivery.productName.toLowerCase().includes(term)) ||
        (delivery.id && delivery.id.toLowerCase().includes(term))
      );
    }
    
    // Aplicar ordenamiento
    if (sortOrder === 'newest') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortOrder === 'oldest') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (sortOrder === 'nearest' && currentLocation) {
      filtered = [...filtered].sort((a, b) => {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return distA - distB;
      });
    } else if (sortOrder === 'highest') {
      filtered = [...filtered].sort((a, b) => {
        const feeA = a.deliveryFee || 0;
        const feeB = b.deliveryFee || 0;
        return feeB - feeA;
      });
    }
    
    setFilteredDeliveries(filtered);
  };

  const loadStats = async (userData: any) => {
    try {
      console.log('[DeliveryDashboard] Cargando estadísticas para el usuario:', userData.uid);
      
      // Simplificamos las consultas para evitar problemas con índices
      // Usamos una sola consulta y luego filtramos manualmente
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef, 
        where('assignedDelivery', '==', userData.uid)
      );
      
      console.log('[DeliveryDashboard] Ejecutando consulta para estadísticas');
      const ordersSnapshot = await getDocs(ordersQuery);
      console.log('[DeliveryDashboard] Documentos recuperados:', ordersSnapshot.size);
      
      // Filtramos manualmente por status
      const completedDocs = ordersSnapshot.docs.filter(doc => doc.data().status === 'delivered');
      const cancelledDocs = ordersSnapshot.docs.filter(doc => doc.data().status === 'cancelled');
      
      // Cálculo de estadísticas
      let totalRating = 0;
      let totalEarnings = 0;
      let todayEarnings = 0;
      let weeklyEarnings = 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      
      completedDocs.forEach(doc => {
        const data = doc.data();
        if (data.deliveryRating) totalRating += data.deliveryRating;
        if (data.deliveryFee) {
          totalEarnings += data.deliveryFee;
          
          // Calcular ingresos de hoy
          if (data.deliveredAt) {
            const deliveredDate = new Date(data.deliveredAt);
            if (deliveredDate >= today) {
              todayEarnings += data.deliveryFee;
            }
            
            // Calcular ingresos de la semana
            if (deliveredDate >= oneWeekAgo) {
              weeklyEarnings += data.deliveryFee;
            }
          }
        }
      });
      
      console.log('[DeliveryDashboard] Estadísticas calculadas:', {
        completedDeliveries: completedDocs.length,
        cancelledDeliveries: cancelledDocs.length,
        totalEarnings,
        todayEarnings,
        weeklyEarnings
      });
      
      setStats({
        completedDeliveries: completedDocs.length,
        cancelledDeliveries: cancelledDocs.length,
        averageRating: completedDocs.length > 0 ? totalRating / completedDocs.length : 0,
        totalEarnings: totalEarnings,
        todayEarnings: todayEarnings,
        weeklyEarnings: weeklyEarnings
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      // No mostramos toast para no molestar al usuario con errores de estadísticas
    }
  };

  const handleAcceptDelivery = async (deliveryId: string, source: string = 'orders') => {
    try {
      if (!userData) return;
      
      if (source === 'deliveries') {
        // Si el pedido viene de la colección 'deliveries'
        const deliveryRef = doc(db, 'deliveries', deliveryId);
        await updateDoc(deliveryRef, {
          driverId: userData.uid,
          assignedDelivery: userData.uid,
          deliveryName: userData.name,
          deliveryPhone: userData.phone || userData.phoneNumber,
          status: 'inDelivery',
          assignedAt: new Date().toISOString()
        });
        
        // Si hay un orderId asociado, también actualizamos la orden original
        const deliveryDoc = await getDoc(deliveryRef);
        if (deliveryDoc.exists() && deliveryDoc.data().orderId) {
          const originalOrderId = deliveryDoc.data().orderId;
          const orderRef = doc(db, 'solicitud', originalOrderId);
          
          try {
            await updateDoc(orderRef, {
              driverId: userData.uid,
              assignedDelivery: userData.uid,
              deliveryStatus: 'inDelivery',
              status: 'inDelivery',
              assignedAt: new Date().toISOString()
            });
            console.log('Orden original actualizada correctamente');
          } catch (err) {
            console.log('No se pudo actualizar la orden original, posiblemente está en otra colección');
          }
        }
      } else {
        // Si el pedido viene de la colección 'orders' (método original)
        const orderRef = doc(db, 'orders', deliveryId);
        await updateDoc(orderRef, {
          assignedDelivery: userData.uid,
          deliveryName: userData.name,
          deliveryPhone: userData.phone || userData.phoneNumber,
          status: 'inDelivery',
          assignedAt: new Date().toISOString()
        });
      }
      
      // Actualizar datos del repartidor
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        activeDeliveries: (userData.activeDeliveries || 0) + 1
      });
      
      setUserData({
        ...userData,
        activeDeliveries: (userData.activeDeliveries || 0) + 1
      });
      
          // Crear un objeto actualizado para pasar a loadDeliveries
          const updatedUserData = {
            ...(userData as Record<string, any>),
            activeDeliveries: (userData.activeDeliveries || 0) + 1
          };
          
          // Añadir check para depurar datos de documentos
          if (source === 'deliveries') {
            const deliveryDoc = await getDoc(doc(db, 'deliveries', deliveryId));
            console.log('DEBUG: Raw delivery data:', deliveryDoc.data());
          } else {
            const orderDoc = await getDoc(doc(db, 'orders', deliveryId));
            console.log('DEBUG: Raw order data:', orderDoc.data());
          }      // Recargar pedidos
      setActiveTab('active');
      loadDeliveries(updatedUserData);
      
      // Mostrar confirmación al usuario
      toast({
        title: "Entrega aceptada",
        description: "Has aceptado la entrega correctamente. Revisa los detalles para comenzar.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error al aceptar pedido:', error);
      toast({
        title: "Error al aceptar entrega",
        description: "No se pudo aceptar la entrega. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteDelivery = async (deliveryId: string) => {
    try {
      if (!userData) return;
      
      const orderRef = doc(db, 'orders', deliveryId);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
      
      // Actualizar datos del repartidor
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        activeDeliveries: Math.max(0, (userData.activeDeliveries || 0) - 1),
        totalDeliveries: (userData.totalDeliveries || 0) + 1
      });
      
      setUserData({
        ...userData,
        activeDeliveries: Math.max(0, (userData.activeDeliveries || 0) - 1),
        totalDeliveries: (userData.totalDeliveries || 0) + 1
      });
      
      // Crear un objeto actualizado del userData para pasar a las funciones
      const updatedUserData = {
        ...(userData as Record<string, any>),
        activeDeliveries: Math.max(0, (userData.activeDeliveries || 0) - 1),
        totalDeliveries: (userData.totalDeliveries || 0) + 1
      };
      
      // Recargar pedidos y estadísticas
      loadDeliveries(updatedUserData);
      loadStats(updatedUserData);
    } catch (error) {
      console.error('Error al completar pedido:', error);
    }
  };

  const handleRefresh = () => {
    if (userData) {
      loadDeliveries(userData);
      loadStats(userData);
      
      toast({
        title: "Actualizando",
        description: "Obteniendo los pedidos más recientes...",
      });
    }
  };

  // Manejar cambio de búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    applyFiltersAndSearch();
  };

  // Manejar cambio de ordenamiento
  const handleSortChange = (newSort: 'newest'|'oldest'|'nearest'|'highest') => {
    setSortOrder(newSort);
    applyFiltersAndSearch();
  };

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Importación de writeBatch debería estar en el import statement al inicio
      // pero aquí lo usamos directamente de firebase/firestore
      const batch = writeBatch(db);
      
      notifications.forEach((notification: any) => {
        if (!notification.read) {
          const notifRef = doc(db, 'notifications', notification.id);
          batch.update(notifRef, { read: true });
        }
      });
      
      await batch.commit();
      
      // Actualizar estado local
      setNotifications(notifications.map((n: any) => ({ ...n, read: true })));
      setUnreadNotifications(0);
      
    } catch (error) {
      console.error('Error al marcar notificaciones como leídas:', error);
    }
  };
  
  // Actualizar el estado del repartidor
  const updateDriverStatus = async (newStatus: string) => {
    if (!auth.currentUser || !userData) return;
    
    setSavingStatus(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { 
        status: newStatus,
        lastStatusUpdate: new Date().toISOString()
      });
      
      // Actualizar estado local
      setDriverStatus(newStatus);
      setUserData({
        ...userData,
        status: newStatus
      });
      
      toast({
        title: "Estado actualizado",
        description: `Tu estado ha sido cambiado a: ${driverStatusOptions.find(s => s.value === newStatus)?.label}`,
        variant: "default",
      });
      
      setShowStatusPicker(false);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast({
        title: "Error al actualizar estado",
        description: "No se pudo actualizar tu estado. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  // Efectos para actualizar filteredDeliveries cuando cambian los criterios
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchTerm, sortOrder]);

  // Actualizar datos cuando cambia la pestaña
  useEffect(() => {
    if (userData) {
      loadDeliveries(userData);
    }
  }, [activeTab, userData]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white p-6 rounded-xl shadow-md max-w-sm w-full">
          <div className="relative mx-auto mb-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto flex items-center justify-center">
              <Truck size={28} className="text-blue-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-t-3 border-blue-500 animate-spin"></div>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Cargando panel de repartidor</h2>
          <p className="text-gray-600 text-sm">Estamos preparando tu información</p>
          
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 bg-gray-200 rounded-full w-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" style={{width: '75%'}}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Conectando con el sistema</span>
              <span>75%</span>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1.5"></div>
              <p className="text-xs text-blue-700 font-medium">Cargando estados de repartidor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Definición de tipo para la entrega
  interface DeliveryItem {
    id: string;
    source?: string;
    status?: string;
    deliveryStatus?: string;
    distance?: number | null;
    customerName?: string;
    clientName?: string;
    deliveryAddress?: string;
    address?: string;
    isUrgent?: boolean;
    companyName?: string;
    businessName?: string;
    storeName?: string;
    companyAddress?: string;
    businessAddress?: string;
    storeAddress?: string;
    productName?: string;
    productDescription?: string;
    productImage?: string;
    itemName?: string;
    itemDescription?: string;
    itemImage?: string;
    item?: string;
    image?: string;
    description?: string;
    productQuantity?: string | number;
    quantity?: string | number;
    offeredPrice?: number;
    deliveryFee?: number;
    price?: number;
    createdAt?: string;
    assignedAt?: string;
    deliveredAt?: string;
    requestedBy?: string;
    userId?: string;
    customerPhone?: string;
    clientPhone?: string;
    phone?: string;
    deliveryCoordinates?: {
      lat: number;
      lng: number;
    };
    companyCoordinates?: {
      lat: number;
      lng: number;
    };
    businessCoordinates?: {
      lat: number;
      lng: number;
    };
    deliveryRating?: number;
    driverId?: string;
    assignedDelivery?: string;
    // Campos adicionales que pueden estar en los datos
    title?: string;
    name?: string;
    requestName?: string;
    requestType?: string;
    // Permite cualquier otra propiedad que pueda aparecer en los documentos
    [key: string]: any;
  }
  
  const renderDeliveryCard = (delivery: DeliveryItem) => {
    return (
      <Card 
        className="p-4 mb-3 border-0 rounded-xl bg-white active:bg-gray-50 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
        onClick={() => navigate(`/delivery-details/${delivery.id}`)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <div className="flex items-center flex-wrap gap-1">
              <h3 className="font-bold text-base text-gray-800">
                {(() => {
                  // Enhanced approach with comprehensive fallbacks
                  const displayName = 
                    delivery.title || 
                    delivery.name || 
                    delivery.requestName ||
                    delivery.requestTitle || 
                    delivery.productName ||
                    delivery.itemName ||
                    delivery.item ||
                    'Pedido';
                  
                  // Debug log to console for troubleshooting
                  console.log(`Rendering delivery ${delivery.id} with title options:`, {
                    title: delivery.title,
                    name: delivery.name,
                    requestName: delivery.requestName,
                    requestTitle: delivery.requestTitle,
                    productName: delivery.productName,
                    itemName: delivery.itemName,
                    item: delivery.item,
                    final: displayName
                  });
                    
                  return `${displayName} (#${delivery.id.substring(0, 6)})`;
                })()}
              </h3>
              {delivery.isUrgent && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-md font-semibold animate-pulse">
                  Urgente
                </span>
              )}
              
              {/* Empresa encargada del pedido */}
              {delivery.companyName && (
                <span className="ml-2 bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-md font-medium">
                  {delivery.companyName}
                </span>
              )}
            </div>
            <div className="flex items-center text-gray-600 mt-0.5">
              <MapPin size={14} className="mr-1 flex-shrink-0 text-blue-500" />
              <span className="line-clamp-1 text-xs">{delivery.deliveryAddress || delivery.address || 'Dirección no especificada'}</span>
            </div>
            {(delivery.companyAddress || delivery.businessAddress) && (
              <div className="flex items-center text-gray-600 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 flex-shrink-0 text-green-500">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="line-clamp-1 text-xs text-green-700">Empresa: {delivery.companyAddress || delivery.businessAddress}</span>
              </div>
            )}
          </div>
          
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center ${
            delivery.status === 'pendingDelivery' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
            delivery.status === 'inDelivery' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
            delivery.status === 'delivered' ? 'bg-green-100 text-green-800 border border-green-200' : 
            'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            {delivery.status === 'pendingDelivery' ? (
              <>
                <Clock size={12} className="mr-1" />
                <span>Pendiente</span>
              </>
            ) : delivery.status === 'inDelivery' ? (
              <>
                <Truck size={12} className="mr-1" />
                <span>En Entrega</span>
              </>
            ) : delivery.status === 'delivered' ? (
              <>
                <CheckCircle size={12} className="mr-1" />
                <span>Entregado</span>
              </>
            ) : (
              <>
                <AlertTriangle size={12} className="mr-1" />
                <span>Desconocido</span>
              </>
            )}
          </div>
        </div>
        
        {/* Información del producto */}
        {(delivery.productName || delivery.productDescription || delivery.productImage) && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg flex items-center">
            {(delivery.productImage || delivery.itemImage || delivery.image) ? (
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 mr-3 bg-white border border-gray-100">
                <img 
                  src={delivery.productImage || delivery.itemImage || delivery.image} 
                  alt={delivery.productName || delivery.itemName || delivery.item || "Producto"} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log("Error loading image:", delivery.productImage || delivery.itemImage || delivery.image);
                    const target = e.target as HTMLImageElement;
                    target.src = "https://via.placeholder.com/100?text=Producto";
                  }}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 mr-3 bg-gray-200 flex items-center justify-center">
                <Package size={20} className="text-gray-400" />
              </div>
            )}
            
            <div className="flex-1">
              <p className="font-medium text-sm line-clamp-1 text-gray-800">
                {delivery.productName || "Producto no especificado"}
              </p>
              {delivery.productDescription && (
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                  {delivery.productDescription}
                </p>
              )}
              {delivery.productQuantity && (
                <div className="mt-1 inline-flex bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                  Cant.: {delivery.productQuantity}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Información de la empresa */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Empresa</p>
              <p className="text-sm font-medium line-clamp-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-1">
                  <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"></path>
                  <path d="M1 21h22"></path>
                  <path d="M9 9h6"></path>
                  <path d="M9 13h6"></path>
                  <path d="M9 17h6"></path>
                </svg>
                {delivery.companyName || 'No especificada'}
              </p>
            </div>
            
            {/* Información del solicitante */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Cliente</p>
              <p className="text-sm font-medium line-clamp-1 flex items-center">
                <User size={12} className="text-gray-400 mr-1" />
                {delivery.customerName || delivery.clientName || 'Cliente'}
              </p>
            </div>
            
            {/* Precio ofrecido por la empresa */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Pago ofrecido</p>
              <p className="text-sm font-medium flex items-center text-green-600">
                <DollarSign size={12} className="text-green-500 mr-1" />
                ${(delivery.offeredPrice || delivery.deliveryFee || 0).toFixed(2)}
              </p>
            </div>
            
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Teléfono</p>
              <p className="text-sm font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-1">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                {delivery.customerPhone || delivery.clientPhone || delivery.phone || 'No disponible'}
              </p>
            </div>
            
            <div className="flex items-center">
              <div className="bg-gray-50 rounded-full p-0.5 mr-1.5">
                <Clock size={12} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
                <p className="text-xs font-medium">
                  {delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString([], {day: 'numeric', month: 'short'}) : 'N/A'}
                  {' · '}
                  {delivery.createdAt ? new Date(delivery.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </p>
              </div>
            </div>
            
            {(delivery.offeredPrice || delivery.deliveryFee) && (
              <div className="flex items-center">
                <div className="bg-green-50 rounded-full p-0.5 mr-1.5">
                  <DollarSign size={12} className="text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Tarifa</p>
                  <p className="text-xs font-medium text-green-600">
                    ${(delivery.offeredPrice || delivery.deliveryFee || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {delivery.distance && (
            <div className="mt-2.5 flex items-center text-xs bg-blue-50 rounded-lg p-1.5 px-2 w-fit">
              <MapPin size={12} className="text-blue-600 mr-1.5" />
              <span className="font-medium">{delivery.distance} km</span>
              <span className="text-gray-500 ml-1">de tu ubicación</span>
            </div>
          )}
        </div>

        {activeTab === 'available' && (
          <div className="mt-3">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptDelivery(delivery.id, delivery.source || 'orders');
              }} 
              disabled={driverStatus !== 'disponible'}
              className={`w-full font-medium py-2 rounded-lg shadow-sm hover:shadow transition-all duration-200 ${
                driverStatus === 'disponible' 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {driverStatus === 'disponible' ? (
                <>
                  <Zap size={16} className="mr-1.5" />
                  Aceptar Entrega
                </>
              ) : (
                <>
                  {driverStatusOptions.find(s => s.value === driverStatus)?.icon}
                  <span className="ml-1.5">Cambiar a Disponible para aceptar</span>
                </>
              )}
            </Button>
          </div>
        )}

        {activeTab === 'active' && (
          <div className="mt-3">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteDelivery(delivery.id);
              }} 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 font-medium text-white py-2 rounded-lg shadow-sm hover:shadow transition-all duration-200"
            >
              <CheckCircle size={16} className="mr-1.5" />
              Marcar como Entregado
            </Button>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="mt-3 flex items-center justify-between bg-gray-50 p-2 rounded-lg">
            <div className="flex items-center">
              <div className="text-xs text-gray-500 mr-1.5">Calificación:</div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-base ${i < (delivery.deliveryRating || 0) ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                ))}
              </div>
            </div>
            <div className="bg-white p-1 rounded-full shadow-sm">
              <ChevronRight size={14} className="text-gray-400" />
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-36">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2.5 sticky top-0 z-30 shadow-md">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Panel de Repartidor</h1>
              <div className="flex items-center">
                <p className="text-blue-100 text-xs opacity-90 mr-2">Bienvenido, {userData?.name}</p>
                {/* Status Indicator */}
                <div className="relative">
                  <button 
                    onClick={() => setShowStatusPicker(!showStatusPicker)}
                    className="flex items-center text-xs bg-blue-500/30 hover:bg-blue-500/50 px-2 py-0.5 rounded-full transition-all"
                    disabled={savingStatus}
                  >
                    <span className={`w-2 h-2 rounded-full ${driverStatusOptions.find(s => s.value === driverStatus)?.color || 'bg-gray-300'} mr-1.5 animate-pulse`}></span>
                    <span className="font-medium whitespace-nowrap mr-1">
                      {driverStatusOptions.find(s => s.value === driverStatus)?.label || 'Disponible'}
                    </span>
                    {savingStatus ? 
                      <span className="animate-spin ml-1"><RefreshCw size={10} /></span> :
                      <ChevronDown size={10} className="ml-1" />
                    }
                  </button>
                  
                  {/* Status Selector */}
                  {showStatusPicker && (
                    <motion.div
                      ref={statusPickerRef}
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-lg overflow-hidden z-50 border border-gray-100 w-44"
                    >
                      <div className="py-1">
                        {driverStatusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateDriverStatus(option.value)}
                            className={`w-full text-left px-3 py-2 flex items-center text-sm ${
                              driverStatus === option.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${option.color} mr-2`}></span>
                            <span className="flex-1">{option.label}</span>
                            {driverStatus === option.value && (
                              <CheckCircle size={14} className="text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              {/* Notificaciones */}
              <div className="relative mr-2">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1.5 text-white rounded-full hover:bg-blue-500 active:bg-blue-800 transition-all duration-200"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </button>
                
                {/* Panel de notificaciones */}
                {showNotifications && (
                  <motion.div 
                    ref={notificationsRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-3 w-90 bg-white rounded-xl shadow-2xl z-50 max-h-[500px] overflow-auto border border-gray-100"
                  >
                    <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10 backdrop-blur-sm bg-opacity-95">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-800 flex items-center">
                          <Bell size={16} className="mr-2 text-blue-600" />
                          Notificaciones
                          {unreadNotifications > 0 && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                              {unreadNotifications} nueva{unreadNotifications !== 1 ? 's' : ''}
                            </span>
                          )}
                        </h4>
                        {unreadNotifications > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                          >
                            Marcar todas como leídas
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="py-1">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell size={24} className="text-gray-300" />
                          </div>
                          <p className="text-gray-500 text-sm">No tienes notificaciones</p>
                          <p className="text-xs text-gray-400 mt-1">Las alertas aparecerán aquí</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {notifications.map((notification: any) => (
                            <motion.div 
                              key={notification.id}
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -50 }}
                              transition={{ duration: 0.2 }}
                              className={`p-4 border-b border-gray-100 ${!notification.read ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors`}
                            >
                              <div className="flex">
                                <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${!notification.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                  {notification.type === 'order' ? (
                                    <Package size={16} className={!notification.read ? 'text-blue-600' : 'text-gray-500'} />
                                  ) : notification.type === 'payment' ? (
                                    <DollarSign size={16} className={!notification.read ? 'text-blue-600' : 'text-gray-500'} />
                                  ) : (
                                    <Bell size={16} className={!notification.read ? 'text-blue-600' : 'text-gray-500'} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-800 text-sm">{notification.title}</h5>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-gray-400">
                                      {notification.timestamp ? new Date(notification.timestamp).toLocaleString([], {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : 'Fecha desconocida'}
                                    </span>
                                    {!notification.read && (
                                      <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                                        Nuevo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100 text-center">
                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Ver todas las notificaciones
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              
              {userData?.status === 'pendiente' && (
                <div className="bg-yellow-500 px-3 py-1 rounded-full text-white text-xs font-medium flex items-center">
                  <AlertTriangle size={14} className="mr-1" />
                  Verificando cuenta
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container mx-auto px-4 mt-2">
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="overflow-x-auto pb-2 scrollbar-hide"
        >
          <div className="flex gap-2 md:grid md:grid-cols-4 min-w-[600px]">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white shadow-sm rounded-xl border-none flex-1 hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-green-400 to-green-500"></div>
                <div className="p-3">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-br from-green-50 to-green-100 rounded-full mr-2.5 shadow-sm">
                      <CheckCircle size={15} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Entregas Completadas</p>
                      <div className="flex items-baseline">
                        <p className="text-lg font-bold text-gray-800">{stats.completedDeliveries}</p>
                        <p className="text-xs text-gray-500 ml-1">pedidos</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                    <div className="bg-green-500 h-1 rounded-full" style={{ width: `${Math.min(stats.completedDeliveries * 5, 100)}%` }}></div>
                  </div>
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white shadow-sm rounded-xl border-none flex-1 hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                <div className="p-3">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full mr-2.5 shadow-sm">
                      <Award size={15} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Calificación</p>
                      <div className="flex items-center">
                        <p className="text-lg font-bold text-gray-800 mr-1">{stats.averageRating.toFixed(1)}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`text-xs ${i < Math.floor(stats.averageRating) ? "text-yellow-500" : "text-gray-200"}`}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                    <div className="bg-yellow-500 h-1 rounded-full" style={{ width: `${(stats.averageRating / 5) * 100}%` }}></div>
                  </div>
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white shadow-sm rounded-xl border-none flex-1 hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                <div className="p-3">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full mr-2.5 shadow-sm">
                      <DollarSign size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Ingresos Hoy</p>
                      <div className="flex items-baseline">
                        <p className="text-lg font-bold text-gray-800">${stats.todayEarnings.toFixed(2)}</p>
                        <p className="text-xs text-blue-500 ml-1 font-medium">
                          {stats.todayEarnings > 0 ? '+' : ''}
                          {((stats.todayEarnings / Math.max(1, stats.weeklyEarnings)) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                    <div className="bg-blue-500 h-1 rounded-full" style={{ 
                      width: `${Math.min((stats.todayEarnings / Math.max(stats.weeklyEarnings, 100)) * 100, 100)}%` 
                    }}></div>
                  </div>
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white shadow-sm rounded-xl border-none flex-1 hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-purple-400 to-purple-500"></div>
                <div className="p-3">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full mr-2.5 shadow-sm">
                      <TrendingUp size={15} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total Histórico</p>
                      <div className="flex items-baseline">
                        <p className="text-lg font-bold text-gray-800">${stats.totalEarnings.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 ml-1">acumulado</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                    <div className="bg-purple-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </Card>
            </motion.div>
            
            {/* Estado actual como tarjeta */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="md:col-span-4 mt-2"
            >
              <Card className="bg-white shadow-sm rounded-xl border-none hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className={`h-1 w-full ${driverStatusOptions.find(s => s.value === driverStatus)?.color || 'bg-gradient-to-r from-blue-400 to-blue-500'}`}></div>
                <div className="p-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${
                        driverStatus === 'disponible' ? 'bg-gradient-to-br from-green-50 to-green-100' :
                        driverStatus === 'varado' ? 'bg-gradient-to-br from-red-50 to-red-100' :
                        driverStatus === 'desayunando' ? 'bg-gradient-to-br from-amber-50 to-amber-100' :
                        driverStatus === 'almorzando' ? 'bg-gradient-to-br from-orange-50 to-orange-100' :
                        driverStatus === 'descanso' ? 'bg-gradient-to-br from-blue-50 to-blue-100' :
                        'bg-gradient-to-br from-purple-50 to-purple-100'
                      }`}>
                        {driverStatusOptions.find(s => s.value === driverStatus)?.icon || <Activity size={18} className="text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Tu estado actual</p>
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full ${driverStatusOptions.find(s => s.value === driverStatus)?.color || 'bg-blue-500'} mr-1.5 animate-pulse`}></span>
                          <p className="text-base font-bold text-gray-800">{driverStatusOptions.find(s => s.value === driverStatus)?.label || 'Disponible'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {driverStatusOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => updateDriverStatus(option.value)}
                          disabled={savingStatus || driverStatus === option.value}
                          className={`text-xs px-3 py-1.5 rounded-full flex items-center transition-all duration-200 ${
                            driverStatus === option.value
                              ? `${option.color} text-white font-medium shadow-sm`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="mr-1">{option.icon}</span>
                          {option.label}
                          {savingStatus && driverStatus === option.value && (
                            <RefreshCw size={10} className="ml-1 animate-spin" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 mt-3">
        {/* Tabs y Búsqueda */}
        <div className="flex flex-col space-y-2 mb-3">
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="bg-white rounded-xl p-1.5 shadow-sm"
          >
            <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-0.5">
              <button 
                onClick={() => { setActiveTab('available'); loadDeliveries(userData); }} 
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center transition-all duration-200 ${
                  activeTab === 'available' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Package size={14} className="mr-1.5" />
                Disponibles
              </button>
              <button 
                onClick={() => { setActiveTab('active'); loadDeliveries(userData); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center transition-all duration-200 ${
                  activeTab === 'active' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Truck size={14} className="mr-1.5" />
                Mis Entregas
              </button>
              <button 
                onClick={() => { setActiveTab('completed'); loadDeliveries(userData); }}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center transition-all duration-200 ${
                  activeTab === 'completed' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Clock size={14} className="mr-1.5" />
                Historial
              </button>
              <button 
                onClick={handleRefresh} 
                className="ml-auto px-2 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
              </button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                type="text" 
                placeholder="Buscar por cliente, dirección..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 py-5 bg-white rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 shadow-sm text-sm"
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 h-10 px-3 rounded-xl bg-white border-gray-200 hover:bg-gray-50 shadow-sm flex items-center"
            >
              <Filter size={16} className="mr-1.5 text-gray-600" />
              <span className="text-sm">Filtros</span>
            </Button>
          </motion.div>
          
          {/* Filtros expandibles */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-xs font-medium mb-2.5 text-gray-700 flex items-center">
                    <Filter size={14} className="mr-1.5 text-blue-500" />
                    Ordenar entregas por:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleSortChange('newest')}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                        sortOrder === 'newest' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Más recientes
                    </button>
                    <button 
                      onClick={() => handleSortChange('oldest')}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                        sortOrder === 'oldest' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Más antiguos
                    </button>
                    <button 
                      onClick={() => handleSortChange('nearest')}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                        sortOrder === 'nearest' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Más cercanos
                    </button>
                    <button 
                      onClick={() => handleSortChange('highest')}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                        sortOrder === 'highest' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Mejor pagados
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lista de pedidos */}
        {isRefreshing ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 bg-white rounded-xl shadow-sm"
          >
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-30"></div>
              <div className="relative bg-blue-50 rounded-full w-14 h-14 flex items-center justify-center">
                <Truck size={32} className="text-blue-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-base font-medium text-gray-800">
              Actualizando entregas...
            </h3>
            <div className="flex justify-center mt-2 space-x-1">
              <div className="w-8 h-1 bg-blue-200 rounded-full animate-pulse delay-100"></div>
              <div className="w-8 h-1 bg-blue-300 rounded-full animate-pulse delay-200"></div>
              <div className="w-8 h-1 bg-blue-400 rounded-full animate-pulse delay-300"></div>
            </div>
            <p className="text-gray-500 mt-2 text-xs">Obteniendo los pedidos más recientes</p>
            
            {/* Estado actual durante la carga */}
            <div className="mt-4 mx-auto max-w-xs">
              <div className={`flex items-center py-1.5 px-3 rounded-full w-fit mx-auto ${
                driverStatus === 'disponible' ? 'bg-green-50 text-green-700 border border-green-100' :
                driverStatus === 'varado' ? 'bg-red-50 text-red-700 border border-red-100' :
                driverStatus === 'desayunando' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                driverStatus === 'almorzando' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                driverStatus === 'descanso' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                'bg-purple-50 text-purple-700 border border-purple-100'
              }`}>
                <span className={`w-2 h-2 rounded-full ${driverStatusOptions.find(s => s.value === driverStatus)?.color || 'bg-blue-500'} mr-2 animate-pulse`}></span>
                <span className="text-xs font-medium">Estado: {driverStatusOptions.find(s => s.value === driverStatus)?.label}</span>
              </div>
            </div>
          </motion.div>
        ) : filteredDeliveries.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center py-8 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <div className="relative mx-auto w-16 h-16 mb-3">
              <div className="absolute inset-0 bg-blue-50 rounded-full opacity-30 animate-ping"></div>
              <div className="relative bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                {activeTab === 'available' ? (
                  <Package size={32} className="text-gray-300" />
                ) : activeTab === 'active' ? (
                  <Truck size={32} className="text-gray-300" />
                ) : (
                  <CheckCircle size={32} className="text-gray-300" />
                )}
              </div>
            </div>
            <h3 className="text-base font-medium text-gray-800">
              {activeTab === 'available' ? 'No hay entregas disponibles' :
               activeTab === 'active' ? 'No tienes entregas activas' :
               'No hay entregas completadas'}
            </h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto text-xs px-4">
              {searchTerm ? 'No se encontraron resultados para tu búsqueda.' :
              activeTab === 'available' ? 'No hay entregas disponibles en este momento. Las empresas aún no han publicado nuevos pedidos para entregar.' :
              activeTab === 'active' ? 'No tienes entregas activas en este momento.' :
              'Aún no has completado ninguna entrega.'}
            </p>
            <Button 
              onClick={handleRefresh}
              variant="outline" 
              className="mt-3 bg-white text-xs py-1 px-3 h-auto"
            >
              <RefreshCw size={12} className="mr-1.5" />
              Actualizar
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
            <AnimatePresence>
              {filteredDeliveries.map((delivery, index) => (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  {renderDeliveryCard(delivery)}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* BottomNavigationDelivery con espacio adicional para evitar que tape contenido */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <BottomNavigationDelivery />
      </div>
    </div>
  );
};

export default DeliveryDashboard;
