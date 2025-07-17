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
import DashboardEmpresas from "./backoficce/desboarempresas";
import Profile from "./backoficce/Profile";
import MessagesPage from "./pages/Messages";
import MessagesBackoffice from "./backoficce/Messages";
import Verification from "./backoficce/Verification";
import QuoteProposal from "./backoficce/QuoteProposal";
import PendingQuotes from "./backoficce/PendingQuotes";
import OrderTracking from "./backoficce/OrderTracking";
import OrderStatus from "./pages/OrderStatus";
import OrderChat from "./backoficce/OrderChat";
import ProfilePage from "./pages/Profile";
import Reviews from "./backoficce/Reviews";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profession-select" element={<ProfessionSelect />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/company/:id" element={<CompanyProfile />} />
          <Route path="/company-profile" element={<CompanyProfile />} />
          <Route path="/company-follow" element={<CompanyFollow />} />
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
          {/* Rutas del panel de empresa */}
          <Route path="/backoffice" element={<DashboardEmpresas />} />
          <Route path="/backoffice/profile" element={<Profile />} />
          <Route path="/backoffice/verification" element={<Verification />} />
          <Route path="/backoffice/quotes" element={<PendingQuotes />} />
          <Route path="/backoffice/quote-proposal" element={<QuoteProposal />} />
          <Route path="/backoffice/order-tracking" element={<OrderTracking />} />
          <Route path="/backoffice/order-chat" element={<OrderChat />} />
          <Route path="/backoffice/reviews" element={<Reviews />} />
          
          {/* Rutas anteriores para compatibilidad */}
          <Route path="/company-panel" element={<DashboardEmpresas />} />
          <Route path="/order-status" element={<OrderStatus />} />
          <Route path="/order-tracking" element={<OrderTracking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
