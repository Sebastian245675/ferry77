import React, { useEffect, useState, useRef } from 'react';
import { Message, Conversation } from '../lib/models';
import { messageService } from '../lib/messageService';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { getAuth } from 'firebase/auth';
import { Paperclip, ChevronLeft, Send } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatProps {
  conversationId?: string;
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string;
  onClose?: () => void;
  metadata?: {
    requestId?: string;
    quoteId?: string;
    companyId?: string;
  };
}

const Chat: React.FC<ChatProps> = ({ 
  conversationId: initialConversationId, 
  recipientId, 
  recipientName, 
  recipientAvatar,
  onClose,
  metadata 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = getAuth();
  const user = auth.currentUser;
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};
    
    messages.forEach(message => {
      const date = new Date(typeof message.timestamp === 'number' ? message.timestamp : Date.parse(message.timestamp));
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  // Formatear fecha para el encabezado del grupo
  const formatDateHeader = (dateKey: string) => {
    const date = new Date(dateKey);
    
    if (isToday(date)) {
      return 'Hoy';
    } else if (isYesterday(date)) {
      return 'Ayer';
    } else {
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    }
  };

  // Iniciar o cargar conversación
  useEffect(() => {
    const loadOrCreateConversation = async () => {
      setLoading(true);
      
      try {
        let convId = initialConversationId;
        
        if (!convId && recipientId && recipientName) {
          // Verificar si ya existe una conversación
          const existingConvId = await messageService.findExistingConversation(recipientId);
          
          if (existingConvId) {
            convId = existingConvId;
          } else {
            // Crear nueva conversación
            const newConvId = await messageService.createConversation(
              recipientId,
              recipientName,
              recipientAvatar,
              metadata
            );
            
            convId = newConvId || undefined;
          }
          
          if (convId) {
            setConversationId(convId);
          }
        }
        
        // Si tenemos una ID de conversación, cargamos los mensajes
        if (convId) {
          const msgs = await messageService.getMessages(convId);
          setMessages(msgs);
          
          // Marcar como leídos
          await messageService.markMessagesAsRead(convId);
          
          // Obtener detalles de la conversación
          const conversations = await messageService.getConversations();
          const currentConv = conversations.find(c => c.id === convId);
          
          if (currentConv) {
            setConversation(currentConv);
          }
        }
      } catch (error) {
        console.error("Error al cargar la conversación:", error);
      }
      
      setLoading(false);
    };
    
    loadOrCreateConversation();
  }, [initialConversationId, recipientId, recipientName, recipientAvatar, metadata]);

  // Escuchar cambios en los mensajes
  useEffect(() => {
    if (!conversationId) return;
    
    const unsubscribe = messageService.listenToMessages(conversationId, (updatedMessages) => {
      setMessages(updatedMessages);
      
      // Marcar como leídos cuando hay nuevos mensajes
      messageService.markMessagesAsRead(conversationId);
    });
    
    return () => unsubscribe();
  }, [conversationId]);

  // Hacer scroll hacia abajo cuando se reciben nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !user) return;
    
    try {
      setSending(true);
      await messageService.sendMessage(conversationId, messageText.trim());
      setMessageText('');
      
      // Forzar scroll hacia abajo después de enviar
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    } finally {
      setSending(false);
    }
  };

  // Obtener información del destinatario de la conversación
  const getRecipient = () => {
    if (recipientName && recipientAvatar) {
      return { name: recipientName, avatar: recipientAvatar };
    }
    
    if (conversation && user) {
      const recipient = conversation.participants.find(p => p.userId !== user.uid);
      if (recipient) {
        return { name: recipient.name, avatar: recipient.avatar };
      }
    }
    
    return { name: "Contacto", avatar: undefined };
  };

  const recipient = getRecipient();
  const messageGroups = groupMessagesByDate(messages);
  
  // Generar iniciales para el avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Cabecera del chat */}
      <div className="flex items-center p-4 border-b">
        {onClose && (
          <Button variant="ghost" size="icon" className="mr-2" onClick={onClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={recipient.avatar} alt={recipient.name} />
          <AvatarFallback>{getInitials(recipient.name)}</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h3 className="text-sm font-medium">{recipient.name}</h3>
          <p className="text-xs text-gray-500">
            {loading ? "Cargando..." : "En línea"}
          </p>
        </div>
      </div>

      {/* Área de mensajes */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">No hay mensajes. ¡Envía el primero!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([dateKey, groupMessages]) => (
              <div key={dateKey} className="space-y-3">
                <div className="flex justify-center">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    {formatDateHeader(dateKey)}
                  </span>
                </div>
                
                {groupMessages.map(message => {
                  const isMyMessage = user && message.senderId === user.uid;
                  const messageTime = typeof message.timestamp === 'number' 
                    ? new Date(message.timestamp) 
                    : new Date(Date.parse(message.timestamp));
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-[80%]`}>
                        {!isMyMessage && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                            <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isMyMessage 
                                ? 'bg-blue-500 text-white rounded-br-none' 
                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map(att => (
                                  <div key={att.id} className="flex items-center">
                                    <Paperclip className="h-4 w-4 mr-1" />
                                    <a 
                                      href={att.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-sm underline"
                                    >
                                      {att.name || 'Archivo adjunto'}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 ${isMyMessage ? 'text-right' : 'text-left'}`}>
                            {format(messageTime, 'HH:mm')}
                            {isMyMessage && (
                              <span className="ml-1">
                                {message.status === 'read' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Área de entrada de mensaje */}
      <div className="border-t p-4">
        <div className="flex items-end space-x-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="resize-none min-h-[50px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            disabled={!messageText.trim() || sending || loading || !conversationId} 
            onClick={handleSendMessage}
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
