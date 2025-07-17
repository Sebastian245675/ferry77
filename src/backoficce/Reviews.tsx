import React from "react";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, User, Calendar, Package, Search, Filter } from "lucide-react";
import DashboardLayout from "@/components/barraempresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Review {
  id: string;
  requestId: string;
  userId: string;
  comment: string;
  createdAt: string;
  requestTitle?: string;
  userAvatar?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    averageRating: 0
  });

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
  
  useEffect(() => {
    const fetchReviewsWithRequestDetails = async () => {
      setIsLoading(true);
      try {
        // 1. Obtener todos los comentarios
        const commentsQuery = query(collection(db, "comments"));
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
            comment: data.comment || "",
            createdAt: data.createdAt || new Date().toISOString(),
          };
        });

        // 3. Crear un conjunto de IDs de solicitud únicas
        const requestIds = [...new Set(reviewsData.map((review) => review.requestId))];

        // 4. Obtener detalles de las solicitudes
        const requestDetailsMap: { [key: string]: { title: string } } = {};

        for (const requestId of requestIds) {
          if (!requestId) continue;

          try {
            const requestDoc = await getDocs(
              query(collection(db, "solicitud"), where("__name__", "==", requestId))
            );

            if (!requestDoc.empty) {
              requestDetailsMap[requestId] = {
                title: requestDoc.docs[0].data().title || "Solicitud sin título",
              };
            }
          } catch (e) {
            console.error(`Error al obtener detalles de solicitud ${requestId}:`, e);
          }
        }

        // 5. Combinar los datos de comentarios con los detalles de solicitud y analizar sentimiento
        const enrichedReviews = reviewsData.map((review) => {
          // Generar avatar basado en userId
          const userInitial = review.userId?.charAt(0)?.toUpperCase() || 'U';
          const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500'];
          const colorIndex = review.userId ? review.userId.charCodeAt(0) % avatarColors.length : 0;
          
          // Analizar sentimiento
          const sentiment = analyzeSentiment(review.comment);
          
          return {
            ...review,
            requestTitle: requestDetailsMap[review.requestId]?.title || "Solicitud desconocida",
            userAvatar: avatarColors[colorIndex],
            sentiment
          };
        });

        // Calcular estadísticas
        const positive = enrichedReviews.filter(r => r.sentiment === 'positive').length;
        const negative = enrichedReviews.filter(r => r.sentiment === 'negative').length;
        const neutral = enrichedReviews.filter(r => r.sentiment === 'neutral').length;
        const total = enrichedReviews.length;
        
        // Calcular calificación promedio (5 estrellas para positivo, 3 para neutral, 1 para negativo)
        const totalScore = (positive * 5) + (neutral * 3) + (negative * 1);
        const averageRating = total > 0 ? parseFloat((totalScore / total).toFixed(1)) : 0;
        
        setStats({
          total,
          positive,
          neutral,
          negative,
          averageRating
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
        review => review.comment.toLowerCase().includes(lowerSearchTerm) || 
                 review.requestTitle?.toLowerCase().includes(lowerSearchTerm) ||
                 review.userId.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Filtrar por sentimiento
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(review => review.sentiment === sentimentFilter);
    }
    
    // Ordenar por fecha más reciente
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredReviews(filtered);
  }, [reviews, searchTerm, sentimentFilter]);

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
  
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="rounded-xl p-6 text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Reseñas y Comentarios</h1>
              <p className="text-blue-100">
                Gestiona y analiza todos los comentarios de tus clientes
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
              <div className="text-center">
                <p className="text-sm text-blue-100">Calificación</p>
                <p className="text-3xl font-bold">{stats.averageRating}</p>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-5 h-5 ${i < Math.round(stats.averageRating) ? 'text-yellow-300 fill-yellow-300' : 'text-white/30'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comentarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Positivos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.positive}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Neutrales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.neutral}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comentarios Negativos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.negative}</p>
                </div>
                <div className="p-3 rounded-full bg-red-100">
                  <Star className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar en comentarios..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
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
                }}>
                  <Filter className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
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
                  {searchTerm || sentimentFilter !== 'all' 
                    ? 'Intenta ajustar los filtros para ver más resultados'
                    : 'Aún no tienes comentarios de clientes'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredReviews.map((review) => (
                <Card key={review.id} className={`shadow-md hover:shadow-lg transition-all border-l-4 ${
                  review.sentiment === 'positive' ? 'border-l-green-500' : 
                  review.sentiment === 'negative' ? 'border-l-red-500' : 
                  'border-l-blue-500'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                        <Avatar className={`h-10 w-10 ${review.userAvatar}`}>
                          <AvatarFallback className="text-white">{review.userId.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.userId}</p>
                          {renderStars(review.sentiment)}
                        </div>
                      </div>
                      {renderSentimentBadge(review.sentiment)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-gray-800 italic">"{review.comment}"</p>
                      
                      <div className="bg-gray-50 p-3 rounded-lg flex flex-col space-y-1">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium">Producto: </span>
                          <span className="text-sm ml-1 text-blue-600">{review.requestTitle}</span>
                        </div>
                        
                        <div className="flex items-center">
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
                      
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-3 h-3 mr-2" />
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
      </div>
    </DashboardLayout>
  );
};

export default Reviews;
