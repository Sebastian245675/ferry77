import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, ArrowLeft, MoreVertical, Phone, Video, Search, ChevronLeft, Plus, Store, UserPlus, X, CheckCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { messageService } from '../lib/messageService';
import { Conversation, Message } from '../lib/models';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { collection, query as firestoreQuery, where, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore';
import BottomNavigation from './BottomNavigation';

const MessageCenter = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'chats' | 'companies'>('chats');
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [canSendNewMessage, setCanSendNewMessage] = useState(true);
  // Estado para controlar si se muestra el mensaje de espera elegante
  const [showWaitingMessage, setShowWaitingMessage] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const companyId = searchParams.get('companyId');
  
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  
  // Cargar conversaciones
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        // Asegurarnos de que existe un usuario autenticado
        if (!auth.currentUser) {
          console.log("No hay usuario autenticado");
          setConversations([]);
          setLoading(false);
          return;
        }
        
        const convs = await messageService.getConversations();
        
        // Filtrar solo conversaciones donde el usuario actual sea participante
        const userConversations = convs.filter(conv => {
          // Verificar rigurosamente que el usuario actual sea participante
          const isParticipant = conv.participants.some(p => p.userId === auth.currentUser?.uid);
          
          // Verificación adicional: asegurar que esta conversación pertenece al usuario actual
          // Rechazar conversaciones que no tengan al usuario actual como participante
          if (!isParticipant) {
            return false;
          }
          
          // Verificar si la conversación tiene requestId o quoteId y si realmente pertenece al usuario
          if (conv.requestId) {
            // Verificar que este pedido realmente pertenezca al usuario actual
            // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su pedido
            const isUserRequest = conv.participants.some(p => p.userId === auth.currentUser?.uid && p.role === 'buyer');
            if (!isUserRequest) {
              console.log(`Ignorando conversación con pedido #${conv.requestId} que no parece pertenecer al usuario actual`);
              return false;
            }
          }
          
          if (conv.quoteId) {
            // Verificar que esta cotización realmente pertenezca al usuario actual
            // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su cotización
            const isUserQuote = conv.participants.some(p => p.userId === auth.currentUser?.uid && p.role === 'buyer');
            if (!isUserQuote) {
              console.log(`Ignorando conversación con cotización #${conv.quoteId} que no parece pertenecer al usuario actual`);
              return false;
            }
          }
          
          // Verificar si es una conversación válida para este usuario
          return true;
        });
        
        console.log(`Conversaciones filtradas: ${userConversations.length} de ${convs.length}`);
        setConversations(userConversations);
        
        // Si hay un companyId en los parámetros de búsqueda, priorizar esa conversación
        if (companyId) {
          console.log("Buscando conversación con companyId:", companyId);
          const conversation = userConversations.find(conv => 
            conv.participants.some(p => p.userId === companyId)
          );
          
          if (conversation) {
            console.log("Conversación encontrada, seleccionando:", conversation.id);
            setSelectedChat(conversation.id);
            // Forzar cambio a modo chats
            setSearchMode('chats');
          } else {
            console.log("No se encontró conversación con esta empresa, creando una nueva");
            // Si no se encuentra la conversación, buscar la empresa para crear una nueva
            searchCompanyById(companyId);
          }
        }
      } catch (error) {
        console.error("Error al cargar conversaciones:", error);
        setConversations([]);
      }
      setLoading(false);
    };
    
    loadConversations();
    
    // Suscribirse a actualizaciones en tiempo real
    const unsubscribe = messageService.listenToConversations((updatedConvs) => {
      // Filtrar solo conversaciones donde el usuario actual sea participante
      if (auth.currentUser) {
        const userId = auth.currentUser.uid;
        const userUpdatedConvs = updatedConvs.filter(conv => {
          // Verificar que el usuario sea participante usando exactamente el mismo ID
          const isParticipant = conv.participants.some(p => p.userId === userId);
          if (!isParticipant) return false;
          
          // Verificar si la conversación tiene requestId o quoteId y si realmente pertenece al usuario
          if (conv.requestId) {
            // Verificar que este pedido realmente pertenezca al usuario actual
            // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su pedido
            const isUserRequest = conv.participants.some(p => p.userId === userId && p.role === 'buyer');
            if (!isUserRequest) {
              console.log(`Filtrando conversación con pedido #${conv.requestId} que no parece pertenecer al usuario actual`);
              return false;
            }
          }
          
          if (conv.quoteId) {
            // Verificar que esta cotización realmente pertenezca al usuario actual
            // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su cotización
            const isUserQuote = conv.participants.some(p => p.userId === userId && p.role === 'buyer');
            if (!isUserQuote) {
              console.log(`Filtrando conversación con cotización #${conv.quoteId} que no parece pertenecer al usuario actual`);
              return false;
            }
          }
          
          // Solo incluir conversaciones donde el usuario es participante y los pedidos/cotizaciones le pertenecen
          return true;
        });
        console.log(`Actualizando conversaciones: ${userUpdatedConvs.length} de ${updatedConvs.length}`);
        setConversations(userUpdatedConvs);
        
        // Si hay un companyId y aún no hay un chat seleccionado, intentar encontrarlo
        if (companyId && !selectedChat) {
          console.log("Buscando conversación para companyId en actualización:", companyId);
          const conversation = userUpdatedConvs.find(conv => 
            conv.participants.some(p => p.userId === companyId)
          );
          
          if (conversation) {
            console.log("Conversación encontrada en actualización:", conversation.id);
            setSelectedChat(conversation.id);
            setSearchMode('chats');
          }
        }
      } else {
        setConversations([]);
      }
    });
    
    return () => unsubscribe();
  }, [companyId, selectedChat]); // Agregar selectedChat como dependencia para que reaccione a cambios

  // Enviar mensaje, detectando si es chat de delivery
  const sendMessage = async () => {
    if (!message.trim() || !selectedChat || !user) return;
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat);
      
      // Verificar que sea una conversación del usuario actual
      if (!selectedConversation || 
          !selectedConversation.participants.some(p => p.userId === user.uid)) {
        console.error("No puedes enviar mensajes en una conversación que no te pertenece");
        return;
      }
      
      // Ya no verificamos si puede responder - siempre permitimos enviar mensajes
      
      if (selectedConversation?.type === 'delivery' || selectedChat.startsWith('delivery-')) {
        // Es un chat de delivery
        const orderId = selectedChat.replace('delivery-', '');
        await messageService.sendDeliveryMessage(orderId, message.trim());
      } else {
        // Es un chat normal
        await messageService.sendMessage(selectedChat, message.trim());
        
        // Verificar si es una conversación con empresa y tiene pocos mensajes
        if (selectedConversation && 
            selectedConversation.participants.some(p => p.role === 'seller')) {
          
          // Verificar si es el primer mensaje
          const msgs = await messageService.getMessages(selectedChat);
          if (msgs.length <= 1) {
            // Es el primer mensaje, mostrar mensaje elegante de espera
            setShowWaitingMessage(true);
            console.log("Mostrando mensaje de espera elegante después del primer mensaje");
            
            // Asegurarse de que estamos en modo chats para ver la conversación
            if (searchMode !== 'chats') {
              setSearchMode('chats');
              console.log("Cambiando a modo chats para mostrar la conversación");
            }
          }
        }
      }
      
      setMessage('');
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
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
    // Primero verificamos si el usuario actual es participante de esta conversación
    if (user) {
      const isParticipant = conv.participants.some(p => p.userId === user.uid);
      if (!isParticipant) return false; // No mostrar si el usuario no es participante
      
      // Verificar si la conversación tiene requestId o quoteId y si realmente pertenece al usuario
      if (conv.requestId) {
        // Verificar que este pedido realmente pertenezca al usuario actual
        // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su pedido
        const isUserRequest = conv.participants.some(p => p.userId === user.uid && p.role === 'buyer');
        if (!isUserRequest) {
          console.log(`Filtrando conversación con pedido #${conv.requestId} que no parece pertenecer al usuario actual`);
          return false;
        }
      }
      
      if (conv.quoteId) {
        // Verificar que esta cotización realmente pertenezca al usuario actual
        // Si el usuario no es el comprador (buyer) en esta conversación, probablemente no sea su cotización
        const isUserQuote = conv.participants.some(p => p.userId === user.uid && p.role === 'buyer');
        if (!isUserQuote) {
          console.log(`Filtrando conversación con cotización #${conv.quoteId} que no parece pertenecer al usuario actual`);
          return false;
        }
      }
    }
    
    // Si estamos en modo búsqueda de chats
    if (searchMode === 'chats') {
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
      
      
      // Mostrar TODAS las conversaciones en modo chats que pasen los filtros anteriores
      // Esto asegura que las conversaciones recién creadas sean visibles inmediatamente
      
      // Añadir log de diagnóstico para cada conversación mostrada
      if (conv.requestId || conv.quoteId) {
        console.log(`Mostrando conversación: ${conv.id}, ` +
          `tipo: ${conv.type || 'directo'}, ` +
          `${conv.requestId ? 'Pedido #' + conv.requestId.substring(0, 6) : ''} ` +
          `${conv.quoteId ? 'Cotización #' + conv.quoteId.substring(0, 6) : ''}, ` +
          `participantes: ${conv.participants.map(p => `${p.name} (${p.role})`).join(', ')}`);
      }
      
      return true;
    }
    
    // Si estamos en modo empresas, no mostrar chats (se mostrarán las empresas en su lugar)
    return false;
  });

  // Búsqueda de empresa por ID
  const searchCompanyById = async (id: string) => {
    console.log("Buscando empresa con ID:", id);
    setLoading(true);
    
    try {
      // Primero, verificar si ya existe una conversación con esta empresa
      const existingConversation = conversations.find(conv => 
        conv.participants.some(p => p.userId === id)
      );
      
      if (existingConversation) {
        console.log("Conversación existente encontrada, seleccionando:", existingConversation.id);
        setSelectedChat(existingConversation.id);
        setSearchMode('chats');
        setLoading(false);
        return;
      }
      
      // Variable para almacenar los datos de la empresa encontrada
      let companyData = null;
      let companyId = null;
      
      // Método 1: Buscar directamente por ID en la colección 'companies'
      console.log("Método 1: Buscando en colección 'companies' por ID");
      const companiesDocRef = doc(db, 'companies', id);
      const companiesDocSnap = await getDoc(companiesDocRef);
      
      if (companiesDocSnap.exists()) {
        companyData = companiesDocSnap.data();
        companyId = companiesDocSnap.id;
        console.log("Empresa encontrada en 'companies' con ID:", companyId);
      } else {
        // Método 2: Buscar directamente por ID en la colección 'empresas'
        console.log("Método 2: Buscando en colección 'empresas' por ID");
        const empresasDocRef = doc(db, 'empresas', id);
        const empresasDocSnap = await getDoc(empresasDocRef);
        
        if (empresasDocSnap.exists()) {
          companyData = empresasDocSnap.data();
          companyId = empresasDocSnap.id;
          console.log("Empresa encontrada en 'empresas' con ID:", companyId);
        } else {
          // Método 3: Buscar por UID en ambas colecciones
          console.log("Método 3: Buscando por campos alternativos (uid, userId)");
          
          // Buscar en 'companies' por uid o userId
          const companiesRef = collection(db, 'companies');
          const companiesQueryUID = firestoreQuery(companiesRef, where('uid', '==', id));
          const companiesQueryUserID = firestoreQuery(companiesRef, where('userId', '==', id));
          
          const [companiesSnapshotUID, companiesSnapshotUserID] = await Promise.all([
            getDocs(companiesQueryUID),
            getDocs(companiesQueryUserID)
          ]);
          
          if (!companiesSnapshotUID.empty) {
            companyData = companiesSnapshotUID.docs[0].data();
            companyId = companiesSnapshotUID.docs[0].id;
            console.log("Empresa encontrada en 'companies' por uid:", companyId);
          } else if (!companiesSnapshotUserID.empty) {
            companyData = companiesSnapshotUserID.docs[0].data();
            companyId = companiesSnapshotUserID.docs[0].id;
            console.log("Empresa encontrada en 'companies' por userId:", companyId);
          } else {
            // Buscar en 'empresas' por uid o userId
            const empresasRef = collection(db, 'empresas');
            const empresasQueryUID = firestoreQuery(empresasRef, where('uid', '==', id));
            const empresasQueryUserID = firestoreQuery(empresasRef, where('userId', '==', id));
            
            const [empresasSnapshotUID, empresasSnapshotUserID] = await Promise.all([
              getDocs(empresasQueryUID),
              getDocs(empresasQueryUserID)
            ]);
            
            if (!empresasSnapshotUID.empty) {
              companyData = empresasSnapshotUID.docs[0].data();
              companyId = empresasSnapshotUID.docs[0].id;
              console.log("Empresa encontrada en 'empresas' por uid:", companyId);
            } else if (!empresasSnapshotUserID.empty) {
              companyData = empresasSnapshotUserID.docs[0].data();
              companyId = empresasSnapshotUserID.docs[0].id;
              console.log("Empresa encontrada en 'empresas' por userId:", companyId);
            } else {
              // Método 4: Buscar en users por si acaso
              console.log("Método 4: Buscando en 'users' como último recurso");
              const userDocRef = doc(db, 'users', id);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists() && userDocSnap.data().type === 'company') {
                companyData = userDocSnap.data();
                companyId = userDocSnap.id;
                console.log("Empresa encontrada en 'users':", companyId);
              }
            }
          }
        }
      }
      
      if (!companyData || !companyId) {
        console.log("No se encontró la empresa con ID:", id);
        setLoading(false);
        alert("No se encontró la empresa. Por favor, intenta nuevamente más tarde.");
        return;
      }
      
      const company = { 
        id: companyId, 
        name: companyData.name || companyData.businessName || companyData.companyName || 'Empresa',
        logo: companyData.logo || companyData.profilePicture || companyData.photoURL || '',
        category: companyData.category || companyData.type || '',
        description: companyData.description || companyData.about || '',
        verified: companyData.verified || false
      };
      
      console.log("Empresa encontrada:", company);
      
      // Iniciar conversación con esta empresa
      await startConversationWithCompany(company);
    } catch (error) {
      console.error('Error al buscar empresa por ID:', error);
      setLoading(false);
      alert("Hubo un error al buscar la empresa. Por favor, intenta nuevamente más tarde.");
    }
  };

  // Búsqueda de empresas
  const searchCompanies = async (query: string) => {
    console.log("Buscando empresas con query:", query);
    setLoadingCompanies(true);
    
    try {
      // Búsqueda en varias colecciones para maximizar resultados
      const companiesPromises = [
        // 1. Buscar en colección 'companies'
        getDocs(collection(db, 'companies')),
        // 2. Buscar en colección 'empresas' (nombre alternativo)
        getDocs(collection(db, 'empresas')),
        // 3. Buscar en 'users' filtrando por tipo 'company'
        getDocs(firestoreQuery(collection(db, 'users'), where('type', '==', 'company')))
      ] as const;
      
      const [companiesSnapshot, empresasSnapshot, usersSnapshot] = await Promise.all(companiesPromises);
      
      // Procesar resultados de las tres consultas
      let allCompanies: any[] = [];
      
      // Procesar 'companies'
      companiesSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        allCompanies.push({ 
          id: doc.id, 
          name: data.name || data.businessName || data.companyName || 'Empresa',
          logo: data.logo || data.profilePicture || data.photoURL || '',
          category: data.category || data.type || data.rubro || '',
          description: data.description || data.about || '',
          verified: data.verified || false
        });
      });
      
      // Procesar 'empresas'
      empresasSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        allCompanies.push({ 
          id: doc.id, 
          name: data.name || data.businessName || data.nombreEmpresa || data.razonSocial || 'Empresa',
          logo: data.logo || data.profilePicture || data.photoURL || '',
          category: data.category || data.type || data.rubro || '',
          description: data.description || data.about || '',
          verified: data.verified || false
        });
      });
      
      // Procesar 'users' de tipo 'company'
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        if (data.type === 'company' || data.userType === 'company' || data.role === 'company') {
          allCompanies.push({ 
            id: doc.id, 
            name: data.displayName || data.name || data.businessName || data.companyName || 'Empresa',
            logo: data.photoURL || data.logo || data.profilePicture || '',
            category: data.category || data.type || data.rubro || '',
            description: data.description || data.about || data.bio || '',
            verified: data.verified || false
          });
        }
      });
      
      // Eliminar duplicados basados en ID
      const uniqueCompanies = Array.from(
        new Map(allCompanies.map(company => [company.id, company])).values()
      );
      
      console.log(`Total de empresas encontradas (sin duplicados): ${uniqueCompanies.length}`);
      
      // Si hay una consulta, filtrar los resultados
      let filteredCompanies = uniqueCompanies;
      if (query && query.trim().length > 0) {
        const q = query.toLowerCase().trim();
        // Dividir la consulta en palabras para búsqueda más flexible
        const searchTerms = q.split(/\s+/).filter(term => term.length > 1);
        
        if (searchTerms.length > 0) {
          filteredCompanies = uniqueCompanies.filter(company => {
            const companyName = (company.name || '').toLowerCase();
            const categoryName = (company.category || '').toLowerCase();
            const descriptionText = (company.description || '').toLowerCase();
            
            // Verificar si alguno de los términos coincide con alguno de los campos
            return searchTerms.some(term => 
              companyName.includes(term) || 
              categoryName.includes(term) || 
              descriptionText.includes(term)
            );
          });
        }
        console.log(`Empresas filtradas por "${query}": ${filteredCompanies.length}`);
      }
      
      // Ordenar por relevancia (empresas verificadas primero) y luego alfabéticamente
      const results = filteredCompanies
        .sort((a, b) => {
          // Primero mostrar empresas verificadas
          if (a.verified && !b.verified) return -1;
          if (!a.verified && b.verified) return 1;
          // Luego ordenar alfabéticamente
          return a.name.localeCompare(b.name);
        })
        .slice(0, 50); // Aumentar límite a 50 resultados para más opciones
      
      setCompanies(results);
    } catch (error) {
      console.error('Error al buscar empresas:', error);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Efecto para buscar empresas cuando cambia la consulta o el modo
  useEffect(() => {
    console.log('Modo búsqueda cambiado a:', searchMode);
    
    if (searchMode === 'companies') {
      // Siempre cargar empresas al cambiar a modo empresas, incluso sin query
      console.log('Iniciando búsqueda de empresas:', searchQuery);
      searchCompanies(searchQuery);
    } else if (searchMode === 'chats') {
      // Estamos en modo chats, asegurarse de que se vean todas las conversaciones
      console.log('Mostrando todas las conversaciones en modo chats:', conversations.length);
      // Forzar un refresco del componente
      setConversations([...conversations]);
    } else {
      // Limpiar resultados si no estamos en modo búsqueda de empresas
      setCompanies([]);
    }
  }, [searchMode]);
  
  // Efecto separado para la búsqueda con debounce
  useEffect(() => {
    if (searchMode === 'companies') {
      // Añadir debounce para no buscar en cada tecla
      const debounceTimer = setTimeout(() => {
        console.log('Buscando empresas con delay:', searchQuery);
        searchCompanies(searchQuery);
      }, 300); // 300ms de debounce
      
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, searchMode]);

  // Iniciar una nueva conversación con una empresa
  const startConversationWithCompany = async (company: any) => {
    if (!user) {
      alert("Debes iniciar sesión para chatear con empresas");
      return;
    }
    
    try {
      console.log("Intentando iniciar conversación con empresa:", company.id, company.name);
      
      // Verificar si ya existe una conversación con esta empresa
      const existingConv = conversations.find(conv => 
        conv.participants.some(p => p.userId === company.id)
      );
      
      if (existingConv) {
        console.log("Conversación existente encontrada, seleccionando:", existingConv.id);
        // Si ya existe, simplemente seleccionar ese chat
        setSelectedChat(existingConv.id);
        setSearchMode('chats');
        setSearchQuery('');
        
        // Si llegamos desde otra página, actualizar la URL para quitar el parámetro companyId
        if (companyId) {
          navigate('/messages', { replace: true });
        }
        
        return existingConv.id;
      }
      
      // Crear nueva conversación (adaptado a la interfaz existente de messageService)
      const companyName = company.name || 'Empresa';
      
      // Mostrar indicador de carga
      setLoading(true);
      
      try {
        console.log("Creando nueva conversación con:", companyName, company.id);
        // Crear la conversación en Firebase
        const newConversationId = await messageService.createConversation(
          company.id,
          companyName,
          company.logo || null, // Explícitamente usar null si no hay logo
          { companyId: company.id }
        );
        
        console.log("Nueva conversación creada con ID:", newConversationId);
        
        // Verificar si la conversación se creó correctamente
        if (!newConversationId) {
          console.error("No se pudo crear la conversación. ID de conversación nulo.");
          setLoading(false);
          alert("Hubo un error al iniciar la conversación. Inténtalo de nuevo más tarde.");
          return null;
        }
        
        // Intentar actualizar la conversación para indicar que el cliente no puede responder
        try {
          // Aquí iría la lógica para actualizar la conversación si tuviéramos acceso
          // a los métodos del messageService para actualizar la conversación
          console.log('Conversación creada con ID:', newConversationId);
        } catch (e) {
          console.log('No se pudo actualizar la conversación con datos adicionales:', e);
        }
        
        // Ya no enviamos un mensaje automático, dejamos que el usuario escriba su propio mensaje
        
        // Actualizar UI inmediatamente
        setSelectedChat(newConversationId);
        setSearchMode('chats'); // Forzar el cambio a modo chats
        setSearchQuery('');
        
        // Si llegamos desde otra página, actualizar la URL para quitar el parámetro companyId
        if (companyId) {
          navigate('/messages', { replace: true });
        }
        
        // Actualizar el estado local de conversaciones para incluir la nueva
        const newConversation: Conversation = {
          id: newConversationId,
          participants: [
            { 
              userId: user.uid, 
              name: user.displayName || 'Usuario', 
              role: 'buyer',
              ...(user.photoURL ? { avatar: user.photoURL } : {})
            },
            { 
              userId: company.id, 
              name: company.name, 
              role: 'seller',
              ...(company.logo ? { avatar: company.logo } : {})
            }
          ],
          lastActivity: new Date().getTime(),
          unreadCount: {},
          type: 'direct'
          // Ya no añadimos lastMessage porque no hay mensaje inicial automático
        };
        
        setConversations([newConversation, ...conversations]);
        
        console.log("Conversación añadida a la lista de conversaciones:", newConversation.id);
        console.log("Total de conversaciones:", conversations.length + 1);
        
        // Esperar un poco para actualizar el loading
        setTimeout(() => {
          setLoading(false);
          // Mostrar mensaje al usuario diferente, ya que ahora debe escribir su propio mensaje
          alert(`Conversación creada con ${companyName}. ¡Escribe tu primer mensaje!`);
        }, 800);
        
        return newConversationId;
      } catch (error) {
        console.error('Error al crear conversación:', error);
        setLoading(false);
        alert('Hubo un error al iniciar la conversación. Inténtalo de nuevo más tarde.');
        return null;
      }
    } catch (error) {
      console.error('Error al iniciar conversación:', error);
      setLoading(false);
      alert('Hubo un error al iniciar la conversación. Inténtalo de nuevo más tarde.');
      return null;
    }
  };

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
            placeholder={searchMode === 'chats' 
              ? "Buscar en mis conversaciones..." 
              : "Buscar empresas por nombre, categoría..."
            }
            className="pl-9 pr-9 rounded-full border-gray-300 focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          <div className="flex items-center gap-1 mt-2 justify-between">
            <button 
              onClick={() => {
                setSearchMode('chats');
                setSearchQuery('');
              }}
              className={`flex-1 px-3 py-1.5 text-xs rounded-full flex items-center justify-center transition-colors ${
                searchMode === 'chats' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageSquare size={14} className="mr-1" /> 
              Mis Chats
            </button>
            <button 
              onClick={() => {
                setSearchMode('companies');
                setSearchQuery('');
                // Cargar todas las empresas inmediatamente
                searchCompanies('');
              }}
              className={`flex-1 px-3 py-1.5 text-xs rounded-full flex items-center justify-center transition-colors ${
                searchMode === 'companies' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Store size={14} className="mr-1" /> 
              Empresas
            </button>
            {searchMode === 'companies' && (
              <div className="ml-1 px-3 py-1.5 text-xs rounded-full bg-primary-50 text-primary flex items-center">
                <span className="hidden sm:inline mr-1">Total:</span> {companies.length}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {searchMode === 'chats' ? (
          loading ? (
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
                              {/* Diagnóstico adicional */}
                              {!conv.participants.some(p => p.userId === user?.uid && p.role === 'buyer') && 
                                <span className="ml-1 text-red-600">(!)</span>
                              }
                            </p>
                          </div>
                        )}
                        {conv.quoteId && (
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                            <p className="text-xs text-green-600 truncate">
                              Cotización #{conv.quoteId.substring(0, 6)}
                              {/* Diagnóstico adicional */}
                              {!conv.participants.some(p => p.userId === user?.uid && p.role === 'buyer') && 
                                <span className="ml-1 text-red-600">(!)</span>
                              }
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
          )
        ) : (
          // Visualización de empresas encontradas
          loadingCompanies ? (
            <div className="p-4 text-center text-gray-500">Buscando empresas...</div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 h-64">
              <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Store className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {searchQuery.length < 2 ? "Empresas disponibles" : "No se encontraron empresas"}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                {searchQuery.length < 2
                  ? "Todas las empresas registradas aparecerán aquí. Comienza a escribir para buscar."
                  : "Intenta con otros términos de búsqueda"}
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-primary-50/50 border-b">
                <div className="flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-primary">
                    {searchQuery ? 
                      `Se encontraron ${companies.length} empresas que coinciden con "${searchQuery}"` :
                      `Mostrando ${companies.length} empresas disponibles`
                    }
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Selecciona una empresa para iniciar una conversación
                  </p>
                </div>
              </div>
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => startConversationWithCompany(company)}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center text-white font-medium shadow-sm">
                          {getInitials(company.name)}
                        </div>
                      )}
                      {company.verified && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                            <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate flex items-center">
                          {company.name}
                          {company.verified && (
                            <span className="ml-1 text-blue-500">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {company.category && (
                        <div className="flex items-center mb-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>
                          <p className="text-xs text-blue-600 truncate">
                            {company.category}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 truncate">
                        {company.description || "Pulsa para iniciar una conversación"}
                      </p>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="text-primary">
                      <MessageSquare size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )
        )}
      </div>
    </div>
  );

  const ChatWindow = () => {
    const selectedConversation = conversations.find(c => c.id === selectedChat);
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    // Estado para verificar si el cliente puede responder a esta conversación
    const [canReply, setCanReply] = useState(true);
    
    // Estado local para mostrar el mensaje de espera de respuesta
    const [showWaitingMessage, setShowWaitingMessage] = useState(false);

    useEffect(() => {
      if (!selectedChat) return;
      
      // Validar que el usuario actual sea participante de esta conversación
      if (user && selectedConversation && 
          !selectedConversation.participants.some(p => p.userId === user.uid)) {
        console.log("Usuario no es participante de esta conversación");
        setChatMessages([]);
        setLoadingMessages(false);
        return;
      }
      
      // Siempre permitir que el cliente pueda responder a cualquier conversación
      // sin importar si la empresa ha respondido o no
      setCanReply(true);
      
      // El código anterior restringía respuestas, ahora lo comentamos
      /*
      // @ts-ignore - Añadimos propiedad canCustomerReply en algunos casos
      if (selectedConversation && selectedConversation.canCustomerReply !== undefined) {
        // @ts-ignore
        setCanReply(selectedConversation.canCustomerReply);
      } else {
        setCanReply(true); // Por defecto permitir responder
      }
      */
      
      // Resetear el mensaje de espera cuando cambia la conversación
      setShowWaitingMessage(false);
      
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
          
          // Filtrar mensajes para mostrar solo los del usuario actual y respuestas legítimas
          if (user) {
            msgs = msgs.filter(msg => 
              msg.senderId === user.uid || // Mensajes enviados por el usuario actual
              selectedConversation?.participants.some(p => p.userId === msg.senderId) // O mensajes de participantes legítimos
            );
          }
          
          console.log(`Mensajes cargados y filtrados: ${msgs.length}`);
          setChatMessages(msgs);
          
          // Verificar si debemos mostrar el mensaje de espera
          // Solo mostramos el mensaje de espera si:
          // 1. Es una conversación con una empresa (tiene un participante con rol seller)
          // 2. Solo hay mensajes del usuario actual (no hay respuestas de la empresa)
          if (selectedConversation?.participants.some(p => p.role === 'seller')) {
            const hasCompanyResponse = msgs.some(msg => 
              msg.senderId !== user?.uid && 
              selectedConversation.participants.some(p => p.userId === msg.senderId && p.role === 'seller')
            );
            
            if (msgs.length > 0 && !hasCompanyResponse) {
              // Solo hay mensajes del usuario, mostrar mensaje de espera
              setShowWaitingMessage(true);
            } else {
              // Ya hay respuestas de la empresa, ocultar mensaje de espera
              setShowWaitingMessage(false);
            }
          }
          
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
          // Verificar que sea una conversación del usuario actual
          if (user) {
            // Filtrar mensajes para asegurarse que pertenecen al usuario actual o son respuestas legítimas
            const filteredMessages = updatedMessages.filter(msg => 
              msg.senderId === user.uid || // Mensajes enviados por el usuario actual
              selectedConversation?.participants.some(p => p.userId === msg.senderId) // O mensajes de participantes legítimos
            );
            setChatMessages(filteredMessages);
            messageService.markDeliveryMessagesAsRead(orderId);
          }
        });
      } else {
        unsubscribe = messageService.listenToMessages(selectedChat, (updatedMessages: Message[]) => {
          // Verificar que sea una conversación del usuario actual
          if (user && selectedConversation && 
              selectedConversation.participants.some(p => p.userId === user.uid)) {
            // Filtrar mensajes para asegurarse que pertenecen al usuario actual o son respuestas legítimas
            const filteredMessages = updatedMessages.filter(msg => 
              msg.senderId === user.uid || // Mensajes enviados por el usuario actual
              selectedConversation.participants.some(p => p.userId === msg.senderId) // O mensajes de participantes legítimos
            );
            setChatMessages(filteredMessages);
            
            // Verificar si debemos mostrar el mensaje de espera
            if (selectedConversation.participants.some(p => p.role === 'seller')) {
              const hasCompanyResponse = filteredMessages.some(msg => 
                msg.senderId !== user.uid && 
                selectedConversation.participants.some(p => p.userId === msg.senderId && p.role === 'seller')
              );
              
              if (filteredMessages.length > 0 && !hasCompanyResponse) {
                // Solo hay mensajes del usuario, mostrar mensaje de espera
                setShowWaitingMessage(true);
              } else {
                // Ya hay respuestas de la empresa, ocultar mensaje de espera
                setShowWaitingMessage(false);
              }
            }
            
            messageService.markMessagesAsRead(selectedChat);
          }
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
                onClick={handleBackToChats}
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
          {/* Mensaje elegante que indica que debe esperar respuesta */}
          {showWaitingMessage && (
            <div className="mb-3 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-100 shadow-sm">
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full p-2 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1 flex items-center">
                    Mensaje enviado con éxito
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-500 ml-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Tu mensaje ha sido enviado correctamente. La empresa recibirá una notificación 
                    y te responderá tan pronto como sea posible.
                  </p>
                  <div className="flex items-center text-xs text-indigo-600 font-medium">
                    <span className="inline-block w-2 h-2 bg-indigo-600 rounded-full mr-1 animate-pulse"></span>
                    Esperando respuesta...
                  </div>
                </div>
                <button 
                  onClick={() => setShowWaitingMessage(false)} 
                  className="ml-auto text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={!selectedChat || loadingMessages}
              className="flex-1 border border-gray-200 bg-white focus-visible:ring-1 focus-visible:ring-primary text-gray-800"
              style={{ color: "#1f2937" }}
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

  // Manejar regreso a la lista de chats (para móviles)
  const handleBackToChats = () => {
    setSelectedChat(null);
    // Si venimos de otra página con un companyId, regresar a esa página
    if (companyId) {
      navigate(-1); // Vuelve a la página anterior
    }
  };

  useEffect(() => {
    if (selectedChat) {
      console.log("Chat seleccionado:", selectedChat);
      console.log("Es chat de delivery:", selectedChat.startsWith('delivery-'));
    }
  }, [selectedChat]);
  
  // Variable auxiliar para controlar si puede responder
  const [canReply, setCanReply] = useState(true);

  return (
    <div className="h-full bg-white">
      {!user ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-primary-50 rounded-full p-5 mx-auto w-20 h-20 flex items-center justify-center mb-4">
            <MessageSquare className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-medium text-gray-900">Inicia sesión para ver tus mensajes</h3>
          <p className="mt-2 text-sm text-gray-600">
            Debes iniciar sesión para acceder al centro de mensajes.
          </p>
          <Link to="/auth">
            <Button className="mt-4">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              {companyId ? (
                <button onClick={() => navigate(-1)} className="md:hidden p-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <Link to="/dashboard" className="md:hidden p-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft size={20} />
                </Link>
              )}
              <h1 className="text-lg font-bold text-primary">Mensajes</h1>
            </div>
            {/* Removed call and video call icons */}
            <div className="flex items-center gap-2"></div>
          </div>
          
          {/* Main content */}
          <div className="flex-1 h-[calc(100%-56px)] flex flex-col md:flex-row">
            <div className={`w-full md:w-1/3 md:border-r ${selectedChat || companyId ? 'hidden md:block' : 'block'}`}>
              <ChatList />
            </div>
            <div className={`w-full md:w-2/3 ${selectedChat || companyId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}`}>
              {selectedChat ? (
                <ChatWindow />
              ) : companyId && loading ? (
                <div className="flex flex-col justify-center items-center h-full">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 font-medium mt-4">Cargando conversación...</p>
                  <p className="text-gray-500 text-sm mt-2">Estamos preparando el chat con la empresa</p>
                </div>
              ) : (
                <div className="text-center p-8 max-w-md mx-auto">
                  <div className="bg-primary-50 rounded-full p-5 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900">Centro de mensajes</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Selecciona una conversación para ver tus mensajes con repartidores y proveedores.
                  </p>
                  <Button 
                    className="mt-4" 
                    variant="outline"
                    onClick={() => {
                      setSearchMode('companies');
                      setSearchQuery('');
                      // Cargar todas las empresas inmediatamente
                      searchCompanies('');
                    }}
                  >
                    <MessageSquare size={16} className="mr-2" />
                    Iniciar nueva conversación
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Navigation para móviles - oculto cuando hay un chat seleccionado */}
          {!selectedChat && (
            <div className="md:hidden mt-auto">
              <BottomNavigation />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageCenter;
