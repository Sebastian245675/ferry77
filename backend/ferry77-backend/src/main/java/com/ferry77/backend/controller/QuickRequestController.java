package com.ferry77.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.ferry77.backend.service.FileProcessingService;
import com.ferry77.backend.service.UserService;
import com.ferry77.backend.dto.FileProcessingResponse;
import com.ferry77.backend.dto.QuickRequestDTO;
import com.ferry77.backend.dto.SolicitudDTO;
import com.ferry77.backend.model.Solicitud;
import com.ferry77.backend.model.ItemSolicitud;
import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.SolicitudRepository;
import com.ferry77.backend.repository.UsuarioRepository;
import com.ferry77.backend.service.NotificationService;
import com.ferry77.backend.dto.NotificationDTO;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/quick-request")
@CrossOrigin(origins = "*")
public class QuickRequestController {

    @Autowired
    private FileProcessingService fileProcessingService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private SolicitudRepository solicitudRepository;
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private NotificationService notificationService;

    @PostMapping("/upload-files")
    public ResponseEntity<?> uploadFiles(@RequestParam("files") List<MultipartFile> files) {
        try {
            List<FileProcessingResponse> results = fileProcessingService.processFiles(files);
            return ResponseEntity.ok(Map.of("success", true, "results", results));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/generate-request")
    public ResponseEntity<?> generateRequest(@RequestBody QuickRequestDTO requestData) {
        try {
            // Obtener información del usuario desde la base de datos
            if (requestData.getUserId() != null && !requestData.getUserId().trim().isEmpty()) {
                String userLocation = userService.getUserLocation(requestData.getUserId());
                String userName = userService.getUserName(requestData.getUserId());
                String userEmail = userService.getUserEmail(requestData.getUserId());
                String userPhone = userService.getUserPhone(requestData.getUserId());
                
                // Si no se especificó ubicación en la request o es un valor por defecto, usar la del usuario
                if (requestData.getLocation() == null || requestData.getLocation().trim().isEmpty() || 
                    "Por definir".equals(requestData.getLocation()) || 
                    "Ubicación no especificada".equals(requestData.getLocation())) {
                    requestData.setLocation(userLocation);
                }
                
                // Actualizar nombre de usuario si no se proporcionó
                if (requestData.getUserName() == null || requestData.getUserName().trim().isEmpty() ||
                    "Usuario".equals(requestData.getUserName())) {
                    requestData.setUserName(userName);
                }
                
                // Actualizar email de usuario si no se proporcionó
                if (requestData.getUserEmail() == null || requestData.getUserEmail().trim().isEmpty()) {
                    requestData.setUserEmail(userEmail);
                }
                
                // Siempre establecer el teléfono (puede ser null)
                requestData.setUserPhone(userPhone);
            }
            
            Map<String, Object> generatedRequest = fileProcessingService.generateStructuredRequest(requestData);
            return ResponseEntity.ok(Map.of("success", true, "request", generatedRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/process-text")
    public ResponseEntity<?> processText(@RequestBody Map<String, String> payload) {
        try {
            String description = payload.get("description");
            Map<String, Object> extractedInfo = fileProcessingService.extractInfoFromText(description);
            return ResponseEntity.ok(Map.of("success", true, "extracted", extractedInfo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/save-request")
    public ResponseEntity<?> saveQuickRequest(@RequestBody Map<String, Object> payload) {
        try {
            System.out.println("🔍 [QuickRequestController] Guardando solicitud rápida...");
            
            // Extraer datos del payload
            String usuarioId = (String) payload.get("usuarioId");
            String usuarioNombre = (String) payload.get("usuarioNombre");  
            String usuarioEmail = (String) payload.get("usuarioEmail");
            @SuppressWarnings("unchecked")
            Map<String, Object> requestData = (Map<String, Object>) payload.get("requestData");
            
            if (usuarioId == null || usuarioId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "El ID de usuario es obligatorio"));
            }
            
            if (requestData == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Los datos de la solicitud son obligatorios"));
            }
            
            // Obtener información actualizada del usuario desde la base de datos
            String userLocation = userService.getUserLocation(usuarioId);
            String userName = userService.getUserName(usuarioId);
            String userEmail = userService.getUserEmail(usuarioId);
            String userPhone = userService.getUserPhone(usuarioId);
            
            // Crear solicitud
            Solicitud solicitud = new Solicitud();
            solicitud.setUsuarioId(usuarioId);
            
            // Usar el nombre del usuario de la base de datos si no se proporcionó o es genérico
            String nombreFinal = usuarioNombre;
            if (nombreFinal == null || nombreFinal.trim().isEmpty() || "Usuario".equals(nombreFinal)) {
                nombreFinal = userName;
                if (nombreFinal == null || nombreFinal.trim().isEmpty() || "Usuario".equals(nombreFinal)) {
                    Usuario usuario = usuarioRepository.findByFirebaseUid(usuarioId);
                    if (usuario != null && usuario.getNombreCompleto() != null && !usuario.getNombreCompleto().trim().isEmpty()) {
                        nombreFinal = usuario.getNombreCompleto();
                    } else {
                        nombreFinal = "Usuario Anónimo";
                    }
                }
            }
            solicitud.setUsuarioNombre(nombreFinal);
            
            // Usar el email del usuario de la base de datos si no se proporcionó
            String emailFinal = usuarioEmail;
            if (emailFinal == null || emailFinal.trim().isEmpty()) {
                emailFinal = userEmail;
            }
            solicitud.setUsuarioEmail(emailFinal);
            
            // Establecer el teléfono del usuario (puede ser null)
            solicitud.setTelefono(userPhone);
            
            System.out.println("📱 [QuickRequestController] Teléfono asignado: " + userPhone);
            
            // Datos de la solicitud estructurada
            solicitud.setTitulo((String) requestData.get("title"));
            solicitud.setProfesion((String) requestData.get("profession"));
            solicitud.setTipo((String) requestData.get("tipo"));
            
            // Usar la ubicación del usuario de la base de datos si no se especificó o es genérica
            String locationFromRequest = (String) requestData.get("location");
            String ubicacionFinal = locationFromRequest;
            if (ubicacionFinal == null || ubicacionFinal.trim().isEmpty() || 
                "Por definir".equals(ubicacionFinal) || 
                "Ubicación no especificada".equals(ubicacionFinal)) {
                ubicacionFinal = userLocation;
            }
            solicitud.setUbicacion(ubicacionFinal);
            
            System.out.println("🏠 [QuickRequestController] Ubicación final asignada: " + ubicacionFinal);
            
            // Convertir presupuesto de String a Double
            String presupuestoStr = (String) requestData.get("budget");
            if (presupuestoStr != null && !presupuestoStr.trim().isEmpty() && !presupuestoStr.equals("Por cotizar")) {
                try {
                    solicitud.setPresupuesto(Double.parseDouble(presupuestoStr.replace("$", "").replace(",", "").trim()));
                } catch (NumberFormatException e) {
                    solicitud.setPresupuesto(null); // Si no se puede convertir, dejar como null
                }
            } else {
                solicitud.setPresupuesto(null);
            }
            
            solicitud.setEstado("pendiente");
            
            // Procesar items
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) requestData.get("items");
            if (itemsData != null && !itemsData.isEmpty()) {
                List<ItemSolicitud> items = itemsData.stream().map(itemData -> {
                    ItemSolicitud item = new ItemSolicitud();
                    item.setNombre((String) itemData.get("name"));
                    Object quantity = itemData.get("quantity");
                    item.setCantidad(quantity instanceof Integer ? (Integer) quantity : 1);
                    item.setEspecificaciones((String) itemData.get("specifications"));
                    item.setImagenUrl((String) itemData.get("imageUrl"));
                    
                    // Convertir precio de String a Double
                    String precioStr = (String) itemData.get("price");
                    if (precioStr != null && !precioStr.trim().isEmpty()) {
                        try {
                            item.setPrecio(Double.parseDouble(precioStr.replace("$", "").replace(",", "").trim()));
                        } catch (NumberFormatException e) {
                            item.setPrecio(null); // Si no se puede convertir, dejar como null
                        }
                    } else {
                        item.setPrecio(null);
                    }
                    
                    return item;
                }).collect(Collectors.toList());
                
                solicitud.setItems(items);
            }
            
            // Guardar solicitud
            Solicitud solicitudGuardada = solicitudRepository.save(solicitud);
            System.out.println("✅ [QuickRequestController] Solicitud rápida guardada con ID: " + solicitudGuardada.getId());
            
            // Enviar notificación
            NotificationDTO notification = new NotificationDTO(
                "Solicitud rápida creada",
                "Su solicitud se ha creado con éxito usando el modo rápido. Pronto algún negocio se comunicará con usted.",
                "quick_request_created",
                Map.of("solicitudId", solicitudGuardada.getId())
            );
            notificationService.sendToUserTopic(usuarioId, notification);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Solicitud rápida creada exitosamente");
            response.put("solicitud", solicitudGuardada);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ [QuickRequestController] ERROR al guardar solicitud rápida:");
            System.err.println("    - Mensaje: " + e.getMessage());
            e.printStackTrace();
            
            return ResponseEntity.internalServerError()
                .body(Map.of("success", false, "error", "Error interno del servidor: " + e.getMessage()));
        }
    }
}