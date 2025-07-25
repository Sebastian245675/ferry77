import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { User, MapPin, Phone, Mail, Edit3, Camera, Star, Award, CreditCard, History, MessageSquare } from 'lucide-react';
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    profession: '',
    email: '',
    phone: '',
    location: '',
    ubicompleta: {
      ciudad: '',
      localidad: '',
      barrio: '',
      numeroCasa: '',
      especificaciones: '',
      enlaceGoogleMaps: '',
    },
    rating: 0,
    completedJobs: 0,
    joinDate: '',
    credits: 0,
    bio: '',
    avatar: '', // avatar image filename
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const navigate = useNavigate();

  // Cargar datos reales del usuario
  useEffect(() => {
    const fetchProfile = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : {};
        setProfileData({
          name: data.name || user.displayName || '',
          profession: data.rol || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          location: data.location || '',
          ubicompleta: data.ubicompleta || {
            ciudad: data.ubicompleta?.ciudad || '',
            localidad: data.ubicompleta?.localidad || '',
            barrio: data.ubicompleta?.barrio || '',
            numeroCasa: data.ubicompleta?.numeroCasa || '',
            especificaciones: data.ubicompleta?.especificaciones || '',
            enlaceGoogleMaps: data.ubicompleta?.enlaceGoogleMaps || '',
          },
          rating: data.rating || 0,
          completedJobs: data.completedJobs || 0,
          joinDate: data.joinDate || (user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString().slice(0,10) : ''),
          credits: data.credits || 0,
          bio: data.bio || '',
          avatar: data.avatar || '',
        });
      }
    };
    fetchProfile();
  }, []);

  // Fetch recent activity from Firestore
  useEffect(() => {
    const fetchRecentActivity = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      console.log("Buscando actividad para usuario:", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      
      setIsLoadingActivity(true);
      
      try {
        // Buscar diferentes tipos de actividad y combinarlos
        const activities = [];
        
        // Primero intentemos obtener todas las cotizaciones para ver la estructura
        try {
          console.log("Obteniendo todas las cotizaciones para inspección...");
          const allQuotesQuery = query(
            collection(db, "cotizaciones"),
            orderBy("createdAt", "desc"),
            limit(10)
          );
          
          const allQuotesSnapshot = await getDocs(allQuotesQuery);
          console.log(`Encontradas ${allQuotesSnapshot.size} cotizaciones totales`);
          
          if (allQuotesSnapshot.size > 0) {
            // Inspeccionar la primera cotización para ver su estructura
            const firstQuote = allQuotesSnapshot.docs[0].data();
            console.log("Estructura de una cotización:", 
              Object.keys(firstQuote).reduce((acc, key) => {
                acc[key] = typeof firstQuote[key];
                return acc;
              }, {})
            );
          }
        } catch (err) {
          console.log("Error inspeccionando cotizaciones:", err);
        }
        
        // Ahora intentamos la consulta específica
        const quotesQuery = query(
          collection(db, "cotizaciones"),
          limit(10)
        );
        
        const quotesSnapshot = await getDocs(quotesQuery);
        console.log(`Procesando ${quotesSnapshot.size} cotizaciones`);
        
        quotesSnapshot.forEach(doc => {
          const data = doc.data();
          // Filtrar solo cotizaciones relacionadas con el usuario actual
          const isUserQuote = 
            data.userId === user.uid || 
            data.userId === user.email ||
            data.clientId === user.uid ||
            data.clientId === user.email;
            
          if (isUserQuote || quotesSnapshot.size <= 5) {  // Si hay pocas, mostrarlas todas
            activities.push({
              id: doc.id,
              type: 'quote_received',
              title: 'Cotización recibida',
              description: `${data.companyName || data.company?.name || 'Empresa'} - ${data.requestTitle || data.title || 'Sin título'}`,
              date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              amount: data.totalAmount ? `$${data.totalAmount.toLocaleString()}` : 'No especificado'
            });
          }
        });
        
        // Inspeccionar también las solicitudes
        try {
          console.log("Obteniendo todas las solicitudes para inspección...");
          const allRequestsQuery = query(
            collection(db, "solicitud"),
            limit(10)
          );
          
          const allRequestsSnapshot = await getDocs(allRequestsQuery);
          console.log(`Encontradas ${allRequestsSnapshot.size} solicitudes totales`);
          
          if (allRequestsSnapshot.size > 0) {
            // Inspeccionar la primera solicitud para ver su estructura
            const firstRequest = allRequestsSnapshot.docs[0].data();
            console.log("Estructura de una solicitud:", 
              Object.keys(firstRequest).reduce((acc, key) => {
                acc[key] = typeof firstRequest[key];
                return acc;
              }, {})
            );
          }
        } catch (err) {
          console.log("Error inspeccionando solicitudes:", err);
        }
        
        // Intentamos con todos los posibles campos
        const requestsQuery = query(
          collection(db, "solicitud"),
          limit(15)
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        console.log(`Procesando ${requestsSnapshot.size} solicitudes`);
        
        requestsSnapshot.forEach(doc => {
          const data = doc.data();
          // Filtrar solo solicitudes del usuario actual
          const isUserRequest = 
            data.userId === user.uid || 
            data.userId === user.email ||
            data.userName === user.displayName;
            
          if (isUserRequest || requestsSnapshot.size <= 5) {  // Si hay pocas, mostrar todas
            // Agregar la solicitud creada
            activities.push({
              id: doc.id,
              type: 'request_created',
              title: 'Solicitud creada',
              description: data.title || 'Sin título',
              date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              amount: data.budget ? `$${data.budget.toLocaleString()}` : 'No especificado'
            });
            
            // Agregar cambios de estado si existen
            if (data.deliveryStatus && data.statusUpdatedAt) {
              const statusText = 
                data.deliveryStatus === 'pendiente' ? 'Pendiente' :
                data.deliveryStatus === 'enviado' ? 'Enviado' :
                data.deliveryStatus === 'en_camino' ? 'En camino' :
                data.deliveryStatus === 'entregado' ? 'Entregado' :
                data.deliveryStatus;
                
              activities.push({
                id: doc.id + "_status",
                type: 'status_change',
                title: `Estado actualizado: ${statusText}`,
                description: `${data.title || 'Solicitud'} - ${data.statusNote || 'Sin notas adicionales'}`,
                date: data.statusUpdatedAt instanceof Timestamp ? data.statusUpdatedAt.toDate() : new Date(data.statusUpdatedAt),
                amount: null
              });
            }
          }
        });
        
        // Mensajes recientes - revisar campos para sender y receiver
        const messagesQuery = query(
          collection(db, "messages"),
          where("userId", "in", [user.uid, user.email]),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        
        // Intentar también buscar mensajes donde el usuario es el receptor o el emisor
        const messagesAlternateQuery = query(
          collection(db, "messages"),
          where("recipientId", "in", [user.uid, user.email]),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        
        try {
          // Intentar con la primera consulta
          const messagesSnapshot = await getDocs(messagesQuery);
          messagesSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'message',
              title: 'Mensaje nuevo',
              description: `De: ${data.senderName || 'Usuario'} - ${data.text ? (data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '')) : 'Sin contenido'}`,
              date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
              amount: null
            });
          });
          
          // Intentar con la consulta alternativa
          const messagesAltSnapshot = await getDocs(messagesAlternateQuery);
          messagesAltSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              type: 'message',
              title: 'Mensaje nuevo',
              description: `De: ${data.senderName || 'Usuario'} - ${data.text ? (data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '')) : 'Sin contenido'}`,
              date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
              amount: null
            });
          });
          
          // Intenta obtener todos los mensajes si las consultas anteriores no funcionan
          if (messagesSnapshot.empty && messagesAltSnapshot.empty) {
            console.log("Intentando buscar todos los mensajes...");
            const allMessagesQuery = query(
              collection(db, "messages"),
              orderBy("createdAt", "desc"),
              limit(10)
            );
            const allMessagesSnapshot = await getDocs(allMessagesQuery);
            console.log(`Encontrados ${allMessagesSnapshot.size} mensajes generales`);
            
            allMessagesSnapshot.forEach(doc => {
              const data = doc.data();
              // Comprobar si el mensaje está relacionado con el usuario actual
              if (data.text && (
                  (data.userId === user.uid) || 
                  (data.senderId === user.uid) || 
                  (data.recipientId === user.uid) ||
                  (data.userId === user.email) ||
                  (data.senderId === user.email) || 
                  (data.recipientId === user.email)
              )) {
                activities.push({
                  id: doc.id,
                  type: 'message',
                  title: 'Mensaje nuevo',
                  description: `De: ${data.senderName || 'Usuario'} - ${data.text.substring(0, 30) + (data.text.length > 30 ? '...' : '')}`,
                  date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
                  amount: null
                });
              }
            });
          }
        } catch (err) {
          console.log("No messages found or error:", err);
        }
        
        // Ordenar todas las actividades por fecha
        activities.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date(a.date);
          const dateB = b.date instanceof Date ? b.date : new Date(b.date);
          return dateB - dateA;
        });
        
        // Log para depuración
        console.log(`Se encontraron ${activities.length} actividades en total:`, 
          {
            quotes: activities.filter(a => a.type === 'quote_received').length,
            requests: activities.filter(a => a.type === 'request_created').length,
            status_changes: activities.filter(a => a.type === 'status_change').length,
            messages: activities.filter(a => a.type === 'message').length
          }
        );
        
        // Actualizar el estado
        setRecentActivity(activities.slice(0, 5)); // Mostrar solo las 5 más recientes
      } catch (error) {
        console.error("Error al cargar la actividad reciente:", error);
      } finally {
        setIsLoadingActivity(false);
      }
    };
    
    fetchRecentActivity();
  }, []);

  // Función para calcular logros basados en actividad y datos del usuario
  useEffect(() => {
    const calculateAchievements = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) return;
      
      setIsLoadingAchievements(true);
      
      try {
        const userAchievements = [];
        const userRef = doc(db, "users", user.uid);
        const userData = await getDoc(userRef);
        
        if (userData.exists()) {
          const data = userData.data();
          
          // Logro por completar pedidos
          if (data.completedJobs && data.completedJobs > 0) {
            let completionAchievement = {
              id: 1,
              icon: Award,
              color: 'text-yellow-600',
              title: '',
              description: ''
            };
            
            if (data.completedJobs >= 100) {
              completionAchievement.title = 'Cliente Premium';
              completionAchievement.description = 'Más de 100 proyectos completados';
            } else if (data.completedJobs >= 50) {
              completionAchievement.title = 'Cliente Frecuente';
              completionAchievement.description = 'Más de 50 proyectos completados';
            } else if (data.completedJobs >= 10) {
              completionAchievement.title = 'Cliente Activo';
              completionAchievement.description = 'Más de 10 proyectos completados';
            } else {
              completionAchievement.title = 'Primer Proyecto';
              completionAchievement.description = 'Completó su primer proyecto';
            }
            
            userAchievements.push(completionAchievement);
          }
          
          // Logro por calificación
          if (data.rating && data.rating > 0) {
            let ratingAchievement = {
              id: 2,
              icon: Star,
              color: 'text-blue-600',
              title: '',
              description: ''
            };
            
            if (data.rating >= 4.5) {
              ratingAchievement.title = 'Excelencia';
              ratingAchievement.description = 'Rating superior a 4.5 estrellas';
            } else if (data.rating >= 4.0) {
              ratingAchievement.title = 'Calidad Comprobada';
              ratingAchievement.description = 'Rating superior a 4.0 estrellas';
            } else if (data.rating >= 3.5) {
              ratingAchievement.title = 'Buen Servicio';
              ratingAchievement.description = 'Rating superior a 3.5 estrellas';
            }
            
            userAchievements.push(ratingAchievement);
          }
          
          // Logro por antigüedad
          if (data.joinDate || user.metadata?.creationTime) {
            const joinDate = data.joinDate ? new Date(data.joinDate) : new Date(user.metadata.creationTime);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + now.getMonth() - joinDate.getMonth();
            
            if (monthsDiff >= 1) {
              let loyaltyAchievement = {
                id: 3,
                icon: User,
                color: 'text-green-600',
                title: '',
                description: ''
              };
              
              if (monthsDiff >= 12) {
                loyaltyAchievement.title = 'Veterano';
                loyaltyAchievement.description = 'Miembro por más de 1 año';
              } else if (monthsDiff >= 6) {
                loyaltyAchievement.title = 'Miembro Leal';
                loyaltyAchievement.description = 'Miembro por más de 6 meses';
              } else if (monthsDiff >= 3) {
                loyaltyAchievement.title = 'Miembro Activo';
                loyaltyAchievement.description = 'Miembro por más de 3 meses';
              } else {
                loyaltyAchievement.title = 'Nuevo Miembro';
                loyaltyAchievement.description = 'Bienvenido a la plataforma';
              }
              
              userAchievements.push(loyaltyAchievement);
            }
          }
          
          // Logro por actividad en mensajes
          const messagesQuery = query(
            collection(db, "messages"),
            where("userId", "==", user.uid),
            limit(100)
          );
          
          const messagesSnapshot = await getDocs(messagesQuery);
          
          if (!messagesSnapshot.empty) {
            const messageCount = messagesSnapshot.size;
            
            if (messageCount > 0) {
              let communicationAchievement = {
                id: 4,
                icon: MessageSquare,
                color: 'text-purple-600',
                title: '',
                description: ''
              };
              
              if (messageCount >= 50) {
                communicationAchievement.title = 'Comunicador Experto';
                communicationAchievement.description = 'Más de 50 mensajes enviados';
              } else if (messageCount >= 25) {
                communicationAchievement.title = 'Comunicador Activo';
                communicationAchievement.description = 'Más de 25 mensajes enviados';
              } else if (messageCount >= 10) {
                communicationAchievement.title = 'Buen Comunicador';
                communicationAchievement.description = 'Más de 10 mensajes enviados';
              } else {
                communicationAchievement.title = 'Comunicador';
                communicationAchievement.description = 'Ha comenzado a utilizar mensajes';
              }
              
              userAchievements.push(communicationAchievement);
            }
          }
          
          // Logro por créditos acumulados
          if (data.credits && data.credits > 0) {
            let creditsAchievement = {
              id: 5,
              icon: CreditCard,
              color: 'text-amber-600',
              title: '',
              description: ''
            };
            
            if (data.credits >= 1000) {
              creditsAchievement.title = 'Gran Inversor';
              creditsAchievement.description = 'Más de 1000 créditos acumulados';
            } else if (data.credits >= 500) {
              creditsAchievement.title = 'Inversor Frecuente';
              creditsAchievement.description = 'Más de 500 créditos acumulados';
            } else if (data.credits >= 100) {
              creditsAchievement.title = 'Inversor Activo';
              creditsAchievement.description = 'Más de 100 créditos acumulados';
            } else {
              creditsAchievement.title = 'Primer Inversión';
              creditsAchievement.description = 'Ha comenzado a utilizar créditos';
            }
            
            userAchievements.push(creditsAchievement);
          }
        }
        
        // Si no se encontraron logros, agregar algunos por defecto
        if (userAchievements.length === 0) {
          userAchievements.push({ 
            id: 1, 
            title: 'Nuevo Usuario', 
            description: 'Bienvenido a la plataforma', 
            icon: User, 
            color: 'text-blue-600' 
          });
        }
        
        setAchievements(userAchievements);
      } catch (error) {
        console.error("Error al calcular logros:", error);
        // Si hay error, mostrar logros por defecto
        setAchievements([
          { id: 1, title: 'Nuevo Usuario', description: 'Bienvenido a la plataforma', icon: User, color: 'text-blue-600' },
        ]);
      } finally {
        setIsLoadingAchievements(false);
      }
    };
    
    calculateAchievements();
  }, []);

  // Estado para mostrar el mensaje de sugerencia de ubicación
  const [showLocationTip, setShowLocationTip] = useState(false);
  
  // Efecto para mostrar el tip después de un tiempo cuando se activa el modo edición
  useEffect(() => {
    if (isEditing) {
      // Solo mostrar el tip si no hay datos de ubicación ya establecidos
      const hasLocationData = profileData.ubicompleta.ciudad || 
                             profileData.ubicompleta.localidad || 
                             profileData.ubicompleta.barrio || 
                             profileData.ubicompleta.numeroCasa;
      
      if (!hasLocationData) {
        // Mostrar el tip después de 2 segundos
        const timer = setTimeout(() => {
          setShowLocationTip(true);
        }, 2000);
        
        // Ocultar el tip después de 10 segundos
        const hideTimer = setTimeout(() => {
          setShowLocationTip(false);
        }, 12000);
        
        return () => {
          clearTimeout(timer);
          clearTimeout(hideTimer);
        };
      }
    } else {
      setShowLocationTip(false);
    }
  }, [isEditing, profileData.ubicompleta]);

  // Guardar cambios en Firestore
  const handleSave = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      
      // Actualizar campos de ubicación
      const updatedProfileData = {
        ...profileData,
        email: profileData.email || user.email,
        joinDate: profileData.joinDate || (user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString().slice(0,10) : ''),
        avatar: profileData.avatar || '',
        // Si hay datos en ubicompleta, actualizar la ubicación general también
        location: profileData.location || 
          [
            profileData.ubicompleta.ciudad, 
            profileData.ubicompleta.localidad, 
            profileData.ubicompleta.barrio
          ].filter(Boolean).join(', ')
      };
      
      // Guardar en Firestore
      await setDoc(userRef, updatedProfileData, { merge: true });
      setIsEditing(false);
      setShowLocationTip(false);
    }
  };

  // Avatar Picker State
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);
  
  // Estado para controlar la geolocalización
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Opciones de avatar usando enlaces públicos (Google, Unsplash, etc.)
  useEffect(() => {
    setAvatarOptions([
      // Avatares cartoon de profesiones y oficios (constructor, electricista, plomero, pintor, carpintero, etc.)
      // Puedes cambiar los seeds para más variedad
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Constructor',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Electricista',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Plomero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Pintor',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Carpintero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Albañil',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Jardinero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Soldador',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Herrero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Chofer',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Fontanero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Tecnico',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Ingeniero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Arquitecto',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Maestro',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Ayudante',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Supervisor',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Cliente',
      // Temáticos ferry/mar
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Ferry',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Barco',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Marinero',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Capitan',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Ola',
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Faro',
    ]);
  }, []);

  const handleAvatarSelect = async (url: string) => {
    setProfileData(prev => ({ ...prev, avatar: url }));
    setShowAvatarPicker(false);
    // Guardar inmediatamente en Firestore
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { avatar: url }, { merge: true });
    }
  };

  // Estados para logros y actividad
  const [achievements, setAchievements] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  // Handler para navegación avanzada en actividad reciente
  const handleActivityClick = (activity) => {
    if (activity.type === 'quote_received' && activity.id) {
      navigate(`/quotes?quoteId=${activity.id}`);
    } else if (activity.type === 'request_created' && activity.id) {
      navigate(`/requests?id=${activity.id}`);
    } else if (activity.type === 'message' && activity.id) {
      navigate(`/messages?messageId=${activity.id}`);
    } else {
      // Por defecto, no navega o puedes agregar más casos
    }
  };
  
  // Función para obtener la ubicación actual del usuario
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La geolocalización no está soportada por tu navegador");
      return;
    }
    
    setIsGettingLocation(true);
    setLocationError("");
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Crear enlace de Google Maps con las coordenadas
          const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          
          // Intentar obtener la dirección usando la API de geocodificación inversa
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          );
          
          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            
            // Actualizar el estado con la información de ubicación
            setProfileData(prev => ({
              ...prev,
              ubicompleta: {
                ...prev.ubicompleta,
                ciudad: address.city || address.town || address.village || address.state || '',
                localidad: address.suburb || address.county || '',
                barrio: address.neighbourhood || address.suburb || '',
                numeroCasa: [address.road, address.house_number].filter(Boolean).join(' ') || '',
                especificaciones: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                enlaceGoogleMaps: googleMapsLink
              },
              location: [
                address.city || address.town || address.village || '', 
                address.state || '',
                address.country || ''
              ].filter(Boolean).join(', ')
            }));
          } else {
            // Si falla la geocodificación inversa, al menos guardar las coordenadas y el enlace
            setProfileData(prev => ({
              ...prev,
              ubicompleta: {
                ...prev.ubicompleta,
                especificaciones: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                enlaceGoogleMaps: googleMapsLink
              }
            }));
          }
          
          setIsGettingLocation(false);
        } catch (error) {
          console.error("Error al obtener la dirección:", error);
          setLocationError("Error al convertir las coordenadas en dirección");
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error de geolocalización:", error);
        if (error.code === 1) {
          // Permiso denegado - proporcionar instrucciones específicas según el navegador
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const browser = navigator.userAgent.indexOf('Chrome') > -1 ? 'Chrome' : 
                         navigator.userAgent.indexOf('Firefox') > -1 ? 'Firefox' :
                         navigator.userAgent.indexOf('Safari') > -1 ? 'Safari' :
                         navigator.userAgent.indexOf('Edge') > -1 ? 'Edge' : 'su navegador';
          
          let instructionText = "Para habilitar el permiso de ubicación: ";
          
          if (isMobile) {
            instructionText += "Ve a Configuración > Privacidad > Ubicación > Permitir para este sitio.";
          } else if (browser === 'Chrome') {
            instructionText += "Haga clic en el icono del candado en la barra de direcciones, luego cambie el permiso de ubicación a 'Permitir'.";
          } else if (browser === 'Firefox') {
            instructionText += "Haga clic en el icono del escudo en la barra de direcciones y cambie el permiso de ubicación.";
          } else if (browser === 'Edge') {
            instructionText += "Haga clic en el icono del candado en la barra de direcciones y cambie el permiso de ubicación a 'Permitir'.";
          } else {
            instructionText += "Compruebe la configuración de permisos de ubicación en su navegador y permita el acceso para este sitio.";
          }
          
          setLocationError(`Has denegado el permiso de ubicación. ${instructionText}`);
        } else {
          setLocationError("No se pudo obtener tu ubicación. Comprueba tu conexión y que el GPS esté activado.");
        }
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-gradient-primary h-32 relative">
              <button className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
                onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                <span>Editar</span>
              </button>
            </div>
            <div className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-12">
                <div className="relative">
                  <img
                    src={profileData.avatar ? profileData.avatar : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"}
                    alt={profileData.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full shadow-lg transition-colors"
                    onClick={() => setShowAvatarPicker(true)}
                  >
                    <Camera size={16} />
                  </button>
                  {/* Avatar Picker Modal */}
                  {showAvatarPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                      <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full relative">
                        <button
                          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowAvatarPicker(false)}
                        >
                          ✕
                        </button>
                        <h3 className="text-lg font-bold mb-4 text-center">Elige tu avatar</h3>
                        <div className="grid grid-cols-4 gap-4 max-h-80 overflow-y-auto">
                          {avatarOptions.map((url) => (
                            <button
                              key={url}
                              className={`rounded-full border-4 transition-all duration-150 focus:outline-none ${profileData.avatar === url ? 'border-primary-500 scale-110' : 'border-transparent'}`}
                              onClick={() => handleAvatarSelect(url)}
                            >
                              <img
                                src={url}
                                alt={url}
                                className="w-20 h-20 object-cover rounded-full"
                              />
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">Puedes subir tus propios avatares a <b>public/avatars/</b></p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left sm:ml-6 mt-4 sm:mt-0 flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
                  <p className="text-lg text-gray-600">{profileData.profession}</p>
                  <div className="flex items-center justify-center sm:justify-start space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{profileData.rating}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {profileData.completedJobs > 0 && `${profileData.completedJobs} proyectos completados`}
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 text-center">
                  <div className="bg-primary-50 rounded-lg p-4">
                    <CreditCard className="w-6 h-6 text-primary-600 mx-auto mb-1" />
                    <p className="text-sm text-gray-600">Créditos</p>
                    <p className="text-xl font-bold text-primary-600">${profileData.credits.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Contact Information */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Información Personal</h2>
                <button 
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="bg-primary-50 hover:bg-primary-100 text-primary-600 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Edit3 size={16} />
                  <span>{isEditing ? 'Guardar' : 'Editar'}</span>
                </button>
              </div>
              {isEditing ? (
                <form className="space-y-4 relative">
                  {/* Mensaje flotante de sugerencia de ubicación */}
                  {showLocationTip && (
                    <div className="absolute right-0 -top-20 z-10 bg-white rounded-lg shadow-xl border border-primary-100 p-3 w-64 animate-bounce">
                      <button 
                        onClick={() => setShowLocationTip(false)}
                        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="flex items-start space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <div>
                          <p className="font-medium text-sm text-gray-800">¡Consejo rápido!</p>
                          <p className="text-xs text-gray-600 mt-1">Usa el nuevo botón "Obtener Mi Ubicación" para completar todos los campos automáticamente.</p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => {
                            setShowLocationTip(false);
                            // Desplazar a la sección de ubicación
                            document.querySelector('.border-primary-200')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                        >
                          Mostrarme dónde →
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <input className="w-full border rounded p-2" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} placeholder="Nombre" />
                  <input className="w-full border rounded p-2" value={profileData.profession} onChange={e => setProfileData({ ...profileData, profession: e.target.value })} placeholder="Profesión" />
                  <input className="w-full border rounded p-2" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} placeholder="Email" />
                  <input className="w-full border rounded p-2" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} placeholder="Teléfono" />
                  
                  {/* Ubicación simple (mantener para compatibilidad) */}
                  <input className="w-full border rounded p-2" value={profileData.location} onChange={e => setProfileData({ ...profileData, location: e.target.value })} placeholder="Ubicación (General)" />
                  
                  {/* Información de ubicación detallada - Versión Avanzada */}
                  <div className="border-2 border-primary-200 rounded-lg p-5 space-y-4 bg-gradient-to-br from-white to-primary-50 shadow-md relative">
                    {/* Banner informativo superior si hay datos de geolocalización */}
                    {profileData.ubicompleta.enlaceGoogleMaps && (
                      <div className="absolute -top-3 right-4 bg-green-100 border border-green-200 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Ubicación detectada
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between border-b pb-3 border-primary-100">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-medium text-primary-700">Ubicación Detallada</h3>
                      </div>
                      
                      {/* Badge de "Nueva Característica" */}
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full uppercase tracking-wide font-semibold shadow-sm">
                        Nueva función
                      </span>
                    </div>
                    
                    {/* Ciudad con icono y tooltip */}
                    <div className="relative group">
                      <div className="flex items-center">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <input 
                          className="w-full border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 pl-10 transition-colors" 
                          value={profileData.ubicompleta.ciudad} 
                          onChange={e => setProfileData({ 
                            ...profileData, 
                            ubicompleta: {...profileData.ubicompleta, ciudad: e.target.value} 
                          })} 
                          placeholder="Ciudad" 
                        />
                      </div>
                      <span className="absolute left-0 -bottom-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
                        Ingrese el nombre de su ciudad
                      </span>
                    </div>
                    
                    {/* Localidad con icono y tooltip */}
                    <div className="relative group">
                      <div className="flex items-center">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <input 
                          className="w-full border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 pl-10 transition-colors" 
                          value={profileData.ubicompleta.localidad} 
                          onChange={e => setProfileData({ 
                            ...profileData, 
                            ubicompleta: {...profileData.ubicompleta, localidad: e.target.value} 
                          })} 
                          placeholder="Localidad" 
                        />
                      </div>
                      <span className="absolute left-0 -bottom-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
                        Ingrese su localidad o municipio
                      </span>
                    </div>
                    
                    {/* Barrio con icono y tooltip */}
                    <div className="relative group">
                      <div className="flex items-center">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </div>
                        <input 
                          className="w-full border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 pl-10 transition-colors" 
                          value={profileData.ubicompleta.barrio} 
                          onChange={e => setProfileData({ 
                            ...profileData, 
                            ubicompleta: {...profileData.ubicompleta, barrio: e.target.value} 
                          })} 
                          placeholder="Barrio" 
                        />
                      </div>
                      <span className="absolute left-0 -bottom-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
                        Ingrese el nombre de su barrio o colonia
                      </span>
                    </div>
                    
                    {/* Número/Dirección con icono y tooltip */}
                    <div className="relative group">
                      <div className="flex items-center">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <input 
                          className="w-full border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 pl-10 transition-colors" 
                          value={profileData.ubicompleta.numeroCasa} 
                          onChange={e => setProfileData({ 
                            ...profileData, 
                            ubicompleta: {...profileData.ubicompleta, numeroCasa: e.target.value} 
                          })} 
                          placeholder="Número/Dirección (Calle y número)" 
                        />
                      </div>
                      <span className="absolute left-0 -bottom-5 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2">
                        Ingrese su dirección completa con número
                      </span>
                    </div>
                    
                    {/* Especificaciones adicionales */}
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 flex items-center space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Especificaciones adicionales</span>
                      </label>
                      <textarea 
                        className="w-full border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 transition-colors" 
                        value={profileData.ubicompleta.especificaciones} 
                        onChange={e => setProfileData({ 
                          ...profileData, 
                          ubicompleta: {...profileData.ubicompleta, especificaciones: e.target.value} 
                        })} 
                        placeholder="Referencias adicionales, puntos de referencia, piso, etc." 
                        rows={2} 
                      />
                    </div>
                    
                    {/* Enlace de Google Maps con previsualización */}
                    <div className="space-y-3 pt-2 border-t border-primary-100">
                      <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M12 2C7.59 2 4 5.59 4 10c0 3.97 3.14 7.13 7 9.33V22h2v-2.67c3.86-2.2 7-5.36 7-9.33 0-4.41-3.59-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-base">Enlace de Google Maps</span>
                        <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">Recomendado</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <input 
                          className="flex-1 border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-md p-2 transition-colors" 
                          value={profileData.ubicompleta.enlaceGoogleMaps} 
                          onChange={e => setProfileData({ 
                            ...profileData, 
                            ubicompleta: {...profileData.ubicompleta, enlaceGoogleMaps: e.target.value} 
                          })} 
                          placeholder="https://maps.google.com/?q=..." 
                        />
                        <button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors flex items-center space-x-1"
                          onClick={() => window.open('https://www.google.com/maps', '_blank')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Abrir Maps</span>
                        </button>
                      </div>
                      
                      {/* Previsualización del mapa (si hay enlace) */}
                      {profileData.ubicompleta.enlaceGoogleMaps && (
                        <div className="mt-2 border rounded-lg overflow-hidden bg-gray-100 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <MapPin className="w-6 h-6 text-red-500 mx-auto animate-bounce" />
                              <p className="text-sm text-gray-600 mt-1">Vista previa del mapa disponible al guardar</p>
                              <a 
                                href={profileData.ubicompleta.enlaceGoogleMaps}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="mt-2 inline-flex items-center px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-medium rounded-md transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Previsualizar enlace
                              </a>
                            </div>
                          </div>
                          <div className="h-36"></div>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 italic">
                        Copie y pegue la URL de Google Maps para facilitar la ubicación exacta de su dirección. Esto ayudará a las empresas a encontrarlo más fácilmente.
                      </p>
                    </div>
                    
                    {/* Se eliminó la sección de "Usa tu ubicación actual" y geolocalización automática */}
                  </div>

                  <input className="w-full border rounded p-2" type="number" value={profileData.credits} onChange={e => setProfileData({ ...profileData, credits: Number(e.target.value) })} placeholder="Créditos" />
                  <input className="w-full border rounded p-2" type="number" value={profileData.rating} onChange={e => setProfileData({ ...profileData, rating: Number(e.target.value) })} placeholder="Rating" />
                  <input className="w-full border rounded p-2" type="number" value={profileData.completedJobs} onChange={e => setProfileData({ ...profileData, completedJobs: Number(e.target.value) })} placeholder="Proyectos completados" />
                  <input className="w-full border rounded p-2" value={profileData.joinDate} onChange={e => setProfileData({ ...profileData, joinDate: e.target.value })} placeholder="Miembro desde" />
                  <textarea className="w-full border rounded p-2" value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} placeholder="Acerca de mí" rows={3} />
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{profileData.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium">{profileData.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Ubicación</p>
                      <p className="font-medium">{profileData.location}</p>
                      
                      {/* Mostrar información detallada de ubicación si existe - Vista Avanzada */}
                      {(profileData.ubicompleta.ciudad || 
                        profileData.ubicompleta.localidad || 
                        profileData.ubicompleta.barrio || 
                        profileData.ubicompleta.numeroCasa) && (
                        <div className="mt-3 text-sm">
                          <details className="cursor-pointer group" open>
                            <summary className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
                              <span className="mr-2">Detalles de ubicación</span>
                              <span className="transition-transform group-open:rotate-180">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </summary>
                            <div className="mt-3 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Columna izquierda - Dirección completa */}
                                <div className="space-y-2">
                                  <h4 className="font-medium text-gray-900 flex items-center space-x-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Dirección completa</span>
                                  </h4>

                                  <div className="flex flex-col space-y-1 pl-5 border-l-2 border-primary-200">
                                    {profileData.ubicompleta.ciudad && (
                                      <div className="flex items-center">
                                        <span className="text-gray-500 mr-2">Ciudad:</span>
                                        <span className="font-medium">{profileData.ubicompleta.ciudad}</span>
                                      </div>
                                    )}
                                    
                                    {profileData.ubicompleta.localidad && (
                                      <div className="flex items-center">
                                        <span className="text-gray-500 mr-2">Localidad:</span>
                                        <span className="font-medium">{profileData.ubicompleta.localidad}</span>
                                      </div>
                                    )}
                                    
                                    {profileData.ubicompleta.barrio && (
                                      <div className="flex items-center">
                                        <span className="text-gray-500 mr-2">Barrio:</span>
                                        <span className="font-medium">{profileData.ubicompleta.barrio}</span>
                                      </div>
                                    )}
                                    
                                    {profileData.ubicompleta.numeroCasa && (
                                      <div className="flex items-center">
                                        <span className="text-gray-500 mr-2">Dirección:</span>
                                        <span className="font-medium">{profileData.ubicompleta.numeroCasa}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {profileData.ubicompleta.especificaciones && (
                                    <div className="mt-2">
                                      <h4 className="text-sm font-medium text-gray-700">Especificaciones adicionales:</h4>
                                      <p className="mt-1 bg-white p-2 rounded border border-gray-100 text-gray-600 italic">
                                        "{profileData.ubicompleta.especificaciones}"
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Columna derecha - Mapa o enlace */}
                                <div className="flex flex-col">
                                  {profileData.ubicompleta.enlaceGoogleMaps ? (
                                    <>
                                      <h4 className="font-medium text-gray-900 flex items-center space-x-1 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                          <path fillRule="evenodd" d="M12 2C7.59 2 4 5.59 4 10c0 3.97 3.14 7.13 7 9.33V22h2v-2.67c3.86-2.2 7-5.36 7-9.33 0-4.41-3.59-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" clipRule="evenodd" />
                                        </svg>
                                        <span>Ubicación en mapa</span>
                                      </h4>
                                      
                                      <div className="flex-1 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative min-h-[120px]">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="p-4 text-center">
                                            <MapPin className="h-6 w-6 text-red-500 mx-auto mb-2" />
                                            <a 
                                              href={profileData.ubicompleta.enlaceGoogleMaps} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                              </svg>
                                              Ver en Google Maps
                                            </a>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
                                      <div className="text-center text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        <p className="text-sm">No se ha agregado enlace al mapa</p>
                                        <p className="text-xs mt-1">Edita tu perfil para agregar un enlace de Google Maps</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Indicador de calidad de la dirección */}
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Calidad de la información:</span>
                                  <div className="flex items-center">
                                    {(() => {
                                      // Calcular cuántos campos están completos
                                      const fieldsComplete = [
                                        profileData.ubicompleta.ciudad,
                                        profileData.ubicompleta.localidad,
                                        profileData.ubicompleta.barrio,
                                        profileData.ubicompleta.numeroCasa,
                                        profileData.ubicompleta.enlaceGoogleMaps
                                      ].filter(Boolean).length;
                                      
                                      const percentage = Math.min(100, Math.round((fieldsComplete / 5) * 100));
                                      const color = percentage < 40 ? 'bg-red-500' : 
                                                    percentage < 70 ? 'bg-yellow-500' : 
                                                    'bg-green-500';
                                      
                                      return (
                                        <>
                                          <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                                            <div 
                                              className={`h-full rounded-full ${color}`} 
                                              style={{ width: `${percentage}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-sm font-medium">
                                            {percentage}%
                                          </span>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Miembro desde</p>
                      <p className="font-medium">{profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString() : ''}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Acerca de mí</h3>
                <p className="text-gray-600 leading-relaxed">{profileData.bio}</p>
              </div>
            </div>
            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Logros</h2>
              <div className="space-y-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div key={achievement.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Icon className={`w-6 h-6 ${achievement.color} mt-1`} />
                      <div>
                        <h3 className="font-medium text-gray-900">{achievement.title}</h3>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-md p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
              <button className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1">
                <History size={16} />
                <span>Ver todo</span>
              </button>
            </div>
            <div className="space-y-4">
              {isLoadingActivity ? (
                // Loading state
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600">Cargando actividad reciente...</p>
                </div>
              ) : recentActivity.length > 0 ? (
                // Activity items
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleActivityClick(activity)}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        activity.type === 'quote_received' ? 'bg-green-100' :
                        activity.type === 'request_created' ? 'bg-blue-100' :
                        activity.type === 'message' ? 'bg-indigo-100' :
                        activity.type === 'credits_added' ? 'bg-yellow-100' : 'bg-primary-100'
                      }`}>
                        {activity.type === 'quote_received' && <MessageSquare className="w-6 h-6 text-green-600" />}
                        {activity.type === 'request_created' && <User className="w-6 h-6 text-blue-600" />}
                        {activity.type === 'message' && <Mail className="w-6 h-6 text-indigo-600" />}
                        {activity.type === 'credits_added' && <CreditCard className="w-6 h-6 text-yellow-600" />}
                        {!['quote_received', 'request_created', 'message', 'credits_added'].includes(activity.type) && 
                          <History className="w-6 h-6 text-primary-600" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-400">
                          {activity.date instanceof Date 
                            ? activity.date.toLocaleDateString() 
                            : new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <div className="text-right">
                        <p className={`font-semibold ${
                          activity.amount.startsWith('+') ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {activity.amount}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // No activity state
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay actividad reciente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Profile;
