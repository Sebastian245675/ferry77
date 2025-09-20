import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8090';

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Tipos para el backend
export type SolicitudBackend = {
  id: number;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  titulo: string;
  profesion: string;
  tipo: string; // herramienta o herraje
  ubicacion: string;
  presupuesto?: number | null;
  estado: string;
  fechaCreacion: string;
  items: ItemSolicitudBackend[];
};

export type ItemSolicitudBackend = {
  id: number;
  nombre: string;
  cantidad: number;
  especificaciones?: string;
  imagenUrl?: string;
  precio?: number | null;
};

// Funciones de API
export const solicitudesAPI = {
  // Obtener solicitudes del usuario
  getUserSolicitudes: async (usuarioId: string): Promise<SolicitudBackend[]> => {
    const response = await api.get(`/api/solicitudes/usuario/${usuarioId}`);
    return response.data;
  },

  // Obtener solicitudes pendientes filtradas por ciudad (opcional)
  getPendingSolicitudesByCity: async (ciudad?: string): Promise<SolicitudBackend[]> => {
    const url = ciudad ? `/api/solicitudes/pending?ciudad=${encodeURIComponent(ciudad)}` : '/api/solicitudes/pending';
    const response = await api.get(url);
    return response.data;
  },

  // Crear nueva solicitud
  createSolicitud: async (solicitudData: any) => {
    const response = await api.post('/api/solicitudes', solicitudData);
    return response.data;
  },

  // Obtener solicitud por ID
  getSolicitudById: async (id: number): Promise<SolicitudBackend> => {
    const response = await api.get(`/api/solicitudes/${id}`);
    return response.data;
  }
};

// API para gestión de ubicaciones
export const geoAPI = {
  // Obtener todas las ciudades disponibles
  getCiudades: async (): Promise<any[]> => {
    const response = await api.get('/api/usuarios/ciudades');
    return response.data;
  },

  // Poblar ciudades desde usuarios existentes
  poblarCiudades: async () => {
    const response = await api.post('/api/usuarios/ciudades/populate');
    return response.data;
  },

  // Poblar ciudades principales de Colombia
  poblarCiudadesColombia: async () => {
    const response = await api.post('/api/usuarios/ciudades/populate-colombia');
    return response.data;
  },

  // Actualizar ubicación de un usuario/empresa
  updateUsuarioUbicacion: async (usuarioId: string | number, ciudadId?: number, ciudadNombre?: string) => {
    const body: any = {};
    if (ciudadId) body.ciudadId = ciudadId;
    if (ciudadNombre) body.ciudadNombre = ciudadNombre;
    const response = await api.put(`/api/usuarios/${usuarioId}/ubicacion`, body);
    return response.data;
  }
};