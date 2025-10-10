package com.ferry77.backend.controller;

import com.ferry77.backend.dto.CreateProposalRequest;
import com.ferry77.backend.dto.ProposalResponse;
import com.ferry77.backend.dto.QuickResponseDTO;
import com.ferry77.backend.model.QuickResponse;
import com.ferry77.backend.repository.QuickResponseRepository;
import com.ferry77.backend.service.ProposalService;
// import com.ferry77.backend.service.QuickResponseService;
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

    @Autowired
    private QuickResponseRepository quickResponseRepository;

    // @Autowired
    // private QuickResponseService quickResponseService;

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

    // === ENDPOINTS PARA RESPUESTAS RÁPIDAS ===
    
    @PostMapping("/quick-response")
    public ResponseEntity<?> createQuickResponse(@RequestBody QuickResponseDTO requestDTO) {
        try {
            System.out.println("🔍 [ProposalController] Creando respuesta rápida...");
            System.out.println("   - Company ID: " + requestDTO.getCompanyId());
            System.out.println("   - Solicitud ID: " + requestDTO.getSolicitudId());
            System.out.println("   - Response Type: " + requestDTO.getResponseType());
            
            // Crear nueva respuesta
            QuickResponse response = new QuickResponse();
            response.setCompanyId(requestDTO.getCompanyId());
            response.setCompanyName(requestDTO.getCompanyName());
            response.setSolicitudId(requestDTO.getSolicitudId());
            response.setResponseType(requestDTO.getResponseType());
            response.setMessage(requestDTO.getMessage());
            response.setFileName(requestDTO.getFileName());
            response.setFileType(requestDTO.getFileType());
            response.setFileUrl(requestDTO.getFileUrl());
            response.setFileSize(requestDTO.getFileSize());
            response.setStatus("SENT");
            
            // Guardar en base de datos
            QuickResponse savedResponse = quickResponseRepository.save(response);
            System.out.println("✅ [ProposalController] Respuesta rápida guardada con ID: " + savedResponse.getId());
            
            return ResponseEntity.ok(Map.of(
                "message", "Respuesta rápida enviada exitosamente",
                "responseId", savedResponse.getId(),
                "status", savedResponse.getStatus()
            ));
        } catch (Exception e) {
            System.err.println("❌ [ProposalController] Error creando respuesta rápida: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/quick-responses/solicitud/{solicitudId}")
    public ResponseEntity<?> getQuickResponsesBySolicitud(@PathVariable Long solicitudId) {
        try {
            System.out.println("[QUICK RESPONSES] Buscando respuestas rápidas para solicitud: " + solicitudId);
            List<QuickResponse> responses = quickResponseRepository.findBySolicitudIdOrderByCreatedAtDesc(solicitudId);
            System.out.println("[QUICK RESPONSES] Encontradas " + responses.size() + " respuestas rápidas");
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("[ERROR] Error obteniendo respuestas rápidas: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/quick-responses/company/{companyId}")
    public ResponseEntity<?> getQuickResponsesByCompany(
            @PathVariable Long companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            // Usar el método del repository que ya existe con paginación
            org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(page, size);
            org.springframework.data.domain.Page<QuickResponse> responses = 
                quickResponseRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable);
                    
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error obteniendo respuestas rápidas: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/quick-responses/{id}")
    public ResponseEntity<?> getQuickResponseById(@PathVariable Long id) {
        try {
            System.out.println("🔍 [ProposalController] Obteniendo QuickResponse ID: " + id);
            
            return quickResponseRepository.findById(id)
                    .map(response -> {
                        System.out.println("✅ [ProposalController] QuickResponse encontrada: " + response.getId());
                        System.out.println("   - Company: " + response.getCompanyName());
                        System.out.println("   - Type: " + response.getResponseType());
                        System.out.println("   - File URL: " + response.getFileUrl());
                        return ResponseEntity.ok(response);
                    })
                    .orElseGet(() -> {
                        System.err.println("❌ [ProposalController] QuickResponse no encontrada: " + id);
                        return ResponseEntity.notFound().build();
                    });
        } catch (Exception e) {
            System.err.println("❌ [ProposalController] Error obteniendo QuickResponse: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @PutMapping("/quick-responses/{id}/status")
    public ResponseEntity<?> updateQuickResponseStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        try {
            // QuickResponse response = quickResponseService.updateResponseStatus(id, status);
            // if (response != null) {
            //     return ResponseEntity.ok(response);
            // } else {
                return ResponseEntity.notFound().build();
            // }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }

    @GetMapping("/quick-responses/check/{companyId}/{solicitudId}")
    public ResponseEntity<?> checkIfCompanyResponded(
            @PathVariable Long companyId, 
            @PathVariable Long solicitudId) {
        try {
            // boolean hasResponded = quickResponseService.hasCompanyResponded(companyId, solicitudId);
            // return ResponseEntity.ok(Map.of("hasResponded", hasResponded));
            return ResponseEntity.ok(Map.of("hasResponded", false)); // Temporary
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno del servidor"));
        }
    }
}