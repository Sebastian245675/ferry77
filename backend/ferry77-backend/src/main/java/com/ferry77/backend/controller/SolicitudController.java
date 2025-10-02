package com.ferry77.backend.controller;

import com.ferry77.backend.dto.NotificationDTO;
import com.ferry77.backend.dto.SolicitudDTO;
import com.ferry77.backend.model.ItemSolicitud;
import com.ferry77.backend.model.Solicitud;
import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.SolicitudRepository;
import com.ferry77.backend.repository.UsuarioRepository;
import com.ferry77.backend.service.NotificationService;
import com.ferry77.backend.service.CiudadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/solicitudes")

@CrossOrigin(origins = "*")
public class SolicitudController {

    @Autowired
    private SolicitudRepository solicitudRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private CiudadService ciudadService;

    // Health check endpoint para verificar que el backend esté funcionando
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "SolicitudController");
        health.put("timestamp", System.currentTimeMillis());
        try {
            // Probar conexión a BD contando solicitudes
            long count = solicitudRepository.count();
            health.put("database", "Connected");
            health.put("total_solicitudes", count);
        } catch (Exception e) {
            health.put("database", "Error: " + e.getMessage());
        }
        return ResponseEntity.ok(health);
    }

    @PostMapping
    public ResponseEntity<?> crearSolicitud(@RequestBody SolicitudDTO dto) {
        try {
            System.out.println("🔍 [SolicitudController] Recibiendo solicitud:");
            System.out.println("    - UsuarioId: " + dto.usuarioId);
            System.out.println("    - Titulo: " + dto.titulo);
            System.out.println("    - Profesion: " + dto.profesion);
            System.out.println("    - Tipo: " + dto.tipo);
            System.out.println("    - Ubicacion: " + dto.ubicacion);
            System.out.println("    - Presupuesto: " + dto.presupuesto);
            System.out.println("    - Items count: " + (dto.items != null ? dto.items.size() : 0));

            if (dto.usuarioId == null || dto.usuarioId.trim().isEmpty()) {
                System.err.println("❌ [SolicitudController] Error: UsuarioId vacío");
                return ResponseEntity.badRequest().body(createErrorResponse("El ID de usuario es obligatorio"));
            }
            
            if (dto.titulo == null || dto.titulo.trim().isEmpty()) {
                System.err.println("❌ [SolicitudController] Error: Titulo vacío");
                return ResponseEntity.badRequest().body(createErrorResponse("El título es obligatorio"));
            }

            System.out.println("✅ [SolicitudController] Validaciones básicas pasadas, creando solicitud...");

            Solicitud solicitud = new Solicitud();
            solicitud.setUsuarioId(dto.usuarioId);
            
            // Obtener nombre del usuario - priorizar el del DTO, sino buscar en BD
            String nombreUsuario = dto.usuarioNombre;
            if (nombreUsuario == null || nombreUsuario.trim().isEmpty()) {
                Usuario usuario = usuarioRepository.findByFirebaseUid(dto.usuarioId);
                if (usuario != null && usuario.getNombreCompleto() != null && !usuario.getNombreCompleto().trim().isEmpty()) {
                    nombreUsuario = usuario.getNombreCompleto();
                } else {
                    nombreUsuario = "Usuario Anónimo";
                }
            }
            solicitud.setUsuarioNombre(nombreUsuario);
            
            solicitud.setUsuarioEmail(dto.usuarioEmail);
            solicitud.setTitulo(dto.titulo);
            solicitud.setProfesion(dto.profesion != null ? dto.profesion : "general");
            solicitud.setTipo(dto.tipo != null ? dto.tipo : "herramienta"); 
            
            String ubicacionFinal;
            if (dto.ubicacion != null && !dto.ubicacion.trim().isEmpty()) {
                ubicacionFinal = dto.ubicacion;
            } else {
                Usuario usuario = usuarioRepository.findByFirebaseUid(dto.usuarioId);
                if (usuario != null && usuario.getCiudad() != null && !usuario.getCiudad().trim().isEmpty()) {
                    ubicacionFinal = usuario.getCiudad();
                } else {
                    ubicacionFinal = "Ubicación no especificada";
                }
            }
            solicitud.setUbicacion(ubicacionFinal);
            solicitud.setPresupuesto(dto.presupuesto);
            solicitud.setEstado("pendiente");

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

            Solicitud solicitudGuardada = solicitudRepository.save(solicitud);

            NotificationDTO notification = new NotificationDTO(
                "Solicitud creada",
                "Su solicitud se ha creado con éxito. Pronto algún negocio se comunicará con usted.",
                "solicitud_created",
                Map.of("solicitudId", solicitudGuardada.getId())
            );
            notificationService.sendToUserTopic(dto.usuarioId, notification);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Solicitud creada exitosamente");
            response.put("solicitud", solicitudGuardada);
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ [SolicitudController] ERROR CRÍTICO al crear solicitud:");
            System.err.println("    - Tipo de excepción: " + e.getClass().getSimpleName());
            System.err.println("    - Mensaje: " + e.getMessage());
            System.err.println("    - Stack trace:");
            e.printStackTrace();
            
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

    // ENDPOINT OPTIMIZADO: obtener solicitudes pendientes filtradas por ciudad
    @GetMapping("/pending")
    public ResponseEntity<List<Solicitud>> obtenerSolicitudesPendientesPorCiudad(
            @RequestParam(required = false) String ciudad) {
        try {
            System.out.println("🔍 [DEBUG] Filtrado por ciudad solicitado: '" + ciudad + "'");
            
            List<Solicitud> resultado;
            
            if (ciudad != null && !ciudad.trim().isEmpty()) {
                String ciudadLimpia = ciudad.trim();
                System.out.println("🏙️ [DEBUG] Buscando solicitudes que contengan: '" + ciudadLimpia + "'");
                
                // DEBUG: Primero obtener todas las solicitudes para comparar
                List<Solicitud> todasSolicitudes = solicitudRepository.findByEstadoOrderByFechaCreacionDesc("pendiente");
                System.out.println("📊 [DEBUG] Total solicitudes pendientes en BD: " + todasSolicitudes.size());
                for (int i = 0; i < todasSolicitudes.size(); i++) {
                    Solicitud solicitud = todasSolicitudes.get(i);
                    System.out.println("📍 [DEBUG] Solicitud BD " + (i + 1) + ": ID=" + solicitud.getId() + ", Ubicación='" + solicitud.getUbicacion() + "', Estado='" + solicitud.getEstado() + "'");
                }
                
                // BÚSQUEDA MÚLTIPLE: Probar diferentes estrategias de búsqueda
                
                // Estrategia 1: Búsqueda exacta (case insensitive)
                List<Solicitud> resultadoExacto = solicitudRepository.findAll().stream()
                    .filter(s -> "pendiente".equals(s.getEstado()))
                    .filter(s -> s.getUbicacion() != null && s.getUbicacion().toLowerCase().equals(ciudadLimpia.toLowerCase()))
                    .collect(Collectors.toList());
                System.out.println("🎯 [DEBUG] Búsqueda exacta encontró: " + resultadoExacto.size() + " solicitudes");
                
                // Estrategia 2: Búsqueda parcial (contiene)
                List<Solicitud> resultadoParcial = solicitudRepository.findAll().stream()
                    .filter(s -> "pendiente".equals(s.getEstado()))
                    .filter(s -> s.getUbicacion() != null && s.getUbicacion().toLowerCase().contains(ciudadLimpia.toLowerCase()))
                    .collect(Collectors.toList());
                System.out.println("🎯 [DEBUG] Búsqueda parcial encontró: " + resultadoParcial.size() + " solicitudes");
                
                // Usar el resultado que tenga más coincidencias
                resultado = resultadoParcial.size() >= resultadoExacto.size() ? resultadoParcial : resultadoExacto;
                
                // Debug: mostrar las ubicaciones encontradas
                System.out.println("📊 [DEBUG] Total final de solicitudes encontradas: " + resultado.size());
                for (int i = 0; i < resultado.size(); i++) {
                    Solicitud solicitud = resultado.get(i);
                    System.out.println("📍 [DEBUG] Solicitud filtrada " + (i + 1) + ": ID=" + solicitud.getId() + ", Ubicación='" + solicitud.getUbicacion() + "'");
                }
                
                // Registrar actividad de la ciudad para estadísticas
                ciudadService.buscarOCrearCiudad(ciudadLimpia);
                
                System.out.println("[OPTIMIZED] Solicitudes encontradas para ciudad '" + ciudad + "': " + resultado.size());
            } else {
                // NUEVA LÓGICA: Si no hay ciudad específica, NO mostrar solicitudes
                // Las empresas solo deben ver solicitudes de su ciudad
                System.out.println("⚠️ [SECURITY] Sin ciudad especificada - no se muestran solicitudes");
                resultado = new ArrayList<>();
            }
            
            // ENRIQUECER con nombres de usuario desde la BD
            resultado = enriquecerConNombresUsuarios(resultado);
            
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            System.err.println("[ERROR] Error al obtener solicitudes pendientes: " + e.getMessage());
            System.err.println("[ERROR] Tipo de error: " + e.getClass().getSimpleName());
            e.printStackTrace();
            
            // Devolver lista vacía en lugar de error 500 para evitar que se rompa el frontend
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
    
    // NUEVO ENDPOINT: obtener solo solicitudes pendientes (no cotizando) por ciudad
    @GetMapping("/pending/strict")
    public ResponseEntity<List<Solicitud>> obtenerSolicitudesPendientesStrictas(
            @RequestParam(required = false) String ciudad) {
        try {
            List<Solicitud> resultado;
            
            if (ciudad != null && !ciudad.trim().isEmpty()) {
                // CONSULTA MÁS RÁPIDA: solo estado 'pendiente'
                resultado = solicitudRepository.findPendientesByCiudadFast(ciudad.trim());
                System.out.println("[FAST] Solicitudes pendientes para ciudad '" + ciudad + "': " + resultado.size());
            } else {
                List<String> estados = Arrays.asList("pendiente");
                resultado = solicitudRepository.findPendingByCiudad(estados, null);
                System.out.println("[GENERAL-STRICT] Solicitudes pendientes totales: " + resultado.size());
            }
            
            // ENRIQUECER con nombres de usuario desde la BD
            resultado = enriquecerConNombresUsuarios(resultado);
            
            return ResponseEntity.ok(resultado);
        } catch (Exception e) {
            System.err.println("[ERROR] Error al obtener solicitudes pendientes estrictas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // NUEVO ENDPOINT: estadísticas por ciudad
    @GetMapping("/stats/ciudades")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticasCiudades() {
        try {
            List<Object[]> topCiudades = solicitudRepository.findTopCiudadesByActividad();
            
            Map<String, Object> estadisticas = new HashMap<>();
            estadisticas.put("topCiudades", topCiudades);
            estadisticas.put("totalCiudadesActivas", topCiudades.size());
            estadisticas.put("ciudadesConActividad", ciudadService.getCiudadesConActividad());
            
            return ResponseEntity.ok(estadisticas);
        } catch (Exception e) {
            System.err.println("[ERROR] Error al obtener estadísticas: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", message);
        return response;
    }
    
    /**
     * Método para enriquecer las solicitudes con nombres de usuario desde la BD
     * cuando el usuarioNombre está vacío o es genérico
     */
    private List<Solicitud> enriquecerConNombresUsuarios(List<Solicitud> solicitudes) {
        return solicitudes.stream().map(solicitud -> {
            try {
                // Buscar usuario en la BD para obtener nombre completo y teléfono
                Usuario usuario = usuarioRepository.findByFirebaseUid(solicitud.getUsuarioId());
                
                if (usuario != null) {
                    // Enriquecer con nombre completo si no está presente o es genérico
                    if (solicitud.getUsuarioNombre() == null || 
                        solicitud.getUsuarioNombre().trim().isEmpty() ||
                        solicitud.getUsuarioNombre().equals("Usuario") ||
                        solicitud.getUsuarioNombre().equals("Usuario Anónimo")) {
                        
                        if (usuario.getNombreCompleto() != null && !usuario.getNombreCompleto().trim().isEmpty()) {
                            solicitud.setUsuarioNombre(usuario.getNombreCompleto());
                        } else {
                            solicitud.setUsuarioNombre("Usuario no registrado");
                        }
                    }
                    
                    // Enriquecer con teléfono siempre (para WhatsApp)
                    if (usuario.getTelefono() != null && !usuario.getTelefono().trim().isEmpty()) {
                        solicitud.setTelefono(usuario.getTelefono());
                        System.out.println("[ENRIQUECIDO] Usuario " + solicitud.getUsuarioId() + 
                                         " -> " + usuario.getNombreCompleto() + " | Teléfono: " + usuario.getTelefono());
                    } else {
                        System.out.println("[WARNING] Usuario " + solicitud.getUsuarioId() + " sin teléfono registrado");
                    }
                } else {
                    // Si no se encuentra el usuario, marcar como no encontrado
                    solicitud.setUsuarioNombre("Usuario no registrado");
                    System.out.println("[WARNING] No se encontró usuario para ID: " + solicitud.getUsuarioId());
                }
                
                return solicitud;
            } catch (Exception e) {
                System.err.println("[ERROR] Error al enriquecer usuario " + solicitud.getUsuarioId() + ": " + e.getMessage());
                return solicitud;
            }
        }).collect(Collectors.toList());
    }

    @PutMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String nuevoEstado = request.get("estado");
            if (nuevoEstado == null || nuevoEstado.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("El estado es requerido"));
            }

            // Validar estados permitidos
            List<String> estadosPermitidos = Arrays.asList("pendiente", "cotizando", "cotizada", "en_proceso", "completada", "cancelada");
            if (!estadosPermitidos.contains(nuevoEstado)) {
                return ResponseEntity.badRequest().body(createErrorResponse("Estado no válido: " + nuevoEstado));
            }

            Solicitud solicitud = solicitudRepository.findById(id).orElse(null);
            if (solicitud == null) {
                return ResponseEntity.notFound().build();
            }

            solicitud.setEstado(nuevoEstado);
            solicitudRepository.save(solicitud);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Estado actualizado correctamente");
            response.put("id", id);
            response.put("nuevoEstado", nuevoEstado);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(createErrorResponse("Error interno del servidor"));
        }
    }
}
