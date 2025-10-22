import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  TrendingUp,
  Truck,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Tipos
interface PreRegForm {
  userType: 'cliente' | 'ferreteria';
  nombre: string;
  email: string;
  telefono: string;
  profesion: string;
  empresa: string;
  ciudad: string;
}

// Animaciones con tipado correcto
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeInOut" } }
};

const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeInOut" } }
};

const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeInOut" } }
};

const staggerChildren: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const Landing = () => {
  const navigate = useNavigate();
  const [heroRef, heroInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [benefitsRef, benefitsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [howItWorksRef, howItWorksInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [userTestimonialsRef, userTestimonialsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [testimonialsRef, testimonialsInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [ctaRef, ctaInView] = useInView({ triggerOnce: true, threshold: 0.1 });
  
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [preRegForm, setPreRegForm] = useState<PreRegForm>({
    userType: 'cliente',
    nombre: '',
    email: '',
    telefono: '',
    profesion: '',
    empresa: '',
    ciudad: ''
  });

  const benefits = [
    {
      icon: Zap,
      title: "Transporte Eficiente",
      description: "Conecta con una red de transportistas verificados para mover tus materiales sin demoras.",
    },
    {
      icon: Briefcase,
      title: "Ferreterías Asociadas",
      description: "Accede a un catálogo extendido de productos de las mejores ferreterías de tu zona.",
    },
    {
      icon: TrendingUp,
      title: "Optimiza tus Costos",
      description: "Compara cotizaciones en tiempo real y elige la opción más económica para tu negocio.",
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: "Describe tu Necesidad",
      description: "Publica una solicitud detallando los materiales o el transporte que necesitas.",
    },
    {
      step: 2,
      title: "Recibe Cotizaciones",
      description: "Proveedores y transportistas compiten para darte la mejor oferta.",
    },
    {
      step: 3,
      title: "Elige y Coordina",
      description: "Acepta la cotización que prefieras y gestiona la entrega directamente.",
    },
  ];

  const userTestimonials = [
    {
      quote: "Ferry77 ha transformado la forma en que gestionamos nuestros materiales. La eficiencia y el ahorro son increíbles.",
      name: "Ana García",
      title: "Jefa de Obra, Constructora ABC",
      avatar: "/avatars/avatar1.png",
      rating: 5,
    },
    {
      quote: "Encontrar transporte para entregas urgentes era un dolor de cabeza. Ahora, con Ferry77, lo resolvemos en minutos.",
      name: "Carlos Rodríguez",
      title: "Gerente de Logística, Ferretería El Martillo",
      avatar: "/avatars/avatar2.png",
      rating: 5,
    },
    {
      quote: "La variedad de proveedores y la competencia de precios nos ha permitido optimizar nuestro presupuesto como nunca antes.",
      name: "Luisa Fernanda",
      title: "Arquitecta Independiente",
      avatar: "/avatars/avatar3.png",
      rating: 5,
    },
  ];

  const testimonials = [
    {
      name: "Constructora Bolivar",
      logo: "/aliados/bolivar.png"
    },
    {
      name: "Homecenter",
      logo: "/aliados/homecenter.png"
    },
    {
      name: "Amarilo",
      logo: "/aliados/amarilo.png"
    },
    {
      name: "Easy",
      logo: "/aliados/easy.png"
    },
    {
      name: "Pintuco",
      logo: "/aliados/pintuco.png"
    }
  ];

  const handlePreRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica de envío del formulario
    console.log(preRegForm);
    alert('¡Gracias por tu interés! Nos pondremos en contacto contigo pronto.');
    setShowPreRegModal(false);
  };

  return (
    <div className="bg-background text-foreground font-sans">
      {/* Modern Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/ferrycirculo.png"
                alt="Ferry77 Logo"
                className="h-8 w-auto"
              />
              <span className="font-bold text-xl text-gray-800">Ferry77</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#benefits" className="text-gray-600 hover:text-primary transition-colors">Beneficios</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">Cómo Funciona</a>
              <a href="#user-testimonials" className="text-gray-600 hover:text-primary transition-colors">Testimonios</a>
              <a href="#testimonials" className="text-gray-600 hover:text-primary transition-colors">Aliados</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex text-gray-600 hover:text-primary"
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => setShowPreRegModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6"
              >
                Comenzar ahora
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with top padding to offset fixed header */}
      <main className="pt-16">
        {/* Hero Section */}
        <section id="hero" className="relative h-[70vh] min-h-[500px] flex items-center justify-center text-white overflow-hidden">
          {/* Background Image */}
          <img 
            src="/banner.png" 
            alt="Fondo de herramientas" 
            className="absolute top-0 left-0 w-full h-full object-cover z-0 blur-sm"
          />
          {/* Overlay */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-10"></div>
          
          {/* Content */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              ref={heroRef}
              initial="hidden"
              animate={heroInView ? "visible" : "hidden"}
              variants={staggerChildren}
            >
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight"
              >
                Conectamos <span className="text-primary">profesionales</span> con
                <br />
                <span className="text-primary">proveedores</span> en toda Colombia
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="mt-6 max-w-2xl mx-auto text-lg text-gray-200"
              >
                La plataforma definitiva para que constructores, carpinteros y electricistas encuentren materiales y transporte de forma rápida y económica.
              </motion.p>
              <motion.div
                variants={fadeInUp}
                className="mt-10 flex justify-center items-center gap-4"
              >
                <Button
                  size="lg"
                  onClick={() => setShowPreRegModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-6 text-base font-semibold shadow-lg"
                >
                  Comenzar ahora <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="rounded-full px-8 py-6 text-base font-semibold border-white text-white bg-transparent hover:bg-white hover:text-primary"
                >
                  Ver cómo funciona
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Benefits / Features Section */}
        <section id="benefits" className="py-24 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={benefitsRef}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Todo lo que necesitas, en un solo lugar</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Ferry77 centraliza tus operaciones para que ahorres tiempo y dinero.
              </p>
            </motion.div>
            <motion.div
              variants={staggerChildren}
              initial="hidden"
              animate={benefitsInView ? "visible" : "hidden"}
              className="mt-16 grid md:grid-cols-3 gap-8"
            >
              {benefits.map((benefit, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="bg-white rounded-2xl shadow-lg border-transparent hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 h-full">
                    <CardContent className="p-8">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                        <benefit.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={howItWorksRef}
              initial="hidden"
              animate={howItWorksInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Comienza en 3 simples pasos</h2>
              <p className="mt-4 text-lg text-gray-600">Nuestro proceso está diseñado para ser rápido y eficiente.</p>
            </motion.div>
            <div className="mt-16 relative">
              <div className="absolute left-1/2 top-10 h-full w-px bg-gray-200 hidden md:block" />
              {howItWorksSteps.map((step, index) => (
                <motion.div
                  key={index}
                  custom={index}
                  initial="hidden"
                  animate={howItWorksInView ? "visible" : "hidden"}
                  variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
                  className={`flex items-center w-full mb-8 md:mb-0 ${index % 2 === 0 ? 'md:justify-start' : 'md:justify-end'}`}
                >
                  <div className={`md:w-5/12 ${index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'}`}>
                    <Card className="bg-white rounded-2xl shadow-lg border-transparent p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold">
                          {step.step}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                          <p className="text-gray-600 mt-1">{step.description}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* User Testimonials Section */}
        <section id="user-testimonials" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={userTestimonialsRef}
              initial="hidden"
              animate={userTestimonialsInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Lo que dicen nuestros clientes</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Historias de éxito de profesionales que confían en Ferry77.
              </p>
            </motion.div>
            <motion.div
              variants={staggerChildren}
              initial="hidden"
              animate={userTestimonialsInView ? "visible" : "hidden"}
              className="mt-16 grid md:grid-cols-3 gap-8"
            >
              {userTestimonials.map((testimonial, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card className="bg-gray-50/50 rounded-2xl shadow-lg border-transparent h-full flex flex-col">
                    <CardContent className="p-8 flex-grow flex flex-col">
                      <div className="flex mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-gray-700 italic mb-6 flex-grow">"{testimonial.quote}"</p>
                      <div className="flex items-center">
                        <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full mr-4" />
                        <div>
                          <p className="font-semibold text-gray-900">{testimonial.name}</p>
                          <p className="text-sm text-gray-500">{testimonial.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={testimonialsRef}
              initial="hidden"
              animate={testimonialsInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Aliados que confían en nosotros</h2>
            </motion.div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
              {testimonials.map((partner) => (
                <div key={partner.name} className="flex justify-center">
                  <img src={partner.logo} alt={partner.name} className="h-20 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="cta" className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              ref={ctaRef}
              initial="hidden"
              animate={ctaInView ? "visible" : "hidden"}
              variants={fadeInUp}
              className="bg-primary rounded-2xl p-12 text-center shadow-2xl shadow-primary/20"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Conéctate con proveedores confiables hoy mismo.
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Únete a la red de profesionales que está transformando la industria.
              </p>
              <Button
                size="lg"
                onClick={() => setShowPreRegModal(true)}
                className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 py-6 text-base font-semibold"
              >
                Regístrate gratis
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/ferrycirculo.png" alt="Ferry77 Logo" className="h-8 w-auto bg-white rounded-full p-1" />
                <h3 className="ml-2 text-xl font-semibold text-white">Ferry77</h3>
              </div>
              <p className="text-gray-300">
                Plataforma profesional de transporte y materiales para la construcción.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Navegación</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#benefits" className="hover:text-white transition-colors">Beneficios</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Cómo Funciona</a></li>
                <li><a href="#user-testimonials" className="hover:text-white transition-colors">Testimonios</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Aliados</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Soporte</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidad</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Contacto</h4>
              <div className="space-y-2 text-gray-300">
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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-gray-900">Registro de Interés</h2>
                <button onClick={() => setShowPreRegModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar modal">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-2 text-gray-600">
                Sé el primero en saber cuándo lanzamos.
              </p>

              <form className="mt-8 space-y-6" onSubmit={handlePreRegSubmit}>
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
                <div>
                  <Button 
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 text-base font-semibold rounded-lg"
                  >
                    Completar Registro
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;