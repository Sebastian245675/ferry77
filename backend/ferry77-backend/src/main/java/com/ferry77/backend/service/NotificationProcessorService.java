package com.ferry77.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ferry77.backend.config.KafkaConfig;
import com.ferry77.backend.model.Notification;
import com.ferry77.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Procesador asíncrono de eventos de notificación
 * Consume mensajes de Kafka y los procesa para crear notificaciones
 */
@Service
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class NotificationProcessorService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate; // WebSocket para notificaciones en tiempo real

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Procesa eventos de propuestas desde Kafka
     */
    @KafkaListener(topics = KafkaConfig.TOPIC_PROPOSAL_EVENTS, groupId = "notification-processor-group")
    @Transactional
    public void processProposalEvent(@Payload String message, 
                                   @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                   Acknowledgment acknowledgment) {
        try {
            System.out.println("[NotificationProcessor] Procesando mensaje: " + message);

            JsonNode eventNode = objectMapper.readTree(message);
            
            if (!eventNode.has("event")) {
                System.err.println("[NotificationProcessor] Evento sin tipo, ignorando: " + message);
                return;
            }

            String eventType = eventNode.get("event").asText();
            
            switch (eventType) {
                case "proposal_created":
                    processProposalCreated(eventNode, message);
                    break;
                case "proposal_accepted":
                    processProposalAccepted(eventNode, message);
                    break;
                case "proposal_rejected":
                    processProposalRejected(eventNode, message);
                    break;
                default:
                    System.out.println("[NotificationProcessor] Tipo de evento no manejado: " + eventType);
            }

            // Confirmar procesamiento del mensaje
            acknowledgment.acknowledge();
            
        } catch (Exception e) {
            System.err.println("[NotificationProcessor] Error procesando mensaje: " + e.getMessage());
            e.printStackTrace();
            // No confirmar el mensaje para que sea reintentado
        }
    }

    /**
     * Procesa evento de creación de propuesta
     */
    private void processProposalCreated(JsonNode event, String originalMessage) {
        try {
            Long proposalId = event.has("proposalId") ? event.get("proposalId").asLong() : null;
            String usuarioId = event.has("usuarioId") ? event.get("usuarioId").asText() : null;
            String companyName = event.has("companyName") ? event.get("companyName").asText() : "Una empresa";

            if (usuarioId == null) {
                System.err.println("[NotificationProcessor] Usuario ID requerido para notificación");
                return;
            }

            // Crear notificación en la base de datos
            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_created");
            notification.setReferenciaId(proposalId != null ? proposalId.toString() : null);
            notification.setTitulo("Nueva cotización recibida");
            notification.setMensaje(companyName + " ha enviado una cotización para tu solicitud. ¡Revísala ahora!");
            notification.setPayload(originalMessage);
            notification.setLeida(false);
            notification.setCreatedAt(LocalDateTime.now());

            Notification savedNotification = notificationRepository.save(notification);
            
            System.out.println("[NotificationProcessor] Notificación guardada: " + savedNotification.getId() + 
                             " para usuario " + usuarioId);

            // Enviar notificación en tiempo real por WebSocket
            sendRealTimeNotification(usuarioId, savedNotification);

        } catch (Exception e) {
            System.err.println("[NotificationProcessor] Error procesando proposal_created: " + e.getMessage());
            throw e; // Re-lanzar para que Kafka reintente
        }
    }

    /**
     * Procesa evento de aceptación de propuesta
     */
    private void processProposalAccepted(JsonNode event, String originalMessage) {
        try {
            Long proposalId = event.has("proposalId") ? event.get("proposalId").asLong() : null;
            String usuarioId = event.has("usuarioId") ? event.get("usuarioId").asText() : null;

            if (usuarioId == null) return;

            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_accepted");
            notification.setReferenciaId(proposalId != null ? proposalId.toString() : null);
            notification.setTitulo("¡Propuesta aceptada!");
            notification.setMensaje("Tu propuesta ha sido aceptada. El trabajo comenzará pronto.");
            notification.setPayload(originalMessage);
            notification.setLeida(false);
            notification.setCreatedAt(LocalDateTime.now());

            Notification savedNotification = notificationRepository.save(notification);
            sendRealTimeNotification(usuarioId, savedNotification);

        } catch (Exception e) {
            System.err.println("[NotificationProcessor] Error procesando proposal_accepted: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Procesa evento de rechazo de propuesta
     */
    private void processProposalRejected(JsonNode event, String originalMessage) {
        try {
            Long proposalId = event.has("proposalId") ? event.get("proposalId").asLong() : null;
            String usuarioId = event.has("usuarioId") ? event.get("usuarioId").asText() : null;

            if (usuarioId == null) return;

            Notification notification = new Notification();
            notification.setUsuarioId(usuarioId);
            notification.setTipo("proposal_rejected");
            notification.setReferenciaId(proposalId != null ? proposalId.toString() : null);
            notification.setTitulo("Propuesta no seleccionada");
            notification.setMensaje("El cliente eligió otra propuesta. ¡Sigue participando en más solicitudes!");
            notification.setPayload(originalMessage);
            notification.setLeida(false);
            notification.setCreatedAt(LocalDateTime.now());

            Notification savedNotification = notificationRepository.save(notification);
            sendRealTimeNotification(usuarioId, savedNotification);

        } catch (Exception e) {
            System.err.println("[NotificationProcessor] Error procesando proposal_rejected: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Envía notificación en tiempo real por WebSocket
     */
    private void sendRealTimeNotification(String usuarioId, Notification notification) {
        if (messagingTemplate != null) {
            try {
                // Enviar a canal específico del usuario
                String destination = "/topic/notifications/" + usuarioId;
                messagingTemplate.convertAndSend(destination, notification);
                
                System.out.println("[NotificationProcessor] Notificación WebSocket enviada a: " + destination);
                
            } catch (Exception e) {
                System.err.println("[NotificationProcessor] Error enviando WebSocket: " + e.getMessage());
                // No re-lanzar, la notificación ya está guardada en BD
            }
        }
    }
}