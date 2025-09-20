-- Crear tabla de notificaciones escalable para millones de registros
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id VARCHAR(128) NOT NULL,        -- Firebase UID del usuario
    tipo VARCHAR(64) NOT NULL,               -- Tipo de notificación (proposal_created, etc)
    referencia_id VARCHAR(128),              -- ID de referencia (proposalId, solicitudId, etc)
    titulo VARCHAR(255) NOT NULL,            -- Título de la notificación
    mensaje TEXT,                            -- Mensaje descriptivo
    payload JSON NULL,                       -- Datos adicionales en formato JSON
    leida BOOLEAN DEFAULT FALSE,             -- Estado de lectura
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices optimizados para consultas frecuentes
    INDEX idx_notifications_usuario (usuario_id),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_leida (leida),
    INDEX idx_notifications_usuario_fecha (usuario_id, created_at),
    INDEX idx_notifications_usuario_leida (usuario_id, leida),
    
    -- Índice compuesto para consultas de notificaciones no leídas por usuario
    INDEX idx_notifications_unread (usuario_id, leida, created_at)
);