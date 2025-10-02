package com.ferry77.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    /**
     * Obtiene la ubicación/ciudad del usuario desde la base de datos
     * @param userId ID del usuario (puede ser Firebase UID o ID numérico)
     * @return La ubicación del usuario o "Ubicación no especificada" si no se encuentra
     */
    public String getUserLocation(String userId) {
        try {
            logger.info("Buscando ubicación para usuario: {}", userId);
            
            String location = null;
            
            // Opción 1: Buscar en tabla usuarios por firebase_uid
            try {
                location = jdbcTemplate.queryForObject(
                    "SELECT ciudad FROM usuarios WHERE firebase_uid = ? AND ciudad IS NOT NULL AND ciudad != ''",
                    String.class,
                    userId
                );
                logger.info("Ubicación encontrada en usuarios.ciudad: {}", location);
            } catch (Exception e1) {
                logger.debug("No se encontró en usuarios.ciudad: {}", e1.getMessage());
                
                // Opción 2: Buscar en tabla usuarios por ID numérico
                try {
                    location = jdbcTemplate.queryForObject(
                        "SELECT ciudad FROM usuarios WHERE id = ? AND ciudad IS NOT NULL AND ciudad != ''",
                        String.class,
                        userId
                    );
                    logger.info("Ubicación encontrada en usuarios.ciudad por ID: {}", location);
                } catch (Exception e2) {
                    logger.debug("No se encontró en usuarios por ID: {}", e2.getMessage());
                    
                    // Opción 3: Buscar la última ubicación válida en solicitudes previas
                    try {
                        location = jdbcTemplate.queryForObject(
                            "SELECT ubicacion FROM solicitudes WHERE usuario_id = ? AND ubicacion IS NOT NULL " +
                            "AND ubicacion != 'Por definir' AND ubicacion != 'Ubicación no especificada' " +
                            "AND ubicacion != '' ORDER BY fecha_creacion DESC LIMIT 1",
                            String.class,
                            userId
                        );
                        logger.info("Ubicación encontrada en solicitudes previas: {}", location);
                    } catch (Exception e3) {
                        logger.debug("No se encontró en solicitudes previas: {}", e3.getMessage());
                    }
                }
            }
            
            String finalLocation = location != null && !location.trim().isEmpty() ? location.trim() : "Ubicación no especificada";
            logger.info("Ubicación final para usuario {}: {}", userId, finalLocation);
            return finalLocation;
            
        } catch (Exception e) {
            logger.error("Error al obtener ubicación del usuario {}: {}", userId, e.getMessage());
            return "Ubicación no especificada";
        }
    }
    
    /**
     * Obtiene el nombre del usuario desde la base de datos
     * @param userId ID del usuario
     * @return El nombre del usuario o "Usuario" si no se encuentra
     */
    public String getUserName(String userId) {
        try {
            logger.info("Buscando nombre para usuario: {}", userId);
            
            String name = null;
            
            // Buscar en tabla usuarios
            try {
                name = jdbcTemplate.queryForObject(
                    "SELECT nombre_completo FROM usuarios WHERE firebase_uid = ? AND nombre_completo IS NOT NULL",
                    String.class,
                    userId
                );
                logger.info("Nombre encontrado en usuarios: {}", name);
            } catch (Exception e1) {
                // Buscar en solicitudes previas como fallback
                try {
                    name = jdbcTemplate.queryForObject(
                        "SELECT usuario_nombre FROM solicitudes WHERE usuario_id = ? AND usuario_nombre IS NOT NULL " +
                        "AND usuario_nombre != '' AND usuario_nombre != 'Usuario' ORDER BY fecha_creacion DESC LIMIT 1",
                        String.class,
                        userId
                    );
                    logger.info("Nombre encontrado en solicitudes: {}", name);
                } catch (Exception e2) {
                    logger.debug("No se encontró nombre en ninguna tabla: {}", e2.getMessage());
                }
            }
            
            String finalName = name != null && !name.trim().isEmpty() ? name.trim() : "Usuario";
            logger.info("Nombre final para usuario {}: {}", userId, finalName);
            return finalName;
            
        } catch (Exception e) {
            logger.error("Error al obtener nombre del usuario {}: {}", userId, e.getMessage());
            return "Usuario";
        }
    }
    
    /**
     * Obtiene el email del usuario desde la base de datos
     * @param userId ID del usuario
     * @return El email del usuario o null si no se encuentra
     */
    public String getUserEmail(String userId) {
        try {
            logger.info("Buscando email para usuario: {}", userId);
            
            String email = jdbcTemplate.queryForObject(
                "SELECT email FROM usuarios WHERE firebase_uid = ? AND email IS NOT NULL",
                String.class,
                userId
            );
            
            logger.info("Email encontrado para usuario {}: {}", userId, email);
            return email;
            
        } catch (Exception e) {
            logger.debug("Error al obtener email del usuario {}: {}", userId, e.getMessage());
            return null;
        }
    }
    
    /**
     * Obtiene el teléfono del usuario desde la base de datos
     * @param userId ID del usuario
     * @return El teléfono del usuario o null si no se encuentra
     */
    public String getUserPhone(String userId) {
        try {
            logger.info("Buscando teléfono para usuario: {}", userId);
            
            String phone = jdbcTemplate.queryForObject(
                "SELECT telefono FROM usuarios WHERE firebase_uid = ? AND telefono IS NOT NULL",
                String.class,
                userId
            );
            
            logger.info("Teléfono encontrado para usuario {}: {}", userId, phone);
            return phone;
            
        } catch (Exception e) {
            logger.debug("No se encontró teléfono para el usuario {} (esto es normal): {}", userId, e.getMessage());
            return null; // Retornar NULL como valor válido
        }
    }
}