import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, getDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { DeliveryStatus } from "../lib/models";
import { db } from "../lib/firebase";
import { calculateTotal, getProductPrice, getQuotePrice } from "../lib/priceUtils";
import { getAuth } from "firebase/auth";
import { solicitudesAPI, SolicitudBackend, geoAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileText,
  MessageSquare,
  Star,
  Clock,
  Users,
  Euro,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  TruckIcon,
  Package,
  User,
  UserCheck,
  DollarSign,
  Truck,
  MapPin,
  Building2,
  X,
  Check,
  Calendar,
  Info,
  RefreshCw,
  Calculator,
  MessageCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/barraempresa";

interface CompanyData {
  id?: string;
  name?: string;
  companyName?: string;
  isVerified?: boolean;
  verificationRequested?: boolean;
  verificationDocumentsUploaded?: boolean;
  verificationStatus?: string;
  profileImage?: string;
  photoURL?: string;
  userId?: string;
  ubicacion?: any;
  location?: any;
  uid?: string;
  [key: string]: any;
}

interface Quote {
  id: string;
  title?: string;
  requestTitle?: string;
  clientName?: string;
  userId?: string;
  usuarioNombre?: string;
  telefono?: string; // Teléfono del usuario para WhatsApp
  totalAmount?: number;
  deliveryTime?: string;
  deliveryStatus?: string;
  status?: string;
  estadoEmpresa?: string;
  createdAt?: string | number;
  category?: string;
  urgency?: string;
  selectedCompanies?: any[];
  source?: string;
  comments?: Comment[];
  companyId?: string;
  companyName?: string;
  products?: Product[];
  items?: Product[] | any[]; // Para compatibilidad con diferentes formatos
  deliveryId?: string; // ID de la entrega asociada
  driverId?: string; // ID del repartidor asignado
  interestedDrivers?: any[]; // Lista de repartidores interesados
  amount?: number; // Para compatibilidad con totalAmount
  total?: number; // Otra forma de expresar el monto
  bidEnabled?: boolean; // Flag para habilitar pujas de repartidores
  fixedPrice?: number; // Precio fijo para la entrega cuando bidEnabled es false
  lowestBid?: number; // Puja más baja recibida cuando bidEnabled es true
  highestBid?: number; // Puja más alta recibida cuando bidEnabled es true
  bids?: any[]; // Lista de pujas recibidas
  [key: string]: any; // Para capturar cualquier otro campo
}

interface Product {
  id?: string;
  name: string;
  image?: string;
  imageUrl?: string; // Alternativa a image
  img?: string; // Otra alternativa común
  photo?: string; // Otra posible alternativa
  photoUrl?: string; // Otra posible alternativa
  quantity?: number;
  cantidad?: number; // Alternativa en español
  price?: number | string;
  precio?: number | string; // Alternativa en español
  unitPrice?: number | string; // Otra posible forma de precio
  description?: string;
  descripcion?: string; // Alternativa en español
  specifications?: string; // Usado en algunas partes
  [key: string]: any; // Para capturar cualquier otro campo
}

// Las funciones para manejar precios ahora están en priceUtils.ts

interface Comment {
  id: string;
  requestId?: string;
  userId: string;
  text: string;
  createdAt: string;
}
const DashboardEmpresas: React.FC = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const [company, setCompany] = useState<{ 
    name: string; 
    isVerified: boolean;
    verificationRequested: boolean;
    verificationDocumentsUploaded: boolean;
    verificationStatus: string; 
    profileImage: string; 
    userId: string;
    hasLocation: boolean;
    ubicacion: any;
  }>({
    name: '',
    isVerified: false,
    verificationRequested: false,
    verificationDocumentsUploaded: false,
    verificationStatus: '',
    profileImage: '',
    userId: '',
    hasLocation: false,
    ubicacion: null
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      
      try {
        console.log("🔍 Obteniendo datos de empresa desde backend para UID:", user.uid);
        
        // Primero obtener datos desde el backend MySQL
        let backendData = null;
        try {
          const response = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
          if (response.ok) {
            backendData = await response.json();
            console.log("📊 Datos del backend obtenidos:", backendData);
          } else {
            console.log("⚠️ Usuario no encontrado en backend, usando datos de Firebase");
          }
        } catch (backendError) {
          console.error("❌ Error al obtener datos del backend:", backendError);
        }
        
        // Si tenemos datos del backend, usarlos como prioritarios
        if (backendData) {
          console.log("🏗️ Usando datos del backend MySQL");
          setCompany({
            name: backendData.nombreCompleto || user.displayName || '',
            isVerified: backendData.verified || false,
            verificationRequested: false, // Este campo viene de Firebase
            verificationDocumentsUploaded: false, // Este campo viene de Firebase
            verificationStatus: backendData.verified ? 'verified' : 'pending',
            profileImage: user.photoURL || '',
            userId: user.uid,
            hasLocation: Boolean(backendData.ciudad),
            ubicacion: backendData.ciudad || null
          });
          
          console.log("✅ Estado de company actualizado desde backend:", {
            hasLocation: Boolean(backendData.ciudad),
            ubicacion: backendData.ciudad
          });
          return;
        }
        
        // Fallback a Firebase si no hay datos en backend
        console.log("📱 Fallback: obteniendo datos desde Firebase");
        const companyData: CompanyData = await getCompanyData(user.uid);
        console.log("📋 Datos de Firebase obtenidos:", companyData);
        
        if (companyData) {
          console.log("🏗️ Procesando datos de Firebase...");
          const ubicacionData = companyData.ubicacion || companyData.location || companyData.ciudad || companyData.city;
          console.log("📍 Ubicación detectada en Firebase:", ubicacionData);
          
          setCompany({
            name: companyData.name || companyData.companyName || user.displayName || '',
            isVerified: companyData.isVerified || false,
            verificationRequested: companyData.verificationRequested || false,
            verificationDocumentsUploaded: companyData.verificationDocumentsUploaded || false,
            verificationStatus: companyData.verificationStatus || '',
            profileImage: companyData.profileImage || companyData.photoURL || '',
            userId: user.uid,
            hasLocation: Boolean(ubicacionData),
            ubicacion: ubicacionData || null
          });
          
          console.log("✅ Estado de company actualizado desde Firebase:", {
            hasLocation: Boolean(ubicacionData),
            ubicacion: ubicacionData
          });
        }
      } catch (error) {
        console.error("❌ Error al obtener datos de la empresa:", error);
      }
    };
    
    fetchCompany();
  }, [user]);

  const navigate = useNavigate();
  
  // Estado para mostrar todos los pedidos activos o solo los más recientes
  const [showAllActiveOrders, setShowAllActiveOrders] = useState(false);
  const [showAllCompletedOrders, setShowAllCompletedOrders] = useState(false);
  const [showAllPendingQuotes, setShowAllPendingQuotes] = useState(false);
  const [realQuotes, setRealQuotes] = useState<Quote[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [acceptedQuotes, setAcceptedQuotes] = useState<Quote[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([]);
  const [completedQuotes, setCompletedQuotes] = useState<Quote[]>([]);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false); // Estado para controlar los botones durante el procesamiento
  const [showInterestedDrivers, setShowInterestedDrivers] = useState(false); // Estado para controlar la visualización de conductores interesados

  // Estados para el selector de ubicación
  const [cities, setCities] = useState<any[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [isSavingCity, setIsSavingCity] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Estadísticas para las tarjetas
  const stats = [
    {
      title: "Solicitudes Pendientes",
      value: pendingQuotes?.length || 0,
      bgColor: "bg-yellow-100",
      color: "text-yellow-700",
      icon: Clock,
      trend: "+5% esta semana"
    },
    {
      title: "Cotizaciones Aceptadas",
      value: acceptedQuotes?.length || 0,
      bgColor: "bg-green-100",
      color: "text-green-700",
      icon: CheckCircle,
      trend: "+12% este mes"
    },
    {
      title: "Trabajos Completados",
      value: completedQuotes?.length || 0,
      bgColor: "bg-blue-100",
      color: "text-blue-700",
      icon: Package,
      trend: "↑ 3 nuevos"
    },
    {
      title: "Clientes Atendidos",
      value: acceptedQuotes?.length > 0 ? [...new Set(acceptedQuotes.map(q => q.userId))].length : 0,
      bgColor: "bg-purple-100",
      color: "text-purple-700",
      icon: Users,
      trend: "Fidelización 85%"
    },
  ];

  // Hook para obtener y guardar la empresa real
  const getCompanyData = async (userId: string) => {
    console.log("🔍 Buscando datos para userId:", userId);
    
    // Buscar SIEMPRE en users primero para obtener companyName real
    // Probamos varias consultas para cubrir diferentes estructuras
    let userQueries = [
      query(collection(db, "users"), where("uid", "==", userId)),
      query(collection(db, "users"), where("userId", "==", userId)),
      query(collection(db, "users"), where("id", "==", userId))
    ];

    for (const q of userQueries) {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        console.log("📋 Datos de usuario encontrados:", userData);
        console.log("🌍 Campos de ubicación en userData:", {
          ubicacion: userData.ubicacion,
          location: userData.location,
          ciudad: userData.ciudad,
          city: userData.city
        });
        return {
          ...userData,
          id: querySnapshot.docs[0].id
        };
      }
    }

    // Si no se encuentra en users, intentamos en companies
    let companyQueries = [
      query(collection(db, "companies"), where("uid", "==", userId)),
      query(collection(db, "companies"), where("userId", "==", userId)),
      query(collection(db, "companies"), where("id", "==", userId))
    ];

    for (const q of companyQueries) {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const companyData = querySnapshot.docs[0].data();
        console.log("🏢 Datos de compañía encontrados:", companyData);
        console.log("🌍 Campos de ubicación en companyData:", {
          ubicacion: companyData.ubicacion,
          location: companyData.location,
          ciudad: companyData.ciudad,
          city: companyData.city
        });
        return {
          ...companyData,
          id: querySnapshot.docs[0].id
        };
      }
    }

    console.warn("⚠️ No se encontraron datos para el usuario:", userId);
    return null;
  };
  
  // Nueva función para cargar solicitudes desde el backend filtradas por ciudad
  const loadQuotesFromBackend = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      console.log("Cargando solicitudes desde backend para:", user.uid, user.displayName);

      // Obtener la ciudad de la empresa para filtrar solicitudes
      const companyCity = company.ubicacion;
      console.log("Ciudad de la empresa:", companyCity);

      // Usar backend para obtener solicitudes pendientes filtradas por ciudad
      const backendSolicitudes = await solicitudesAPI.getPendingSolicitudesByCity(companyCity);
      console.log("[loadQuotesFromBackend] Solicitudes pendientes desde backend:", backendSolicitudes.length);

      // Mapear las solicitudes del backend al formato esperado por el frontend
      const mappedSolicitudes = backendSolicitudes.map((solicitud: SolicitudBackend) => {
        return {
          id: solicitud.id.toString(),
          title: solicitud.titulo || "Sin título",
          requestTitle: solicitud.titulo || "Sin título", 
          description: `${solicitud.profesion} - ${solicitud.tipo}`,
          location: solicitud.ubicacion || "",
          status: "pendiente",
          deliveryStatus: undefined,
          createdAt: solicitud.fechaCreacion,
          userId: solicitud.usuarioId,
          usuarioNombre: solicitud.usuarioNombre || "Usuario",
          profesion: solicitud.profesion || "general",
          tipo: solicitud.tipo || "herramienta",
          presupuesto: solicitud.presupuesto || 0,
          items: solicitud.items?.map(item => ({
            name: item.nombre,
            cantidad: item.cantidad,
            especificaciones: item.especificaciones,
            imagenUrl: item.imagenUrl,
            precio: item.precio
          })) || [],
          products: solicitud.items?.map(item => ({
            name: item.nombre,
            quantity: item.cantidad,
            price: item.precio || 0
          })) || [],
          selectedCompanies: [user.uid], // Todas están disponibles para esta empresa
          source: "backend",
          // Campos adicionales necesarios para el frontend
          estadoEmpresa: undefined,
          activeForCompany: false,
          deliveryId: undefined,
          driverId: undefined
        };
      });

      console.log("Solicitudes mapeadas desde backend:", mappedSolicitudes.length);
      
      setRealQuotes(mappedSolicitudes);
      setPendingQuotes(mappedSolicitudes);
      
    } catch (error) {
      console.error("Error al cargar solicitudes desde backend:", error);
      // En caso de error, usar la función original como fallback
      loadQuotes();
    }
  };
  
  // Función para cargar solicitudes - accesible desde cualquier parte del componente
  const loadQuotes = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      console.log("Cargando solicitudes para el usuario:", user.uid, user.displayName);

      // Obtener SOLO las solicitudes pendientes (no confirmadas, no denegadas, no entregadas)
      const q = query(
        collection(db, "solicitud"),
        where("status", "not-in", ["confirmado", "denegado", "entregado"])
      );
      const querySnapshot = await getDocs(q);
      const allQuotes = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quote[];

      // Cargar información adicional de repartidores interesados para pedidos pendientes
      const quotesWithDriverInfo = await Promise.all(
        allQuotes.map(async (quote) => {
          // Si el pedido tiene un ID de entrega y está en estado pendingDriver, buscar repartidores interesados
          if (quote.deliveryId && (quote.deliveryStatus === 'pendingDriver' || quote.status === 'pendingDriver')) {
            try {
              const deliveryRef = doc(db, "deliveries", quote.deliveryId);
              const deliverySnap = await getDoc(deliveryRef);
              
              if (deliverySnap.exists()) {
                const deliveryData = deliverySnap.data();
                // Si hay repartidores interesados, obtener sus datos
                if (deliveryData.interestedDrivers && Array.isArray(deliveryData.interestedDrivers) && deliveryData.interestedDrivers.length > 0) {
                  // Cargar información de cada repartidor
                  const driversInfo = await Promise.all(
                    deliveryData.interestedDrivers.map(async (driverId: string) => {
                      const driverRef = doc(db, "users", driverId);
                      const driverSnap = await getDoc(driverRef);
                      
                      if (driverSnap.exists()) {
                        const driverData = driverSnap.data();
                        return {
                          id: driverId,
                          name: driverData.name || driverData.displayName || "Repartidor",
                          phone: driverData.phone || driverData.phoneNumber || "",
                          rating: driverData.rating || 0,
                          photo: driverData.photoURL || driverData.profileImage || ""
                        };
                      }
                      return {
                        id: driverId,
                        name: "Repartidor",
                        phone: "",
                        rating: 0,
                        photo: ""
                      };
                    })
                  );
                  
                  // Añadir información de los repartidores al pedido
                  return {
                    ...quote,
                    interestedDrivers: driversInfo
                  };
                }
              }
            } catch (error) {
              console.error(`Error al cargar información de repartidores para pedido ${quote.id}:`, error);
            }
          }
          
          return quote;
        })
      );

      console.log("Total de solicitudes encontradas:", quotesWithDriverInfo.length);

      // Mostrar todas las solicitudes para debugging
      console.log("Todas las solicitudes:", quotesWithDriverInfo.map(quote => ({
        id: quote.id,
        title: quote.title || quote.requestTitle,
        status: quote.status,
        deliveryStatus: quote.deliveryStatus,
        selectedCompanies: quote.selectedCompanies,
        products: quote.products?.length || 0,
        items: quote.items?.length || 0,
        interestedDrivers: quote.interestedDrivers?.length || 0
      })));

      // Depuración: Mostrar los pedidos que tienen deliveryId pero no les aparece la opción de publicar
      console.log("Pedidos con deliveryId:", quotesWithDriverInfo
        .filter(q => q.deliveryId)
        .map(q => ({
          id: q.id,
          title: q.title || q.requestTitle,
          status: q.status,
          deliveryStatus: q.deliveryStatus,
          estadoEmpresa: q.estadoEmpresa,
          deliveryId: q.deliveryId,
          isPublished: q.isPublished || q.published,
          driverId: q.driverId
        }))
      );
      
      // Depuración especial para identificar pedidos que necesitan botón de publicación
      console.log("PEDIDOS QUE NECESITAN BOTÓN DE PUBLICAR VIAJE:", quotesWithDriverInfo
        .filter(q => q.deliveryId && !q.driverId && (!q.isPublished && !q.published))
        .map(q => ({
          id: q.id,
          title: q.title || q.requestTitle || "Sin título",
          status: q.status || "Sin estado",
          deliveryStatus: q.deliveryStatus || "Sin estado de entrega",
          deliveryId: q.deliveryId,
          hasDeliveryId: !!q.deliveryId,
          hasDriver: !!q.driverId,
          isPublished: !!(q.isPublished || q.published),
          shouldShowButton: !!(q.deliveryId && !q.driverId && (!q.isPublished && !q.published))
        }))
      );
      
      // Depuración para pedidos con repartidor asignado
      console.log("PEDIDOS CON REPARTIDOR ASIGNADO:", quotesWithDriverInfo
        .filter(q => q.driverId || q.deliveryStatus === "driverAssigned")
        .map(q => ({
          id: q.id,
          title: q.title || q.requestTitle || "Sin título",
          status: q.status || "Sin estado",
          deliveryStatus: q.deliveryStatus || "Sin estado de entrega",
          driverId: q.driverId || "No especificado",
          isDriverAssigned: q.deliveryStatus === "driverAssigned"
        }))
      );

      // Filtrar para mostrar solo las solicitudes donde esta empresa esté seleccionada
      // y que NO estén confirmadas, denegadas o con repartidor asignado (solo las pendientes)
      const filteredPendingQuotes = quotesWithDriverInfo.filter(quote => {
        // Si ya está confirmada, denegada o con repartidor asignado, no es una solicitud pendiente
        if (quote.status === "confirmado" || 
            quote.status === "denegado" || 
            quote.deliveryStatus === "driverAssigned" || 
            quote.driverId) {
          return false;
        }
        
        // Si no hay empresas seleccionadas, verificar otros campos para backward compatibility
        if (!quote.selectedCompanies || !Array.isArray(quote.selectedCompanies) || quote.selectedCompanies.length === 0) {
          // Verificar si hay otros campos que puedan vincular esta solicitud con la empresa actual
          const hasCompanyReference = 
            quote.companyId === user.uid || 
            quote.companyName === user.displayName ||
            quote.userId === user.uid;
          
          if (hasCompanyReference) {
            console.log(`Solicitud ${quote.id} asociada a la empresa por campos alternativos`);
            return true;
          }
          
          return false;
        }
        
        // Verificar si esta empresa está en la lista de empresas seleccionadas
        const isSelected = quote.selectedCompanies.some(company => {
          if (typeof company === 'string') {
            return company === user.uid;
          }
          
          if (typeof company === 'object') {
            return (
              company.id === user.uid || 
              company.companyId === user.uid ||
              // También verificar por nombre si el ID no coincide
              (user.displayName && (
                company.companyName === user.displayName ||
                company.name === user.displayName
              ))
            );
          }
          
          return false;
        });
        
        if (isSelected) {
          console.log(`Solicitud ${quote.id} seleccionada para la empresa actual`);
        }
        
        return isSelected;
      });

      console.log("Solicitudes pendientes filtradas para la empresa:", filteredPendingQuotes.length);
      
      // Ordenar por fecha más reciente primero
      filteredPendingQuotes.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Doble verificación: asegurarse de que las solicitudes no tengan status confirmado, denegado,
      // o con repartidor asignado. Esto es crítico para que no aparezcan pedidos con repartidor en la sección pendientes.
      const strictlyPendingQuotes = filteredPendingQuotes.filter(
        quote => quote.status !== "confirmado" && 
                quote.status !== "denegado" && 
                quote.deliveryStatus !== "driverAssigned" &&
                !quote.driverId &&
                quote.estadoEmpresa !== "en_progreso" &&
                (quote.activeForCompany !== true) // También excluir los marcados explícitamente como activos
      );
      
      console.log("Solicitudes estrictamente pendientes (después de doble verificación):", strictlyPendingQuotes.length);
      
      setRealQuotes(strictlyPendingQuotes);
      setPendingQuotes(strictlyPendingQuotes);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
    }
  };
  
  // Función para obtener el nombre de la empresa del pedido
  const getCompanyName = (quote: Quote) => {
    // Si no hay empresas seleccionadas
    if (!quote.selectedCompanies || !Array.isArray(quote.selectedCompanies) || quote.selectedCompanies.length === 0) {
      return "No especificada";
    }
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return "No especificada";
    
    // Buscar la empresa que coincide con el usuario actual
    const selectedCompany = quote.selectedCompanies.find(company => {
      if (typeof company === 'string') {
        return company === user.uid;
      }
      
      if (typeof company === 'object') {
        return (
          company.id === user.uid || 
          company.companyId === user.uid ||
          // También verificar por nombre si el ID no coincide
          (user.displayName && (
            company.companyName === user.displayName ||
            company.name === user.displayName
          ))
        );
      }
      
      return false;
    });
    
    // Si no encontramos la empresa específica, usar la primera disponible
    const companyToUse = selectedCompany || quote.selectedCompanies[0];
    
    if (typeof companyToUse === 'string') {
      return companyToUse; // Si es un string, devolver directamente
    }
    
    if (companyToUse && typeof companyToUse === 'object') {
      // Intentar obtener el nombre de la empresa con fallbacks
      return companyToUse.companyName || 
             companyToUse.name || 
             companyToUse.nombreEmpresa || 
             companyToUse.empresa || 
             "Esta empresa";
    }
    
    return "No especificada";
  };

  // Función para determinar el color del badge según el estado de entrega
  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'en_camino':
        return 'bg-purple-100 text-purple-800';
      case 'entregado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el icono según el estado de entrega
  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Clock className="h-3 w-3" />;
      case 'enviado':
        return <Package className="h-3 w-3" />;
      case 'en_camino':
        return <TruckIcon className="h-3 w-3" />;
      case 'entregado':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };
  
  // Función para obtener resumen de estados
  const getStatusSummary = () => {
    const pendingCount = pendingQuotes?.length || 0;
    const activeCount = acceptedQuotes?.filter(q => 
      q.deliveryStatus !== 'entregado' && q.status !== 'entregado'
    )?.length || 0;
    const completedCount = acceptedQuotes?.filter(q => 
      q.deliveryStatus === 'entregado' || q.status === 'entregado'
    )?.length || 0;
    
    return { pending: pendingCount, active: activeCount, completed: completedCount };
  };
  
  // Función para refrescar manualmente los pedidos activos
  const refreshActiveOrders = async () => {
    try {
      setIsProcessing(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      
      console.log("[refreshActiveOrders] Actualizando pedidos activos manualmente...");
      
      // Buscar solicitudes con estado confirmado o con repartidor asignado
      const qActiveOrders = query(
        collection(db, "solicitud"),
        where("status", "==", "confirmado")
      );
      
      // Consulta para repartidores asignados - buscar por deliveryStatus
      const qDriverAssigned = query(
        collection(db, "solicitud"),
        where("deliveryStatus", "==", "driverAssigned")
      );
      
      // Consulta adicional para encontrar pedidos que tienen un driverId asignado
      const qWithDriverId = query(
        collection(db, "solicitud"),
        where("driverId", "!=", "")
      );
      
      // Consulta para pedidos activos para la empresa
      const qActiveForCompany = query(
        collection(db, "solicitud"),
        where("activeForCompany", "==", true)
      );
      
      // Ejecutar todas las consultas
      const [activeOrdersSnapshot, driverAssignedSnapshot, withDriverIdSnapshot, activeForCompanySnapshot] = await Promise.all([
        getDocs(qActiveOrders),
        getDocs(qDriverAssigned),
        getDocs(qWithDriverId),
        getDocs(qActiveForCompany)
      ]);
      
      // Combinar resultados
      const allActiveOrdersData = [
        ...activeOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...driverAssignedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...withDriverIdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...activeForCompanySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Eliminar duplicados
      const uniqueOrders = [];
      const seenIds = new Set();
      
      allActiveOrdersData.forEach(order => {
        if (!seenIds.has(order.id)) {
          seenIds.add(order.id);
          uniqueOrders.push(order);
        }
      });
      
      // Filtrar para la empresa actual
      const filteredOrders = uniqueOrders.filter(order => {
        // Verificar si el pedido pertenece a esta empresa
        if (order.companyId === user.uid) return true;
        
        // Verificar en selectedCompanies
        if (order.selectedCompanies && Array.isArray(order.selectedCompanies)) {
          return order.selectedCompanies.some(company => {
            if (typeof company === 'string') return company === user.uid;
            if (typeof company === 'object') {
              return company.id === user.uid || company.companyId === user.uid;
            }
            return false;
          });
        }
        
        return false;
      });
      
      console.log(`[refreshActiveOrders] Encontrados ${filteredOrders.length} pedidos activos`);
      
      // Actualizar el estado
      setAcceptedQuotes(filteredOrders);
      
    } catch (error) {
      console.error("Error al refrescar pedidos activos:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cargar solicitudes cuando el componente se monta
  useEffect(() => {
    console.log("==========================================");
    console.log("INICIANDO CARGA DE SOLICITUDES Y PEDIDOS");
    console.log("==========================================");
    loadQuotesFromBackend();
    
    // Después de cargar las cotizaciones, refrescar pedidos activos con la nueva función
    setTimeout(() => {
      refreshActiveOrders();
    }, 1500);
    
    // Configurar un listener para actualizar los datos cada cierto tiempo
    const intervalId = setInterval(() => {
      console.log("Actualizando datos automáticamente...");
      loadQuotes();
      
      // También refrescar pedidos activos periódicamente
      setTimeout(() => {
        refreshActiveOrders();
      }, 1000);
    }, 60000); // Actualizar cada 60 segundos
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchMyQuotes = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        console.log("[fetchMyQuotes] Cargando cotizaciones y solicitudes confirmadas para:", user.uid);

        // 1. Consultamos cotizaciones tradicionales
        const q = query(collection(db, "cotizaciones")); 
        const snapshot = await getDocs(q);
        const cotizacionesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: "cotizaciones"
        })) as Quote[];

        // 2. Consultamos solicitudes confirmadas y con repartidor asignado (incluyendo pedidos entregados)
        const qSolicitudes = query(
          collection(db, "solicitud"),
          where("status", "in", ["confirmado", "entregado"])
        );
        
        // También necesitamos buscar las solicitudes donde el estado de entrega sea driverAssigned
        const qDriverAssignedSolicitudes = query(
          collection(db, "solicitud"),
          where("deliveryStatus", "==", "driverAssigned")
        );
        
        // Nueva consulta: buscar cualquier solicitud que tenga un repartidor asignado
        const qWithDriverSolicitudes = query(
          collection(db, "solicitud"), 
          where("driverId", "!=", "")
        );
        const snapshotSolicitudes = await getDocs(qSolicitudes);
        const solicitudesConfirmadas = snapshotSolicitudes.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          deliveryStatus: doc.data().deliveryStatus ?? "pendiente",
          source: "solicitud"
        })) as Quote[];

        // Obtener también las solicitudes con repartidor asignado
        const snapshotDriverAssigned = await getDocs(qDriverAssignedSolicitudes);
        const solicitudesDriverAssigned = snapshotDriverAssigned.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: "solicitud"
        })) as Quote[];
        
        // Obtener las solicitudes con driverId explícitamente asignado
        const snapshotWithDriver = await getDocs(qWithDriverSolicitudes);
        const solicitudesWithDriver = snapshotWithDriver.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: "solicitud"
        })) as Quote[];
        
        // Combinamos todas las listas, eliminando duplicados por ID
        const todasSolicitudes = [...solicitudesConfirmadas];
        
        // Agregar solicitudes con repartidor asignado, evitando duplicados
        solicitudesDriverAssigned.forEach(solicitud => {
          if (!todasSolicitudes.some(s => s.id === solicitud.id)) {
            todasSolicitudes.push(solicitud);
          }
        });
        
        // Agregar solicitudes con driverId, evitando duplicados
        solicitudesWithDriver.forEach(solicitud => {
          if (!todasSolicitudes.some(s => s.id === solicitud.id)) {
            todasSolicitudes.push(solicitud);
          }
        });
        
        console.log("[fetchMyQuotes] Total de solicitudes encontradas:", todasSolicitudes.length);
        console.log("[fetchMyQuotes] Desglose: Confirmadas:", solicitudesConfirmadas.length, 
                    "Con repartidor asignado:", solicitudesDriverAssigned.length,
                    "Con driverId:", solicitudesWithDriver.length);

        // Función para saber si la solicitud/cotización es de la empresa logueada
        const isForCurrentCompany = (quote: Quote) => {
          // Si tiene selectedCompanies, verificar que incluya al usuario actual
          if (quote.selectedCompanies && Array.isArray(quote.selectedCompanies)) {
            return quote.selectedCompanies.some(company => {
              if (typeof company === 'string') {
                return company === user.uid;
              }
              
              if (typeof company === 'object') {
                return (
                  company.id === user.uid || 
                  company.companyId === user.uid ||
                  (user.displayName && (
                    company.companyName === user.displayName ||
                    company.name === user.displayName
                  ))
                );
              }
              
              return false;
            });
          }
          
          // Verificar campos adicionales
          return (
            quote.userId === user.uid ||
            quote.companyId === user.uid ||
            quote.companyName === user.displayName
          );
        };

        // Filtrar solo las cotizaciones y solicitudes de la empresa logueada
        const filteredCotizaciones = cotizacionesData.filter(isForCurrentCompany);
        const filteredSolicitudes = todasSolicitudes.filter(isForCurrentCompany);
        
        // Combinar datos
        const allData = [...filteredCotizaciones, ...filteredSolicitudes];
        console.log("Cotizaciones y solicitudes filtradas:", allData.length);
        setMyQuotes(allData);

        // Filtrar solo pedidos activos (no entregados) de la empresa logueada
        const active = allData.filter(quote => {
          // Excluir pedidos completados/entregados
          if (quote.deliveryStatus === "entregado" || quote.status === "entregado") {
            return false;
          }
          
          // Incluir pedidos activos con cualquier estado excepto entregado/denegado
          // También excluir los que no tienen id (por si acaso)
          if (!quote.id) {
            return false;
          }
          
          // Logs de diagnóstico para cada pedido activo
          console.log(`Analizando pedido activo ${quote.id}:`, {
            title: quote.title || quote.requestTitle,
            deliveryId: quote.deliveryId || "NO TIENE",
            driverId: quote.driverId || "NO ASIGNADO",
            isPublished: quote.isPublished || quote.published || false,
            status: quote.status,
            deliveryStatus: quote.deliveryStatus,
            products: quote.products ? quote.products.map(p => p.name) : [],
            items: quote.items ? quote.items.map(i => i.name) : []
          });
          
          // PRIORIDAD: Si tiene repartidor asignado o es un pedido activo, incluirlo siempre
          if (quote.driverId || 
              quote.deliveryStatus === "driverAssigned" ||
              quote.activeForCompany === true) {
            console.log(`[fetchMyQuotes] Pedido ${quote.id} incluido por tener repartidor o ser activo`);
            return true;
          }
          
          // Incluir todos los pedidos confirmados o en proceso
          return (
            quote.status === "accepted" ||
            quote.status === "confirmado" ||
            quote.status === "recibida" || 
            quote.status === "enviado" ||
            quote.status === "en_camino" ||
            quote.deliveryStatus === "pendingDriver" ||
            quote.deliveryStatus === "enviado" ||
            quote.deliveryStatus === "en_camino" ||
            quote.estadoEmpresa === "en_espera" ||
            quote.estadoEmpresa === "en_progreso"
          );
        });
        console.log("Pedidos activos:", active.length);
        setAcceptedQuotes(active);
        
        // Filtrar solo pedidos completados de la empresa logueada
        const completed = allData.filter(quote => 
          quote.deliveryStatus === "entregado" || quote.status === "entregado"
        );
        console.log("Pedidos completados:", completed.length);
        setCompletedQuotes(completed);
        setCompletedJobs(completed.length);
      } catch (error) {
        console.error("Error al obtener cotizaciones:", error);
      }
    };

    fetchMyQuotes();
  }, []);

  // useEffect para cargar ciudades para el selector
  useEffect(() => {
    const loadCities = async () => {
      try {
        setCitiesLoading(true);
        console.log('🌍 Cargando ciudades...');
        let ciudadesData = await geoAPI.getCiudades();
        
        // Si hay muy pocas ciudades (menos de 10), poblar primero las ciudades de Colombia
        if (!ciudadesData || ciudadesData.length < 10) {
          console.log('🇨🇴 Pocas ciudades detectadas (' + (ciudadesData?.length || 0) + '), poblando ciudades de Colombia...');
          try {
            const colombiaResult = await geoAPI.poblarCiudadesColombia();
            console.log('✅ Resultado de poblar Colombia:', colombiaResult);
            
            // Luego poblar desde usuarios existentes para agregar cualquier ciudad personalizada
            const usuariosResult = await geoAPI.poblarCiudades();
            console.log('✅ Resultado de poblar desde usuarios:', usuariosResult);
            
            // Recargar ciudades después de poblar
            ciudadesData = await geoAPI.getCiudades();
          } catch (poblarError) {
            console.error('⚠️ Error poblando ciudades:', poblarError);
            // Continuar con lista actual si falla el poblado
          }
        }
        
        setCities(ciudadesData || []);
        console.log('🏙️ Ciudades cargadas:', ciudadesData?.length || 0);
      } catch (error) {
        console.error('❌ Error cargando ciudades:', error);
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
  }, []);

  // useEffect para inicializar selectedCityId basado en la ubicación actual de la empresa
  useEffect(() => {
    if (company && cities.length > 0) {
      // Buscar la ciudad por nombre si existe
      const matched = cities.find(c => c.nombre === company.ubicacion);
      setSelectedCityId(matched ? matched.id : null);
      console.log("Ciudad seleccionada inicializada:", matched?.nombre || "Ninguna");
    }
  }, [company, cities]);

  // Función para manejar el cambio de ciudad
  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCityId = Number(e.target.value) || null;
    setSelectedCityId(newCityId);
    
    try {
      setIsSavingCity(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !company.userId) {
        console.warn("No se encontró usuario/empresa para actualizar ubicación");
        return;
      }

      const newCity = cities.find(c => c.id === newCityId);
      const newUbicacion = newCity ? newCity.nombre : null;
      
      console.log("🔄 Actualizando ubicación a:", newUbicacion);

      // 1. Actualizar en el backend MySQL
      try {
        // Primero obtener el usuario del backend para obtener su ID numérico
        const backendResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
        if (backendResponse.ok) {
          const backendUser = await backendResponse.json();
          console.log("📊 Usuario encontrado en backend:", backendUser);
          
          // Actualizar ubicación en backend
          await geoAPI.updateUsuarioUbicacion(backendUser.id, newCityId || undefined, newUbicacion);
          console.log("✅ Backend actualizado correctamente");
        } else {
          console.warn("⚠️ Usuario no encontrado en backend, solo se actualizará Firebase");
        }
      } catch (backendError) {
        console.error("❌ Error actualizando backend:", backendError);
      }

      // 2. Actualizar en Firebase
      try {
        const userDoc = await getCompanyData(user.uid);
        if (userDoc && userDoc.id) {
          // Determinar qué colección usar
          const userQueries = [
            query(collection(db, "users"), where("uid", "==", user.uid)),
            query(collection(db, "companies"), where("uid", "==", user.uid))
          ];

          for (const q of userQueries) {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const docRef = doc(db, querySnapshot.docs[0].ref.parent.path, querySnapshot.docs[0].id);
              await updateDoc(docRef, {
                ciudad: newUbicacion,
                ubicacion: newUbicacion
              });
              console.log("✅ Firebase actualizado correctamente");
              break;
            }
          }
        }
      } catch (firebaseError) {
        console.error("❌ Error actualizando Firebase:", firebaseError);
      }
      
      // 3. Actualizar estado local inmediatamente
      setCompany(prev => ({ 
        ...prev, 
        ubicacion: newUbicacion,
        hasLocation: Boolean(newUbicacion)
      }));
      
      console.log("✅ Ubicación actualizada exitosamente a:", newUbicacion);
      
      // Recargar solicitudes con la nueva ciudad
      setTimeout(() => {
        loadQuotesFromBackend();
      }, 500);
      
    } catch (error) {
      console.error("❌ Error general actualizando ubicación:", error);
      // Revertir selección en caso de error
      const currentCity = cities.find(c => c.nombre === company.ubicacion);
      setSelectedCityId(currentCity ? currentCity.id : null);
    } finally {
      setIsSavingCity(false);
      setShowLocationSelector(false);
    }
  };

  // Función auxiliar para obtener usuario de Firebase con ID numérico
  const getUserFromFirebase = async (firebaseUid: string) => {
    try {
      // Buscar en users primero
      const userQueries = [
        query(collection(db, "users"), where("uid", "==", firebaseUid)),
        query(collection(db, "users"), where("firebaseUid", "==", firebaseUid))
      ];

      for (const q of userQueries) {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          return {
            id: userData.id || snapshot.docs[0].id,
            ...userData
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return null;
    }
  };

  // Nuevo useEffect para cargar comentarios
  useEffect(() => {
    const fetchComments = async () => {
      try {
        if (!company || !company.userId) return;
        
        const q = query(
          collection(db, "comments"),
          where("userId", "==", company.userId || "")
        );
        const querySnapshot = await getDocs(q);
        const commentsData: Comment[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          requestId: doc.data().requestId || "",
          userId: doc.data().userId || "",
          text: doc.data().text || "",
          createdAt: doc.data().createdAt || new Date().toISOString(),
        }));

        setRealQuotes((prevQuotes) =>
          prevQuotes.map((quote) => ({
            ...quote,
            comments: commentsData.filter((comment) => comment.requestId === quote.id),
          }))
        );
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();
  }, [company]);
  
  // Función para confirmar una solicitud
  const handleConfirmQuote = async (quoteId: string): Promise<string | null> => {
    if (isProcessing) return null;
    
    try {
      setIsProcessing(true);
      console.log(`[handleConfirmQuote] Intentando confirmar solicitud ${quoteId}...`);
      
      const quoteRef = doc(db, "solicitud", quoteId);
      const quoteSnap = await getDoc(quoteRef);
      
      if (!quoteSnap.exists()) {
        throw new Error("La solicitud no existe");
      }
      
      const quoteData = quoteSnap.data();
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("Usuario no autenticado");
      }
      
      // Verificar si ya tiene deliveryId para no duplicar
      if (quoteData.deliveryId) {
        console.log(`[handleConfirmQuote] La solicitud ya tiene un deliveryId: ${quoteData.deliveryId}`);
        return quoteData.deliveryId;
      }
      
      // Actualizar el estado de la solicitud a "confirmado" y pendiente para repartidor
      await updateDoc(quoteRef, {
        status: "confirmado",
        estadoEmpresa: "en_espera",
        deliveryStatus: "pendingDriver" // Estado de entrega pendiente para repartidor
      });
      
      // Crear un registro en la colección de entregas para que los repartidores puedan verlo
      // y publicarlo automáticamente como en Rappi
      const deliveryData: any = {
        orderId: quoteId,
        companyId: user.uid,
        companyName: company.name || "Empresa",
        userId: quoteData.userId || "cliente",
        clientName: quoteData.clientName || quoteData.userId || "Cliente",
        items: quoteData.products || quoteData.items || [],
        totalAmount: Number(quoteData.totalAmount || quoteData.amount || quoteData.total || 0),
        status: "pendingDriver" as DeliveryStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        deliveryAddress: quoteData.deliveryAddress || quoteData.address || "",
        deliveryFee: Number(quoteData.deliveryFee || 0),
        interestedDrivers: [], // Lista de repartidores que se han interesado en tomar el pedido
        // Campos para publicación automática (estilo Rappi)
        isPublished: true,
        published: true,
        publicationStatus: "active",
        visibility: "public",
        availableForDrivers: true,
        searchable: true,
        visibleInFeed: true,
        driverStatus: "available",
        region: "all",
        readyForAssignment: true,
        // Configuración de precio automática (precio fijo por defecto)
        bidEnabled: false,
        fixedPrice: Number(quoteData.totalAmount || quoteData.amount || quoteData.total || 0) * 0.1 || 5000 // 10% del total o 5000 por defecto
      };
      
      // Solo añadir deliveryCoordinates si existe y no es undefined
      // Importante: Firestore no acepta valores undefined
      console.log("[handleConfirmQuote] Revisando coordenadas disponibles:", {
        deliveryCoordinates: quoteData.deliveryCoordinates,
        coordinates: quoteData.coordinates
      });
      
      if (quoteData.deliveryCoordinates && typeof quoteData.deliveryCoordinates === 'object') {
        deliveryData.deliveryCoordinates = quoteData.deliveryCoordinates;
        console.log("[handleConfirmQuote] Usando deliveryCoordinates existentes");
      } else if (quoteData.coordinates && typeof quoteData.coordinates === 'object') {
        deliveryData.deliveryCoordinates = quoteData.coordinates;
        console.log("[handleConfirmQuote] Usando coordinates alternativas");
      } else {
        // Si no hay coordenadas válidas, usar valor nulo en lugar de undefined
        console.log("[handleConfirmQuote] No se encontraron coordenadas válidas para la entrega, usando null");
        // Usar null en lugar de undefined, ya que Firestore acepta null pero no undefined
        deliveryData.deliveryCoordinates = null;
      }
      
      // Asegurar que la entrega sea visible para los repartidores
      deliveryData.availableForDrivers = true;
      deliveryData.visibility = "public";
      deliveryData.isPublished = true;
      deliveryData.published = true;
      deliveryData.publicationStatus = "active";
      deliveryData.driverStatus = "available";
      deliveryData.searchable = true;
      deliveryData.visibleInFeed = true;
      deliveryData.region = "all";
      deliveryData.readyForAssignment = true;
      
      // Guardar en la colección de deliveries
      try {
        const deliveryRef = await addDoc(collection(db, "deliveries"), deliveryData);
        console.log(`[handleConfirmQuote] ✅ Entrega creada para repartidores con ID: ${deliveryRef.id}`);
        
        // Actualizar la solicitud con la referencia a la entrega y marcarla como publicada
        await updateDoc(quoteRef, {
          deliveryId: deliveryRef.id,
          isPublished: true,
          published: true,
          deliveryPublished: true,
          visibleToDrivers: true,
          bidEnabled: false,
          fixedPrice: Number(quoteData.totalAmount || quoteData.amount || quoteData.total || 0) * 0.1 || 5000
        });
        
        // Añadir un comentario para notificar al cliente que el viaje ya está publicado (estilo Rappi)
        const newComment = {
          id: Date.now().toString(),
          text: `¡Buenas noticias! Su solicitud ha sido aprobada por ${company.name} y el viaje ya ha sido publicado automáticamente. Los repartidores disponibles pueden verlo ahora mismo. Le notificaremos cuando un repartidor acepte el pedido.`,
          userId: user.uid,
          userName: company.name || user.displayName || "Empresa",
          createdAt: new Date().toISOString(),
          isSystem: true
        };
        
        // Obtener los comentarios existentes o inicializar un array vacío
        const existingComments = quoteData.comments || [];
        
        // Añadir el nuevo comentario
        await updateDoc(quoteRef, {
          comments: [...existingComments, newComment]
        });
        
        console.log(`[handleConfirmQuote] ✅ Solicitud ${quoteId} confirmada exitosamente en Firestore`);
        console.log(`[handleConfirmQuote] ✅ Notificación enviada al cliente`);
        
        // Mostrar mensaje de éxito al usuario (estilo Rappi)
        alert("¡Solicitud aceptada y viaje publicado automáticamente! Los repartidores ya pueden ver el pedido y aceptarlo.");
        
        // Actualizar el estado local inmediatamente para feedback instantáneo
        // Reflejando que el pedido está confirmado Y publicado (estilo Rappi)
        
        // Crear el objeto actualizado para el pedido confirmado
        const updatedQuote = {
          id: quoteId,
          ...quoteData,
          status: "confirmado", 
          estadoEmpresa: "en_espera",
          deliveryStatus: "pendingDriver",
          deliveryId: deliveryRef.id,
          isPublished: true,
          published: true,
          deliveryPublished: true,
          bidEnabled: false,
          fixedPrice: Number(quoteData.totalAmount || quoteData.amount || quoteData.total || 0) * 0.1 || 5000,
          comments: [...(quoteData.comments || []), newComment]
        };
        
        // Quitar la solicitud de realQuotes (para que desaparezca de pendientes)
        setRealQuotes(prevQuotes => {
          return prevQuotes.filter(quote => quote.id !== quoteId);
        });
        
        // Quitar la solicitud de pendingQuotes (para que desaparezca de la vista de solicitudes pendientes)
        setPendingQuotes(prevQuotes => {
          return prevQuotes.filter(quote => quote.id !== quoteId);
        });
        
        // Añadir la solicitud confirmada a acceptedQuotes
        setAcceptedQuotes(prevQuotes => {
          // Verificamos si ya existe en acceptedQuotes
          const exists = prevQuotes.some(quote => quote.id === quoteId);
          
          if (exists) {
            // Si ya existe, actualizamos sus datos
            return prevQuotes.map(quote => 
              quote.id === quoteId ? updatedQuote : quote
            );
          } else {
            // Si no existe, la añadimos al principio del array
            return [updatedQuote, ...prevQuotes];
          }
        });
        
        // No necesitamos recargar las solicitudes pendientes aquí, ya que las hemos actualizado manualmente
        // Solo necesitamos recargar datos de cotizaciones aceptadas para asegurarnos de tener la información más actualizada
        setTimeout(() => {
          console.log("[handleConfirmQuote] Actualizando datos de pedidos aceptados...");
          
          // Cargar las cotizaciones aceptadas directamente sin recargar las pendientes
          const fetchAcceptedQuotes = async () => {
            try {
              if (!user) return;
              
              // Consultar solicitudes confirmadas
              const qSolicitudes = query(
                collection(db, "solicitud"),
                where("status", "in", ["confirmado", "entregado"])
              );
              const snapshotSolicitudes = await getDocs(qSolicitudes);
              const solicitudesConfirmadas = snapshotSolicitudes.docs
                .map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  deliveryStatus: doc.data().deliveryStatus ?? "pendiente",
                  source: "solicitud"
                }))
                .filter(quote => {
                  // Verificar si esta solicitud está relacionada con el usuario actual
                  const quoteData = quote as any; // Usamos any para evitar errores de tipo
                  return (
                    quoteData.companyId === user.uid || 
                    quoteData.userId === user.uid ||
                    (quoteData.selectedCompanies && 
                     Array.isArray(quoteData.selectedCompanies) &&
                     quoteData.selectedCompanies.some((company: any) => 
                       (typeof company === 'string' && company === user.uid) ||
                       (typeof company === 'object' && company && 
                        (company.id === user.uid || company.companyId === user.uid))
                     ))
                  );
                }) as Quote[];
              
              console.log("[handleConfirmQuote] Solicitudes confirmadas actualizadas:", solicitudesConfirmadas.length);
              
              // Solo actualizar las cotizaciones aceptadas, no las pendientes
              if (solicitudesConfirmadas.length > 0) {
                setAcceptedQuotes(prevQuotes => {
                  // Combinar solicitudes existentes con las nuevas, evitando duplicados
                  const existingIds = new Set(prevQuotes.map(q => q.id));
                  const newQuotes = solicitudesConfirmadas.filter(q => !existingIds.has(q.id));
                  return [...prevQuotes, ...newQuotes];
                });
              }
            } catch (error) {
              console.error("[handleConfirmQuote] Error al recargar datos:", error);
            }
          };
          
          fetchAcceptedQuotes();
        }, 1000);
        
        return deliveryRef.id;
      } catch (dbError) {
        console.error("[handleConfirmQuote] Error al crear el registro de entrega:", dbError);
        throw new Error(`Error al crear el registro de entrega: ${dbError.message}`);
      }
    } catch (error) {
      console.error("Error al confirmar la solicitud:", error);
      alert("Error al confirmar la solicitud: " + error.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Función para asignar un repartidor a un pedido
  const handleAssignDriver = async (quoteId: string, driverId: string, deliveryId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handleAssignDriver] Asignando repartidor ${driverId} al pedido ${quoteId}...`);
      
      // Actualizar el documento de entrega
      const deliveryRef = doc(db, "deliveries", deliveryId);
      await updateDoc(deliveryRef, {
        status: "driverAssigned",
        driverId: driverId,
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Actualizar la solicitud original
      const quoteRef = doc(db, "solicitud", quoteId);
      await updateDoc(quoteRef, {
        deliveryStatus: "driverAssigned",
        status: "confirmado", // Asegurar que el estado principal está confirmado
        estadoEmpresa: "en_progreso", // Cambiar estado de la empresa a "en_progreso"
        driverId: driverId,
        assignedAt: serverTimestamp(),
        // Marcarlo explícitamente como activo para la empresa
        isActive: true,
        activeForCompany: true
      });
      
      // Obtener información del repartidor
      const driverRef = doc(db, "users", driverId);
      const driverSnap = await getDoc(driverRef);
      const driverData = driverSnap.exists() ? driverSnap.data() : null;
      
      // Añadir un comentario para notificar al cliente
      if (driverData) {
        const quoteSnap = await getDoc(quoteRef);
        if (quoteSnap.exists()) {
          const quoteData = quoteSnap.data();
          const existingComments = quoteData.comments || [];
          
          const newComment = {
            id: Date.now().toString(),
            text: `Se ha asignado un repartidor para su pedido: ${driverData.name || "Repartidor"}. Puede seguir el estado de su entrega en tiempo real.`,
            userId: driverId,
            userName: "Sistema",
            createdAt: new Date().toISOString(),
            isSystem: true
          };
          
          await updateDoc(quoteRef, {
            comments: [...existingComments, newComment]
          });
        }
      }
      
      // Actualizar el estado local - remover el pedido de la lista de pendientes
      setRealQuotes(prevQuotes => {
        return prevQuotes.filter(quote => quote.id !== quoteId);
      });
      
      // Actualizar también las solicitudes pendientes
      setPendingQuotes(prevQuotes => {
        return prevQuotes.filter(quote => quote.id !== quoteId);
      });
      
      // Añadir el pedido actualizado a la lista de pedidos activos
      setAcceptedQuotes(prevQuotes => {
        const isAlreadyInList = prevQuotes.some(quote => quote.id === quoteId);
        
        if (isAlreadyInList) {
          return prevQuotes.map(quote => 
            quote.id === quoteId 
              ? { 
                  ...quote, 
                  deliveryStatus: "driverAssigned",
                  status: "confirmado",
                  estadoEmpresa: "en_progreso",
                  driverId: driverId
                } 
              : quote
          );
        } else {
          // Buscar el pedido original en las quotes reales
          const originalQuote = [...realQuotes].find(q => q.id === quoteId);
          if (originalQuote) {
            const updatedQuote = {
              ...originalQuote,
              deliveryStatus: "driverAssigned",
              status: "confirmado",
              estadoEmpresa: "en_progreso",
              driverId: driverId
            };
            return [...prevQuotes, updatedQuote];
          }
          
          // Si no encontramos la cotización en realQuotes, intentamos buscarla en la base de datos
          setTimeout(async () => {
            try {
              const quoteRef = doc(db, "solicitud", quoteId);
              const quoteSnapshot = await getDoc(quoteRef);
              if (quoteSnapshot.exists()) {
                const quoteData = quoteSnapshot.data();
                // Forzar actualización de aceptedQuotes con los datos más recientes
                setAcceptedQuotes(current => [
                  ...current, 
                  { 
                    id: quoteId,
                    ...quoteData,
                    deliveryStatus: "driverAssigned",
                    status: "confirmado",
                    estadoEmpresa: "en_progreso",
                    driverId: driverId
                  }
                ]);
              }
            } catch (error) {
              console.error("Error al actualizar el estado local con datos de la BD:", error);
            }
          }, 500);
          
          return prevQuotes;
        }
      });
      
      // Mostrar alerta de éxito
      alert("Repartidor asignado exitosamente. El cliente ha sido notificado.");
      
      // Recargar datos - primero cargamos las cotizaciones nuevamente
      setTimeout(() => {
        loadQuotes();
        
        // También ejecutamos fetchMyQuotes para asegurarnos de cargar los pedidos activos
        const refreshMyQuotes = async () => {
          try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;
            
            console.log("[handleAssignDriver] Actualizando lista de pedidos activos...");
            
            // Buscar específicamente el pedido que acabamos de actualizar
            const quoteRef = doc(db, "solicitud", quoteId);
            const quoteSnap = await getDoc(quoteRef);
            
            if (quoteSnap.exists()) {
              const updatedQuote = {
                id: quoteId,
                ...quoteSnap.data(),
                source: "solicitud"
              };
              
              // Verificar si ya está en la lista de pedidos activos
              setAcceptedQuotes(currentQuotes => {
                const exists = currentQuotes.some(q => q.id === quoteId);
                if (exists) {
                  return currentQuotes.map(q => q.id === quoteId ? updatedQuote : q);
                } else {
                  return [...currentQuotes, updatedQuote];
                }
              });
              
              console.log("[handleAssignDriver] Pedido activo actualizado con éxito.");
            }
          } catch (error) {
            console.error("Error al actualizar pedidos activos:", error);
          }
        };
        
        refreshMyQuotes();
      }, 1000);
      
      // Usar la nueva función de refrescar pedidos activos
      setTimeout(() => {
        refreshActiveOrders();
        
        // Verificación adicional: asegurar que el pedido esté en los activos
        console.log("[handleAssignDriver] Verificación adicional para pedido:", quoteId);
        
        const quoteRef = doc(db, "solicitud", quoteId);
        getDoc(quoteRef).then(snapshot => {
          if (snapshot.exists()) {
            const quoteData = snapshot.data();
            console.log("[handleAssignDriver] Estado actual del pedido:", {
              id: quoteId,
              status: quoteData.status,
              deliveryStatus: quoteData.deliveryStatus,
              driverId: quoteData.driverId
            });
            
            // Comprobar si ya está en la lista de pedidos activos
            setAcceptedQuotes(current => {
              const exists = current.some(q => q.id === quoteId);
              if (!exists) {
                console.log("[handleAssignDriver] Agregando pedido a activos manualmente");
                return [...current, { id: quoteId, ...quoteData }];
              }
              return current;
            });
          }
        }).catch(err => {
          console.error("Error en verificación adicional:", err);
        });
      }, 1500);
      
    } catch (error) {
      console.error("Error al asignar repartidor:", error);
      alert("Error al asignar repartidor. Por favor, inténtelo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Se eliminaron los estados relacionados con la publicación manual

  // Función para despublicar un viaje
  const handleUnpublishDelivery = async (quoteId: string, deliveryId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handleUnpublishDelivery] Despublicando viaje para el pedido ${quoteId}...`);
      
      // Verificar que el usuario esté autenticado
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Usuario no autenticado. Por favor, inicie sesión nuevamente.");
      }
      
      // Verificar que tengamos un deliveryId
      if (!deliveryId) {
        throw new Error("No se tiene un ID de entrega para despublicar");
      }
      
      // Actualizar el documento de entrega para marcarlo como no publicado
      const deliveryRef = doc(db, "deliveries", deliveryId);
      
      // Primero verificamos si el documento existe
      const deliverySnap = await getDoc(deliveryRef);
      if (!deliverySnap.exists()) {
        throw new Error(`No se encontró el documento de entrega con ID ${deliveryId}`);
      }
      
      // Actualizamos el documento para que no sea visible para repartidores
      await updateDoc(deliveryRef, {
        isPublished: false,
        published: false,
        unpublishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        visibility: "private",
        availableForDrivers: false,
        publicationStatus: "inactive",
        searchable: false,
        visibleInFeed: false
      });
      
      console.log(`[handleUnpublishDelivery] ✅ Documento de entrega despublicado correctamente`);
      
      // Actualizar la solicitud original
      const quoteRef = doc(db, "solicitud", quoteId);
      const quoteSnap = await getDoc(quoteRef);
      
      if (quoteSnap.exists()) {
        const quoteData = quoteSnap.data();
        const existingComments = quoteData.comments || [];
        
        // Añadir un comentario para notificar que se ha despublicado el viaje
        const newComment = {
          id: Date.now().toString(),
          text: "El viaje ha sido despublicado y ya no está disponible para los repartidores.",
          userId: company.userId,
          userName: "Sistema",
          createdAt: new Date().toISOString(),
          isSystem: true
        };
        
        // Actualizamos la solicitud
        await updateDoc(quoteRef, {
          isPublished: false,
          published: false,
          deliveryPublished: false,
          visibleToDrivers: false,
          comments: [...existingComments, newComment]
        });
        
        // Añadir un comentario al historial de la entrega
        const commentData = {
          text: "Viaje despublicado por la empresa",
          createdAt: serverTimestamp(),
          userId: company.userId || "sistema",
          userName: company.name || "Sistema",
          type: "system"
        };

        await addDoc(collection(db, "deliveries", deliveryId, "comments"), commentData);
        
        console.log(`[handleUnpublishDelivery] ✅ Viaje despublicado correctamente`);
        
        // Mostrar alerta de éxito
        alert("Viaje despublicado exitosamente. Los repartidores ya no podrán verlo.");
        
        // Actualizar estado local inmediatamente para feedback visual
        setRealQuotes(prevQuotes => {
          const updated = prevQuotes.map(quote => 
            quote.id === quoteId 
              ? { 
                  ...quote, 
                  isPublished: false,
                  published: false,
                  deliveryPublished: false,
                  comments: [...(quote.comments || []), newComment]
                } 
              : quote
          );
          return updated;
        });
        
        // También actualizar los pedidos aceptados
        setAcceptedQuotes(prevQuotes => {
          return prevQuotes.map(quote => 
            quote.id === quoteId 
              ? { 
                  ...quote, 
                  isPublished: false,
                  published: false,
                  deliveryPublished: false
                } 
              : quote
          );
        });
        
        // Recargar datos para ver cambios
        setTimeout(() => {
          loadQuotes();
        }, 1000);
      } else {
        throw new Error(`No se encontró la solicitud con ID ${quoteId}`);
      }
    } catch (error) {
      console.error("Error al despublicar viaje:", error);
      alert(`Error al despublicar viaje: ${error.message || "Inténtelo de nuevo."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Se eliminó la función de inicio de proceso de publicación ya que ahora es automático

  // Función para publicar un viaje para que los repartidores lo vean
  const handlePublishDelivery = async (quoteId: string, deliveryId?: string, options?: { 
    bidEnabled?: boolean; 
    fixedPrice?: number;
    minBidPrice?: number;
  }) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handlePublishDelivery] Publicando viaje para el pedido ${quoteId}...`, options);
      
      // Verificar que el usuario esté autenticado
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Usuario no autenticado. Por favor, inicie sesión nuevamente.");
      }
      
      // Si no hay deliveryId, primero creamos uno
      if (!deliveryId) {
        console.log(`[handlePublishDelivery] No hay deliveryId para el pedido ${quoteId}, se creará uno`);
        
        try {
          // Obtener datos del pedido - verificamos que colección usar
          let quoteRef;
          let quoteSnap;
          let quoteData;
          
          // Primero intentamos en 'solicitud'
          quoteRef = doc(db, "solicitud", quoteId);
          quoteSnap = await getDoc(quoteRef);
          
          if (!quoteSnap.exists()) {
            // Si no existe en 'solicitud', intentamos en 'cotizaciones'
            quoteRef = doc(db, "cotizaciones", quoteId);
            quoteSnap = await getDoc(quoteRef);
            
            if (!quoteSnap.exists()) {
              throw new Error("No se encontró la solicitud en ninguna colección");
            }
          }
          
          quoteData = quoteSnap.data();
          console.log(`[handlePublishDelivery] Datos del pedido encontrados:`, quoteData);
          
          // Verificamos que tenemos todos los datos necesarios
          const companyId = currentUser.uid || company.userId;
          if (!companyId) {
            throw new Error("No se pudo determinar el ID de la empresa");
          }
          
          // Crear registro en la colección de entregas con validación de datos
          const deliveryData: any = {
            orderId: quoteId,
            companyId: companyId,
            companyName: company.name || "Empresa",
            userId: quoteData.userId || quoteData.clientId || "Cliente",
            clientName: quoteData.clientName || quoteData.userName || quoteData.userId || "Cliente",
            items: quoteData.products || quoteData.items || [],
            totalAmount: Number(quoteData.totalAmount || quoteData.amount || quoteData.total || 0),
            status: "pendingDriver" as DeliveryStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            deliveryAddress: quoteData.deliveryAddress || quoteData.address || "",
            deliveryFee: Number(quoteData.deliveryFee || 0),
            interestedDrivers: [], // Lista vacía de repartidores interesados
            isPublished: true, // Ya lo marcamos como publicado desde el inicio
            published: true,
            publicationStatus: "active",
            visibility: "public",
            availableForDrivers: true
          };
          
          // Añadir opciones de puja o precio fijo
          if (options) {
            deliveryData.bidEnabled = !!options.bidEnabled;
            
            if (options.bidEnabled) {
              deliveryData.minBidPrice = Number(options.minBidPrice) || 0;
              deliveryData.bids = [];
              deliveryData.bidEnabled = true;
            } else {
              deliveryData.fixedPrice = Number(options.fixedPrice) || 0;
              deliveryData.bidEnabled = false;
            }
          }
          
          // Solo añadir deliveryCoordinates si existe y no es undefined
          // Importante: Firestore no acepta valores undefined
          console.log("[handlePublishDelivery] Verificando coordenadas:", quoteData.deliveryCoordinates, quoteData.coordinates);
          
          if (quoteData.deliveryCoordinates && typeof quoteData.deliveryCoordinates === 'object') {
            deliveryData.deliveryCoordinates = quoteData.deliveryCoordinates;
            console.log("[handlePublishDelivery] Usando deliveryCoordinates existentes");
          } else if (quoteData.coordinates && typeof quoteData.coordinates === 'object') {
            deliveryData.deliveryCoordinates = quoteData.coordinates;
            console.log("[handlePublishDelivery] Usando coordinates alternativas");
          } else {
            // Si no hay coordenadas válidas, usar valor nulo en lugar de undefined
            console.log("[handlePublishDelivery] No se encontraron coordenadas válidas para la entrega, usando null");
            deliveryData.deliveryCoordinates = null;
          }
        
          // Asegurar que la entrega sea visible para los repartidores
          deliveryData.availableForDrivers = true;
          deliveryData.visibility = "public";
          deliveryData.isPublished = true;
          deliveryData.published = true;
          deliveryData.publicationStatus = "active";
          deliveryData.driverStatus = "available";
          deliveryData.searchable = true;
          deliveryData.visibleInFeed = true;
          deliveryData.region = "all";
          
          console.log(`[handlePublishDelivery] Datos de entrega a crear:`, deliveryData);          
          try {
            // Guardar en la colección de deliveries
            const newDeliveryRef = await addDoc(collection(db, "deliveries"), deliveryData);
            console.log(`[handlePublishDelivery] ✅ Entrega creada con ID: ${newDeliveryRef.id}`);
            
            // Actualizar la solicitud con el ID de entrega y otros campos necesarios
            const updateData: any = {
              deliveryId: newDeliveryRef.id,
              status: "confirmado",
              deliveryStatus: "pendingDriver",
              isPublished: true,
              published: true,
              deliveryPublished: true
            };
            
            // Añadir las opciones de publicación a la solicitud también
            if (options) {
              updateData.bidEnabled = !!options.bidEnabled;
              
              if (options.bidEnabled) {
                updateData.minBidPrice = Number(options.minBidPrice) || 0;
                updateData.bids = [];
              } else {
                updateData.fixedPrice = Number(options.fixedPrice) || 0;
              }
            }
            
            await updateDoc(quoteRef, updateData);
            
            // Usar el nuevo ID para continuar
            deliveryId = newDeliveryRef.id;
            
            // Si todo salió bien, seguimos con el resto del proceso
            console.log(`[handlePublishDelivery] ✅ ID de entrega creado y actualizado correctamente`);
          } catch (addError) {
            console.error(`[handlePublishDelivery] Error al guardar en Firestore:`, addError);
            throw new Error(`Error al guardar la entrega: ${addError.message}`);
          }
        } catch (innerError) {
          console.error(`[handlePublishDelivery] Error al crear deliveryId:`, innerError);
          throw new Error(`Error al crear ID de entrega: ${innerError.message}`);
        }
      }
      
      // Actualizar el documento de entrega para marcarlo como publicado
      try {
        if (!deliveryId) {
          throw new Error("No se tiene un ID de entrega para publicar");
        }
        
        const deliveryRef = doc(db, "deliveries", deliveryId);
        
        // Primero verificamos si el documento existe
        const deliverySnap = await getDoc(deliveryRef);
        if (!deliverySnap.exists()) {
          throw new Error(`No se encontró el documento de entrega con ID ${deliveryId}`);
        }
        
        // Preparar los datos de actualización
        const updateData: any = {
          isPublished: true,
          published: true,
          publishedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          // Añadir etiquetas de visibilidad para que aparezca en la lista de trabajos disponibles
          visibility: "public",
          status: "pendingDriver",
          // Campos adicionales para asegurar visibilidad
          availableForDrivers: true,
          publicationStatus: "active",
          driverStatus: "available",
          searchable: true,
          visibleInFeed: true,
          region: "all",
          // Flag para indicar que está listo para ser asignado
          readyForAssignment: true
        };
        
        // Añadir las opciones de puja o precio fijo si se proporcionan
        if (options) {
          updateData.bidEnabled = !!options.bidEnabled;
          
          if (options.bidEnabled) {
            updateData.minBidPrice = Number(options.minBidPrice) || 0;
            // Si no existe bids, lo inicializamos
            if (!deliverySnap.data().bids) {
              updateData.bids = [];
            }
          } else {
            updateData.fixedPrice = Number(options.fixedPrice) || 0;
          }
        }
        
        // Actualizamos el documento con todos los campos necesarios
        await updateDoc(deliveryRef, updateData);
        
        console.log(`[handlePublishDelivery] ✅ Documento de entrega actualizado correctamente`);
      } catch (updateError) {
        console.error(`[handlePublishDelivery] Error al actualizar el documento de entrega:`, updateError);
        throw new Error(`Error al actualizar el documento de entrega: ${updateError.message}`);
      }
      
      // Actualizar la solicitud original
      const quoteRef = doc(db, "solicitud", quoteId);
      const quoteSnap = await getDoc(quoteRef);
      
      if (quoteSnap.exists()) {
        const quoteData = quoteSnap.data();
        const existingComments = quoteData.comments || [];
        
        // Añadir un comentario para notificar que se ha publicado el viaje
        let commentText = "El viaje ha sido publicado para todos los repartidores disponibles. ";
        
        if (options && options.bidEnabled) {
          commentText += `Los repartidores pueden enviar sus ofertas (precio mínimo: $${options.minBidPrice}).`;
        } else if (options && options.fixedPrice) {
          commentText += `El precio fijado para la entrega es de $${options.fixedPrice}.`;
        } else {
          commentText += "Se le notificará cuando un repartidor acepte el pedido.";
        }
        
        const newComment = {
          id: Date.now().toString(),
          text: commentText,
          userId: company.userId,
          userName: "Sistema",
          createdAt: new Date().toISOString(),
          isSystem: true
        };
        
        // Preparar los datos de actualización
        const updateData: any = {
          deliveryStatus: "pendingDriver",
          status: "pendingDriver", // Aseguramos que ambos campos estén actualizados
          isPublished: true,
          published: true,
          deliveryPublished: true, // Campo adicional para compatibilidad
          driverAssignmentStatus: "pending", // Estado para asignación de repartidor
          visibleToDrivers: true, // Visibilidad explícita para repartidores
          comments: [...existingComments, newComment]
        };
        
        // Añadir las opciones de puja o precio fijo si se proporcionan
        if (options) {
          updateData.bidEnabled = !!options.bidEnabled;
          
          if (options.bidEnabled) {
            updateData.minBidPrice = Number(options.minBidPrice) || 0;
            // Si no existe bids, lo inicializamos
            if (!quoteData.bids) {
              updateData.bids = [];
            }
          } else {
            updateData.fixedPrice = Number(options.fixedPrice) || 0;
          }
        }
        
        // Actualizamos la solicitud con todos los campos necesarios
        await updateDoc(quoteRef, updateData);
        
        // Añadir un comentario al historial de la entrega
        let commentDeliveryText = "Viaje publicado para repartidores disponibles";
        if (options && options.bidEnabled) {
          commentDeliveryText += ` con sistema de pujas (mínimo: $${options.minBidPrice})`;
        } else if (options && options.fixedPrice) {
          commentDeliveryText += ` con precio fijo de $${options.fixedPrice}`;
        }
        
        const commentData = {
          text: commentDeliveryText,
          createdAt: serverTimestamp(),
          userId: company.userId || "sistema",
          userName: company.name || "Sistema",
          type: "system"
        };

        await addDoc(collection(db, "deliveries", deliveryId, "comments"), commentData);
        
        console.log(`[handlePublishDelivery] ✅ Viaje publicado correctamente con ID: ${deliveryId}`);
        
        // Mostrar alerta de éxito
        if (options && options.bidEnabled) {
          alert(`¡Viaje publicado exitosamente! Los repartidores podrán enviar sus ofertas (precio mínimo: $${options.minBidPrice}).`);
        } else if (options && options.fixedPrice) {
          alert(`¡Viaje publicado exitosamente! El precio fijo para la entrega es de $${options.fixedPrice}.`);
        } else {
          alert("¡Viaje publicado exitosamente! Los repartidores cercanos podrán verlo y aceptarlo.");
        }
        
        // Actualizar estado local inmediatamente para feedback visual
        setRealQuotes(prevQuotes => {
          const updated = prevQuotes.map(quote => 
            quote.id === quoteId 
              ? { 
                  ...quote, 
                  isPublished: true,
                  published: true,
                  deliveryPublished: true,
                  bidEnabled: options?.bidEnabled,
                  fixedPrice: options?.fixedPrice,
                  minBidPrice: options?.minBidPrice,
                  comments: [...(quote.comments || []), newComment]
                } 
              : quote
          );
          return updated;
        });
        
        // También actualizar los pedidos aceptados si el pedido está ahí
        setAcceptedQuotes(prevQuotes => {
          return prevQuotes.map(quote => 
            quote.id === quoteId 
              ? { 
                  ...quote, 
                  isPublished: true,
                  published: true,
                  deliveryPublished: true,
                  bidEnabled: options?.bidEnabled,
                  fixedPrice: options?.fixedPrice,
                  minBidPrice: options?.minBidPrice
                } 
              : quote
          );
        });
        
        // Ya no necesitamos ocultar el modal porque ha sido eliminado
        
        // Recargar datos para ver cambios
        setTimeout(() => {
          // Recargar las solicitudes para actualizar UI
          loadQuotes();
        }, 1000);
      } else {
        throw new Error(`No se encontró la solicitud con ID ${quoteId}`);
      }
    } catch (error) {
      console.error("Error al publicar viaje:", error);
      alert(`Error al publicar viaje: ${error.message || "Inténtelo de nuevo."}`);
    } finally {
      setIsProcessing(false);
    }
  };  // Función para denegar una solicitud
  const handleDenyQuote = async (quoteId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log(`[handleDenyQuote] Intentando denegar solicitud ${quoteId}...`);
      
      const quoteRef = doc(db, "solicitud", quoteId);
      
      // Actualizar el estado de la solicitud a "denegado"
      await updateDoc(quoteRef, {
        status: "denegado"
      });
      
      console.log(`[handleDenyQuote] ❌ Solicitud ${quoteId} denegada en Firestore`);
      
      // Actualizar ambos estados locales para asegurar que la solicitud desaparece completamente
      setRealQuotes(prevQuotes => {
        const filtered = prevQuotes.filter(quote => quote.id !== quoteId);
        console.log("[handleDenyQuote] Eliminando solicitud del estado realQuotes");
        return filtered;
      });
      
      // También actualizar pendingQuotes para que desaparezca de la vista de solicitudes pendientes
      setPendingQuotes(prevQuotes => {
        const filtered = prevQuotes.filter(quote => quote.id !== quoteId);
        console.log("[handleDenyQuote] Eliminando solicitud del estado pendingQuotes");
        return filtered;
      });
      
      // Opcional: mostrar alguna notificación
      alert("Solicitud denegada correctamente");
      
      // Refrescar los datos
      setTimeout(() => {
        console.log("[handleDenyQuote] Recargando datos...");
        loadQuotes();
      }, 1000); // Pequeño delay para asegurar que Firestore se ha actualizado
      
    } catch (error) {
      console.error("Error al denegar la solicitud:", error);
      alert("Error al denegar la solicitud. Por favor, inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-4 bg-gradient-to-b from-blue-50 to-white min-h-screen">
        {/* Welcome Section - Diseño avanzado y moderno */}
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 shadow-lg overflow-hidden relative">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-white">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-blue-300 shadow-lg">
                  {company.profileImage ? (
                    <AvatarImage src={company.profileImage} alt={company.name} />
                  ) : (
                    <AvatarFallback className="bg-blue-400 text-white text-xl">
                      <Building2 className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {company.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-600 p-1 rounded-full">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                )}
              </div>
              
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight">¡Hola, {company.name || "Empresa"}!</h1>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                  {company.isVerified ? (
                    <Badge className="bg-blue-300/30 hover:bg-blue-300/40 text-white border-none px-2 py-1">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verificada
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/20 hover:bg-red-500/30 border-red-300/50 text-white px-2 py-1">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Sin verificar
                    </Badge>
                  )}
                  
                  {company.hasLocation ? (
                    <div className="flex items-center gap-2">
                      {!showLocationSelector ? (
                        <Badge 
                          className="bg-green-300/30 hover:bg-green-300/40 text-white border-none px-2 py-1 cursor-pointer"
                          onClick={() => setShowLocationSelector(true)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          {company.ubicacion || "Ubicación configurada"} - Hacer clic para cambiar
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                          <MapPin className="h-4 w-4 text-white" />
                          <select
                            value={selectedCityId ?? ""}
                            onChange={handleCityChange}
                            disabled={isSavingCity || citiesLoading}
                            className="bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar ciudad...</option>
                            {cities.map(city => (
                              <option key={city.id} value={city.id}>
                                {city.nombre}
                              </option>
                            ))}
                          </select>
                          {isSavingCity && (
                            <RefreshCw className="h-4 w-4 text-white animate-spin" />
                          )}
                          <button
                            onClick={() => setShowLocationSelector(false)}
                            className="text-white hover:text-gray-200 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {!showLocationSelector ? (
                        <Badge 
                          variant="outline" 
                          className="bg-amber-500/20 hover:bg-amber-500/30 border-amber-300/50 text-white px-2 py-1 cursor-pointer"
                          onClick={() => setShowLocationSelector(true)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Sin ubicación - Hacer clic para configurar
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                          <MapPin className="h-4 w-4 text-white" />
                          <select
                            value={selectedCityId ?? ""}
                            onChange={handleCityChange}
                            disabled={isSavingCity}
                            className="bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 text-sm min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar ciudad...</option>
                            {cities.map(city => (
                              <option key={city.id} value={city.id}>
                                {city.nombre}
                              </option>
                            ))}
                          </select>
                          {isSavingCity && (
                            <div className="text-white text-xs flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Guardando...
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowLocationSelector(false)}
                            className="text-white hover:bg-white/20 p-1 h-auto"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full sm:w-auto mt-3 sm:mt-0">
              {!company.isVerified && (
                <Button 
                  className={`text-xs sm:text-sm ${
                    company.verificationRequested || company.verificationDocumentsUploaded 
                      ? "bg-yellow-300 hover:bg-yellow-400 text-gray-800" 
                      : "bg-amber-500 hover:bg-amber-600 text-white"
                  } rounded-lg shadow-md border-none w-full sm:w-auto`}
                  onClick={() => navigate('/backoffice/verification')}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {company.verificationRequested || company.verificationDocumentsUploaded 
                    ? "Verificación Pendiente" 
                    : "Verificar Empresa"}
                </Button>
              )}
              {!company.hasLocation && (
                <Button 
                  className="text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md border-none w-full sm:w-auto"
                  onClick={() => navigate('/backoffice/profile')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Configurar Ubicación
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards - Diseño avanzado y moderno */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 mt-4">
          {stats.map((stat, index) => (
            <Card key={index} className="rounded-xl overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4 relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 sm:p-3 rounded-full bg-gradient-to-br ${
                    stat.title.includes("Pendientes") 
                      ? "from-amber-100 to-amber-200" 
                      : stat.title.includes("Aceptadas") 
                        ? "from-green-100 to-green-200" 
                        : stat.title.includes("Completados") 
                          ? "from-blue-100 to-blue-200" 
                          : "from-purple-100 to-purple-200"
                  }`}>
                    <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 leading-tight">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                      {stat.title.includes("Pendientes") ? pendingQuotes?.length || 0 : stat.value}
                    </p>
                  </div>
                </div>
                {stat.trend && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">
                    {stat.trend}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 opacity-10">
                  <stat.icon className={`h-14 w-14 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Pedidos Aceptados - En Proceso */}
        {acceptedQuotes.length > 0 && (
          <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-white mt-4">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-green-900">Pedidos En Proceso</CardTitle>
                  <CardDescription className="text-green-600 text-xs">
                    Cotizaciones aprobadas que requieren seguimiento y actualización
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={refreshActiveOrders}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-md h-auto"
                    size="sm"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="w-3 h-3 border-2 border-t-white border-l-white border-b-transparent border-r-transparent rounded-full animate-spin mr-1"></div>
                        <span>Cargando</span>
                      </div>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Actualizar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowAllActiveOrders(!showAllActiveOrders)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-md h-auto"
                    size="sm"
                  >
                    {showAllActiveOrders ? "Mostrar menos" : "Ver más"}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-green-100">
                {(showAllActiveOrders ? [...acceptedQuotes].reverse() : [...acceptedQuotes].reverse().slice(0, 3)).map((quote) => (
                  <div
                    key={quote.id}
                    className={`p-3 transition-colors cursor-pointer relative group shadow-sm hover:shadow-md rounded-md ${
                      !quote.driverId && (!quote.isPublished && !quote.published)
                        ? "bg-amber-50 border-2 border-amber-300 hover:bg-amber-100"
                        : "hover:bg-green-50/50 border border-transparent hover:border-green-200"
                    }`}
                    onClick={() => navigate(`/backoffice/order-tracking?id=${quote.id}`)}
                    title="Click para ver detalles y actualizar estado"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Info className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <div className={`p-2 rounded-full ${
                            quote.deliveryStatus === 'pendiente' ? 'bg-yellow-100' :
                            quote.deliveryStatus === 'enviado' ? 'bg-blue-100' :
                            quote.deliveryStatus === 'en_camino' ? 'bg-purple-100' :
                            quote.deliveryStatus === 'entregado' ? 'bg-green-100' :
                            quote.deliveryStatus === 'pendingDriver' ? 'bg-amber-100' : 'bg-gray-100'
                          }`}>
                            {getDeliveryStatusIcon(quote.deliveryStatus || 'pendiente')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-sm text-gray-900 truncate max-w-[150px]">
                                {quote.title || quote.requestTitle || "Pedido"}
                              </h3>
                              <Badge className={`text-xs px-1.5 py-0.5 rounded-full ${getDeliveryStatusColor(quote.deliveryStatus || 'pendiente')}`}>
                                {quote.driverId ? 
                                  quote.deliveryStatus === 'entregado' ? '✅ Entregado' : 
                                  '✅ Repartidor asignado' : 
                                  quote.deliveryStatus === 'pendiente' ? 'Pendiente' : 
                                  quote.deliveryStatus === 'enviado' ? 'Enviado' : 
                                  quote.deliveryStatus === 'en_camino' ? 'En camino' : 
                                  quote.deliveryStatus === 'entregado' ? '✅ Entregado' : 
                                  quote.deliveryStatus === 'pendingDriver' ? 'Esperando repartidor' : 
                                  quote.deliveryStatus === 'driverAssigned' ? '✅ Repartidor asignado' : 
                                  'Pendiente'}
                              </Badge>
                              {quote.deliveryId && !quote.driverId && (!quote.isPublished && !quote.published) && (
                                <Badge className="bg-red-100 text-red-800 text-xs ml-1">
                                  Sin publicar
                                </Badge>
                              )}
                              {/* Ya no necesitamos este badge porque ya tenemos otro que muestra lo mismo arriba */}
                            </div>
                            <p className="text-xs text-gray-500">
                              Cliente: {quote.usuarioNombre || quote.clientName || "Cliente Anónimo"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${quote.price || quote.monto || 0}
                          </span>
                          {(quote.deliveryTime || quote.tiempo) && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {quote.deliveryTime || quote.tiempo}
                            </span>
                          )}
                        </div>
                        
                        {/* Estado técnico para debugging */}
                        <div className="flex flex-wrap gap-1 mt-1 text-xs">
                          {quote.deliveryId && (
                            <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded">
                              ID: {quote.deliveryId.substring(0, 8)}...
                            </span>
                          )}
                          {quote.status && (
                            <span className="bg-gray-50 text-gray-700 px-1 py-0.5 rounded">
                              Status: {quote.status}
                            </span>
                          )}
                          {quote.driverId && (
                            <span className="bg-green-50 text-green-700 px-1 py-0.5 rounded">
                              Repartidor: ✓
                            </span>
                          )}
                          {quote.isPublished || quote.published ? (
                            <span className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded">
                              Publicado: ✓
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 px-1 py-0.5 rounded">
                              Publicado: ✕
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Mostrar botón de publicar si el pedido tiene deliveryId y no está publicado - BOTÓN PRINCIPAL */}
                      {quote.deliveryId && !quote.driverId && (!quote.isPublished && !quote.published) && (
                        <div className="mt-3 mb-2 bg-amber-50 p-3 rounded-lg border border-amber-100 relative animate-pulse">
                          <div className="absolute -top-2 -right-2">
                            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                              ¡Publicar!
                            </div>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-semibold text-amber-800 flex items-center">
                              <TruckIcon className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                              Esperando Repartidor
                            </h4>
                          </div>
                          {/* Botón de publicar eliminado */}
                        </div>
                      )}
                    
                      {/* Mostrar productos del pedido activo */}
                      {(quote.products && quote.products.length > 0) ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            Productos del pedido:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.products.map((product, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-all duration-200">
                                {(product.image || product.imageUrl || product.img || product.photo || product.photoUrl) ? (
                                  <img 
                                    src={product.image || product.imageUrl || product.img || product.photo || product.photoUrl} 
                                    alt={product.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {product.quantity || product.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof product.price === 'number' 
                                        ? product.price.toLocaleString() 
                                        : typeof product.price === 'string' 
                                          ? parseFloat(product.price).toLocaleString() 
                                          : typeof product.precio === 'number'
                                            ? product.precio.toLocaleString()
                                            : typeof product.precio === 'string'
                                              ? parseFloat(product.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : quote.items && quote.items.length > 0 ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            Productos del pedido:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.items.map((item, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-all duration-200">
                                {(item.image || item.imageUrl || item.img || item.photo || item.photoUrl) ? (
                                  <img 
                                    src={item.image || item.imageUrl || item.img || item.photo || item.photoUrl} 
                                    alt={item.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {item.quantity || item.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof item.price === 'number' 
                                        ? item.price.toLocaleString() 
                                        : typeof item.price === 'string' 
                                          ? parseFloat(item.price).toLocaleString() 
                                          : typeof item.precio === 'number'
                                            ? item.precio.toLocaleString()
                                            : typeof item.precio === 'string'
                                              ? parseFloat(item.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Mostrar el repartidor asignado si existe */}
                      {quote.driverId ? (
                        <div className="mt-3 mb-2 bg-green-50 p-3 rounded-lg border border-green-200 shadow-inner">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-semibold text-green-800 flex items-center">
                              <UserCheck className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                              Repartidor Asignado
                            </h4>
                            <Badge className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                              ✅ Confirmado
                            </Badge>
                          </div>
                          
                          {/* Mostrar la información del repartidor */}
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-md border border-green-200">
                            <div className="flex items-center">
                              <div className="h-9 w-9 bg-green-100 rounded-full mr-2.5 flex items-center justify-center">
                                <User className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-900">{quote.driverName || "Repartidor Asignado"}</p>
                                <p className="text-xs text-gray-500">{quote.driverPhone || "Contacto en proceso de entrega"}</p>
                                <div className="flex items-center mt-1">
                                  <Badge className="bg-green-50 border border-green-200 text-green-700 text-xs px-1.5 py-0.5 mr-1">
                                    En camino
                                  </Badge>
                                  <p className="text-xs text-gray-500">
                                    {quote.assignedAt ? `Asignado: ${new Date(quote.assignedAt instanceof Date ? quote.assignedAt : 
                                      typeof quote.assignedAt === 'object' && quote.assignedAt?.toDate ? 
                                      quote.assignedAt.toDate() : new Date()).toLocaleString('es-MX', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit'
                                    })}` : 'Recién asignado'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs px-2 py-1 h-auto rounded-lg shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/backoffice/order-tracking?id=${quote.id}`);
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Seguir
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Mostrar repartidores interesados SOLO si no hay un repartidor asignado */
                        ((quote.deliveryStatus === 'pendingDriver' || quote.status === 'pendingDriver' || quote.status === 'confirmado' || quote.estadoEmpresa === 'en_espera') && quote.deliveryId) && (
                          <div className="mt-3 mb-2 bg-amber-50 p-3 rounded-lg border border-amber-100">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-xs font-semibold text-amber-800 flex items-center">
                                <TruckIcon className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                                Esperando Repartidor
                              </h4>
                              {/* Se eliminó el badge de viaje publicado ya que ahora es automático */}
                            </div>
                            
                            {/* Si hay repartidores interesados, mostrarlos */}
                            {quote.interestedDrivers && Array.isArray(quote.interestedDrivers) && quote.interestedDrivers.length > 0 ? (
                              <div>
                                <p className="text-xs text-amber-700 mb-2">
                                  Los siguientes repartidores están interesados en este pedido:
                                </p>
                                <div className="space-y-2">
                                  {quote.interestedDrivers.map((driver, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-md border border-amber-200">
                                      <div className="flex items-center">
                                        <div className="h-8 w-8 bg-amber-100 rounded-full mr-2 flex items-center justify-center">
                                          <User className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium">{driver.name}</p>
                                          <p className="text-xs text-gray-500">{driver.phone || 'Sin teléfono'}</p>
                                        </div>
                                      </div>
                                      <Button 
                                        size="sm"
                                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs px-2 py-1 h-auto rounded-lg shadow-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignDriver(quote.id, driver.id, quote.deliveryId);
                                        }}
                                      >
                                        Asignar
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs text-amber-700 mb-3">
                                  Aún no hay repartidores interesados en este pedido. El pedido ya está visible para todos los repartidores disponibles.
                                </p>
                                {/* Botón borrado */}
                                {(quote.isPublished || quote.published) && (
                                  <p className="text-xs text-green-700 font-medium">
                                    Este viaje ya ha sido publicado y está visible para los repartidores.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                      
                      {/* Botones de acción */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-xs px-2 py-1 sm:px-3 sm:py-1.5 h-auto rounded-lg w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/backoffice/order-chat?id=${quote.id}`);
                          }}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Contactar Cliente
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs px-2 py-1 sm:px-3 sm:py-1.5 h-auto rounded-lg shadow-sm w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/backoffice/order-tracking?id=${quote.id}`);
                          }}
                        >
                          <TruckIcon className="w-3 h-3 mr-1" />
                          Actualizar Estado
                        </Button>
                        {/* Indicador de solicitud procesada automáticamente */}
                        {quote.deliveryId && !quote.driverId && (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 text-xs h-auto sm:self-center px-2 py-1 flex items-center">
                              ✓ Solicitud procesada
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Eliminamos el botón flotante para evitar duplicidad */}
                    </div>
                  </div>
                ))}
              </div>
              
              {acceptedQuotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="bg-green-50 p-3 rounded-full mb-2">
                    <Package className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No hay pedidos en proceso</h3>
                  <p className="text-xs text-gray-500 max-w-md">
                    Cuando aceptes solicitudes, los pedidos aparecerán aquí para que puedas actualizar su estado y comunicarte con los clientes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Pedidos Completados */}
        {completedQuotes.length > 0 && (
          <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-white mt-4">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-blue-900">Pedidos Completados</CardTitle>
                  <CardDescription className="text-blue-600 text-xs">
                    Pedidos entregados y finalizados exitosamente
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAllCompletedOrders(!showAllCompletedOrders)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-md h-auto"
                  size="sm"
                >
                  {showAllCompletedOrders ? "Mostrar menos" : "Ver todos"}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-blue-100">
                {(showAllCompletedOrders ? completedQuotes : completedQuotes.slice(0, 3)).map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 hover:bg-blue-50/50 transition-colors cursor-pointer relative group shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 rounded-md"
                    onClick={() => navigate(`/backoffice/order-tracking?id=${quote.id}`)}
                    title="Click para ver detalles del pedido completado"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <div className="p-2 rounded-full bg-green-100">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-semibold text-sm text-gray-900 truncate max-w-[150px]">
                                {quote.title || quote.requestTitle || "Pedido"}
                              </h3>
                              <Badge className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">
                                ✅ Completado
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Cliente: {quote.usuarioNombre || quote.clientName || "Cliente Anónimo"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${quote.price || quote.monto || 0}
                          </span>
                          {quote.statusUpdatedAt && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(quote.statusUpdatedAt.seconds * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Mostrar productos del pedido completado */}
                      {(quote.products && quote.products.length > 0) ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            Productos entregados:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.products.map((product, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-green-100 shadow-sm">
                                {(product.image || product.imageUrl || product.img || product.photo || product.photoUrl) ? (
                                  <img 
                                    src={product.image || product.imageUrl || product.img || product.photo || product.photoUrl} 
                                    alt={product.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {product.quantity || product.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof product.price === 'number' 
                                        ? product.price.toLocaleString() 
                                        : typeof product.price === 'string' 
                                          ? parseFloat(product.price).toLocaleString() 
                                          : typeof product.precio === 'number'
                                            ? product.precio.toLocaleString()
                                            : typeof product.precio === 'string'
                                              ? parseFloat(product.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : quote.items && quote.items.length > 0 ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            Productos entregados:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.items.map((item, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-green-100 shadow-sm">
                                {(item.image || item.imageUrl || item.img || item.photo || item.photoUrl) ? (
                                  <img 
                                    src={item.image || item.imageUrl || item.img || item.photo || item.photoUrl} 
                                    alt={item.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {item.quantity || item.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof item.price === 'number' 
                                        ? item.price.toLocaleString() 
                                        : typeof item.price === 'string' 
                                          ? parseFloat(item.price).toLocaleString() 
                                          : typeof item.precio === 'number'
                                            ? item.precio.toLocaleString()
                                            : typeof item.precio === 'string'
                                              ? parseFloat(item.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              
              {completedQuotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="bg-green-50 p-3 rounded-full mb-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No hay pedidos completados</h3>
                  <p className="text-xs text-gray-500 max-w-md">
                    Los pedidos marcados como entregados aparecerán aquí como un historial de trabajos completados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Solicitudes Pendientes - Diseño mejorado */}
        <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-white mt-4">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-blue-900">Solicitudes Pendientes</CardTitle>
                <CardDescription className="text-blue-600 text-xs">
                  Cotiza rápidamente y aumenta tus posibilidades de ganar el trabajo
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowAllPendingQuotes(!showAllPendingQuotes)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs px-2 py-1 sm:px-3 sm:py-2 rounded-lg shadow-md h-auto"
                size="sm"
              >
                {showAllPendingQuotes ? "Mostrar menos" : "Ver todas"}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingQuotes && pendingQuotes.length > 0 ? (
              <div className="divide-y divide-blue-100">
                {(showAllPendingQuotes ? pendingQuotes : pendingQuotes.slice(0, 5)).map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 hover:bg-blue-50/50 transition-colors relative group shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 rounded-md"
                    title="Solicitud de cliente"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900 truncate max-w-[250px]">
                            {quote.title || quote.requestTitle || "Solicitud de Cotización"}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            Cliente: {quote.usuarioNombre || quote.clientName || "Cliente Anónimo"}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                              {quote.category || "Sin categoría"}
                            </Badge>
                            {quote.urgency && (
                              <Badge variant="outline" className={`text-xs px-1.5 py-0.5 
                                ${quote.urgency === "high" 
                                  ? "bg-red-50 text-red-700 border-red-200" 
                                  : quote.urgency === "medium" 
                                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                                    : "bg-green-50 text-green-700 border-green-200"}`}>
                                {quote.urgency === "high" ? "Urgente" : quote.urgency === "medium" ? "Normal" : "Baja"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 text-xs text-gray-500">
                          <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium mb-1">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${quote.price || quote.monto || 0}
                          </span>
                          <span className="block sm:inline-block">
                            Fecha: {new Date(quote.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Productos asociados */}
                      {(quote.products && quote.products.length > 0) ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                            Productos solicitados:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.products.map((product, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
                                {(product.image || product.imageUrl || product.img) ? (
                                  <img 
                                    src={product.image || product.imageUrl || product.img} 
                                    alt={product.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {product.quantity || product.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof product.price === 'number' 
                                        ? product.price.toLocaleString() 
                                        : typeof product.price === 'string' 
                                          ? parseFloat(product.price).toLocaleString() 
                                          : typeof product.precio === 'number'
                                            ? product.precio.toLocaleString()
                                            : typeof product.precio === 'string'
                                              ? parseFloat(product.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : quote.items && quote.items.length > 0 ? (
                        <div className="mt-2 mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                            Productos solicitados:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-x-auto">
                            {quote.items.map((item, idx) => (
                              <div key={idx} className="flex items-center bg-white p-2 rounded-lg border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200">
                                {(item.image || item.imageUrl || item.img) ? (
                                  <img 
                                    src={item.image || item.imageUrl || item.img} 
                                    alt={item.name} 
                                    className="h-12 w-12 object-cover rounded-md mr-3 border border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/placeholder.svg";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-gray-100 rounded-md mr-3 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500">
                                      Cant: {item.quantity || item.cantidad || 1}
                                    </p>
                                    <p className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                      <DollarSign className="h-3 w-3 mr-0.5" />
                                      {typeof item.price === 'number' 
                                        ? item.price.toLocaleString() 
                                        : typeof item.price === 'string' 
                                          ? parseFloat(item.price).toLocaleString() 
                                          : typeof item.precio === 'number'
                                            ? item.precio.toLocaleString()
                                            : typeof item.precio === 'string'
                                              ? parseFloat(item.precio).toLocaleString()
                                              : "0"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Botones de acción */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-xs font-medium px-3 py-2 h-auto rounded-lg flex-1 sm:flex-none flex items-center justify-center transition-all duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/backoffice/order-tracking?id=${quote.id}`);
                          }}
                        >
                          <Info className="h-3.5 w-3.5 mr-1.5" />
                          Ver detalles
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-xs font-medium px-3 py-2 h-auto rounded-lg flex-1 sm:flex-none flex items-center justify-center transition-all duration-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Función para crear cotización
                            navigate(`/backoffice/quote-proposal?id=${quote.id}`);
                          }}
                          disabled={isProcessing}
                        >
                          <Calculator className="h-3.5 w-3.5 mr-1.5" />
                          Cotización
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium px-4 py-2 h-auto rounded-lg shadow-md hover:shadow-lg flex-1 sm:flex-none flex items-center justify-center transition-all duration-200 border-none relative overflow-hidden group"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Función para abrir WhatsApp
                            const clientPhone = quote.telefono || quote.clientPhone || "";
                            if (clientPhone) {
                              const whatsappMessage = `Hola! Soy de ${company?.name || 'nuestra empresa'}. He visto tu solicitud de transporte y me gustaría ayudarte. ¿Podemos hablar sobre los detalles?`;
                              const whatsappUrl = `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
                              window.open(whatsappUrl, '_blank');
                            } else {
                              alert('No se encontró el número de teléfono del cliente');
                            }
                          }}
                          disabled={isProcessing}
                        >
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-400 to-green-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                          <MessageCircle className="h-3.5 w-3.5 mr-2 transition-transform group-hover:scale-110" />
                          <span className="relative z-10">Ir a WhatsApp</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="bg-blue-50 p-3 rounded-full mb-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No hay solicitudes pendientes</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Todas las solicitudes han sido procesadas. Las nuevas solicitudes aparecerán aquí cuando los clientes te seleccionen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Se eliminó el modal de publicación manual ya que ahora es automático */}
    </DashboardLayout>
  );
};

export default DashboardEmpresas;
