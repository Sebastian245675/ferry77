package com.ferry77.backend.repository;

import com.ferry77.backend.model.Ciudad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CiudadRepository extends JpaRepository<Ciudad, Long> {
    
    // Buscar ciudad por nombre exacto (optimizado con índice)
    Optional<Ciudad> findByNombreIgnoreCase(String nombre);
    
    // Buscar ciudad por nombre exacto (para población de datos)
    Optional<Ciudad> findByNombre(String nombre);
    
    // Buscar ciudad por código (muy rápido con índice único)
    Optional<Ciudad> findByCodigo(String codigo);
    
    // Buscar ciudades activas para selector
    List<Ciudad> findByActivaTrueOrderByNombreAsc();
    
    // Buscar ciudades con solicitudes activas (para estadísticas)
    @Query("SELECT c FROM Ciudad c WHERE c.activa = true AND c.solicitudesActivas > 0 ORDER BY c.solicitudesActivas DESC")
    List<Ciudad> findCiudadesConSolicitudesActivas();
    
    // Buscar o crear ciudad (para normalización automática)
    @Query("SELECT c FROM Ciudad c WHERE LOWER(c.nombre) = LOWER(:nombre)")
    Optional<Ciudad> findByNombreIgnoreCaseExact(@Param("nombre") String nombre);
    
    // Top ciudades por actividad (para dashboard de administración)
    @Query("SELECT c FROM Ciudad c WHERE c.activa = true ORDER BY c.totalSolicitudes DESC")
    List<Ciudad> findTopCiudadesByActivity();
    
    // Contar solicitudes activas por ciudad
    @Query("SELECT COUNT(c) FROM Ciudad c WHERE c.activa = true AND c.solicitudesActivas > 0")
    Long countCiudadesConActividad();
}