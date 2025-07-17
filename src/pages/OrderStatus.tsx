import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import Navbar from "../components/Navbar";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  ArrowLeft,
  MessageSquare,
  MapPin,
  Calendar,
  DollarSign,
  CreditCard,
} from "lucide-react";

const OrderStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get("id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId) {
      navigate("/quotes");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "cotizaciones", quoteId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() });
      } else {
        // No existe la cotización
        navigate("/quotes");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [quoteId, navigate]);

  const getStatusClass = (currentStatus: string, targetStatus: string) => {
    const statusOrder = ["pendiente", "enviado", "en_camino", "entregado"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);

    if (currentIndex >= targetIndex) {
      return "bg-green-500 border-green-500";
    }
    return "bg-gray-200 border-gray-200";
  };

  const getStatusTextClass = (currentStatus: string, targetStatus: string) => {
    const statusOrder = ["pendiente", "enviado", "en_camino", "entregado"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);

    if (currentIndex >= targetIndex) {
      return "text-green-600 font-medium";
    }
    return "text-gray-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const deliveryStatus = order?.deliveryStatus || "pendiente";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/quotes")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Seguimiento de Pedido</h1>
              <p className="text-gray-600">
                Seguimiento del pedido #{order?.id.slice(0, 6)}
              </p>
            </div>
          </div>
        </div>

        {/* Status Tracker */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Estado del Pedido</CardTitle>
            <CardDescription>Seguimiento actualizado de tu pedido</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Status Timeline */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[22px] top-0 h-full w-[2px] bg-gray-200"></div>

              {/* Pending */}
              <div className="flex mb-8 relative z-10">
                <div
                  className={`h-11 w-11 rounded-full border-4 flex items-center justify-center ${getStatusClass(
                    deliveryStatus,
                    "pendiente"
                  )}`}
                >
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${getStatusTextClass(deliveryStatus, "pendiente")}`}>
                    Pedido Confirmado
                  </p>
                  <p className="text-sm text-gray-500">
                    {order?.acceptedAt
                      ? new Date(
                          order.acceptedAt.seconds * 1000
                        ).toLocaleDateString() +
                        " " +
                        new Date(
                          order.acceptedAt.seconds * 1000
                        ).toLocaleTimeString()
                      : "Fecha no disponible"}
                  </p>
                  {deliveryStatus === "pendiente" && order?.statusNote && (
                    <p className="text-sm bg-yellow-50 text-yellow-700 p-2 rounded mt-2 border border-yellow-100">
                      {order.statusNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipped */}
              <div className="flex mb-8 relative z-10">
                <div
                  className={`h-11 w-11 rounded-full border-4 flex items-center justify-center ${getStatusClass(
                    deliveryStatus,
                    "enviado"
                  )}`}
                >
                  <Package
                    className={`h-5 w-5 ${
                      getStatusClass(deliveryStatus, "enviado") === "bg-green-500 border-green-500"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${getStatusTextClass(deliveryStatus, "enviado")}`}>
                    Pedido Enviado
                  </p>
                  {deliveryStatus === "enviado" && order?.statusUpdatedAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(
                        order.statusUpdatedAt.seconds * 1000
                      ).toLocaleDateString() +
                        " " +
                        new Date(
                          order.statusUpdatedAt.seconds * 1000
                        ).toLocaleTimeString()}
                    </p>
                  )}
                  {deliveryStatus === "enviado" && order?.statusNote && (
                    <p className="text-sm bg-blue-50 text-blue-700 p-2 rounded mt-2 border border-blue-100">
                      {order.statusNote}
                    </p>
                  )}
                </div>
              </div>

              {/* In Transit */}
              <div className="flex mb-8 relative z-10">
                <div
                  className={`h-11 w-11 rounded-full border-4 flex items-center justify-center ${getStatusClass(
                    deliveryStatus,
                    "en_camino"
                  )}`}
                >
                  <Truck
                    className={`h-5 w-5 ${
                      getStatusClass(deliveryStatus, "en_camino") === "bg-green-500 border-green-500"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${getStatusTextClass(deliveryStatus, "en_camino")}`}>
                    En Camino
                  </p>
                  {deliveryStatus === "en_camino" && order?.statusUpdatedAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(
                        order.statusUpdatedAt.seconds * 1000
                      ).toLocaleDateString() +
                        " " +
                        new Date(
                          order.statusUpdatedAt.seconds * 1000
                        ).toLocaleTimeString()}
                    </p>
                  )}
                  {deliveryStatus === "en_camino" && order?.statusNote && (
                    <p className="text-sm bg-purple-50 text-purple-700 p-2 rounded mt-2 border border-purple-100">
                      {order.statusNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Delivered */}
              <div className="flex relative z-10">
                <div
                  className={`h-11 w-11 rounded-full border-4 flex items-center justify-center ${getStatusClass(
                    deliveryStatus,
                    "entregado"
                  )}`}
                >
                  <CheckCircle
                    className={`h-5 w-5 ${
                      getStatusClass(deliveryStatus, "entregado") ===
                      "bg-green-500 border-green-500"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="ml-4">
                  <p className={`font-medium ${getStatusTextClass(deliveryStatus, "entregado")}`}>
                    Entregado
                  </p>
                  {deliveryStatus === "entregado" && order?.statusUpdatedAt && (
                    <p className="text-sm text-gray-500">
                      {new Date(
                        order.statusUpdatedAt.seconds * 1000
                      ).toLocaleDateString() +
                        " " +
                        new Date(
                          order.statusUpdatedAt.seconds * 1000
                        ).toLocaleTimeString()}
                    </p>
                  )}
                  {deliveryStatus === "entregado" && order?.statusNote && (
                    <p className="text-sm bg-green-50 text-green-700 p-2 rounded mt-2 border border-green-100">
                      {order.statusNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate(`/messages?companyId=${order?.companyId}`)}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contactar al Proveedor
            </Button>
          </CardFooter>
        </Card>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Pedido #</p>
                    <p className="font-medium">{order?.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium">
                      {order?.acceptedAt
                        ? new Date(
                            order.acceptedAt.seconds * 1000
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Empresa</p>
                  <p className="font-medium">{order?.companyName || "Empresa"}</p>
                </div>

                {order?.items && order.items.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Artículos</p>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="p-2 border border-gray-100 rounded-lg bg-gray-50 flex justify-between"
                        >
                          <span>
                            {item.name}{" "}
                            {item.quantity > 1 && (
                              <span className="text-sm text-gray-500">
                                x{item.quantity}
                              </span>
                            )}
                          </span>
                          <span className="font-medium">
                            ${(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Producto/Servicio</p>
                    <p className="font-medium">{order?.requestTitle || "No especificado"}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-green-700">
                      ${order?.totalAmount?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Tiempo estimado</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <p className="font-medium">{order?.deliveryTime || "No especificado"}</p>
                  </div>
                </div>

                {order?.shippingAddress && (
                  <div>
                    <p className="text-sm text-gray-500">Dirección de entrega</p>
                    <div className="flex items-start mt-1">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                      <p>{order.shippingAddress}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Método de pago</p>
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                    <p className="font-medium">{order?.paymentMethod || "No especificado"}</p>
                  </div>
                </div>

                {order?.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm">{order.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default OrderStatus;
