package com.ferry77.backend.service;

import com.ferry77.backend.model.Notification;
import com.ferry77.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de notificaciones SIMPLE - sin Kafka
 * Funciona directamente con la base de datos
 */
@Service
public class SimpleNotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Crear notificación cuando llega una cotización
     */
    @Transactional
    public void notifyNewProposal(String usuarioId, String companyName, Long proposalId) {
        try {
            System.out.println("🔔 [SimpleNotification] Creando notificación para usuario: " + usuarioId);
            
            // Crear notificación usando el constructor vacío
            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_created");
            notification.setTitulo("Nueva cotización recibida");
            notification.setMensaje(companyName + " te ha enviado una cotización. ¡Revísala ahora!");
            notification.setLeida(false);
            
            // Establecer referencia si está disponible
            if (proposalId != null) {
                notification.setReferenciaId(proposalId.toString());
            }

            Notification saved = notificationRepository.save(notification);
            
            System.out.println("✅ [SimpleNotification] Notificación guardada con ID: " + saved.getId());
            System.out.println("📝 [SimpleNotification] Para usuario: " + usuarioId + " | Empresa: " + companyName);
            
        } catch (Exception e) {
            System.err.println("❌ [SimpleNotification] ERROR creando notificación: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Método de prueba para crear notificación directamente
     */
    public void createTestNotification(String usuarioId) {
        try {
            // Crear notificación usando el constructor vacío
            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("test");
            notification.setTitulo("Prueba de notificación");
            notification.setMensaje("Esta es una notificación de prueba para verificar que el sistema funciona.");
            notification.setLeida(false);

            notificationRepository.save(notification);
            System.out.println("✅ [SimpleNotification] Notificación de prueba creada para: " + usuarioId);
            
        } catch (Exception e) {
            System.err.println("❌ [SimpleNotification] Error en prueba: " + e.getMessage());
        }
    }

    /**
     * Crear notificación cuando una propuesta es aceptada
     */
    @Transactional
    public void notifyProposalAccepted(Long companyId, Long proposalId, String message) {
        try {
            System.out.println("🔔 [SimpleNotification] Creando notificación de propuesta aceptada para empresa: " + companyId);
            
            Notification notification = new Notification();
            notification.setUsuarioId(companyId.toString());
            notification.setTipo("PROPOSAL_ACCEPTED");
            notification.setTitulo("¡Cotización aceptada!");
            notification.setMensaje(message);
            notification.setLeida(false);
            notification.setReferenciaId(proposalId.toString());

            Notification saved = notificationRepository.save(notification);
            
            System.out.println("✅ [SimpleNotification] Notificación de aceptación guardada con ID: " + saved.getId());
            
        } catch (Exception e) {
            System.err.println("❌ [SimpleNotification] ERROR creando notificación de aceptación: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Crear notificación cuando una propuesta es rechazada
     */
    @Transactional
    public void notifyProposalRejected(Long companyId, Long proposalId, String message) {
        try {
            System.out.println("🔔 [SimpleNotification] Creando notificación de propuesta rechazada para empresa: " + companyId);
            
            Notification notification = new Notification();
            notification.setUsuarioId(companyId.toString());
            notification.setTipo("PROPOSAL_REJECTED");
            notification.setTitulo("Cotización rechazada");
            notification.setMensaje(message);
            notification.setLeida(false);
            notification.setReferenciaId(proposalId.toString());

            Notification saved = notificationRepository.save(notification);
            
            System.out.println("✅ [SimpleNotification] Notificación de rechazo guardada con ID: " + saved.getId());
            
        } catch (Exception e) {
            System.err.println("❌ [SimpleNotification] ERROR creando notificación de rechazo: " + e.getMessage());
            e.printStackTrace();
        }
    }
}