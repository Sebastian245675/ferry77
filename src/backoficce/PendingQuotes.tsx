import { 
  DollarSign, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  User, 
  CalendarIcon, 
  ClockIcon, 
  AlertCircle, 
  PlusCircle, 
  XCircle 
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import { ContactClientButton } from "../components/ContactClientButton";
import { AvatarFallback } from "../components/ui/avatar";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  increment,
  Timestamp
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "../hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../components/ui/dropdown-menu";
import { Avatar, AvatarImage } from "../components/ui/avatar";
import { Clock, CheckCircle, Send, Filter, Search, FileText, Package } from "lucide-react";

// Tipos locales (copiados de QuoteProposal)
type QuoteRequest = {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  budget?: number;
  urgency?: string;
  createdAt?: any;
  userId?: string;
  profession?: string;
  items?: Array<{
    name: string;
    quantity: number;
    specifications?: string;
  }>;
  clientId?: string;
  clientName?: string;
  clientAvatar?: string;
  category?: string;
  status?: 'pending' | 'quoted' | 'confirmed' | 'accepted' | 'rejected' | string;
  attachments?: any[];
  deadline?: any;
};
type QuoteResponseItem = {
  name: string;
  description: string;
  quantity: number;
  price: number;
};
type QuoteResponse = {
  id?: string;
  requestId: string;
  companyId: string;
  companyName: string;
  price: number;
  description: string;
  items: QuoteResponseItem[];
  deliveryTime: string;
  validUntil?: any;
  attachments?: any[];
  status: string;
  createdAt: any;
};

function PendingQuotes() {

// ...resto del código sin cambios...
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [sentQuotes, setSentQuotes] = useState<QuoteResponse[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  // Estados para nueva cotización
  const [quoteResponse, setQuoteResponse] = useState<Omit<QuoteResponse, 'requestId' | 'companyId' | 'companyName' | 'createdAt' | 'status'>>({
    price: 0,
    description: "",
    deliveryTime: "",
    items: []
  });
  const [newItem, setNewItem] = useState<Omit<QuoteResponseItem, 'price'> & { price: string }>({
    name: "",
    description: "",
    quantity: 1,
    price: ""
  });

  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar solicitudes de cotización pendientes

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    console.log("[PendingQuotes] Usuario actual:", user.uid, user.displayName);
    
    // En lugar de filtrar por estado en la consulta, obtenemos TODAS las solicitudes
    const quoteRequestsQuery = query(
      collection(db, "solicitud"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(quoteRequestsQuery, async (snapshot) => {
      const requests: QuoteRequest[] = [];
      const allQuotes: QuoteRequest[] = [];
      
      console.log("[PendingQuotes] Total de solicitudes encontradas:", snapshot.docs.length);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Convertir cada documento a nuestro formato QuoteRequest para uso posterior
        const quoteRequest: QuoteRequest = {
          id: doc.id,
          clientId: data.userId || "",
          clientName: data.userName || data.clientName || "Cliente",
          clientAvatar: data.userAvatar || data.clientAvatar,
          title: data.title || "Solicitud de cotización",
          description: data.description || "",
          category: data.profession || data.category || "General",
          items: data.items || [],
          status: (data.status === "pendiente" || data.status === "cotizando") ? "pending" :
                 (data.status === "confirmado") ? "confirmed" :
                 (data.status === "accepted") ? "accepted" : "quoted",
          location: data.location || "",
          createdAt: data.createdAt || Timestamp.now(),
          urgency: data.urgency === "alta" ? "high" : 
                  data.urgency === "media" ? "medium" : "low",
          budget: data.budget || 0,
          attachments: data.attachments || [],
          deadline: data.deadline
        };
        
        // Guardar todas las solicitudes para posible uso posterior
        allQuotes.push(quoteRequest);
        
        // Comprobar si esta solicitud es para nuestra empresa y tiene un estado válido
        const validStatus = data.status === "pendiente" || data.status === "cotizando" || data.status === "confirmado";
        if (!validStatus) continue;

        console.log(`[PendingQuotes] Procesando solicitud ${doc.id}, status: ${data.status}`);
        
        let match = false;
        // 1. selectedCompanyIds (array simple de IDs)
        if (data.selectedCompanyIds && Array.isArray(data.selectedCompanyIds)) {
          if (data.selectedCompanyIds.includes(user.uid)) {
            console.log(`[PendingQuotes] Coincidencia por selectedCompanyIds para ${doc.id}`);
            match = true;
          }
        }
        // 2. selectedCompanies (array de objetos o strings)
        if (!match && data.selectedCompanies && Array.isArray(data.selectedCompanies)) {
          console.log(`[PendingQuotes] Buscando en selectedCompanies para ${doc.id}:`, data.selectedCompanies);
          match = data.selectedCompanies.some(company => {
            if (typeof company === 'string') {
              const matches = company === user.uid;
              if (matches) console.log(`[PendingQuotes] Coincidencia string en selectedCompanies para ${doc.id}`);
              return matches;
            }
            if (company && typeof company === 'object') {
              const idMatch = company.id === user.uid;
              const companyIdMatch = company.companyId === user.uid;
              const matches = idMatch || companyIdMatch;
              if (matches) console.log(`[PendingQuotes] Coincidencia objeto en selectedCompanies para ${doc.id}`);
              return matches;
            }
            return false;
          });
        }
        
        if (match) {
          console.log(`[PendingQuotes] Añadiendo solicitud ${doc.id} a la lista`);
          requests.push(quoteRequest);
        }
      }
      
      if (requests.length === 0) {
        console.log("[PendingQuotes] No se encontraron solicitudes para esta empresa. Mostrando todas las solicitudes en estado pendiente/cotizando/confirmado.");
        // Si no hay solicitudes filtradas, mostrar todas las pendientes/cotizando/confirmado
        const pendingQuotes = allQuotes.filter(q => 
          (q.status === "pending") // Ya mapeamos los estados pendiente/cotizando/confirmado a "pending"
        );
        console.log(`[PendingQuotes] Mostrando ${pendingQuotes.length} solicitudes no filtradas.`);
        setQuoteRequests(pendingQuotes);
      } else {
        console.log(`[PendingQuotes] Mostrando ${requests.length} solicitudes filtradas para esta empresa.`);
        setQuoteRequests(requests);
      }
      setIsLoading(false);
    });
    
    // Importante: cerrar la suscripción cuando el componente se desmonte
    return () => unsubscribe();
    // Cargar cotizaciones enviadas por esta empresa
    const loadSentQuotes = async () => {
      try {
        const sentQuotesQuery = query(
          collection(db, "cotizaciones"),
          where("companyId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const sentQuotesSnapshot = await getDocs(sentQuotesQuery);
        const quotes: QuoteResponse[] = sentQuotesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            requestId: data.requestId || "",
            companyId: data.companyId || user.uid,
            companyName: data.companyName || user.displayName || "Empresa",
            price: data.totalAmount || data.price || 0,
            description: data.description || "",
            items: data.items || [],
            deliveryTime: data.deliveryTime || "",
            validUntil: data.validUntil,
            attachments: data.attachments || [],
            status: data.status === "pending" ? "sent" :
                   data.status === "accepted" ? "accepted" : 
                   data.status === "declined" ? "rejected" : "viewed",
            createdAt: data.createdAt || Timestamp.now()
          };
        });
        setSentQuotes(quotes);
      } catch (error) {
        console.error("Error cargando cotizaciones enviadas:", error);
      }
    };
    loadSentQuotes();
    return () => unsubscribe();
  }, [user]);

  // Filtrar solicitudes según búsqueda y estado
  const filteredRequests = quoteRequests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Caso especial: "pendientes" debería incluir también las confirmadas
    const matchesStatus = 
      statusFilter === "all" || 
      request.status === statusFilter || 
      (statusFilter === "pending" && request.status === "confirmed");
    
    return matchesSearch && matchesStatus;
  });
  
  // Filtrar cotizaciones enviadas según búsqueda
  const filteredSentQuotes = sentQuotes.filter(quote => {
    // Buscar la solicitud correspondiente para obtener el título
    const request = quoteRequests.find(req => req.id === quote.requestId);
    
    return (
      request?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Agregar un nuevo item a la cotización
  const addItemToQuote = () => {
    if (!newItem.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del ítem es requerido",
        variant: "destructive"
      });
      return;
    }
    
    const price = parseFloat(newItem.price.replace(/,/g, '.'));
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "El precio debe ser un número válido mayor a cero",
        variant: "destructive"
      });
      return;
    }
    
    const newItems = [
      ...(quoteResponse.items || []),
      {
        ...newItem,
        price
      }
    ];
    
    setQuoteResponse({
      ...quoteResponse,
      items: newItems,
      // Actualizar el precio total sumando todos los items
      price: newItems.reduce((total, item) => total + (item.price * item.quantity), 0)
    });
    
    // Limpiar el formulario de nuevo item
    setNewItem({
      name: "",
      description: "",
      quantity: 1,
      price: ""
    });
  };

  // Eliminar un item de la cotización
  const removeItem = (index: number) => {
    const newItems = quoteResponse.items ? [...quoteResponse.items] : [];
    newItems.splice(index, 1);
    
    setQuoteResponse({
      ...quoteResponse,
      items: newItems,
      price: newItems.reduce((total, item) => total + (item.price * item.quantity), 0)
    });
  };

  // Enviar cotización
  const sendQuote = async () => {
    if (!selectedRequest || !user) return;
    
    try {
      if (!quoteResponse.description.trim()) {
        toast({
          title: "Error",
          description: "La descripción es requerida",
          variant: "destructive"
        });
        return;
      }
      
      if (quoteResponse.price <= 0) {
        toast({
          title: "Error",
          description: "El precio total debe ser mayor a cero",
          variant: "destructive"
        });
        return;
      }
      
      const newQuote: QuoteResponse = {
        requestId: selectedRequest.id,
        companyId: user.uid,
        companyName: user.displayName || "Empresa",
        ...quoteResponse,
        status: 'sent',
        createdAt: Timestamp.now()
      };
      
      // Guardar en Firestore - usamos la colección "cotizaciones" en lugar de "quoteResponses"
      const quoteData = {
        requestId: selectedRequest.id,
        requestTitle: selectedRequest.title,
        companyId: user.uid,
        companyName: user.displayName || "Empresa",
        company: {
          name: user.displayName || "Empresa",
          logo: "",
          rating: 4.5,
          verified: true,
        },
        subtotal: quoteResponse.price,
        discount: { type: "percent", value: 0 },
        totalAmount: quoteResponse.price,
        originalBudget: selectedRequest.budget || 0,
        savings: selectedRequest.budget ? (selectedRequest.budget - quoteResponse.price > 0 ? selectedRequest.budget - quoteResponse.price : 0) : 0,
        deliveryTime: quoteResponse.deliveryTime || "A convenir",
        items: quoteResponse.items || [],
        status: "pending",
        createdAt: Timestamp.now(),
        validUntil: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        notes: quoteResponse.description,
        paymentOptions: ["Efectivo", "Transferencia bancaria"],
        userId: selectedRequest.clientId,
        clientName: selectedRequest.clientName
      };
      
      const docRef = await addDoc(collection(db, "cotizaciones"), quoteData);
      
      // Actualizar el estado de la solicitud a "cotizando"
      await updateDoc(doc(db, "solicitud", selectedRequest.id), {
        status: "cotizando",
        quotesCount: increment(1)
      });
      
      toast({
        title: "Cotización enviada",
        description: "La cotización ha sido enviada al cliente exitosamente"
      });
      
      // Actualizar el estado local
      const updatedRequest = { ...selectedRequest, status: "quoted" as 'quoted' };
      setQuoteRequests(prev => 
        prev.map(req => req.id === selectedRequest.id ? updatedRequest : req)
      );
      
      // Añadir la nueva cotización a la lista de enviadas
      const newSentQuote: QuoteResponse = {
        id: docRef.id,
        requestId: selectedRequest.id,
        companyId: user.uid,
        companyName: user.displayName || "Empresa",
        price: quoteResponse.price,
        description: quoteResponse.description,
        items: quoteResponse.items,
        deliveryTime: quoteResponse.deliveryTime,
        validUntil: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        status: "sent",
        createdAt: Timestamp.now()
      };
      
      setSentQuotes(prev => [newSentQuote, ...prev]);
      
      // Cerrar el diálogo
      setIsQuoteDialogOpen(false);
      
      // Limpiar la cotización
      setQuoteResponse({
        price: 0,
        description: "",
        deliveryTime: "",
        items: []
      });
      
    } catch (error) {
      console.error("Error al enviar cotización:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la cotización. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Formatear fecha
  const formatDate = (timestamp: Timestamp | number) => {
    const date = timestamp instanceof Timestamp 
      ? timestamp.toDate()
      : new Date(timestamp);
    
    return format(date, "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Formatear precio
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (

    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto w-full px-2 sm:px-4 md:px-8 lg:px-12">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-100 to-white p-6 md:p-10 rounded-2xl mb-6 md:mb-12 shadow-md">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 tracking-tight">
            Solicitudes de cotización
          </h1>
          <p className="text-gray-600 mt-2 text-base md:text-lg max-w-2xl">
            Gestiona y responde a las solicitudes de cotización de tus clientes de forma eficiente y profesional.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 min-w-[260px] md:min-w-[340px] lg:min-w-[400px]">
          <div className="bg-white rounded-xl shadow p-4 border border-blue-200 flex items-center gap-3 md:gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-blue-900">{quoteRequests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-green-200 flex items-center gap-3 md:gap-4">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Aceptadas</p>
              <p className="text-2xl font-bold text-green-900">{sentQuotes.filter(q => q.status === 'accepted').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs y Filtros */}
      <div className="space-y-2 sm:space-y-4">
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-white p-2 sm:p-4 md:p-6 rounded-lg shadow-sm border mb-4 sm:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
            <TabsList className="bg-gray-100 p-1 w-full md:w-auto flex gap-2 md:gap-4">
              <TabsTrigger value="pending" className="flex-1 md:flex-none relative data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-base px-2 md:px-4 py-2">
                <Clock className="w-4 h-4 mr-1 md:mr-2" />
                Pendientes
                {quoteRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="ml-2 bg-white text-blue-600">
                    {quoteRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 md:flex-none data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-base px-2 md:px-4 py-2">
                <Send className="w-4 h-4 mr-1 md:mr-2" />
                Enviadas
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 w-full rounded-full bg-gray-50 border-gray-200 focus:border-blue-500 text-xs md:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeTab === "pending" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 text-xs md:text-base">
                      <Filter className="w-4 h-4 mr-1 text-gray-500" />
                      Filtrar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white rounded-lg border border-gray-200 shadow-lg">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")} className="cursor-pointer">
                      Todos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("pending")} className="cursor-pointer">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      Pendientes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("quoted")} className="cursor-pointer">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Cotizados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Contenido de Tabs */}
          <TabsContent value="pending" className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No hay solicitudes de cotización</h3>
                <p className="text-muted-foreground mt-1">
                  {searchTerm 
                    ? "No se encontraron resultados para tu búsqueda"
                    : "Cuando los clientes soliciten cotizaciones, aparecerán aquí"}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setIsLoading(true);
                    setTimeout(() => setIsLoading(false), 1000);
                    toast({
                      title: "Buscando solicitudes",
                      description: "Actualizando lista de solicitudes pendientes..."
                    });
                  }}
                >
                  Actualizar solicitudes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden hover:shadow-2xl transition-all border-l-4 border-l-blue-500 bg-white rounded-xl p-0 md:p-1 lg:p-2">
                    <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent rounded-t-xl px-4 pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col items-start gap-2">
                          <Badge 
                            variant={
                              request.status === 'pending' ? 'default' : 
                              request.status === 'confirmed' ? 'default' :
                              request.status === 'quoted' ? 'secondary' : 
                              request.status === 'accepted' ? 'outline' : 'destructive'
                            }
                            className={`px-3 py-1 ${
                              request.status === 'confirmed' ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                            }`}
                          >
                            {request.status === 'pending' ? 'Pendiente' : 
                             request.status === 'confirmed' ? 'Confirmado' :
                             request.status === 'quoted' ? 'En proceso' : 
                             request.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                          </Badge>
                          <Badge variant="outline" className={`px-3 py-1 ${
                            request.urgency === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                            request.urgency === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                            'text-green-600 bg-green-50 border-green-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {request.urgency === 'high' ? 'Urgente' :
                             request.urgency === 'medium' ? 'Normal' : 'Baja prioridad'}
                          </Badge>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 px-3 py-1">
                          {request.category}
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-xl mt-2 text-blue-900">{request.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 px-4">
                      <div className="flex items-center mb-3 bg-gray-50 p-2 rounded-md">
                        <Avatar className="h-10 w-10 mr-3 border-2 border-blue-100">
                          <AvatarImage src={request.clientAvatar} />
                          <AvatarFallback className="bg-blue-600 text-white">{request.clientName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.clientName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-md p-3 border mb-3">
                        <p className="text-sm line-clamp-3 text-gray-700">
                          {request.description}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {request.budget > 0 && (
                          <div className="flex items-center space-x-1 bg-green-50 p-2 rounded-md text-green-800">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{formatPrice(request.budget)}</span>
                          </div>
                        )}
                        {request.location && (
                          <div className="flex items-center space-x-1 bg-purple-50 p-2 rounded-md text-purple-800">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm truncate">{request.location}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Ítems solicitados */}
                      {request.items && request.items.length > 0 && (
                        <div className="mt-3 bg-gray-50 p-2 rounded-md">
                          <p className="text-sm font-medium mb-1">Ítems solicitados: {request.items.length}</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {request.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs bg-white p-2 rounded border flex justify-between">
                                <span className="font-medium truncate">{item.name}</span>
                                <span className="text-gray-500">x{item.quantity}</span>
                              </div>
                            ))}
                            {request.items.length > 3 && (
                              <div className="text-xs text-center text-gray-500">
                                Y {request.items.length - 3} ítem(s) más
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Fecha límite */}
                      {request.deadline && (
                        <div className="mt-2 flex items-center justify-end">
                          <Calendar className="h-4 w-4 mr-1 text-orange-600" />
                          <span className="text-xs font-medium text-orange-600">
                            Fecha límite: {format(
                              request.deadline instanceof Timestamp 
                                ? request.deadline.toDate() 
                                : new Date(request.deadline), 
                              "dd/MM/yyyy"
                            )}
                          </span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between pt-3 border-t bg-gray-50 px-4 pb-4 rounded-b-xl">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsDetailDialogOpen(true);
                        }}
                        className="border-gray-300 hover:bg-gray-100"
                      >
                        <FileText className="h-4 w-4 mr-1" /> Ver detalles
                      </Button>
                      {request.status === 'pending' ? (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsQuoteDialogOpen(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-1" /> Cotizar
                        </Button>
                      ) : (
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            // Aquí iría la acción para contactar al cliente
                            toast({
                              title: "Contactar cliente",
                              description: `Contactando a ${request.clientName}...`
                            });
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" /> Contactar
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab de cotizaciones enviadas */}
          <TabsContent value="sent" className="pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredSentQuotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No has enviado cotizaciones</h3>
                <p className="text-muted-foreground mt-1">
                  {searchTerm 
                    ? "No se encontraron resultados para tu búsqueda" 
                    : "Cuando envíes cotizaciones a los clientes, aparecerán aquí"}
                </p>
              </div>
            ) : (
              <div className="space-y-6 xl:space-y-8">
                <ScrollArea className="h-[calc(100vh-320px)] xl:h-[calc(100vh-360px)]">
                  <div className="space-y-6 xl:space-y-8">
                    {filteredSentQuotes.map((quote) => {
                      const request = quoteRequests.find(r => r.id === quote.requestId);
                      return (
                        <Card key={quote.id} className="overflow-hidden bg-white rounded-xl shadow hover:shadow-2xl transition-all">
                          <CardHeader className="pb-3 px-4 pt-4">
                            <div className="flex justify-between items-start">
                              <Badge 
                                variant={
                                  quote.status === 'sent' ? 'default' : 
                                  quote.status === 'viewed' ? 'secondary' : 
                                  quote.status === 'accepted' ? 'outline' : 'destructive'
                                }
                              >
                                {quote.status === 'sent' ? 'Enviada' : 
                                quote.status === 'viewed' ? 'Vista' : 
                                quote.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(quote.createdAt)}
                              </p>
                            </div>
                            <CardTitle className="text-lg">{request?.title || 'Cotización'}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-4 px-4">
                            <div className="flex items-center mb-3">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarImage src={request?.clientAvatar} />
                                <AvatarFallback>{(request?.clientName || 'C').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <p className="text-sm font-medium">{request?.clientName || 'Cliente'}</p>
                            </div>
                            
                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Precio total:</span>
                                <span className="font-medium">{formatPrice(quote.price)}</span>
                              </div>
                              {quote.deliveryTime && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tiempo de entrega:</span>
                                  <span>{quote.deliveryTime}</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm line-clamp-2">{quote.description}</p>
                            
                            {quote.items && quote.items.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium mb-1">Ítems cotizados: {quote.items.length}</p>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {quote.items.map(item => item.name).join(", ")}
                                </div>
                              </div>
                            )}
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2 border-t px-4 pb-4 rounded-b-xl">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Ver detalles de la cotización enviada
                                // Aquí podríamos implementar un diálogo para ver todos los detalles
                              }}
                            >
                              Ver detalles
                            </Button>
                            <ContactClientButton 
                              clientId={request?.clientId || ''} 
                              clientName={request?.clientName || 'Cliente'}
                              requestId={quote.requestId}
                              variant="secondary"
                              size="sm"
                            />
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de Detalles */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-2xl">{selectedRequest.title}</DialogTitle>
                  <Badge 
                    variant={
                      selectedRequest.status === 'pending' ? 'default' : 
                      selectedRequest.status === 'quoted' ? 'secondary' : 
                      selectedRequest.status === 'accepted' ? 'outline' : 'destructive'
                    }
                  >
                    {selectedRequest.status === 'pending' ? 'Pendiente' : 
                     selectedRequest.status === 'quoted' ? 'Cotizado' : 
                     selectedRequest.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                  </Badge>
                </div>
                <DialogDescription>
                  Solicitud creada el {formatDate(selectedRequest.createdAt)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Descripción de la solicitud</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{selectedRequest.description}</p>
                      
                      {selectedRequest.items && selectedRequest.items.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Artículos solicitados:</h4>
                          <table className="w-full border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedRequest.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm">{item.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{item.specifications ?? '-'}</td>
                                  <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Archivos adjuntos:</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.attachments.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                <span className="text-sm">Adjunto {index + 1}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detalles del cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-4">
                        <Avatar className="h-12 w-12 mr-3">
                          <AvatarImage src={selectedRequest.clientAvatar} />
                          <AvatarFallback>{selectedRequest.clientName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{selectedRequest.clientName}</h4>
                          <p className="text-sm text-muted-foreground">Cliente</p>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">ID: {selectedRequest.clientId}</span>
                        </div>
                        
                        {selectedRequest.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{selectedRequest.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            {format(
                              selectedRequest.createdAt instanceof Timestamp 
                                ? selectedRequest.createdAt.toDate() 
                                : new Date(selectedRequest.createdAt),
                              "dd MMMM yyyy",
                              { locale: es }
                            )}
                          </span>
                        </div>
                        
                        {selectedRequest.deadline && (
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">
                              Fecha límite: {format(
                                selectedRequest.deadline instanceof Timestamp 
                                  ? selectedRequest.deadline.toDate() 
                                  : new Date(selectedRequest.deadline),
                                "dd MMMM yyyy",
                                { locale: es }
                              )}
                            </span>
                          </div>
                        )}
                        
                        {selectedRequest.budget > 0 && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">
                              Presupuesto: {formatPrice(selectedRequest.budget)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <AlertCircle className={`h-4 w-4 mr-2 ${
                            selectedRequest.urgency === 'high' ? 'text-red-500' :
                            selectedRequest.urgency === 'medium' ? 'text-amber-500' :
                            'text-green-500'
                          }`} />
                          <span className="text-sm">
                            {selectedRequest.urgency === 'high' ? 'Urgencia alta' :
                             selectedRequest.urgency === 'medium' ? 'Urgencia media' :
                             'Urgencia baja'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="mt-4 space-y-2">
                    <ContactClientButton
                      clientId={selectedRequest.clientId}
                      clientName={selectedRequest.clientName}
                      requestId={selectedRequest.id}
                      className="w-full"
                    />
                    
                    {selectedRequest.status === 'pending' && (
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          setIsDetailDialogOpen(false);
                          setIsQuoteDialogOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar cotización
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear cotización */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Crear cotización</DialogTitle>
                <DialogDescription>
                  Estás creando una cotización para: <strong>{selectedRequest.title}</strong>
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm">Descripción de la cotización</h4>
                  <Textarea
                    placeholder="Describe los detalles de tu cotización..."
                    className="resize-none"
                    rows={6}
                    value={quoteResponse.description}
                    onChange={(e) => setQuoteResponse({
                      ...quoteResponse,
                      description: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-sm">Detalles generales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Tiempo de entrega estimado
                      </label>
                      <Input
                        placeholder="Ej: 5 días hábiles, 2 semanas..."
                        value={quoteResponse.deliveryTime}
                        onChange={(e) => setQuoteResponse({
                          ...quoteResponse,
                          deliveryTime: e.target.value
                        })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Precio total (€)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={quoteResponse.price}
                        onChange={(e) => setQuoteResponse({
                          ...quoteResponse,
                          price: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-3">Artículos de la cotización</h4>
                
                <div className="border rounded-md p-6 mb-4 space-y-4 bg-gray-50">
                  <h5 className="text-sm font-medium mb-2">Agregar nuevo ítem</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Nombre del ítem"
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Cantidad"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({
                          ...newItem, 
                          quantity: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Precio (€)"
                        value={newItem.price}
                        onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Input
                      placeholder="Descripción (opcional)"
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={addItemToQuote}
                    className="w-full"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Agregar ítem
                  </Button>
                </div>
                
                {quoteResponse.items && quoteResponse.items.length > 0 ? (
                  <div className="border rounded-md overflow-hidden bg-white">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Descripción</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {quoteResponse.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{item.description || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatPrice(item.price)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatPrice(item.price * item.quantity)}</td>
                            <td className="px-4 py-3 text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                onClick={() => removeItem(index)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-sm font-medium text-right">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold">
                            {formatPrice(quoteResponse.price)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="border rounded-md p-6 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No has agregado ítems a la cotización</p>
                    <p className="text-sm">Puedes agregar ítems específicos o establecer sólo un precio total</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={sendQuote}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar cotización
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PendingQuotes;
