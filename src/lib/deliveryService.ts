import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  orderBy, 
  Timestamp, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { Delivery, DeliveryStatus } from './models';

// Obtener solicitudes pendientes para repartidores
export const getPendingDeliveries = async (maxDistance?: number, location?: {lat: number, lng: number}) => {
  try {
    const deliveriesRef = collection(db, 'deliveries');
    const q = query(
      deliveriesRef,
      where('status', '==', 'pendingDriver'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const deliveries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Si tenemos ubicación y la entrega tiene coordenadas, calcular distancia
        ...(location && data.deliveryCoordinates 
          ? { distance: calculateDistance(
              location.lat, 
              location.lng, 
              data.deliveryCoordinates.lat, 
              data.deliveryCoordinates.lng
            )}
          : {}
        )
      };
    });
    
    // Si hay un filtro de distancia máxima, aplicarlo
    if (maxDistance && location) {
      return deliveries.filter(delivery => 
        delivery.distance && delivery.distance <= maxDistance
      );
    }
    
    return deliveries;
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    throw error;
  }
};

// Obtener entregas asignadas a un repartidor
export const getDriverDeliveries = async (driverId: string, status?: DeliveryStatus | DeliveryStatus[]) => {
  try {
    const deliveriesRef = collection(db, 'deliveries');
    let q;
    
    if (status) {
      // Si es un array de estados
      if (Array.isArray(status)) {
        q = query(
          deliveriesRef,
          where('driverId', '==', driverId),
          where('status', 'in', status),
          orderBy('assignedAt', 'desc')
        );
      } else {
        q = query(
          deliveriesRef,
          where('driverId', '==', driverId),
          where('status', '==', status),
          orderBy('assignedAt', 'desc')
        );
      }
    } else {
      q = query(
        deliveriesRef,
        where('driverId', '==', driverId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(data as Record<string, any>)
      };
    });
  } catch (error) {
    console.error('Error al obtener entregas del repartidor:', error);
    throw error;
  }
};

// Aceptar una entrega como repartidor
export const acceptDelivery = async (
  deliveryId: string, 
  driverId: string, 
  driverName: string, 
  driverPhone: string,
  estimatedDeliveryTime: string,
  customFee?: number
) => {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    
    return await runTransaction(db, async (transaction) => {
      const deliveryDoc = await transaction.get(deliveryRef);
      
      if (!deliveryDoc.exists()) {
        throw new Error('La entrega no existe');
      }
      
      const deliveryData = deliveryDoc.data();
      
      // Verificar si la entrega ya fue asignada a otro repartidor
      if (deliveryData.status !== 'pendingDriver') {
        throw new Error('Esta entrega ya no está disponible');
      }
      
      // Actualizar la entrega
      const updateData = {
        driverId: driverId,
        driverName: driverName,
        driverPhone: driverPhone,
        status: 'driverAssigned' as DeliveryStatus,
        assignedAt: new Date().toISOString(),
        estimatedDeliveryTime: estimatedDeliveryTime,
      };
      
      // Si el repartidor propone una tarifa personalizada
      if (customFee !== undefined) {
        updateData['proposedFee'] = customFee;
      }
      
      transaction.update(deliveryRef, updateData);
      
      // Crear notificación para el cliente
      const notificationRef = collection(db, 'notifications');
      const notification = {
        userId: deliveryData.customerId,
        title: '¡Tu pedido está en camino!',
        message: `${driverName} será tu repartidor y entregará tu pedido aproximadamente a las ${new Date(estimatedDeliveryTime).toLocaleTimeString()}.`,
        type: 'delivery',
        deliveryId: deliveryId,
        read: false,
        timestamp: serverTimestamp(),
      };
      
      transaction.set(doc(notificationRef), notification);
      
      // Crear notificación para la empresa
      const companyNotification = {
        userId: deliveryData.companyId,
        title: 'Repartidor asignado',
        message: `${driverName} recogerá el pedido #${deliveryId.substring(0, 6)} para entregarlo.`,
        type: 'delivery',
        deliveryId: deliveryId,
        read: false,
        timestamp: serverTimestamp(),
      };
      
      transaction.set(doc(notificationRef), companyNotification);
      
      // También actualizamos el pedido original si existe
      if (deliveryData.orderId) {
        const orderRef = doc(db, 'orders', deliveryData.orderId);
        transaction.update(orderRef, {
          status: 'inDelivery',
          assignedDelivery: driverId,
          deliveryName: driverName,
          deliveryPhone: driverPhone,
          assignedAt: new Date().toISOString(),
          estimatedDeliveryTime: estimatedDeliveryTime
        });
      }
      
      return {
        success: true,
        deliveryId: deliveryId
      };
    });
  } catch (error) {
    console.error('Error al aceptar la entrega:', error);
    throw error;
  }
};

// Proponer un precio personalizado para una entrega
export const proposeDeliveryFee = async (
  deliveryId: string, 
  driverId: string,
  driverName: string,
  proposedFee: number
) => {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliveryDoc = await getDoc(deliveryRef);
    
    if (!deliveryDoc.exists()) {
      throw new Error('La entrega no existe');
    }
    
    const deliveryData = deliveryDoc.data();
    
    // Verificar si la entrega ya fue asignada
    if (deliveryData.status !== 'pendingDriver') {
      throw new Error('Esta entrega ya no está disponible para propuestas');
    }
    
    // Crear una propuesta de tarifa
    const proposalRef = collection(db, 'deliveryProposals');
    await addDoc(proposalRef, {
      deliveryId: deliveryId,
      driverId: driverId,
      driverName: driverName,
      proposedFee: proposedFee,
      status: 'pending', // 'pending', 'accepted', 'rejected'
      createdAt: new Date().toISOString()
    });
    
    // Crear notificación para el cliente
    const deliveryData2 = deliveryDoc.data();
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: deliveryData2.customerId,
      title: 'Nueva propuesta de entrega',
      message: `${driverName} ha propuesto entregar tu pedido por $${proposedFee.toFixed(2)}`,
      type: 'proposal',
      deliveryId: deliveryId,
      read: false,
      timestamp: serverTimestamp(),
    });
    
    return {
      success: true,
      deliveryId: deliveryId,
      proposedFee: proposedFee
    };
  } catch (error) {
    console.error('Error al proponer tarifa:', error);
    throw error;
  }
};

// Cancelar una entrega como repartidor
export const cancelDeliveryByDriver = async (deliveryId: string, driverId: string, reason: string) => {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliveryDoc = await getDoc(deliveryRef);
    
    if (!deliveryDoc.exists()) {
      throw new Error('La entrega no existe');
    }
    
    const deliveryData = deliveryDoc.data();
    
    // Solo se puede cancelar si fue asignado a este repartidor
    if (deliveryData.driverId !== driverId) {
      throw new Error('No tienes permiso para cancelar esta entrega');
    }
    
    // No se puede cancelar si ya fue entregada
    if (deliveryData.status === 'delivered') {
      throw new Error('No se puede cancelar una entrega ya completada');
    }
    
    // Actualizar estado a pendiente de nuevo y quitar asignación
    await updateDoc(deliveryRef, {
      status: 'pendingDriver',
      driverId: null,
      driverName: null,
      driverPhone: null,
      cancelReason: reason,
      cancelledAt: new Date().toISOString(),
      cancellations: (deliveryData.cancellations || 0) + 1
    });
    
    // Crear notificación para el cliente
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: deliveryData.customerId,
      title: 'Entrega cancelada por el repartidor',
      message: `Tu entrega ha sido cancelada por el repartidor. Motivo: ${reason}`,
      type: 'delivery',
      deliveryId: deliveryId,
      read: false,
      timestamp: serverTimestamp(),
    });
    
    // Crear notificación para la empresa
    await addDoc(notificationRef, {
      userId: deliveryData.companyId,
      title: 'Entrega cancelada por el repartidor',
      message: `La entrega del pedido #${deliveryId.substring(0, 6)} ha sido cancelada por el repartidor. Motivo: ${reason}`,
      type: 'delivery',
      deliveryId: deliveryId,
      read: false,
      timestamp: serverTimestamp(),
    });
    
    // También actualizamos el pedido original si existe
    if (deliveryData.orderId) {
      const orderRef = doc(db, 'orders', deliveryData.orderId);
      await updateDoc(orderRef, {
        status: 'pendingDelivery',
        assignedDelivery: null,
        deliveryName: null,
        deliveryPhone: null
      });
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al cancelar la entrega:', error);
    throw error;
  }
};

// Marcar una entrega como completada
export const completeDelivery = async (deliveryId: string, driverId: string) => {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliveryDoc = await getDoc(deliveryRef);
    
    if (!deliveryDoc.exists()) {
      throw new Error('La entrega no existe');
    }
    
    const deliveryData = deliveryDoc.data();
    
    // Solo se puede completar si fue asignado a este repartidor
    if (deliveryData.driverId !== driverId) {
      throw new Error('No tienes permiso para completar esta entrega');
    }
    
    // Actualizar estado a entregado
    await updateDoc(deliveryRef, {
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    });
    
    // Crear notificación para el cliente
    const notificationRef = collection(db, 'notifications');
    await addDoc(notificationRef, {
      userId: deliveryData.customerId,
      title: '¡Tu pedido ha sido entregado!',
      message: 'Tu pedido ha sido entregado con éxito. Por favor, califícanos.',
      type: 'delivery',
      deliveryId: deliveryId,
      read: false,
      timestamp: serverTimestamp(),
    });
    
    // Crear notificación para la empresa
    await addDoc(notificationRef, {
      userId: deliveryData.companyId,
      title: 'Pedido entregado',
      message: `El pedido #${deliveryId.substring(0, 6)} ha sido entregado con éxito.`,
      type: 'delivery',
      deliveryId: deliveryId,
      read: false,
      timestamp: serverTimestamp(),
    });
    
    // También actualizamos el pedido original si existe
    if (deliveryData.orderId) {
      const orderRef = doc(db, 'orders', deliveryData.orderId);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
    }
    
    // Actualizar estadísticas del repartidor
    const userRef = doc(db, 'users', driverId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      await updateDoc(userRef, {
        completedDeliveries: (userData.completedDeliveries || 0) + 1,
        activeDeliveries: Math.max(0, (userData.activeDeliveries || 1) - 1),
        totalEarnings: (userData.totalEarnings || 0) + (deliveryData.proposedFee || deliveryData.deliveryFee || 0)
      });
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error al completar la entrega:', error);
    throw error;
  }
};

// Actualizar ubicación del repartidor
export const updateDriverLocation = async (
  driverId: string,
  latitude: number,
  longitude: number
) => {
  try {
    // Actualizar la ubicación del repartidor en su perfil
    const userRef = doc(db, 'users', driverId);
    await updateDoc(userRef, {
      'location.lat': latitude,
      'location.lng': longitude,
      'location.lastUpdated': new Date().toISOString()
    });
    
    // También actualizar la ubicación en las entregas activas
    const deliveriesRef = collection(db, 'deliveries');
    const q = query(
      deliveriesRef,
      where('driverId', '==', driverId),
      where('status', 'in', ['driverAssigned', 'inTransit'])
    );
    
    const querySnapshot = await getDocs(q);
    
    const batch = querySnapshot.docs.map(async (document) => {
      const deliveryRef = doc(db, 'deliveries', document.id);
      await updateDoc(deliveryRef, {
        'driverLocation.lat': latitude,
        'driverLocation.lng': longitude,
        'driverLocation.lastUpdated': new Date().toISOString()
      });
    });
    
    await Promise.all(batch);
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar la ubicación:', error);
    throw error;
  }
};

// Crear una entrega desde una solicitud aceptada por empresa
export const createDeliveryFromOrder = async (orderId: string) => {
  try {
    // Obtener la orden original
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('El pedido no existe');
    }
    
    const orderData = orderDoc.data();
    
    // Verificar si ya existe una entrega para esta orden
    const deliveriesRef = collection(db, 'deliveries');
    const q = query(deliveriesRef, where('orderId', '==', orderId));
    const existingDeliveries = await getDocs(q);
    
    if (!existingDeliveries.empty) {
      // Ya existe una entrega para esta orden
      return {
        success: false,
        message: 'Ya existe una entrega para esta orden',
        deliveryId: existingDeliveries.docs[0].id
      };
    }
    
    // Crear una nueva entrega
    const newDelivery = {
      orderId: orderId,
      requestId: orderData.requestId || '',
      companyId: orderData.companyId,
      companyName: orderData.companyName,
      companyLogo: orderData.companyLogo,
      companyAddress: orderData.companyAddress || '',
      companyPhone: orderData.companyPhone || '',
      
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone || '',
      deliveryAddress: orderData.deliveryAddress || '',
      deliveryCoordinates: orderData.deliveryCoordinates,
      
      status: 'pendingDriver',
      items: orderData.items || [],
      
      createdAt: new Date().toISOString(),
      
      deliveryFee: orderData.deliveryFee || 0,
      paymentStatus: orderData.paymentStatus || 'pending',
      
      customerNotes: orderData.customerNotes || '',
      isUrgent: orderData.isUrgent || false,
    };
    
    // Guardar la nueva entrega
    const newDeliveryRef = await addDoc(collection(db, 'deliveries'), newDelivery);
    
    // Actualizar la orden original
    await updateDoc(orderRef, {
      status: 'pendingDelivery',
      deliveryId: newDeliveryRef.id
    });
    
    return {
      success: true,
      deliveryId: newDeliveryRef.id
    };
  } catch (error) {
    console.error('Error al crear entrega:', error);
    throw error;
  }
};

// Función para calcular la distancia entre dos puntos usando la fórmula del haversine
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distancia en km
  
  return Math.round(distance * 10) / 10; // Redondear a un decimal
};
