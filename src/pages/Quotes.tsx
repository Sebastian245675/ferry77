import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { MessageSquare, Star, Clock, DollarSign, CheckCircle, XCircle, Eye, Award, Package, Truck } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const Quotes = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('received'); // Por defecto muestra las recibidas
  const [quotes, setQuotes] = useState<any[]>([]);

  // Si tienes el id de la solicitud en la URL:
  // import { useLocation } from "react-router-dom";
  // const location = useLocation();
  // const queryParams = new URLSearchParams(location.search);
  // const solicitudId = queryParams.get("id");

  useEffect(() => {
    const q = query(collection(db, "cotizaciones"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setQuotes(data);
    });
    return () => unsubscribe();
  }, []);

  const tabs = [
    { id: 'received', name: 'Recibidas', count: quotes.filter(q => q.status === 'recibida').length },
    { id: 'pending', name: 'Pendientes', count: quotes.filter(q => q.status === 'pending').length },
    { id: 'accepted', name: 'Aceptadas', count: quotes.filter(q => q.status === 'accepted' || q.status === 'confirmado').length },
    { id: 'declined', name: 'Rechazadas', count: quotes.filter(q => q.status === 'declined').length },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'recibida': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'recibida': return <Package className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'confirmado': return <CheckCircle className="w-4 h-4" />;
      case 'declined': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    switch (activeTab) {
      case 'received': return quote.status === 'recibida';
      case 'pending': return quote.status === 'pending';
      case 'accepted': return quote.status === 'accepted' || quote.status === 'confirmado';
      case 'declined': return quote.status === 'declined';
      default: return quote.status === 'recibida'; // Por defecto muestra las recibidas
    }
  });

  const handleAcceptQuote = async (quoteId: string, requestId: string) => {
    try {
      // 1. Traer todas las cotizaciones de la misma solicitud
      const q = query(collection(db, "cotizaciones"), where("requestId", "==", requestId));
      const snapshot = await getDocs(q);

      // 2. Actualizar cada cotización: la aceptada a "recibida", las demás a "declined"
      const batchUpdates = [];
      snapshot.forEach(docSnap => {
        if (docSnap.id === quoteId) {
          batchUpdates.push(updateDoc(doc(db, "cotizaciones", docSnap.id), { status: "recibida" }));
        } else {
          batchUpdates.push(updateDoc(doc(db, "cotizaciones", docSnap.id), { status: "declined" }));
        }
      });
      await Promise.all(batchUpdates);

      // 3. Marcar la solicitud como confirmada
      await updateDoc(doc(db, "solicitud", requestId), { status: "confirmado" });

      // 4. Actualizar el estado local para reflejar los cambios en la UI
      setQuotes(prev =>
        prev.map(q =>
          q.requestId === requestId
            ? q.id === quoteId
              ? { ...q, status: "recibida" }
              : { ...q, status: "declined" }
            : q
        )
      );

      // 5. Refrescar desde Firestore para asegurar datos actualizados
      const q2 = query(collection(db, "cotizaciones"));
      const snapshot2 = await getDocs(q2);
      const data: any[] = [];
      snapshot2.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setQuotes(data);

    } catch (error) {
      console.error(error);
    }
  };

  const handleDeclineQuote = (quoteId: string) => {
    console.log('Decline quote:', quoteId);
  };

  const handleViewDetails = (quoteId: string) => {
    console.log('View quote details:', quoteId);
  };

  const newQuotesCount = quotes.filter(q => q.status === 'recibida').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
                <p className="text-gray-600">Revisa y compara las ofertas de las empresas</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-primary-50 rounded-lg p-4">
                  <MessageSquare className="w-6 h-6 text-primary-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Recibidas</p>
                  <p className="text-xl font-bold text-primary-600">{newQuotesCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </div>

          {/* Quotes List */}
          <div className="space-y-6">
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                {/* Quote Header */}
                <div className="p-6 bg-gray-50 border-b">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={quote.company.logo} 
                        alt={quote.company.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{quote.company.name}</h3>
                          {quote.company.verified && (
                            <Award className="w-5 h-5 text-primary-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-700">{quote.company.rating}</span>
                        </div>
                        <p className="text-sm text-gray-600">Para: {quote.requestTitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(quote.status)}`}>
                        {getStatusIcon(quote.status)}
                        <span className="capitalize">
                          {quote.status === 'pending' ? 'Pendiente' : 
                           quote.status === 'recibida' ? 'Recibida' : 
                           quote.status === 'accepted' ? 'Aceptada' : 
                           'Rechazada'}
                        </span>
                      </span>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">${quote.totalAmount.toLocaleString()}</p>
                        <p className="text-sm text-green-600">Ahorro: ${quote.savings.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Details */}
                <div className="p-6">
                  {/* Key Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Tiempo de entrega</p>
                        <p className="font-medium">{quote.deliveryTime}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Presupuesto original</p>
                        <p className="font-medium">${quote.originalBudget.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-xs font-bold">%</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Descuento</p>
                        <p className="font-medium text-green-600">{Math.round((quote.savings / quote.originalBudget) * 100)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Artículos cotizados</h4>
                    <div className="space-y-2">
                      {quote.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.specifications}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(item.quantity * item.unitPrice).toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{item.quantity}x ${item.unitPrice.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                      {quote.items.length > 3 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          +{quote.items.length - 3} artículos más
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {quote.notes && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Notas del proveedor</h4>
                      <p className="text-sm text-gray-600">{quote.notes}</p>
                    </div>
                  )}

                  {/* Payment Options */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Opciones de pago</h4>
                    <div className="flex flex-wrap gap-2">
                      {quote.paymentOptions.map((option, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => 
                        (quote.status === 'recibida' || quote.status === 'accepted' || quote.status === 'confirmado') 
                          ? navigate(`/order-status?id=${quote.id}`)
                          : handleViewDetails(quote.id)
                      }
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Eye size={16} />
                      <span>{(quote.status === 'recibida' || quote.status === 'accepted' || quote.status === 'confirmado') ? 'Ver Seguimiento' : 'Ver Detalles'}</span>
                    </button>
                    
                    {quote.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDeclineQuote(quote.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <XCircle size={16} />
                          <span>Rechazar</span>
                        </button>
                        
                        <button
                          onClick={() => handleAcceptQuote(quote.id, quote.requestId)}
                          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle size={16} />
                          <span>Aceptar Cotización</span>
                        </button>
                      </>
                    )}

                    {(quote.status === 'recibida' || quote.status === 'accepted' || quote.status === 'confirmado') && quote.deliveryStatus && (
                      <div className="flex-1 p-3 rounded-lg bg-gray-50">
                        <p className="text-sm font-medium mb-1">Estado del pedido:</p>
                        <div className="flex items-center">
                          <div className={`h-2 flex-1 ${
                            quote.deliveryStatus === 'pendiente' ? 'bg-yellow-400' :
                            quote.deliveryStatus === 'enviado' ? 'bg-blue-400' :
                            quote.deliveryStatus === 'en_camino' ? 'bg-purple-400' :
                            quote.deliveryStatus === 'entregado' ? 'bg-green-400' : 'bg-gray-200'
                          } rounded-full`}></div>
                          <div className="ml-3 flex items-center">
                            {quote.deliveryStatus === 'pendiente' && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded-full flex items-center">
                                <Clock className="w-3 h-3 mr-1" /> Pendiente
                              </span>
                            )}
                            {quote.deliveryStatus === 'enviado' && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded-full flex items-center">
                                <Package className="w-3 h-3 mr-1" /> Enviado
                              </span>
                            )}
                            {quote.deliveryStatus === 'en_camino' && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full flex items-center">
                                <Truck className="w-3 h-3 mr-1" /> En camino
                              </span>
                            )}
                            {quote.deliveryStatus === 'entregado' && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" /> Entregado
                              </span>
                            )}
                          </div>
                        </div>
                        {quote.statusNote && (
                          <p className="text-xs text-gray-600 mt-2">{quote.statusNote}</p>
                        )}
                        {quote.statusUpdatedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Actualizado: {new Date(quote.statusUpdatedAt.seconds * 1000).toLocaleDateString()} 
                            {' a las '}{new Date(quote.statusUpdatedAt.seconds * 1000).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info de Empresa y Pedido Unificados - Solo para recibidas/aceptadas */}
                  {(quote.status === 'recibida' || quote.status === 'accepted' || quote.status === 'confirmado') && (
                    <div className="mt-4 pt-4 border-t border-blue-100 bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" /> 
                        Pedido recibido por {quote.company.name}
                      </h4>
                      <div className="flex items-center space-x-3 mb-2">
                        <img 
                          src={quote.company.logo} 
                          alt={quote.company.name}
                          className="w-8 h-8 rounded-full object-cover border border-blue-200"
                        />
                        <div>
                          <p className="font-medium text-blue-900">{quote.requestTitle}</p>
                          <p className="text-xs text-blue-700">
                            Recibido el: {new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600">
                        Tu pedido está siendo procesado. El proveedor te contactará pronto.
                      </p>
                    </div>
                  )}

                  {/* Expiry */}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Válida hasta: {new Date(quote.validUntil).toLocaleDateString()} a las {new Date(quote.validUntil).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredQuotes.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cotizaciones</h3>
              <p className="text-gray-600">
                {activeTab === 'received' ? 'No tienes cotizaciones recibidas' :
                 activeTab === 'pending' ? 'No tienes cotizaciones pendientes' : 
                 activeTab === 'accepted' ? 'No has aceptado ninguna cotización' : 
                 'No has rechazado ninguna cotización'}
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Quotes;
