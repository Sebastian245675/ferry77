
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  Clock, 
  Award, 
  Package, 
  Truck, 
  Users, 
  DollarSign, 
  Plus, 
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Search,
  Filter,
  Bell,
  Settings,
  Menu,
  X,
  Phone,
  Mail,
  Shield,
  ChevronRight,
  Heart,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const Demo = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState(3);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const demoUser = {
    name: 'María González',
    profession: 'Carpintera',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332-d2a-crop&w=100&h=100&fit=facearea',
    level: 'Gold',
    points: 3250,
    completedOrders: 28,
    totalSpent: 125000,
    savedAmount: 23000
  };

  const demoRequests = [
    {
      id: '1',
      title: 'Taladro profesional y accesorios',
      status: 'En proceso',
      quotes: 5,
      budget: 35000,
      urgency: 'Alta',
      createdAt: 'Hace 2 horas'
    },
    {
      id: '2', 
      title: 'Sierra circular y discos de corte',
      status: 'Cotizado',
      quotes: 8,
      budget: 28000,
      urgency: 'Media',
      createdAt: 'Hace 1 día'
    }
  ];

  const demoCompanies = [
    {
      id: '1',
      name: 'Ferretería Central Pro',
      rating: 4.9,
      reviews: 342,
      deliveryTime: '20-30 min',
      verified: true,
      specialties: ['Herramientas Profesionales', 'Construcción'],
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop'
    },
    {
      id: '2',
      name: 'ToolMaster Express',
      rating: 4.8,
      reviews: 198,
      deliveryTime: '15-25 min',
      verified: true,
      specialties: ['Herramientas Eléctricas', 'Urgentes'],
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop'
    }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Package },
    { id: 'requests', label: 'Mis Solicitudes', icon: MessageSquare },
    { id: 'companies', label: 'Empresas', icon: Users },
    { id: 'tracking', label: 'Rastreo', icon: Truck },
    { id: 'rewards', label: 'Recompensas', icon: Star },
    { id: 'profile', label: 'Mi Perfil', icon: Settings }
  ];

  const DemoNavbar = () => (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Ferry</span>
              <Badge variant="outline" className="text-xs">DEMO</Badge>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    currentView === item.id 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600" />
              {notifications > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{notifications}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <img 
                src={demoUser.avatar} 
                alt={demoUser.name}
                className="w-8 h-8 rounded-full"
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{demoUser.name}</p>
                <p className="text-xs text-gray-500">{demoUser.profession}</p>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/auth')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Iniciar Sesión
            </Button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="py-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === item.id 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">¡Bienvenida, {demoUser.name}! 👋</h1>
        <p className="opacity-90">Tienes 2 solicitudes activas y 5 cotizaciones nuevas</p>
        <div className="flex items-center space-x-4 mt-4">
          <Badge className="bg-white/20 text-white border-white/30">
            Nivel {demoUser.level}
          </Badge>
          <span className="text-sm opacity-90">{demoUser.points} puntos disponibles</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-gray-600">Solicitudes activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoUser.completedOrders}</p>
                <p className="text-xs text-gray-600">Pedidos completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demoUser.points}</p>
                <p className="text-xs text-gray-600">Puntos disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(demoUser.savedAmount / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-600">Dinero ahorrado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Mis Solicitudes Recientes</span>
                <Button variant="outline" size="sm">Ver todas</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{request.title}</h3>
                    <Badge variant={request.status === 'En proceso' ? 'default' : 'outline'}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{request.quotes}</span> cotizaciones
                    </div>
                    <div>
                      Presupuesto: <span className="font-medium">${request.budget.toLocaleString()}</span>
                    </div>
                    <div>
                      Urgencia: <span className="font-medium">{request.urgency}</span>
                    </div>
                    <div>{request.createdAt}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Empresas Recomendadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoCompanies.map((company) => (
                <div key={company.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={company.image} 
                      alt={company.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{company.name}</h3>
                        {company.verified && (
                          <Award className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          <span>{company.rating}</span>
                        </div>
                        <span>•</span>
                        <span>{company.reviews} reseñas</span>
                      </div>
                      <p className="text-xs text-gray-500">{company.deliveryTime}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const CompaniesView = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Proveedoras</h1>
          <p className="text-gray-600">Encuentra las mejores empresas para tus proyectos</p>
        </div>
        
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {demoCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <img 
                    src={company.image} 
                    alt={company.name}
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                  />
                  {company.verified && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                  
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700">{company.rating}</span>
                    <span className="text-sm text-gray-500">({company.reviews} reseñas)</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 mt-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Entrega en {company.deliveryTime}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {company.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <Button size="sm" className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contactar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            <img 
              src={demoUser.avatar} 
              alt={demoUser.name}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{demoUser.name}</h2>
              <p className="text-gray-600">{demoUser.profession} Profesional</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Star className="w-3 h-3 mr-1" />
                  Nivel {demoUser.level}
                </Badge>
                <span className="text-sm text-gray-600">{demoUser.points} puntos</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900">{demoUser.completedOrders}</h3>
            <p className="text-gray-600">Pedidos Completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900">${(demoUser.totalSpent / 1000).toFixed(0)}k</h3>
            <p className="text-gray-600">Total Gastado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900">${(demoUser.savedAmount / 1000).toFixed(0)}k</h3>
            <p className="text-gray-600">Dinero Ahorrado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'companies':
        return <CompaniesView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoNavbar />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderCurrentView()}
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={() => navigate('/auth')}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg px-6 py-3 rounded-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          Comenzar Gratis
        </Button>
      </div>
    </div>
  );
};

export default Demo;
