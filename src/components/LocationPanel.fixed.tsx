import React from 'react';
import { MapPin, ChevronDown, Building, LayoutGrid, Home, Globe, ExternalLink } from 'lucide-react';

const LocationPanel = ({ 
  isEditing, 
  profileData, 
  setProfileData, 
  setShowLocationPanel, 
  showLocationPanel 
}) => {
  // Si estamos en modo edición, mostramos el panel con el icono clickeable
  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex items-center w-full border rounded p-2 cursor-pointer bg-gradient-to-r from-white to-primary-50" 
             onClick={() => setShowLocationPanel(!showLocationPanel)}>
          <div className="flex-grow">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-primary-600 mr-2" />
              <input 
                className="w-full bg-transparent border-none focus:outline-none cursor-pointer"
                readOnly 
                value={profileData.location || "Establecer ubicación"} 
                placeholder="Ubicación (Haz clic para expandir)"
              />
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${showLocationPanel ? 'transform rotate-180' : ''}`} />
          </div>
        </div>
        
        {/* Panel desplegable de ubicación */}
        {showLocationPanel && (
          <div className="absolute left-0 right-0 z-30 mt-2 p-4 bg-white rounded-lg shadow-2xl border border-primary-100 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-medium text-primary-700">Detalles de ubicación</h3>
              </div>
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full">
                Nueva función
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Entrada para Ciudad */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                    <Building className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                    value={profileData.ubicompleta.ciudad} 
                    onChange={e => setProfileData({ 
                      ...profileData, 
                      ubicompleta: {...profileData.ubicompleta, ciudad: e.target.value} 
                    })} 
                    placeholder="Ej: Bogotá, Medellín, Buenos Aires..." 
                  />
                </div>
              </div>
              
              {/* Entrada para Localidad */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Localidad/Municipio</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                    <LayoutGrid className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                    value={profileData.ubicompleta.localidad} 
                    onChange={e => setProfileData({ 
                      ...profileData, 
                      ubicompleta: {...profileData.ubicompleta, localidad: e.target.value} 
                    })} 
                    placeholder="Ej: Chapinero, Recoleta, Miraflores..." 
                  />
                </div>
              </div>
              
              {/* Entrada para Barrio */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Barrio/Colonia</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                    <Home className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                    value={profileData.ubicompleta.barrio} 
                    onChange={e => setProfileData({ 
                      ...profileData, 
                      ubicompleta: {...profileData.ubicompleta, barrio: e.target.value} 
                    })} 
                    placeholder="Ej: Palermo, Condesa, El Poblado..." 
                  />
                </div>
              </div>
              
              {/* Entrada para Número de Casa */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dirección específica</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </span>
                  <input 
                    className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                    value={profileData.ubicompleta.numeroCasa} 
                    onChange={e => setProfileData({ 
                      ...profileData, 
                      ubicompleta: {...profileData.ubicompleta, numeroCasa: e.target.value} 
                    })} 
                    placeholder="Calle, número, apartamento, etc." 
                  />
                </div>
              </div>
              
              {/* Entrada para Especificaciones Adicionales */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Referencias adicionales</label>
                <textarea 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                  value={profileData.ubicompleta.especificaciones} 
                  onChange={e => setProfileData({ 
                    ...profileData, 
                    ubicompleta: {...profileData.ubicompleta, especificaciones: e.target.value} 
                  })} 
                  placeholder="Puntos de referencia, indicaciones, etc." 
                  rows={2} 
                />
              </div>
              
              {/* Enlace de Google Maps */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Enlace de Google Maps</label>
                <div className="flex">
                  <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                    </span>
                    <input 
                      className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary-300 focus:border-primary-500" 
                      value={profileData.ubicompleta.enlaceGoogleMaps} 
                      onChange={e => setProfileData({ 
                        ...profileData, 
                        ubicompleta: {...profileData.ubicompleta, enlaceGoogleMaps: e.target.value} 
                      })} 
                      placeholder="https://maps.google.com/?q=..." 
                    />
                  </div>
                  {profileData.ubicompleta.enlaceGoogleMaps && (
                    <a 
                      href={profileData.ubicompleta.enlaceGoogleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-3 border border-l-0 border-gray-300 bg-primary-50 text-primary-600 rounded-r-md hover:bg-primary-100"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                {/* Botones para generar y verificar ubicación */}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Generar enlace de Google Maps basado en los datos ingresados
                      const direccionCompleta = [
                        profileData.ubicompleta.numeroCasa,
                        profileData.ubicompleta.barrio,
                        profileData.ubicompleta.localidad,
                        profileData.ubicompleta.ciudad
                      ].filter(Boolean).join(', ');
                      
                      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`;
                      
                      setProfileData({
                        ...profileData,
                        ubicompleta: {...profileData.ubicompleta, enlaceGoogleMaps: googleMapsUrl}
                      });
                    }}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-1 px-2 rounded text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    Generar enlace
                  </button>
                  <a
                    href={profileData.ubicompleta.enlaceGoogleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([profileData.ubicompleta.ciudad, profileData.ubicompleta.localidad].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 py-1 px-2 rounded text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Verificar ubicación
                  </a>
                </div>
              </div>
              
              {/* Información para ingresar ubicación manualmente */}
              <div className="mt-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Ingresa tu ubicación manualmente</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Para mejores resultados, completa todos los campos de ubicación con información precisa.
                      </p>
                      <div className="mt-2 bg-white p-2 rounded border border-blue-100">
                        <p className="text-xs text-gray-600">
                          ✓ Ingresa tu ciudad<br />
                          ✓ Especifica tu barrio o zona<br />
                          ✓ Añade tu dirección completa para mayor precisión
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Opciones adicionales de ubicación */}
              <div className="mt-3 bg-gray-50 p-2 rounded-md border border-gray-200">
                <h4 className="text-xs font-medium text-gray-600 mb-2">Opciones de ubicación:</h4>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Abrir directamente Google Maps para seleccionar ubicación manualmente
                      window.open('https://www.google.com/maps', '_blank');
                    }}
                    className="flex items-center text-xs bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded"
                  >
                    <Globe className="w-3 h-3 mr-2 text-blue-500" />
                    <span>Abrir Google Maps y seleccionar manualmente</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      // Opción para generar un enlace de OpenStreetMap manualmente
                      const direccion = prompt('Ingresa tu dirección para generar un enlace de mapa:');
                      if (direccion) {
                        const mapsUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(direccion)}`;
                        setProfileData({
                          ...profileData,
                          ubicompleta: {
                            ...profileData.ubicompleta,
                            enlaceGoogleMaps: mapsUrl
                          }
                        });
                        // Alerta para confirmar
                        alert('Enlace de mapa generado. Por favor verifica que sea correcto haciendo clic en "Verificar ubicación".');
                      }
                    }}
                    className="flex items-center text-xs bg-white border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded"
                  >
                    <MapPin className="w-3 h-3 mr-2 text-green-500" />
                    <span>Generar enlace de mapa con dirección</span>
                  </button>
                </div>
              </div>
              
              {/* Previsualización del mapa (opcional) */}
              {profileData.ubicompleta.enlaceGoogleMaps && (
                <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                  <div className="p-2 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-primary-500 mr-1" />
                      <span className="text-xs text-gray-700 font-medium">Ubicación guardada</span>
                    </div>
                    <a 
                      href={profileData.ubicompleta.enlaceGoogleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Ver en Google Maps
                    </a>
                  </div>
                  
                  {/* Alerta de verificación de ubicación */}
                  <div className="p-2 bg-yellow-50 border-t border-yellow-100">
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs text-yellow-700 font-medium">Verifica que la ubicación sea correcta</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Si la ubicación no es correcta, puedes:
                          <br />1. Editar manualmente la dirección
                          <br />2. Copiar directamente un enlace de Google Maps
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => window.open(profileData.ubicompleta.enlaceGoogleMaps, '_blank')}
                        className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-2 py-1 rounded"
                      >
                        Verificar ahora
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Ubicación simple (oculta pero mantenida para compatibilidad) */}
        <input type="hidden" value={profileData.location} onChange={e => setProfileData({ ...profileData, location: e.target.value })} />
      </div>
    );
  }
  
  // Modo de visualización
  return (
    <div className="mt-6 relative">
      <div 
        className={`
          bg-white border rounded-lg shadow-md overflow-hidden cursor-pointer 
          transform transition-all duration-300 hover:shadow-lg
          ${(profileData.location || profileData.ubicompleta.ciudad) ? 'border-green-200' : 'border-gray-200'}
        `}
        onClick={() => setShowLocationPanel(!showLocationPanel)}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-full 
              ${(profileData.location || profileData.ubicompleta.ciudad) ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-500'}
            `}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium">
                {(profileData.location || profileData.ubicompleta.ciudad) ? 'Ubicación disponible' : 'Sin ubicación específica'}
              </h3>
              <p className="text-sm text-gray-500">
                {profileData.location || 
                  [
                    profileData.ubicompleta.ciudad, 
                    profileData.ubicompleta.localidad, 
                    profileData.ubicompleta.barrio
                  ].filter(Boolean).join(', ') || 
                  'Haz clic para ver los detalles'}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showLocationPanel ? 'transform rotate-180' : ''}`} />
        </div>
        
        {/* Panel de detalles de ubicación */}
        {showLocationPanel && (
          <div className="bg-gray-50 border-t border-gray-100 p-4 animate-fadeIn">
            {(profileData.ubicompleta.ciudad || profileData.ubicompleta.localidad || profileData.ubicompleta.barrio || profileData.ubicompleta.numeroCasa) ? (
              <div className="space-y-3">
                {profileData.ubicompleta.ciudad && (
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <span className="text-xs text-gray-500">Ciudad</span>
                      <p className="font-medium">{profileData.ubicompleta.ciudad}</p>
                    </div>
                  </div>
                )}
                
                {profileData.ubicompleta.localidad && (
                  <div className="flex items-center">
                    <LayoutGrid className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <span className="text-xs text-gray-500">Localidad/Municipio</span>
                      <p className="font-medium">{profileData.ubicompleta.localidad}</p>
                    </div>
                  </div>
                )}
                
                {profileData.ubicompleta.barrio && (
                  <div className="flex items-center">
                    <Home className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <span className="text-xs text-gray-500">Barrio</span>
                      <p className="font-medium">{profileData.ubicompleta.barrio}</p>
                    </div>
                  </div>
                )}
                
                {profileData.ubicompleta.numeroCasa && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <span className="text-xs text-gray-500">Dirección</span>
                      <p className="font-medium">{profileData.ubicompleta.numeroCasa}</p>
                    </div>
                  </div>
                )}
                
                {profileData.ubicompleta.especificaciones && (
                  <div className="flex items-start mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="text-xs text-gray-500">Referencias adicionales</span>
                      <p className="text-sm">{profileData.ubicompleta.especificaciones}</p>
                    </div>
                  </div>
                )}
                
                {profileData.ubicompleta.enlaceGoogleMaps && (
                  <div className="mt-3 space-y-2">
                    <a 
                      href={profileData.ubicompleta.enlaceGoogleMaps} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full bg-primary-50 hover:bg-primary-100 text-primary-600 py-2 px-4 rounded-md border border-primary-200 transition-colors"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Ver en Google Maps
                    </a>
                    
                    {/* Verificación de ubicación */}
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-yellow-700">¿La ubicación es correcta?</p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Verifica que el mapa te lleve a la dirección correcta. Si no es así, activa el modo de edición para corregirla.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay detalles de ubicación disponibles</p>
                <p className="text-sm text-gray-400 mt-1">Activa el modo de edición para agregar tu ubicación</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPanel;
