-- Migration script para crear tablas de propuestas
-- Ejecutar en MySQL para crear la estructura de base de datos

-- Crear tabla de propuestas
CREATE TABLE IF NOT EXISTS proposals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    solicitud_id BIGINT NOT NULL,
    total BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) DEFAULT 'COP',
    status VARCHAR(32) DEFAULT 'ENVIADA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para optimizar consultas con millones de registros
    INDEX idx_proposal_solicitud (solicitud_id),
    INDEX idx_proposal_company (company_id),
    INDEX idx_proposal_created (created_at),
    INDEX idx_proposal_status (status),
    
    -- Índice compuesto para búsquedas frecuentes
    INDEX idx_company_solicitud (company_id, solicitud_id),
    INDEX idx_company_status (company_id, status),
    
    -- Constraint para evitar propuestas duplicadas de la misma empresa
    UNIQUE KEY unique_company_solicitud (company_id, solicitud_id)
);

-- Crear tabla de ítems de propuesta
CREATE TABLE IF NOT EXISTS proposal_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    proposal_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL DEFAULT 0,
    total_price BIGINT NOT NULL DEFAULT 0,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índice para búsquedas por propuesta
    INDEX idx_proposal_item_proposal (proposal_id),
    
    -- Clave foránea
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

-- Optimizaciones adicionales para escalabilidad

-- Configurar engine InnoDB para mejor concurrencia
ALTER TABLE proposals ENGINE=InnoDB;
ALTER TABLE proposal_items ENGINE=InnoDB;

-- Configurar charset para soporte de emojis y caracteres especiales
ALTER TABLE proposals CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE proposal_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear índices adicionales si se necesitan más optimizaciones
-- (descomenta según necesidades específicas)

-- INDEX para búsquedas por rango de fechas
-- CREATE INDEX idx_proposals_date_range ON proposals(created_at, company_id);

-- INDEX para búsquedas complejas de productos
-- CREATE INDEX idx_items_product_search ON proposal_items(product_name, unit_price);

-- Estadísticas iniciales
SELECT 'Tablas de propuestas creadas exitosamente' as mensaje;

-- Verificar estructura
DESCRIBE proposals;
DESCRIBE proposal_items;

-- Mostrar índices creados
SHOW INDEX FROM proposals;
SHOW INDEX FROM proposal_items;