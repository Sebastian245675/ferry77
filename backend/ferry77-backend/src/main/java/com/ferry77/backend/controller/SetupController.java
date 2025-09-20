package com.ferry77.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

@RestController
@RequestMapping("/api/setup")
@CrossOrigin(origins = "*")
public class SetupController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/create-notifications-table")
    public ResponseEntity<String> createNotificationsTable() {
        try {
            // Crear tabla notifications
            String createTableSQL = """
                CREATE TABLE IF NOT EXISTS notifications (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id VARCHAR(128) NOT NULL,
                    tipo VARCHAR(64) NOT NULL,
                    referencia_id VARCHAR(128),
                    titulo VARCHAR(255) NOT NULL,
                    mensaje TEXT,
                    payload JSON NULL,
                    leida BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    INDEX idx_notifications_usuario (usuario_id),
                    INDEX idx_notifications_created (created_at),
                    INDEX idx_notifications_leida (leida),
                    INDEX idx_notifications_usuario_fecha (usuario_id, created_at),
                    INDEX idx_notifications_usuario_leida (usuario_id, leida),
                    INDEX idx_notifications_unread (usuario_id, leida, created_at)
                )
                """;
            
            jdbcTemplate.execute(createTableSQL);
            
            // Verificar que se creó
            int count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications'", 
                Integer.class
            );
            
            if (count > 0) {
                // Insertar notificación de prueba
                jdbcTemplate.update(
                    "INSERT INTO notifications (usuario_id, tipo, titulo, mensaje, payload) VALUES (?, ?, ?, ?, ?)",
                    "1", "SETUP", "Tabla creada", "La tabla notifications se creó correctamente", "{\"test\": true}"
                );
                
                return ResponseEntity.ok("✅ Tabla notifications creada correctamente y notificación de prueba insertada");
            } else {
                return ResponseEntity.ok("❌ Error: No se pudo verificar la creación de la tabla");
            }
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("❌ Error creando tabla: " + e.getMessage());
        }
    }

    @GetMapping("/test-notifications")
    public ResponseEntity<Object> testNotifications() {
        try {
            // Verificar que la tabla existe y obtener algunas notificaciones
            String sql = "SELECT COUNT(*) as total FROM notifications";
            int total = jdbcTemplate.queryForObject(sql, Integer.class);
            
            return ResponseEntity.ok(java.util.Map.of(
                "tabla_existe", true,
                "total_notificaciones", total,
                "mensaje", "✅ Tabla notifications funcionando correctamente"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                "tabla_existe", false,
                "error", e.getMessage(),
                "mensaje", "❌ La tabla notifications no existe o hay un error"
            ));
        }
    }
}