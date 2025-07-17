import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, ArrowLeft, MoreVertical, Phone, Video, Search } from 'lucide-react';
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

  const sendMessage = async () => {
    if (message.trim() && selectedChat) {
      try {
        await messageService.sendMessage(selectedChat, message.trim());
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

  // Filtrar conversaciones basadas en la búsqueda
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    
    const otherParticipant = user 
      ? conv.participants.find(p => p.userId !== user.uid)
      : conv.participants[0];
    
    const searchTerms = searchQuery.toLowerCase().trim().split(' ');
    const name = otherParticipant?.name?.toLowerCase() || '';
    
    return searchTerms.every(term => name.includes(term));
  });

  // Obtener información del otro participante
  const getOtherParticipant = (conversation: Conversation) => {
    if (!user) return conversation.participants[0];
    return conversation.participants.find(p => p.userId !== user.uid) || conversation.participants[0];
  };

  const ChatList = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Mensajes</h2>
        <p className="text-sm text-gray-600">Chatea con empresas proveedoras</p>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar conversaciones"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Cargando conversaciones...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery
              ? "No se encontraron conversaciones"
              : "No tienes conversaciones aún"}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherParticipant = getOtherParticipant(conv);
            
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedChat(conv.id)}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChat === conv.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {otherParticipant.avatar ? (
                      <img
                        src={otherParticipant.avatar}
                        alt={otherParticipant.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                        {getInitials(otherParticipant.name)}
                      </div>
                    )}
                    {otherParticipant.role === 'seller' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {otherParticipant.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{conv.lastActivity ? formatTime(conv.lastActivity) : ""}</span>
                        {user && conv.unreadCount && conv.unreadCount[user.uid] > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount[user.uid]}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mb-1 truncate">
                      {conv.requestId ? "Solicitud" : conv.quoteId ? "Cotización" : "Conversación"}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
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
    
    // Cargar y escuchar mensajes de la conversación seleccionada
    useEffect(() => {
      if (!selectedChat) return;
      
      setLoadingMessages(true);
      
      // Cargar mensajes iniciales
      const loadMessages = async () => {
        try {
          const msgs = await messageService.getMessages(selectedChat);
          setChatMessages(msgs);
          
          // Marcar como leídos
          await messageService.markMessagesAsRead(selectedChat);
        } catch (error) {
          console.error("Error al cargar mensajes:", error);
        } finally {
          setLoadingMessages(false);
        }
      };
      
      loadMessages();
      
      // Escuchar cambios en tiempo real
      const unsubscribe = messageService.listenToMessages(selectedChat, (updatedMessages) => {
        setChatMessages(updatedMessages);
        messageService.markMessagesAsRead(selectedChat);
      });
      
      return () => unsubscribe();
    }, [selectedChat]);

    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft size={20} />
              </button>
              
              {selectedConversation && (
                <>
                  <div className="relative">
                    {user && (
                      <>
                        {(() => {
                          const otherParticipant = selectedConversation.participants.find(
                            p => p.userId !== user.uid
                          ) || selectedConversation.participants[0];
                          
                          return otherParticipant.avatar ? (
                            <img
                              src={otherParticipant.avatar}
                              alt={otherParticipant.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
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
                      {user && selectedConversation.participants.find(p => p.userId !== user.uid)?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      En línea
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Phone size={18} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Video size={18} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
          
          {selectedConversation && (
            <div className="mt-2">
              {selectedConversation.requestId && (
                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                  Solicitud
                </p>
              )}
              {selectedConversation.quoteId && (
                <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block ml-1">
                  Cotización
                </p>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">Cargando mensajes...</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-500">No hay mensajes aún. ¡Envía el primero!</p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isMyMessage = user && msg.senderId === user.uid;
              const messageTime = typeof msg.timestamp === 'number' 
                ? new Date(msg.timestamp) 
                : new Date(Date.parse(msg.timestamp.toString()));
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      isMyMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMyMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {messageTime ? format(messageTime, 'HH:mm') : ''}
                      {isMyMessage && (
                        <span className="ml-1">
                          {msg.status === 'read' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!selectedChat || loadingMessages}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!message.trim() || !selectedChat || loadingMessages}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 md:relative md:inset-auto md:bg-transparent">
      <div className="h-full md:h-96 md:max-h-screen flex">
        {/* Chat List */}
        <div className={`w-full md:w-80 border-r ${selectedChat ? 'hidden md:block' : 'block'}`}>
          <ChatList />
        </div>

        {/* Chat Window */}
        {selectedChat && (
          <div className="flex-1">
            <ChatWindow />
          </div>
        )}

        {/* Empty State */}
        {!selectedChat && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;
