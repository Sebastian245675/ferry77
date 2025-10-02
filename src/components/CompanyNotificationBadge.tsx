import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare, Star, Clock, CheckCircle, AlertCircle, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  empresaId?: string;
  usuarioId?: string;
  leida: boolean;
  referenciaId?: string;
  createdAt: string;
  time?: string;
}

const CompanyNotificationBadge = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Cargar notificaciones de empresas desde el backend
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://localhost:8090/api/empresas/${user.uid}/notifications?page=0&size=20`);
        if (response.ok) {
          const data = await response.json();
          
          // Convertir las notificaciones del backend al formato del frontend
          const fetchedNotifications = data.content.map((notif: any) => {
            const now = new Date();
            const createdAt = new Date(notif.createdAt);
            const diffMs = now.getTime() - createdAt.getTime();
            
            let timeString = '';
            if (diffMs < 60000) { // menos de 1 minuto
              timeString = 'Ahora mismo';
            } else if (diffMs < 3600000) { // menos de 1 hora
              timeString = `${Math.floor(diffMs / 60000)} min`;
            } else if (diffMs < 86400000) { // menos de 1 día
              timeString = `${Math.floor(diffMs / 3600000)} h`;
            } else { // más de 1 día
              timeString = `${Math.floor(diffMs / 86400000)} d`;
            }

            return {
              id: notif.id,
              titulo: notif.titulo,
              mensaje: notif.mensaje,
              tipo: notif.tipo,
              empresaId: notif.empresaId,
              usuarioId: notif.usuarioId,
              leida: notif.leida,
              referenciaId: notif.referenciaId,
              createdAt: notif.createdAt,
              time: timeString
            } as Notification;
          });

          setNotifications(fetchedNotifications);
        } else {
          console.error('Error al cargar notificaciones:', response.status);
        }
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      }
    };

    fetchNotifications();

    // Actualizar notificaciones cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [auth.currentUser]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_quote_request':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'quote_accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'quote_rejected':
        return <X className="w-5 h-5 text-red-500" />;
      case 'new_message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'review_received':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'user_registered':
        return <User className="w-5 h-5 text-green-500" />;
      case 'payment_received':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:8090/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        setNotifications(notifications.map(notif => 
          notif.id === notificationId ? { ...notif, leida: true } : notif
        ));
      }
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
      const response = await fetch(`http://localhost:8090/api/empresas/${user.uid}/notifications/read-all`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        setNotifications(notifications.map(notif => ({ ...notif, leida: true })));
      }
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída al hacer clic
    markAsRead(notification.id);
    
    // Cerrar el panel de notificaciones
    setIsOpen(false);
    
    // Navegar según el tipo de notificación
    switch (notification.tipo) {
      case 'new_quote_request':
        // Ir al dashboard principal donde están las solicitudes pendientes
        navigate('/backoffice');
        break;
      case 'quote_accepted':
      case 'quote_rejected':
        // Ir a la sección de cotizaciones enviadas
        navigate('/backoffice/quotes');
        break;
      case 'new_message':
        // Ir al centro de mensajes
        navigate('/backoffice/messages');
        break;
      case 'review_received':
        // Ir a la sección de reseñas
        navigate('/backoffice/reviews');
        break;
      default:
        // Para otros tipos, ir al dashboard principal
        navigate('/backoffice');
        break;
    }
  };

  const unreadCount = notifications.filter(notif => !notif.leida).length;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white rounded-full shadow-md hover:bg-blue-50"
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.leida ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.titulo}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.mensaje}
                      </p>
                      {!notification.leida && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tienes notificaciones</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t">
              {unreadCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-blue-600 hover:text-blue-700"
                  onClick={markAllAsRead}
                >
                  Marcar todas como leídas
                </Button>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  Todas las notificaciones están leídas
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyNotificationBadge;
