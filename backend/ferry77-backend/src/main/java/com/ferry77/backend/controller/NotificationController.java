package com.ferry77.backend.controller;

import com.ferry77.backend.model.Notification;
import com.ferry77.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión de notificaciones
 * Proporciona endpoints para que el frontend consulte y gestione notificaciones
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Obtener notificaciones de un usuario con paginación
     */
    @GetMapping("/usuarios/{uid}/notifications")
    public ResponseEntity<Page<Notification>> getNotifications(
            @PathVariable("uid") String uid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Notification> notifications = notificationRepository.findByUsuarioIdOrderByCreatedAtDesc(uid, pageable);
            
            System.out.println("[NotificationController] Consultadas " + notifications.getContent().size() + 
                             " notificaciones para usuario " + uid);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Obtener solo notificaciones no leídas
     */
    @GetMapping("/usuarios/{uid}/notifications/unread")
    public ResponseEntity<Page<Notification>> getUnreadNotifications(
            @PathVariable("uid") String uid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Notification> notifications = notificationRepository.findByUsuarioIdAndLeidaFalseOrderByCreatedAtDesc(uid, pageable);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones no leídas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Contar notificaciones no leídas
     */
    @GetMapping("/usuarios/{uid}/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable("uid") String uid) {
        try {
            long count = notificationRepository.countByUsuarioIdAndLeidaFalse(uid);
            
            Map<String, Long> response = new HashMap<>();
            response.put("unreadCount", count);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error contando notificaciones no leídas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Marcar una notificación como leída
     */
    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long id) {
        try {
            return notificationRepository.findById(id)
                .map(notification -> {
                    notification.setLeida(true);
                    notificationRepository.save(notification);
                    
                    System.out.println("[NotificationController] Notificación " + id + " marcada como leída");
                    
                    Map<String, String> response = new HashMap<>();
                    response.put("status", "success");
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    System.err.println("[NotificationController] Notificación " + id + " no encontrada");
                    return ResponseEntity.notFound().build();
                });
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error marcando como leída: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Marcar todas las notificaciones de un usuario como leídas
     */
    @PutMapping("/usuarios/{uid}/notifications/read-all")
    public ResponseEntity<Map<String, Integer>> markAllAsRead(@PathVariable("uid") String uid) {
        try {
            int updatedCount = notificationRepository.markAllAsReadByUsuarioId(uid);
            
            Map<String, Integer> response = new HashMap<>();
            response.put("updatedCount", updatedCount);
            
            System.out.println("[NotificationController] " + updatedCount + 
                             " notificaciones marcadas como leídas para usuario " + uid);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error marcando todas como leídas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Obtener notificaciones recientes (últimas 24 horas)
     */
    @GetMapping("/usuarios/{uid}/notifications/recent")
    public ResponseEntity<List<Notification>> getRecentNotifications(@PathVariable("uid") String uid) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(24);
            List<Notification> notifications = notificationRepository.findRecentByUsuarioId(uid, since);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones recientes: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Obtener estadísticas de notificaciones por tipo
     */
    @GetMapping("/usuarios/{uid}/notifications/stats")
    public ResponseEntity<Map<String, Object>> getNotificationStats(@PathVariable("uid") String uid) {
        try {
            List<Object[]> typeStats = notificationRepository.countNotificationsByTypeForUser(uid);
            long totalUnread = notificationRepository.countByUsuarioIdAndLeidaFalse(uid);
            
            Map<String, Object> stats = new HashMap<>();
            Map<String, Long> typeCountMap = new HashMap<>();
            
            for (Object[] stat : typeStats) {
                String type = (String) stat[0];
                Long count = (Long) stat[1];
                typeCountMap.put(type, count);
            }
            
            stats.put("byType", typeCountMap);
            stats.put("totalUnread", totalUnread);
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo estadísticas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Eliminar una notificación
     */
    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        try {
            if (notificationRepository.existsById(id)) {
                notificationRepository.deleteById(id);
                System.out.println("[NotificationController] Notificación " + id + " eliminada");
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error eliminando notificación: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ========== ENDPOINTS ESPECÍFICOS PARA EMPRESAS ==========
    
    /**
     * Obtener notificaciones de una empresa con paginación
     * Las empresas usan su firebaseUid como identificador
     */
    @GetMapping("/empresas/{uid}/notifications")
    public ResponseEntity<Page<Notification>> getCompanyNotifications(
            @PathVariable("uid") String uid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Notification> notifications = notificationRepository.findByUsuarioIdOrderByCreatedAtDesc(uid, pageable);
            
            System.out.println("[NotificationController] Consultadas " + notifications.getContent().size() + 
                             " notificaciones para empresa " + uid);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones de empresa: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Obtener solo notificaciones no leídas para empresa
     */
    @GetMapping("/empresas/{uid}/notifications/unread")
    public ResponseEntity<Page<Notification>> getCompanyUnreadNotifications(
            @PathVariable("uid") String uid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Notification> notifications = notificationRepository.findByUsuarioIdAndLeidaFalseOrderByCreatedAtDesc(uid, pageable);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones no leídas de empresa: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Contar notificaciones no leídas para empresa
     */
    @GetMapping("/empresas/{uid}/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> getCompanyUnreadCount(@PathVariable("uid") String uid) {
        try {
            long count = notificationRepository.countByUsuarioIdAndLeidaFalse(uid);
            
            Map<String, Long> response = new HashMap<>();
            response.put("unreadCount", count);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error contando notificaciones no leídas de empresa: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Marcar todas las notificaciones de una empresa como leídas
     */
    @PutMapping("/empresas/{uid}/notifications/read-all")
    public ResponseEntity<Map<String, Integer>> markAllCompanyNotificationsAsRead(@PathVariable("uid") String uid) {
        try {
            int updatedCount = notificationRepository.markAllAsReadByUsuarioId(uid);
            
            Map<String, Integer> response = new HashMap<>();
            response.put("updatedCount", updatedCount);
            
            System.out.println("[NotificationController] " + updatedCount + 
                             " notificaciones marcadas como leídas para empresa " + uid);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error marcando todas las notificaciones de empresa como leídas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Obtener notificaciones recientes para empresa (últimas 24 horas)
     */
    @GetMapping("/empresas/{uid}/notifications/recent")
    public ResponseEntity<List<Notification>> getCompanyRecentNotifications(@PathVariable("uid") String uid) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(24);
            List<Notification> notifications = notificationRepository.findRecentByUsuarioId(uid, since);
            
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            System.err.println("[NotificationController] Error obteniendo notificaciones recientes de empresa: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}