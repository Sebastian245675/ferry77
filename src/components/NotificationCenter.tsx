import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, updateDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  company?: string;
  read: boolean;
  action?: string;
  actionParams?: Record<string, string>;
  timestamp: any;
  time?: string;
  userId: string;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Solo obtener notificaciones del usuario actual
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convertir el timestamp de Firestore a fecha
        const timestamp = data.timestamp?.toDate?.() ? data.timestamp.toDate() : new Date();
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        
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
          id: doc.id, 
          ...data as Omit<Notification, 'id'>,
          time: timeString
        } as Notification;
      });
      
      // Ordenar notificaciones por timestamp (más recientes primero)
      fetchedNotifications.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() ? a.timestamp.toDate().getTime() : new Date().getTime();
        const dateB = b.timestamp?.toDate?.() ? b.timestamp.toDate().getTime() : new Date().getTime();
        return dateB - dateA;
      });
      
      setNotifications(fetchedNotifications);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'quote':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'status':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'delivery':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const markAsRead = async (notificationId) => {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(notif => !notif.read);
    const batch = writeBatch(db);

    unreadNotifications.forEach(notif => {
      const notificationRef = doc(db, 'notifications', notif.id);
      batch.update(notificationRef, { read: true });
    });

    await batch.commit();
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Cerrar el panel de notificaciones
    setIsOpen(false);
    
    // Navegar según el tipo de acción
    if (notification.action && notification.actionParams) {
      switch (notification.action) {
        // Eliminado: navegación a cotizaciones
        case 'view_message':
          navigate(`/messages?chatId=${notification.actionParams.chatId}`);
          break;
        case 'view_request':
          navigate(`/requests?id=${notification.actionParams.requestId}`);
          break;
        case 'track_delivery':
          navigate(`/order-status?id=${notification.actionParams.orderId}`);
          break;
        default:
          // Para cualquier otra acción no especificada
          if (notification.actionParams.url) {
            navigate(notification.actionParams.url);
          }
      }
    } else if (notification.type) {
      // Navegación basada solo en tipo si no hay acción específica
      switch (notification.type) {
        // Eliminado: navegación a cotizaciones
        case 'message':
          navigate('/messages');
          break;
        case 'status':
          navigate('/requests');
          break;
        case 'delivery':
          navigate('/orders');
          break;
        default:
          navigate('/dashboard');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50">
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
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.company && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          {notification.company}
                        </p>
                      )}
                      {!notification.read && (
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
                <div className="text-center text-gray-500 text-sm py-1">
                  No hay notificaciones pendientes
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
