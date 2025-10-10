import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Truck, Clock, Shield, Star, Users, CheckCircle, Phone, Mail, MapPin, X, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import '../styles/landing-animations.css';

const Landing = () => {
  const navigate = useNavigate();
  // Enhanced state management for interactive phone mockup
  const [currentScreen, setCurrentScreen] = useState(0);
  const [backendConnected, setBackendConnected] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Pre-registration modal state
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [preRegForm, setPreRegForm] = useState({
    userType: 'cliente',
    nombre: '',
    email: '',
    telefono: '',
    profesion: '',
    empresa: '',
    ciudad: ''
  });

  // Backend connectivity and data loading
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:8090/api/mock/health');
        if (response.ok) {
          setBackendConnected(true);
          await loadQuotesFromBackend();
        }
      } catch (error) {
        console.log('Backend not available, using demo data');
        setBackendConnected(false);
        loadDemoQuotes();
      }
    };

    const loadQuotesFromBackend = async () => {
      try {
        setIsLoadingQuotes(true);
        const response = await fetch('http://localhost:8090/api/mock/quotes?category=general&limit=5');
        if (response.ok) {
          const data = await response.json();
          setQuotes(data);
        } else {
          throw new Error('Backend request failed');
        }
      } catch (error) {
        console.log('Failed to load from backend, using demo data');
        loadDemoQuotes();
      } finally {
        setIsLoadingQuotes(false);
      }
    };

    const loadDemoQuotes = () => {
      setIsLoadingQuotes(true);
      // Simulate loading delay
      setTimeout(() => {
        setQuotes([
          {
            id: 1,
            company: "TransExpress",
            price: 25000,
            formattedPrice: "$25.000",
            estimatedTime: "2 horas",
            rating: 4.8,
            vehicleType: "Camión"
          },
          {
            id: 2,
            company: "RápidoCargo",
            price: 22000,
            formattedPrice: "$22.000",
            estimatedTime: "3 horas",
            rating: 4.9,
            vehicleType: "Furgoneta"
          },
          {
            id: 3,
            company: "MegaTransporte",
            price: 28000,
            formattedPrice: "$28.000",
            estimatedTime: "1.5 horas",
            rating: 4.7,
            vehicleType: "Camión Grande"
          }
        ]);
        setIsLoadingQuotes(false);
      }, 1000);
    };

    checkBackendConnection();
  }, []);

  // Animated typing effect for search text - simplified version
  useEffect(() => {
    const searchTexts = [
      "¿Qué necesitas enviar?",
      "Mudanzas y transporte",
      "Envío de documentos",
      "Transporte empresarial"
    ];
    
    let currentIndex = 0;
    
    const rotateText = () => {
      setSearchText(searchTexts[currentIndex]);
      currentIndex = (currentIndex + 1) % searchTexts.length;
    };
    
    // Change text every 3 seconds
    const timer = setInterval(rotateText, 3000);
    rotateText(); // Set initial text
    
    return () => clearInterval(timer);
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:8090/api/v1/mock/health');
      if (response.ok) {
        setBackendConnected(true);
        console.log('✅ Backend connected successfully!');
      }
    } catch (error) {
      console.log('⚠️ Backend not available, using static data');
      setBackendConnected(false);
    }
  };

  // Load real quotes from backend
  const loadQuotes = async (searchTerm = 'muebles') => {
    if (!backendConnected) {
      setQuotes(getStaticQuotes());
      return;
    }
    
    setIsLoadingQuotes(true);
    try {
      const response = await fetch(`http://localhost:8090/api/v1/mock/quotes?searchTerm=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setQuotes(data);
    } catch (error) {
      console.error('Error loading quotes:', error);
      setQuotes(getStaticQuotes());
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  // Fallback static data
  const getStaticQuotes = () => {
    return [
      { 
        id: 1,
        company: "TransExpress", 
        price: 25000, 
        formattedPrice: "$25.000",
        estimatedTime: "2 horas",
        rating: 4.8,
        vehicleType: "Camión"
      },
      { 
        id: 2,
        company: "RápidoCargo", 
        price: 22000, 
        formattedPrice: "$22.000",
        estimatedTime: "3 horas",
        rating: 4.9,
        vehicleType: "Furgón"
      },
      { 
        id: 3,
        company: "MegaTransporte", 
        price: 28000, 
        formattedPrice: "$28.000",
        estimatedTime: "1.5 horas",
        rating: 4.7,
        vehicleType: "Camioneta"
      }
    ];
  };

  // Simulate screen changes and load data
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreen((prev) => {
        const nextScreen = (prev + 1) % 3;
        if (nextScreen === 1) {
          // Load quotes when switching to quotes screen
          loadQuotes(searchText || 'muebles');
        }
        return nextScreen;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [searchText, backendConnected]);

  // Simulate typing animation
  useEffect(() => {
    if (currentScreen === 0) {
      setIsTyping(true);
      const typingText = "Muebles para mudanza";
      let currentText = "";
      let charIndex = 0;

      const typeInterval = setInterval(() => {
        if (charIndex < typingText.length) {
          currentText += typingText[charIndex];
          setSearchText(currentText);
          charIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
          // Load quotes after typing is complete
          loadQuotes(currentText);
        }
      }, 100);

      return () => clearInterval(typeInterval);
    } else {
      setIsTyping(false);
    }
  }, [currentScreen, backendConnected]);

  const features = [
    {
      icon: Package,
      title: "Envía Cualquier Cosa",
      description: "Desde documentos hasta muebles, conectamos con transportistas especializados",
      color: "bg-blue-500"
    },
    {
      icon: Clock,
      title: "Rápido y Confiable",
      description: "Cotizaciones en minutos, entregas puntuales garantizadas",
      color: "bg-green-500"
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Todos nuestros transportistas están verificados y asegurados",
      color: "bg-purple-500"
    },
    {
      icon: Star,
      title: "Mejor Precio",
      description: "Compara múltiples cotizaciones y elige la que mejor se adapte",
      color: "bg-yellow-500"
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Emprendedora",
      comment: "Ferry77 me ayudó a enviar mis productos por todo el país de manera súper fácil",
      rating: 5
    },
    {
      name: "Carlos Ruiz",
      role: "Arquitecto",
      comment: "Necesitaba transportar materiales urgentes y encontré el transportista perfecto",
      rating: 5
    },
    {
      name: "Ana López",
      role: "Diseñadora",
      comment: "La plataforma es muy intuitiva y los precios son excelentes",
      rating: 5
    }
  ];

  // Handle pre-registration form submission
  const handlePreRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8090/api/preregistro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preRegForm), // preRegForm es el estado con los datos del formulario
      });
      
      if (response.ok) {
        setShowPreRegModal(false);
        alert('✅ ¡Registro enviado exitosamente! Te contactaremos pronto.');
      } else {
        // Lee el mensaje de error del backend
        const errorData = await response.json();
        let errorMessage = '';
        
        // Si es un array de errores (validaciones automáticas de campos)
        if (Array.isArray(errorData)) {
          const errorMessages = errorData.map(error => {
            // Extrae el mensaje específico de validación
            const message = error.defaultMessage || error.message;
            const field = error.field;
            
            // Personaliza mensajes según el campo
            if (field === 'telefono') {
              return `📱 Teléfono: ${message}`;
            } else if (field === 'nombre') {
              return `👤 Nombre: ${message}`;
            } else if (field === 'email') {
              return `📧 Email: ${message}`;
            } else if (field === 'userType') {
              return `🏷️ Tipo de usuario: ${message}`;
            } else {
              return `⚠️ ${field}: ${message}`;
            }
          });
          errorMessage = errorMessages.join('\n');
        } else if (typeof errorData === 'string') {
          // Si es un string (validación personalizada como nombre completo)
          if (errorData.includes('nombre completo')) {
            errorMessage = '👤 Nombre completo: Debe incluir al menos dos nombres y dos apellidos\n(Ejemplo: Juan Carlos Pérez García)';
          } else {
            errorMessage = errorData;
          }
        } else {
          errorMessage = '⚠️ Por favor revisa los siguientes datos:\n• Teléfono debe tener 10 dígitos\n• Nombre completo (2 nombres y 2 apellidos)\n• Email válido\n• Todos los campos son obligatorios';
        }
        
        alert('❌ No se pudo completar el registro:\n\n' + errorMessage + '\n\n💡 Por favor corrige los datos y vuelve a intentar.');
      }
    } catch (err) {
      alert('🔌 Error de conexión con el servidor. Verifica tu conexión a internet e intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="/WhatsApp Image 2025-09-16 at 10.15.23 AM.jpeg" 
                alt="Ferry77 Logo" 
                className="h-12 w-auto"
              />
            </div>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="hidden sm:inline-flex border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Registrarse
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 bg-white">
        <div className="absolute inset-0 opacity-5">
          <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <pattern id="hero-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <g fill="#1f2937" fillOpacity="1">
                  <rect x="0" y="0" width="1" height="1"/>
                  <rect x="30" y="30" width="1" height="1"/>
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern)" />
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 leading-tight mb-8">
                Conectamos profesionales
                <span className="block text-blue-600"> con proveedores</span>
              </h1>
              <p className="mt-8 text-xl sm:text-2xl text-gray-600 leading-relaxed max-w-4xl">
                Plataforma profesional de transporte empresarial que conecta oficios especializados 
                con ferreterías y proveedores de materiales de construcción en Colombia.
              </p>
              
              <div className="mt-12 flex justify-center">
                <Button 
                  size="lg"
                  onClick={() => setShowPreRegModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg font-medium rounded-lg shadow-lg transition-colors duration-200"
                >
                  Registro de Interés
                </Button>
              </div>
            </div>

            <div className="mt-12 lg:mt-0">
              <div className="relative">
                {/* Professional phone mockup */}
                <div className="relative mx-auto w-80 h-[640px] cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                     onClick={() => setCurrentScreen((prev) => (prev + 1) % 3)}>
                  {/* Phone body with professional styling */}
                  <div className="relative bg-gray-800 rounded-[2.8rem] p-2 shadow-xl">
                    
                    {/* Screen */}
                    <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden relative">
                      {/* Camera punch hole */}
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-black rounded-full z-10 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      
                      {/* Status bar */}
                      <div className="absolute top-2 left-4 right-4 flex justify-between items-center text-black text-xs z-10">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">9:41</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-2 border border-black rounded-sm">
                            <div className="w-3 h-1 bg-green-500 rounded-sm"></div>
                          </div>
                          <span className="text-xs">{backendConnected ? 'API' : 'Demo'}</span>
                        </div>
                      </div>
                      
                      {/* Screen content based on currentScreen */}
                      <div className="transition-opacity duration-300 mt-8" key={currentScreen}>
                        {currentScreen === 0 && (
                          <>
                            {/* Screen 1: Search & Categories */}
                            <div className="bg-blue-600 h-24 flex items-center justify-center">
                              <div className="flex items-center">
                                <Truck className="w-6 h-6 text-white mr-2" />
                                <h3 className="text-white font-semibold text-lg">Ferry77</h3>
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-6">
                              {/* Clean search bar */}
                              <div className="relative">
                                <div className="h-12 bg-gray-50 rounded-xl border border-gray-200 flex items-center px-4 shadow-sm">
                                  <Package className="w-5 h-5 text-gray-500 mr-3" />
                                  <span className="text-gray-700 text-sm">
                                    {searchText || "¿Qué necesitas enviar?"}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Service categories */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="h-20 bg-blue-50 rounded-xl flex flex-col items-center justify-center border border-blue-100 shadow-sm">
                                  <Truck className="w-6 h-6 text-blue-600 mb-2" />
                                  <span className="text-sm text-blue-700 font-medium">Transporte</span>
                                </div>
                                
                                <div className="h-20 bg-green-50 rounded-xl flex flex-col items-center justify-center border border-green-100 shadow-sm">
                                  <Package className="w-6 h-6 text-green-600 mb-2" />
                                  <span className="text-sm text-green-700 font-medium">Envío</span>
                                </div>
                              </div>

                              {/* Categories list */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-800">Servicios disponibles:</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {['Mudanzas', 'Documentos', 'Muebles', 'Electrodomésticos'].map((category, idx) => (
                                    <div key={idx} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg border shadow-sm text-center">
                                      {category}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Additional info */}
                              <div className="text-center pt-4">
                                <p className="text-xs text-gray-500">
                                  Encuentra el mejor precio para tu envío
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        {currentScreen === 1 && (
                          <>
                            {/* Screen 2: Quotes Results */}
                            <div className="bg-green-600 h-24 flex items-center justify-center">
                              <div className="flex items-center">
                                <CheckCircle className="w-6 h-6 text-white mr-2" />
                                <h3 className="text-white font-semibold text-lg">Cotizaciones</h3>
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                              <div className="text-center mb-4">
                                <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                                  {isLoadingQuotes ? 'Cargando cotizaciones...' : `${quotes.length} cotizaciones encontradas`}
                                </span>
                              </div>

                              {/* Loading state */}
                              {isLoadingQuotes && (
                                <div className="flex justify-center py-6">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                                </div>
                              )}

                              {/* Quote cards */}
                              <div className="space-y-3">
                                {quotes.slice(0, 3).map((quote, index) => (
                                  <div 
                                    key={quote.id || index} 
                                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-md"
                                  >
                                    <div className="flex justify-between items-center mb-3">
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mr-3 shadow-sm">
                                          <Truck className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-800">{quote.company}</div>
                                          <div className="flex items-center mt-1">
                                            <Star className="w-3 h-3 text-amber-500 fill-current" />
                                            <span className="text-xs text-gray-600 ml-1">{quote.rating?.toFixed(1) || '4.8'}</span>
                                            {backendConnected && (
                                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                API
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-green-600">
                                          {quote.formattedPrice || `$${quote.price?.toLocaleString()}`}
                                        </div>
                                        <div className="text-xs text-gray-500">{quote.estimatedTime}</div>
                                      </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-600 rounded-full" style={{width: '100%'}}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {currentScreen === 2 && (
                          <>
                            {/* Screen 3: Tracking */}
                            <div className="bg-indigo-600 h-24 flex items-center justify-center">
                              <div className="flex items-center">
                                <Clock className="w-6 h-6 text-white mr-2" />
                                <h3 className="text-white font-semibold text-lg">Seguimiento</h3>
                              </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                              <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                  <Truck className="w-7 h-7 text-indigo-600" />
                                </div>
                                <h4 className="font-semibold text-gray-800 text-lg">En Camino</h4>
                                <p className="text-sm text-gray-600">Llegada estimada: 45 minutos</p>
                                {backendConnected && (
                                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                    Tiempo real
                                  </span>
                                )}
                              </div>

                              {/* Progress timeline */}
                              <div className="space-y-4">
                                {[
                                  { status: 'completed', title: 'Solicitud creada', time: '10:30 AM', color: 'text-green-600' },
                                  { status: 'completed', title: 'Transportista asignado', time: '10:45 AM', color: 'text-green-600' },
                                  { status: 'active', title: 'En camino al destino', time: '11:20 AM', color: 'text-indigo-600' },
                                  { status: 'pending', title: 'Entregado', time: 'Pendiente', color: 'text-gray-400' }
                                ].map((step, index) => (
                                  <div key={index} className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full ${
                                      step.status === 'completed' ? 'bg-green-500' : 
                                      step.status === 'active' ? 'bg-indigo-500' : 'bg-gray-300'
                                    } shadow-sm`}></div>
                                    <div className="flex-1">
                                      <div className={`text-sm font-medium ${step.color}`}>{step.title}</div>
                                      <div className="text-xs text-gray-500">{step.time}</div>
                                    </div>
                                    {step.status === 'completed' && (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Current location */}
                              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-800">Ubicación actual</div>
                                    <div className="text-xs text-gray-600">Av. Caracas #45-67</div>
                                  </div>
                                  <div className="w-8 h-8 bg-indigo-600 rounded-xl shadow-sm"></div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Xiaomi Note 11 Pro physical buttons */}
                    <div className="absolute right-1 top-28 w-1 h-16 bg-gray-700 rounded-l"></div>
                    <div className="absolute right-1 top-48 w-1 h-10 bg-gray-700 rounded-l"></div>
                    <div className="absolute right-1 top-62 w-1 h-10 bg-gray-700 rounded-l"></div>
                    
                    {/* Volume buttons (left side) */}
                    <div className="absolute left-1 top-32 w-1 h-8 bg-gray-700 rounded-r"></div>
                    <div className="absolute left-1 top-44 w-1 h-8 bg-gray-700 rounded-r"></div>
                    
                    {/* Speaker grilles */}
                    <div className="absolute bottom-4 left-8 right-8 flex justify-center">
                      <div className="flex space-x-1">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="w-1 h-1 bg-gray-600 rounded-full"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Screen indicators */}
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {[0, 1, 2].map((screen) => (
                      <div
                        key={screen}
                        className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${
                          currentScreen === screen 
                            ? 'bg-blue-600 w-4' 
                            : 'bg-gray-400 hover:bg-blue-300'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentScreen(screen);
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Secondary phone showing different screen */}
                <div className="absolute -right-20 top-20 w-48 h-80 transform rotate-12 hover:rotate-6 transition-transform duration-300 opacity-60 hover:opacity-80">
                  <div className="bg-gray-800 rounded-2xl p-1.5 shadow-xl">
                    <div className="w-full h-full bg-white rounded-xl overflow-hidden">
                      <div className="bg-blue-600 h-12 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white mr-1" />
                        <span className="text-white text-xs font-medium">Transportistas</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg" style={{animationDelay: `${i * 0.3}s`}}>
                            <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                              <div className="h-1.5 bg-gray-100 rounded w-2/3"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
              ¿Por qué elegir Ferry77?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Plataforma profesional que ofrece soluciones integrales de transporte 
              para empresas y profesionales del sector construcción.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${feature.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
              Cómo funciona
            </h2>
            <p className="text-lg text-gray-600">
              Proceso simple y eficiente en solo 3 pasos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Describe tu envío</h3>
              <p className="text-gray-600">
                Proporciona los detalles de tu solicitud de transporte
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Recibe cotizaciones</h3>
              <p className="text-gray-600">
                Compara ofertas de transportistas verificados
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-semibold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirma y monitorea</h3>
              <p className="text-gray-600">
                Selecciona la mejor opción y sigue tu envío
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
              Lo que dicen nuestros usuarios
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-4">
            ¿Listo para comenzar?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Regístrese para recibir información sobre el lanzamiento de nuestra plataforma
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Crear Cuenta
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
              onClick={() => navigate('/auth')}
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <h3 className="ml-2 text-xl font-semibold text-white">Ferry77</h3>
              </div>
              <p className="text-gray-300">
                Plataforma profesional de transporte empresarial en Colombia.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Servicios</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Transporte Empresarial</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Logística Especializada</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Gestión de Flotas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Consultoría</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Soporte</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contacto</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Contacto</h4>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-center hover:text-white transition-colors">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>+57 300 123 4567</span>
                </div>
                <div className="flex items-center hover:text-white transition-colors">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>contacto@ferry77.co</span>
                </div>
                <div className="flex items-center hover:text-white transition-colors">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Bogotá, Colombia</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">&copy; 2025 Ferry77. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Pre-Registration Modal */}
      {showPreRegModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-blue-600 px-8 py-6 text-white relative">
              <button 
                onClick={() => setShowPreRegModal(false)}
                className="absolute top-4 right-4 text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center space-x-4">
                <img 
                  src="/WhatsApp Image 2025-09-16 at 10.15.23 AM.jpeg" 
                  alt="Ferry77 Logo" 
                  className="h-12 w-auto"
                />
                <div>
                  <h2 className="text-2xl font-semibold">Registro de Interés</h2>
                  <p className="text-blue-100">
                    Complete el formulario para recibir información sobre el lanzamiento
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="grid lg:grid-cols-5 gap-0">
              {/* Left Side - User Type Selection */}
              <div className="lg:col-span-2 bg-gray-50 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Tipo de Usuario
                </h3>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setPreRegForm({...preRegForm, userType: 'cliente'})}
                    className={`w-full p-6 rounded-lg border-2 transition-all duration-200 text-left shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                      preRegForm.userType === 'cliente' 
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100' 
                        : 'border-gray-300 hover:border-gray-400 bg-gradient-to-br from-white to-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                        preRegForm.userType === 'cliente' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <User className="w-6 h-6 text-white drop-shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">Cliente</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Profesionales y oficios que necesitan materiales, herramientas y suministros para sus trabajos
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPreRegForm({...preRegForm, userType: 'ferreteria'})}
                    className={`w-full p-6 rounded-lg border-2 transition-all duration-200 text-left shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                      preRegForm.userType === 'ferreteria' 
                        ? 'border-orange-600 bg-gradient-to-br from-orange-50 to-yellow-100' 
                        : 'border-gray-300 hover:border-gray-400 bg-gradient-to-br from-white to-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                        preRegForm.userType === 'ferreteria' ? 'bg-gradient-to-br from-orange-500 to-yellow-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <Building className="w-6 h-6 text-white drop-shadow-sm" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">Ferretería/Proveedor</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Ferreterías, distribuidores y proveedores de materiales de construcción y herramientas
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-8 p-4 bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-200 rounded-lg shadow-md">
                  <h4 className="font-semibold text-yellow-800 mb-2">Beneficio de Pre-registro</h4>
                  <p className="text-sm text-yellow-700">
                    Los usuarios registrados tendrán acceso prioritario y tarifas preferenciales 
                    durante el primer mes de operación.
                  </p>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="lg:col-span-3 p-8 bg-gradient-to-br from-white via-gray-50 to-white">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-6 drop-shadow-sm">
                  Información Personal
                </h3>

                <form className="space-y-6" onSubmit={handlePreRegSubmit}>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={preRegForm.nombre}
                        onChange={(e) => setPreRegForm({...preRegForm, nombre: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                        placeholder="Ingrese su nombre completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        required
                        value={preRegForm.telefono}
                        onChange={(e) => setPreRegForm({...preRegForm, telefono: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={preRegForm.email}
                      onChange={(e) => setPreRegForm({...preRegForm, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                        Profesión/Oficio *
                      </label>
                      <select
                        required
                        value={preRegForm.profesion}
                        onChange={(e) => setPreRegForm({...preRegForm, profesion: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                      >
                        <option value="">Seleccione su oficio</option>
                        {preRegForm.userType === 'cliente' ? (
                          <>
                            <option value="Carpintero">Carpintero</option>
                            <option value="Electricista">Electricista</option>
                            <option value="Constructor">Constructor</option>
                            <option value="Plomero">Plomero</option>
                            <option value="Pintor">Pintor</option>
                            <option value="Albañil">Albañil</option>
                            <option value="Cerrajero">Cerrajero</option>
                            <option value="Soldador">Soldador</option>
                            <option value="Técnico HVAC">Técnico HVAC (Aire/Calefacción)</option>
                            <option value="Instalador de Pisos">Instalador de Pisos</option>
                            <option value="Técnico en Drywall">Técnico en Drywall</option>
                            <option value="Jardinero">Jardinero/Paisajista</option>
                            <option value="Reparador de Electrodomésticos">Reparador de Electrodomésticos</option>
                            <option value="Contratista General">Contratista General</option>
                            <option value="Otro Oficio">Otro Oficio</option>
                          </>
                        ) : (
                          <>
                            <option value="Propietario Ferretería">Propietario de Ferretería</option>
                            <option value="Gerente Ferretería">Gerente de Ferretería</option>
                            <option value="Distribuidor Materiales">Distribuidor de Materiales</option>
                            <option value="Proveedor Construcción">Proveedor de Construcción</option>
                            <option value="Comerciante Herramientas">Comerciante de Herramientas</option>
                            <option value="Almacén Construcción">Almacén de Construcción</option>
                            <option value="Depósito Materiales">Depósito de Materiales</option>
                            <option value="Otro Comercio">Otro Comercio Relacionado</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                        Ciudad *
                      </label>
                      <select
                        required
                        value={preRegForm.ciudad}
                        onChange={(e) => setPreRegForm({...preRegForm, ciudad: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                      >
                        <option value="">Seleccione su ciudad</option>
                        <option value="Bogotá D.C.">Bogotá D.C.</option>
                        <option value="Medellín">Medellín</option>
                        <option value="Cali">Cali</option>
                        <option value="Barranquilla">Barranquilla</option>
                        <option value="Cartagena">Cartagena</option>
                        <option value="Cúcuta">Cúcuta</option>
                        <option value="Bucaramanga">Bucaramanga</option>
                        <option value="Pereira">Pereira</option>
                        <option value="Santa Marta">Santa Marta</option>
                        <option value="Ibagué">Ibagué</option>
                        <option value="Manizales">Manizales</option>
                        <option value="Villavicencio">Villavicencio</option>
                        <option value="Pasto">Pasto</option>
                        <option value="Montería">Montería</option>
                        <option value="Valledupar">Valledupar</option>
                        <option value="Neiva">Neiva</option>
                        <option value="Armenia">Armenia</option>
                        <option value="Popayán">Popayán</option>
                        <option value="Sincelejo">Sincelejo</option>
                        <option value="Tunja">Tunja</option>
                        <option value="Florencia">Florencia</option>
                        <option value="Riohacha">Riohacha</option>
                        <option value="Yopal">Yopal</option>
                        <option value="Quibdó">Quibdó</option>
                        <option value="Mocoa">Mocoa</option>
                        <option value="Otra">Otra ciudad</option>
                      </select>
                    </div>
                  </div>

                  {preRegForm.userType === 'ferreteria' && (
                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent mb-2">
                        Nombre de la Empresa *
                      </label>
                      <input
                        type="text"
                        required={preRegForm.userType === 'ferreteria'}
                        value={preRegForm.empresa}
                        onChange={(e) => setPreRegForm({...preRegForm, empresa: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gradient-to-r from-white to-gray-50 shadow-sm"
                        placeholder="Nombre de su empresa o ferretería"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200">
                    <Button 
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white py-3 text-lg font-semibold rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Completar Registro de Interés
                    </Button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    Al completar este formulario, acepta ser contactado por Ferry77 para 
                    informarle sobre el lanzamiento de la plataforma. Sus datos serán 
                    tratados conforme a nuestra política de privacidad.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;