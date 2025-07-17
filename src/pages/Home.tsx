
import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Users, Truck, Star, Shield, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Ferry</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/demo">
                <Button variant="outline" className="hidden sm:flex">
                  <Play className="w-4 h-4 mr-2" />
                  Ver Demo
                </Button>
              </Link>
              <Link to="/auth">
                <Button>
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
              La plataforma que conecta
              <span className="text-blue-600"> profesionales</span> con
              <span className="text-purple-600"> proveedores</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Solicita herramientas y materiales, recibe cotizaciones en tiempo real y elige la mejor opción. Todo en una sola app.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/demo">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4">
                  <Play className="w-5 h-5 mr-2" />
                  Probar Demo Gratis
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4">
                  Comenzar Ahora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir Ferry?
            </h2>
            <p className="text-xl text-gray-600">
              Simplificamos el proceso de compra para profesionales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Solicitudes Inteligentes</h3>
                <p className="text-gray-600">
                  Crea solicitudes detalladas y recibe cotizaciones personalizadas de múltiples proveedores
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Red de Proveedores</h3>
                <p className="text-gray-600">
                  Accede a una amplia red de proveedores verificados y confiables en tu zona
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Truck className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Entrega Rápida</h3>
                <p className="text-gray-600">
                  Recibe tus herramientas y materiales en tiempo record con seguimiento en tiempo real
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Sistema de Puntos</h3>
                <p className="text-gray-600">
                  Gana puntos con cada compra y canjéalos por descuentos y beneficios exclusivos
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Compra Segura</h3>
                <p className="text-gray-600">
                  Todas las transacciones están protegidas con tecnología de punta y garantía de devolución
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Calidad Garantizada</h3>
                <p className="text-gray-600">
                  Solo trabajamos con proveedores certificados que ofrecen productos de alta calidad
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-6">
            ¿Listo para optimizar tus compras profesionales?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a miles de profesionales que ya confían en Ferry
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-4">
                <Play className="w-5 h-5 mr-2" />
                Ver Demo Interactivo
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" className="bg-blue-800 hover:bg-blue-900 text-lg px-8 py-4">
                Registrarse Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Ferry</span>
              </div>
              <p className="text-gray-400">
                Conectando profesionales con los mejores proveedores del mercado.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
                <li><a href="#" className="hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-white">Precios</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
                <li><a href="#" className="hover:text-white">Ayuda</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Términos</a></li>
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Ferry. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
