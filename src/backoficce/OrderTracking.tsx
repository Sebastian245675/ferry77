import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import DashboardLayout from "@/components/barraempresa";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  MessageSquare,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  CreditCard,
  Info,
  User
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const OrderTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        console.log("No se proporcionó ID de pedido");
        navigate("/backoffice");
        return;
      }

      try {
        setLoading(true);
        console.log("Buscando pedido con ID:", orderId);
        
        // Intentar buscar en cotizaciones primero
        let orderDoc = await getDoc(doc(db, "cotizaciones", orderId));
        
        // Si no existe en cotizaciones, buscar en solicitud
        if (!orderDoc.exists()) {
          console.log("Pedido no encontrado en 'cotizaciones', buscando en 'solicitud'");
          orderDoc = await getDoc(doc(db, "solicitud", orderId));
        }
        
        if (orderDoc.exists()) {
          const orderData = { 
            id: orderDoc.id, 
            ...orderDoc.data() 
          } as any;
          console.log("Pedido encontrado:", orderData);
          
          // Asegurarse de que el precio y otros campos críticos estén definidos correctamente
          if (orderData.autoQuotes && orderData.autoQuotes.length > 0) {
            console.log("Detalle de autoQuotes:", JSON.stringify(orderData.autoQuotes, null, 2));
            // Extraer información relevante de autoQuotes
            if (orderData.autoQuotes[0].bestPrice && !orderData.productPrice) {
              console.log(`Estableciendo productPrice desde autoQuotes: ${orderData.autoQuotes[0].bestPrice}`);
              orderData.productPrice = orderData.autoQuotes[0].bestPrice;
            }
            if (orderData.autoQuotes[0].bestProduct && !orderData.productDetails) {
              orderData.productDetails = orderData.autoQuotes[0].bestProduct;
            }
          }
          
          // Verificar y extraer información del repartidor de diferentes estructuras posibles
          if (orderData.deliveryInfo && orderData.deliveryInfo.repartidor) {
            console.log("Información del repartidor encontrada en deliveryInfo:", orderData.deliveryInfo.repartidor);
            orderData.repartidor = orderData.deliveryInfo.repartidor;
          } else if (orderData.delivery && typeof orderData.delivery === 'object') {
            console.log("Información del repartidor encontrada en delivery:", orderData.delivery);
            // Ya está en orderData.delivery, no necesitamos hacer nada
          } else if (orderData.repartidorData) {
            console.log("Información del repartidor encontrada en repartidorData:", orderData.repartidorData);
            orderData.repartidor = orderData.repartidorData;
          } else if (orderData.deliveryPersonId || orderData.repartidorId) {
            // En este caso, solo tenemos el ID pero no los datos completos
            console.log("ID del repartidor encontrado, pero no sus datos completos");
          }
          
          // Depuración completa de la estructura del pedido
          console.log("Estructura completa del pedido:", JSON.stringify(orderData, null, 2));
          
          // Específicamente revisar información del repartidor
          console.log("Información del repartidor:", 
            orderData.repartidor || 
            orderData.deliveryPerson || 
            orderData.deliveryAssigned || 
            orderData.delivery || 
            "No hay información de repartidor"
          );
          
          setOrderDetails(orderData);
          setCurrentStatus(orderData.deliveryStatus || "pendiente");
        } else {
          console.error("Pedido no encontrado en ninguna colección:", orderId);
          toast({
            title: "Error",
            description: "No se encontró el pedido en ninguna colección",
            variant: "destructive",
          });
          navigate("/backoffice");
        }
      } catch (error) {
        console.error("Error al cargar detalles del pedido:", error);
        toast({
          title: "Error",
          description: "Error al cargar detalles del pedido",
          variant: "destructive",
        });
        // Navegar a la ruta correcta en caso de error
        navigate("/backoffice");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, navigate]);

  const handleStatusUpdate = async () => {
    if (!orderId) return;

    try {
      setUpdating(true);
      
      // Intentar determinar la colección correcta
      let collections = ["solicitud", "cotizaciones"];
      let updateSuccess = false;
      let updateError = null;
      
      console.log("Orden actual:", orderDetails);
      console.log("Intentando actualizar el estado a:", currentStatus);
      
      // Intentar actualizar en ambas colecciones si es necesario
      for (const collection of collections) {
        try {
          console.log(`Intentando actualizar en colección '${collection}' con ID: ${orderId}`);
          
          // Verificar si el documento existe antes de actualizarlo
          const docRef = doc(db, collection, orderId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            console.log(`Documento encontrado en '${collection}', procediendo con la actualización`);
            
            // Crear objeto de actualización para evitar múltiples llamadas a updateDoc
            const updateData = {
              deliveryStatus: currentStatus,
              statusNote: statusNote,
              statusUpdatedAt: new Date(),
            };
            
            // Si el estado es "entregado", actualizar también el campo status para que
            // no aparezca en las solicitudes pendientes
            if (currentStatus === "entregado") {
              updateData["status"] = "entregado";
              console.log("Actualizando estado principal a 'entregado'");
            }
            
            // Actualizar todo de una vez
            await updateDoc(docRef, updateData);
            
            console.log(`Actualización exitosa en '${collection}'`);
            updateSuccess = true;
            
            break; // Salir del bucle si la actualización fue exitosa
          } else {
            console.log(`El documento no existe en la colección '${collection}'`);
          }
        } catch (collectionError) {
          console.error(`Error al actualizar en '${collection}':`, collectionError);
          updateError = collectionError;
        }
      }
      
      // Verificar si la actualización fue exitosa en alguna colección
      if (updateSuccess) {
        console.log("Actualización completada con éxito");
        toast({
          title: "Estado actualizado",
          description: "El estado del pedido ha sido actualizado correctamente",
        });
        
        // Actualizar los detalles locales
        setOrderDetails({
          ...orderDetails,
          deliveryStatus: currentStatus,
          statusNote: statusNote,
          statusUpdatedAt: new Date(),
        });
        
        setStatusNote("");
      } else {
        // Si la actualización falló en todas las colecciones
        throw updateError || new Error("No se pudo actualizar el pedido en ninguna colección");
      }
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido. Detalles: " + (error.message || "Error desconocido"),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Función para mostrar el icono según el estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Clock className="h-5 w-5" />;
      case "enviado":
        return <Package className="h-5 w-5" />;
      case "en_camino":
        return <Truck className="h-5 w-5" />;
      case "entregado":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  // Función para obtener el color del badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "enviado":
        return "bg-blue-100 text-blue-800";
      case "en_camino":
        return "bg-purple-100 text-purple-800";
      case "entregado":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Agregar un tiempo de espera máximo para la carga
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading) {
          setLoading(false);
          console.error("Tiempo de espera excedido al cargar los datos del pedido");
          toast({
            title: "Error",
            description: "Tiempo de espera excedido al cargar datos. Inténtalo de nuevo.",
            variant: "destructive",
          });
          navigate("/backoffice");
        }
      }, 10000); // 10 segundos máximo de espera
      
      return () => clearTimeout(timeout);
    }
  }, [loading, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/backoffice")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                Seguimiento de Pedido
              </h1>
              <p className="text-gray-600">
                Gestione el estado de este pedido y mantenga informado al cliente
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(orderDetails?.deliveryStatus || "pendiente")}>
            {getStatusIcon(orderDetails?.deliveryStatus || "pendiente")}
            <span className="ml-1">
              {orderDetails?.deliveryStatus === "pendiente"
                ? "Pendiente"
                : orderDetails?.deliveryStatus === "enviado"
                ? "Enviado"
                : orderDetails?.deliveryStatus === "en_camino"
                ? "En camino"
                : orderDetails?.deliveryStatus === "entregado"
                ? "Entregado"
                : "Pendiente"}
            </span>
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detalles del pedido */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Pedido</CardTitle>
                <CardDescription>
                  Información sobre el pedido y la cotización aceptada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">ID del Pedido</p>
                      <p>{orderDetails?.id}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Fecha de Aceptación</p>
                      <p>
                        {orderDetails?.acceptedAt
                          ? (orderDetails.acceptedAt.seconds 
                             ? new Date(orderDetails.acceptedAt.seconds * 1000).toLocaleDateString()
                             : new Date(orderDetails.acceptedAt).toLocaleDateString())
                          : orderDetails?.createdAt
                            ? new Date(orderDetails.createdAt).toLocaleDateString()
                            : "No disponible"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Producto/Servicio</p>
                      <p className="font-medium">
                        {orderDetails?.productName || 
                         orderDetails?.items?.[0]?.name ||
                         orderDetails?.title || 
                         orderDetails?.requestTitle || 
                         "No especificado"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Cantidad</p>
                      <p>{orderDetails?.items?.[0]?.quantity || orderDetails?.quantity || "No especificado"}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Categoría</p>
                      <p>{orderDetails?.profession || 
                          orderDetails?.productDetails?.category ||
                          orderDetails?.autoQuotes?.[0]?.bestProduct?.category ||
                          "No especificado"}</p>
                    </div>
                    <div className="space-y-2 flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Monto Total</p>
                        <p className="text-xl font-bold text-green-700">
                          ${(() => {
                            // Consola para depuración
                            console.log("Datos de precio:", {
                              productPrice: orderDetails?.productPrice,
                              bestPrice: orderDetails?.bestPrice,
                              productDetailsPrice: orderDetails?.productDetails?.price,
                              price: orderDetails?.price,
                              autoQuotes: orderDetails?.autoQuotes?.[0]?.bestPrice,
                              bestProductPrice: orderDetails?.bestProduct?.price
                            });
                            
                            // Revisar en todos los posibles lugares donde podría estar el precio
                            const price = 
                              orderDetails?.productPrice !== undefined ? Number(orderDetails.productPrice) :
                              orderDetails?.bestPrice !== undefined ? Number(orderDetails.bestPrice) :
                              orderDetails?.autoQuotes?.[0]?.bestPrice !== undefined ? Number(orderDetails.autoQuotes[0].bestPrice) :
                              orderDetails?.bestProduct?.price !== undefined ? Number(orderDetails.bestProduct.price) :
                              orderDetails?.productDetails?.price !== undefined ? Number(orderDetails.productDetails.price) :
                              orderDetails?.items?.[0]?.bestPrice !== undefined ? Number(orderDetails.items[0].bestPrice) :
                              orderDetails?.price !== undefined ? Number(orderDetails.price) :
                              orderDetails?.totalAmount !== undefined ? Number(orderDetails.totalAmount) :
                              0;
                              
                            return price.toLocaleString();
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Descripción</p>
                    <p className="whitespace-pre-wrap">
                      {orderDetails?.description || "Sin descripción disponible."}
                    </p>
                  </div>

                  {orderDetails?.paymentMethod && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Método de Pago</p>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                        <p>{orderDetails.paymentMethod}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actualizar Estado */}
            <Card>
              <CardHeader>
                <CardTitle>Actualizar Estado del Pedido</CardTitle>
                <CardDescription>
                  Mantenga informado al cliente sobre el progreso de su pedido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado actual</label>
                      <Select
                        value={currentStatus}
                        onValueChange={setCurrentStatus}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Estados de entrega</SelectLabel>
                            <SelectItem value="pendiente">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>Pendiente</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="enviado">
                              <div className="flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                <span>Enviado</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="en_camino">
                              <div className="flex items-center">
                                <Truck className="h-4 w-4 mr-2" />
                                <span>En camino</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="entregado">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                <span>Entregado</span>
                              </div>
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nota (opcional)</label>
                      <Textarea
                        placeholder="Agregue detalles sobre el estado actual"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full company-card text-white bg-green-600 hover:bg-green-700"
                  onClick={handleStatusUpdate}
                  disabled={updating}
                >
                  {updating ? "Actualizando..." : "Actualizar Estado"}
                </Button>
              </CardFooter>
            </Card>

            {/* Historial de estados (se implementaría en una versión más completa) */}
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Información del cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="font-medium">{orderDetails?.clientName || orderDetails?.userName || orderDetails?.userEmail?.split('@')[0] || "Cliente"}</p>
                  </div>

                  {orderDetails?.contactInfo && (
                    <>
                      {orderDetails.contactInfo.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-500" />
                          <p>{orderDetails.contactInfo.email}</p>
                        </div>
                      )}
                      {orderDetails.contactInfo.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-500" />
                          <p>{orderDetails.contactInfo.phone}</p>
                        </div>
                      )}
                    </>
                  )}

                  {orderDetails?.shippingAddress && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-gray-500 mb-1">Dirección de Envío</p>
                      <div className="flex">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{orderDetails.shippingAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 transition-colors group"
                  onClick={() => {
                    // Usar el clientId o userId según esté disponible en los detalles
                    const clientId = orderDetails?.clientId || orderDetails?.userId;
                    console.log("🔍 Navegando a chat con cliente ID:", clientId);
                    
                    if (clientId) {
                      navigate(`/backoffice/messages?clientId=${clientId}`);
                    } else {
                      console.error("⚠️ No se encontró ID de cliente en los detalles del pedido");
                      toast({
                        title: "Error",
                        description: "No se pudo identificar al cliente para iniciar el chat",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Contactar Cliente
                </Button>
              </CardFooter>
            </Card>

            {/* Información del repartidor asignado */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-blue-600" />
                  {(orderDetails?.deliveryAssigned || 
                    orderDetails?.repartidor || 
                    orderDetails?.deliveryPerson || 
                    orderDetails?.delivery) ? 
                    "Repartidor Asignado" : 
                    "Información de Entrega"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Depuración para verificar la estructura del pedido
                  console.log("DEBUG - Información del repartidor:", {
                    deliveryAssigned: orderDetails?.deliveryAssigned,
                    repartidor: orderDetails?.repartidor,
                    deliveryPerson: orderDetails?.deliveryPerson,
                    delivery: orderDetails?.delivery,
                    deliveryDriver: orderDetails?.deliveryDriver,
                    repartidorAsignado: orderDetails?.repartidorAsignado,
                    pedido: orderDetails
                  });
                  
                  // Identificar qué objeto contiene la información del repartidor
                  const deliveryPerson = 
                    orderDetails?.deliveryAssigned || 
                    orderDetails?.repartidor || 
                    orderDetails?.deliveryPerson ||
                    orderDetails?.delivery ||
                    orderDetails?.deliveryDriver ||
                    orderDetails?.repartidorAsignado;
                  
                  // Verificar también estructuras anidadas
                  const anidado = 
                    (orderDetails?.deliveryInfo && orderDetails?.deliveryInfo.repartidor) ||
                    (orderDetails?.deliveryDetails && orderDetails?.deliveryDetails.person);
                  
                  // Si hay información en cualquier estructura
                  if (deliveryPerson || anidado) {
                    // Si la información está en una estructura anidada, usarla
                    const finalDeliveryPerson = deliveryPerson || anidado;
                    // Extraer nombre (considerando diferentes estructuras)
                    const name = 
                      finalDeliveryPerson.name || 
                      finalDeliveryPerson.nombre || 
                      finalDeliveryPerson.displayName || 
                      finalDeliveryPerson.fullName ||
                      (typeof finalDeliveryPerson === 'string' ? finalDeliveryPerson : "Repartidor");
                    
                    // Extraer ID (considerando diferentes estructuras)
                    const id = 
                      finalDeliveryPerson.id || 
                      finalDeliveryPerson.uid || 
                      finalDeliveryPerson._id || 
                      finalDeliveryPerson.driverId ||
                      "No disponible";
                    
                    // Extraer teléfono (considerando diferentes estructuras)
                    const phone = 
                      finalDeliveryPerson.phone || 
                      finalDeliveryPerson.telefono || 
                      finalDeliveryPerson.phoneNumber || 
                      finalDeliveryPerson.tel ||
                      (finalDeliveryPerson.contactInfo && finalDeliveryPerson.contactInfo.phone);
                    
                    // Extraer email (considerando diferentes estructuras)
                    const email = 
                      finalDeliveryPerson.email || 
                      finalDeliveryPerson.correo || 
                      finalDeliveryPerson.emailAddress || 
                      finalDeliveryPerson.mail ||
                      (finalDeliveryPerson.contactInfo && finalDeliveryPerson.contactInfo.email);
                    
                    // Extraer estado (considerando diferentes estructuras)
                    const estado = 
                      orderDetails.deliveryStatus || 
                      orderDetails.estadoEntrega ||
                      orderDetails.status;
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-gray-500">ID: {id}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2">
                          {phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              <p>{phone}</p>
                            </div>
                          )}
                          {email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <p>{email}</p>
                            </div>
                          )}
                        </div>
                        
                        {(estado === "en_camino" || estado === "enviado") && (
                          <div className="pt-2 border-t mt-2">
                            <div className="flex items-center text-sm text-green-600">
                              <Info className="h-4 w-4 mr-2" />
                              <p>Entrega en progreso</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else if (orderDetails?.deliveryStatus === "en_camino" && !anidado && !deliveryPerson) {
                    // Si el estado es "en camino" pero no hay repartidor asignado explícitamente, 
                    // asumimos que hay un repartidor (simplemente no tenemos sus datos)
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg">
                          <div className="text-center">
                            <Truck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Pedido en camino</p>
                            <p className="text-sm text-gray-500">
                              Un repartidor está llevando este pedido a su destino.
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800 flex items-center mb-2">
                            <Info className="h-4 w-4 mr-2" />
                            El pedido ha sido asignado a un repartidor
                          </p>
                          <p className="text-xs text-gray-600">
                            Los detalles del repartidor no están disponibles en este momento.
                          </p>
                        </div>
                        
                        {orderDetails?.statusNote && (
                          <div className="pt-2 border-t mt-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Nota del estado:</p>
                            <p className="text-sm italic">{orderDetails.statusNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // No hay repartidor asignado, mostrar el estado actual del pedido
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 bg-blue-50 p-3 rounded-lg">
                          <div className="text-center">
                            {getStatusIcon(orderDetails?.deliveryStatus || "pendiente")}
                          </div>
                          <div>
                            <p className="font-medium">Estado: {
                              orderDetails?.deliveryStatus === "pendiente"
                              ? "Pendiente"
                              : orderDetails?.deliveryStatus === "enviado"
                              ? "Enviado"
                              : orderDetails?.deliveryStatus === "en_camino"
                              ? "En camino"
                              : orderDetails?.deliveryStatus === "entregado"
                              ? "Entregado"
                              : "Pendiente"
                            }</p>
                            <p className="text-sm text-gray-500">
                              {orderDetails?.deliveryStatus === "pendiente" && "En espera de asignación"}
                              {orderDetails?.deliveryStatus === "enviado" && "El pedido ha sido enviado"}
                              {orderDetails?.deliveryStatus === "en_camino" && "El pedido está en ruta de entrega"}
                              {orderDetails?.deliveryStatus === "entregado" && "Pedido entregado con éxito"}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-sm text-yellow-800 flex items-center mb-2">
                            <Info className="h-4 w-4 mr-2" />
                            No hay repartidor asignado para este pedido
                          </p>
                          <p className="text-xs text-gray-600">
                            Puede asignar un repartidor desde el panel de administración del pedido.
                          </p>
                        </div>
                        
                        {orderDetails?.statusNote && (
                          <div className="pt-2 border-t mt-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Nota del estado:</p>
                            <p className="text-sm italic">{orderDetails.statusNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </CardContent>
              <CardFooter>
                {(() => {
                  // Identificar qué objeto contiene la información del repartidor (misma lógica que arriba)
                  const deliveryPerson = 
                    orderDetails?.deliveryAssigned || 
                    orderDetails?.repartidor || 
                    orderDetails?.deliveryPerson ||
                    orderDetails?.delivery ||
                    orderDetails?.deliveryDriver ||
                    orderDetails?.repartidorAsignado;
                  
                  // Verificar también estructuras anidadas
                  const anidado = 
                    (orderDetails?.deliveryInfo && orderDetails?.deliveryInfo.repartidor) ||
                    (orderDetails?.deliveryDetails && orderDetails?.deliveryDetails.person);
                  
                  // Si hay un repartidor o el estado es "en camino"
                  if (deliveryPerson || anidado || orderDetails?.deliveryStatus === "en_camino") {
                    const finalDeliveryPerson = deliveryPerson || anidado;
                    const repartidorId = finalDeliveryPerson ? (
                      finalDeliveryPerson.id || 
                      finalDeliveryPerson.uid || 
                      finalDeliveryPerson._id ||
                      finalDeliveryPerson.driverId
                    ) : null;
                      
                    return (
                      <Button
                        variant="outline"
                        className="w-full hover:bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 transition-colors group"
                        onClick={() => {
                          if (repartidorId) {
                            // Navegar a mensajes con el repartidor
                            console.log("🚚 Navegando a chat con repartidor ID:", repartidorId);
                            navigate(`/backoffice/messages?deliveryId=${repartidorId}`);
                          } else if (orderDetails?.deliveryStatus === "en_camino") {
                            // Si está en camino pero no tenemos ID del repartidor
                            toast({
                              title: "Información",
                              description: "Este pedido está en camino, pero los datos del repartidor no están disponibles",
                            });
                          } else {
                            toast({
                              title: "Error",
                              description: "No se pudo identificar al repartidor para iniciar el chat",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                        {orderDetails?.deliveryStatus === "en_camino" && !repartidorId ? "Ver Detalles" : "Contactar Repartidor"}
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        variant="outline"
                        className="w-full hover:bg-green-50 text-green-600 border-green-200 hover:border-green-300 transition-colors group"
                        onClick={() => {
                          toast({
                            title: "Próximamente",
                            description: "La función de asignar repartidor estará disponible próximamente",
                          });
                        }}
                      >
                        <User className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                        Asignar Repartidor
                      </Button>
                    );
                  }
                })()}
              </CardFooter>
            </Card>
            
            {/* Detalles de pago */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span>${(() => {
                      const price = 
                        orderDetails?.productPrice !== undefined ? Number(orderDetails.productPrice) :
                        orderDetails?.bestPrice !== undefined ? Number(orderDetails.bestPrice) :
                        orderDetails?.autoQuotes?.[0]?.bestPrice !== undefined ? Number(orderDetails.autoQuotes[0].bestPrice) :
                        orderDetails?.bestProduct?.price !== undefined ? Number(orderDetails.bestProduct.price) :
                        orderDetails?.productDetails?.price !== undefined ? Number(orderDetails.productDetails.price) :
                        orderDetails?.items?.[0]?.bestPrice !== undefined ? Number(orderDetails.items[0].bestPrice) :
                        orderDetails?.price !== undefined ? Number(orderDetails.price) :
                        orderDetails?.totalAmount !== undefined ? Number(orderDetails.totalAmount) :
                        0;
                        
                      return price.toLocaleString();
                    })()}</span>
                  </div>
                  {orderDetails?.taxes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Impuestos:</span>
                      <span>${orderDetails.taxes.toLocaleString()}</span>
                    </div>
                  )}
                  {orderDetails?.shippingCost && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Envío:</span>
                      <span>${orderDetails.shippingCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-green-700">
                        ${(() => {
                          const price = 
                            orderDetails?.productPrice !== undefined ? Number(orderDetails.productPrice) :
                            orderDetails?.bestPrice !== undefined ? Number(orderDetails.bestPrice) :
                            orderDetails?.autoQuotes?.[0]?.bestPrice !== undefined ? Number(orderDetails.autoQuotes[0].bestPrice) :
                            orderDetails?.bestProduct?.price !== undefined ? Number(orderDetails.bestProduct.price) :
                            orderDetails?.productDetails?.price !== undefined ? Number(orderDetails.productDetails.price) :
                            orderDetails?.items?.[0]?.bestPrice !== undefined ? Number(orderDetails.items[0].bestPrice) :
                            orderDetails?.price !== undefined ? Number(orderDetails.price) :
                            orderDetails?.totalAmount !== undefined ? Number(orderDetails.totalAmount) :
                            0;
                          
                          const quantity = orderDetails?.items?.[0]?.quantity || orderDetails?.quantity || 1;
                          const total = price * quantity + (orderDetails?.taxes || 0) + (orderDetails?.shippingCost || 0);
                          return total.toLocaleString();
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderTracking;
