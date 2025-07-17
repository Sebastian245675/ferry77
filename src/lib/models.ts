// Interfaces para el sistema de mensajería

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
