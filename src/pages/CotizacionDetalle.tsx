import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Star, Verified, Phone, MessageCircle, Clock, CheckCircle, Package, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import '../styles/cotizacion-detalle.css';

interface ProposalItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  comments?: string;
}

interface ProposalDetail {
  id: number;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  companyRating?: number;
  companyVerified?: boolean;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  totalPrice: number;
  deliveryTime: string;
  status: string;
  items: ProposalItem[];
  createdAt: string;
  notes?: string;
  validUntil?: string;
  // Campos para QuickResponse
  isQuickResponse?: boolean;
  responseType?: string;
  message?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
}

interface Solicitud {
  id: number;
  titulo: string;
  items: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    especificaciones?: string;
  }>;
}

const CotizacionDetalle: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const isQuickResponse = searchParams.get('type') === 'quick';

  useEffect(() => {
    const loadData = async () => {
      if (!proposalId) return;

      try {
        setLoading(true);

        // Verificar si es una QuickResponse
        if (isQuickResponse) {
          console.log('🚀 Cargando QuickResponse ID:', proposalId);
          
          // 1. Cargar datos de la QuickResponse
          const quickResponse = await fetch(`http://localhost:8090/api/proposals/quick-responses/${proposalId}`);
          if (quickResponse.ok) {
            const quickData = await quickResponse.json();
            console.log('📦 Datos de QuickResponse:', quickData);

            // 2. Obtener información de la empresa
            const companyResponse = await fetch(`http://localhost:8090/api/usuarios/${quickData.companyId}`);
            const companyData = companyResponse.ok ? await companyResponse.json() : null;

            // 3. Obtener información de la solicitud
            const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${quickData.solicitudId}`);
            const solicitudData = solicitudResponse.ok ? await solicitudResponse.json() : null;
            setSolicitud(solicitudData);

            // Determinar el mejor nombre para la empresa
            let displayName = quickData.companyName;
            if (companyData?.companyName) {
              displayName = companyData.companyName;
            } else if (companyData?.nick) {
              displayName = companyData.nick;
            }

            const enrichedProposal: ProposalDetail = {
              id: quickData.id,
              companyId: quickData.companyId,
              companyName: displayName,
              companyLogo: companyData?.logo,
              companyRating: companyData?.rating || 4.5,
              companyVerified: companyData?.verified || false,
              companyPhone: companyData?.telefono,
              companyEmail: companyData?.email,
              companyAddress: companyData?.direccion,
              totalPrice: 0, // QuickResponse no tiene precio hasta que se negocie
              deliveryTime: 'Por definir',
              status: quickData.status || 'SENT',
              items: [],
              createdAt: quickData.createdAt,
              notes: quickData.message,
              // Campos específicos de QuickResponse
              isQuickResponse: true,
              responseType: quickData.responseType,
              message: quickData.message,
              fileName: quickData.fileName,
              fileUrl: quickData.fileUrl,
              fileType: quickData.fileType
            };

            console.log('✅ QuickResponse enriquecida:', enrichedProposal);
            setProposal(enrichedProposal);
            setLoading(false);
            return;
          }
        }

        // Lógica original para cotizaciones tradicionales        // 1. Cargar detalles de la cotización
        const proposalResponse = await fetch(`http://localhost:8090/api/proposals/${proposalId}`);
        if (proposalResponse.ok) {
          const proposalData = await proposalResponse.json();
          console.log('🔍 Datos de propuesta recibidos:', proposalData);

          // 2. Obtener información de la empresa
          const companyResponse = await fetch(`http://localhost:8090/api/usuarios/${proposalData.companyId}`);
          const companyData = companyResponse.ok ? await companyResponse.json() : null;

          // 3. Obtener información de la solicitud
          const solicitudResponse = await fetch(`http://localhost:8090/api/solicitudes/${proposalData.solicitudId}`);
          const solicitudData = solicitudResponse.ok ? await solicitudResponse.json() : null;
          setSolicitud(solicitudData);

          // Determinar el mejor nombre para la empresa
          let displayName;
          if (companyData?.companyName) {
            displayName = companyData.companyName;
          } else if (companyData?.nick) {
            displayName = companyData.nick;
          } else if (companyData?.userType === 'empresa') {
            // Si es empresa pero no tiene nombre comercial, usar un nombre genérico
            displayName = `Empresa de ${companyData?.nombreCompleto?.split(' ')[0] || 'Servicios'}`;
          } else {
            displayName = 'Empresa';
          }

          // Asegurar que totalPrice sea un número válido
          const validTotalPrice = proposalData.totalPrice && !isNaN(proposalData.totalPrice) 
            ? Number(proposalData.totalPrice) 
            : 0;

          // Normalizar el estado - muchas propuestas nuevas tienen estado null o undefined
          let normalizedStatus = proposalData.status;
          if (!normalizedStatus || normalizedStatus === 'null' || normalizedStatus === '') {
            normalizedStatus = 'pending'; // Estado por defecto para propuestas nuevas
          }

          console.log('📊 Estado original:', proposalData.status, '-> Estado normalizado:', normalizedStatus);
          console.log('💰 Precio original:', proposalData.totalPrice, '-> Precio normalizado:', validTotalPrice);

          const enrichedProposal = {
            id: proposalData.id,
            companyId: proposalData.companyId,
            companyName: displayName,
            companyLogo: companyData?.logo,
            companyRating: companyData?.rating || 4.5,
            companyVerified: companyData?.verified || false,
            companyPhone: companyData?.telefono,
            companyEmail: companyData?.email,
            companyAddress: companyData?.direccion,
            totalPrice: validTotalPrice,
            deliveryTime: proposalData.deliveryTime || '2-3 días',
            status: normalizedStatus,
            items: proposalData.items || [],
            createdAt: proposalData.createdAt,
            notes: proposalData.notes,
            validUntil: proposalData.validUntil
          };

          console.log('🔧 Propuesta enriquecida:', enrichedProposal);

          setProposal(enrichedProposal);
        }

      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [proposalId]);

  const formatPrice = (price: number) => {
    // Verificar si el precio es válido
    if (!price || isNaN(price) || price === null || price === undefined) {
      return 'Precio por definir';
    }
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAcceptProposal = async () => {
    if (!proposal || !proposalId) return;

    const confirmAction = window.confirm('¿Estás seguro de que quieres aceptar esta cotización? Se enviará un correo a la empresa con tus datos de contacto.');
    if (!confirmAction) return;

    try {
      // 1. Actualizar el estado de la propuesta a "confirmada"
      const updateResponse = await fetch(`http://localhost:8090/api/proposals/${proposalId}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'confirmada',
          acceptedAt: new Date().toISOString()
        })
      });

      if (updateResponse.ok) {
        // 2. Actualizar el estado local
        setProposal(prev => prev ? { ...prev, status: 'confirmada' } : null);

        // 3. Enviar notificación/email a la empresa
        const notificationResponse = await fetch(`http://localhost:8090/api/notifications/proposal-accepted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proposalId: proposalId,
            companyId: proposal.companyId,
            message: 'Tu cotización ha sido aceptada por el cliente'
          })
        });

        if (notificationResponse.ok) {
          alert('✅ Cotización aceptada exitosamente. Se ha enviado una notificación a la empresa.');
        } else {
          alert('✅ Cotización aceptada, pero hubo un problema enviando la notificación a la empresa.');
        }
      } else {
        throw new Error('Error al actualizar la cotización');
      }
    } catch (error) {
      console.error('Error al aceptar cotización:', error);
      alert('❌ Error al aceptar la cotización. Por favor intenta de nuevo.');
    }
  };

  const handleRejectProposal = async () => {
    if (!proposal || !proposalId) return;

    const confirmAction = window.confirm('¿Estás seguro de que quieres rechazar esta cotización? Esta acción no se puede deshacer.');
    if (!confirmAction) return;

    try {
      // 1. Actualizar el estado de la propuesta a "rechazada"
      const updateResponse = await fetch(`http://localhost:8090/api/proposals/${proposalId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rechazada',
          rejectedAt: new Date().toISOString()
        })
      });

      if (updateResponse.ok) {
        // 2. Actualizar el estado local
        setProposal(prev => prev ? { ...prev, status: 'rechazada' } : null);

        // 3. Enviar notificación a la empresa
        const notificationResponse = await fetch(`http://localhost:8090/api/notifications/proposal-rejected`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proposalId: proposalId,
            companyId: proposal.companyId,
            message: 'Tu cotización ha sido rechazada por el cliente'
          })
        });

        if (notificationResponse.ok) {
          alert('❌ Cotización rechazada. Se ha enviado una notificación a la empresa.');
        } else {
          alert('❌ Cotización rechazada, pero hubo un problema enviando la notificación a la empresa.');
        }

        // 4. Redirigir de vuelta a la lista de cotizaciones después de un breve delay
        setTimeout(() => {
          navigate('/quotes');
        }, 2000);
      } else {
        throw new Error('Error al actualizar la cotización');
      }
    } catch (error) {
      console.error('Error al rechazar cotización:', error);
      alert('❌ Error al rechazar la cotización. Por favor intenta de nuevo.');
    }
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

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cotización no encontrada</h3>
          <button 
            onClick={() => navigate('/requests')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver a solicitudes
          </button>
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
        <div className="max-w-7xl mx-auto cotizacion-container">
          <div className="flex items-center gap-3 mb-6 fade-in-up">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 interactive-element focus-visible"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold text-gray-900">Detalle de cotización</h1>
              <p className="text-sm text-gray-500">Revisa todos los detalles de esta propuesta</p>
            </div>
          </div>

          {/* Layout responsivo principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna izquierda - Información principal */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Información de la empresa */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cotizacion-card info-card fade-in-up">
                <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 modern-shadow">
                    {proposal.companyLogo ? (
                      <img 
                        src={proposal.companyLogo} 
                        alt={proposal.companyName}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{proposal.companyName}</h2>
                      {proposal.companyVerified && (
                        <Verified className="h-6 w-6 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 font-medium">{proposal.companyRating} estrellas</span>
                    </div>
                    {proposal.companyAddress && (
                      <p className="text-sm text-gray-500 line-clamp-2">{proposal.companyAddress}</p>
                    )}
                  </div>
                </div>

                {/* Acciones de contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {proposal.companyPhone && (
                    <button 
                      onClick={() => window.open(`tel:${proposal.companyPhone}`)}
                      className="bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2 modern-shadow hover:modern-shadow-lg action-button interactive-element focus-visible"
                    >
                      <Phone className="h-4 w-4" />
                      Llamar
                    </button>
                  )}
                  <button 
                    onClick={() => navigate(`/messages?companyId=${proposal.companyId}`)}
                    className="bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 modern-shadow hover:modern-shadow-lg action-button interactive-element focus-visible"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Mensaje
                  </button>
                </div>
              </div>

              {/* Respuesta Rápida - Mostrar archivo/imagen adjunta */}
              {proposal.isQuickResponse && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-in-up">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      {proposal.responseType === 'image' && <ImageIcon className="h-5 w-5 text-purple-600" />}
                      {proposal.responseType === 'excel' && <FileSpreadsheet className="h-5 w-5 text-purple-600" />}
                      {proposal.responseType === 'message' && <MessageCircle className="h-5 w-5 text-purple-600" />}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                      {proposal.responseType === 'image' && 'Imagen de cotización'}
                      {proposal.responseType === 'excel' && 'Archivo de cotización'}
                      {proposal.responseType === 'message' && 'Mensaje de cotización'}
                    </h3>
                  </div>

                  {/* Mostrar mensaje si existe */}
                  {proposal.message && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{proposal.message}</p>
                    </div>
                  )}

                  {/* Mostrar imagen */}
                  {proposal.responseType === 'image' && proposal.fileUrl && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <img 
                        src={proposal.fileUrl} 
                        alt={proposal.fileName || 'Cotización'}
                        className="w-full h-auto rounded-lg shadow-md max-h-96 object-contain"
                        onError={(e) => {
                          console.error('Error cargando imagen:', proposal.fileUrl);
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {proposal.fileName && (
                        <p className="text-sm text-gray-500 mt-2 text-center">{proposal.fileName}</p>
                      )}
                      <div className="mt-4 flex justify-center">
                        <a 
                          href={proposal.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-all duration-200 flex items-center gap-2"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Ver imagen completa
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Mostrar archivo Excel */}
                  {proposal.responseType === 'excel' && proposal.fileUrl && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <FileSpreadsheet className="h-16 w-16 text-green-600 mx-auto mb-3" />
                      {proposal.fileName && (
                        <p className="text-sm font-medium text-gray-700 mb-3">{proposal.fileName}</p>
                      )}
                      <a 
                        href={proposal.fileUrl} 
                        download={proposal.fileName}
                        className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 inline-flex items-center gap-2"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Descargar archivo
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Productos cotizados */}
              {!proposal.isQuickResponse && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-6">Productos cotizados</h3>
                
                {proposal.items.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay productos especificados en esta cotización</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposal.items.map((item, index) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-2 truncate">{item.productName}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                              <span>Cantidad: <strong className="text-gray-900">{item.quantity}</strong></span>
                              <span>Precio unitario: <strong className="text-gray-900">{formatPrice(item.unitPrice)}</strong></span>
                            </div>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-lg md:text-xl font-bold text-green-600">{formatPrice(item.totalPrice)}</p>
                          </div>
                        </div>
                        
                        {item.comments && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-3">
                            <span className="text-sm font-medium text-gray-700">Comentarios:</span>
                            <p className="text-sm text-gray-600 mt-1">{item.comments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Total */}
                    <div className="border-t-2 border-gray-200 pt-4 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg md:text-xl font-semibold text-gray-900">Total:</span>
                        <span className="text-2xl md:text-3xl font-bold text-green-600">{formatPrice(proposal.totalPrice)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Comparación con lo solicitado */}
              {solicitud && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-6">Comparación con tu solicitud</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700 mb-3 block">Productos solicitados:</span>
                      <div className="space-y-3">
                        {solicitud.items.map((item) => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 p-4 rounded-lg gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{item.nombre}</span>
                                <span className="text-gray-500 text-sm">x{item.cantidad}</span>
                              </div>
                              {item.especificaciones && (
                                <p className="text-sm text-gray-500 line-clamp-2">{item.especificaciones}</p>
                              )}
                            </div>
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas adicionales */}
              {proposal.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Notas adicionales</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{proposal.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha - Resumen y acciones */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Resumen de la cotización */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24 sticky-sidebar modern-shadow fade-in-up">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-6">Resumen</h3>
                
                <div className="space-y-4 mb-6">
                  {!proposal.isQuickResponse && (
                  <div className="price-gradient rounded-lg p-4 text-white modern-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-white" />
                      <span className="text-sm font-medium text-white">Precio total</span>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{formatPrice(proposal.totalPrice)}</p>
                  </div>
                  )}

                  {proposal.isQuickResponse && (
                  <div className="bg-purple-100 rounded-lg p-4 border-2 border-purple-300 modern-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Respuesta Rápida</span>
                    </div>
                    <p className="text-sm text-purple-700">Esta empresa ha enviado una cotización rápida. Revisa la imagen o archivo adjunto para ver los detalles.</p>
                  </div>
                  )}
                  
                  <div className="delivery-gradient rounded-lg p-4 text-white modern-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-white" />
                      <span className="text-sm font-medium text-white">Tiempo de entrega</span>
                    </div>
                    <p className="text-lg md:text-xl font-semibold text-white">{proposal.deliveryTime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm border-t border-gray-200 pt-4">
                  <div>
                    <span className="text-gray-500 block mb-1">Fecha de cotización:</span>
                    <p className="font-medium text-gray-900">{formatDate(proposal.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-2">Estado:</span>
                    <span className={`inline-block px-3 py-2 rounded-full text-xs font-medium status-badge ${
                      proposal.status === 'pending' || !proposal.status ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      proposal.status === 'accepted' || proposal.status === 'aceptada' || proposal.status === 'confirmada' ? 'bg-green-100 text-green-800 border border-green-200' :
                      proposal.status === 'rejected' || proposal.status === 'rechazada' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {proposal.status === 'pending' || !proposal.status ? 'A la espera' : 
                       proposal.status === 'accepted' || proposal.status === 'aceptada' || proposal.status === 'confirmada' ? 'Aceptada' : 
                       proposal.status === 'rejected' || proposal.status === 'rechazada' ? 'Rechazada' :
                       'En revisión'}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-3 mt-6">
                  {/* Debug: Mostrar el estado actual */}
                  <div className="text-xs text-gray-500 mb-2">
                    Debug - Estado actual: '{proposal.status || 'undefined'}'
                  </div>
                  
                  {/* Mostrar botones si NO está confirmada o rechazada */}
                  {proposal.status !== 'confirmada' && proposal.status !== 'rechazada' && proposal.status !== 'accepted' && proposal.status !== 'aceptada' && (
                    <>
                      <button 
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 modern-shadow hover:modern-shadow-lg action-button interactive-element focus-visible"
                        onClick={() => handleAcceptProposal()}
                      >
                        ✅ Aceptar cotización
                      </button>
                      <button 
                        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-all duration-200 modern-shadow hover:modern-shadow-lg action-button interactive-element focus-visible"
                        onClick={() => handleRejectProposal()}
                      >
                        ❌ Rechazar cotización
                      </button>
                    </>
                  )}
                  
                  {(proposal.status === 'accepted' || proposal.status === 'aceptada' || proposal.status === 'confirmada') && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 font-medium">✅ Cotización aceptada</p>
                      <p className="text-green-600 text-sm mt-1">Se ha enviado un correo a la empresa con tus datos de contacto</p>
                    </div>
                  )}
                  
                  {(proposal.status === 'rejected' || proposal.status === 'rechazada') && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <p className="text-red-800 font-medium">❌ Cotización rechazada</p>
                      <p className="text-red-600 text-sm mt-1">Esta cotización fue rechazada anteriormente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default CotizacionDetalle;