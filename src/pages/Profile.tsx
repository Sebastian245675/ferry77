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
    rating: 0,
    completedJobs: 0,
    joinDate: '',
    credits: 0,
    bio: '',
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
          rating: data.rating || 0,
          completedJobs: data.completedJobs || 0,
          joinDate: data.joinDate || (user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString().slice(0,10) : ''),
          credits: data.credits || 0,
          bio: data.bio || '',
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
          limit(10)
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
            activities.push({
              id: doc.id,
              type: 'request_created',
              title: 'Solicitud creada',
              description: data.title || 'Sin título',
              date: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
              amount: data.budget ? `$${data.budget.toLocaleString()}` : 'No especificado'
            });
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

  // Guardar cambios en Firestore
  const handleSave = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        ...profileData,
        email: profileData.email || user.email,
        joinDate: profileData.joinDate || (user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString().slice(0,10) : ''),
      }, { merge: true });
      setIsEditing(false);
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
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
                    alt={profileData.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <button className="absolute bottom-0 right-0 bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full shadow-lg transition-colors">
                    <Camera size={16} />
                  </button>
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
                <form className="space-y-4">
                  <input className="w-full border rounded p-2" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} placeholder="Nombre" />
                  <input className="w-full border rounded p-2" value={profileData.profession} onChange={e => setProfileData({ ...profileData, profession: e.target.value })} placeholder="Profesión" />
                  <input className="w-full border rounded p-2" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} placeholder="Email" />
                  <input className="w-full border rounded p-2" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} placeholder="Teléfono" />
                  <input className="w-full border rounded p-2" value={profileData.location} onChange={e => setProfileData({ ...profileData, location: e.target.value })} placeholder="Ubicación" />
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
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Ubicación</p>
                      <p className="font-medium">{profileData.location}</p>
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
