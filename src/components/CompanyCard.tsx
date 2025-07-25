
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock, Award } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
  location: string;
  responseTime: string;
  specialties: string[];
  verified: boolean;
}

interface CompanyCardProps {
  company: Company;
  onSelect?: (company: Company) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onSelect }) => {
  const navigate = useNavigate();

  const handleCompanyClick = () => {
    if (onSelect) {
      onSelect(company);
    }
    navigate(`/company/${company.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
         onClick={handleCompanyClick}>
      <div className="flex items-start space-x-4">
        <div className="relative">
          <img 
            src={company.logo} 
            alt={company.name}
            className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
          />
          {company.verified && (
            <div className="absolute -top-2 -right-2 bg-primary-500 rounded-full p-1">
              <Award className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
          
          <div className="flex items-center space-x-1 mt-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium text-gray-700">{company.rating}</span>
            <span className="text-sm text-gray-500">({company.reviewCount} reseñas)</span>
          </div>
          
          <div className="flex items-center space-x-1 mt-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{company.location}</span>
          </div>
          
          <div className="flex items-center space-x-1 mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Responde en {company.responseTime}</span>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-3">
            {company.specialties.slice(0, 3).map((specialty, index) => (
              <span key={index} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                {specialty}
              </span>
            ))}
            {company.specialties.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{company.specialties.length - 3} más
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCard;
