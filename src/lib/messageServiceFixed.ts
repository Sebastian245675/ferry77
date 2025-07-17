import { ref, push, onValue, off, update, query as dbQuery, orderByChild, startAt, get, remove } from "firebase/database";
import { Message, Conversation, ConversationParticipant } from './models';
import { auth, rtdb, db } from './firebase';
import { getDocs, collection, where, query as fsQuery, DocumentData } from 'firebase/firestore';

// Servicio para manejar todas las operaciones relacionadas con mensajes
export class MessageService {
  // Marcar mensajes de delivery como leídos
  async markDeliveryMessagesAsRead(orderId: string): Promise<void> {
    try {
      console.log('Marcando mensajes de delivery como leídos para orderId:', orderId);
      const user = this.auth.currentUser;
      if (!user) return;
      
      // Obtenemos los mensajes actuales
      const chatRef = ref(this.db, `deliveryChats/${orderId}`);
      const snapshot = await get(chatRef);
      
      if (snapshot.exists()) {
        // Recorremos los mensajes y actualizamos los que no sean del usuario (enviados por el repartidor)
        const updatePromises: Promise<any>[] = [];
        
        snapshot.forEach((msgSnapshot) => {
          const msgData = msgSnapshot.val();
          if (msgData.sender !== 'user' && !msgData.read) {
            // Este es un mensaje del repartidor y no ha sido leído aún
            const msgRef = ref(this.db, `deliveryChats/${orderId}/${msgSnapshot.key}`);
            updatePromises.push(update(msgRef, { read: true }));
          }
        });
        
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log(`${updatePromises.length} mensajes marcados como leídos`);
        }
      }
    } catch (error) {
      console.error("Error al marcar mensajes como leídos:", error);
    }
  }

  // Normalizar un timestamp para asegurarse de que sea un valor numérico válido
  private normalizeTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') return timestamp;
    
    if (typeof timestamp === 'string') {
      // Si es una hora en formato hh:mm, crear una fecha con la hora actual
      if (timestamp.includes(':') && !timestamp.includes('-')) {
        try {
          const [hours, minutes] = timestamp.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date.getTime();
        } catch (e) {
          console.error("Error al parsear timestamp:", timestamp, e);
        }
      }
      
      // Intentar parsear como fecha completa
      const parsed = Date.parse(timestamp);
      if (!isNaN(parsed)) return parsed;
    }
    
    // Valor predeterminado si no se puede parsear
    return Date.now();
  }

  private db = rtdb;
  private auth = auth;

  // Obtener todas las conversaciones del usuario actual
  async getConversations(): Promise<Conversation[]> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");

      // Obtener conversaciones regulares
      let conversations: Conversation[] = [];
      
      const userConversationsRef = ref(this.db, `userConversations/${user.uid}`);
      const snapshot = await get(userConversationsRef);
      
      if (snapshot.exists()) {
        const conversationIds = Object.keys(snapshot.val());
        
        for (const convId of conversationIds) {
          const convRef = ref(this.db, `conversations/${convId}`);
          const convSnapshot = await get(convRef);
          if (convSnapshot.exists()) {
            conversations.push({
              id: convId,
              ...convSnapshot.val()
            });
          }
        }
      }
      
      // Obtener chats de delivery
      const deliveryChats = await this.getDeliveryChats();
      
      // Combinar ambos tipos de conversaciones
      conversations = [...conversations, ...deliveryChats];
      
      // Ordenar por actividad más reciente
      return conversations.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      console.error("Error al obtener conversaciones:", error);
      return [];
    }
  }

  // Escuchar cambios en tiempo real en las conversaciones
  listenToConversations(callback: (conversations: Conversation[]) => void): () => void {
    const user = this.auth.currentUser;
    if (!user) return () => {};

    // Crear un temporizador para verificar los chats de delivery cada 3 segundos
    const checkDeliveryChats = async () => {
      try {
        const allConversations = await this.getConversations();
        callback(allConversations);
        console.log("Actualizando conversaciones, total:", allConversations.length);
      } catch (error) {
        console.error("Error actualizando conversaciones:", error);
      }
    };
    
    // Iniciar el temporizador con un intervalo más corto para mejor respuesta
    const intervalId = setInterval(checkDeliveryChats, 3000);
    checkDeliveryChats(); // Ejecutar inmediatamente la primera vez
    
    // También escuchar cambios en las conversaciones regulares
    const userConversationsRef = ref(this.db, `userConversations/${user.uid}`);
    
    const listener = onValue(userConversationsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const conversationIds = Object.keys(snapshot.val());
      const conversations: Conversation[] = [];
      
      for (const convId of conversationIds) {
        const convRef = ref(this.db, `conversations/${convId}`);
        const convSnapshot = await get(convRef);
        if (convSnapshot.exists()) {
          conversations.push({
            id: convId,
            ...convSnapshot.val()
          });
        }
      }
      
      // Ordenar por actividad más reciente
      callback(conversations.sort((a, b) => b.lastActivity - a.lastActivity));
    });
    
    // Retorna función para detener la escucha
    return () => {
      clearInterval(intervalId);
      off(userConversationsRef);
    };
  }

  // Obtener mensajes de una conversación específica
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      // Verificar si es un chat de delivery (ID comienza con 'delivery-')
      if (conversationId.startsWith('delivery-')) {
        console.log("Obteniendo mensajes de delivery para:", conversationId);
        const orderId = conversationId.replace('delivery-', '');
        return this.getDeliveryMessages(orderId);
      }
      
      // Es una conversación normal
      const messagesRef = ref(this.db, `messages/${conversationId}`);
      const snapshot = await get(messagesRef);
      
      if (!snapshot.exists()) return [];
      
      const messagesData = snapshot.val();
      const messages: Message[] = Object.keys(messagesData).map(key => ({
        id: key,
        ...messagesData[key]
      }));
      
      // Ordenar por timestamp
      return messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : a.timestamp as number;
        const timeB = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : b.timestamp as number;
        return timeA - timeB;
      });
    } catch (error) {
      console.error("Error al obtener mensajes:", error);
      return [];
    }
  }

  // Escuchar cambios en tiempo real en los mensajes
  listenToMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
    // Verificar si es un chat de delivery (ID comienza con 'delivery-')
    if (conversationId.startsWith('delivery-')) {
      const orderId = conversationId.replace('delivery-', '');
      return this.listenToDeliveryMessages(orderId, callback);
    }
    
    const messagesRef = ref(this.db, `messages/${conversationId}`);
    
    const listener = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messagesData = snapshot.val();
      const messages: Message[] = Object.keys(messagesData).map(key => ({
        id: key,
        ...messagesData[key]
      }));
      
      // Ordenar por timestamp
      callback(messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : a.timestamp as number;
        const timeB = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : b.timestamp as number;
        return timeA - timeB;
      }));
    });
    
    // Retorna función para detener la escucha
    return () => off(messagesRef);
  }

  // Enviar un nuevo mensaje
  async sendMessage(conversationId: string, content: string, attachments?: any[]): Promise<Message | null> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      // Verificar si es un chat de delivery
      if (conversationId.startsWith('delivery-')) {
        const orderId = conversationId.replace('delivery-', '');
        const sent = await this.sendDeliveryMessage(orderId, content);
        
        if (sent) {
          return {
            id: `msg-${Date.now()}`,
            senderId: user.uid,
            senderName: user.displayName || 'Usuario',
            recipientId: 'delivery-person',
            content,
            timestamp: Date.now(),
            read: false,
            status: 'sent'
          };
        }
        return null;
      }
      
      // Es una conversación normal
      // Obtener datos del usuario para adjuntar al mensaje
      const userName = user.displayName || 'Usuario';
      
      const newMessage: Omit<Message, 'id'> = {
        senderId: user.uid,
        senderName: userName,
        senderAvatar: user.photoURL || undefined,
        recipientId: '', // Se llenará abajo
        content,
        timestamp: Date.now(),
        read: false,
        status: 'sent',
        attachments: attachments?.map(a => ({ ...a, id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }))
      };
      
      // Obtener la conversación para determinar el destinatario
      const convRef = ref(this.db, `conversations/${conversationId}`);
      const convSnapshot = await get(convRef);
      
      if (!convSnapshot.exists()) throw new Error("Conversación no encontrada");
      
      const conversation = convSnapshot.val() as Conversation;
      
      // Determinar el destinatario (excluyendo al remitente)
      const recipient = conversation.participants.find(p => p.userId !== user.uid);
      if (recipient) {
        newMessage.recipientId = recipient.userId;
      }
      
      // Guardar mensaje en la base de datos
      const messagesRef = ref(this.db, `messages/${conversationId}`);
      const newMessageRef = push(messagesRef);
      await update(newMessageRef, newMessage);
      
      // Actualizar última actividad y mensaje en la conversación
      const updates: any = {
        lastActivity: newMessage.timestamp,
        lastMessage: { ...newMessage, id: newMessageRef.key }
      };
      
      // Incrementar contador de no leídos para todos excepto el remitente
      conversation.participants.forEach(participant => {
        if (participant.userId !== user.uid) {
          updates[`unreadCount/${participant.userId}`] = (conversation.unreadCount?.[participant.userId] || 0) + 1;
        }
      });
      
      await update(convRef, updates);
      
      return {
        ...newMessage,
        id: newMessageRef.key!
      };
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      return null;
    }
  }

  // Marcar mensajes como leídos
  async markMessagesAsRead(conversationId: string): Promise<boolean> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      // Si es un chat de delivery
      if (conversationId.startsWith('delivery-')) {
        const orderId = conversationId.replace('delivery-', '');
        await this.markDeliveryMessagesAsRead(orderId);
        return true;
      }
      
      // Es una conversación normal
      const convRef = ref(this.db, `conversations/${conversationId}`);
      const convSnapshot = await get(convRef);
      
      if (!convSnapshot.exists()) return false;
      
      const conversation = convSnapshot.val();
      
      // Si no hay mensajes no leídos, no hacer nada
      if (!conversation.unreadCount || !conversation.unreadCount[user.uid]) {
        return true;
      }
      
      // Actualizar los mensajes como leídos
      await update(convRef, { [`unreadCount/${user.uid}`]: 0 });
      
      // También actualizar el estado de los mensajes individuales
      const messagesRef = ref(this.db, `messages/${conversationId}`);
      const messagesSnapshot = await get(messagesRef);
      
      if (messagesSnapshot.exists()) {
        const messages = messagesSnapshot.val();
        const updates: any = {};
        
        for (const msgId in messages) {
          const msg = messages[msgId];
          if (!msg.read && msg.recipientId === user.uid) {
            updates[`${msgId}/read`] = true;
            updates[`${msgId}/status`] = 'read';
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await update(messagesRef, updates);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error al marcar mensajes como leídos:", error);
      return false;
    }
  }

  // Crear una nueva conversación entre dos usuarios
  async createConversation(
    recipientId: string, 
    recipientName: string, 
    recipientAvatar?: string, 
    metadata?: { 
      requestId?: string, 
      quoteId?: string, 
      companyId?: string 
    }
  ): Promise<string | null> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      // Verificar si ya existe una conversación con este usuario
      const existingConversationId = await this.findExistingConversation(recipientId);
      if (existingConversationId) return existingConversationId;
      
      const userName = user.displayName || 'Usuario';
      
      const newConversation: Omit<Conversation, 'id'> = {
        participants: [
          {
            userId: user.uid,
            name: userName,
            avatar: user.photoURL || undefined,
            role: metadata?.companyId ? 'buyer' : 'seller'
          },
          {
            userId: recipientId,
            name: recipientName,
            avatar: recipientAvatar,
            role: metadata?.companyId ? 'seller' : 'buyer'
          }
        ],
        lastActivity: Date.now(),
        unreadCount: { [recipientId]: 0, [user.uid]: 0 },
        type: 'direct',
        ...metadata
      };
      
      // Crear la conversación en la base de datos
      const conversationsRef = ref(this.db, 'conversations');
      const newConvRef = push(conversationsRef);
      await update(newConvRef, newConversation);
      
      const conversationId = newConvRef.key!;
      
      // Añadir referencia a la conversación para ambos usuarios
      await update(ref(this.db, `userConversations/${user.uid}/${conversationId}`), { timestamp: Date.now() });
      await update(ref(this.db, `userConversations/${recipientId}/${conversationId}`), { timestamp: Date.now() });
      
      return conversationId;
    } catch (error) {
      console.error("Error al crear conversación:", error);
      return null;
    }
  }

  // Encontrar una conversación existente entre dos usuarios
  async findExistingConversation(otherUserId: string): Promise<string | null> {
    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      // Obtener todas las conversaciones del usuario
      const userConversationsRef = ref(this.db, `userConversations/${user.uid}`);
      const snapshot = await get(userConversationsRef);
      
      if (!snapshot.exists()) return null;
      
      const conversationIds = Object.keys(snapshot.val());
      
      for (const convId of conversationIds) {
        const convRef = ref(this.db, `conversations/${convId}`);
        const convSnapshot = await get(convRef);
        
        if (convSnapshot.exists()) {
          const conversation = convSnapshot.val() as Conversation;
          
          // Verificar si el otro usuario es participante
          const isParticipant = conversation.participants.some(p => p.userId === otherUserId);
          
          // Verificar que sea una conversación directa entre 2 personas
          if (isParticipant && conversation.type === 'direct' && conversation.participants.length === 2) {
            return convId;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error al buscar conversación existente:", error);
      return null;
    }
  }

  // Obtener el conteo total de mensajes no leídos para el usuario
  async getTotalUnreadCount(): Promise<number> {
    try {
      const user = this.auth.currentUser;
      if (!user) return 0;
      
      const conversations = await this.getConversations();
      
      return conversations.reduce((total, conv) => {
        return total + (conv.unreadCount?.[user.uid] || 0);
      }, 0);
    } catch (error) {
      console.error("Error al obtener conteo de no leídos:", error);
      return 0;
    }
  }

  // Escuchar cambios en el conteo total de no leídos
  listenToTotalUnreadCount(callback: (count: number) => void): () => void {
    const user = this.auth.currentUser;
    if (!user) return () => {};
    
    return this.listenToConversations(conversations => {
      const totalUnread = conversations.reduce((total, conv) => {
        return total + (conv.unreadCount?.[user.uid] || 0);
      }, 0);
      
      callback(totalUnread);
    });
  }

  // Obtener todos los chats de delivery para el usuario actual
  async getDeliveryChats(): Promise<Conversation[]> {
    try {
      console.log("Obteniendo chats de delivery");
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      // Primero buscar las cotizaciones confirmadas del usuario
      const quotesCollection = collection(db, "cotizaciones");
      const quotesQuery = fsQuery(
        quotesCollection,
        where("status", "in", ["accepted", "confirmado"])
      );
      const quotesSnapshot = await getDocs(quotesQuery);
      const confirmedQuotes: any[] = [];
      
      quotesSnapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        confirmedQuotes.push({
          id: doc.id,
          ...data as object
        });
      });
      
      console.log("Cotizaciones confirmadas encontradas:", confirmedQuotes.length);
      if (confirmedQuotes.length === 0) return [];
      
      // Para cada cotización confirmada, verificar si tiene chat de delivery
      const deliveryConversations: Conversation[] = [];
      
      for (const quote of confirmedQuotes) {
        console.log("Verificando chat para cotización:", quote.id);
        const chatRef = ref(this.db, `deliveryChats/${quote.id}`);
        const chatSnapshot = await get(chatRef);
        
        console.log("Chat existe para", quote.id, ":", chatSnapshot.exists());
        if (chatSnapshot.exists()) {
          // Convertir los mensajes a formato de conversación
          const messages = [];
          let lastActivity = Date.now();
          let unreadCount = 0;
          
          chatSnapshot.forEach((messageSnapshot) => {
            const msgData = messageSnapshot.val();
            // Solo contar como no leído si es del repartidor y no está marcado como leído
            if (msgData.sender !== 'user' && !msgData.read) unreadCount++;
            messages.push(msgData);
            if (msgData.timestamp) {
              // Intenta convertir la marca de tiempo a un número
              const timestamp = new Date(msgData.timestamp).getTime();
              if (!isNaN(timestamp)) lastActivity = Math.max(lastActivity, timestamp);
            }
          });
          
          console.log(`Chat ${quote.id} tiene ${unreadCount} mensajes no leídos`);
          
          // Determinar los participantes
          const companyInfo = quote.companyName ? {
            userId: quote.companyId || 'company-' + quote.id,
            name: quote.companyName,
            role: 'seller'
          } as ConversationParticipant : null;
          
          const lastMessage = messages.length > 0 ? 
            messages[messages.length - 1] : null;
          
          console.log("Creando conversación delivery para quote:", quote.id);
          // Crear la conversación
          deliveryConversations.push({
            id: `delivery-${quote.id}`,
            type: 'delivery',
            participants: [
                
              {
                userId: user.uid,
                name: user.displayName || 'Cliente',
                avatar: user.photoURL || undefined,
                role: 'buyer'
              },
              companyInfo || {
                userId: 'delivery-person',
                name: 'Repartidor',
                role: 'support'
              }
            ],
            lastActivity: lastActivity,
            lastMessage: lastMessage ? {
              id: 'msg-last-' + quote.id,
              content: lastMessage.message,
              senderId: lastMessage.sender === 'user' ? user.uid : 'delivery-person',
              senderName: lastMessage.sender === 'user' ? (user.displayName || 'Cliente') : 'Repartidor',
              recipientId: lastMessage.sender === 'user' ? 'delivery-person' : user.uid,
              timestamp: this.normalizeTimestamp(lastMessage.timestamp),
              read: lastMessage.read || false,
              status: lastMessage.read ? 'read' : 'sent'
            } : undefined,
            unreadCount: { [user.uid]: unreadCount },
            requestId: quote.id,
            quoteId: quote.id
          });
        }
      }
      
      return deliveryConversations;
    } catch (error) {
      console.error("Error al obtener chats de delivery:", error);
      return [];
    }
  }

  // Obtener mensajes de un chat de delivery
  async getDeliveryMessages(orderId: string): Promise<Message[]> {
    try {
      console.log("Obteniendo mensajes de delivery para orderId:", orderId);
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      const chatRef = ref(this.db, `deliveryChats/${orderId}`);
      const snapshot = await get(chatRef);
      
      if (!snapshot.exists()) {
        console.log("No existen mensajes para este delivery chat");
        return [];
      }
      
      const messages: Message[] = [];
      snapshot.forEach((msgSnapshot) => {
        const msgData = msgSnapshot.val();
        messages.push({
          id: msgSnapshot.key || `msg-${Date.now()}`,
          senderId: msgData.sender === 'user' ? user.uid : 'delivery-person',
          senderName: msgData.sender === 'user' ? (user.displayName || 'Cliente') : 'Repartidor',
          recipientId: msgData.sender === 'user' ? 'delivery-person' : user.uid,
          content: msgData.message,
          timestamp: this.normalizeTimestamp(msgData.timestamp),
          read: msgData.read || false,
          status: msgData.read ? 'read' : 'sent'
        });
      });
      
      console.log("Mensajes obtenidos:", messages.length);
      
      // Ordenar por marca de tiempo
      return messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp.toString()).getTime();
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp.toString()).getTime();
        return timeA - timeB;
      });
    } catch (error) {
      console.error("Error al obtener mensajes de delivery:", error);
      return [];
    }
  }

  // Escuchar cambios en tiempo real en los mensajes de un chat de delivery
  listenToDeliveryMessages(orderId: string, callback: (messages: Message[]) => void): () => void {
    console.log("Escuchando mensajes de delivery para orderId:", orderId);
    const user = this.auth.currentUser;
    if (!user) return () => {};
    
    const chatRef = ref(this.db, `deliveryChats/${orderId}`);
    
    const listener = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      
      const messages: Message[] = [];
      snapshot.forEach((msgSnapshot) => {
        const msgData = msgSnapshot.val();
        messages.push({
          id: msgSnapshot.key || `msg-${Date.now()}`,
          senderId: msgData.sender === 'user' ? user.uid : 'delivery-person',
          senderName: msgData.sender === 'user' ? (user.displayName || 'Cliente') : 'Repartidor',
          recipientId: msgData.sender === 'user' ? 'delivery-person' : user.uid,
          content: msgData.message,
          timestamp: this.normalizeTimestamp(msgData.timestamp),
          read: msgData.read || false,
          status: msgData.read ? 'read' : 'sent'
        });
      });
      
      // Ordenar por marca de tiempo y enviar al callback
      callback(messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp.toString()).getTime();
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp.toString()).getTime();
        return timeA - timeB;
      }));
    });
    
    return () => off(chatRef, 'value', listener);
  }
  
  // Enviar mensaje a un chat de delivery
  async sendDeliveryMessage(orderId: string, content: string): Promise<boolean> {
    try {
      console.log("Enviando mensaje a delivery chat:", orderId);
      const user = this.auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");
      
      const chatRef = ref(this.db, `deliveryChats/${orderId}`);
      
      // Primero verificar si el chat existe
      const chatSnapshot = await get(chatRef);
      console.log("Chat existe:", chatSnapshot.exists());
      
      // Enviar el mensaje con timestamp en formato estándar (timestamp numérico)
      await push(chatRef, {
        message: content,
        timestamp: Date.now(), // Usar timestamp numérico para consistencia
        sender: 'user'
      });
      
      console.log("Mensaje enviado exitosamente");
      return true;
    } catch (error) {
      console.error("Error al enviar mensaje de delivery:", error);
      return false;
    }
  }
}

// Exportar una instancia del servicio lista para usar
export const messageService = new MessageService();
