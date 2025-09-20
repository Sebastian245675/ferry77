package com.ferry77.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cotizaciones")
@CrossOrigin(origins = "*")
public class CotizacionController {

    @PostMapping
    public ResponseEntity<?> crearCotizacion(@RequestBody Map<String, Object> cotizacionData) {
        try {
            // TODO: Implementar lógica para guardar cotización en base de datos
            System.out.println("[COTIZACION] Recibida nueva cotización:");
            System.out.println("- Solicitud ID: " + cotizacionData.get("solicitudId"));
            System.out.println("- Título: " + cotizacionData.get("tituloSolicitud"));
            System.out.println("- Monto Total: " + cotizacionData.get("montoTotal"));
            System.out.println("- Items: " + cotizacionData.get("items"));
            
            // Por ahora solo simular éxito
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cotización creada correctamente",
                "id", System.currentTimeMillis() // ID temporal
            ));
        } catch (Exception e) {
            System.err.println("[ERROR] Error al crear cotización: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Error interno del servidor"
            ));
        }
    }

    @GetMapping
    public ResponseEntity<?> listarCotizaciones() {
        try {
            // TODO: Implementar lógica para obtener cotizaciones de base de datos
            return ResponseEntity.ok(Map.of(
                "success", true,
                "cotizaciones", java.util.Arrays.asList() // Lista vacía por ahora
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "Error interno del servidor"
            ));
        }
    }
}