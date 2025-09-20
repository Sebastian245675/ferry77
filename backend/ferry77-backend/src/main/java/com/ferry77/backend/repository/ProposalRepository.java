package com.ferry77.backend.repository;

import com.ferry77.backend.model.Proposal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProposalRepository extends JpaRepository<Proposal, Long> {

    // Buscar propuestas por ID de solicitud
    List<Proposal> findBySolicitudId(Long solicitudId);

    // Buscar propuestas por empresa con paginación
    Page<Proposal> findByCompanyId(Long companyId, Pageable pageable);

    // Buscar propuestas por empresa y solicitud
    Optional<Proposal> findByCompanyIdAndSolicitudId(Long companyId, Long solicitudId);

    // Buscar propuestas por estado
    Page<Proposal> findByStatus(String status, Pageable pageable);

    // Buscar propuestas por empresa y estado
    Page<Proposal> findByCompanyIdAndStatus(Long companyId, String status, Pageable pageable);

    // Query personalizada para obtener propuestas con ítems (evita N+1)
    @Query("SELECT p FROM Proposal p LEFT JOIN FETCH p.items WHERE p.id = :id")
    Optional<Proposal> findByIdWithItems(@Param("id") Long id);

    // Contar propuestas por empresa
    long countByCompanyId(Long companyId);

    // Verificar si ya existe una propuesta para una solicitud de una empresa
    boolean existsByCompanyIdAndSolicitudId(Long companyId, Long solicitudId);
}