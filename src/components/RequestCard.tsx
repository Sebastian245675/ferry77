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
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all cursor-pointer"
         onClick={() => onViewDetails(request)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getProfessionIcon(request.profession || '')}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
            <p className="text-sm text-gray-600 capitalize">{request.profession || 'general'}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status || 'pendiente')}`}>
          {request.status === 'confirmado' ? 'cotizando' : request.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{request.createdAt ? new Date(request.createdAt.seconds ? request.createdAt.seconds * 1000 : request.createdAt).toLocaleDateString() : 'Fecha no disponible'}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{request.location || 'Ubicación no especificada'}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={getUrgencyColor(request.urgency || 'media')}>
            Urgencia {request.urgency || 'media'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>Presupuesto: ${(request.budget || 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {request.items && request.items.length ? `${request.items.length} ${request.items.length === 1 ? 'artículo' : 'artículos'}` : 'Sin artículos'}
          </div>
          <div className="text-sm font-medium text-primary-600">
            {request.quotesCount || 0} {(request.quotesCount || 0) === 1 ? 'cotización' : 'cotizaciones'}
          </div>
        </div>
        
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Artículos principales:</div>
          <div className="flex flex-wrap gap-1">
            {request.items.slice(0, 3).map((item, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {item.quantity}x {item.name}
              </span>
            ))}
            {request.items.length > 3 && (
              <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded">
                +{request.items.length - 3} más
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
