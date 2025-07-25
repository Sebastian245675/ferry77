import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, ArrowLeft, MoreVertical, Phone, Video, Search, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageService } from '../lib/messageService';
import { Conversation, Message } from '../lib/models';
import { getAuth } from 'firebase/auth';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

const MessageCenter = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const auth = getAuth();
  const user = auth.currentUser;
  
  // Cargar conversaciones
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const convs = await messageService.getConversations();
        setConversations(convs);
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
      }
      setLoading(false);
    };
    
    loadConversations();
    
    // Suscribirse a actualizaciones en tiempo real
    const unsubscribe = messageService.listenToConversations((updatedConvs) => {
      setConversations(updatedConvs);
    });
    
    return () => unsubscribe();
  }, []);

  // Enviar mensaje, detectando si es chat de delivery
  const sendMessage = async () => {
    if (message.trim() && selectedChat) {
      try {
        const selectedConversation = conversations.find(c => c.id === selectedChat);
        if (selectedConversation?.type === 'delivery' || selectedChat.startsWith('delivery-')) {
          // Es un chat de delivery
          const orderId = selectedChat.replace('delivery-', '');
          await messageService.sendDeliveryMessage(orderId, message.trim());
        } else {
          // Es un chat normal
          await messageService.sendMessage(selectedChat, message.trim());
        }
        setMessage('');
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
      }
    }
  };

  // Formatear tiempo relativo
  const formatTime = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(Date.parse(timestamp.toString()));
    
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  // Obtener iniciales para el avatar
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Filtrar conversaciones relacionadas con pedidos o cotizaciones
  const filteredConversations = conversations.filter(conv => {
    // Mostrar todas las conversaciones - incluye chats de delivery, pedidos o cotizaciones
    // Los chats de delivery también tienen requestId o están marcados con type: 'delivery'
    if (conv.type === 'delivery') return true;
    
    // Si hay una búsqueda activa, filtrar por nombre
    if (searchQuery.trim()) {
      const otherParticipant = user 
        ? conv.participants.find(p => p.userId !== user.uid)
        : conv.participants[0];
      
      const searchTerms = searchQuery.toLowerCase().trim().split(' ');
      const name = otherParticipant?.name?.toLowerCase() || '';
      
      return searchTerms.every(term => name.includes(term));
    }
    
    return !!conv.requestId || !!conv.quoteId;
  });

  // Obtener información del otro participante
  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return conversation.participants[0];
    return conversation.participants.find(p => p.userId !== user.uid) || conversation.participants[0];
  };

  const ChatList = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Conversaciones</h2>
        <p className="text-sm text-gray-600">
          <span className="inline-flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Repartidores y proveedores conectados
          </span>
        </p>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar conversaciones"
            className="pl-9 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Cargando conversaciones...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 h-full">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MessageSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No hay conversaciones</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              {searchQuery
                ? "No se encontraron conversaciones relacionadas con tu búsqueda"
                : "Los chats de tus pedidos en progreso aparecerán aquí."}
            </p>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="mt-2">
                <ArrowLeft size={16} className="mr-1" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherParticipant = getOtherParticipant(conv);
            const hasUnread = user && conv.unreadCount && conv.unreadCount[user.uid] > 0;
            
            return (
              <div
                key={conv.id}
                onClick={() => {
                  console.log("Seleccionando chat:", conv.id, "tipo:", conv.type);
                  setSelectedChat(conv.id);
                }}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChat === conv.id 
                    ? 'bg-primary-50 border-primary-100'
                    : hasUnread
                      ? 'bg-blue-50/30'
                      : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {otherParticipant.avatar ? (
                      <img
                        src={otherParticipant.avatar}
                        alt={otherParticipant.name}
                        className={`w-12 h-12 rounded-full ${hasUnread ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${hasUnread ? 'bg-primary' : 'bg-primary/80'} flex items-center justify-center text-white font-medium shadow-sm`}>
                        {getInitials(otherParticipant.name)}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-3 h-3 ${otherParticipant.role === 'seller' || conv.type === 'delivery' ? 'bg-green-500' : 'bg-gray-300'} rounded-full border-2 border-white`}></div>
                  </div>
                
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'} truncate`}>
                        {otherParticipant.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{conv.lastActivity ? formatTime(conv.lastActivity) : ""}</span>
                        {hasUnread && (
                          <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount[user.uid]}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      {conv.requestId && (
                        <div className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
                          <p className="text-xs text-blue-600 truncate">
                            Pedido #{conv.requestId.substring(0, 6)}
                          </p>
                        </div>
                      )}
                      {conv.quoteId && (
                        <div className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                          <p className="text-xs text-green-600 truncate">
                            Cotización #{conv.quoteId.substring(0, 6)}
                          </p>
                        </div>
                      )}
                      {conv.type === 'delivery' && !conv.requestId && (
                        <div className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1"></span>
                          <p className="text-xs text-purple-600 truncate">
                            Entrega
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <p className={`text-sm ${hasUnread ? 'text-gray-800 font-medium' : 'text-gray-600'} truncate`}>
                      {conv.lastMessage ? (
                        <>
                          {user && conv.lastMessage.senderId === user.uid && <span>Tú: </span>}
                          {conv.lastMessage.content}
                        </>
                      ) : "Sin mensajes"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const ChatWindow = () => {
    const selectedConversation = conversations.find(c => c.id === selectedChat);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    useEffect(() => {
      if (!selectedChat) return;
      setLoadingMessages(true);
      const isDelivery = selectedConversation?.type === 'delivery' || selectedChat.startsWith('delivery-');
      const orderId = isDelivery ? selectedChat.replace('delivery-', '') : null;

      const loadMessages = async () => {
        try {
          let msgs: Message[] = [];
          if (isDelivery && orderId) {
            msgs = await messageService.getDeliveryMessages(orderId);
          } else {
            msgs = await messageService.getMessages(selectedChat);
          }
          setChatMessages(msgs);
          // Marcar como leídos
          if (isDelivery && orderId) {
            await messageService.markDeliveryMessagesAsRead(orderId);
          } else {
            await messageService.markMessagesAsRead(selectedChat);
          }
        } catch (error) {
          console.error("Error al cargar mensajes:", error);
        } finally {
          setLoadingMessages(false);
        }
      };
      loadMessages();

      // Escuchar cambios en tiempo real
      let unsubscribe: any;
      if (isDelivery && orderId) {
        unsubscribe = messageService.listenToDeliveryMessages(orderId, (updatedMessages: Message[]) => {
          setChatMessages(updatedMessages);
          messageService.markDeliveryMessagesAsRead(orderId);
        });
      } else {
        unsubscribe = messageService.listenToMessages(selectedChat, (updatedMessages: Message[]) => {
          setChatMessages(updatedMessages);
          messageService.markMessagesAsRead(selectedChat);
        });
      }
      return () => unsubscribe && unsubscribe();
    }, [selectedChat, conversations]);

    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft size={20} />
              </button>
              
              {selectedConversation && (
                <>
                  <div className="relative">
                    {user && (
                      <>
                        {(() => {
                          const otherParticipant = selectedConversation.participants?.find(
                            p => p.userId !== user.uid
                          ) || selectedConversation.participants?.[0] || { name: 'Repartidor', avatar: '' };
                          
                          return otherParticipant.avatar ? (
                            <img
                              src={otherParticipant.avatar}
                              alt={otherParticipant.name}
                              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-medium shadow-sm">
                              {getInitials(otherParticipant.name)}
                            </div>
                          );
                        })()}
                        
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedConversation.type === 'delivery' ? 'Repartidor' : 
                       (user && selectedConversation.participants?.find(p => p.userId !== user.uid)?.name || 'Repartidor')}
                    </p>
                    <p className="text-xs text-green-600">
                      <span className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                        {selectedConversation.type === 'delivery' ? 'En línea - Chat de entrega' : 'En línea - Chat'}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical size={18} className="text-gray-600" />
              </Button>
            </div>
          </div>
          {selectedConversation && (
            <div className="mt-2">
              {selectedConversation.requestId && (
                <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <p className="text-xs font-medium text-primary">
                    Pedido #{selectedConversation.requestId.substring(0, 6)}
                  </p>
                </div>
              )}
              {selectedConversation.quoteId && (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full ml-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-xs font-medium text-green-700">
                    Cotización #{selectedConversation.quoteId.substring(0, 6)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loadingMessages ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-3">Cargando mensajes...</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full">
              <div className="bg-primary-50 rounded-full p-4 mb-3">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <p className="text-gray-700 font-medium">No hay mensajes aún</p>
              <p className="text-gray-500 text-sm mt-1">¡Envía el primer mensaje para iniciar la conversación!</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {new Date().toLocaleDateString('es-ES', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                </div>
              </div>
              {chatMessages.map((msg, index) => {
                const isMyMessage = user && msg.senderId === user.uid;
                // Formatear la hora para mostrarla
                let timeString = '';
                try {
                  let hours, minutes;
                  
                  if (typeof msg.timestamp === 'number') {
                    // Si es timestamp numérico, extraer hora y minutos
                    const date = new Date(msg.timestamp);
                    hours = date.getHours();
                    minutes = date.getMinutes();
                  } else if (typeof msg.timestamp === 'string') {
                    // Si es un string con formato HH:MM
                    if (msg.timestamp.includes(':') && !msg.timestamp.includes('-')) {
                      [hours, minutes] = msg.timestamp.split(':').map(Number);
                    } else {
                      // Intentar parsear como fecha ISO
                      try {
                        const date = new Date(msg.timestamp);
                        if (!isNaN(date.getTime())) {
                          hours = date.getHours();
                          minutes = date.getMinutes();
                        } else {
                          hours = new Date().getHours();
                          minutes = new Date().getMinutes();
                        }
                      } catch (e) {
                        hours = new Date().getHours();
                        minutes = new Date().getMinutes();
                      }
                    }
                  } else {
                    // Valor por defecto
                    const now = new Date();
                    hours = now.getHours();
                    minutes = now.getMinutes();
                  }
                  
                  // Formatear manualmente para evitar problemas con date-fns
                  timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } catch (e) {
                  console.log('Error al procesar timestamp:', msg.timestamp, e);
                  // Usar hora actual como respaldo
                  const now = new Date();
                  timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                }
                
                // Show date separator if it's a new day
                const showDateSeparator = index > 0 && 
                  new Date(msg.timestamp).toDateString() !== 
                  new Date(chatMessages[index-1].timestamp).toDateString();
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                          {new Date(msg.timestamp).toLocaleDateString('es-ES', {weekday: 'long', month: 'long', day: 'numeric'})}
                        </div>
                      </div>
                    )}
                    <div
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group`}
                    >
                      {!isMyMessage && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white mr-2 self-end mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {selectedConversation && getInitials(getOtherParticipant(selectedConversation).name)}
                        </div>
                      )}
                      <div
                        className={`max-w-xs px-4 py-2.5 ${
                          isMyMessage
                            ? 'bg-primary text-white rounded-t-2xl rounded-bl-2xl rounded-br-md'
                            : 'bg-white text-gray-900 border border-gray-100 rounded-t-2xl rounded-br-2xl rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div
                          className={`text-[10px] mt-1 flex justify-end items-center ${
                            isMyMessage ? 'text-primary-100' : 'text-gray-400'
                          }`}
                        >
                          {timeString}
                          {isMyMessage && (
                            <span className="ml-1">
                              {msg.status === 'read' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="p-3 border-t bg-white sticky bottom-0">
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-full">
            <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!selectedChat || loadingMessages}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!message.trim() || !selectedChat || loadingMessages}
              size="icon"
              variant={message.trim() ? "default" : "ghost"}
              className="rounded-full"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Agregar un console.log para ver cuando cambia el chat seleccionado
  useEffect(() => {
    if (selectedChat) {
      console.log("Chat seleccionado:", selectedChat);
      console.log("Es chat de delivery:", selectedChat.startsWith('delivery-'));
    }
  }, [selectedChat]);

  return (
    <div className="h-full bg-white">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="md:hidden p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-primary">Mensajes</h1>
          </div>
          {/* Removed call and video call icons */}
          <div className="flex items-center gap-2"></div>
        </div>
        
        {/* Main content */}
        <div className="h-[calc(100%-56px)] flex flex-col md:flex-row">
          <div className={`w-full md:w-1/3 md:border-r ${selectedChat ? 'hidden md:block' : 'block'}`}>
            <ChatList />
          </div>
          <div className={`w-full md:w-2/3 ${selectedChat ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
            {selectedChat ? (
              <ChatWindow />
            ) : (
              <div className="text-center p-8 max-w-md mx-auto">
                <div className="bg-primary-50 rounded-full p-5 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">Centro de mensajes</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Selecciona una conversación para ver tus mensajes con repartidores y proveedores.
                </p>
                <Button className="mt-4" variant="outline">
                  <MessageSquare size={16} />
                  Iniciar nueva conversación
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;
