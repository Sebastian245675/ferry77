import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para obtener ubicación por IP - no requiere API key
export async function getLocationByIP() {
  try {
    // Probamos primero con ipapi.co
    let response = await fetch('https://ipapi.co/json/');
    
    if (response.ok) {
      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        ip: data.ip
      };
    }
    
    // Si falla, intentamos con ipinfo.io como respaldo
    response = await fetch('https://ipinfo.io/json');
    if (response.ok) {
      const data = await response.json();
      // ipinfo devuelve las coordenadas como "lat,long"
      const [latitude, longitude] = (data.loc || '').split(',').map(Number);
      
      return {
        latitude,
        longitude,
        city: data.city,
        region: data.region,
        country: data.country,
        ip: data.ip
      };
    }
    
    throw new Error("No se pudo obtener la ubicación por IP");
  } catch (error) {
    console.error("Error al obtener ubicación por IP:", error);
    throw error;
  }
}

// Función para convertir coordenadas a dirección usando OpenStreetMap (Nominatim)
export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=es`,
      {
        headers: {
          'User-Agent': 'FerryConnect/1.0',
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("Error en el servicio de geocodificación");
  } catch (error) {
    console.error("Error en geocodificación inversa:", error);
    throw error;
  }
}

// Función para formatear una dirección desde datos de Nominatim
export function formatAddressFromNominatim(address) {
  const parts = [];
  
  // Agregar calle y número
  if (address.road) {
    const streetNumber = address.house_number ? `${address.road} ${address.house_number}` : address.road;
    parts.push(streetNumber);
  }
  
  // Agregar barrio
  if (address.suburb || address.neighbourhood) {
    parts.push(address.suburb || address.neighbourhood);
  }
  
  // Agregar ciudad/localidad
  if (address.city || address.town || address.village) {
    parts.push(address.city || address.town || address.village);
  }
  
  // Agregar estado/región
  if (address.state || address.region) {
    parts.push(address.state || address.region);
  }
  
  // Combinar todo
  return parts.join(', ');
}
