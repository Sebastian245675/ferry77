import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
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
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        // Login con Firebase
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        // Detecta el rol en Firestore
        const userRef = doc(db, "users", userCredential.user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().rol === "empresa") {
          window.location.href = '/company-panel';
        } else {
          window.location.href = '/profession-select';
        }
      } else {
        // Registro con Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (isCompany) {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            rol: "empresa",
            companyName: formData.companyName,
            nick: formData.nick,
            category: formData.category,
            description: formData.description,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
            createdAt: new Date()
          });
          window.location.href = '/company-panel';
        } else {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            rol: "usuario",
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
            createdAt: new Date()
          });
          window.location.href = '/profession-select';
        }
      }
    } catch (err: any) {
      setError(err.message);
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
            <div className="mb-4 flex justify-center space-x-2">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${!isCompany ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => setIsCompany(false)}
              >
                Soy usuario
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg font-semibold transition ${isCompany ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-blue-700"}`}
                onClick={() => setIsCompany(true)}
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
                      className="pl-10"
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
                      className="pl-10"
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
                      className="pl-10"
                      placeholder="Ciudad, Provincia"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
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
                    className="w-full border border-gray-300 rounded-lg p-3"
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
                    className="w-full border border-gray-300 rounded-lg p-3"
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
                    placeholder="Teléfono"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    type="text"
                    required
                    placeholder="Ubicación"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
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
                  className="pl-10"
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
                  className="pl-10 pr-10"
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

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
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
