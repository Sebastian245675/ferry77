import { useEffect } from 'react';
import { connectNotifications, disconnectNotifications } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

export const useWebSocketNotifications = () => {
  const { toast } = useToast();
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    
    if (user?.uid) {
      console.log('[WebSocket] Conectando notificaciones para usuario:', user.uid);
      
      connectNotifications(user.uid, async (notification) => {
        console.log('[WebSocket] Notificación recibida:', notification);
        
        try {
          // Guardar la notificación en Firebase para que aparezca en NotificationCenter
          const notificationData = {
            userId: user.uid,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            read: false,
            timestamp: new Date(),
            company: notification.payload?.solicitudId ? 'Sistema' : undefined,
            action: notification.type === 'solicitud_created' ? 'view_requests' : undefined,
            actionParams: notification.payload || {}
          };

          await addDoc(collection(db, 'notifications'), notificationData);
          console.log('[WebSocket] Notificación guardada en Firebase');

          // Mostrar toast inmediato
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });

        } catch (error) {
          console.error('[WebSocket] Error al guardar notificación:', error);
          
          // Si falla Firebase, al menos mostrar el toast
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        }
      });
    } else {
      console.log('[WebSocket] Desconectando - usuario no autenticado');
      disconnectNotifications();
    }

    return () => {
      disconnectNotifications();
    };
  }, [auth.currentUser?.uid, toast]);
};