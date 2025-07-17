import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Tipo para las notificaciones
export interface Notification {
  userId: string;
  title: string;
  message: string;
  type: 'quote' | 'message' | 'status' | 'delivery' | 'general';
  company?: string;
  read: boolean;
  action?: string;
  actionParams?: Record<string, string>;
  timestamp: any;
}

// Crear una nueva notificación
export const createNotification = async (notification: Omit<Notification, 'timestamp' | 'read'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error al crear la notificación:', error);
    return false;
  }
};

// Notificación de nueva cotización
export const notifyNewQuote = async (userId: string, companyName: string, requestTitle: string, quoteId: string) => {
  return createNotification({
    userId,
    title: 'Nueva Cotización Recibida',
    message: `${companyName} ha enviado una cotización para tu solicitud "${requestTitle}"`,
    type: 'quote',
    company: companyName,
    action: 'view_quote',
    actionParams: { quoteId }
  });
};

// Notificación de nuevo mensaje
export const notifyNewMessage = async (userId: string, senderName: string, message: string, chatId: string) => {
  return createNotification({
    userId,
    title: 'Nuevo Mensaje',
    message: `${senderName}: "${message.length > 30 ? message.substring(0, 30) + '...' : message}"`,
    type: 'message',
    company: senderName,
    action: 'view_message',
    actionParams: { chatId }
  });
};

// Notificación de cambio de estado
export const notifyStatusChange = async (userId: string, requestTitle: string, newStatus: string, requestId: string) => {
  let statusMessage = '';
  
  switch (newStatus) {
    case 'quoted':
      statusMessage = 'ha recibido cotizaciones y está lista para ser revisada';
      break;
    case 'accepted':
      statusMessage = 'ha sido aceptada y está siendo procesada';
      break;
    case 'completed':
      statusMessage = 'ha sido completada exitosamente';
      break;
    case 'declined':
      statusMessage = 'ha sido rechazada';
      break;
    default:
      statusMessage = `ha cambiado a estado: ${newStatus}`;
  }
  
  return createNotification({
    userId,
    title: 'Actualización de Estado',
    message: `Tu solicitud "${requestTitle}" ${statusMessage}`,
    type: 'status',
    action: 'view_request',
    actionParams: { requestId }
  });
};

// Notificación de entrega
export const notifyDeliveryUpdate = async (userId: string, orderId: string, status: string, estimatedTime?: number) => {
  let deliveryMessage = '';
  
  switch (status) {
    case 'processing':
      deliveryMessage = 'está siendo preparado';
      break;
    case 'shipped':
      deliveryMessage = 'ha sido enviado';
      break;
    case 'in_transit':
      deliveryMessage = 'está en camino';
      if (estimatedTime) {
        deliveryMessage += `. Tiempo estimado de llegada: ${estimatedTime} minutos`;
      }
      break;
    case 'delivered':
      deliveryMessage = 'ha sido entregado con éxito';
      break;
    default:
      deliveryMessage = `ha actualizado su estado a: ${status}`;
  }
  
  return createNotification({
    userId,
    title: 'Actualización de Entrega',
    message: `Tu pedido #${orderId} ${deliveryMessage}`,
    type: 'delivery',
    action: 'track_delivery',
    actionParams: { orderId }
  });
};

export default {
  createNotification,
  notifyNewQuote,
  notifyNewMessage,
  notifyStatusChange,
  notifyDeliveryUpdate
};
