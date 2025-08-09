import React from 'react';
import { MapPin, Phone, User, Building2, Package, Truck, AlertTriangle, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DeliveryInfoPanelProps {
  delivery: any;
}

const DeliveryInfoPanel: React.FC<DeliveryInfoPanelProps> = ({ delivery }) => {
  if (!delivery) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
        <div className="flex items-center">
          <AlertTriangle size={20} className="text-red-500 mr-2" />
          <p className="text-red-700">No se ha podido cargar la información de la entrega</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Información del cliente */}
      <Card className="p-4 shadow-sm border-0">
        <div className="flex items-center mb-3">
          <User className="text-blue-600 mr-2" size={18} />
          <h3 className="text-lg font-bold">Información del Cliente</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <User size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{delivery.customerName || 'No disponible'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <Phone size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Teléfono</p>
              <a href={`tel:${delivery.customerPhone}`} className="font-medium text-blue-600">
                {delivery.customerPhone || 'No disponible'}
              </a>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <MapPin size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Dirección de entrega</p>
              <p className="font-medium">{delivery.deliveryAddress || 'No disponible'}</p>
            </div>
          </div>
          
          {delivery.customerNotes && (
            <div className="flex items-start">
              <div className="min-w-[24px] mt-1">
                <AlertTriangle size={16} className="text-gray-400" />
              </div>
              <div className="ml-2">
                <p className="text-sm text-gray-500">Notas del cliente</p>
                <p className="font-medium">{delivery.customerNotes}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Información de la empresa */}
      <Card className="p-4 shadow-sm border-0">
        <div className="flex items-center mb-3">
          <Building2 className="text-blue-600 mr-2" size={18} />
          <h3 className="text-lg font-bold">Información de la Empresa</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <Building2 size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{delivery.companyName || 'No disponible'}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <Phone size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Teléfono</p>
              <a href={`tel:${delivery.companyPhone}`} className="font-medium text-blue-600">
                {delivery.companyPhone || 'No disponible'}
              </a>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="min-w-[24px] mt-1">
              <MapPin size={16} className="text-gray-400" />
            </div>
            <div className="ml-2">
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium">{delivery.companyAddress || 'No disponible'}</p>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Información del pedido */}
      <Card className="p-4 shadow-sm border-0">
        <div className="flex items-center mb-3">
          <Package className="text-blue-600 mr-2" size={18} />
          <h3 className="text-lg font-bold">Información del Pedido</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">ID del pedido:</span>
            <span className="font-medium">{delivery.id ? delivery.id.substring(0, 8) : 'No disponible'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Fecha del pedido:</span>
            <span className="font-medium">{formatDate(delivery.createdAt)}</span>
          </div>
          
          {delivery.estimatedDeliveryTime && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Entrega estimada:</span>
              <span className="font-medium">{formatDate(delivery.estimatedDeliveryTime)}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Tarifa de entrega:</span>
            <span className="font-medium text-green-600">${(delivery.proposedFee || delivery.deliveryFee || 0).toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Estado:</span>
            <span className="font-medium">
              {delivery.status === 'pendingDriver' && 'Pendiente de repartidor'}
              {delivery.status === 'driverAssigned' && 'Repartidor asignado'}
              {delivery.status === 'inTransit' && 'En camino'}
              {delivery.status === 'delivered' && 'Entregado'}
              {delivery.status === 'cancelled' && 'Cancelado'}
              {(!delivery.status || !['pendingDriver', 'driverAssigned', 'inTransit', 'delivered', 'cancelled'].includes(delivery.status)) && 'Desconocido'}
            </span>
          </div>
        </div>
      </Card>
      
      {/* Productos del pedido */}
      {delivery.items && delivery.items.length > 0 && (
        <Card className="p-4 shadow-sm border-0">
          <div className="flex items-center mb-3">
            <Package className="text-blue-600 mr-2" size={18} />
            <h3 className="text-lg font-bold">Productos ({delivery.items.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {delivery.items.map((item: any, index: number) => (
              <div key={index} className="py-2 flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                </div>
                {item.price && (
                  <p className="font-medium">
                    ${(item.price * (item.quantity || 1)).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {delivery.totalAmount && (
            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
              <span>Total:</span>
              <span>${delivery.totalAmount.toFixed(2)}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default DeliveryInfoPanel;
