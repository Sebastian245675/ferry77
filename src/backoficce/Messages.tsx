import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, onSnapshot as firestoreOnSnapshot, doc, getDoc } from "firebase/firestore";
import { ref, onValue, push, set, get, child, off } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Search,
  Clock,
  CheckCheck,
  Phone,
  Video,
  Paperclip,
  Smile
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Interfaces para tipar correctamente
interface Cotizacion {
  id: string;
  clientName?: string;
  clientId?: string;
  title?: string;
  createdAt?: any;
  clientAvatar?: string;
  companyId?: string;
  [key: string]: any; // Para permitir otras propiedades
}

interface Chat {
  id: string;
  solicitudId: string;
  clientName: string;
  clientId?: string;
  project: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  clientAvatar: string;
}

interface ChatMessage {
  id: string;
  text?: string;
  message?: string;
  sender: string;
  timestamp: Date | number;
  read: boolean;
}

// Permite abrir un chat desde fuera (ej: botón Contactar Cliente)
let openChatByClientName: ((clientName: string) => void) | null = null;

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Conversaciones reales desde Realtime Database
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar las solicitudes/pedidos y combinar con los chats
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Obtener directamente los chats de Realtime Database
    const chatListRef = ref(rtdb, "deliveryChats");
    
    onValue(chatListRef, async (snapshot) => {
      try {
        if (snapshot.exists()) {
          // Necesitamos obtener los detalles de las cotizaciones para cada chat
          const chatIds = Object.keys(snapshot.val());
          const chats: Chat[] = [];
          
          // Obtener datos de las cotizaciones asociadas a estos chats
          for (const chatId of chatIds) {
            try {
              // Obtener información de la cotización
              const cotizacionDoc = await getDoc(doc(db, "cotizaciones", chatId));
              const cotizacion = cotizacionDoc.exists() ? { id: cotizacionDoc.id, ...cotizacionDoc.data() } as Cotizacion : null;
              
              // Asegurarse de que sea una cotización para esta empresa
              if (cotizacion && cotizacion.companyId === user.uid) {
                // Obtener los mensajes del chat
                const chatData = snapshot.val()[chatId];
                const messages = Object.entries(chatData || {}).map(([key, val]: [string, any]) => ({
                  id: key,
                  ...val
                }));
                
                // Ordenar por timestamp para obtener el último mensaje
                messages.sort((a, b) => {
                  const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                  const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                  return timestampB - timestampA;
                });
                
                const lastMessage = messages[0];
                
                // Agregar este chat a la lista
                chats.push({
                  id: chatId,
                  solicitudId: chatId,
                  clientName: cotizacion.clientName || "Cliente",
                  clientId: cotizacion.clientId,
                  project: cotizacion.title || "Sin título",
                  lastMessage: lastMessage ? lastMessage.message : "No hay mensajes",
                  lastMessageTime: lastMessage && lastMessage.timestamp ? 
                    new Date(typeof lastMessage.timestamp === 'number' ? lastMessage.timestamp : Date.now()) : 
                    new Date(),
                  unreadCount: messages.filter(m => m.sender !== "company" && !m.read).length,
                  clientAvatar: cotizacion.clientAvatar || ""
                });
              }
            } catch (error) {
              console.error(`Error al obtener detalles para el chat ${chatId}:`, error);
            }
          }
          
          // Ordenar los chats por fecha del último mensaje
          chats.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
          console.log("Chats cargados:", chats.length);
          setConversations(chats);
        } else {
          console.log("No se encontraron chats en Realtime Database");
          setConversations([]);
        }
      } catch (error) {
        console.error("Error al procesar los chats:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error al cargar chats desde Realtime Database:", error);
      setLoading(false);
    });
    
    // No se necesita un return ya que la función onValue maneja la limpieza
  }, [user]);

  const filteredConversations = conversations.filter(conv =>
    ((conv.clientName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (conv.project?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (conv.solicitudId?.toLowerCase() || "").includes(searchTerm.toLowerCase()))
  );

  // Permitir abrir chat desde fuera
  useEffect(() => {
    openChatByClientName = (clientName: string) => {
      const chat = conversations.find(c => c.clientName === clientName);
      if (chat) setSelectedChat(chat);
    };
    return () => { openChatByClientName = null; };
    // eslint-disable-next-line
  }, [conversations]);

  // Escuchar mensajes en tiempo real del chat seleccionado desde Realtime Database
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([]);
      return;
    }
    
    setChatMessages([]);
    const chatId = selectedChat.id;
    const chatRef = ref(rtdb, `deliveryChats/${chatId}`);
    
    const handle = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const messages: ChatMessage[] = [];
        snapshot.forEach(child => {
          const data = child.val();
          messages.push({
            id: child.key,
            text: data.message || "",
            message: data.message || "",
            sender: data.sender || "user",
            timestamp: data.timestamp ? 
              (typeof data.timestamp === 'number' ? new Date(data.timestamp) : data.timestamp) : 
              new Date(),
            read: data.read || false
          });
        });
        
        console.log("Mensajes cargados:", messages.length);
        
        // Ordenar mensajes por timestamp (más antiguos primero)
        messages.sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 
                       typeof a.timestamp === 'number' ? a.timestamp : 0;
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 
                       typeof b.timestamp === 'number' ? b.timestamp : 0;
          return timeA - timeB;
        });
        
        setChatMessages(messages);
        
        // Marcar mensajes como leídos si son del cliente
        messages.forEach(msg => {
          if ((msg.sender === 'user' || msg.sender !== 'company') && !msg.read) {
            const msgRef = ref(rtdb, `deliveryChats/${chatId}/${msg.id}`);
            const updatedMsg = {
              message: msg.message || msg.text,
              sender: msg.sender,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp,
              read: true
            };
            set(msgRef, updatedMsg);
          }
        });
      } else {
        console.log("No hay mensajes para este chat");
        setChatMessages([]);
      }
    });
    
    // La función off para limpiar el listener
    return () => off(chatRef, 'value', handle);
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    try {
      const chatId = selectedChat.id;
      const chatRef = ref(rtdb, `deliveryChats/${chatId}`);
      
      console.log("Enviando mensaje a:", `deliveryChats/${chatId}`);
      
      // Crear un nuevo mensaje en Realtime Database
      const newMessageRef = push(chatRef);
      const msg = {
        message: newMessage,
        sender: "company", // company es consistente con el resto de la app
        timestamp: Date.now(),
        read: false
      };
      
      await set(newMessageRef, msg);
      setNewMessage("");
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado exitosamente",
      });
    } catch (e) {
      console.error("Error al enviar mensaje:", e);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mensajes</h1>
          <p className="text-gray-600">Comunícate directamente con tus clientes</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {filteredConversations.filter(c => c.unreadCount > 0).length} no leídos
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversations List */}
        <Card className="glass-effect lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversaciones</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conversaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center text-gray-400 py-8">Cargando conversaciones...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No hay conversaciones.</div>
              ) : filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b cursor-pointer hover:bg-blue-50/50 transition-colors ${
                    selectedChat?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => setSelectedChat(conversation)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.clientAvatar} />
                        <AvatarFallback>{conversation.clientName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      {/* Estado en línea si lo tienes en tu modelo */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.clientName}
                        </h3>
                        <div className="text-xs text-gray-500">Pedido: {conversation.solicitudId || 'N/A'}</div>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-primary text-white">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1 truncate">
                        {conversation.project || ''}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        Pedido: {conversation.solicitudId || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage || ''}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {conversation.lastMessageTime ? new Date(conversation.lastMessageTime.seconds ? conversation.lastMessageTime.seconds * 1000 : conversation.lastMessageTime).toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="glass-effect lg:col-span-2">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedChat.clientAvatar} />
                        <AvatarFallback>{selectedChat.clientName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedChat.clientName}</h3>
                      <p className="text-sm text-gray-600">{selectedChat.project || ''}</p>
                      <p className="text-xs text-gray-400">Pedido: {selectedChat.solicitudId || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Mensajes reales */}
              <ScrollArea className="h-[calc(100vh-28rem)] p-4">
                <div className="space-y-4">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((message: any, idx: number) => (
                      <div
                        key={message.id || idx}
                        className={`flex ${message.sender === 'company' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'company'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.text || message.message}</p>
                          <div className={`flex items-center justify-end mt-1 space-x-1 ${
                            message.sender === 'company' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            <span className="text-xs">
                              {message.timestamp instanceof Date 
                                ? message.timestamp.toLocaleTimeString() 
                                : typeof message.timestamp === 'number'
                                  ? new Date(message.timestamp).toLocaleTimeString()
                                  : ''}
                            </span>
                            {message.sender === 'company' && (
                              <CheckCheck className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400">No hay mensajes.</div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Escribe tu mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="company-card text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecciona una conversación
                </h3>
                <p className="text-gray-600">
                  Elige una conversación de la lista para comenzar a chatear
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};


// Permite importar y usar openChatByClientName desde otros componentes
export { openChatByClientName };
export default Messages;