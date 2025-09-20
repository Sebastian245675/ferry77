package com.ferry77.backend.service;

import com.ferry77.backend.dto.NotificationDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void sendToUserTopic(String userId, NotificationDTO notification) {
        try {
            String destination = "/topic/notifications/" + userId;
            System.out.println("=== ENVIANDO NOTIFICACIÓN ===");
            System.out.println("Destino: " + destination);
            System.out.println("Título: " + notification.title);
            System.out.println("Mensaje: " + notification.message);
            System.out.println("Tipo: " + notification.type);
            
            messagingTemplate.convertAndSend(destination, notification);
            
            System.out.println("✅ Notificación enviada exitosamente a: " + destination);
            System.out.println("==============================");
        } catch (Exception e) {
            System.err.println("❌ Error al enviar notificación: " + e.getMessage());
            e.printStackTrace();
        }
    }
}