import React from "react";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertCircle, 
  AlertOctagon,
  AlertTriangle, 
  Calendar, 
  CheckCircle,
  CheckCheck,
  CircleCheck,
  Clock, 
  Clock4, 
  DollarSign,
  Edit,
  Eye, 
  ExternalLink,
  File,
  Filter,
  FilterX,
  HelpCircle, 
  MessageSquare, 
  Minus,
  Package,
  Printer,
  Save, 
  Scissors,
  Search,
  Shield,
  Star,
  ThumbsDown, 
  ThumbsUp,
  Truck,
  Upload,
  User,
  X,
  Zap
} from "lucide-react";
import DashboardLayout from "@/components/barraempresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import custom animations
import "./reviews-animations.css";

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
  requestDetails?: any;
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
        // Aquí iría el código para obtener los datos
        // Por brevedad, lo he omitido en esta versión de arreglo
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setReviews([]);
        setFilteredReviews([]);
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
    
    // Filtrado por término de búsqueda, sentimiento, y pestaña activa
    // (código omitido por brevedad)
    
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
        <div className="rounded-xl p-5 sm:p-8 text-white bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 shadow-xl relative overflow-hidden">
          {/* Header content (omitido por brevedad) */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Tarjetas de estadísticas (omitidas por brevedad) */}
        </div>
        
        {/* Tabs & Filters */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Contenido de pestañas (omitido por brevedad) */}
        </Tabs>
        
        {/* Reviews Content */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              {/* Spinner de carga */}
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card className="shadow-md">
              {/* Mensaje de no hay reseñas */}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredReviews.map((review, index) => (
                <Card 
                  key={review.id} 
                  className={`shadow-md hover:shadow-lg transition-all border-l-4 cursor-pointer group ${
                    review.sentiment === 'positive' ? 'border-l-green-500' : 
                    review.sentiment === 'negative' ? 'border-l-red-500' : 
                    'border-l-blue-500'
                  } hover:scale-[1.01] hover:border-l-[6px] fade-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => handleOpenReviewDetails(review)}
                >
                  {/* Contenido de la tarjeta (omitido por brevedad) */}
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Modal detalle de revisión */}
        {selectedReview && (
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Contenido del modal de detalles (omitido por brevedad) */}
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Modal de detalles de violación */}
      {selectedViolation && (
        <Dialog open={showViolationModal} onOpenChange={setShowViolationModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 rounded-xl">
            {/* Encabezado con información de severidad */}
            <div className={`px-6 py-4 border-b ${
              selectedViolation.severity === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-800 text-white' :
              selectedViolation.severity === 'high' ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-orange-700 text-white' :
              'bg-gradient-to-r from-yellow-500 to-amber-500 border-amber-600 text-white'
            } rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedViolation.severity === 'critical' ? 'bg-red-700' :
                    selectedViolation.severity === 'high' ? 'bg-orange-700' : 
                    'bg-amber-600'
                  }`}>
                    {selectedViolation.severity === 'critical' ? (
                      <AlertOctagon className="w-6 h-6" />
                    ) : selectedViolation.severity === 'high' ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-xl">Reporte de Violación</h2>
                      <Badge className={`${
                        selectedViolation.severity === 'critical' ? 'bg-red-800' :
                        selectedViolation.severity === 'high' ? 'bg-orange-800' :
                        'bg-amber-700'
                      } text-white px-2`}>
                        {selectedViolation.severity === 'critical' ? 'CRÍTICO' :
                         selectedViolation.severity === 'high' ? 'ALTO' : 'MEDIO'}
                      </Badge>
                      <Badge className="bg-white/20 text-white">Caso #{selectedViolation.caseId}</Badge>
                    </div>
                    <p className="text-sm opacity-90 mt-0.5">
                      Fecha de reporte: {new Date(selectedViolation.reportDate).toLocaleDateString()} • 
                      Fecha límite: {new Date(selectedViolation.deadlineDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <Badge className={`text-white ${
                    selectedViolation.status === 'pending_review' ? 'bg-blue-600' : 
                    selectedViolation.status === 'under_investigation' ? 'bg-purple-600' :
                    selectedViolation.status === 'awaiting_action' ? 'bg-amber-600' :
                    'bg-red-700'
                  } px-2 py-1`}>
                    {selectedViolation.status === 'pending_review' ? 'Pendiente de revisión' : 
                     selectedViolation.status === 'under_investigation' ? 'En investigación' :
                     selectedViolation.status === 'awaiting_action' ? 'Esperando acción' :
                     'Escalado'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Contenido del caso */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contenido principal del modal (omitido por brevedad) */}
              </div>
            </div>
            
            {/* Pie del modal con botones */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between rounded-b-xl">
              <Button variant="outline" className="border-gray-300 text-gray-700" onClick={() => setShowViolationModal(false)}>
                Cerrar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="border-blue-300 text-blue-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir reporte
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar cambios
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
