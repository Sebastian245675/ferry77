package com.ferry77.backend.repository;

import com.ferry77.backend.model.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Long> {
    
    // Buscar solicitudes por usuario
    List<Solicitud> findByUsuarioIdOrderByFechaCreacionDesc(String usuarioId);
    
    // Buscar solicitudes por estado
    List<Solicitud> findByEstadoOrderByFechaCreacionDesc(String estado);
    
    // Buscar solicitudes por usuario y estado
    List<Solicitud> findByUsuarioIdAndEstadoOrderByFechaCreacionDesc(String usuarioId, String estado);
    
    // Contar solicitudes activas de un usuario
    @Query("SELECT COUNT(s) FROM Solicitud s WHERE s.usuarioId = :usuarioId AND s.estado IN ('pendiente', 'cotizando')")
    Long countSolicitudesActivasByUsuarioId(@Param("usuarioId") String usuarioId);

    // CONSULTAS OPTIMIZADAS CON ÍNDICES COMPUESTOS
    
    // Nueva: obtener solicitudes pendientes por ciudad (SÚPER OPTIMIZADA)
    @Query("SELECT s FROM Solicitud s WHERE s.estado IN :estados AND s.ubicacion = :ciudad ORDER BY s.fechaCreacion DESC")
    List<Solicitud> findPendingByCiudadOptimized(@Param("estados") List<String> estados, @Param("ciudad") String ciudad);
    
    // Consulta original con ciudad opcional (para compatibilidad)
    @Query("SELECT s FROM Solicitud s WHERE s.estado IN :estados AND (:ciudad IS NULL OR s.ubicacion = :ciudad) ORDER BY s.fechaCreacion DESC")
    List<Solicitud> findPendingByCiudad(@Param("estados") List<String> estados, @Param("ciudad") String ciudad);
    
    // Consulta ultra-rápida solo por ciudad usando índice específico
    @Query("SELECT s FROM Solicitud s WHERE s.ubicacion = :ciudad AND s.estado = 'pendiente' ORDER BY s.fechaCreacion DESC")
    List<Solicitud> findPendientesByCiudadFast(@Param("ciudad") String ciudad);
    
    // Consulta para múltiples estados con ubicación específica (usa índice compuesto) - solo pendientes
    @Query("SELECT s FROM Solicitud s WHERE s.ubicacion = :ciudad AND s.estado = 'pendiente' ORDER BY s.fechaCreacion DESC")
    List<Solicitud> findActivasByCiudad(@Param("ciudad") String ciudad);
    
    // Contar solicitudes activas por ciudad (optimizada para estadísticas) - solo pendientes
    @Query("SELECT COUNT(s) FROM Solicitud s WHERE s.ubicacion = :ciudad AND s.estado = 'pendiente'")
    Long countActivasByCiudad(@Param("ciudad") String ciudad);
    
    // Top ciudades por actividad de solicitudes
    @Query("SELECT s.ubicacion, COUNT(s) as total FROM Solicitud s WHERE s.estado IN ('pendiente', 'cotizando') GROUP BY s.ubicacion ORDER BY total DESC")
    List<Object[]> findTopCiudadesByActividad();
    
    // Buscar solicitudes recientes por ciudad (últimas 24 horas)
    @Query("SELECT s FROM Solicitud s WHERE s.ubicacion = :ciudad AND s.estado = 'pendiente' AND s.fechaCreacion >= :desde ORDER BY s.fechaCreacion DESC")
    List<Solicitud> findRecentesByCiudad(@Param("ciudad") String ciudad, @Param("desde") LocalDateTime desde);
}