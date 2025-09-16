import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';

import { ADMIN_EMAIL } from "@/pages/admin/config/adminConfig";


const Auth = () => {
  const navigate = useNavigate();
  
  // Lista de ciudades principales de Colombia
  const ciudadesColombia = [
    'Bogotá D.C.',
    'Medellín',
    'Cali',
    'Barranquilla',
    'Cartagena',
    'Cúcuta',
    'Bucaramanga',
    'Pereira',
    'Santa Marta',
    'Ibagué',
    'Manizales',
    'Villavicencio',
    'Pasto',
    'Montería',
    'Valledupar',
    'Neiva',
    'Armenia',
    'Popayán',
    'Sincelejo',
    'Tunja',
    'Florencia',
    'Riohacha',
    'Yopal',
    'Quibdó',
    'Mocoa'
  ];
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
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
    description: ''
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

    // Verificar si es administrador
    if (user.email === ADMIN_EMAIL) {
      window.location.href = "/admin";
      return;
    }

    // Verificar si el usuario ya existe en el backend
    try {
      const response = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
      
      if (response.ok) {
        // Usuario existe, obtener sus datos
        const userData = await response.json();
        
        // Redirigir según el tipo de usuario
        if (userData.userType === 'empresa') {
          window.location.href = "/backoffice";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        // Usuario no existe, crearlo en el backend
        const newUserData = {
          firebaseUid: user.uid,
          nombreCompleto: user.displayName || "Usuario de Google",
          email: user.email,
          telefono: user.phoneNumber || "",
          ciudad: "",
          userType: 'cliente'
        };

        await fetch('http://localhost:8090/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUserData)
        });

        window.location.href = "/dashboard";
      }
    } catch (backendError) {
      console.error('Error conectando con backend:', backendError);
      // Si hay error con el backend, redirigir como usuario normal
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
        
        // Detectar tipo de usuario desde el backend
        try {
          const response = await fetch(`http://localhost:8090/api/usuarios/firebase/${userCredential.user.uid}`);
          
          if (response.ok) {
            const userData = await response.json();
            
            if (userData.userType === 'empresa') {
              window.location.href = '/backoffice';
            } else {
              window.location.href = '/dashboard';
            }
          } else {
            // Si no existe en backend, redirigir como usuario normal
            window.location.href = '/dashboard';
          }
        } catch (backendError) {
          console.error('Error consultando backend:', backendError);
          // En caso de error, redirigir como usuario normal
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
        } else {
          if (!formData.name || !formData.phone || !formData.location) {
            setError('Por favor completa todos los campos de usuario.');
            return;
          }
        }
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('userId', userCredential.user.uid);

        // Guardar datos según tipo de cuenta
        if (isCompany) {
          // Empresa - solo guardar en backend MySQL
          try {
            await fetch('http://localhost:8090/api/usuarios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firebaseUid: userCredential.user.uid,
                nombreCompleto: formData.companyName,
                email: formData.email,
                telefono: formData.phone,
                ciudad: formData.location,
                userType: 'empresa',
                companyName: formData.companyName,
                nick: formData.nick,
                category: formData.category,
                description: formData.description
              })
            });
            window.location.href = '/backoffice';
          } catch (backendError) {
            console.error('Error guardando en backend:', backendError);
            setError('Error al guardar los datos. Inténtalo de nuevo.');
            return;
          }
        } else {
          // Usuario normal - solo guardar en backend MySQL
          try {
            await fetch('http://localhost:8090/api/usuarios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firebaseUid: userCredential.user.uid,
                nombreCompleto: formData.name,
                email: formData.email,
                telefono: formData.phone,
                ciudad: formData.location,
                userType: 'cliente'
              })
            });
            window.location.href = '/dashboard';
          } catch (backendError) {
            console.error('Error guardando en backend:', backendError);
            setError('Error al guardar los datos. Inténtalo de nuevo.');
            return;
          }
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
                className={`px-4 py-2 rounded-lg font-semibold transition ${!isCompany ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => {
                  setIsCompany(false);
                }}
              >
                Soy usuario
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${isCompany ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => {
                  setIsCompany(true);
                }}
              >
                Soy empresa
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registro usuario */}
            {!isLogin && !isCompany && (
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
                <select
                  id="location"
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="">Selecciona tu ciudad</option>
                  {ciudadesColombia.map((ciudad) => (
                    <option key={ciudad} value={ciudad}>
                      {ciudad}
                    </option>
                  ))}
                </select>
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
                <select
                  id="location"
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  <option value="">Selecciona tu ciudad</option>
                  {ciudadesColombia.map((ciudad) => (
                    <option key={ciudad} value={ciudad}>
                      {ciudad}
                    </option>
                  ))}
                </select>
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
