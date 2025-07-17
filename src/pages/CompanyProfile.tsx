import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Star, 
  Shield, 
  Truck, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Heart, 
  Share2, 
  MessageSquare, 
  Package, 
  Award, 
  Users, 
  CheckCircle,
  ArrowLeft,
  Send,
  ChevronRight,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Calendar,
  TrendingUp,
  Camera,
  FileText,
  Globe,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  inStock: boolean;
  discount?: number;
  rating: number;
  reviewCount: number;
  specifications: string[];
}

interface Review {
  id: string;
  user: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  images?: string[];
  verified: boolean;
  response?: {
    text: string;
    date: string;
  };
}

interface CompanyData {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  location: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  verified: boolean;
  safetyScore: number;
  totalOrders: number;
  yearsActive: number;
  responseTime: string;
  certifications: string[];
  products: Product[];
  reviews: Review[];
  socialProof: {
    monthlyOrders: number;
    repeatCustomers: number;
    averageRating: number;
    onTimeDelivery: number;
  };
  workingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  policies: {
    returns: string;
    warranty: string;
    delivery: string;
  };
  gallery: string[];
  team: {
    name: string;
    role: string;
    avatar: string;
  }[];
}

const CompanyProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(location.search);
  const companyId = searchParams.get('id') || id;

  // Cargar los datos de la empresa desde Firestore
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setError('ID de empresa no encontrado');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const companyRef = doc(db, "users", companyId);
        const companySnap = await getDoc(companyRef);
        
        if (companySnap.exists()) {
          const data = companySnap.data();
          
          // Generar rating y reseñas aleatorios si no existen
          const rating = data.rating || (Math.random() * 2 + 3).toFixed(1);
          const reviewCount = data.reviewCount || Math.floor(Math.random() * 200);
          
          // Crear los datos de la empresa basado en los datos de Firestore
          const companyData: CompanyData = {
            id: companyId,
            name: data.companyName || data.nick || 'Empresa Sin Nombre',
            logo: data.logo || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=150&h=150&fit=crop',
            coverImage: data.coverImage || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=300&fit=crop',
            rating: parseFloat(rating),
            reviewCount: reviewCount,
            deliveryTime: '20-35 min',
            deliveryFee: 0,
            location: data.location || 'Argentina',
            phone: data.phone || '+54 11 4567-8900',
            email: data.email || '',
            website: data.website || '',
            description: data.description || 'Sin descripción disponible',
            verified: data.verified || false,
            safetyScore: Math.floor(Math.random() * 30) + 70, // 70-100%
            totalOrders: Math.floor(Math.random() * 2000) + 500,
            yearsActive: Math.floor(Math.random() * 20) + 1,
            responseTime: data.responseTime || '30 min promedio',
            certifications: data.certifications || ['Certificado de calidad'],
            socialProof: {
              monthlyOrders: Math.floor(Math.random() * 400) + 100,
              repeatCustomers: Math.floor(Math.random() * 30) + 70,
              averageRating: parseFloat(rating),
              onTimeDelivery: Math.floor(Math.random() * 10) + 90
            },
            workingHours: {
              monday: '8:00 - 19:00',
              tuesday: '8:00 - 19:00',
              wednesday: '8:00 - 19:00',
              thursday: '8:00 - 19:00',
              friday: '8:00 - 19:00',
              saturday: '9:00 - 17:00',
              sunday: 'Cerrado'
            },
            products: [],
            reviews: [],
            policies: {
              returns: 'Aceptamos devoluciones hasta 30 días después de la compra con el empaque original.',
              warranty: 'Todos nuestros productos cuentan con garantía del fabricante.',
              delivery: 'Envío gratuito en pedidos superiores a $10000.'
            },
            gallery: [],
            team: []
          };
          
          setCompany(companyData);
        } else {
          setError('No se encontró la información de esta empresa');
        }
      } catch (err) {
        console.error("Error al cargar los datos de la empresa:", err);
        setError('Error al cargar los datos de la empresa. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyData();
  }, [companyId]);
  
  // Si aún no hay datos o está cargando, mostrar un estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="ml-3 text-gray-600">Cargando información de la empresa...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }
  
  // Si hay un error, mostrarlo
  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la información de la empresa'}</p>
          <Button 
            onClick={() => navigate('/companies')}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Volver a empresas
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }
  
  const categories = ['all', 'Herramientas Eléctricas', 'Herramientas Manuales', 'Seguridad Industrial'];
  
  const filteredProducts = selectedCategory === 'all' 
    ? company.products 
    : company.products.filter(product => product.category === selectedCategory);

  const displayedReviews = showAllReviews ? company.reviews : company.reviews.slice(0, 3);

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Eliminado de favoritos" : "Agregado a favoritos",
      description: `${company.name} ${isFavorite ? 'eliminado de' : 'agregado a'} tu lista de favoritos`,
    });
  };

  const contactCompany = () => {
    toast({
      title: "Contactando empresa",
      description: "Abriendo chat con la empresa",
    });
  };

  const shareCompany = () => {
    toast({
      title: "Enlace copiado",
      description: "El enlace de la empresa ha sido copiado al portapapeles",
    });
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado a la empresa",
      });
      setNewMessage('');
    }
  };

  const markHelpful = (reviewId: string) => {
    toast({
      title: "Gracias por tu feedback",
      description: "Tu voto ha sido registrado",
    });
  };

  const addToCart = (product: Product) => {
    toast({
      title: "Producto agregado",
      description: `${product.name} agregado al carrito`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        {/* Header con imagen de portada */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
          <img 
            src={company.coverImage} 
            alt={company.name}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          <div className="absolute top-4 left-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-end space-x-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl p-2 shadow-lg">
                <img 
                  src={company.logo} 
                  alt={company.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="flex-1 text-white">
                <div className="flex items-center space-x-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold">{company.name}</h1>
                  {company.verified && (
                    <Badge className="bg-green-500 text-white border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm opacity-90">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-medium">{company.rating}</span>
                    <span>({company.reviewCount} reseñas)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{company.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck className="w-4 h-4" />
                    <span>{company.deliveryFee === 0 ? 'Envío gratis' : `$${company.deliveryFee}`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Botones de acción */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Button onClick={contactCompany} className="flex-1 md:flex-none">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contactar Ahora
              </Button>
              <Button variant="outline" onClick={() => window.open(`tel:${company.phone}`)}>
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={toggleFavorite}
                className={isFavorite ? 'text-red-600 border-red-600' : ''}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="outline" onClick={shareCompany}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Información de confianza y estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="text-center">
              <CardContent className="p-4">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">{company.safetyScore}%</div>
                <div className="text-xs text-gray-600">Puntuación de Seguridad</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">{company.socialProof.monthlyOrders}</div>
                <div className="text-xs text-gray-600">Pedidos este mes</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-purple-600">{company.socialProof.repeatCustomers}%</div>
                <div className="text-xs text-gray-600">Clientes que regresan</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-yellow-600">{company.yearsActive}</div>
                <div className="text-xs text-gray-600">Años de experiencia</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de contenido */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="reviews">Reseñas</TabsTrigger>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="gallery">Galería</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2 overflow-x-auto">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap"
                    >
                      {category === 'all' ? 'Todos' : category}
                    </Button>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  {filteredProducts.length} productos
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="relative mb-3">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        {product.discount && (
                          <Badge className="absolute top-2 right-2 bg-red-500">
                            -{product.discount}%
                          </Badge>
                        )}
                        {!product.inStock && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <Badge variant="secondary">Agotado</Badge>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{product.category}</p>
                      
                      <div className="flex items-center space-x-1 mb-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-sm text-gray-500">({product.reviewCount})</span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-lg font-bold">${product.price.toLocaleString()}</span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-500 line-through ml-2">
                              ${product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <Badge variant={product.inStock ? "default" : "secondary"}>
                          {product.inStock ? 'Disponible' : 'Agotado'}
                        </Badge>
                      </div>

                      <ul className="text-xs text-gray-600 mb-3">
                        {product.specifications.slice(0, 2).map((spec, index) => (
                          <li key={index}>• {spec}</li>
                        ))}
                      </ul>
                      
                      <Button 
                        className="w-full" 
                        disabled={!product.inStock}
                        onClick={() => addToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {product.inStock ? 'Agregar al Carrito' : 'No Disponible'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="md:col-span-1">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">{company.rating}</div>
                    <div className="flex justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(company.rating) 
                              ? 'text-yellow-400 fill-current' 
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{company.reviewCount} reseñas</p>
                  </CardContent>
                </Card>

                <div className="md:col-span-3">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Distribución de calificaciones</h3>
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const percentage = Math.random() * 100; // Simulado
                        return (
                          <div key={stars} className="flex items-center space-x-3 mb-2">
                            <span className="text-sm w-8">{stars}★</span>
                            <Progress value={percentage} className="flex-1" />
                            <span className="text-sm text-gray-600 w-12">{Math.round(percentage)}%</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                {displayedReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <img 
                          src={review.avatar} 
                          alt={review.user}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{review.user}</span>
                              {review.verified && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verificado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mb-3">{review.comment}</p>
                          
                          {review.images && (
                            <div className="flex space-x-2 mb-3">
                              {review.images.map((image, index) => (
                                <img 
                                  key={index}
                                  src={image} 
                                  alt="Review"
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{review.date}</span>
                              <button 
                                onClick={() => markHelpful(review.id)}
                                className="flex items-center space-x-1 hover:text-blue-600"
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span>Útil ({review.helpful})</span>
                              </button>
                            </div>
                          </div>

                          {review.response && (
                            <div className="mt-4 ml-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline">Respuesta de la empresa</Badge>
                                <span className="text-xs text-gray-500">{review.response.date}</span>
                              </div>
                              <p className="text-sm text-gray-700">{review.response.text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {!showAllReviews && company.reviews.length > 3 && (
                  <div className="text-center">
                    <Button variant="outline" onClick={() => setShowAllReviews(true)}>
                      Ver todas las reseñas ({company.reviews.length - 3} más)
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre la empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{company.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Horarios de atención</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(company.workingHours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize">{day}</span>
                            <span className={hours === 'Cerrado' ? 'text-red-600' : 'text-gray-700'}>
                              {hours}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Certificaciones</h4>
                      <div className="flex flex-wrap gap-2">
                        {company.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Award className="w-3 h-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Políticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Package className="w-4 h-4 mr-2 text-blue-600" />
                      Política de Devoluciones
                    </h4>
                    <p className="text-sm text-gray-600">{company.policies.returns}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-green-600" />
                      Garantía
                    </h4>
                    <p className="text-sm text-gray-600">{company.policies.warranty}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Truck className="w-4 h-4 mr-2 text-purple-600" />
                      Política de Entrega
                    </h4>
                    <p className="text-sm text-gray-600">{company.policies.delivery}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nuestro Equipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.team.map((member, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="font-medium">{member.name}</h4>
                          <p className="text-sm text-gray-600">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Galería de la empresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {company.gallery.map((image, index) => (
                      <div key={index} className="relative group cursor-pointer">
                        <img 
                          src={image} 
                          alt={`Galería ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Dirección</p>
                        <p className="text-sm text-gray-600">{company.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Teléfono</p>
                        <p className="text-sm text-gray-600">{company.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-gray-600">{company.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Sitio web</p>
                        <p className="text-sm text-gray-600">{company.website}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Tiempo de respuesta</p>
                        <p className="text-sm text-gray-600">{company.responseTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Mensaje</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Tu mensaje</label>
                      <textarea 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe tu consulta aquí..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={4}
                      />
                    </div>
                    
                    <Button 
                      onClick={sendMessage} 
                      className="w-full"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensaje
                    </Button>

                    <div className="text-center text-sm text-gray-500">
                      <p>Tiempo de respuesta promedio: {company.responseTime}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default CompanyProfile;
