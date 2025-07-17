
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { Wallet, CreditCard, DollarSign, TrendingUp, History, Plus, Minus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

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

  const currentBalance = 15750;
  const pendingAmount = 2500;
  const totalSpent = 125000;

  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'deposit',
      amount: 20000,
      description: 'Recarga con tarjeta terminada en 1234',
      date: '2024-01-15',
      status: 'completed'
    },
    {
      id: '2',
      type: 'payment',
      amount: -12500,
      description: 'Pago a Ferretería Central - Pedido ORD-001',
      date: '2024-01-14',
      status: 'completed'
    },
    {
      id: '3',
      type: 'refund',
      amount: 3200,
      description: 'Reembolso por cancelación - Pedido ORD-003',
      date: '2024-01-13',
      status: 'completed'
    },
    {
      id: '4',
      type: 'payment',
      amount: -8500,
      description: 'Pago a ToolMaster Pro - Pedido ORD-002',
      date: '2024-01-12',
      status: 'completed'
    },
    {
      id: '5',
      type: 'deposit',
      amount: 15000,
      description: 'Recarga con transferencia bancaria',
      date: '2024-01-10',
      status: 'pending'
    }
  ];

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

  const quickAmounts = [5000, 10000, 20000, 50000];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'payment': return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'withdrawal': return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'refund': return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
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
                    <span>Historial de Transacciones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.map(transaction => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div>
                            <h3 className="font-medium">{transaction.description}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(transaction.date).toLocaleDateString('es-AR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status === 'completed' && 'Completado'}
                            {transaction.status === 'pending' && 'Pendiente'}
                            {transaction.status === 'failed' && 'Fallido'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
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
