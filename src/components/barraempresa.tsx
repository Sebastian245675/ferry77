import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNavigationEmpresa from "./BottomNavigationEmpresa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  FileText,
  MessageSquare,
  User,
  Star,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Building2,
  CreditCard,
  LifeBuoy,
  CheckCircle
} from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

const logout = async () => {
  // Limpiar datos de autenticación del localStorage
  localStorage.removeItem('userAuthenticated');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
  localStorage.removeItem('companyData');
  
  // Cerrar sesión en Firebase
  const auth = getAuth();
  try {
    await signOut(auth);
    
    // Forzar una recarga completa de la página para limpiar cualquier estado
    window.location.href = '/auth';
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFloatingElements, setShowFloatingElements] = useState(true);
  const [company, setCompany] = useState({
    name: "Cargando...",
    profileImage: "",
    isVerified: false,
    category: "general"
  });

  // Detectar scroll para ocultar elementos flotantes después de cierto punto
  useEffect(() => {
    const handleScroll = () => {
      // Después de 200px de scroll, ocultar los elementos flotantes
      // Puedes ajustar este valor según necesites
      const scrollThreshold = 200;
      if (window.scrollY > scrollThreshold) {
        setShowFloatingElements(false);
      } else {
        setShowFloatingElements(true);
      }
    };

    // Agregar el event listener
    window.addEventListener("scroll", handleScroll);

    // Limpieza al desmontar
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Cargar datos de la empresa actual del usuario autenticado
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log("Obteniendo datos de empresa para:", user.uid);
          
          // Buscar en la colección users primero
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("Datos de usuario encontrados:", userData);
            
            setCompany({
              name: userData.companyName || userData.nick || "Mi Empresa",
              profileImage: userData.profileImage || userData.logo || "",
              isVerified: userData.isVerified || false,
              category: userData.category || "general"
            });
            return;
          }
          
          // Si no se encuentra en users, buscar en empresas
          const empresaQuery = query(collection(db, "empresas"), where("uid", "==", user.uid));
          const empresaSnap = await getDocs(empresaQuery);
          
          if (!empresaSnap.empty) {
            const empresaData = empresaSnap.docs[0].data();
            console.log("Datos de empresa encontrados:", empresaData);
            
            setCompany({
              name: empresaData.companyName || empresaData.nombre || "Mi Empresa",
              profileImage: empresaData.profileImage || empresaData.logo || "",
              isVerified: empresaData.isVerified || false,
              category: empresaData.category || "general"
            });
            return;
          }
          
          console.log("No se encontraron datos de empresa");
        } catch (error) {
          console.error("Error al cargar datos de empresa:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    // No necesitamos navegar aquí porque logout() ya redirige
  };

  const navigationItems = [
    { to: "/backoffice", icon: Home, label: "Dashboard", shortLabel: "Inicio", end: true },
    { to: "/backoffice/cotizadas", icon: CheckCircle, label: "Cotizadas", shortLabel: "Cotizadas" },
    { to: "/backoffice/messages", icon: MessageSquare, label: "Mensajes", shortLabel: "Mensajes" },
    { to: "/backoffice/profile", icon: User, label: "Perfil de Empresa", shortLabel: "Perfil" },
    { to: "/backoffice/reviews", icon: Star, label: "Reseñas y Comentarios", shortLabel: "Reseñas" },
    { to: "/backoffice/pagos", icon: CreditCard, label: "Pagos", shortLabel: "Pagos" },
    { to: "/backoffice/verification", icon: ShieldCheck, label: "Verificación", shortLabel: "Verificación" },
    { to: "/backoffice/help", icon: LifeBuoy, label: "Solicitar Ayuda", shortLabel: "Ayuda" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Logo flotante (solo ícono) */}
      <div className={`fixed top-4 left-4 z-50 transition-all duration-300 ${
        showFloatingElements ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      }`}>
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-primary bg-white rounded-full p-1.5 shadow-md" />
        </div>
      </div>
      
      {/* Avatar flotante con menú de opciones en la esquina superior derecha */}
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        showFloatingElements ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      }`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="bg-white rounded-full shadow-md p-1 hover:bg-blue-50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={company?.profileImage} />
                <AvatarFallback className="bg-primary text-white text-xs">
                  {company?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white w-48">
            <div className="px-2 py-1.5 text-sm font-medium text-center border-b">
              {company?.name}
              {company?.isVerified && (
                <div className="flex items-center justify-center mt-1">
                  <ShieldCheck className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Verificada</span>
                </div>
              )}
            </div>
            <DropdownMenuItem onClick={() => navigate("/backoffice/profile")}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex">
        {/* Sidebar - solo para desktop */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed lg:static lg:translate-x-0 z-40 w-64 h-screen bg-white shadow-lg transition-transform duration-300 hidden md:block mt-14`}
        >
          <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-50 hover:text-primary"
                  }`
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="font-medium text-sm sm:text-base">
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content - Añadimos padding superior para compensar la eliminación del header */}
        <main className="flex-1 p-4 sm:p-6 lg:ml-0 max-w-full overflow-x-hidden pb-16 md:pb-6 mt-14">
          {children}
        </main>
      </div>
      
      {/* Barra de navegación inferior para dispositivos móviles */}
      <BottomNavigationEmpresa />
    </div>
  );
};

export default DashboardLayout;