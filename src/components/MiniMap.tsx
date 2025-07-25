import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
  lat: number;
  lng: number;
  label?: string;
}

const MiniMap: React.FC<MiniMapProps> = ({ lat, lng, label }) => {
  // TypeScript workaround: force MapContainer as any to bypass prop type error
  const MapContainerAny = MapContainer as any;
  return (
    <div style={{ height: 200, width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
      <MapContainerAny
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>{label || 'Ubicación de la empresa'}</Popup>
        </Marker>
      </MapContainerAny>
    </div>
  );
};

export default MiniMap;
