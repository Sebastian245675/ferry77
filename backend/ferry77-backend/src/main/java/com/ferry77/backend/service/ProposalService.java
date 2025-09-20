package com.ferry77.backend.service;

import com.ferry77.backend.dto.CreateProposalRequest;
import com.ferry77.backend.dto.ProposalResponse;
import com.ferry77.backend.model.Proposal;
import com.ferry77.backend.model.ProposalItem;
import com.ferry77.backend.model.Solicitud;
import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.ProposalRepository;
import com.ferry77.backend.repository.ProposalItemRepository;
import com.ferry77.backend.repository.SolicitudRepository;
import com.ferry77.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProposalService {

    @Autowired
    private ProposalRepository proposalRepository;

    @Autowired
    private ProposalItemRepository proposalItemRepository;

    @Autowired
    private SolicitudRepository solicitudRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SimpleNotificationService simpleNotificationService;

    @Autowired
    private EmailService emailService;

    @Transactional
    public ProposalResponse createProposal(CreateProposalRequest request) {
        System.out.println("🔍 [ProposalService] Recibiendo propuesta:");
        System.out.println("    - CompanyId: " + request.getCompanyId());
        System.out.println("    - CompanyName: " + request.getCompanyName());
        System.out.println("    - SolicitudId: " + request.getSolicitudId());
        System.out.println("    - Currency: " + request.getCurrency());
        System.out.println("    - Items count: " + (request.getItems() != null ? request.getItems().size() : 0));

        // Verificar si ya existe una propuesta de esta empresa para esta solicitud
        if (proposalRepository.existsByCompanyIdAndSolicitudId(request.getCompanyId(), request.getSolicitudId())) {
            throw new RuntimeException("Ya existe una propuesta de esta empresa para esta solicitud");
        }

        // Crear la propuesta
        Proposal proposal = new Proposal();
        proposal.setCompanyId(request.getCompanyId());
        proposal.setCompanyName(request.getCompanyName());
        proposal.setSolicitudId(request.getSolicitudId());
        proposal.setCurrency(request.getCurrency());
        proposal.setDeliveryTime(request.getDeliveryTime());
        
        System.out.println("✅ [ProposalService] Propuesta creada con ID empresa: " + proposal.getCompanyId() + " y nombre: " + proposal.getCompanyName());
        System.out.println("    - Tiempo de entrega: " + proposal.getDeliveryTime());

        // Calcular el total
        Long total = request.getItems().stream()
                .mapToLong(item -> item.getQuantity() * item.getUnitPrice())
                .sum();
        proposal.setTotal(total);

        // Guardar la propuesta
        final Proposal savedProposal = proposalRepository.save(proposal);

        // Crear los ítems
        List<ProposalItem> items = request.getItems().stream()
                .map(itemRequest -> {
                    ProposalItem item = new ProposalItem();
                    item.setProposal(savedProposal);
                    item.setProductName(itemRequest.getProductName());
                    item.setQuantity(itemRequest.getQuantity());
                    item.setUnitPrice(itemRequest.getUnitPrice());
                    item.setTotalPrice(itemRequest.getQuantity() * itemRequest.getUnitPrice());
                    item.setComments(itemRequest.getComments());
                    return item;
                })
                .collect(Collectors.toList());

        proposalItemRepository.saveAll(items);

        // Actualizar estado de la solicitud a "cotizada"
        try {
            System.out.println("🔄 Intentando actualizar estado de solicitud ID: " + request.getSolicitudId());
            Optional<Solicitud> solicitudOpt = solicitudRepository.findById(request.getSolicitudId());
            
            if (solicitudOpt.isPresent()) {
                Solicitud solicitud = solicitudOpt.get();
                String estadoAnterior = solicitud.getEstado();
                
                solicitud.setEstado("cotizada");
                Solicitud solicitudGuardada = solicitudRepository.save(solicitud);
                
                System.out.println("✅ Estado de solicitud " + request.getSolicitudId() + " actualizado de '" + estadoAnterior + "' a '" + solicitudGuardada.getEstado() + "'");
                
                // CREAR NOTIFICACIÓN SIMPLE - FUNCIONA SIEMPRE
                String companyName = request.getCompanyName() != null ? request.getCompanyName() : "Una empresa";
                System.out.println("🚀 [ProposalService] Iniciando notificación para usuario: " + solicitud.getUsuarioId());
                
                simpleNotificationService.notifyNewProposal(
                    solicitud.getUsuarioId(), 
                    companyName, 
                    savedProposal.getId()
                );
                
                // ENVIAR CORREO ELECTRÓNICO AL CLIENTE
                try {
                    // Buscar datos del cliente para obtener el email
                    Usuario cliente = usuarioRepository.findByFirebaseUid(solicitud.getUsuarioId());
                    if (cliente != null && cliente.getEmail() != null && !cliente.getEmail().isEmpty()) {
                        String valorCotizacion = String.format("$%,d COP", savedProposal.getTotal());
                        String nombreCliente = cliente.getNombreCompleto() != null ? 
                                             cliente.getNombreCompleto() : cliente.getNick();
                        
                        emailService.sendCotizacionEmail(
                            cliente.getEmail(),
                            nombreCliente,
                            solicitud.getTitulo(),
                            companyName,
                            valorCotizacion,
                            savedProposal.getId()
                        );
                        
                        System.out.println("✅ [ProposalService] Correo de cotización enviado a: " + cliente.getEmail());
                    } else {
                        System.out.println("⚠️ [ProposalService] No se pudo enviar correo: cliente no encontrado o sin email");
                    }
                } catch (Exception emailError) {
                    System.err.println("❌ [ProposalService] Error enviando correo de cotización: " + emailError.getMessage());
                    // No falla la creación de la propuesta por error de email
                }
                
            } else {
                System.err.println("❌ No se encontró solicitud con ID: " + request.getSolicitudId());
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error al actualizar estado de solicitud: " + e.getMessage());
            e.printStackTrace();
            // No fallar la creación de la propuesta por esto
        }

        return convertToResponse(savedProposal, items);
    }

    @Transactional(readOnly = true)
    public Optional<ProposalResponse> getProposalById(Long id) {
        return proposalRepository.findByIdWithItems(id)
                .map(proposal -> convertToResponse(proposal, proposal.getItems()));
    }

    @Transactional(readOnly = true)
    public Page<ProposalResponse> getProposalsByCompany(Long companyId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return proposalRepository.findByCompanyId(companyId, pageable)
                .map(proposal -> convertToResponse(proposal, proposal.getItems()));
    }

    @Transactional(readOnly = true)
    public List<ProposalResponse> getProposalsBySolicitud(Long solicitudId) {
        return proposalRepository.findBySolicitudId(solicitudId)
                .stream()
                .map(proposal -> convertToResponse(proposal, proposal.getItems()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ProposalResponse> getProposalsByStatus(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return proposalRepository.findByStatus(status, pageable)
                .map(proposal -> convertToResponse(proposal, proposal.getItems()));
    }

    @Transactional
    public void updateProposalStatus(Long proposalId, String newStatus) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        proposal.setStatus(newStatus);
        proposalRepository.save(proposal);
    }

    @Transactional
    public void acceptProposal(Long proposalId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        // Cambiar estado a confirmada
        proposal.setStatus("confirmada");
        proposalRepository.save(proposal);
        
        // Obtener información de la solicitud para obtener datos del cliente
        Optional<Solicitud> solicitudOpt = solicitudRepository.findById(proposal.getSolicitudId());
        if (solicitudOpt.isPresent()) {
            Solicitud solicitud = solicitudOpt.get();
            
            // Marcar la solicitud como confirmada (ya no activa para más cotizaciones)
            solicitud.setEstado("confirmado");
            solicitudRepository.save(solicitud);
            
            // Obtener datos del cliente y de la empresa
            Usuario cliente = usuarioRepository.findByFirebaseUid(solicitud.getUsuarioId());
            Optional<Usuario> empresaOpt = usuarioRepository.findById(proposal.getCompanyId());
            
            if (cliente != null && empresaOpt.isPresent()) {
                Usuario empresa = empresaOpt.get();
                
                // Enviar notificación a la empresa
                String notificationMessage = String.format(
                    "¡Felicidades! Tu cotización para '%s' ha sido aceptada por %s. " +
                    "Contacta al cliente para coordinar el servicio.",
                    solicitud.getTitulo(),
                    cliente.getNombreCompleto()
                );
                
                simpleNotificationService.notifyProposalAccepted(
                    proposal.getCompanyId(),
                    proposalId,
                    notificationMessage
                );
                
                // Enviar email a la empresa con datos del cliente
                try {
                    emailService.sendProposalAcceptedEmail(
                        empresa.getEmail(),
                        empresa.getNombreCompleto(),
                        cliente.getNombreCompleto(),
                        cliente.getEmail(),
                        cliente.getTelefono(),
                        solicitud.getTitulo(),
                        String.format("$%,.0f", proposal.getTotal()),
                        proposal.getDeliveryTime()
                    );
                } catch (Exception e) {
                    System.err.println("Error enviando email de confirmación: " + e.getMessage());
                }
            }
        }
    }

    @Transactional
    public void rejectProposal(Long proposalId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new RuntimeException("Propuesta no encontrada"));
        
        // Cambiar estado a rechazada
        proposal.setStatus("rechazada");
        proposalRepository.save(proposal);
        
        // Enviar notificación a la empresa
        Optional<Solicitud> solicitudOpt = solicitudRepository.findById(proposal.getSolicitudId());
        if (solicitudOpt.isPresent()) {
            Solicitud solicitud = solicitudOpt.get();
            
            String notificationMessage = String.format(
                "Tu cotización para '%s' ha sido rechazada por el cliente.",
                solicitud.getTitulo()
            );
            
            simpleNotificationService.notifyProposalRejected(
                proposal.getCompanyId(),
                proposalId,
                notificationMessage
            );
        }
    }

    private ProposalResponse convertToResponse(Proposal proposal, List<ProposalItem> items) {
        List<ProposalResponse.ProposalItemResponse> itemResponses = items.stream()
                .map(item -> new ProposalResponse.ProposalItemResponse(
                        item.getId(),
                        item.getProductName(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getTotalPrice(),
                        item.getComments()
                ))
                .collect(Collectors.toList());

        return new ProposalResponse(
                proposal.getId(),
                proposal.getCompanyId(),
                proposal.getCompanyName(),
                proposal.getSolicitudId(),
                proposal.getTotal(),
                proposal.getCurrency(),
                proposal.getStatus(),
                proposal.getDeliveryTime(),
                proposal.getCreatedAt(),
                itemResponses
        );
    }
}