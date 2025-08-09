import React from 'react';
import { MapPin, Package, Clock, DollarSign, AlertTriangle, User, Truck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Delivery } from '@/lib/models';

interface DeliveryCardProps {
  delivery: any;
  onAccept?: (deliveryId: string) => void;
  onCancel?: (deliveryId: string) => void;
  onProposeFee?: (deliveryId: string) => void;
  onViewDetails?: (deliveryId: string) => void;
  onComplete?: (deliveryId: string) => void;
  type: 'available' | 'active' | 'completed';
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ 
  delivery, 
  onAccept, 
  onCancel, 
  onProposeFee, 
  onViewDetails,
  onComplete,
  type 
}) => {
  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  // Formatear distancia
  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    return `${distance} km`;
  };
  
  // Renderizar botones según el tipo de tarjeta
  const renderActions = () => {
    if (type === 'available') {
      return (
        <div className="mt-3 flex gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (onAccept) onAccept(delivery.id);
            }} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Aceptar
          </Button>
          
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (onProposeFee) onProposeFee(delivery.id);
            }} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Proponer Precio
          </Button>
        </div>
      );
    }
    
    if (type === 'active') {
      return (
        <div className="mt-3 flex gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (onCancel) onCancel(delivery.id);
            }} 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Cancelar
          </Button>
          
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              if (onComplete) onComplete(delivery.id);
            }} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Completar
          </Button>
        </div>
      );
    }
    
    return null; // Para entregas completadas no mostramos acciones
  };
  
  const getStatusBadge = () => {
    switch (delivery.status) {
      case 'pendingDriver':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock size={12} className="mr-1" />
            <span>Pendiente</span>
          </div>
        );
      case 'driverAssigned':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-blue-100 text-blue-800 border border-blue-200">
            <User size={12} className="mr-1" />
            <span>Asignado</span>
          </div>
        );
      case 'inTransit':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-blue-100 text-blue-800 border border-blue-200">
            <Truck size={12} className="mr-1" />
            <span>En camino</span>
          </div>
        );
      case 'delivered':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-green-100 text-green-800 border border-green-200">
            <Package size={12} className="mr-1" />
            <span>Entregado</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle size={12} className="mr-1" />
            <span>Cancelado</span>
          </div>
        );
      default:
        return (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center bg-gray-100 text-gray-800 border border-gray-200">
            <AlertTriangle size={12} className="mr-1" />
            <span>Desconocido</span>
          </div>
        );
    }
  };

  return (
    <div 
      className="p-4 mb-3 border rounded-lg bg-white active:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      onClick={() => {
        if (onViewDetails) onViewDetails(delivery.id);
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center">
            <h3 className="font-bold text-base text-gray-800">
              Pedido #{delivery.id.substring(0, 6)}
            </h3>
            {delivery.isUrgent && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-md font-semibold animate-pulse">
                Urgente
              </span>
            )}
          </div>
          <div className="flex items-center text-gray-600 mt-0.5">
            <MapPin size={14} className="mr-1 flex-shrink-0 text-blue-500" />
            <span className="line-clamp-1 text-xs">{delivery.deliveryAddress || 'Dirección no especificada'}</span>
          </div>
        </div>
        
        {getStatusBadge()}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Cliente</p>
            <p className="text-sm font-medium line-clamp-1 flex items-center">
              <User size={12} className="text-gray-400 mr-1" />
              {delivery.customerName || 'Cliente'}
            </p>
          </div>
          
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-0.5">Empresa</p>
            <p className="text-sm font-medium line-clamp-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-1">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              {delivery.companyName || 'Empresa'}
            </p>
          </div>
          
          <div className="flex items-center">
            <div className="bg-gray-50 rounded-full p-0.5 mr-1.5">
              <Clock size={12} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
              <p className="text-xs font-medium">
                {formatDate(delivery.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="bg-green-50 rounded-full p-0.5 mr-1.5">
              <DollarSign size={12} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Tarifa</p>
              <p className="text-xs font-medium text-green-600">
                ${(delivery.proposedFee || delivery.deliveryFee || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {delivery.distance && (
          <div className="mt-2.5 flex items-center text-xs bg-blue-50 rounded-lg p-1.5 px-2 w-fit">
            <MapPin size={12} className="text-blue-600 mr-1.5" />
            <span className="font-medium">{formatDistance(delivery.distance)}</span>
            <span className="text-gray-500 ml-1">de tu ubicación</span>
          </div>
        )}
        
        {type === 'completed' && delivery.deliveryRating && (
          <div className="mt-2.5 flex items-center text-xs bg-yellow-50 rounded-lg p-1.5 px-2">
            <Star size={12} className="text-yellow-500 mr-1.5" />
            <span className="font-medium">Calificación: {delivery.deliveryRating.toFixed(1)}</span>
            <div className="ml-1.5 flex">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`text-xs ${i < Math.round(delivery.deliveryRating) ? "text-yellow-500" : "text-gray-300"}`}>★</span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {renderActions()}
    </div>
  );
};

export default DeliveryCard;
