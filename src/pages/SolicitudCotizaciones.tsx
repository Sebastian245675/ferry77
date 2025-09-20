import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Star, Verified, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';

interface Proposal {
  id: number;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  companyRating?: number;
  companyVerified?: boolean;
  totalPrice: number;
  deliveryTime: string;
  status: string;
  createdAt: string;
  itemsCount: number;
}

interface Solicitud {
  id: number;
  titulo: string;
  usuarioId: string;
  items: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    especificaciones?: string;
  }>;
  profesion: string;
  ubicacion: string;
  presupuesto: number;
  estado: string;
  fechaCreacion: string;
}

// Función para formatear precios
const formatPrice = (price: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: currency
  }).format(price);
};

const SolicitudCotizaciones: React.FC = () => {
  const { solicitudId } = useParams<{ solicitudId: string }>();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!solicitudId) return;

      try {
        setLoading(true);

        // 1. Cargar información de la solicitud
        const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${solicitudId}`);
        if (solicitudResponse.ok) {
          const solicitudData = await solicitudResponse.json();
          setSolicitud(solicitudData);
        }

        // 2. Cargar cotizaciones para esta solicitud
        const proposalsResponse = await fetch(`http://localhost:8090/api/proposals/solicitud/${solicitudId}`);
        if (proposalsResponse.ok) {
          const proposalsData = await proposalsResponse.json();
          console.log('📊 Datos de cotizaciones recibidos:', proposalsData);
          
          // 3. Para cada cotización, enriquecer con datos de la empresa
          const enrichedProposals = await Promise.all(
            proposalsData.map(async (proposal: any) => {
              console.log('🔍 Procesando cotización:', proposal);
              try {
                // Obtener información de la empresa por ID numérico
                console.log('🔍 Buscando empresa con ID:', proposal.companyId);
                const companyResponse = await fetch(`http://localhost:8090/api/usuarios/${proposal.companyId}`);
                let companyData = null;
                
                if (companyResponse.ok) {
                  companyData = await companyResponse.json();
                  console.log('✅ Empresa encontrada:', companyData);
                } else {
                  console.error('❌ Error obteniendo empresa:', companyResponse.status, companyResponse.statusText);
                  // Intentar buscar por Firebase UID si el ID numérico no funciona
                  try {
                    const fallbackResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${proposal.companyId}`);
                    if (fallbackResponse.ok) {
                      companyData = await fallbackResponse.json();
                      console.log('✅ Empresa encontrada por Firebase UID:', companyData);
                    }
                  } catch (fallbackError) {
                    console.warn('⚠️ Fallback también falló:', fallbackError);
                  }
                }
                
                console.log('🏢 Datos finales de empresa para companyId', proposal.companyId, ':', companyData);
                console.log('📝 Campos de empresa:', {
                  companyName: companyData?.companyName,
                  nick: companyData?.nick,
                  nombreCompleto: companyData?.nombreCompleto,
                  userType: companyData?.userType
                });

                // Si no hay datos de empresa, usar datos básicos
                let finalCompanyData = companyData;

                // Determinar el mejor nombre para la empresa
                let displayName;
                if (proposal.companyName) {
                  // Usar el nombre que viene directamente de la propuesta (guardado al crear)
                  displayName = proposal.companyName;
                } else if (finalCompanyData?.companyName) {
                  displayName = finalCompanyData.companyName;
                } else if (finalCompanyData?.nick) {
                  displayName = finalCompanyData.nick;
                } else if (finalCompanyData?.userType === 'empresa') {
                  // Si es empresa pero no tiene nombre comercial, usar un nombre genérico
                  displayName = `Empresa de ${finalCompanyData?.nombreCompleto?.split(' ')[0] || 'Servicios'}`;
                } else {
                  displayName = `Empresa #${proposal.companyId}`;
                }

                console.log('🏷️ Nombre final seleccionado:', displayName);

                const enriched = {
                  id: proposal.id,
                  companyId: proposal.companyId,
                  companyName: displayName,
                  companyLogo: finalCompanyData?.logo || finalCompanyData?.logoUrl,
                  companyRating: finalCompanyData?.rating || 4.5,
                  companyVerified: finalCompanyData?.verified || false,
                  totalPrice: proposal.total || proposal.totalPrice || 0,
                  deliveryTime: proposal.deliveryDays ? `${proposal.deliveryDays} días` : 
                               (proposal.deliveryTime || proposal.tiempoEntrega || '2-3 días'),
                  status: proposal.status,
                  createdAt: proposal.createdAt,
                  itemsCount: proposal.items ? proposal.items.length : 1,
                  currency: proposal.currency || 'COP'
                };
                
                console.log('✅ Cotización enriquecida:', enriched);
                return enriched;
              } catch (error) {
                console.error(`Error enriqueciendo propuesta ${proposal.id}:`, error);
                return {
                  id: proposal.id,
                  companyId: proposal.companyId,
                  companyName: proposal.companyName || 'Empresa',
                  companyLogo: null,
                  companyRating: 4.5,
                  companyVerified: false,
                  totalPrice: proposal.totalPrice,
                  deliveryTime: proposal.deliveryTime || '2-3 días',
                  status: proposal.status,
                  createdAt: proposal.createdAt,
                  itemsCount: 0
                };
              }
            })
          );

          // Ordenar por precio (menor a mayor)
          enrichedProposals.sort((a, b) => a.totalPrice - b.totalPrice);
          setProposals(enrichedProposals);
        }

      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [solicitudId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-16 pb-20 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => navigate('/requests')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Cotizaciones recibidas</h1>
              <p className="text-sm text-gray-500">
                {proposals.length} empresa{proposals.length !== 1 ? 's han' : ' ha'} cotizado tu solicitud
              </p>
            </div>
          </div>

          {/* Información de la solicitud */}
          {solicitud && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="font-medium text-gray-900 mb-2">{solicitud.titulo}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Ubicación:</span>
                  <p className="font-medium">{solicitud.ubicacion}</p>
                </div>
                <div>
                  <span className="text-gray-500">Profesión:</span>
                  <p className="font-medium capitalize">{solicitud.profesion}</p>
                </div>
                <div>
                  <span className="text-gray-500">Tu presupuesto:</span>
                  <p className="font-medium">{formatPrice(solicitud.presupuesto)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Items:</span>
                  <p className="font-medium">{solicitud.items.length} producto{solicitud.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de empresas que cotizaron */}
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin cotizaciones aún</h3>
              <p className="text-gray-500">Las empresas pronto enviarán sus propuestas</p>
            </div>
          ) : (
            proposals.map((proposal, index) => (
              <div 
                key={proposal.id} 
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/cotizacion-detalle/${proposal.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Logo de la empresa */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {proposal.companyLogo ? (
                        <img 
                          src={proposal.companyLogo} 
                          alt={proposal.companyName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-500" />
                      )}
                    </div>

                    {/* Información de la empresa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{proposal.companyName}</h3>
                        {proposal.companyVerified && (
                          <Verified className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span>{proposal.companyRating}</span>
                        </div>
                        <span>•</span>
                        <span>{formatDate(proposal.createdAt)}</span>
                        <span>•</span>
                        <span>{proposal.itemsCount} item{proposal.itemsCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Precio y botón */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatPrice(proposal.totalPrice)}</p>
                      <p className="text-xs text-gray-500">{proposal.deliveryTime}</p>
                      {index === 0 && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                          Mejor precio
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comparación de precios */}
        {proposals.length > 1 && solicitud && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-3">Comparación de precios</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Precio más bajo:</span>
                <span className="font-semibold text-green-600">{formatPrice(proposals[0].totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Precio más alto:</span>
                <span className="font-semibold text-gray-900">{formatPrice(proposals[proposals.length - 1].totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tu presupuesto:</span>
                <span className="font-semibold text-blue-600">{formatPrice(solicitud.presupuesto)}</span>
              </div>
              {proposals[0].totalPrice < solicitud.presupuesto && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-500">Podrías ahorrar hasta:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice(solicitud.presupuesto - proposals[0].totalPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default SolicitudCotizaciones;