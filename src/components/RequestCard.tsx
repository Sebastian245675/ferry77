import React from 'react';
import { Calendar, MapPin, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface RequestItem {
  name: string;
  quantity: number;
  specifications?: string;
}

interface Request {
  id: string;
  title: string;
  items: RequestItem[];
  profession: 'carpintería' | 'construcción' | 'eléctrico' | string;
  location: string;
  urgency: 'baja' | 'media' | 'alta' | string;
  budget: number;
  status: 'pendiente' | 'confirmado' | 'cotizando' | 'completado' | 'cancelado' | string;
  createdAt: string | any;
  quotesCount: number;
}

interface RequestCardProps {
  request: Request;
  onViewDetails: (request: Request) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'confirmado': return 'bg-blue-100 text-blue-800';
      case 'cotizando': return 'bg-blue-100 text-blue-800';
      case 'completado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'alta': return 'text-red-600';
      case 'media': return 'text-orange-600';
      case 'baja': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getProfessionIcon = (profession: string) => {
    return '🔧'; // Simplified for now
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 sm:p-4 md:p-5 lg:p-6 hover:shadow-lg transition-all cursor-pointer"
         onClick={() => onViewDetails(request)}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-0">
          <span className="text-xl sm:text-2xl">{getProfessionIcon(request.profession || '')}</span>
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 line-clamp-1">{request.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 capitalize">{request.profession || 'general'}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 sm:mt-0 ${getStatusColor(request.status || 'pendiente')}`}>
          {request.status === 'confirmado' ? 'cotizando' : request.status}
        </span>
      </div>

      <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Fecha y Ubicación en la misma línea en mobile */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 mr-3">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate max-w-[80px] sm:max-w-none">{request.createdAt ? new Date(request.createdAt.seconds ? request.createdAt.seconds * 1000 : request.createdAt).toLocaleDateString() : 'N/D'}</span>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="truncate max-w-[80px] sm:max-w-none">{request.location || 'Sin ubicación'}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Urgencia y Presupuesto en la misma línea en mobile */}
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm mr-3">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            <span className={getUrgencyColor(request.urgency || 'media')}>
              {request.urgency || 'media'}
            </span>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>$&nbsp;{(request.budget || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-2 sm:pt-3 md:pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs sm:text-sm text-gray-600">
            {request.items && request.items.length ? `${request.items.length} ${request.items.length === 1 ? 'art.' : 'arts.'}` : 'Sin arts.'}
          </div>
          <div className="text-xs sm:text-sm font-medium text-primary-600">
            {request.quotesCount || 0} {(request.quotesCount || 0) === 1 ? 'cotiz.' : 'cotiz.'}
          </div>
        </div>
        
        <div className="mt-1 sm:mt-2">
          <div className="text-xs text-gray-500 mb-1 hidden sm:block">Artículos principales:</div>
          <div className="flex flex-wrap gap-1">
            {request.items.slice(0, 2).map((item, index) => (
              <span key={index} className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 text-2xs sm:text-xs rounded truncate max-w-full">
                {item.quantity}x&nbsp;<span className="truncate">{item.name}</span>
              </span>
            ))}
            {request.items.length > 2 && (
              <span className="px-1 sm:px-2 py-0.5 sm:py-1 bg-primary-50 text-primary-700 text-2xs sm:text-xs rounded">
                +{request.items.length - 2} más
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
