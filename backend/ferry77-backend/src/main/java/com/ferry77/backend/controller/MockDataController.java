package com.ferry77.backend.controller;

import com.ferry77.backend.dto.QuoteResponse;
import com.ferry77.backend.service.MockDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for mock data endpoints used by the frontend phone mockup
 */
@RestController
@RequestMapping("/api/mock")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8081", "http://localhost:5173"})
public class MockDataController {

    @Autowired
    private MockDataService mockDataService;

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Ferry77 Backend");
        response.put("timestamp", System.currentTimeMillis());
        response.put("message", "Backend conectado y funcionando");
        return ResponseEntity.ok(response);
    }

    /**
     * Get mock quotes for the phone mockup
     */
    @GetMapping("/quotes")
    public ResponseEntity<List<QuoteResponse>> getQuotes(
            @RequestParam(defaultValue = "general") String category,
            @RequestParam(defaultValue = "5") int limit) {
        
        List<QuoteResponse> quotes = mockDataService.generateMockQuotes(category, limit);
        return ResponseEntity.ok(quotes);
    }

    /**
     * Search companies endpoint
     */
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchCompanies(
            @RequestParam(defaultValue = "") String query) {
        
        List<Map<String, Object>> results = mockDataService.generateSearchResults(query);
        return ResponseEntity.ok(results);
    }

    /**
     * Get service categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        List<String> categories = List.of(
            "Mudanzas", "Documentos", "Muebles", "Electrodomésticos", 
            "Vehículos", "Carga Pesada", "Courier Express", "Mascotas"
        );
        return ResponseEntity.ok(categories);
    }

    /**
     * Get tracking information
     */
    @GetMapping("/tracking/{trackingId}")
    public ResponseEntity<Map<String, Object>> getTracking(@PathVariable String trackingId) {
        Map<String, Object> tracking = mockDataService.generateTrackingInfo(trackingId);
        return ResponseEntity.ok(tracking);
    }
}