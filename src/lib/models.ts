// Interfaces para el sistema de mensajería

export interface Transaction {
  id: string;
  type: 'deposit' | 'payment' | 'withdrawal' | 'refund' | 'quote' | 'request';
  amount: number;
  description: string;
  date: string;
  status: string;
  requestName?: string; // Nombre de la solicitud asociada a la transacción
  requestId?: string;   // ID de la solicitud asociada
  companyName?: string; // Nombre de la empresa asociada
  companyLogo?: string | null; // Logo de la empresa
  items?: any[]; // Items de la solicitud
  companies?: any[]; // Empresas asociadas a la solicitud
  savings?: number; // Ahorro generado
  statusLabel?: string; // Etiqueta descriptiva del estado
}

// Interfaces para el sistema de entregas
export type DeliveryStatus = 'pending' | 'pendingDriver' | 'driverAssigned' | 'inTransit' | 'delivered' | 'cancelled';

export interface DeliveryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price?: number;
  imageUrl?: string;
}

export interface Delivery {
  id: string;
  requestId: string;
  orderId?: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCoordinates?: {
    lat: number;
    lng: number;
  };
  
  status: DeliveryStatus;
  items: DeliveryItem[];
  
  // Información sobre el repartidor
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: {
    lat: number;
    lng: number;
    lastUpdated: string;
  };
  
  // Información de tiempos
  createdAt: string;
  assignedAt?: string;
  estimatedDeliveryTime?: string;
  deliveredAt?: string;
  
  // Información de pago
  deliveryFee: number;
  proposedFee?: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  
  customerNotes?: string;
  driverNotes?: string;
  
  // Calificaciones
  deliveryRating?: number;
  driverRating?: number;
  customerRating?: number;
  
  isUrgent?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  content: string;
  timestamp: number | string;
  read: boolean;
  attachments?: MessageAttachment[];
  quotedMessageId?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video' | 'location';
  url?: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  lastActivity: number;
  unreadCount: { [userId: string]: number };
  type: 'direct' | 'group' | 'delivery';
  title?: string; // Para chats grupales
  requestId?: string; // Si el chat está relacionado a una solicitud
  quoteId?: string; // Si el chat está relacionado a una cotización
  companyId?: string; // Si el chat involucra a una empresa
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role?: 'buyer' | 'seller' | 'support';
  isOnline?: boolean;
  lastSeen?: number;
}
