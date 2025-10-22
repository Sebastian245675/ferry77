// Configuración centralizada de la aplicación
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8090',
  WEBSOCKET_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8090/ws/websocket',
  get API_URL() {
    return `${this.BASE_URL}/api`;
  }
};

// Funciones helper para construir URLs de API
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const buildWebSocketUrl = (): string => {
  return API_CONFIG.WEBSOCKET_URL;
};

// URLs específicas más usadas
export const API_ENDPOINTS = {
  SOLICITUDES: buildApiUrl('/solicitudes'),
  PROPOSALS: buildApiUrl('/proposals'),
  USUARIOS: buildApiUrl('/usuarios'),
  NOTIFICATIONS: buildApiUrl('/notifications'),
  QUICK_REQUEST: buildApiUrl('/quick-request'),
};