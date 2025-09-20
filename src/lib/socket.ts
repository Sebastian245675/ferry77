import { Client, IMessage } from '@stomp/stompjs';

// Polyfill para SockJS en el navegador
declare global {
  interface Window {
    SockJS: any;
  }
}

let client: Client | null = null;

export interface NotificationData {
  title: string;
  message: string;
  type: string;
  payload?: any;
}

export function connectNotifications(userId: string, onMessage: (notification: NotificationData) => void) {
  if (!userId) {
    console.warn('[Socket] No se puede conectar sin userId');
    return;
  }
  
  if (client && client.active) {
    console.log('[Socket] Ya existe una conexión activa');
    return;
  }

  console.log('[Socket] Conectando notificaciones para usuario:', userId);

  client = new Client({
    // Usar WebSocket nativo con la URL correcta de STOMP
    webSocketFactory: () => {
      const wsUrl = 'ws://localhost:8090/ws/websocket';
      console.log('[Socket] Conectando a:', wsUrl);
      return new WebSocket(wsUrl);
    },
    reconnectDelay: 5000,
    debug: (str) => {
      console.debug('[Socket Debug]:', str);
    }
  });

  client.onConnect = () => {
    console.log('[Socket] Conectado correctamente');
    const destination = `/topic/notifications/${userId}`;
    console.log('[Socket] Suscribiéndose a:', destination);
    
    client!.subscribe(destination, (message: IMessage) => {
      try {
        const notification = JSON.parse(message.body);
        console.log('[Socket] Notificación recibida:', notification);
        onMessage(notification);
      } catch (error) {
        console.error('[Socket] Error al parsear notificación:', error);
      }
    });
  };

  client.onStompError = (frame) => {
    console.error('[Socket] Error STOMP:', frame.headers['message']);
    console.error('[Socket] Detalles adicionales:', frame.body);
  };

  client.onWebSocketError = (error) => {
    console.error('[Socket] Error WebSocket:', error);
  };

  client.onDisconnect = () => {
    console.log('[Socket] Desconectado');
  };

  client.activate();
}

export function disconnectNotifications() {
  if (client) {
    console.log('[Socket] Desconectando...');
    client.deactivate();
    client = null;
  }
}

export function isConnected(): boolean {
  return client?.active || false;
}