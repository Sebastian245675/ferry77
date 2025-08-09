import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Users, Truck, Star, Shield, CheckCircle, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuth, onAuthStateChanged } from "firebase/auth";

const Home = () => {
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [checkingUser, setCheckingUser] = useState(true); // Nuevo estado para saber si está verificando tipo de usuario
  const [slowConnection, setSlowConnection] = useState(false); // Estado para alerta de internet lento
  const [userType, setUserType] = useState(''); // 'empresa' o 'usuario'
  const navigate = useNavigate();
  const auth = getAuth();
  
  // DEBUG FORCE - Eliminar en producción
  useEffect(() => {
    // Función para depurar problemas de redirección
    const testLocalStorage = () => {
      console.log("[DEBUG][FORCE] localStorage userType:", localStorage.getItem('userType'));
      console.log("[DEBUG][FORCE] localStorage uid:", localStorage.getItem('uid'));
    };
    
    testLocalStorage();
    
    // Este código es SOLO para forzar a que revise si es empresa en desarrollo
    const forcedCheck = () => {
      const path = window.location.pathname;
      if (path === "/dashboard") {
        // Si estamos en dashboard pero deberíamos estar en backoffice, corregir
        if (localStorage.getItem('userType') === 'empresa') {
          console.log("[DEBUG][FORCE] ⚠️ EN DASHBOARD PERO ES EMPRESA. Redirigiendo a backoffice...");
          navigate("/backoffice", { replace: true });
        }
      }
    };
    
    // Ejecutar 2 segundos después para dar tiempo a que cargue todo
    const timer = setTimeout(forcedCheck, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  // Verificar si el usuario está autenticado y redirigir automáticamente
  useEffect(() => {
    // Intenta obtener el tipo de usuario del localStorage para acelerar la experiencia
    const cachedUserType = localStorage.getItem('userType');
    const cachedUid = localStorage.getItem('uid');
    
    let slowTimeout;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        console.log("[AUTH][CRITICAL] Usuario autenticado con UID:", uid);
        
        // COMPROBACIÓN PRELIMINAR INMEDIATA
        // Esto es crítico: revisamos localStorage primero para redirección inmediata
        const cachedUserType = localStorage.getItem('userType');
        const cachedUid = localStorage.getItem('uid');
        
        if (cachedUserType === 'empresa' && cachedUid === uid) {
          console.log("[FASTPATH][CRITICAL] ⚡ EMPRESA EN CACHÉ. Redirigiendo inmediatamente a backoffice");
          setUserType('empresa');
          
          const currentPath = window.location.pathname;
          if (currentPath === "/" || currentPath === "/home") {
            navigate("/backoffice", { replace: true });
          }
          
          // Aún verificamos en segundo plano para mantener actualizada la información
          slowTimeout = setTimeout(() => setSlowConnection(true), 6000);
          verificarTipoUsuario(uid, true);
          return;
        }
        
        slowTimeout = setTimeout(() => setSlowConnection(true), 6000);
        verificarTipoUsuario(uid, false);
      } else {
        setCheckingUser(false);
        setUserType('');
        localStorage.removeItem('userType');
        localStorage.removeItem('uid');
      }
    });

    // Función para verificar el tipo de usuario
    const verificarTipoUsuario = async (uid, esVerificacionEnSegundoPlano = false) => {
      try {
        console.log(`[DEBUG][CRITICAL] Verificando tipo de usuario para UID: ${uid}`);
        
        // SOLUCIÓN DIRECTA: Primero intentamos ver si es una empresa buscando en todas las colecciones
        let isEmpresaConfirmed = false;
        
        // 1. Buscar en la colección empresas (búsqueda crítica)
        const empresasSnap = await getDocs(query(collection(db, "empresas"), where("uid", "==", uid)));
        if (!empresasSnap.empty) {
          console.log("[DEBUG][CRITICAL] ✓ CONFIRMADO: Es empresa por empresas.uid");
          isEmpresaConfirmed = true;
        } else {
          // 2. Buscar por userId en empresas
          const empresasUserIdSnap = await getDocs(query(collection(db, "empresas"), where("userId", "==", uid)));
          if (!empresasUserIdSnap.empty) {
            console.log("[DEBUG][CRITICAL] ✓ CONFIRMADO: Es empresa por empresas.userId");
            isEmpresaConfirmed = true;
          } else {
            // 3. Buscar en la colección empresa singular
            const empresaSnap = await getDocs(query(collection(db, "empresa"), where("uid", "==", uid)));
            if (!empresaSnap.empty) {
              console.log("[DEBUG][CRITICAL] ✓ CONFIRMADO: Es empresa por empresa.uid");
              isEmpresaConfirmed = true;
            } else {
              // 4. Buscar por userId en empresa singular
              const empresaUserIdSnap = await getDocs(query(collection(db, "empresa"), where("userId", "==", uid)));
              if (!empresaUserIdSnap.empty) {
                console.log("[DEBUG][CRITICAL] ✓ CONFIRMADO: Es empresa por empresa.userId");
                isEmpresaConfirmed = true;
              }
            }
          }
        }
        
        // Si todavía no está confirmado, vamos a la colección de usuarios como último recurso
        if (!isEmpresaConfirmed) {
          const userSnap = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            console.log("[DEBUG][CRITICAL] Datos de usuario:", JSON.stringify(userData, null, 2));
            
            if (
              userData.rol === "empresa" ||
              userData.role === "empresa" ||
              userData.type === "company" ||
              userData.tipo === "empresa" ||
              userData.isCompany === true ||
              !!userData.companyName ||
              !!userData.nick
            ) {
              console.log("[DEBUG][CRITICAL] ✓ CONFIRMADO: Es empresa por atributos en users");
              isEmpresaConfirmed = true;
            }
          }
        }
        
        // DECISIÓN FINAL
        console.log("[DEBUG][CRITICAL] ⭐ RESULTADO FINAL: " + (isEmpresaConfirmed ? "ES EMPRESA" : "NO ES EMPRESA"));
        
        // Guardamos el tipo en localStorage de forma FORZADA si es empresa
        const tipo = isEmpresaConfirmed ? 'empresa' : 'usuario';
        localStorage.setItem('userType', tipo);
        localStorage.setItem('uid', uid);
        setUserType(tipo);
        
        // Redirigimos SIEMPRE si es empresa para evitar problemas
        if (isEmpresaConfirmed) {
          if (!esVerificacionEnSegundoPlano) {
            console.log("[NAVIGATE][FORCED] REDIRIGIENDO A BACKOFFICE como empresa");
            navigate("/backoffice", { replace: true });
          } else {
            console.log("[BACKGROUND][FORCED] Se detectó empresa en verificación de fondo");
          }
        } else if (!esVerificacionEnSegundoPlano) {
          console.log("[NAVIGATE] Redirigiendo como usuario normal");
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("[ERROR][CRITICAL] Error al verificar tipo de usuario:", error);
        if (!esVerificacionEnSegundoPlano) {
          // En caso de error, intentar usar la caché si existe
          const cachedType = localStorage.getItem('userType');
          if (cachedType === 'empresa') {
            console.log("[ERROR][RECOVERY] Usando caché para redirigir a backoffice");
            navigate("/backoffice", { replace: true });
          } else {
            console.log("[ERROR][FALLBACK] Redirigiendo a dashboard por defecto");
            setUserType('usuario');
            navigate("/dashboard", { replace: true });
          }
        }
      } finally {
        if (!esVerificacionEnSegundoPlano) {
          setCheckingUser(false);
        }
        clearTimeout(slowTimeout);
      }
    };
    
    // Función para redirigir según el tipo de usuario
    const redirigirSegunTipo = (tipo) => {
      const currentPath = window.location.pathname;
      // Solo redirigimos si estamos en la ruta principal
      if (currentPath === "/" || currentPath === "/home") {
        console.log(`[NAVIGATE] Redirigiendo como ${tipo} a ${tipo === 'empresa' ? '/backoffice' : '/dashboard'}`);
        navigate(tipo === 'empresa' ? "/backoffice" : "/dashboard", { replace: true });
      } else {
        console.log(`[NAVIGATE] No se redirije porque estamos en ${currentPath}`);
      }
    };
    
    return () => {
      unsubscribe();
      clearTimeout(slowTimeout);
    };
  }, [navigate, auth]);

  useEffect(() => {
    const fetchActiveRequests = async () => {
      try {
        console.log("Configurando solicitudes activas...");
        
        // En desarrollo usaremos un valor fijo de 3 para asegurar que se muestre algo
        // En producción haremos la consulta normal
        if (process.env.NODE_ENV === 'development') {
          console.log("Modo desarrollo: Mostrando 3 solicitudes activas");
          setActiveRequestsCount(3);
          return;
        }
        
        // Esta consulta es para producción
        const q = query(collection(db, "solicitud"), where("status", "==", "cotizando"));
        const activasSnapshot = await getDocs(q);
        const cantidadActivas = activasSnapshot.size;
        
        console.log("Solicitudes activas encontradas:", cantidadActivas);
        setActiveRequestsCount(cantidadActivas);
      } catch (error) {
        console.error("Error al cargar solicitudes activas:", error);
        // En caso de error en desarrollo mostrar 2, en producción 0
        setActiveRequestsCount(process.env.NODE_ENV === 'development' ? 2 : 0);
      }
    };

    fetchActiveRequests();
  }, []);

  if (checkingUser) {
    // Loader o pantalla en blanco mientras se verifica el tipo de usuario
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600"></div>
          <p className="text-lg text-gray-600">Verificando tu cuenta...</p>
          {userType && (
            <p className="mt-2 text-sm text-blue-600">
              Se ha detectado que eres {userType === 'empresa' ? 'una empresa' : 'un usuario'}. Redirigiendo...
            </p>
          )}
          {slowConnection && (
            <div className="mt-6 px-4 py-3 bg-red-100 text-red-700 rounded-lg shadow font-semibold animate-pulse">
              <p>Tu conexión a internet es lenta o inestable.</p>
              <div className="mt-3 flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  className="bg-white border-blue-500 text-blue-700"
                  onClick={() => navigate("/backoffice", { replace: true })}
                >
                  Ir a Panel de Empresa
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-white"
                  onClick={() => navigate("/dashboard", { replace: true })}
                >
                  Ir a Panel de Usuario
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // ...existing code...
};

export default Home;
