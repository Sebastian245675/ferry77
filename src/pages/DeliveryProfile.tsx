import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, MapPin, TrendingUp, Award, Clock, Settings, Camera, Save, AlertTriangle } from 'lucide-react';
import BottomNavigationDelivery from '@/components/BottomNavigationDelivery';

const DeliveryProfile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    vehicleType: '',
    licenseNumber: '',
    availability: '',
    experience: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Obtener datos del usuario
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserData(userData);
            
            // Verificar si es un repartidor
            if (userData.rol !== 'repartidor' && userData.type !== 'deliveryDriver') {
              console.log('No es un repartidor, redirigiendo...');
              navigate('/');
              return;
            }
            
            // Establecer datos del formulario
            setFormData({
              name: userData.name || '',
              phone: userData.phone || '',
              location: userData.location || '',
              vehicleType: userData.vehicleType || '',
              licenseNumber: userData.licenseNumber || '',
              availability: userData.availability || '',
              experience: userData.experience || ''
            });
          } else {
            console.log('No se encontraron datos de usuario');
            navigate('/');
          }
        } catch (error) {
          console.error('Error al cargar datos:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        navigate('/auth');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    setError(null);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber,
        availability: formData.availability,
        experience: formData.experience,
        updatedAt: new Date().toISOString()
      });
      
      setUserData(prev => ({
        ...prev,
        ...formData
      }));
      
      setSuccessMessage('Perfil actualizado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      setError(error.message || 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-blue-100">Gestiona tu información de repartidor</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6">
        {/* Tarjeta de Perfil */}
        <Card className="p-5 mb-6 shadow-lg border-0">
          <div className="flex flex-col sm:flex-row items-center">
            <div className="relative mb-4 sm:mb-0 sm:mr-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                {userData?.photoURL ? (
                  <img 
                    src={userData.photoURL} 
                    alt="Foto de perfil" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={40} />
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full">
                  <Camera size={16} />
                </button>
              )}
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold">{userData?.name}</h2>
              <p className="text-gray-600">Repartidor</p>
              
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {userData?.vehicleType && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                    {userData.vehicleType}
                  </span>
                )}
                
                {userData?.availability && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                    {userData.availability}
                  </span>
                )}
                
                {userData?.status === 'pendiente' ? (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                    <AlertTriangle size={12} className="mr-1" />
                    Verificación pendiente
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                    Verificado
                  </span>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="mt-4 sm:mt-0"
              >
                <Settings size={16} className="mr-2" />
                Editar Perfil
              </Button>
            )}
          </div>
        </Card>

        {/* Sección de Edición de Perfil */}
        {isEditing ? (
          <Card className="p-5 mb-6 shadow-md border-0">
            <h3 className="text-lg font-bold mb-4">Editar Información</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="vehicleType">Tipo de Vehículo</Label>
                <select
                  id="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 mt-1"
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
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="availability">Disponibilidad</Label>
                <select
                  id="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 mt-1"
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
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2 mt-1 min-h-[100px]"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg">
                  {successMessage}
                </div>
              )}
              
              <div className="flex space-x-3 pt-2">
                <Button 
                  type="button"
                  variant="outline"
                  className="w-1/2"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                
                <Button 
                  type="submit"
                  className="w-1/2 bg-blue-600 hover:bg-blue-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <>
            {/* Información de Contacto */}
            <Card className="p-5 mb-6 shadow-md border-0">
              <h3 className="text-lg font-bold mb-4">Información de Contacto</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <Phone size={20} className="text-blue-600 mr-3 mt-1" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-gray-600">{userData?.phone || 'No disponible'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin size={20} className="text-blue-600 mr-3 mt-1" />
                  <div>
                    <p className="font-medium">Ubicación</p>
                    <p className="text-gray-600">{userData?.location || 'No disponible'}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock size={20} className="text-blue-600 mr-3 mt-1" />
                  <div>
                    <p className="font-medium">Disponibilidad</p>
                    <p className="text-gray-600">{userData?.availability || 'No disponible'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Estadísticas */}
            <Card className="p-5 mb-6 shadow-md border-0">
              <h3 className="text-lg font-bold mb-4">Mis Estadísticas</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Award size={20} className="text-blue-600 mr-2" />
                    <p className="font-medium">Calificación</p>
                  </div>
                  <p className="text-2xl font-bold flex items-center">
                    {userData?.rating?.toFixed(1) || '0.0'}
                    <span className="text-yellow-500 ml-1">★</span>
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <TrendingUp size={20} className="text-green-600 mr-2" />
                    <p className="font-medium">Entregas Totales</p>
                  </div>
                  <p className="text-2xl font-bold">{userData?.totalDeliveries || 0}</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Clock size={20} className="text-yellow-600 mr-2" />
                    <p className="font-medium">Entregas Activas</p>
                  </div>
                  <p className="text-2xl font-bold">{userData?.activeDeliveries || 0}</p>
                </div>
              </div>
            </Card>
            
            {/* Experiencia */}
            <Card className="p-5 mb-6 shadow-md border-0">
              <h3 className="text-lg font-bold mb-4">Mi Experiencia</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{userData?.experience || 'Sin información de experiencia'}</p>
            </Card>
          </>
        )}
      </div>
      
      <BottomNavigationDelivery />
    </div>
  );
};

export default DeliveryProfile;
