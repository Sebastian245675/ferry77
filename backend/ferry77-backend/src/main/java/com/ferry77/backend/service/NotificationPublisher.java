package com.ferry77.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ferry77.backend.config.KafkaConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Servicio para publicar eventos de notificaciones en Kafka
 * Diseñado para ser escalable y manejar millones de notificaciones
 */
@Service
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class NotificationPublisher {

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Publica un evento cuando se crea una nueva propuesta
     * @param proposalId ID de la propuesta creada
     * @param solicitudId ID de la solicitud relacionada
     * @param usuarioId ID del usuario que debe recibir la notificación
     * @param companyName Nombre de la empresa que envió la propuesta
     */
    public void publishProposalCreated(Long proposalId, Long solicitudId, String usuarioId, String companyName) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event", "proposal_created");
            event.put("proposalId", proposalId);
            event.put("solicitudId", solicitudId);
            event.put("usuarioId", usuarioId);
            event.put("companyName", companyName);
            event.put("timestamp", System.currentTimeMillis());

            String payload = objectMapper.writeValueAsString(event);
            
            // Usar usuarioId como clave para que mensajes del mismo usuario vayan a la misma partición
            kafkaTemplate.send(KafkaConfig.TOPIC_PROPOSAL_EVENTS, usuarioId, payload);
            
            System.out.println("[NotificationPublisher] Evento publicado: propuesta " + proposalId + 
                             " para usuario " + usuarioId);
            
        } catch (Exception e) {
            // Log error pero no lanzar excepción para no romper el flujo principal
            System.err.println("[NotificationPublisher] Error al publicar evento: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Publica un evento cuando una propuesta es aceptada
     */
    public void publishProposalAccepted(Long proposalId, String usuarioId, String companyId) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event", "proposal_accepted");
            event.put("proposalId", proposalId);
            event.put("usuarioId", usuarioId);
            event.put("companyId", companyId);
            event.put("timestamp", System.currentTimeMillis());

            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(KafkaConfig.TOPIC_PROPOSAL_EVENTS, usuarioId, payload);
            
            System.out.println("[NotificationPublisher] Evento aceptación publicado: propuesta " + proposalId);
            
        } catch (Exception e) {
            System.err.println("[NotificationPublisher] Error al publicar evento de aceptación: " + e.getMessage());
        }
    }

    /**
     * Publica un evento cuando una propuesta es rechazada
     */
    public void publishProposalRejected(Long proposalId, String usuarioId, String companyId) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event", "proposal_rejected");
            event.put("proposalId", proposalId);
            event.put("usuarioId", usuarioId);
            event.put("companyId", companyId);
            event.put("timestamp", System.currentTimeMillis());

            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(KafkaConfig.TOPIC_PROPOSAL_EVENTS, usuarioId, payload);
            
            System.out.println("[NotificationPublisher] Evento rechazo publicado: propuesta " + proposalId);
            
        } catch (Exception e) {
            System.err.println("[NotificationPublisher] Error al publicar evento de rechazo: " + e.getMessage());
        }
    }

    /**
     * Método genérico para publicar cualquier evento de notificación
     */
    public void publishNotificationEvent(String eventType, Map<String, Object> data) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("event", eventType);
            event.put("timestamp", System.currentTimeMillis());
            event.putAll(data);

            String payload = objectMapper.writeValueAsString(event);
            String key = data.containsKey("usuarioId") ? data.get("usuarioId").toString() : null;
            
            kafkaTemplate.send(KafkaConfig.TOPIC_PROPOSAL_EVENTS, key, payload);
            
            System.out.println("[NotificationPublisher] Evento genérico publicado: " + eventType);
            
        } catch (Exception e) {
            System.err.println("[NotificationPublisher] Error al publicar evento genérico: " + e.getMessage());
        }
    }
}