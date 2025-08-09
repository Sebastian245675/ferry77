import React, { useEffect, useRef } from 'react';

interface MiniMapProps {
  centerLat: number;
  centerLng: number;
  markerLat: number;
  markerLng: number;
  pickupLat?: number;
  pickupLng?: number;
  zoom?: number;
  showRoute?: boolean;
}

const DeliveryMiniMap = ({ 
  centerLat, 
  centerLng, 
  markerLat, 
  markerLng, 
  pickupLat, 
  pickupLng, 
  zoom = 14,
  showRoute = false 
}: MiniMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    // Esta función inicializa el mapa
    const initMap = () => {
      if (!mapRef.current) return;
      
      // Verificar si la API de Google Maps está disponible
      if (typeof window['google'] === 'undefined') {
        // Si no está disponible, intentar cargar la API
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => createMap();
        document.head.appendChild(script);
      } else {
        // Si ya está disponible, crear el mapa directamente
        createMap();
      }
    };

    const createMap = () => {
      if (!mapRef.current || typeof window['google'] === 'undefined') return;

      // Determinar el centro del mapa
      let mapCenter = { lat: centerLat, lng: centerLng };

      // Si tenemos ubicaciones de recogida y entrega, centrar el mapa para mostrar ambos
      if (pickupLat && pickupLng) {
        mapCenter = {
          lat: (pickupLat + markerLat) / 2,
          lng: (pickupLng + markerLng) / 2
        };
      }

      // Crear el mapa
      const mapOptions: any = {
        center: mapCenter,
        zoom: zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      };

      googleMapRef.current = new window['google'].maps.Map(mapRef.current, mapOptions);

      // Añadir marcador de entrega (destino)
      const deliveryMarkerOptions: any = {
        position: { lat: markerLat, lng: markerLng },
        map: googleMapRef.current,
        animation: window['google'].maps.Animation.DROP,
        title: 'Ubicación de entrega (destino)',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window['google'].maps.Size(40, 40)
        }
      };

      deliveryMarkerRef.current = new window['google'].maps.Marker(deliveryMarkerOptions);

      // Añadir marcador de recogida si existe
      if (pickupLat && pickupLng) {
        const pickupMarkerOptions: any = {
          position: { lat: pickupLat, lng: pickupLng },
          map: googleMapRef.current,
          animation: window['google'].maps.Animation.DROP,
          title: 'Ubicación de recogida (origen)',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new window['google'].maps.Size(40, 40)
          }
        };

        pickupMarkerRef.current = new window['google'].maps.Marker(pickupMarkerOptions);

        // Si se debe mostrar la ruta
        if (showRoute) {
          const path = [
            { lat: pickupLat, lng: pickupLng },
            { lat: markerLat, lng: markerLng }
          ];

          polylineRef.current = new window['google'].maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 3
          });

          polylineRef.current.setMap(googleMapRef.current);
        }

        // Ajustar el mapa para mostrar ambos marcadores
        const bounds = new window['google'].maps.LatLngBounds();
        bounds.extend(new window['google'].maps.LatLng(pickupLat, pickupLng));
        bounds.extend(new window['google'].maps.LatLng(markerLat, markerLng));
        googleMapRef.current.fitBounds(bounds);

        // Agregar un pequeño padding
        const padding = { top: 50, right: 50, bottom: 50, left: 50 };
        googleMapRef.current.fitBounds(bounds, padding);
      }

      // Añadir etiquetas de información a los marcadores
      if (deliveryMarkerRef.current) {
        const deliveryInfoContent = '<div style="padding: 8px;"><strong>Punto de entrega</strong><br>Destino final</div>';
        const deliveryInfoWindow = new window['google'].maps.InfoWindow({
          content: deliveryInfoContent
        });

        deliveryMarkerRef.current.addListener('click', () => {
          deliveryInfoWindow.open(googleMapRef.current, deliveryMarkerRef.current);
        });

        // Mostrar brevemente la información del marcador de entrega
        setTimeout(() => {
          deliveryInfoWindow.open(googleMapRef.current, deliveryMarkerRef.current);
          setTimeout(() => deliveryInfoWindow.close(), 2000);
        }, 1000);
      }

      if (pickupMarkerRef.current) {
        const pickupInfoContent = '<div style="padding: 8px;"><strong>Punto de recogida</strong><br>Ubicación de la empresa</div>';
        const pickupInfoWindow = new window['google'].maps.InfoWindow({
          content: pickupInfoContent
        });

        pickupMarkerRef.current.addListener('click', () => {
          pickupInfoWindow.open(googleMapRef.current, pickupMarkerRef.current);
        });
      }
    };

    initMap();

    return () => {
      // Limpiar los elementos del mapa al desmontar el componente
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setMap(null);
      }
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setMap(null);
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [centerLat, centerLng, markerLat, markerLng, pickupLat, pickupLng, zoom, showRoute]);

  // Actualizar la posición del mapa y de los marcadores si cambian las coordenadas
  useEffect(() => {
    if (!googleMapRef.current) return;

    // Actualizar centro del mapa
    let mapCenter = { lat: centerLat, lng: centerLng };
    if (pickupLat && pickupLng) {
      mapCenter = {
        lat: (pickupLat + markerLat) / 2,
        lng: (pickupLng + markerLng) / 2
      };
      
      // Ajustar el mapa para mostrar ambos marcadores
      const bounds = new window['google'].maps.LatLngBounds();
      bounds.extend(new window['google'].maps.LatLng(pickupLat, pickupLng));
      bounds.extend(new window['google'].maps.LatLng(markerLat, markerLng));
      googleMapRef.current.fitBounds(bounds);
    } else {
      googleMapRef.current.setCenter(mapCenter);
    }

    // Actualizar marcador de entrega
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setPosition({ lat: markerLat, lng: markerLng });
    }

    // Actualizar marcador de recogida
    if (pickupMarkerRef.current && pickupLat && pickupLng) {
      pickupMarkerRef.current.setPosition({ lat: pickupLat, lng: pickupLng });
    }

    // Actualizar polyline si existe
    if (polylineRef.current && pickupLat && pickupLng) {
      const path = [
        { lat: pickupLat, lng: pickupLng },
        { lat: markerLat, lng: markerLng }
      ];
      polylineRef.current.setPath(path);
    }
  }, [centerLat, centerLng, markerLat, markerLng, pickupLat, pickupLng]);

  return (
    <div ref={mapRef} className="w-full h-full relative">
      {/* Overlay con leyenda */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded-md p-2 z-10 text-xs shadow-md">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1.5"></div>
          <span>Origen (Recogida)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1.5"></div>
          <span>Destino (Entrega)</span>
        </div>
      </div>
      
      {/* Fallback si el mapa no carga */}
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Cargando mapa...</p>
      </div>
    </div>
  );
};

export default DeliveryMiniMap;
