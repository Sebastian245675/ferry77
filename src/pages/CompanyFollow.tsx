
import React, { useState } from 'react';
import { Star, StarOff, MessageSquare, MapPin, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CompanyFollow = () => {
  const [followedCompanies, setFollowedCompanies] = useState([
    {
      id: 1,
      name: 'Ferretería San Miguel',
      logo: 'https://ui-avatars.com/api/?name=Ferreteria+San+Miguel&background=3b82f6&color=fff',
      rating: 4.8,
      location: 'San Isidro, Buenos Aires',
      responseTime: '2 horas promedio',
      phone: '+54 11 4567-8901',
      specialties: ['Carpintería', 'Construcción'],
      followed: true,
      lastQuote: '2 días atrás',
      completedOrders: 12
    },
    {
      id: 2,
      name: 'ToolPro Argentina',
      logo: 'https://ui-avatars.com/api/?name=ToolPro+Argentina&background=10b981&color=fff',
      rating: 4.6,
      location: 'Vicente López, Buenos Aires',
      responseTime: '1 hora promedio',
      phone: '+54 11 5678-9012',
      specialties: ['Eléctrico', 'Herramientas Pro'],
      followed: true,
      lastQuote: '1 semana atrás',
      completedOrders: 8
    }
  ]);

  const toggleFollow = (companyId) => {
    setFollowedCompanies(companies =>
      companies.map(company =>
        company.id === companyId
          ? { ...company, followed: !company.followed }
          : company
      )
    );
  };

  const sendMessage = (companyId) => {
    console.log('Send message to company:', companyId);
    // Aquí abriríamos el chat con la empresa
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Empresas Seguidas</h1>
        <p className="text-gray-600">Mantén contacto con tus empresas de confianza</p>
      </div>

      <div className="space-y-4">
        {followedCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-16 h-16 rounded-full"
                />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{company.rating}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{company.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Responde en {company.responseTime}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>{company.phone}</span>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {company.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 mt-4 text-sm">
                    <div className="bg-green-50 px-3 py-1 rounded-full">
                      <span className="text-green-700 font-medium">
                        {company.completedOrders} pedidos completados
                      </span>
                    </div>
                    <span className="text-gray-500">
                      Última cotización: {company.lastQuote}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2">
                <Button
                  onClick={() => toggleFollow(company.id)}
                  variant={company.followed ? "outline" : "default"}
                  size="sm"
                  className={company.followed ? "text-blue-600 border-blue-200" : ""}
                >
                  {company.followed ? (
                    <>
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <StarOff className="w-4 h-4 mr-1" />
                      Seguir
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => sendMessage(company.id)}
                  variant="outline"
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Mensaje
                </Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Actividad Reciente</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• Envió cotización para "Herramientas para Deck" - 2 días</p>
                <p>• Completó pedido #1234 - 1 semana</p>
                <p>• Respondió consulta sobre disponibilidad - 2 semanas</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {followedCompanies.length === 0 && (
        <div className="text-center py-12">
          <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sigues ninguna empresa</h3>
          <p className="text-gray-600 mb-4">
            Encuentra empresas que te gusten y síguelas para recibir sus últimas ofertas
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Explorar Empresas
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyFollow;
