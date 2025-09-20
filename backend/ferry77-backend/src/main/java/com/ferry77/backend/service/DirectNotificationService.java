package com.ferry77.backend.service;

import com.ferry77.backend.model.Notification;
import com.ferry77.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de notificaciones síncronas (sin Kafka)
 * Versión temporal mientras configuramos Kafka
 */
@Service
public class DirectNotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Crear notificación directamente en la base de datos
     */
    @Transactional
    public void createProposalNotification(Long proposalId, Long solicitudId, String usuarioId, String companyName) {
        try {
            // Crear notificación usando el constructor vacío
            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_created");
            notification.setTitulo("Nueva cotización recibida");
            notification.setMensaje(companyName + " ha enviado una cotización para tu solicitud. ¡Revísala ahora!");
            notification.setLeida(false);
            
            // Establecer referencia si está disponible
            if (proposalId != null) {
                notification.setReferenciaId(proposalId.toString());
            }

            Notification savedNotification = notificationRepository.save(notification);
            
            System.out.println("[DirectNotification] Notificación creada directamente: " + savedNotification.getId() + 
                             " para usuario " + usuarioId);

            // Enviar por WebSocket si está disponible
            if (messagingTemplate != null) {
                try {
                    String destination = "/topic/notifications/" + usuarioId;
                    messagingTemplate.convertAndSend(destination, savedNotification);
                    System.out.println("[DirectNotification] Notificación WebSocket enviada a: " + destination);
                } catch (Exception e) {
                    System.err.println("[DirectNotification] Error enviando WebSocket: " + e.getMessage());
                }
            }

        } catch (Exception e) {
            System.err.println("[DirectNotification] Error creando notificación: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Crear notificación de propuesta aceptada
     */
    @Transactional
    public void createProposalAcceptedNotification(Long proposalId, String usuarioId) {
        try {
            // Crear notificación usando el constructor vacío
            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_accepted");
            notification.setTitulo("¡Propuesta aceptada!");
            notification.setMensaje("Tu propuesta ha sido aceptada. El trabajo comenzará pronto.");
            notification.setLeida(false);
            
            // Establecer referencia si está disponible
            if (proposalId != null) {
                notification.setReferenciaId(proposalId.toString());
            }

            Notification savedNotification = notificationRepository.save(notification);
            System.out.println("[DirectNotification] Notificación de aceptación creada: " + savedNotification.getId());

            if (messagingTemplate != null) {
                String destination = "/topic/notifications/" + usuarioId;
                messagingTemplate.convertAndSend(destination, savedNotification);
            }

        } catch (Exception e) {
            System.err.println("[DirectNotification] Error creando notificación de aceptación: " + e.getMessage());
        }
    }
}