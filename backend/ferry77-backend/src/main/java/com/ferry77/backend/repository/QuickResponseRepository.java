package com.ferry77.backend.repository;

import com.ferry77.backend.model.QuickResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuickResponseRepository extends JpaRepository<QuickResponse, Long> {
    
    // Buscar respuestas por solicitud ID
    List<QuickResponse> findBySolicitudIdOrderByCreatedAtDesc(Long solicitudId);
    
    // Buscar respuestas por empresa ID
    Page<QuickResponse> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);
    
    // Buscar respuestas por empresa y estado
    List<QuickResponse> findByCompanyIdAndStatus(Long companyId, String status);
    
    // Buscar respuesta específica por empresa y solicitud
    @Query("SELECT qr FROM QuickResponse qr WHERE qr.companyId = :companyId AND qr.solicitudId = :solicitudId")
    List<QuickResponse> findByCompanyIdAndSolicitudId(@Param("companyId") Long companyId, @Param("solicitudId") Long solicitudId);
    
    // Contar respuestas por solicitud
    long countBySolicitudId(Long solicitudId);
    
    // Verificar si una empresa ya respondió a una solicitud
    boolean existsByCompanyIdAndSolicitudId(Long companyId, Long solicitudId);
}