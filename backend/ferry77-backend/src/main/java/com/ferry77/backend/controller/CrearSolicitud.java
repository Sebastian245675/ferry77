package com.ferry77.backend.controller;

import com.ferry77.backend.dto.SolicitudDTO;
import com.ferry77.backend.model.ItemSolicitud;
import com.ferry77.backend.model.Solicitud;
import com.ferry77.backend.repository.SolicitudRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/solicitudes")
@CrossOrigin(origins = "*")
public class SolicitudController {

    @Autowired
    private SolicitudRepository solicitudRepository;

    @PostMapping
    public ResponseEntity<?> crearSolicitud(@RequestBody SolicitudDTO dto) {
        try {
            // Validaciones básicas
            if (dto.usuarioId == null || dto.usuarioId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("El ID de usuario es obligatorio"));
            }
            
            if (dto.titulo == null || dto.titulo.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("El título es obligatorio"));
            }
            
            if (dto.ubicacion == null || dto.ubicacion.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("La ubicación es obligatoria"));
            }

            // Crear nueva solicitud
            Solicitud solicitud = new Solicitud();
            solicitud.setUsuarioId(dto.usuarioId);
            solicitud.setUsuarioNombre(dto.usuarioNombre != null ? dto.usuarioNombre : "Usuario");
            solicitud.setUsuarioEmail(dto.usuarioEmail);
            solicitud.setTitulo(dto.titulo);
            solicitud.setProfesion(dto.profesion != null ? dto.profesion : "general");
            solicitud.setUbicacion(dto.ubicacion);
            solicitud.setPresupuesto(dto.presupuesto);
            solicitud.setEstado("pendiente");

            // Convertir y agregar items
            if (dto.items != null && !dto.items.isEmpty()) {
                List<ItemSolicitud> items = dto.items.stream().map(itemDto -> {
                    ItemSolicitud item = new ItemSolicitud();
                    item.setNombre(itemDto.nombre != null ? itemDto.nombre : "Item");
                    item.setCantidad(itemDto.cantidad != null ? itemDto.cantidad : 1);
                    item.setEspecificaciones(itemDto.especificaciones);
                    item.setImagenUrl(itemDto.imagenUrl);
                    item.setPrecio(itemDto.precio);
                    return item;
                }).collect(Collectors.toList());
                
                solicitud.setItems(items);
            }

            // Guardar en la base de datos
            Solicitud solicitudGuardada = solicitudRepository.save(solicitud);

            // Crear respuesta exitosa
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Solicitud creada exitosamente");
            response.put("solicitud", solicitudGuardada);
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(createErrorResponse("Error interno del servidor: " + e.getMessage()));
        }
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<List<Solicitud>> obtenerSolicitudesPorUsuario(@PathVariable String usuarioId) {
        try {
            List<Solicitud> solicitudes = solicitudRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId);
            return ResponseEntity.ok(solicitudes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Solicitud> obtenerSolicitudPorId(@PathVariable Long id) {
        try {
            return solicitudRepository.findById(id)
                .map(solicitud -> ResponseEntity.ok(solicitud))
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
}
