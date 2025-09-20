package com.ferry77.backend.controller;

import com.ferry77.backend.dto.CreateProposalRequest;
import com.ferry77.backend.dto.ProposalResponse;
import com.ferry77.backend.service.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/proposals")
@CrossOrigin(origins = "*")
public class ProposalController {

    @Autowired
    private ProposalService proposalService;

    @PostMapping
    public ResponseEntity<?> createProposal(@RequestBody CreateProposalRequest request) {
        try {
            ProposalResponse response = proposalService.createProposal(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProposal(@PathVariable Long id) {
        try {
            return proposalService.getProposalById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/company/{companyId}")
    public ResponseEntity<?> getProposalsByCompany(
            @PathVariable Long companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            // Validar tamaño máximo de página para evitar sobrecarga
            if (size > 100) {
                size = 100;
            }

            Page<ProposalResponse> proposals = proposalService.getProposalsByCompany(companyId, page, size);
            return ResponseEntity.ok(proposals);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/solicitud/{solicitudId}")
    public ResponseEntity<?> getProposalsBySolicitud(@PathVariable Long solicitudId) {
        try {
            List<ProposalResponse> proposals = proposalService.getProposalsBySolicitud(solicitudId);
            return ResponseEntity.ok(proposals);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<?> getProposalsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            if (size > 100) {
                size = 100;
            }

            Page<ProposalResponse> proposals = proposalService.getProposalsByStatus(status, page, size);
            return ResponseEntity.ok(proposals);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateProposalStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            String newStatus = request.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "El estado es requerido"));
            }

            proposalService.updateProposalStatus(id, newStatus);
            return ResponseEntity.ok(Map.of("message", "Estado actualizado correctamente"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptProposal(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            proposalService.acceptProposal(id);
            return ResponseEntity.ok(Map.of(
                "message", "Cotización aceptada correctamente",
                "status", "confirmada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectProposal(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            proposalService.rejectProposal(id);
            return ResponseEntity.ok(Map.of(
                "message", "Cotización rechazada correctamente",
                "status", "rechazada"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    // Endpoint para estadísticas rápidas (útil para dashboards)
    @GetMapping("/stats/company/{companyId}")
    public ResponseEntity<?> getCompanyProposalStats(@PathVariable Long companyId) {
        try {
            // Obtener estadísticas básicas
            Page<ProposalResponse> recentProposals = proposalService.getProposalsByCompany(companyId, 0, 5);
            
            Map<String, Object> stats = Map.of(
                "totalProposals", recentProposals.getTotalElements(),
                "totalPages", recentProposals.getTotalPages(),
                "recentProposals", recentProposals.getContent()
            );
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }
}