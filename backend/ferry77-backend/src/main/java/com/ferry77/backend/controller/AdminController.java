package com.ferry77.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private DataSource dataSource;

    @PostMapping("/create-quick-responses-table")
    public ResponseEntity<?> createQuickResponsesTable() {
        try {
            String sql = """
                CREATE TABLE IF NOT EXISTS quick_responses (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    company_id BIGINT NOT NULL,
                    company_name VARCHAR(255),
                    solicitud_id BIGINT NOT NULL,
                    response_type VARCHAR(20) NOT NULL COMMENT 'message, image, excel',
                    message TEXT,
                    file_name VARCHAR(255),
                    file_type VARCHAR(100),
                    file_url VARCHAR(500),
                    file_size BIGINT,
                    status VARCHAR(20) DEFAULT 'SENT' COMMENT 'SENT, READ, ACCEPTED, REJECTED',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    INDEX idx_quick_response_solicitud (solicitud_id),
                    INDEX idx_quick_response_company (company_id),
                    INDEX idx_quick_response_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """;

            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                
                stmt.executeUpdate(sql);
                
                return ResponseEntity.ok(Map.of(
                    "message", "Tabla quick_responses creada exitosamente",
                    "status", "success"
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Error creando tabla: " + e.getMessage()));
        }
    }
}