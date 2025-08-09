
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { Wallet, CreditCard, DollarSign, TrendingUp, History, Plus, Minus, ArrowUpRight, ArrowDownLeft, Store, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { Transaction } from '@/lib/models';
import { useNavigate } from 'react-router-dom';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  name: string;
  details: string;
  icon: string;
}

const Balance = () => {
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Estados dinámicos para los balances
  const [currentBalance, setCurrentBalance] = useState(15750);
  const [pendingAmount, setPendingAmount] = useState(2500);
  const [totalSpent, setTotalSpent] = useState(125000);
  
  // Estadísticas adicionales
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalCompanies: 0,
    totalSavings: 0,
    recentActivity: ''
  });

  const paymentMethods: PaymentMethod[] = [
    {
      id: '1',
      type: 'card',
      name: 'Tarjeta de Crédito',
      details: '**** **** **** 1234',
      icon: '💳'
    },
    {
      id: '2',
      type: 'card',
      name: 'Tarjeta de Débito',
      details: '**** **** **** 5678',
      icon: '💳'
    },
    {
      id: '3',
      type: 'bank',
      name: 'Transferencia Bancaria',
      details: 'Banco Nación - Cuenta 12345678',
      icon: '🏦'
    },
    {
      id: '4',
      type: 'wallet',
      name: 'MercadoPago',
      details: 'usuario@email.com',
      icon: '💰'
    },
    {
      id: '5',
      type: 'wallet',
      name: 'Ualá',
      details: '+54 11 1234-5678',
      icon: '📱'
    }
  ];

  // Cargar las cotizaciones aceptadas
  useEffect(() => {
    const loadTransactionHistory = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          console.log("Usuario no autenticado");
          setIsLoading(false);
          return;
        }
        
        // Array para almacenar todas las transacciones
        const allTransactions: Transaction[] = [];
        
        // 1. BUSCAR SOLICITUDES GUARDADAS (Nueva implementación con el formato mejorado)
        const requestsQuery = query(
          collection(db, "solicitud"),
          where("userId", "==", user.uid)
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        console.log(`[Balance] Encontradas ${requestsSnapshot.docs.length} solicitudes del usuario`);
        
        for (const requestSnap of requestsSnapshot.docs) {
          const requestData = requestSnap.data();
          // Verificar si la solicitud tiene totalAmount o calcular desde autoQuotes
          let totalAmount = requestData.totalAmount || 0;
          // Si no hay totalAmount pero hay autoQuotes, calcular el total
          if (!totalAmount && requestData.autoQuotes && Array.isArray(requestData.autoQuotes)) {
            totalAmount = requestData.autoQuotes
              .filter(quote => quote.bestPrice && !isNaN(quote.bestPrice) && !quote.notFound)
              .reduce((total, quote) => total + Number(quote.bestPrice) * (quote.quantity || 1), 0);
          }
          if (totalAmount > 0) {
            // Obtener detalles de empresas para mostrar información más rica
            const companyDetails = [];
            if (requestData.selectedCompanies && Array.isArray(requestData.selectedCompanies)) {
              requestData.selectedCompanies.forEach(company => {
                companyDetails.push({
                  name: company.companyName || "Empresa",
                  id: company.id || company.companyId,
                  logo: company.companyLogo || null
                });
              });
            }
            // Crear objeto de transacción con datos enriquecidos
            const transaction: Transaction = {
              id: requestSnap.id,
              type: 'request',
              amount: -Math.abs(totalAmount),
              description: `Solicitud de ${requestData.items?.length || 0} productos`,
              date: requestData.acceptedAt || requestData.createdAt 
                ? new Date(requestData.acceptedAt || requestData.createdAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              status: requestData.status || 'activo',
              requestName: requestData.title || 'Solicitud sin título',
              requestId: requestSnap.id,
              items: requestData.items || [],
              companies: companyDetails,
              savings: requestData.savings || 0,
              statusLabel: getStatusLabel(requestData.status)
            };
            allTransactions.push(transaction);
          }
        }
        
        // 2. BUSCAR COTIZACIONES TRADICIONALES
        const quotesQuery = query(
          collection(db, "cotizaciones"),
          where("status", "in", ["recibida", "accepted", "confirmado"])
        );
        
        const quotesSnapshot = await getDocs(quotesQuery);
        console.log(`[Balance] Encontradas ${quotesSnapshot.docs.length} cotizaciones en estado recibida/accepted/confirmado`);
        
        for (const quoteSnap of quotesSnapshot.docs) {
          const quoteData = quoteSnap.data();
          // Verificar si la cotización pertenece al usuario actual
          const belongsToUser = 
            (quoteData.userId && quoteData.userId === user.uid) || 
            (quoteData.clientId && quoteData.clientId === user.uid) ||
            (quoteData.buyerId && quoteData.buyerId === user.uid);
          if (belongsToUser && quoteData.totalAmount) {
            // Buscar información de la solicitud si está disponible
            let requestData = null;
            if (quoteData.requestId) {
              try {
                const requestDoc = await getDoc(doc(db, "solicitud", quoteData.requestId));
                if (requestDoc.exists()) {
                  requestData = requestDoc.data();
                }
              } catch (error) {
                console.error(`[Balance] Error al obtener solicitud ${quoteData.requestId}:`, error);
              }
            }
            // Crear objeto de transacción
            allTransactions.push({
              id: quoteSnap.id,
              type: 'quote',
              amount: -Math.abs(quoteData.totalAmount),
              description: quoteData.description || `Cotización ${quoteData.companyName ? 'de ' + quoteData.companyName : ''}`,
              date: quoteData.createdAt 
                ? typeof quoteData.createdAt === 'string'
                  ? new Date(quoteData.createdAt).toISOString().split('T')[0]
                  : new Date(quoteData.createdAt.seconds * 1000).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
              status: quoteData.status,
              requestName: requestData?.title || 'Cotización',
              requestId: quoteData.requestId || '',
              companyName: quoteData.companyName || '',
              companyLogo: quoteData.companyLogo || null,
              statusLabel: getStatusLabel(quoteData.status)
            });
          }
        }
        
        // Ordenar todas las transacciones por fecha más reciente
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Actualizar el estado
        setTransactions(allTransactions);
        
        // Calcular saldos actualizados basados en transacciones
        calculateBalances(allTransactions);
        
      } catch (error) {
        console.error("Error al cargar historial de transacciones:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Función auxiliar para obtener etiquetas descriptivas de estado
    const getStatusLabel = (status: string): string => {
      switch (status?.toLowerCase()) {
        case 'cotizando':
          return 'En cotización';
        case 'recibida':
          return 'Cotización recibida';
        case 'accepted':
          return 'Aceptada';
        case 'confirmado':
          return 'Confirmada';
        case 'completado':
        case 'completed':
          return 'Completada';
        case 'cancelado':
          return 'Cancelada';
        default:
          return 'Activa';
      }
    };
    
    // Función para calcular saldos actualizados
    const calculateBalances = (transactions: Transaction[]) => {
      let spent = 0;
      let pending = 0;
      let totalSavings = 0;
      let totalRequests = 0;
      
      // Set para almacenar compañías únicas
      const uniqueCompanies = new Set<string>();
      
      // Fecha más reciente para la última actividad
      let mostRecentDate = new Date(0); // Fecha antigua como punto de partida
      let recentActivity = '';
      
      transactions.forEach(tx => {
        // Contar solicitudes únicas
        if (tx.requestId) {
          totalRequests++;
        }
        
        // Contar empresas únicas
        if (tx.companies && Array.isArray(tx.companies)) {
          tx.companies.forEach(company => {
            if (company.id) uniqueCompanies.add(company.id);
          });
        }
        
        // Sumar ahorros
        if (tx.savings && tx.savings > 0) {
          totalSavings += tx.savings;
        }
        
        // Actualizar última actividad
        const txDate = new Date(tx.date);
        if (txDate > mostRecentDate) {
          mostRecentDate = txDate;
          recentActivity = tx.requestName || tx.description;
        }
        
        // Solo contar transacciones con monto negativo (gastos)
        if (tx.amount < 0) {
          if (['completed', 'confirmado', 'completado'].includes(tx.status?.toLowerCase())) {
            spent += Math.abs(tx.amount);
          } else if (['cotizando', 'recibida', 'accepted', 'pending'].includes(tx.status?.toLowerCase())) {
            pending += Math.abs(tx.amount);
          }
        }
      });
      
      // Actualizar estados
      setTotalSpent(spent);
      setPendingAmount(pending);
      
      // Actualizar estadísticas adicionales
      setStats({
        totalRequests,
        totalCompanies: uniqueCompanies.size,
        totalSavings,
        recentActivity: recentActivity ? 
          (recentActivity.length > 20 ? recentActivity.substring(0, 20) + '...' : recentActivity) 
          : 'Sin actividad reciente'
      });
    };
    
    loadTransactionHistory();
  }, []);

  const quickAmounts = [5000, 10000, 20000, 50000];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'payment': return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'withdrawal': return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'quote': return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      default: return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
        return 'text-green-600';
      case 'payment':
      case 'withdrawal':
      case 'quote':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const processRecharge = () => {
    const amount = parseFloat(rechargeAmount);
    
    if (!amount || amount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingresa un monto válido",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Método de pago requerido",
        description: "Selecciona un método de pago",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Recarga procesada",
      description: `Se ha iniciado la recarga de $${amount.toLocaleString()}`,
    });

    setRechargeAmount('');
    setSelectedPaymentMethod('');
  };

  const addPaymentMethod = () => {
    toast({
      title: "Agregar método de pago",
      description: "Redirigiendo a la configuración de pagos...",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Saldo</h1>
            <p className="text-gray-600">Gestiona tu saldo y métodos de pago</p>
          </div>

          {/* Resumen de saldo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Saldo Disponible</p>
                    <p className="text-3xl font-bold">${currentBalance.toLocaleString()}</p>
                  </div>
                  <Wallet className="w-8 h-8 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Pendiente</p>
                    <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Gastado</p>
                    <p className="text-2xl font-bold text-gray-700">${totalSpent.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-gray-700" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Estadísticas avanzadas */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Estadísticas de Compras</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalCompanies}</p>
                    <p className="text-xs text-gray-600">Empresas</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">${stats.totalSavings.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Ahorrado</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                      <Info className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalRequests}</p>
                    <p className="text-xs text-gray-600">Solicitudes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                      <History className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-800">{stats.recentActivity || "Sin actividad"}</p>
                    <p className="text-xs text-gray-600">Última actividad</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="recharge" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recharge">Recargar Saldo</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            {/* Recarga de saldo */}
            <TabsContent value="recharge" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Recargar Saldo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Montos rápidos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Montos Rápidos
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {quickAmounts.map(amount => (
                        <Button
                          key={amount}
                          variant="outline"
                          onClick={() => setRechargeAmount(amount.toString())}
                          className="h-12"
                        >
                          ${amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Monto personalizado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto Personalizado
                    </label>
                    <Input
                      type="number"
                      placeholder="Ingresa el monto"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="text-lg"
                    />
                  </div>

                  {/* Métodos de pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Método de Pago
                    </label>
                    <div className="space-y-2">
                      {paymentMethods.map(method => (
                        <div
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedPaymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{method.icon}</span>
                            <div className="flex-1">
                              <h3 className="font-medium">{method.name}</h3>
                              <p className="text-sm text-gray-600">{method.details}</p>
                            </div>
                            {selectedPaymentMethod === method.id && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={addPaymentMethod}
                        className="w-full p-4 h-auto border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Método de Pago
                      </Button>
                    </div>
                  </div>

                  {/* Botón de recarga */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium">Total a recargar:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ${rechargeAmount ? parseFloat(rechargeAmount).toLocaleString() : '0'}
                      </span>
                    </div>
                    <Button
                      onClick={processRecharge}
                      className="w-full text-lg py-6"
                      disabled={!rechargeAmount || !selectedPaymentMethod}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Recargar Saldo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historial de transacciones */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5" />
                    <span>Historial de Solicitudes y Cotizaciones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Cargando historial...</span>
                    </div>
                  ) : transactions.length > 0 ? (
                    <div className="divide-y border-t border-b">
                      {transactions
                        .filter(transaction => (transaction.type === 'quote' || transaction.type === 'request') && transaction.amount < 0)
                        .map(transaction => (
                          <div
                            key={transaction.id}
                            className="border-b py-3 px-2 hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {getTransactionIcon(transaction.type)}
                                <div className="ml-2">
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900">{transaction.requestName}</span>
                                    <span className="text-red-600 font-medium ml-2">-${Math.abs(transaction.amount).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <span>{new Date(transaction.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className="mx-1">•</span>
                                    <Badge className="text-xs" variant="outline">{transaction.statusLabel || 'Completado'}</Badge>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-xs"
                                onClick={() => navigate(`/requests?highlight=${transaction.requestId}`)}
                              >
                                Ver
                              </Button>
                            </div>
                            
                            {/* Companies in simple list format */}
                            {transaction.companies && transaction.companies.length > 0 && (
                              <div className="ml-6 mt-1 text-sm text-gray-700">
                                <span className="text-gray-500">Empresas: </span>
                                {transaction.companies.map((company, idx) => (
                                  <span key={idx} className="text-gray-700">
                                    {idx > 0 ? ', ' : ''}
                                    {company.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {/* Products count */}
                            {transaction.items && transaction.items.length > 0 && (
                              <div className="ml-6 text-sm text-gray-700">
                                <span className="text-gray-500">Productos: </span>
                                <span>{transaction.items.length}</span>
                              </div>
                            )}
                            
                            {/* Savings if available */}
                            {transaction.savings > 0 && (
                              <div className="ml-6 text-sm text-green-600">
                                Ahorro: ${transaction.savings.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay transacciones</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Cuando realices solicitudes o aceptes cotizaciones, aparecerán aquí con sus detalles y montos.
                      </p>
                      <Button 
                        className="mt-4" 
                        variant="outline"
                        onClick={() => navigate('/requests/new')}
                      >
                        Crear nueva solicitud
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Balance;
