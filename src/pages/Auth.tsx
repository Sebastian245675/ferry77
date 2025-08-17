import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';

import UbicacionButton from '@/components/BotonUbicacion';
import { ADMIN_EMAIL } from "@/pages/admin/config/adminConfig";
import { verify } from 'crypto';
import { s } from 'node_modules/framer-motion/dist/types.d-Bq-Qm38R';


const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [isDeliveryDriver, setIsDeliveryDriver] = useState(false);
  const [showSoon, setShowSoon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: '',
    companyName: '',
    nick: '',
    category: '',
    description: '',
    vehicleType: '',
    licenseNumber: '',
    availability: '',
    experience: ''
  });

   

  // Mostrar mensaje temporal para Facebook login
  function handleSocialClick() {
    setShowSoon(true);
    setTimeout(() => setShowSoon(false), 2000);
  }
  
  // Función para manejar el inicio de sesión con Google
  const handleGoogleSignIn = async () => {
  try {
    setError(null);
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Guardar el estado de autenticación
    localStorage.setItem("userAuthenticated", "true");
    localStorage.setItem("userId", user.uid);

    // 🔹 Verificar si es administrador
    if (user.email === ADMIN_EMAIL) {
      window.location.href = "/admin";
      return; // Evitar que siga evaluando más abajo
    }

    // Verificar si el usuario ya existe en Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      // El usuario ya existe, verificar si es empresa o repartidor
      const userData = userDoc.data();
      const isEmpresa =
        userData.type === "company" ||
        userData.tipo === "empresa" ||
        !!userData.companyName ||
        !!userData.nick;

      const isRepartidor =
        userData.type === "deliveryDriver" ||
        userData.rol === "repartidor";

      if (isEmpresa) {
        window.location.href = "/backoffice";
      } else if (isRepartidor) {
        window.location.href = "/delivery-dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      // Nuevo usuario, crear documento en Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        type: "user",
        rol: "usuario",
        name: user.displayName || "Usuario de Google",
        phone: user.phoneNumber || "",
        location: "",
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
      });

      window.location.href = "/dashboard";
    }
  } catch (err: any) {
    console.error("Error en login con Google:", err);
    setError(err.message);
    setIsLoading(false);
  }
};
  
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      // Log para depuración en móviles
      console.log('isLogin:', isLogin, 'isCompany:', isCompany, 'formData:', formData);
      if (isLogin) {
        // Login con Firebase
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('userId', userCredential.user.uid);
        // Detectar si es empresa
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const isEmpresa =
          userData.type === 'company' ||
          userData.tipo === 'empresa' ||
          !!userData.companyName ||
          !!userData.nick;
        
        const isRepartidor = 
          userData.type === 'deliveryDriver' ||
          userData.rol === 'repartidor';
          
        if (isEmpresa) {
          window.location.href = '/backoffice';
        } else if (isRepartidor) {
          window.location.href = '/delivery-dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        // Registro con Firebase
        // Validación estricta según el tipo de registro
        if (isCompany) {
          if (!formData.companyName || !formData.nick || !formData.category || !formData.description || !formData.phone || !formData.location) {
            setError('Por favor completa todos los campos de empresa.');
            return;
          }
        } else if (isDeliveryDriver) {
          if (!formData.name || !formData.phone || !formData.location || !formData.vehicleType || !formData.licenseNumber || !formData.availability || !formData.experience) {
            setError('Por favor completa todos los campos de repartidor.');
            return;
          }
        } else {
          if (!formData.name || !formData.phone || !formData.location) {
            setError('Por favor completa todos los campos de usuario.');
            return;
          }
        }
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('userId', userCredential.user.uid);

        // Guardar datos en Firestore según tipo de cuenta
        if (isCompany) {
          // Empresa
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: formData.email,
            type: 'company',
            rol: 'empresa',
            status: 'pendiente', // Por defecto, las empresas requieren aprobación
            banned: false,
            companyName: formData.companyName,
            nick: formData.nick,
            category: formData.category,
            description: formData.description,
            phone: formData.phone,
            location: formData.location,
            createdAt: new Date().toISOString()
          });
          window.location.href = '/backoffice';
        } else if (isDeliveryDriver) {
          // Repartidor
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: formData.email,
            type: 'deliveryDriver',
            rol: 'repartidor',
            banned: false,
            name: formData.name,
            phone: formData.phone,
            location: formData.location,
            vehicleType: formData.vehicleType,
            licenseNumber: formData.licenseNumber,
            availability: formData.availability,
            experience: formData.experience,
            createdAt: new Date().toISOString(),
            status: 'pendiente', // Por defecto, los repartidores requieren aprobación
            activeDeliveries: 0,
            totalDeliveries: 0,
            rating: 0
          });
          window.location.href = '/delivery-dashboard';
        } else {
          // Usuario normal
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: formData.email,
            type: 'user',
            rol: 'usuario',
            banned: false,
            status: 'pendiente', // Por defecto, los usuarios requieren aprobación
            name: formData.name,
            phone: formData.phone,
            location: formData.location,
            createdAt: new Date().toISOString()
          });
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError(err.message);
      // Log de error para depuración móvil
      console.error('Error en registro/login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ferry</h1>
          <p className="text-gray-600">Plataforma de Herramientas Profesionales</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? 'Ingresa a tu cuenta para comenzar' 
                : 'Únete a Ferry y encuentra las mejores herramientas'}
            </p>
          </div>

          {/* Botones para elegir tipo de registro */}
          {!isLogin && (
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${!isCompany && !isDeliveryDriver ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => {
                  setIsCompany(false);
                  setIsDeliveryDriver(false);
                }}
              >
                Soy usuario
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${isCompany ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => {
                  setIsCompany(true);
                  setIsDeliveryDriver(false);
                }}
              >
                Soy empresa
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${isDeliveryDriver ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => {
                  setIsDeliveryDriver(true);
                  setIsCompany(false);
                }}
              >
                Soy repartidor
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registro usuario */}
            {!isLogin && !isCompany && !isDeliveryDriver && (
              <>
                <div>
                  <Label htmlFor="name">Nombre Completo</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="name"
                      type="text"
                      required
                      className="pl-10 text-gray-900"
                      placeholder="Tu nombre completo"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="phone"
                      type="tel"
                      required
                      className="pl-10 text-gray-900"
                      placeholder="+54 11 1234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                <Label htmlFor="location">Ubicación</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="location"
                    type="text"
                    required
                    className="text-gray-900 flex-1"
                    placeholder="Ubicación"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                  <UbicacionButton
                    onDireccionObtenida={(direccion) =>
                      setFormData({ ...formData, location: direccion })
                    }
                  />
                </div>
                </div>
              </>
            )}
            
            {/* Registro repartidor */}
            {!isLogin && isDeliveryDriver && (
              <>
                <div>
                  <Label htmlFor="name">Nombre Completo</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="name"
                      type="text"
                      required
                      className="pl-10 text-gray-900"
                      placeholder="Tu nombre completo"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="phone"
                      type="tel"
                      required
                      className="pl-10 text-gray-900"
                      placeholder="+54 11 1234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="location"
                      type="text"
                      required
                      className="pl-10 text-gray-900"
                      placeholder="Ciudad, Provincia"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="vehicleType">Tipo de Vehículo</Label>
                  <select
                    id="vehicleType"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                  >
                    <option value="">Selecciona un tipo de vehículo</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Automóvil">Automóvil</option>
                    <option value="Bicicleta">Bicicleta</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Furgón">Furgón</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="licenseNumber">Número de Licencia</Label>
                  <Input
                    id="licenseNumber"
                    type="text"
                    required
                    className="text-gray-900"
                    placeholder="Número de licencia de conducir"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Disponibilidad</Label>
                  <select
                    id="availability"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.availability}
                    onChange={(e) => setFormData({...formData, availability: e.target.value})}
                  >
                    <option value="">Selecciona tu disponibilidad</option>
                    <option value="Tiempo completo">Tiempo completo</option>
                    <option value="Medio tiempo">Medio tiempo</option>
                    <option value="Fines de semana">Fines de semana</option>
                    <option value="Horario flexible">Horario flexible</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="experience">Experiencia como Repartidor</Label>
                  <textarea
                    id="experience"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="Describe tu experiencia previa como repartidor (si tienes)"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Registro empresa */}
            {!isLogin && isCompany && (
              <>
                <div>
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input
                    id="companyName"
                    type="text"
                    required
                    className="text-gray-900"
                    placeholder="Nombre de la empresa"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="nick">Nick</Label>
                  <Input
                    id="nick"
                    type="text"
                    required
                    className="text-gray-900"
                    placeholder="Nick"
                    value={formData.nick}
                    onChange={(e) => setFormData({...formData, nick: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <select
                    id="category"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Selecciona una categoría</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Carpintería">Carpintería</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Pintura">Pintura</option>
                    <option value="Remodelación">Remodelación</option>
                    <option value="Materiales">Materiales</option>
                    <option value="Servicios generales">Servicios generales</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">¿A qué se dedica la empresa?</Label>
                  <textarea
                    id="description"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                    placeholder="Descripción"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="text"
                    required
                    className="text-gray-900"
                    placeholder="Teléfono"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                <Label htmlFor="location">Ubicación</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="location"
                    type="text"
                    required
                    className="text-gray-900 flex-1"
                    placeholder="Ubicación"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                  <UbicacionButton
                    onDireccionObtenida={(direccion) =>
                      setFormData({ ...formData, location: direccion })
                    }
                  />
                </div>
              </div>

              </>
            )}

            {/* Email y contraseña */}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  required
                  className="pl-10 text-gray-900"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="pl-10 pr-10 text-gray-900"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </div>
              ) : (
                isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
              )}
            </Button>
            {/* Social login icons debajo del botón principal */}
            <div className="flex flex-col items-center mt-6 mb-2">
              <div className="flex gap-8 justify-center">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-12 h-12 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow transition-all text-2xl"
                  aria-label="Google login"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <FaGoogle style={{ color: '#4285F4' }} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSocialClick}
                  className="w-12 h-12 rounded-full bg-[#1877f3] hover:bg-[#145db2] flex items-center justify-center shadow transition-all text-2xl"
                  aria-label="Facebook login"
                >
                  <FaFacebookF className="text-white" />
                </button>
              </div>
              {showSoon && (
                <div className="text-center text-sm text-orange-600 font-semibold mt-3 animate-pulse">
                  Facebook aún no disponible, muy pronto
                </div>
              )}
            </div>
            {error && <div className="text-red-500 text-center">{error}</div>}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-blue-600 hover:text-blue-700 font-semibold"
              >
                {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </div>
        </div>

        {/* Botón para Formulario Supremo */}
        <div className="mt-8 text-center">
          <Link to="/formulario-supremo">
            <button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg text-lg transition-all"
            >
              Ir al Formulario Supremo
            </button>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-white">
            <div className="bg-white/20 rounded-lg p-3 mb-2 backdrop-blur-sm">
              <span className="text-2xl">🔧</span>
            </div>
            <p className="text-sm">Herramientas Profesionales</p>
          </div>
          <div className="text-white">
            <div className="bg-white/20 rounded-lg p-3 mb-2 backdrop-blur-sm">
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-sm">Mejores Precios</p>
          </div>
          <div className="text-white">
            <div className="bg-white/20 rounded-lg p-3 mb-2 backdrop-blur-sm">
              <span className="text-2xl">🚚</span>
            </div>
            <p className="text-sm">Entrega Rápida</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
