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
  Smile,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Función para formatear fechas
const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Si es hoy, mostrar la hora
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Si es ayer
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && 
      date.getMonth() === yesterday.getMonth() && 
      date.getFullYear() === yesterday.getFullYear()) {
    return "Ayer";
  }
  
  // Si es esta semana (últimos 7 días)
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  }
  
  // Formato corto de fecha
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

// Función para formatear timestamps
const formatTimestamp = (timestamp: Date | number): string => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
  content?: string; // Para la nueva estructura
  sender?: string;
  senderId?: string; // ID del remitente
  recipientId?: string; // ID del destinatario
  senderName?: string; // Nombre del remitente
  timestamp: Date | number;
  read: boolean;
  status?: string; // Estado del mensaje
}

// Permite abrir un chat desde fuera (ej: botón Contactar Cliente)
let openChatByClientName: ((clientName: string) => void) | null = null;

const BackofficeMessages = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Modo móvil: true cuando se muestra la conversación, false cuando se muestra la lista
  const [showConversation, setShowConversation] = useState(false);
  // Modo de depuración desactivado por defecto
  const [debugMode, setDebugMode] = useState(false);

  // Conversaciones reales desde Realtime Database
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar las solicitudes/pedidos y combinar con los chats
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    console.log("🔍 Buscando conversaciones para la empresa:", user.uid);
    
    // Función para explorar toda la estructura de Firebase en busca de chats
    const exploreFirebaseForChats = async () => {
      try {
        // 1. Primero obtener estructura de la base de datos para diagnóstico
        console.log("📊 Explorando estructura de Firebase para encontrar chats...");
        const rootRef = ref(rtdb);
        const rootSnapshot = await get(rootRef);
        
        if (rootSnapshot.exists()) {
          console.log("📚 Nodos principales encontrados:", Object.keys(rootSnapshot.val()));
          
          // 2. Buscar posibles ubicaciones de chats
          const potentialChatLocations = [
            "deliveryChats",
            "chats",
            "messages",
            "conversations",
            "clientChats",
            "companyChats",
            "userConversations"
          ];
          
          // 3. Crear un array para almacenar todos los chats encontrados
          const allChats: Chat[] = [];
          
          // 4. Explorar cada ubicación potencial
          for (const location of potentialChatLocations) {
            if (rootSnapshot.val()[location]) {
              console.log(`🔍 Explorando ubicación potencial: ${location}`);
              const chatLocation = rootSnapshot.val()[location];
              
              // 5. Si es un objeto, procesar sus claves como posibles IDs de chat
              if (typeof chatLocation === 'object') {
                const chatIds = Object.keys(chatLocation);
                console.log(`📋 Encontrados ${chatIds.length} posibles chats en ${location}`);
                
                // 6. Para cada ID, intentar obtener la cotización correspondiente
                for (const chatId of chatIds) {
                  try {
                    // Obtener datos de la cotización
                    const cotizacionRef = doc(db, "cotizaciones", chatId);
                    const cotizacionSnapshot = await getDoc(cotizacionRef);
                    
                    if (cotizacionSnapshot.exists()) {
                      const cotizacion = { 
                        id: cotizacionSnapshot.id, 
                        ...cotizacionSnapshot.data() 
                      } as Cotizacion;
                      
                      // Verificar si esta cotización pertenece a esta empresa
                      if (cotizacion.companyId === user.uid) {
                        console.log(`✅ Chat encontrado para esta empresa: ${chatId}`);
                        
                        // 7. Obtener mensajes para determinar último mensaje
                        const chatData = chatLocation[chatId];
                        let messages: any[] = [];
                        
                        if (typeof chatData === 'object') {
                          messages = Object.entries(chatData).map(([key, val]: [string, any]) => ({
                            id: key,
                            ...val
                          }));
                        }
                        
                        // 8. Ordenar mensajes para obtener el último
                        messages.sort((a, b) => {
                          const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                          const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                          return timestampB - timestampA;
                        });
                        
                        const lastMessage = messages[0];
                        
                        // 9. Crear objeto de chat
                        const chat: Chat = {
                          id: chatId,
                          solicitudId: chatId,
                          clientName: cotizacion.clientName || "Cliente",
                          clientId: cotizacion.clientId || "",
                          project: cotizacion.title || "Sin título",
                          lastMessage: lastMessage ? (lastMessage.content || lastMessage.message || lastMessage.text || "Sin mensaje") : "No hay mensajes",
                          lastMessageTime: lastMessage && lastMessage.timestamp ? 
                            new Date(typeof lastMessage.timestamp === 'number' ? lastMessage.timestamp : Date.now()) : 
                            new Date(),
                          unreadCount: messages.filter(m => 
                            (m.sender !== "company" && !m.read) || 
                            (m.senderId && m.senderId !== user.uid && !m.read)
                          ).length,
                          clientAvatar: cotizacion.clientAvatar || ""
                        };
                        
                        allChats.push(chat);
                      }
                    } else {
                      // No existe como cotización, pero podría ser un chat directo
                      // Verificar si contiene mensajes donde la empresa es remitente o destinatario
                      const chatData = chatLocation[chatId];
                      
                      if (typeof chatData === 'object') {
                        const messages = Object.entries(chatData).map(([key, val]: [string, any]) => ({
                          id: key,
                          ...val
                        }));
                        
                        // Verificar si algún mensaje involucra a esta empresa
                        const relevantMessages = messages.filter(msg => 
                          msg.senderId === user.uid || msg.recipientId === user.uid
                        );
                        
                        if (relevantMessages.length > 0) {
                          // Encontrar el otro participante (cliente)
                          const otherParticipantId = relevantMessages[0].senderId === user.uid ? 
                            relevantMessages[0].recipientId : relevantMessages[0].senderId;
                          
                          // Ordenar mensajes para obtener el último
                          messages.sort((a, b) => {
                            const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                            const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                            return timestampB - timestampA;
                          });
                          
                          const lastMessage = messages[0];
                          
                          // Este es un chat directo relevante
                          console.log(`✅ Chat directo encontrado: ${chatId} con cliente ${otherParticipantId}`);
                          
                          const chat: Chat = {
                            id: chatId,
                            solicitudId: chatId,
                            clientName: relevantMessages[0].senderName || "Cliente",
                            clientId: otherParticipantId,
                            project: "Chat directo",
                            lastMessage: lastMessage ? (lastMessage.content || lastMessage.message || lastMessage.text || "Sin mensaje") : "No hay mensajes",
                            lastMessageTime: lastMessage && lastMessage.timestamp ? 
                              new Date(typeof lastMessage.timestamp === 'number' ? lastMessage.timestamp : Date.now()) : 
                              new Date(),
                            unreadCount: messages.filter(m => 
                              m.senderId !== user.uid && !m.read
                            ).length,
                            clientAvatar: ""
                          };
                          
                          allChats.push(chat);
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`Error al procesar chat ${chatId}:`, error);
                  }
                }
              }
            }
          }
          
          // 10. Si no se encontraron chats, buscar chats directos con clientId/companyId
          if (allChats.length === 0) {
            console.log("🔍 Buscando chats directos cliente-empresa...");
            
            // Buscar si hay alguna estructura que contenga el ID de la empresa como clave
            for (const mainNode of Object.keys(rootSnapshot.val())) {
              const mainNodeData = rootSnapshot.val()[mainNode];
              
              if (typeof mainNodeData === 'object' && mainNodeData[user.uid]) {
                console.log(`🔍 Encontrado nodo con ID de empresa: ${mainNode}/${user.uid}`);
                
                // Explorar las conversaciones dentro de la carpeta de la empresa
                const companyChats = mainNodeData[user.uid];
                
                if (typeof companyChats === 'object') {
                  // Cada clave podría ser un clientId
                  for (const potentialClientId of Object.keys(companyChats)) {
                    const chatData = companyChats[potentialClientId];
                    
                    if (typeof chatData === 'object') {
                      // Extraer mensajes
                      const messages = Object.entries(chatData).map(([key, val]: [string, any]) => ({
                        id: key,
                        ...val
                      }));
                      
                      if (messages.length > 0) {
                        // Ordenar mensajes para obtener el último
                        messages.sort((a, b) => {
                          const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                          const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                          return timestampB - timestampA;
                        });
                        
                        const lastMessage = messages[0];
                        
                        console.log(`✅ Chat directo encontrado en: ${mainNode}/${user.uid}/${potentialClientId}`);
                        
                        // Crear objeto de chat
                        const chatId = `${mainNode}_${user.uid}_${potentialClientId}`;
                        const chat: Chat = {
                          id: chatId,
                          solicitudId: chatId,
                          clientName: messages.find(m => m.senderName && m.senderId === potentialClientId)?.senderName || "Cliente",
                          clientId: potentialClientId,
                          project: "Chat directo",
                          lastMessage: lastMessage ? (lastMessage.content || lastMessage.message || lastMessage.text || "Sin mensaje") : "No hay mensajes",
                          lastMessageTime: lastMessage && lastMessage.timestamp ? 
                            new Date(typeof lastMessage.timestamp === 'number' ? lastMessage.timestamp : Date.now()) : 
                            new Date(),
                          unreadCount: messages.filter(m => 
                            m.senderId !== user.uid && !m.read
                          ).length,
                          clientAvatar: ""
                        };
                        
                        // Añadir datos adicionales para localizar los mensajes después
                        // @ts-ignore - Añadimos propiedad personalizada
                        chat.customPath = `${mainNode}/${user.uid}/${potentialClientId}`;
                        
                        allChats.push(chat);
                      }
                    }
                  }
                }
              }
            }
          }
          
          // 11. Deduplicate chats by ID
          const uniqueChats = allChats.filter((chat, index, self) => 
            index === self.findIndex((c) => c.id === chat.id)
          );
          
          // 12. Ordenar por fecha del último mensaje
          uniqueChats.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
          
          console.log(`✅ Total chats encontrados: ${uniqueChats.length}`);
          setConversations(uniqueChats);
        } else {
          console.log("⚠️ No se encontraron datos en Firebase");
          setConversations([]);
        }
      } catch (error) {
        console.error("❌ Error explorando Firebase:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Ejecutar la exploración completa
    exploreFirebaseForChats();
    
  }, [user]);

  const filteredConversations = conversations.filter(conv =>
    ((conv.clientName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (conv.project?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (conv.solicitudId?.toLowerCase() || "").includes(searchTerm.toLowerCase()))
  );

  // Permitir abrir chat desde fuera por cliente o por clientId
  useEffect(() => {
    // Para abrir chat por nombre de cliente
    openChatByClientName = (clientName: string) => {
      const chat = conversations.find(c => c.clientName === clientName);
      if (chat) {
        setSelectedChat(chat);
        setShowConversation(true); // Mostrar la conversación en modo móvil
      }
    };

    // Buscar chat por clientId en URL cuando se cargue la página
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlClientId = urlSearchParams.get("clientId");
    
    if (urlClientId && conversations.length > 0) {
      console.log("🔍 Buscando chat para clientId:", urlClientId);
      
      // Buscar el chat que corresponde a este clientId
      const clientChat = conversations.find(c => c.clientId === urlClientId);
      
      if (clientChat) {
        console.log("✅ Chat encontrado para clientId:", urlClientId);
        setSelectedChat(clientChat);
        setShowConversation(true); // Mostrar la conversación en modo móvil
      } else {
        console.log("⚠️ No se encontró chat para clientId:", urlClientId);
        
        // Intentar obtener información del cliente desde Firestore
        const fetchClientInfo = async () => {
          try {
            // Intentar buscar el usuario en la colección de usuarios
            const userDoc = await getDoc(doc(db, "usuarios", urlClientId));
            let clientName = "Cliente";
            
            if (userDoc.exists()) {
              clientName = userDoc.data().name || userDoc.data().displayName || "Cliente";
              console.log("✅ Información de cliente encontrada:", clientName);
            }
            
            // Crear un nuevo chat temporal para este cliente
            const newChat = {
              id: `direct_${urlClientId}_${user.uid}_${Date.now()}`,
              solicitudId: `direct_${Date.now()}`,
              clientName: clientName,
              clientId: urlClientId,
              project: "Chat directo",
              lastMessage: "Sin mensajes previos",
              lastMessageTime: new Date(),
              unreadCount: 0,
              clientAvatar: "",
              // Ruta personalizada para mensajes
              customPath: `directMessages/${urlClientId}_${user.uid}`
            };
            
            // Añadir este nuevo chat a la lista
            setConversations(prevConversations => [...prevConversations, newChat]);
            
            // Seleccionar este chat
            setSelectedChat(newChat);
            setShowConversation(true);
            
            console.log("✅ Nuevo chat creado para clientId:", urlClientId);
            
          } catch (error) {
            console.error("❌ Error creando chat para cliente:", error);
          }
        };
        
        fetchClientInfo();
      }
    }
    
    return () => { openChatByClientName = null; };
    // eslint-disable-next-line
  }, [conversations]);

    // Escuchar mensajes en tiempo real del chat seleccionado desde Realtime Database
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([]);
      return;
    }
    
    console.log("🎯 Chat seleccionado automáticamente:", JSON.stringify(selectedChat));
        // Limpiamos los mensajes anteriores para cargar los nuevos
    setChatMessages([]);
    const chatId = selectedChat.id;
    const clientId = selectedChat.clientId;
    const companyId = user?.uid;
    
    console.log("� INICIANDO BÚSQUEDA DE MENSAJES");
    console.log("📋 Datos de referencia:");
    console.log("🆔 Chat ID:", chatId);
    console.log("👤 Cliente ID:", clientId);
    console.log("🏢 Empresa ID:", companyId);
    
    // Estructura para almacenar los listeners activos y facilitar la limpieza
    const cleanupHandlers: any[] = [];
    
    // ENFOQUE #1: Revisar rutas directas cliente-empresa (más probables)
    // Estas son las rutas más comunes para mensajes directos entre clientes y empresas
    const directPaths = [
      `clientMessages/${clientId}/${companyId}`,
      `companyMessages/${companyId}/${clientId}`,
      `userMessages/${clientId}/${companyId}`,
      `userMessages/${companyId}/${clientId}`,
      `directMessages/${clientId}_${companyId}`,
      `directMessages/${companyId}_${clientId}`,
      `chats/client_${clientId}_company_${companyId}`,
      `chats/company_${companyId}_client_${clientId}`,
    ];
    
    console.log("� Revisando rutas directas cliente-empresa:", directPaths);
    
    directPaths.forEach(path => {
      const ref1 = ref(rtdb, path);
      const handler = onValue(ref1, snapshot => {
        if (snapshot.exists()) {
          console.log(`✅ ENCONTRADO! Mensajes en ruta directa: ${path}`);
          // Procesar los mensajes inmediatamente cuando se encuentren
          processMessages(snapshot);
        }
      });
      cleanupHandlers.push({ref: ref1, handler});
    });
    
    // ENFOQUE #2: Rutas genéricas de mensajes que pueden contener IDs
    // Estas son rutas generales que podrían contener mensajes basados en IDs
    const pathsWithIds = [
      `deliveryChats/${chatId}`,
      `messages/${chatId}`,
      `chats/${chatId}`,
      `${chatId}`,
      `conversations/${chatId}/messages`
    ];
    
    console.log("� Revisando rutas basadas en ID:", pathsWithIds);
    
    pathsWithIds.forEach(path => {
      const ref1 = ref(rtdb, path);
      const handler = onValue(ref1, snapshot => {
        if (snapshot.exists()) {
          console.log(`✅ ENCONTRADO! Mensajes en ruta con ID: ${path}`);
          // Procesar los mensajes inmediatamente cuando se encuentren
          processMessages(snapshot);
        }
      });
      cleanupHandlers.push({ref: ref1, handler});
    });
    
    // ENFOQUE #3: Explorar estructura completa para depuración
    console.log("🌐 Explorando estructura completa de Firebase para diagnóstico");
    
    get(ref(rtdb)).then(snapshot => {
      if (snapshot.exists()) {
        console.log("📊 Nodos principales en Firebase:", Object.keys(snapshot.val()));
        
        // Buscar rutas que contengan directamente el ID del cliente o empresa
        Object.keys(snapshot.val()).forEach(mainNode => {
          if (typeof snapshot.val()[mainNode] === 'object') {
            // Si el nodo principal contiene el ID del cliente o empresa como subclave
            const mainNodeKeys = Object.keys(snapshot.val()[mainNode]);
            
            if (mainNodeKeys.includes(clientId) || mainNodeKeys.includes(companyId)) {
              console.log(`� Nodo principal con cliente o empresa: ${mainNode}`);
              
              // Si contiene ID del cliente, explorar subclave
              if (mainNodeKeys.includes(clientId)) {
                const clientSubnode = `${mainNode}/${clientId}`;
                console.log(`  👤 Explorando subnodo de cliente: ${clientSubnode}`);
                
                get(ref(rtdb, clientSubnode)).then(clientSnapshot => {
                  if (clientSnapshot.exists() && typeof clientSnapshot.val() === 'object') {
                    // Ver si dentro hay una clave con el ID de la empresa
                    const clientSubKeys = Object.keys(clientSnapshot.val());
                    
                    if (clientSubKeys.includes(companyId)) {
                      const messagePath = `${mainNode}/${clientId}/${companyId}`;
                      console.log(`  ✅ Ruta potencial de mensajes encontrada: ${messagePath}`);
                      
                      const directRef = ref(rtdb, messagePath);
                      const handler = onValue(directRef, msgsSnapshot => {
                        if (msgsSnapshot.exists()) {
                          console.log(`  🎯 ÉXITO! Mensajes encontrados en: ${messagePath}`);
                          processMessages(msgsSnapshot);
                        }
                      });
                      cleanupHandlers.push({ref: directRef, handler});
                    }
                  }
                });
              }
              
              // Si contiene ID de la empresa, explorar subclave
              if (mainNodeKeys.includes(companyId)) {
                const companySubnode = `${mainNode}/${companyId}`;
                console.log(`  🏢 Explorando subnodo de empresa: ${companySubnode}`);
                
                get(ref(rtdb, companySubnode)).then(companySnapshot => {
                  if (companySnapshot.exists() && typeof companySnapshot.val() === 'object') {
                    // Ver si dentro hay una clave con el ID del cliente
                    const companySubKeys = Object.keys(companySnapshot.val());
                    
                    if (companySubKeys.includes(clientId)) {
                      const messagePath = `${mainNode}/${companyId}/${clientId}`;
                      console.log(`  ✅ Ruta potencial de mensajes encontrada: ${messagePath}`);
                      
                      const directRef = ref(rtdb, messagePath);
                      const handler = onValue(directRef, msgsSnapshot => {
                        if (msgsSnapshot.exists()) {
                          console.log(`  🎯 ÉXITO! Mensajes encontrados en: ${messagePath}`);
                          processMessages(msgsSnapshot);
                        }
                      });
                      cleanupHandlers.push({ref: directRef, handler});
                    }
                  }
                });
              }
            }
          }
        });
      }
    });
    
    
    function processMessages(snapshot: any) {
      // Procesamos los mensajes cada vez que se reciben para asegurar que todos se muestren
      console.log("� Procesando mensajes recibidos");
      
      const messages: ChatMessage[] = [];
      const rawData = snapshot.val();
      
      console.log("📥 DATOS ENCONTRADOS:");
      console.log(rawData);
      
      // CASO 1: El snapshot contiene mensajes como clave-valor directamente
      if (typeof rawData === 'object' && !snapshot.forEach) {
        console.log("� Procesando datos como objeto plano");
        
        // Verificar si es un objeto que contiene mensajes como claves
        const keys = Object.keys(rawData);
        
        // Si hay al menos una clave que parece un ID (larga, alfanumérica)
        const containsMessageIds = keys.some(k => k.length > 10 && /^[-a-zA-Z0-9_]+$/.test(k));
        
        if (containsMessageIds) {
          console.log("💬 Detectados múltiples mensajes con IDs como claves");
          // Es un objeto que contiene mensajes como claves
          keys.forEach(key => {
            const msgData = rawData[key];
            if (typeof msgData === 'object' && msgData !== null) {
              extractMessageData(key, msgData, messages);
            }
          });
        } else {
          // Podría ser un mensaje único o un objeto con propiedades directas de mensaje
          if (rawData.content || rawData.message || rawData.text || 
              rawData.senderId || rawData.recipientId) {
            console.log("💬 Detectado mensaje único");
            extractMessageData('single', rawData, messages);
          } else {
            console.log("🔍 Explorando objeto para encontrar mensajes anidados");
            // Explorar todas las propiedades en busca de objetos que parezcan mensajes
            exploreObjectForMessages(rawData, '', messages);
          }
        }
      } 
      // CASO 2: El snapshot tiene método forEach (comportamiento normal)
      else if (snapshot.forEach) {
        console.log("� Procesando colección de mensajes con forEach");
        snapshot.forEach((child: any) => {
          const msgData = child.val();
          extractMessageData(child.key, msgData, messages);
        });
      }
      
      console.log("� Total mensajes extraídos:", messages.length);
      
      if (messages.length === 0) {
        console.log("⚠️ No se pudieron extraer mensajes válidos de los datos");
        return;
      }
      
      // Log de mensajes por tipo
      const clientMessages = messages.filter(m => 
        (m.senderId && m.senderId !== user?.uid) || 
        ['user', 'client', 'customer'].includes(m.sender) || 
        (selectedChat?.clientId && m.senderId === selectedChat.clientId)
      );
      
      const companyMessages = messages.filter(m => 
        (m.senderId && m.senderId === user?.uid) || 
        ['company', 'business', 'admin'].includes(m.sender) ||
        (!m.senderId && selectedChat?.clientId && m.sender !== selectedChat.clientId)
      );
      
      console.log("👤 Mensajes del cliente:", clientMessages.length);
      console.log("🏢 Mensajes de la empresa:", companyMessages.length);
      
      // Ordenar mensajes por timestamp
      messages.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 
                     typeof a.timestamp === 'number' ? a.timestamp : 0;
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 
                     typeof b.timestamp === 'number' ? b.timestamp : 0;
        return timeA - timeB;
      });
      
      // Asegurarnos de que los mensajes sean visibles tanto del cliente como de la empresa
      // y evitar duplicados verificando por ID
      console.log(`✅ Cargando ${messages.length} mensajes en el chat`);
      
      // Evitar duplicados al actualizar los mensajes
      setChatMessages(prevMessages => {
        // Crear un mapa de los mensajes existentes por ID
        const existingMessagesMap = new Map(prevMessages.map(msg => [msg.id, msg]));
        
        // Añadir nuevos mensajes sin duplicar
        messages.forEach(newMsg => {
          if (newMsg.id && !existingMessagesMap.has(newMsg.id)) {
            existingMessagesMap.set(newMsg.id, newMsg);
          }
        });
        
        // Convertir mapa a array y ordenar por timestamp
        const mergedMessages = Array.from(existingMessagesMap.values())
          .sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 
                        typeof a.timestamp === 'number' ? a.timestamp : 0;
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 
                        typeof b.timestamp === 'number' ? b.timestamp : 0;
            return timeA - timeB;
          });
          
        console.log(`✅ Total mensajes después de deduplicación: ${mergedMessages.length}`);
        return mergedMessages;
      });
      
      // Scroll al final
      setTimeout(() => {
        const scrollArea = document.getElementById('message-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }, 100);
    }
    
    // Función recursiva para explorar un objeto en busca de mensajes
    function exploreObjectForMessages(obj: any, path: string, messages: ChatMessage[]) {
      if (!obj || typeof obj !== 'object') return;
      
      // Comprobar si este objeto parece un mensaje
      if (obj.content || obj.message || obj.text || 
          (obj.senderId && obj.recipientId)) {
        console.log(`💬 Mensaje encontrado en ruta: ${path}`);
        extractMessageData(path.split('/').pop() || 'nested', obj, messages);
        // No retornamos aquí para seguir explorando el objeto en caso de que haya más mensajes
      }
      
      // Explorar todas las propiedades
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const newPath = path ? `${path}/${key}` : key;
          exploreObjectForMessages(obj[key], newPath, messages);
        }
      });
    }
    
    function extractMessageData(key: string, data: any, messages: ChatMessage[]) {
      console.log(`� Extrayendo datos de mensaje con clave: ${key}`, data);
      
      // Verificar si es un mensaje válido
      if (!data || typeof data !== 'object') {
        console.log("⚠️ Datos inválidos para un mensaje");
        return;
      }
      
      // Extraer contenido del mensaje con alta flexibilidad
      const content = 
        data.content || 
        data.message || 
        data.text || 
        (typeof data.body === 'string' ? data.body : '') ||
        (typeof data.data === 'string' ? data.data : '') ||
        '';
      
      // Si no hay contenido evidente, buscar cualquier propiedad de texto
      let extractedContent = content;
      if (!extractedContent) {
        for (const prop in data) {
          if (typeof data[prop] === 'string' && 
              !['id', 'uid', 'key', 'ref', 'path', 'type', 'status'].includes(prop)) {
            extractedContent = data[prop];
            console.log(`🔍 Contenido extraído de propiedad '${prop}': ${extractedContent}`);
            break;
          }
        }
      }
      
      // Determinar remitente y destinatario con alta flexibilidad
      const senderId = 
        data.senderId || 
        data.fromId || 
        data.userId || 
        data.authorId || 
        '';
        
      const recipientId = 
        data.recipientId || 
        data.toId || 
        data.receiverId || 
        data.destinationId || 
        '';
        
      const senderName = 
        data.senderName || 
        data.fromName || 
        data.userName || 
        data.author || 
        '';
      
      // Determinar tipo de remitente (usuario o empresa)
      const sender = 
        data.sender || 
        (senderId === user?.uid ? 'company' : 'user') ||
        data.from || 
        (data.fromId === user?.uid ? 'company' : 'user');
      
      // Extraer timestamp con máxima flexibilidad
      let timestamp: Date | number = new Date();
      if (data.timestamp) {
        if (typeof data.timestamp === 'number') {
          timestamp = new Date(data.timestamp);
        } else if (typeof data.timestamp === 'object' && data.timestamp.seconds) {
          timestamp = new Date(data.timestamp.seconds * 1000);
        } else {
          timestamp = data.timestamp;
        }
      } else if (data.time) {
        timestamp = new Date(typeof data.time === 'number' ? data.time : Date.parse(data.time));
      } else if (data.date) {
        timestamp = new Date(typeof data.date === 'number' ? data.date : Date.parse(data.date));
      } else if (data.createdAt) {
        timestamp = new Date(typeof data.createdAt === 'number' ? data.createdAt : Date.parse(data.createdAt));
      }
      
      // Si no hay contenido ni remitente, no es un mensaje válido
      if (!extractedContent && !senderId && !sender) {
        console.log("⚠️ No se pudo extraer información válida de mensaje");
        return;
      }
      
      // Crear objeto de mensaje con ID único
      const message: ChatMessage = {
        id: key && key !== 'nested' && key !== 'single' ? key : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        content: extractedContent,
        text: extractedContent,
        message: extractedContent,
        sender: sender,
        senderId: senderId,
        recipientId: recipientId,
        senderName: senderName,
        timestamp: timestamp,
        read: data.read === undefined ? false : data.read,
        status: data.status || 'sent'
      };
      
      console.log(`✅ Mensaje procesado:`, {
        id: message.id,
        texto: message.content,
        remitente: message.sender,
        remitenteId: message.senderId,
        destinatarioId: message.recipientId,
        timestamp: message.timestamp
      });
      
      messages.push(message);
    }
    
    // Limpieza de listeners al desmontar
    return () => {
      console.log("🧹 Limpiando listeners de mensajes");
      cleanupHandlers.forEach(({ref: pathRef, handler}) => {
        off(pathRef, 'value', handler);
      });
    };
  }, [selectedChat, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Verifica tu conexión e inténtalo de nuevo.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("📤 Iniciando envío de mensaje");
    console.log("📊 Detalles del chat seleccionado:", JSON.stringify(selectedChat));
    
    try {
      // Investigar estructura para determinar la mejor forma de enviar mensajes
      console.log("🔍 Investigando la estructura de mensajes...");
      const rootRef = ref(rtdb);
      const rootSnapshot = await get(rootRef);
      
      if (rootSnapshot.exists()) {
        const allNodes = Object.keys(rootSnapshot.val());
        console.log("📊 Nodos disponibles:", allNodes);
        
        // Identificar estructuras relacionadas con mensajes
        const messageNodes = allNodes.filter(node => 
          node.includes('message') || node.includes('chat') || 
          node.includes('direct') || node.includes('communication'));
          
        console.log("� Nodos relacionados con mensajes:", messageNodes);
        
        // Verificar rutas directas cliente-empresa
        const clientId = selectedChat.clientId;
        const companyId = user.uid;
        
        console.log("👤 Cliente ID:", clientId);
        console.log("🏢 Empresa ID:", companyId);
        
        // Probar rutas específicas relacionadas con clientes y empresas
        for (const baseNode of messageNodes) {
          const baseRef = ref(rtdb, baseNode);
          const baseSnapshot = await get(baseRef);
          
          if (baseSnapshot.exists() && typeof baseSnapshot.val() === 'object') {
            const baseKeys = Object.keys(baseSnapshot.val());
            
            // Si contiene el ID del cliente o de la empresa
            if (baseKeys.includes(clientId) || baseKeys.includes(companyId)) {
              console.log(`🎯 Encontrado nodo potencial para mensajes: ${baseNode}`);
              
              // Si contiene al cliente, buscar ruta cliente -> empresa
              if (baseKeys.includes(clientId)) {
                const clientRef = ref(rtdb, `${baseNode}/${clientId}`);
                const clientSnapshot = await get(clientRef);
                
                if (clientSnapshot.exists() && typeof clientSnapshot.val() === 'object') {
                  const clientSubKeys = Object.keys(clientSnapshot.val());
                  
                  // Si dentro de la estructura del cliente existe la empresa
                  if (clientSubKeys.includes(companyId)) {
                    console.log(`✅ Ruta óptima encontrada: ${baseNode}/${clientId}/${companyId}`);
                    await sendMessageToPath(`${baseNode}/${clientId}/${companyId}`);
                    return;
                  }
                }
              }
              
              // Si contiene a la empresa, buscar ruta empresa -> cliente
              if (baseKeys.includes(companyId)) {
                const companyRef = ref(rtdb, `${baseNode}/${companyId}`);
                const companySnapshot = await get(companyRef);
                
                if (companySnapshot.exists() && typeof companySnapshot.val() === 'object') {
                  const companySubKeys = Object.keys(companySnapshot.val());
                  
                  // Si dentro de la estructura de la empresa existe el cliente
                  if (companySubKeys.includes(clientId)) {
                    console.log(`✅ Ruta óptima encontrada: ${baseNode}/${companyId}/${clientId}`);
                    await sendMessageToPath(`${baseNode}/${companyId}/${clientId}`);
                    return;
                  }
                }
              }
            }
          }
        }
      }
      
      // Si no se encontró una ruta específica, usar las rutas predeterminadas
      console.log("⚡ Usando rutas predeterminadas para enviar mensaje");
      
      // Intentar primero con deliveryChats (ruta común)
      const chatId = selectedChat.id;
      await sendMessageToPath(`deliveryChats/${chatId}`);
      
    } catch (error) {
      console.error("❌ Error al enviar mensaje:", error);
      
      // Intentar con rutas alternativas
      try {
        console.log("🔄 Intentando rutas alternativas...");
        
        // Intentar ruta directa con el ID del chat
        await sendMessageToPath(selectedChat.id);
        
      } catch (alternativeError) {
        console.error("❌ Error en rutas alternativas:", alternativeError);
        
        // Último intento: crear una ruta completamente nueva
        try {
          console.log("🆕 Creando nueva ruta para mensajes directos...");
          
          // Crear una estructura directa cliente-empresa
          const directPath = `directMessages/${selectedChat.clientId}_${user.uid}`;
          await sendMessageToPath(directPath);
          
        } catch (finalError) {
          console.error("❌ Error fatal al enviar mensaje:", finalError);
          toast({
            title: "Error",
            description: "No se pudo enviar el mensaje. Por favor, intenta de nuevo más tarde.",
            variant: "destructive"
          });
        }
      }
    }
  };
  
  // Función auxiliar para enviar mensaje a una ruta específica
  async function sendMessageToPath(path: string) {
    console.log(`📤 Enviando mensaje a ruta: ${path}`);
    const messageRef = ref(rtdb, path);
    const newMessageRef = push(messageRef);
    
    // Crear mensaje con estructura completa
    const messageData = {
      content: newMessage.trim(),
      senderId: user!.uid,
      recipientId: selectedChat.clientId || "",
      senderName: user!.displayName || "Empresa",
      timestamp: Date.now(),
      read: false,
      status: "sent",
      sender: "company"
    };
    
    await set(newMessageRef, messageData);
    setNewMessage("");
    
    toast({
      title: "Mensaje enviado",
      description: "Tu mensaje ha sido enviado exitosamente al cliente",
    });
    
    // Actualizar interfaz (alternativa a esperar el listener)
    const messageWithId: ChatMessage = {
      ...messageData,
      id: newMessageRef.key || '',
      text: messageData.content,
      message: messageData.content
    };
    
    // Añadir el mensaje al estado actual para reflejar inmediatamente en la UI
    // Evitando duplicados basados en ID
    setChatMessages(prev => {
      // Verificar si ya existe un mensaje con este ID
      if (messageWithId.id && prev.some(msg => msg.id === messageWithId.id)) {
        return prev; // Ya existe, no duplicar
      }
      return [...prev, messageWithId];
    });
    
    // Scroll al final
    setTimeout(() => {
      const scrollArea = document.getElementById('message-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }, 100);
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-2 sm:px-4 py-2 sm:py-4">
      {/* Estado de vista móvil */}
      <div className={`lg:hidden fixed z-10 top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-3 flex items-center ${selectedChat ? 'justify-between' : 'justify-center'} text-white`}>
        {selectedChat && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-blue-700 p-1.5 mr-2"
            onClick={() => setSelectedChat(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <span className="ml-1">Atrás</span>
          </Button>
        )}
        <h1 className="text-lg font-bold">
          {selectedChat ? selectedChat.clientName : 'Centro de Mensajes'}
        </h1>
        {selectedChat && (
          <div className="w-10">{/* Espaciador para centrar el título */}</div>
        )}
      </div>

      {/* Margen superior para móvil */}
      <div className="h-16 lg:hidden"></div>

      {/* Header para desktop */}
      <div className="hidden lg:flex lg:flex-row lg:items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white mb-3 sm:mb-4">
        <div className="mb-2 sm:mb-0">
          <h1 className="text-xl sm:text-3xl font-bold">Centro de Mensajes</h1>
          <p className="text-blue-100 mt-0.5 sm:mt-1 text-xs sm:text-base">Gestiona todas tus conversaciones con clientes</p>
        </div>
        <Badge variant="secondary" className="bg-white text-indigo-700 text-xs sm:text-lg px-2 sm:px-5 py-0.5 sm:py-2 rounded-full font-medium shadow self-end sm:self-auto">
          {filteredConversations.filter(c => c.unreadCount > 0).length} mensajes sin leer
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-[calc(100vh-14rem)]">
        {/* Lista de Conversaciones Mejorada */}
        <Card className={`bg-white/95 backdrop-blur-sm border-none shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden lg:col-span-1 ${selectedChat ? 'hidden lg:block' : 'block'}`}>
          <CardHeader className="pb-0 bg-gradient-to-r from-blue-600 to-indigo-700 border-b border-blue-700 p-3 sm:p-4">
            <CardTitle className="text-base sm:text-xl font-bold text-white flex items-center gap-1 sm:gap-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-100" />
              <span>Conversaciones</span>
              <Badge variant="outline" className="ml-auto bg-white/20 text-white border-white/30 rounded-full text-xs py-0 px-2">
                {filteredConversations.length}
              </Badge>
            </CardTitle>
            <div className="relative mt-2 sm:mt-3 mb-2">
              <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
              <Input
                placeholder="Buscar por nombre o proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-blue-400 bg-white/20 text-white placeholder:text-white/70 focus:border-white focus:ring-2 focus:ring-white/30 rounded-xl py-2 sm:py-5 text-sm sm:text-base"
              />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)]">
            <CardContent className="p-0 divide-y divide-gray-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center text-gray-400 py-8 sm:py-12 space-y-3">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p>Cargando conversaciones...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-400 py-10 sm:py-12 px-4">
                  <div className="p-4 rounded-full bg-gray-50 mb-3">
                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300" />
                  </div>
                  <h3 className="text-gray-600 font-medium mb-1">No hay conversaciones</h3>
                  <p className="text-gray-400 text-center text-sm">Las conversaciones con clientes aparecerán aquí</p>
                </div>
              ) : filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`relative transition-all duration-200 ${
                    selectedChat?.id === conversation.id 
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-l-blue-600' 
                    : 'border-l-4 border-l-transparent hover:border-l-blue-300 hover:bg-blue-50/70'
                  }`}
                  onClick={() => setSelectedChat(conversation)}
                >
                  {/* Contenido de la conversación */}
                  <div className="p-3 sm:p-4 cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <div className="relative shrink-0">
                        <Avatar className={`h-12 w-12 sm:h-14 sm:w-14 border-2 shadow-md ${conversation.unreadCount > 0 ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                          <AvatarImage src={conversation.clientAvatar || '/avatars/placeholder.png'} alt={conversation.clientName} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold">
                            {conversation.clientName?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 flex items-center justify-center p-0 rounded-full shadow-md border border-white">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        
                        {/* Indicador de actividad */}
                        {conversation.lastMessageTime && new Date().getTime() - conversation.lastMessageTime.getTime() < 3600000 && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 truncate text-base">
                            {conversation.clientName}
                          </h4>
                          <span className="text-xs font-medium whitespace-nowrap ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {conversation.lastMessageTime instanceof Date
                              ? formatDate(conversation.lastMessageTime)
                              : 'Reciente'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1.5 font-medium">
                          <span className="font-semibold text-gray-700">{conversation.project}</span>
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                          {conversation.lastMessage}
                        </p>
                        <div className="flex mt-2 space-x-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-[10px] py-0 px-2">
                            #{conversation.solicitudId.substring(0, 6)}
                          </Badge>
                          
                          {/* Estado de la conversación */}
                          {conversation.unreadCount > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full text-[10px]">
                              Esperando respuesta
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 rounded-full text-[10px]">
                              Atendido
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Área de Chat Mejorada */}
        <Card className={`bg-white/95 backdrop-blur-sm border-none shadow-2xl rounded-xl sm:rounded-2xl overflow-hidden lg:col-span-2 ${selectedChat ? 'block' : 'hidden lg:block'} flex flex-col h-full`}>
          {selectedChat ? (
            <>
              {/* Encabezado de Chat Mejorado */}
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700 py-2 sm:py-3 px-3 sm:px-4 hidden lg:block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-white shadow-md">
                        <AvatarImage src={selectedChat.clientAvatar || '/avatars/placeholder.png'} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-300 to-blue-400 text-white font-bold">
                          {selectedChat.clientName?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-3 w-3 sm:h-3.5 sm:w-3.5 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base">{selectedChat.clientName}</h3>
                      <div className="flex flex-wrap items-center mt-1 gap-1">
                        <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                          {selectedChat.project || 'Chat directo'}
                        </Badge>
                        <p className="text-xs text-blue-100">
                          #{selectedChat.solicitudId?.substring(0, 6) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-white/70 hover:bg-blue-500/50 hover:text-white">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-white/70 hover:bg-blue-500/50 hover:text-white">
                      <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Mensajes Mejorados */}
              <ScrollArea className="flex-grow p-3 sm:p-4 md:p-6" id="message-scroll-area">
                {/* Fecha de los mensajes */}
                <div className="flex justify-center mb-4 sm:mb-6">
                  <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs text-blue-800 font-medium shadow-sm">
                    {chatMessages.length > 0 && chatMessages[0].timestamp ? 
                      new Date(typeof chatMessages[0].timestamp === 'number' ? 
                        chatMessages[0].timestamp : 
                        chatMessages[0].timestamp).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 
                      'Hoy'}
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Log de renderización - comentado para evitar error de tipos */}
                  {/* {console.log("💬 Renderizando", chatMessages.length, "mensajes en el chat")} */}
                  {chatMessages.length > 0 ? (
                  chatMessages.map((message: any, idx: number) => {
                    // Un mensaje es del usuario (cliente) si:
                    // - Su senderId no coincide con el ID del usuario actual (empresa)
                    // - O si el sender es uno de estos valores: 'user', 'client', 'customer'
                    // - O si el senderId coincide con el ID del cliente
                    const isUser = 
                      (message.senderId && message.senderId !== user?.uid) || 
                      ['user', 'client', 'customer'].includes(message.sender) || 
                      (selectedChat?.clientId && message.senderId === selectedChat.clientId);
                    
                    // Un mensaje es de la empresa si:
                    // - Su senderId coincide con el ID del usuario actual (empresa)
                    // - O si el sender es uno de estos valores: 'company', 'business', 'admin'
                    const isCompany = 
                      (message.senderId && message.senderId === user?.uid) || 
                      ['company', 'business', 'admin'].includes(message.sender) ||
                      // Si no hay senderId pero tampoco coincide con clientId, asumimos empresa
                      (!message.senderId && selectedChat?.clientId && message.sender !== selectedChat.clientId);
                    
                    // Si no se pudo determinar, mostrar como mensaje de usuario por defecto
                    const finalIsUser = !(isCompany && !isUser);
                    
                    // Formatear la hora del mensaje
                    const messageTime = message.timestamp instanceof Date
                      ? message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      : typeof message.timestamp === 'number'
                        ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : '';

                    // Mostrar cambio de día si es necesario
                    const showDateDivider = idx > 0 && message.timestamp && chatMessages[idx - 1].timestamp &&
                      new Date(typeof message.timestamp === 'number' ? message.timestamp : message.timestamp).toDateString() !==
                      new Date(typeof chatMessages[idx - 1].timestamp === 'number' ? chatMessages[idx - 1].timestamp : chatMessages[idx - 1].timestamp).toDateString();
                        
                    // Crear una clave única para cada mensaje
                    const uniqueKey = message.id ? `msg-${message.id}` : `idx-${idx}-${Date.now()}`;
                    
                    return (
                      
                      <div key={uniqueKey}>
                        {showDateDivider && (
                          <div className="flex justify-center my-4">
                            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                              {new Date(typeof message.timestamp === 'number' ? message.timestamp : message.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        <div
                          className={`flex items-end gap-1 sm:gap-2 ${finalIsUser ? 'justify-start' : 'justify-end'}`}
                        >
                          {finalIsUser && (
                            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mr-1 ring-2 ring-offset-1 ring-gray-100 shrink-0">
                              <AvatarImage src={selectedChat?.clientAvatar || '/placeholder.svg'} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs sm:text-sm">
                                {selectedChat?.clientName?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[75%] sm:max-w-xs md:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${
                              finalIsUser
                                ? 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md'
                            } transition-all duration-200 hover:shadow-lg`}
                          >
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {message.content || message.text || message.message || "(Sin contenido)"}
                            </p>
                            <div className={`flex items-center justify-end mt-1 space-x-1 ${!finalIsUser ? 'text-blue-100' : 'text-gray-400'}`}> 
                              <span className="text-[10px] sm:text-xs font-light">
                                {messageTime}
                              </span>
                              {!finalIsUser && (
                                <CheckCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              )}
                            </div>
                          </div>
                          {!finalIsUser && (
                            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ml-1 ring-2 ring-offset-1 ring-blue-100 shrink-0">
                              <AvatarImage src={user?.photoURL || '/placeholder.svg'} />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs sm:text-sm">
                                {user?.displayName?.charAt(0) || 'E'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-gray-500">
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-full mb-4">
                      <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
                    </div>
                    <h3 className="text-gray-600 font-medium mb-1 text-sm sm:text-base">No hay mensajes</h3>
                    <p className="text-gray-400 text-center text-xs sm:text-sm max-w-xs">
                      Cuando comiences a conversar con este cliente, los mensajes aparecerán aquí
                    </p>
                  </div>
                )}
                </div>
              </ScrollArea>
              
              {/* Indicador de cliente esperando respuesta */}
              {chatMessages.length > 0 && 
               // Comprueba si hay mensajes del cliente y ninguno de la empresa,
               // o si el último mensaje es del cliente
               (chatMessages.every(m => 
                  ['user', 'client'].includes(m.sender) || 
                  m.senderId === selectedChat?.clientId || 
                  !(m.sender === 'company' || m.senderId === user?.uid)
                ) || 
                (chatMessages.length > 0 && 
                  (chatMessages[chatMessages.length - 1].sender === 'user' || 
                   chatMessages[chatMessages.length - 1].sender === 'client' ||
                   chatMessages[chatMessages.length - 1].senderId === selectedChat?.clientId)
                )) && (
                <div className="flex items-center space-x-3 p-2 sm:p-3 bg-gradient-to-r from-amber-50 to-amber-100 border-y border-amber-200">
                  <div className="bg-amber-200 p-1.5 sm:p-2 rounded-full flex-shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-amber-800">Cliente esperando respuesta</h3>
                    <p className="text-[10px] sm:text-xs text-amber-700">
                      El cliente ha enviado mensajes y está esperando tu respuesta
                    </p>
                  </div>
                </div>
              )}

              {/* Área de Input Mejorada */}
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                {chatMessages.filter(m => m.sender === 'company' || m.senderId === user?.uid).length >= 3 ? (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Límite de mensajes alcanzado</h4>
                      <p className="text-xs text-yellow-700">Has alcanzado el límite de 3 mensajes para esta conversación.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0">
                        <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <div className="flex-1 relative">
                        <Textarea
                          placeholder="Escribe tu mensaje al cliente..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          rows={2}
                          className="resize-none border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 rounded-xl py-2 sm:py-3 shadow-sm text-xs sm:text-sm"
                        />
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0">
                        <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Enviar</span>
                      </Button>
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="text-[10px] sm:text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
                        <span className="font-medium">{chatMessages.filter(m => m.sender === 'company' || m.senderId === user?.uid).length}/3</span> mensajes enviados
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 bg-white/50 px-2 py-0.5 rounded-full hidden sm:block">
                        Presiona Enter para enviar, Shift+Enter para nueva línea
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full p-4 sm:p-8">
              <div className="text-center max-w-md">
                <div className="bg-blue-50 p-4 sm:p-6 rounded-full inline-block mb-4">
                  <MessageSquare className="h-10 w-10 sm:h-16 sm:w-16 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">
                  Centro de Mensajes
                </h3>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Selecciona una conversación de la lista para ver los mensajes y responder a tus clientes
                </p>
                <div className="border-t border-gray-100 pt-4 sm:pt-6 flex flex-col items-center">
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">¿No encuentras lo que buscas?</p>
                  <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Buscar en conversaciones antiguas
                  </Button>
                </div>
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
export default BackofficeMessages;