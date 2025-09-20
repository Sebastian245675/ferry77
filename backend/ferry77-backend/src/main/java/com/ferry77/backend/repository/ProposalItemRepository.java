package com.ferry77.backend.repository;

import com.ferry77.backend.model.ProposalItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProposalItemRepository extends JpaRepository<ProposalItem, Long> {

    // Buscar ítems por ID de propuesta
    List<ProposalItem> findByProposalId(Long proposalId);

    // Eliminar ítems por ID de propuesta
    void deleteByProposalId(Long proposalId);
}