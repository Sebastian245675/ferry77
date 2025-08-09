import React from "react";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, User, Calendar, Package, Search, Filter, ExternalLink, Clock, AlertTriangle, CheckCircle, Zap, ThumbsUp, ThumbsDown, Clock4, Eye, Truck, Shield, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/barraempresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Review {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userProfile?: {
    name: string;
    avatar: string;
    email?: string;
    phoneNumber?: string;
    orders?: number;
  };
  comment: string;
  createdAt: string;
  requestTitle?: string;
  requestDetails?: {
    title: string;
    status: string;
    items: any[];
    images: string[];
    date: string;
    totalPrice?: number;
    location?: string;
    urgency?: string;
  };
  userAvatar?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    averageRating: 0,
    recent: 0,
    responded: 0,
    reportedProducts: 0
  });
  
  // Estado para el modal de violaciones/reportes
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);

  // Función para analizar el sentimiento del comentario
  const analyzeSentiment = (comment: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = ['bueno', 'excelente', 'genial', 'maravilloso', 'satisfecho', 'contento', 'feliz', 'gracias', 'recomiendo', 'perfecto'];
    const negativeWords = ['malo', 'horrible', 'deficiente', 'insatisfecho', 'decepcionado', 'pésimo', 'terrible', 'descontento', 'lento', 'problema'];
    
    comment = comment.toLowerCase();
    
    let positiveScore = positiveWords.filter(word => comment.includes(word)).length;
    let negativeScore = negativeWords.filter(word => comment.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  };
  
  // Función para verificar si un producto tiene reportes de violaciones
  // Esta es una simulación - en producción, esto debería consultar a Firestore
  const checkProductViolations = (item: any) => {
    // Simulación de datos: ciertos productos tendrán violaciones basadas en sus IDs o nombres
    const itemId = item.id?.toString() || '';
    const itemName = (item.name || '').toLowerCase();
    
    // Simulamos que productos con nombres específicos tienen reportes
    const prohibitedTerms = ['prohibido', 'ilegal', 'falsificado', 'copia', 'réplica', 'pirata'];
    const trademarkTerms = ['adidas', 'nike', 'louis', 'vuitton', 'gucci', 'rolex'];
    
    // Determinamos si hay violaciones basadas en criterios simulados
    const hasNameViolation = prohibitedTerms.some(term => itemName.includes(term));
    const hasTrademarkViolation = trademarkTerms.some(term => itemName.includes(term));
    const hasIdViolation = itemId.endsWith('7') || itemId.endsWith('3'); // Simulamos con IDs que terminan en 3 o 7
    
    if (hasNameViolation || hasTrademarkViolation || hasIdViolation) {
      // Generar un ID de caso único basado en el ID del producto
      const caseId = `VIO-${Date.now().toString().substring(7)}${Math.floor(Math.random() * 1000)}`;
      
      // Determinar el tipo de violación
      let violationType = 'other';
      if (hasNameViolation) violationType = 'content_policy';
      else if (hasTrademarkViolation) violationType = 'trademark_infringement';
      else if (hasIdViolation) violationType = 'intellectual_property';
      
      // Determinar la severidad
      let severity = 'medium';
      if (hasNameViolation) severity = 'high';
      else if (hasTrademarkViolation) severity = 'critical';
      
      // Fecha del reporte (entre hoy y hace 15 días)
      const reportDate = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString();
      
      // Fecha límite (entre 3 y 7 días desde hoy)
      const daysToResolve = severity === 'critical' ? 3 : (severity === 'high' ? 5 : 7);
      const deadlineDate = new Date(Date.now() + daysToResolve * 24 * 60 * 60 * 1000).toISOString();
      
      // Estado del caso
      const caseStatuses = ['pending_review', 'under_investigation', 'awaiting_action', 'escalated'];
      const caseStatus = caseStatuses[Math.floor(Math.random() * caseStatuses.length)];
      
      // Historial del caso
      const caseHistory = [
        {
          date: reportDate,
          status: 'reported',
          action: 'El sistema detectó una posible violación y generó un reporte automático',
          agentId: 'SYSTEM'
        }
      ];
      
      // Añadir algunos eventos de historia dependiendo del estado
      if (caseStatus !== 'pending_review') {
        // Añadir evento de revisión
        const reviewDate = new Date(new Date(reportDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
        caseHistory.push({
          date: reviewDate,
          status: 'reviewed',
          action: 'Un agente revisó el caso y confirmó la violación',
          agentId: `AG${Math.floor(Math.random() * 1000)}`
        });
        
        if (caseStatus === 'escalated') {
          // Añadir evento de escalación
          const escalationDate = new Date(new Date(reviewDate).getTime() + 48 * 60 * 60 * 1000).toISOString();
          caseHistory.push({
            date: escalationDate,
            status: 'escalated',
            action: 'El caso fue escalado al equipo legal para revisión adicional',
            agentId: `AGM${Math.floor(Math.random() * 100)}`
          });
        }
      }
      
      // Mensaje específico según el tipo de violación
      let message = 'Este producto ha sido reportado por posible violación de nuestras políticas.';
      let actionRequired = 'Revisar y modificar el producto para cumplir con nuestras políticas.';
      
      if (violationType === 'content_policy') {
        message = 'Este producto contiene términos prohibidos que violan nuestras políticas de contenido.';
        actionRequired = 'Eliminar cualquier término prohibido o contenido inapropiado de la descripción y título del producto.';
      } else if (violationType === 'trademark_infringement') {
        message = 'Este producto ha sido reportado por posible infracción de marca registrada.';
        actionRequired = 'Eliminar cualquier referencia a marcas registradas sin autorización y proporcionar documentación de autenticidad si es un producto original.';
      } else if (violationType === 'intellectual_property') {
        message = 'Este producto ha sido reportado por posible violación de propiedad intelectual.';
        actionRequired = 'Verificar que tienes los derechos para vender este producto y proporcionar documentación que lo respalde.';
      }
      
      // Definir consecuencias basadas en la severidad
      let consequenceWarning = 'Si no resuelve este problema antes de la fecha límite, su cuenta podría recibir una sanción.';
      if (severity === 'critical') {
        consequenceWarning = 'Si no resuelve este problema en 3 días, su cuenta será suspendida temporalmente y el producto será eliminado permanentemente.';
      } else if (severity === 'high') {
        consequenceWarning = 'Si no resuelve este problema en 5 días, el producto será ocultado y su cuenta podría recibir restricciones.';
      }
      
      // Lista de acciones disponibles
      const availableActions = [
        { id: 'edit_product', label: 'Editar producto', type: 'primary' },
        { id: 'upload_document', label: 'Subir documentación', type: 'secondary' },
        { id: 'appeal', label: 'Apelar decisión', type: 'outline' }
      ];
      
      // Añadir acción específica según tipo de violación
      if (violationType === 'content_policy') {
        availableActions.push({ id: 'remove_terms', label: 'Eliminar términos prohibidos', type: 'primary' });
      } else if (violationType === 'trademark_infringement') {
        availableActions.push({ id: 'authenticity_proof', label: 'Certificar autenticidad', type: 'primary' });
      }
      
      return {
        hasViolation: true,
        caseId,
        type: violationType,
        severity,
        reportDate,
        deadlineDate,
        status: caseStatus,
        message,
        actionRequired,
        consequenceWarning,
        history: caseHistory,
        actions: availableActions,
        reportedBy: caseHistory[0].agentId,
        productName: item.name || 'Producto sin nombre',
        productId: itemId,
        affectedRequests: Math.floor(Math.random() * 5) + 1, // Número de solicitudes afectadas
        daysLeft: daysToResolve
      };
    }
    
    return { hasViolation: false };
  };
  
  useEffect(() => {
    const fetchReviewsWithRequestDetails = async () => {
      setIsLoading(true);
      try {
        // 1. Obtener todos los comentarios (ordenados por fecha reciente)
        const commentsQuery = query(
          collection(db, "comments"),
          orderBy("createdAt", "desc")
        );
        const commentsSnapshot = await getDocs(commentsQuery);

        if (commentsSnapshot.empty) {
          setReviews([]);
          setFilteredReviews([]);
          setIsLoading(false);
          return;
        }

        // 2. Extraer comentarios y sus IDs de solicitud
        const reviewsData: Review[] = commentsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            requestId: data.requestId || "",
            userId: data.userId || "",
            userName: data.userName || "Usuario",
            comment: data.comment || "",
            createdAt: data.createdAt || new Date().toISOString(),
          };
        });

        // 3. Crear un conjunto de IDs de solicitud únicas
        const requestIds = [...new Set(reviewsData.map((review) => review.requestId))];
        
        // 4. Crear un conjunto de IDs de usuarios únicos
        const userIds = [...new Set(reviewsData.map((review) => review.userId))];

        // 5. Obtener detalles de las solicitudes
        const requestDetailsMap: { [key: string]: any } = {};

        for (const requestId of requestIds) {
          if (!requestId) continue;

          try {
            // Intentar obtener desde la colección "solicitud"
            const requestDoc = await getDocs(
              query(collection(db, "solicitud"), where("__name__", "==", requestId))
            );

            if (!requestDoc.empty) {
              const requestData = requestDoc.docs[0].data();
              
              // Buscar imágenes en los items si existen
              const itemImages: string[] = [];
              if (requestData.items && Array.isArray(requestData.items)) {
                requestData.items.forEach((item: any) => {
                  // Buscar imagen en cualquiera de las propiedades posibles
                  const itemImage = item.image || item.imageUrl || item.img || item.imgUrl;
                  if (itemImage) itemImages.push(itemImage);
                });
              }
              
              requestDetailsMap[requestId] = {
                title: requestData.title || "Solicitud sin título",
                status: requestData.status || "pendiente",
                items: requestData.items || [],
                images: itemImages.length > 0 ? itemImages : ["https://via.placeholder.com/300x200?text=Sin+imagen"],
                date: requestData.createdAt || new Date().toISOString(),
                totalPrice: requestData.totalPrice || requestData.budget || 0,
                location: requestData.location || "No especificada",
                urgency: requestData.urgency || "normal"
              };
            } else {
              // Si no está en "solicitud", intentar con "cotizaciones"
              const quoteDoc = await getDocs(
                query(collection(db, "cotizaciones"), where("requestId", "==", requestId))
              );
              
              if (!quoteDoc.empty) {
                const quoteData = quoteDoc.docs[0].data();
                requestDetailsMap[requestId] = {
                  title: quoteData.requestTitle || "Cotización sin título",
                  status: quoteData.status || "cotizado",
                  items: quoteData.items || [],
                  images: quoteData.images || ["https://via.placeholder.com/300x200?text=Sin+imagen"],
                  date: quoteData.createdAt || new Date().toISOString(),
                  totalPrice: quoteData.total || 0,
                  location: quoteData.location || "No especificada",
                  urgency: "normal"
                };
              } else {
                // Valor por defecto si no se encuentra
                requestDetailsMap[requestId] = {
                  title: "Solicitud desconocida",
                  status: "desconocido",
                  items: [],
                  images: ["https://via.placeholder.com/300x200?text=Sin+imagen"],
                  date: new Date().toISOString(),
                  totalPrice: 0,
                  location: "No especificada",
                  urgency: "normal"
                };
              }
            }
          } catch (e) {
            console.error(`Error al obtener detalles de solicitud ${requestId}:`, e);
          }
        }
        
        // 6. Obtener detalles de los usuarios
        const userDetailsMap: { [key: string]: any } = {};
        
        for (const userId of userIds) {
          if (!userId) continue;
          
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userDetailsMap[userId] = {
                name: userData.name || userData.displayName || "Usuario",
                avatar: userData.photoURL || userData.avatar || "",
                email: userData.email || "",
                phoneNumber: userData.phoneNumber || userData.phone || "",
                orders: userData.completedJobs || 0
              };
            }
          } catch (e) {
            console.error(`Error al obtener detalles de usuario ${userId}:`, e);
          }
        }

        // 7. Combinar los datos de comentarios con los detalles de solicitud y analizar sentimiento
        const enrichedReviews = await Promise.all(reviewsData.map(async (review) => {
          // Generar avatar basado en userId
          const userInitial = review.userId?.charAt(0)?.toUpperCase() || 'U';
          const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500'];
          const colorIndex = review.userId ? review.userId.charCodeAt(0) % avatarColors.length : 0;
          
          // Analizar sentimiento
          const sentiment = analyzeSentiment(review.comment);
          
          return {
            ...review,
            requestTitle: requestDetailsMap[review.requestId]?.title || "Solicitud desconocida",
            requestDetails: requestDetailsMap[review.requestId] || null,
            userProfile: userDetailsMap[review.userId] || null,
            userAvatar: userDetailsMap[review.userId]?.avatar || avatarColors[colorIndex],
            sentiment
          };
        }));

        // Calcular estadísticas
        const positive = enrichedReviews.filter(r => r.sentiment === 'positive').length;
        const negative = enrichedReviews.filter(r => r.sentiment === 'negative').length;
        const neutral = enrichedReviews.filter(r => r.sentiment === 'neutral').length;
        const total = enrichedReviews.length;
        
        // Calcular calificación promedio (5 estrellas para positivo, 3 para neutral, 1 para negativo)
        const totalScore = (positive * 5) + (neutral * 3) + (negative * 1);
        const averageRating = total > 0 ? parseFloat((totalScore / total).toFixed(1)) : 0;
        
        // Contabilizar reseñas recientes (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = enrichedReviews.filter(
          r => new Date(r.createdAt) >= sevenDaysAgo
        ).length;
        
        // Contar productos reportados
        let reportedProducts = 0;
        enrichedReviews.forEach(review => {
          if (review.requestDetails?.items) {
            review.requestDetails.items.forEach((item: any) => {
              if (checkProductViolations(item).hasViolation) {
                reportedProducts++;
              }
            });
          }
        });
        
        setStats({
          total,
          positive,
          neutral,
          negative,
          averageRating,
          recent,
          responded: 0, // Por implementar sistema de respuestas
          reportedProducts
        });

        setReviews(enrichedReviews);
        setFilteredReviews(enrichedReviews);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
        setFilteredReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewsWithRequestDetails();
  }, []);
  
  // Filtrar reseñas cuando cambian los filtros
  useEffect(() => {
    if (reviews.length === 0) {
      setFilteredReviews([]);
      return;
    }
    
    let filtered = [...reviews];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        review => 
          review.comment.toLowerCase().includes(lowerSearchTerm) || 
          review.requestTitle?.toLowerCase().includes(lowerSearchTerm) ||
          review.userId.toLowerCase().includes(lowerSearchTerm) ||
          review.userName.toLowerCase().includes(lowerSearchTerm) ||
          review.userProfile?.name?.toLowerCase().includes(lowerSearchTerm) ||
          review.requestDetails?.location?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filtrar por sentimiento
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(review => review.sentiment === sentimentFilter);
    }
    
    // Filtrar por pestaña activa
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'positive':
          filtered = filtered.filter(review => review.sentiment === 'positive');
          break;
        case 'negative':
          filtered = filtered.filter(review => review.sentiment === 'negative');
          break;
        case 'neutral':
          filtered = filtered.filter(review => review.sentiment === 'neutral');
          break;
        case 'recent':
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filtered = filtered.filter(review => new Date(review.createdAt) >= sevenDaysAgo);
          break;
      }
    }
    
    // Ordenar por fecha más reciente
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredReviews(filtered);
  }, [reviews, searchTerm, sentimentFilter, activeTab]);

  // Función para renderizar estrellas basadas en sentimiento
  const renderStars = (sentiment: 'positive' | 'negative' | 'neutral' | undefined) => {
    let stars = 3; // Neutral por defecto
    if (sentiment === 'positive') stars = 5;
    if (sentiment === 'negative') stars = 1;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };
  
  const renderSentimentBadge = (sentiment: 'positive' | 'negative' | 'neutral' | undefined) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">Positiva</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">Negativa</Badge>;
      case 'neutral':
        return <Badge className="bg-blue-100 text-blue-800">Neutral</Badge>;
      default:
        return null;
    }
  };
  
  // Función para mostrar los detalles de una revisión
  const handleOpenReviewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };
  
  // Función para mostrar detalles de violación
  const handleOpenViolationDetails = (violation: any) => {
    setSelectedViolation(violation);
    setShowViolationModal(true);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="rounded-xl p-8 text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Reseñas y Comentarios</h1>
              <p className="text-blue-100 text-lg">
                Gestiona y analiza todos los comentarios de tus clientes
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-white/30 hover:bg-white/40 text-white px-3 py-1">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {stats.recent} comentarios nuevos
                </Badge>
                <Badge className="bg-white/30 hover:bg-white/40 text-white px-3 py-1">
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  {stats.total} en total
                </Badge>
                {stats.reportedProducts > 0 && (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {stats.reportedProducts} productos reportados
                  </Badge>
                )}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-5 flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-blue-100">Calificación</p>
                <p className="text-4xl font-bold">{stats.averageRating}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${i < Math.round(stats.averageRating) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`} 
                    />
                  ))}
                </div>
                <p className="text-xs text-blue-100 mt-1">Basado en {stats.total} comentarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow border-b-4 border-b-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comentarios</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-blue-600 ml-2">
                      <span className="font-semibold">+{stats.recent}</span> nuevos
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow border-b-4 border-b-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Positivos</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.positive}</p>
                    <p className="text-sm text-green-600 ml-2">
                      <span className="font-semibold">{stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%</span> del total
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow border-b-4 border-b-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Neutrales</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.neutral}</p>
                    <p className="text-sm text-amber-600 ml-2">
                      <span className="font-semibold">{stats.total > 0 ? Math.round((stats.neutral / stats.total) * 100) : 0}%</span> del total
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <Clock4 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow border-b-4 border-b-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Negativos</p>
                  <div className="flex items-baseline mt-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.negative}</p>
                    <p className="text-sm text-red-600 ml-2">
                      <span className="font-semibold">{stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%</span> del total
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-red-100">
                  <ThumbsDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {stats.reportedProducts > 0 && (
            <Card className="shadow-md hover:shadow-lg transition-shadow border-b-4 border-b-red-600 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-red-600/10 rounded-full"></div>
              <div className="absolute right-8 top-6 w-8 h-8 bg-red-600/20 rounded-full"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse mr-2"></span>
                      Productos Reportados
                    </p>
                    <div className="flex items-baseline mt-1">
                      <p className="text-3xl font-bold text-gray-900">{stats.reportedProducts}</p>
                      <p className="text-sm text-red-600 ml-2 font-semibold">
                        ¡Acción requerida!
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center">
                  <div className="flex-1 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full w-3/4"></div>
                  </div>
                  <span className="text-xs ml-2 text-gray-500 whitespace-nowrap">75% en riesgo</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Tabs & Filters */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TabsList className="h-auto p-1 bg-blue-50">
                <TabsTrigger 
                  value="all" 
                  className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Todos
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{reviews.length}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="positive" 
                  className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Positivos
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">{stats.positive}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="neutral" 
                  className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Neutrales
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">{stats.neutral}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="negative" 
                  className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Negativos
                  <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700">{stats.negative}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="recent" 
                  className="px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Recientes
                  <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">{stats.recent}</Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar en comentarios, pedidos, usuarios..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por opinión" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los comentarios</SelectItem>
                        <SelectItem value="positive">Comentarios positivos</SelectItem>
                        <SelectItem value="neutral">Comentarios neutrales</SelectItem>
                        <SelectItem value="negative">Comentarios negativos</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" onClick={() => {
                      setSearchTerm('');
                      setSentimentFilter('all');
                      setActiveTab('all');
                    }}>
                      <Filter className="w-4 h-4 mr-2" />
                      Limpiar filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs>
        
        {/* Reviews Content */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Cargando...</span>
              </div>
              <p className="mt-4 text-gray-600">Cargando comentarios...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700">No hay reseñas disponibles</p>
                <p className="text-gray-500 mt-1">
                  {searchTerm || sentimentFilter !== 'all' || activeTab !== 'all'
                    ? 'Intenta ajustar los filtros para ver más resultados'
                    : 'Aún no tienes comentarios de clientes'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredReviews.map((review) => (
                <Card 
                  key={review.id} 
                  className={`shadow-md hover:shadow-lg transition-all border-l-4 cursor-pointer ${
                    review.sentiment === 'positive' ? 'border-l-green-500' : 
                    review.sentiment === 'negative' ? 'border-l-red-500' : 
                    'border-l-blue-500'
                  }`}
                  onClick={() => handleOpenReviewDetails(review)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                        <Avatar className={`h-10 w-10 ${typeof review.userAvatar === 'string' && review.userAvatar.startsWith('http') 
                          ? '' 
                          : typeof review.userAvatar === 'string' && review.userAvatar.startsWith('bg-') 
                            ? review.userAvatar 
                            : 'bg-blue-500'}`}
                        >
                          {typeof review.userAvatar === 'string' && review.userAvatar.startsWith('http') ? (
                            <AvatarImage src={review.userAvatar} alt={review.userName} />
                          ) : null}
                          <AvatarFallback className="text-white">
                            {review.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.userProfile?.name || review.userName || "Usuario"}</p>
                          {renderStars(review.sentiment)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {renderSentimentBadge(review.sentiment)}
                        {new Date(review.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                          <Badge className="bg-purple-100 text-purple-800">Nuevo</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-800 italic">"{review.comment}"</p>
                      
                      <div className="bg-gray-50 p-4 rounded-lg flex flex-col space-y-2">
                        <div className="flex gap-2 items-start">
                          <div className="flex-shrink-0 w-16 h-16 overflow-hidden rounded-md border border-gray-200 relative">
                            {review.requestDetails?.images && review.requestDetails.images.length > 0 ? (
                              <img 
                                src={review.requestDetails.images[0]} 
                                alt={review.requestTitle} 
                                className="h-full w-full object-cover object-center" 
                                onError={(e) => {
                                  // Si falla la carga, mostrar un placeholder
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null; // Evita bucle infinito
                                  target.src = "https://via.placeholder.com/300x200?text=Sin+imagen";
                                }}
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            
                                {/* Badge de alerta si hay productos reportados */}
                            {review.requestDetails?.items?.some(item => checkProductViolations(item).hasViolation) && (
                              <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md animate-pulse">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <Package className="w-4 h-4 text-blue-500 mr-2" />
                              <span className="text-sm font-semibold">Pedido: </span>
                              <span className="text-sm ml-1 text-blue-600 truncate">
                                {review.requestTitle}
                              </span>
                            </div>
                            
                            {/* Badge de alerta de producto reportado */}
                            {review.requestDetails?.items?.some(item => {
                              const violation = checkProductViolations(item);
                              return violation.hasViolation;
                            }) && (
                              <div className="flex items-center mt-1 gap-2">
                                <Badge className="bg-red-100 text-red-800 border border-red-200 gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Productos reportados
                                </Badge>
                                
                                {(() => {
                                  // Verificamos la severidad más alta
                                  let highestSeverity = '';
                                  let daysLeft = 7;
                                  
                                  review.requestDetails?.items?.forEach(item => {
                                    const violation = checkProductViolations(item);
                                    if (violation.hasViolation) {
                                      if (violation.severity === 'critical') {
                                        highestSeverity = 'critical';
                                        if (violation.daysLeft < daysLeft) daysLeft = violation.daysLeft;
                                      } 
                                      else if (violation.severity === 'high' && highestSeverity !== 'critical') {
                                        highestSeverity = 'high';
                                        if (violation.daysLeft < daysLeft) daysLeft = violation.daysLeft;
                                      }
                                      else if (violation.severity === 'medium' && highestSeverity === '') {
                                        highestSeverity = 'medium';
                                        if (violation.daysLeft < daysLeft) daysLeft = violation.daysLeft;
                                      }
                                    }
                                  });
                                  
                                  return (
                                    <Badge className={`gap-1 ${
                                      highestSeverity === 'critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                      highestSeverity === 'high' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                      'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      {daysLeft} días para resolver
                                    </Badge>
                                  );
                                })()}
                              </div>
                            )}                            <div className="flex items-center mt-1">
                              <Badge 
                                className={`mr-2 ${
                                  review.requestDetails?.status === 'entregado' ? 'bg-green-100 text-green-800' :
                                  review.requestDetails?.status === 'completado' ? 'bg-blue-100 text-blue-800' :
                                  review.requestDetails?.status === 'confirmado' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {review.requestDetails?.status || 'pendiente'}
                              </Badge>
                              
                              {review.requestDetails?.totalPrice ? (
                                <span className="text-xs font-medium text-gray-700">
                                  ${review.requestDetails.totalPrice.toLocaleString('es-ES')}
                                </span>
                              ) : null}
                            </div>
                            
                            <div className="flex items-center mt-1">
                              <Calendar className="w-4 h-4 text-blue-500 mr-2" />
                              <span className="text-xs text-gray-500">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver pedido
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          Responder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Modal detalle de revisión */}
        {selectedReview && (
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Detalle de comentario</DialogTitle>
                <DialogDescription>
                  Información completa sobre el comentario y el pedido relacionado
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Columna izquierda - Información del usuario */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        Información del cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className={`h-24 w-24 mb-3 ${typeof selectedReview.userAvatar === 'string' && selectedReview.userAvatar.startsWith('http') 
                          ? '' 
                          : typeof selectedReview.userAvatar === 'string' && selectedReview.userAvatar.startsWith('bg-') 
                            ? selectedReview.userAvatar 
                            : 'bg-blue-500'}`}
                        >
                          {typeof selectedReview.userAvatar === 'string' && selectedReview.userAvatar.startsWith('http') ? (
                            <AvatarImage src={selectedReview.userAvatar} alt={selectedReview.userName} />
                          ) : null}
                          <AvatarFallback className="text-white text-3xl">
                            {selectedReview.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-semibold mb-1">
                          {selectedReview.userProfile?.name || selectedReview.userName || "Usuario"}
                        </h3>
                        <Badge variant="outline" className="mb-1">Cliente</Badge>
                        {selectedReview.userProfile?.orders && (
                          <p className="text-sm text-gray-500">
                            {selectedReview.userProfile.orders} pedidos realizados
                          </p>
                        )}
                      </div>
                      
                      {selectedReview.userProfile?.email && (
                        <div className="flex items-center py-2 border-t border-gray-100">
                          <span className="text-gray-500 text-sm w-20">Email:</span>
                          <span className="text-sm font-medium">{selectedReview.userProfile.email}</span>
                        </div>
                      )}
                      
                      {selectedReview.userProfile?.phoneNumber && (
                        <div className="flex items-center py-2 border-t border-gray-100">
                          <span className="text-gray-500 text-sm w-20">Teléfono:</span>
                          <span className="text-sm font-medium">{selectedReview.userProfile.phoneNumber}</span>
                        </div>
                      )}
                      
                      <Button variant="secondary" className="w-full mt-4">
                        Ver historial del cliente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Columna derecha - Información del comentario y pedido */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Tarjeta de comentario */}
                  <Card className={`border-l-4 ${
                    selectedReview.sentiment === 'positive' ? 'border-l-green-500' : 
                    selectedReview.sentiment === 'negative' ? 'border-l-red-500' : 
                    'border-l-blue-500'
                  }`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">Comentario</CardTitle>
                        <div className="flex items-center gap-2">
                          {renderSentimentBadge(selectedReview.sentiment)}
                          <Badge className="bg-gray-100 text-gray-800">
                            {new Date(selectedReview.createdAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-lg italic">"{selectedReview.comment}"</p>
                      </div>
                      <div className="flex items-center">
                        {renderStars(selectedReview.sentiment)}
                        <p className="ml-2 text-sm text-gray-600">
                          {selectedReview.sentiment === 'positive' ? 'Opinión positiva' : 
                           selectedReview.sentiment === 'negative' ? 'Opinión negativa' : 
                           'Opinión neutral'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tarjeta de pedido */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Package className="mr-2 h-5 w-5" />
                        Detalles del pedido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Imagen del pedido */}
                          <div className="md:w-1/3">
                            {selectedReview.requestDetails?.images && selectedReview.requestDetails.images.length > 0 ? (
                              <div className="aspect-video overflow-hidden rounded-md border border-gray-200 relative">
                                <img 
                                  src={selectedReview.requestDetails.images[0]} 
                                  alt={selectedReview.requestTitle} 
                                  className="h-full w-full object-cover object-center" 
                                  onError={(e) => {
                                    // Si falla la carga, mostrar un placeholder
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null; // Evita bucle infinito
                                    target.src = "https://via.placeholder.com/300x200?text=Sin+imagen";
                                  }}
                                />
                                {selectedReview.requestDetails.images.length > 1 && (
                                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                                    +{selectedReview.requestDetails.images.length - 1} imágenes
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="aspect-video bg-gray-100 flex items-center justify-center rounded-md border border-gray-200">
                                <Package className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          {/* Información del pedido */}
                          <div className="md:w-2/3 space-y-3">
                            <h3 className="text-lg font-semibold">{selectedReview.requestTitle}</h3>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={
                                  selectedReview.requestDetails?.status === 'entregado' ? 'bg-green-100 text-green-800' :
                                  selectedReview.requestDetails?.status === 'completado' ? 'bg-blue-100 text-blue-800' :
                                  selectedReview.requestDetails?.status === 'confirmado' ? 'bg-amber-100 text-amber-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                <Truck className="w-3.5 h-3.5 mr-1" />
                                {selectedReview.requestDetails?.status || 'pendiente'}
                              </Badge>
                              
                              {selectedReview.requestDetails?.urgency && (
                                <Badge className={
                                  selectedReview.requestDetails.urgency === 'alta' ? 'bg-red-100 text-red-800' :
                                  selectedReview.requestDetails.urgency === 'baja' ? 'bg-green-100 text-green-800' :
                                  'bg-amber-100 text-amber-800'
                                }>
                                  <Zap className="w-3.5 h-3.5 mr-1" />
                                  Urgencia {selectedReview.requestDetails.urgency}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                ${selectedReview.requestDetails?.totalPrice?.toLocaleString('es-ES') || '0'}
                              </div>
                              
                              {selectedReview.requestDetails?.location && (
                                <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                                  {selectedReview.requestDetails.location}
                                </div>
                              )}
                              
                              <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                                {new Date(selectedReview.requestDetails?.date || selectedReview.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Items del pedido */}
                        {selectedReview.requestDetails?.items && selectedReview.requestDetails.items.length > 0 && (
                          <div className="border rounded-lg overflow-hidden mt-4">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                              <h4 className="font-medium">Items del pedido</h4>
                            </div>
                            <div className="divide-y">
                              {selectedReview.requestDetails.items.map((item: any, idx: number) => {
                                // Verificamos si el producto tiene violaciones
                                const violationInfo = checkProductViolations(item);
                                
                                return (
                                  <div key={idx} className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {/* Imagen del producto */}
                                      <div className="relative">
                                        {(item.image || item.imageUrl || item.img || item.imgUrl) ? (
                                          <div className="w-14 h-14 rounded-md overflow-hidden border border-gray-200">
                                            <img 
                                              src={item.image || item.imageUrl || item.img || item.imgUrl} 
                                              alt={item.name || 'Producto'} 
                                              className="h-full w-full object-cover" 
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = "https://via.placeholder.com/150?text=Sin+imagen";
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-14 h-14 bg-gray-100 rounded-md flex items-center justify-center">
                                            <Package className="w-6 h-6 text-gray-400" />
                                          </div>
                                        )}
                                        {/* Badge de alerta si hay violaciones */}
                                        {violationInfo.hasViolation && (
                                          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Nombre y badge de violación */}
                                      <div className="flex flex-col gap-1">
                                        <span>{item.name || 'Item sin nombre'}</span>
                                        
                                        {violationInfo.hasViolation && (
                                          <Badge 
                                            className="bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer flex items-center gap-1"
                                            onClick={() => handleOpenViolationDetails(violationInfo)}
                                          >
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>¡Producto reportado!</span>
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-sm font-medium">
                                        {item.quantity || 1} x {item.price ? `$${item.price}` : 'Sin precio'}
                                      </span>
                                      
                                      {violationInfo.hasViolation && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                          onClick={() => handleOpenViolationDetails(violationInfo)}
                                        >
                                          Ver reporte
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between pt-4">
                          <Button variant="outline">Ver pedido completo</Button>
                          <Button>Responder comentario</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Modal de detalles de violación */}
      {selectedViolation && (
        <Dialog open={showViolationModal} onOpenChange={setShowViolationModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 sm:p-6 md:p-8">
            <DialogHeader className="p-4 sm:p-6 sticky top-0 bg-white z-10 border-b sm:border-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${
                    selectedViolation.severity === 'critical' ? 'bg-gradient-to-br from-red-100 to-red-200 shadow-sm shadow-red-200' :
                    selectedViolation.severity === 'high' ? 'bg-gradient-to-br from-amber-100 to-amber-200 shadow-sm shadow-amber-200' :
                    'bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-sm shadow-yellow-200'
                  }`}>
                    <AlertCircle className={`h-6 w-6 ${
                      selectedViolation.severity === 'critical' ? 'text-red-600' :
                      selectedViolation.severity === 'high' ? 'text-amber-600' :
                      'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      Caso de violación #{selectedViolation.caseId}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      {selectedViolation.productName} - {selectedViolation.type === 'content_policy' ? 'Política de contenido' : 
                       selectedViolation.type === 'intellectual_property' ? 'Propiedad intelectual' :
                       selectedViolation.type === 'trademark_infringement' ? 'Infracción de marca registrada' :
                       'Otro tipo de violación'}
                    </DialogDescription>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                  <div className={`py-1 px-3 rounded-full flex items-center gap-1.5 ${
                    selectedViolation.status === 'pending_review' ? 'bg-blue-100 text-blue-700' :
                    selectedViolation.status === 'under_investigation' ? 'bg-purple-100 text-purple-700' :
                    selectedViolation.status === 'awaiting_action' ? 'bg-amber-100 text-amber-700' :
                    selectedViolation.status === 'escalated' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse"></span>
                    <span className="text-sm font-medium">
                      {selectedViolation.status === 'pending_review' ? 'Pendiente de revisión' :
                       selectedViolation.status === 'under_investigation' ? 'En investigación' :
                       selectedViolation.status === 'awaiting_action' ? 'Acción requerida' :
                       selectedViolation.status === 'escalated' ? 'Escalado' :
                       'Estado desconocido'}
                    </span>
                  </div>
                  
                  <Badge className={`text-xs md:text-sm font-semibold px-3 py-1 ${
                    selectedViolation.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' :
                    selectedViolation.severity === 'high' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  }`}>
                    {selectedViolation.severity === 'critical' ? 'CRÍTICO' : 
                     selectedViolation.severity === 'high' ? 'ALTA SEVERIDAD' : 
                     'MEDIA SEVERIDAD'}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Banner de tiempo restante */}
              <div className={`rounded-lg p-4 flex items-center justify-between ${
                selectedViolation.daysLeft <= 3 ? 'bg-red-50 border border-red-200' :
                selectedViolation.daysLeft <= 5 ? 'bg-amber-50 border border-amber-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedViolation.daysLeft <= 3 ? 'bg-red-100' :
                    selectedViolation.daysLeft <= 5 ? 'bg-amber-100' :
                    'bg-blue-100'
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      selectedViolation.daysLeft <= 3 ? 'text-red-600' :
                      selectedViolation.daysLeft <= 5 ? 'text-amber-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${
                      selectedViolation.daysLeft <= 3 ? 'text-red-800' :
                      selectedViolation.daysLeft <= 5 ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>
                      Tiempo restante para resolver
                    </h3>
                    <p className={
                      selectedViolation.daysLeft <= 3 ? 'text-red-600' :
                      selectedViolation.daysLeft <= 5 ? 'text-amber-600' :
                      'text-blue-600'
                    }>
                      {selectedViolation.daysLeft} días - Fecha límite: {new Date(selectedViolation.deadlineDate).toLocaleDateString('es-ES', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-full rounded-full ${
                        selectedViolation.daysLeft <= 3 ? 'bg-red-500' :
                        selectedViolation.daysLeft <= 5 ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(selectedViolation.daysLeft / 7) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round((selectedViolation.daysLeft / 7) * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna 1: Detalles del caso */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-file-warning"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M12 12v1"/><path d="M12 16h.01"/></svg>
                        Información del caso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Número de caso</p>
                            <p className="text-sm font-medium">{selectedViolation.caseId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Estado</p>
                            <p className="text-sm font-medium">
                              {selectedViolation.status === 'pending_review' ? 'Pendiente de revisión' :
                               selectedViolation.status === 'under_investigation' ? 'En investigación' :
                               selectedViolation.status === 'awaiting_action' ? 'Acción requerida' :
                               selectedViolation.status === 'escalated' ? 'Escalado' :
                               'Estado desconocido'}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Tipo de violación</p>
                          <Badge variant="outline" className="mt-1">
                            {selectedViolation.type === 'content_policy' ? 'Política de contenido' : 
                             selectedViolation.type === 'intellectual_property' ? 'Propiedad intelectual' :
                             selectedViolation.type === 'trademark_infringement' ? 'Infracción de marca registrada' :
                             'Otro tipo de violación'}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Producto afectado</p>
                          <p className="text-sm font-medium">{selectedViolation.productName}</p>
                          <p className="text-xs text-gray-500">ID: {selectedViolation.productId}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Reportado por</p>
                          <p className="text-sm font-medium">{selectedViolation.reportedBy}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Solicitudes afectadas</p>
                          <p className="text-sm font-medium">{selectedViolation.affectedRequests}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-timer"><path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/></svg>
                        Fechas importantes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Fecha de reporte</p>
                            <p className="text-sm font-medium">
                              {new Date(selectedViolation.reportDate).toLocaleDateString('es-ES', {
                                day: 'numeric', month: 'long', year: 'numeric'
                              })}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {Math.floor((Date.now() - new Date(selectedViolation.reportDate).getTime()) / (1000 * 60 * 60 * 24))} días atrás
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Fecha límite</p>
                            <p className="text-sm font-semibold text-red-600">
                              {new Date(selectedViolation.deadlineDate).toLocaleDateString('es-ES', {
                                day: 'numeric', month: 'long', year: 'numeric'
                              })}
                            </p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">
                            {selectedViolation.daysLeft} días restantes
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Columna 2-3: Información del caso y acciones */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Alerta principal */}
                  <Alert className={
                    selectedViolation.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    selectedViolation.severity === 'high' ? 'border-amber-500 bg-amber-50' :
                    'border-yellow-500 bg-yellow-50'
                  }>
                    <AlertTriangle className={
                      selectedViolation.severity === 'critical' ? 'text-red-500' :
                      selectedViolation.severity === 'high' ? 'text-amber-500' :
                      'text-yellow-500'
                    } />
                    <AlertTitle className={
                      selectedViolation.severity === 'critical' ? 'text-red-800' :
                      selectedViolation.severity === 'high' ? 'text-amber-800' :
                      'text-yellow-800'
                    }>
                      Acción requerida - Severidad {selectedViolation.severity === 'critical' ? 'crítica' : 
                       selectedViolation.severity === 'high' ? 'alta' : 'media'}
                    </AlertTitle>
                    <AlertDescription className={
                      selectedViolation.severity === 'critical' ? 'text-red-700' :
                      selectedViolation.severity === 'high' ? 'text-amber-700' :
                      'text-yellow-700'
                    }>
                      {selectedViolation.consequenceWarning}
                    </AlertDescription>
                  </Alert>
                  
                  {/* Tarjeta de mensaje e instrucciones */}
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-megaphone"><path d="m3 11 18-5v12L3 13"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                        Mensaje del sistema e instrucciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium mb-2">Detalles de la violación</h4>
                          <p className="text-gray-700">{selectedViolation.message}</p>
                        </div>
                        
                        <div className={`p-4 rounded-md ${
                          selectedViolation.severity === 'critical' ? 'bg-red-50' :
                          selectedViolation.severity === 'high' ? 'bg-amber-50' :
                          'bg-yellow-50'
                        }`}>
                          <h4 className="font-medium mb-2">Acción requerida</h4>
                          <p className={
                            selectedViolation.severity === 'critical' ? 'text-red-700' :
                            selectedViolation.severity === 'high' ? 'text-amber-700' :
                            'text-yellow-700'
                          }>{selectedViolation.actionRequired}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Tarjeta de historial de caso */}
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-base flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-history"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                        Historial del caso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-0 relative">
                        {selectedViolation.history.map((event: any, idx: number) => (
                          <div key={idx} className="flex gap-3 pb-5 relative">
                            {/* Línea vertical que conecta los eventos */}
                            {idx < selectedViolation.history.length - 1 && (
                              <div className="absolute top-7 left-3 bottom-0 w-0.5 bg-gray-200"></div>
                            )}
                            
                            {/* Icono del evento */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                              event.status === 'reported' ? 'bg-blue-100 text-blue-600' :
                              event.status === 'reviewed' ? 'bg-amber-100 text-amber-600' :
                              event.status === 'escalated' ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {event.status === 'reported' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                              ) : event.status === 'reviewed' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-eye"><circle cx="12" cy="12" r="2"/><path d="M22 12c-2.667 4.667-6 7-10 7s-7.333-2.333-10-7c2.667-4.667 6-7 10-7s7.333 2.333 10 7z"/></svg>
                              ) : event.status === 'escalated' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-up-right"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-activity"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                              )}
                            </div>
                            
                            {/* Contenido del evento */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {event.status === 'reported' ? 'Reporte generado' :
                                     event.status === 'reviewed' ? 'Caso revisado' :
                                     event.status === 'escalated' ? 'Caso escalado' :
                                     'Actualización del caso'}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {event.agentId}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {new Date(event.date).toLocaleDateString('es-ES', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{event.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Acciones disponibles */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Acciones disponibles</h3>
                <div className="flex flex-wrap gap-3">
                  {selectedViolation.actions.map((action: any, idx: number) => (
                    <Button 
                      key={idx} 
                      variant={action.type === 'primary' ? 'default' : 
                              action.type === 'secondary' ? 'secondary' : 'outline'}
                      className={action.type === 'primary' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      {action.id === 'edit_product' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-edit mr-2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      ) : action.id === 'upload_document' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-upload mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                      ) : action.id === 'appeal' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-scale mr-2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
                      ) : action.id === 'remove_terms' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-eraser mr-2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                      ) : action.id === 'authenticity_proof' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-check-circle mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-check-circle mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                      )}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Footer con botones principales */}
              <div className="flex flex-wrap gap-3 justify-end border-t pt-4 mt-6">
                <Button variant="outline" onClick={() => setShowViolationModal(false)}>
                  Cerrar
                </Button>
                <Button 
                  className={`${
                    selectedViolation.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                    selectedViolation.severity === 'high' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Shield className="w-4 h-4 mr-2" /> 
                  Resolver este caso ahora
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default Reviews;
