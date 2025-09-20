-- Script para crear tabla notifications en XAMPP/phpMyAdmin
-- Ejecuta esto en phpMyAdmin en la base de datos ferry77db

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
);

-- Verificar que se creó
SHOW TABLES LIKE 'notifications';

-- Ver estructura
DESCRIBE notifications;