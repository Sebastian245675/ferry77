import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, CalendarIcon, ArrowUpRight, ArrowDownRight, Filter, Download, CreditCard, Building,
  Trophy, TrendingUp, LineChart, BarChart4, Crown, Zap, Star, Rocket, CheckCircle, LucideIcon, ChevronRight,
  Clock, ArrowUp, X, Users, Package
} from "lucide-react";
import DashboardLayout from "@/components/barraempresa";

const Pagos = () => {
  // Estado para almacenar los planes de suscripción
  const [planActual, setPlanActual] = useState("basico");
  const [ventasMensuales, setVentasMensuales] = useState(427500);
  const [limiteVentas, setLimiteVentas] = useState(500000);
  const [diasRestantes, setDiasRestantes] = useState(12);
  // Estado para controlar la visibilidad de los detalles de suscripción
  const [mostrarDetallesSuscripcion, setMostrarDetallesSuscripcion] = useState(false);
  
  // Planes disponibles
  const planes = [
    {
      id: "basico",
      nombre: "Plan Básico",
      precio: 9990,
      limite: 500000,
      color: "from-blue-500 to-blue-600",
      icono: Star as LucideIcon,
      caracteristicas: ["Límite de ventas: $500.000", "Comisión: 10%", "Soporte básico"]
    },
    {
      id: "premium",
      nombre: "Plan Premium",
      precio: 19990,
      limite: 2000000,
      color: "from-purple-500 to-purple-700",
      icono: Crown as LucideIcon,
      caracteristicas: ["Límite de ventas: $2.000.000", "Comisión: 7%", "Soporte prioritario", "Reportes avanzados"]
    },
    {
      id: "enterprise",
      nombre: "Plan Enterprise",
      precio: 39990,
      limite: 5000000,
      color: "from-green-500 to-green-700",
      icono: Rocket as LucideIcon,
      caracteristicas: ["Ventas ilimitadas", "Comisión: 5%", "Soporte 24/7", "API personalizada", "Dashboard exclusivo"]
    }
  ];

  // Datos de análisis de ventas por mes
  const [datosVentas, setDatosVentas] = useState([
    { mes: "Ene", ventas: 180000 },
    { mes: "Feb", ventas: 210000 },
    { mes: "Mar", ventas: 310000 },
    { mes: "Abr", ventas: 280000 },
    { mes: "May", ventas: 350000 },
    { mes: "Jun", ventas: 390000 },
    { mes: "Jul", ventas: 427500 }
  ]);

  // Estado para almacenar los pagos
  const [pagos, setPagos] = useState([
    {
      id: "pago-1",
      fecha: "2025-07-15",
      monto: 125000,
      estado: "completado",
      cliente: "Juan Pérez",
      metodo: "Transferencia",
      pedidoId: "order-123",
      comision: 12500
    },
    {
      id: "pago-2",
      fecha: "2025-07-18",
      monto: 87500,
      estado: "completado",
      cliente: "María López",
      metodo: "Tarjeta",
      pedidoId: "order-124",
      comision: 8750
    },
    {
      id: "pago-3",
      fecha: "2025-07-20",
      monto: 65000,
      estado: "pendiente",
      cliente: "Pedro Ramírez",
      metodo: "Efectivo",
      pedidoId: "order-125",
      comision: 6500
    },
    {
      id: "pago-4",
      fecha: "2025-07-25",
      monto: 150000,
      estado: "pendiente",
      cliente: "Ana Martínez",
      metodo: "Transferencia",
      pedidoId: "order-126",
      comision: 15000
    }
  ]);
  
  // Calcular estadísticas
  const totalRecibido = pagos
    .filter(pago => pago.estado === "completado")
    .reduce((total, pago) => total + pago.monto, 0);
    
  const totalPendiente = pagos
    .filter(pago => pago.estado === "pendiente")
    .reduce((total, pago) => total + pago.monto, 0);
    
  const totalComisiones = pagos
    .filter(pago => pago.estado === "completado")
    .reduce((total, pago) => total + pago.comision, 0);
  
  // Formatear montos a pesos chilenos
  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto px-2 py-2 sm:px-4 sm:py-4 bg-gradient-to-b from-blue-50 to-white min-h-screen pb-20 md:pb-4">
        {/* Encabezado mejorado */}
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-green-800 via-green-700 to-green-600 shadow-lg overflow-hidden relative">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
          </div>
          
          <div className="relative flex flex-col text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Centro Financiero</h1>
              <div className="flex items-center gap-3 mt-2 sm:mt-0">
                <Badge className="bg-amber-500/90 hover:bg-amber-600 text-white border-none">
                  <Star className="h-3 w-3 mr-1 text-yellow-100" />
                  Plan Básico
                </Badge>
                <Button 
                  size="sm" 
                  className="bg-white/20 hover:bg-white/30 text-white border-none text-xs h-8"
                >
                  <Crown className="h-3 w-3 mr-1 text-yellow-200" />
                  Mejorar Plan
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between">
              <p className="text-sm sm:text-base text-green-100 mb-4">Gestiona tus ingresos, suscripciones y pagos</p>
              <p className="text-xs text-white/80 mb-4 flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {diasRestantes} días restantes en tu ciclo • {formatMonto(ventasMensuales)}/{formatMonto(limiteVentas)}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              <Card className="bg-white/10 border-none shadow-md">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-100">Total Recibido</p>
                      <p className="text-lg sm:text-xl font-bold">{formatMonto(totalRecibido)}</p>
                    </div>
                    <div className="p-2 rounded-full bg-green-600">
                      <ArrowDownRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 border-none shadow-md">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-100">Pagos Pendientes</p>
                      <p className="text-lg sm:text-xl font-bold">{formatMonto(totalPendiente)}</p>
                    </div>
                    <div className="p-2 rounded-full bg-amber-500">
                      <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 border-none shadow-md">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-100">Comisiones</p>
                      <p className="text-lg sm:text-xl font-bold">{formatMonto(totalComisiones)}</p>
                    </div>
                    <div className="p-2 rounded-full bg-red-500">
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Historial de Pagos */}
        <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-white mt-4">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-green-900">Historial de Pagos</CardTitle>
                <CardDescription className="text-green-600 text-xs">
                  Registro de todos los pagos recibidos y pendientes
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-green-200 text-green-700 hover:bg-green-50 text-xs h-8"
                >
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Filtrar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-green-200 text-green-700 hover:bg-green-50 text-xs h-8"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs defaultValue="todos" className="w-full">
              <div className="px-4 pt-3">
                <TabsList className="grid w-full grid-cols-3 bg-green-50">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="completados">Completados</TabsTrigger>
                  <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="todos" className="mt-0">
                <div className="divide-y divide-gray-100">
                  {pagos.map((pago) => (
                    <div key={pago.id} className="p-4 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            pago.estado === "completado" ? "bg-green-100" : "bg-amber-100"
                          }`}>
                            {pago.estado === "completado" ? (
                              <DollarSign className="h-5 w-5 text-green-600" />
                            ) : (
                              <CalendarIcon className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">Pago de pedido #{pago.pedidoId.split('-')[1]}</h3>
                              <Badge className={`text-xs ${
                                pago.estado === "completado" 
                                  ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              }`}>
                                {pago.estado === "completado" ? "Completado" : "Pendiente"}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Cliente: {pago.cliente} • Método: {pago.metodo}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-col sm:items-end">
                          <p className="font-semibold text-green-700">
                            {formatMonto(pago.monto)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(pago.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="completados" className="mt-0">
                <div className="divide-y divide-gray-100">
                  {pagos.filter(pago => pago.estado === "completado").map((pago) => (
                    <div key={pago.id} className="p-4 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">Pago de pedido #{pago.pedidoId.split('-')[1]}</h3>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                                Completado
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Cliente: {pago.cliente} • Método: {pago.metodo}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-col sm:items-end">
                          <p className="font-semibold text-green-700">
                            {formatMonto(pago.monto)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(pago.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="pendientes" className="mt-0">
                <div className="divide-y divide-gray-100">
                  {pagos.filter(pago => pago.estado === "pendiente").map((pago) => (
                    <div key={pago.id} className="p-4 hover:bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-amber-100">
                            <CalendarIcon className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">Pago de pedido #{pago.pedidoId.split('-')[1]}</h3>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                                Pendiente
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Cliente: {pago.cliente} • Método: {pago.metodo}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex flex-col sm:items-end">
                          <p className="font-semibold text-green-700">
                            {formatMonto(pago.monto)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(pago.fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Sección de acceso a Suscripción */}
        <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 mt-4">
          <CardContent className="p-0">
            <div className="p-5 relative overflow-hidden">
              {/* Elementos decorativos de fondo */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600 rounded-full"></div>
                <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-indigo-600 rounded-full"></div>
              </div>
              
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Crown className="h-6 w-6 text-amber-500 mr-2" />
                    <h3 className="text-lg font-bold text-purple-900">Plan de Suscripción</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Badge className="bg-purple-100 text-purple-700 mr-2">Plan Básico</Badge>
                      <p className="text-sm text-gray-600">
                        {diasRestantes} días restantes
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        <p className="text-sm text-gray-700">Límite mensual: <span className="font-medium">{formatMonto(limiteVentas)}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <p className="text-sm text-gray-700">Ventas actuales: <span className="font-medium">{formatMonto(ventasMensuales)}</span></p>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-purple-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (ventasMensuales / limiteVentas) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((ventasMensuales / limiteVentas) * 100)}% del límite utilizado
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md flex items-center gap-2"
                    onClick={() => setMostrarDetallesSuscripcion(true)}
                  >
                    <Zap className="h-4 w-4" />
                    Ver Suscripción
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Próximo cobro: 12 de Agosto, 2025
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal o diálogo para mostrar detalles de suscripción - Versión móvil avanzada */}
        {mostrarDetallesSuscripcion && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col">
              {/* Cabecera fija */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-700 to-indigo-800 p-4 text-white flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-white/20 rounded-full p-2 mr-3">
                    <Crown className="h-6 w-6 text-yellow-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Centro Premium</h2>
                    <p className="text-xs text-purple-200">Gestión avanzada de suscripciones</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/20 p-2 h-auto rounded-full"
                  onClick={() => setMostrarDetallesSuscripcion(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Contenido con scroll */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
                {/* Banner de estado actual y tiempo de membresía */}
                <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white p-5 relative">
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                    <div className="absolute top-10 right-10 w-40 h-40 bg-white rounded-full"></div>
                    <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white rounded-full"></div>
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="mr-3 bg-white/20 p-2 rounded-full">
                          <Star className="h-5 w-5 text-yellow-300" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">Plan Básico</h3>
                          <p className="text-xs text-purple-200">Activo desde: 1 de Julio, 2025</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-purple-700 text-xs">
                        {diasRestantes} días restantes
                      </Badge>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center text-sm mb-1">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1 text-green-300" />
                          <span>Límite de ventas mensual</span>
                        </div>
                        <span className="font-medium">{formatMonto(ventasMensuales)} / {formatMonto(limiteVentas)}</span>
                      </div>
                      <div className="relative">
                        <Progress value={(ventasMensuales / limiteVentas) * 100} className="h-2.5 bg-white/20 rounded-full" />
                        <div 
                          className="absolute left-0 top-0 h-2.5 bg-gradient-to-r from-green-400 to-green-300 rounded-full"
                          style={{width: `${Math.min(100, (ventasMensuales / limiteVentas) * 100)}%`}}
                        />
                      </div>
                      <p className="text-xs mt-1 text-purple-200 flex justify-between">
                        <span>{Math.round((ventasMensuales / limiteVentas) * 100)}% utilizado</span>
                        <span>Próxima facturación: 12 de Agosto, 2025</span>
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-xs text-purple-200">Costo mensual</p>
                        <p className="text-lg font-semibold">${planes[0].precio.toLocaleString('es-CL')}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-xs text-purple-200">Comisión actual</p>
                        <p className="text-lg font-semibold">10%</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resumen financiero */}
                <div className="p-4">
                  <div className="bg-indigo-900 text-white rounded-xl overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-indigo-900 to-purple-900">
                      <h3 className="font-bold text-lg flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Resumen Financiero
                      </h3>
                      <p className="text-xs text-indigo-200 mt-1">Desde el inicio de tu membresía</p>
                    </div>
                    
                    <div className="grid grid-cols-2 bg-gradient-to-r from-indigo-800 to-indigo-900">
                      <div className="p-4 border-r border-indigo-700">
                        <p className="text-xs text-indigo-300 mb-1">Ventas Totales</p>
                        <p className="text-2xl font-bold">{formatMonto(2137500)}</p>
                        <div className="flex items-center mt-1 text-green-400 text-xs">
                          <ArrowUp className="h-3 w-3 mr-1" />
                          <span>+23.5% vs mes pasado</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-indigo-300 mb-1">Ganancias Netas</p>
                        <p className="text-2xl font-bold">{formatMonto(1923750)}</p>
                        <div className="flex items-center mt-1 text-green-400 text-xs">
                          <ArrowUp className="h-3 w-3 mr-1" />
                          <span>+21.2% vs mes pasado</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 text-center py-3 bg-gradient-to-r from-indigo-700/30 to-purple-700/30">
                      <div>
                        <p className="text-xs text-indigo-200">Transacciones</p>
                        <p className="font-bold text-lg">47</p>
                      </div>
                      <div className="border-l border-r border-indigo-700/50">
                        <p className="text-xs text-indigo-200">Clientes</p>
                        <p className="font-bold text-lg">23</p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-200">Comisiones</p>
                        <p className="font-bold text-lg">{formatMonto(213750)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Análisis de rendimiento con tabs */}
                <div className="p-4">
                  <Tabs defaultValue="ventas" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
                      <TabsTrigger value="ventas" className="text-xs">Ventas</TabsTrigger>
                      <TabsTrigger value="clientes" className="text-xs">Clientes</TabsTrigger>
                      <TabsTrigger value="productos" className="text-xs">Productos</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="ventas" className="mt-4">
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <LineChart className="h-4 w-4 mr-2 text-purple-600" />
                            Tendencia de ventas
                          </h4>
                          <Badge className="bg-purple-100 text-purple-700 text-xs">Últimos 7 meses</Badge>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatMonto(datosVentas.reduce((acc, dato) => acc + dato.ventas, 0))}
                              </p>
                              <p className="text-xs text-gray-500">Total acumulado 2025</p>
                            </div>
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              <span>+12.4% mensual</span>
                            </div>
                          </div>
                          
                          {/* Gráfico de barras interactivo */}
                          <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 mt-2 pt-4 border-t border-gray-100">
                            {datosVentas.map((dato, i) => (
                              <div key={i} className="flex flex-col items-center flex-1">
                                <div 
                                  className={`w-full max-w-[40px] bg-gradient-to-t ${
                                    i === datosVentas.length - 1 
                                      ? 'from-purple-500 to-purple-300' 
                                      : i % 2 === 0 ? 'from-blue-500 to-blue-300' : 'from-indigo-500 to-indigo-300'
                                  } rounded-t-md relative group`}
                                  style={{ 
                                    height: `${(dato.ventas / 500000) * 100}%`,
                                    minHeight: '15px'
                                  }}
                                >
                                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {formatMonto(dato.ventas)}
                                  </span>
                                </div>
                                <span className="text-xs mt-2 text-gray-600">{dato.mes}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Mejor mes</p>
                            <p className="font-semibold">Julio</p>
                          </div>
                          <div className="text-center border-l border-r border-gray-200 px-2">
                            <p className="text-xs text-gray-500">Promedio</p>
                            <p className="font-semibold">{formatMonto(Math.round(datosVentas.reduce((acc, dato) => acc + dato.ventas, 0) / datosVentas.length))}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Proyección</p>
                            <p className="font-semibold text-green-600">{formatMonto(450000)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Comparativa vs límite */}
                      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Ventas vs Capacidad</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>0</span>
                          <span>{formatMonto(limiteVentas)}</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full relative mb-3">
                          <div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                            style={{width: `${Math.min(100, (ventasMensuales / limiteVentas) * 100)}%`}}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-700">
                          Has utilizado <span className="font-semibold">{Math.round((ventasMensuales / limiteVentas) * 100)}%</span> de tu 
                          capacidad mensual. Al actualizar a un plan superior, podrías incrementar tus ingresos sin restricciones.
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="clientes" className="mt-4">
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Users className="h-4 w-4 mr-2 text-purple-600" />
                            Crecimiento de clientes
                          </h4>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">23</p>
                              <p className="text-xs text-gray-500">Clientes totales</p>
                            </div>
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              <span>+3 este mes</span>
                            </div>
                          </div>
                          
                          {/* Mini gráfico de clientes por mes */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Ene</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">5</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Feb</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '40%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">8</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Mar</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">9</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Abr</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '50%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">10</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">May</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '55%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">11</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Jun</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-blue-400 rounded-full" style={{ width: '70%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">14</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Jul</span>
                              <div className="w-full mx-2">
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div className="h-2 bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                              </div>
                              <span className="text-xs font-medium w-5">23</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Tasa de retención</p>
                            <p className="font-semibold">89%</p>
                          </div>
                          <div className="text-center border-l border-gray-200">
                            <p className="text-xs text-gray-500">Gasto promedio</p>
                            <p className="font-semibold">{formatMonto(92900)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Top clientes */}
                      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900">Clientes destacados</h4>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium mr-3">JD</div>
                              <div>
                                <p className="text-sm font-medium">Juan Díaz</p>
                                <p className="text-xs text-gray-500">5 compras</p>
                              </div>
                            </div>
                            <span className="font-semibold text-sm">{formatMonto(250000)}</span>
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium mr-3">ML</div>
                              <div>
                                <p className="text-sm font-medium">María López</p>
                                <p className="text-xs text-gray-500">4 compras</p>
                              </div>
                            </div>
                            <span className="font-semibold text-sm">{formatMonto(185000)}</span>
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium mr-3">PR</div>
                              <div>
                                <p className="text-sm font-medium">Pedro Ramírez</p>
                                <p className="text-xs text-gray-500">3 compras</p>
                              </div>
                            </div>
                            <span className="font-semibold text-sm">{formatMonto(157500)}</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="productos" className="mt-4">
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Package className="h-4 w-4 mr-2 text-purple-600" />
                            Rendimiento de productos
                          </h4>
                        </div>
                        
                        <div className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">12</p>
                              <p className="text-xs text-gray-500">Productos activos</p>
                            </div>
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              <span>72% de conversión</span>
                            </div>
                          </div>
                          
                          {/* Gráfico de anillos */}
                          <div className="mt-4 flex justify-center">
                            <div className="w-32 h-32 rounded-full bg-gray-100 relative flex items-center justify-center">
                              <svg width="100%" height="100%" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="10" 
                                  strokeDasharray="282.7" strokeDashoffset="79.16" 
                                  transform="rotate(-90 50 50)" 
                                />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="10" 
                                  strokeDasharray="282.7" strokeDashoffset="169.62" 
                                  transform="rotate(-0 50 50)" 
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-lg font-bold">100%</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="flex items-center">
                              <div className="h-3 w-3 bg-purple-500 rounded-full mr-2"></div>
                              <span className="text-xs">Servicios (72%)</span>
                            </div>
                            <div className="flex items-center">
                              <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                              <span className="text-xs">Productos (28%)</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                          <p className="text-xs text-gray-500">Producto más vendido</p>
                          <p className="font-semibold">Servicio de Transporte Premium</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                
                {/* Planes disponibles con nuevo diseño móvil */}
                <div className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-purple-600" />
                    Mejora tu plan
                  </h3>
                  
                  <div className="space-y-4">
                    {planes.filter(plan => plan.id !== "basico").map((plan) => {
                      const PlanIcon = plan.icono;
                      return (
                        <div 
                          key={plan.id} 
                          className="border rounded-xl bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-indigo-500" />
                          
                          <div className="p-4 pl-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <div className={`p-2 rounded-lg bg-gradient-to-r ${plan.color} text-white mr-3`}>
                                  <PlanIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{plan.nombre}</h4>
                                  <p className="text-sm text-purple-600 font-medium mt-0.5">
                                    {formatMonto(plan.precio)} <span className="text-gray-500 text-xs font-normal">/mes</span>
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-gray-500 mb-1.5">
                              <span>Límite de ventas</span>
                              <span className="font-medium text-gray-900">{formatMonto(plan.limite)}</span>
                            </div>
                            <Progress value={100} className="h-1 bg-gray-100 mb-3" />
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>Comisión {plan.id === "premium" ? "7%" : "5%"}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                <span>{plan.id === "premium" ? "Soporte prioritario" : "Soporte 24/7"}</span>
                              </div>
                            </div>
                            
                            <Button 
                              className={`w-full mt-3 bg-gradient-to-r ${plan.color} hover:opacity-90 text-white text-sm`}
                            >
                              Actualizar Plan
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Resumen de beneficios con diseño móvil */}
                  <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-purple-100 p-4">
                    <div className="flex items-center mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg mr-3">
                        <Trophy className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-purple-800">Beneficios premium</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-800 font-medium">Mayor límite de ventas</p>
                          <p className="text-xs text-gray-600">Hasta 10 veces más capacidad para tus transacciones mensuales</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-800 font-medium">Comisiones reducidas</p>
                          <p className="text-xs text-gray-600">Reduce hasta un 50% las comisiones por transacción</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-800 font-medium">Análisis avanzado</p>
                          <p className="text-xs text-gray-600">Panel de control con insights detallados sobre tus ventas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Botón de cierre fijo en la parte inferior para móvil */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:hidden">
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    onClick={() => setMostrarDetallesSuscripcion(false)}
                  >
                    Volver al Centro de Pagos
                  </Button>
                </div>
                
                {/* Botón para escritorio */}
                <div className="hidden sm:flex justify-end p-4">
                  <Button 
                    className="text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200"
                    onClick={() => setMostrarDetallesSuscripcion(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Métodos de Pago */}
        <Card className="rounded-xl overflow-hidden border-none shadow-lg bg-white mt-4">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-blue-900">Métodos de Pago</CardTitle>
                <CardDescription className="text-blue-600 text-xs">
                  Configura tus cuentas para recibir pagos
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs h-8"
              >
                Añadir Cuenta
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="p-3 border border-blue-100 rounded-lg bg-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Building className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Banco Estado</h3>
                    <p className="text-xs text-gray-500">Cuenta Corriente **** 5678</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Principal</Badge>
              </div>
              
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Building className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Banco Santander</h3>
                    <p className="text-xs text-gray-500">Cuenta Vista **** 1234</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Establecer Principal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Pagos;
