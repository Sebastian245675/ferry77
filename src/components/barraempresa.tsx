import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Building2
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
  const [company, setCompany] = useState({
    name: "Cargando...",
    profileImage: "",
    isVerified: false,
    category: "general"
  });

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
    // Eliminado: Cotizaciones
    { to: "/backoffice/messages", icon: MessageSquare, label: "Mensajes", shortLabel: "Mensajes" },
    { to: "/backoffice/profile", icon: User, label: "Perfil de Empresa", shortLabel: "Perfil" },
    { to: "/backoffice/reviews", icon: Star, label: "Reseñas y Comentarios", shortLabel: "Reseñas" },
    { to: "/backoffice/verification", icon: ShieldCheck, label: "Verificación", shortLabel: "Verificación" },
    // El chat del pedido no aparecerá en el menú, solo es accesible desde el botón
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-lg sm:text-xl font-bold text-primary">BusinessHub</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-blue-50 p-2">
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                  <AvatarImage src={company?.profileImage} />
                  <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
                    {company?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium truncate max-w-32">{company?.name}</p>
                  <div className="flex items-center space-x-1">
                    {company?.isVerified && (
                      <ShieldCheck className="h-3 w-3 text-green-500" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {company?.category}
                    </Badge>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white w-48">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
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
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } fixed lg:static lg:translate-x-0 z-40 w-64 h-[calc(100vh-80px)] bg-white shadow-lg transition-transform duration-300`}
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

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:ml-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;