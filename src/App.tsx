import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Companies from "./pages/Companies";
import Requests from "./pages/Requests";
import Quotes from "./pages/Quotes";
import Auth from "./pages/Auth";
import ProfessionSelect from "./pages/ProfessionSelect";
import NewRequest from "./pages/NewRequest";
import CompanyFollow from "./pages/CompanyFollow";
import CompanyProfile from "./pages/CompanyProfile";
import Tracking from "./pages/Tracking";
import Rewards from "./pages/Rewards";
import Help from "./pages/Help";
import Balance from "./pages/Balance";
import Settings from "./pages/Settings";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";
import DashboardEmpresas from "./backoficce/DashboardEmpresas";
import Profile from "./backoficce/Profile";
import MessagesPage from "./pages/Messages";
import MessagesBackoffice from "./backoficce/Messages";
import Verification from "./backoficce/Verification";
import QuoteProposal from "./backoficce/QuoteProposal";
import PendingQuotes from "./backoficce/PendingQuotes";
import OrderTracking from "./backoficce/OrderTracking";
import OrderStatus from "./pages/OrderStatus";
import OrderChat from "./backoficce/OrderChat";
import FormularioSupremo from "./pages/FormularioSupremo";
import Reviews from "./backoficce/Reviews";
import ProfilePage from "./pages/Profile";
import Pagos from "./backoficce/Pagos";
import InventoryManager from "./pages/InventoryManager";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import DeliveryDetails from "./pages/DeliveryDetails";
import DeliveryHistory from "./pages/DeliveryHistory";
import DeliveryProfile from "./pages/DeliveryProfile";
import DeliveryPriceProposal from "./pages/DeliveryPriceProposal";
import UserDeliveryTracking from "./pages/UserDeliveryTracking";
import CompanyDeliveryTracking from "./pages/CompanyDeliveryTracking";
import VerificationAdmin from "./pages/admin/VerificationAdmin";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useEffect, useState } from "react";
import { getThemePreference } from "./theme-utils";

const App = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [themeClass, setThemeClass] = useState(getThemePreference()); // Obtener preferencia de tema

  useEffect(() => {
    // Comprobar si hay datos de autenticación guardados en localStorage
    const isAuthenticated = localStorage.getItem('userAuthenticated') === 'true';
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Si el usuario está autenticado en Firebase, guardar en localStorage
        localStorage.setItem('userAuthenticated', 'true');
        localStorage.setItem('userId', firebaseUser.uid);
      } else if (isAuthenticated) {
        // Si Firebase dice que no hay usuario pero localStorage dice que sí,
        // intentar mantener la sesión hasta que se compruebe con el servidor
        console.log("Mantener sesión según localStorage");
        // No hacer nada aquí, permitirá que la app continúe como si estuviera autenticado
      }
      
      setUser(firebaseUser || (isAuthenticated ? {} : null)); // Usar objeto vacío como usuario si hay datos en localStorage
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Efecto para escuchar cambios en el tema
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeClass(getThemePreference());
    };

    // Escuchar cambios en el localStorage para el tema
    window.addEventListener('storage', handleThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  if (!authChecked) {
    // Pantalla de carga global mientras Firebase verifica la sesión
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClass === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <span className={`ml-4 text-lg font-medium ${themeClass === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Cargando sesión...</span>
      </div>
    );
  }

  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className={`app-container ${themeClass}-theme`}>
          <BrowserRouter>
            <Routes>
              <Route path="/formulario-supremo" element={<FormularioSupremo />} />
              {/* Special route for inventory management that doesn't require login */}
              <Route path="/inventory-manager/:token" element={<InventoryManager />} />
            {!user ? (
              <>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<Auth />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profession-select" element={<ProfessionSelect />} />
                <Route path="/dashboard" element={<Index />} />
                <Route path="/company-follow" element={<CompanyFollow />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/company-profile" element={<CompanyProfile />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/new-request" element={<NewRequest />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/tracking" element={<Tracking />} />
                <Route path="/rewards" element={<Rewards />} />
                <Route path="/help" element={<Help />} />
                <Route path="/balance" element={<Balance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/backoffice/messages" element={<MessagesBackoffice />} />
                <Route path="/backoffice" element={<DashboardEmpresas />} />
                <Route path="/backoffice/profile" element={<Profile />} />
                <Route path="/backoffice/verification" element={<Verification />} />
                <Route path="/backoffice/quotes" element={<PendingQuotes />} />
                <Route path="/backoffice/quote-proposal" element={<QuoteProposal />} />
                <Route path="/backoffice/order-tracking" element={<OrderTracking />} />
                <Route path="/backoffice/pagos" element={<Pagos />} />
                <Route path="/backoffice/order-chat" element={<OrderChat />} />
                <Route path="/backoffice/reviews" element={<Reviews />} />
                <Route path="/company-panel" element={<DashboardEmpresas />} />
                <Route path="/order-status" element={<OrderStatus />} />
                <Route path="/order-tracking" element={<OrderTracking />} />
                {/* Rutas de administración */}
                <Route path="/admin/verification" element={<VerificationAdmin />} />
                {/* Rutas para repartidores */}
                <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
                <Route path="/delivery-details/:id" element={<DeliveryDetails />} />
                <Route path="/delivery-history" element={<DeliveryHistory />} />
                <Route path="/delivery-profile" element={<DeliveryProfile />} />
                <Route path="/delivery-propose-fee/:id" element={<DeliveryPriceProposal />} />
                
                {/* Tracking de entregas */}
                <Route path="/tracking/delivery/:id" element={<UserDeliveryTracking />} />
                <Route path="/company/tracking/delivery/:id" element={<CompanyDeliveryTracking />} />
                
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
