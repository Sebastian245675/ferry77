import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        console.log("🔍 Verificando tipo de usuario en Home para UID:", user.uid);
        
        // Consultar backend para determinar el tipo de usuario
        const response = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
        
        if (response.ok) {
          const userData = await response.json();
          console.log("👤 Datos del usuario desde backend en Home:", userData);
          
          // Redirigir según el tipo de usuario
          if (userData.userType === "empresa" || userData.userType === "company") {
            console.log("🏢 Redirigiendo empresa a backoffice desde Home");
            navigate('/backoffice');
          } else {
            console.log("👥 Redirigiendo usuario a dashboard desde Home");
            navigate('/dashboard');
          }
        } else {
          // Si no se encuentra en backend, redirigir a dashboard por defecto
          console.log("⚠️ Usuario no encontrado en backend, redirigiendo a dashboard");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("❌ Error al verificar tipo de usuario en Home:", error);
        // En caso de error, redirigir a dashboard por defecto
        navigate('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Ferry77</h1>
        <p className="text-lg text-gray-600 mb-8">Connecting you with transport services</p>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">Loading...</p>
      </div>
    </div>
  );
};

export default Home;
