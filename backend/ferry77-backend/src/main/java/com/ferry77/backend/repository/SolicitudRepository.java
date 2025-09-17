package com.ferry77.backend.repository;

import com.ferry77.backend.model.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}