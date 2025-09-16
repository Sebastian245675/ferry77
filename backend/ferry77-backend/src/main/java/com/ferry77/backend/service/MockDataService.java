package com.ferry77.backend.service;

import com.ferry77.backend.dto.QuoteResponse;
import org.springframework.stereotype.Service;

import java.text.NumberFormat;
import java.util.*;

/**
 * Service for generating realistic mock data for frontend demonstration
 */
@Service
public class MockDataService {

    private final Random random = new Random();
    private final NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));

    private final List<String> companies = List.of(
        "TransExpress", "RápidoCargo", "MegaTransporte", "LogiColombia", 
        "CargoSeguro", "MovilExpress", "TurboLogistic", "FleteRápido",
        "TransCarga", "ExpresoUrbano", "CargaDirecta", "LogiMaster"
    );

    private final List<String> vehicleTypes = List.of(
        "Moto", "Automóvil", "Furgoneta", "Camión", "Camión Grande", "Tráiler"
    );

    /**
     * Generate realistic mock quotes for the phone mockup
     */
    public List<QuoteResponse> generateMockQuotes(String category, int limit) {
        List<QuoteResponse> quotes = new ArrayList<>();
        
        for (int i = 0; i < Math.min(limit, 10); i++) {
            QuoteResponse quote = new QuoteResponse();
            quote.setId((long) (i + 1));
            quote.setCompany(getRandomCompany());
            quote.setVehicleType(getRandomVehicleType());
            
            // Generate realistic price based on category and vehicle type
            int basePrice = calculateBasePrice(category, quote.getVehicleType());
            int finalPrice = basePrice + random.nextInt(15000) - 7500; // Add some variation
            quote.setPrice(Math.max(finalPrice, 10000)); // Minimum price
            
            quote.setFormattedPrice(formatCurrency(quote.getPrice()));
            quote.setEstimatedTime(generateEstimatedTime());
            quote.setRating(4.0 + random.nextDouble() * 1.0); // Rating between 4.0 and 5.0
            quote.setAvailable(random.nextBoolean() || i < 3); // Ensure first 3 are available
            
            quotes.add(quote);
        }
        
        // Sort by price (cheapest first)
        quotes.sort(Comparator.comparingInt(QuoteResponse::getPrice));
        
        return quotes;
    }

    /**
     * Generate search results for companies
     */
    public List<Map<String, Object>> generateSearchResults(String query) {
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (int i = 0; i < 5 + random.nextInt(5); i++) {
            Map<String, Object> result = new HashMap<>();
            result.put("id", i + 1);
            result.put("company", getRandomCompany());
            result.put("rating", 4.0 + random.nextDouble() * 1.0);
            result.put("distance", (1 + random.nextInt(20)) + " km");
            result.put("specialization", getRandomSpecialization());
            results.add(result);
        }
        
        return results;
    }

    /**
     * Generate tracking information
     */
    public Map<String, Object> generateTrackingInfo(String trackingId) {
        Map<String, Object> tracking = new HashMap<>();
        tracking.put("trackingId", trackingId);
        tracking.put("status", getRandomTrackingStatus());
        tracking.put("currentLocation", "Av. Caracas #" + (10 + random.nextInt(90)) + "-" + (10 + random.nextInt(90)));
        tracking.put("estimatedArrival", generateEstimatedTime());
        tracking.put("driver", "Carlos " + getRandomLastName());
        tracking.put("vehicle", getRandomVehicleType());
        tracking.put("progress", 20 + random.nextInt(60)); // 20-80% progress
        
        return tracking;
    }

    // Helper methods
    private String getRandomCompany() {
        return companies.get(random.nextInt(companies.size()));
    }

    private String getRandomVehicleType() {
        return vehicleTypes.get(random.nextInt(vehicleTypes.size()));
    }

    private int calculateBasePrice(String category, String vehicleType) {
        int basePrice = 15000;
        
        // Adjust by category
        switch (category.toLowerCase()) {
            case "mudanzas": basePrice = 50000; break;
            case "muebles": basePrice = 35000; break;
            case "electrodomésticos": basePrice = 40000; break;
            case "documentos": basePrice = 12000; break;
            default: basePrice = 20000;
        }
        
        // Adjust by vehicle type
        switch (vehicleType) {
            case "Moto": basePrice = (int)(basePrice * 0.4); break;
            case "Automóvil": basePrice = (int)(basePrice * 0.6); break;
            case "Furgoneta": basePrice = (int)(basePrice * 0.8); break;
            case "Camión": basePrice = (int)(basePrice * 1.2); break;
            case "Camión Grande": basePrice = (int)(basePrice * 1.5); break;
            case "Tráiler": basePrice = (int)(basePrice * 2.0); break;
        }
        
        return basePrice;
    }

    private String formatCurrency(int price) {
        return "$" + NumberFormat.getInstance(new Locale("es", "CO")).format(price);
    }

    private String generateEstimatedTime() {
        int hours = 1 + random.nextInt(8);
        int minutes = random.nextInt(60);
        
        if (hours == 1 && minutes < 30) {
            return minutes + " minutos";
        } else if (hours == 1) {
            return "1 hora " + minutes + " min";
        } else {
            return hours + " horas";
        }
    }

    private String getRandomTrackingStatus() {
        List<String> statuses = List.of(
            "En preparación", "Recogido", "En camino", "Cerca del destino", "Entregado"
        );
        return statuses.get(random.nextInt(statuses.size()));
    }

    private String getRandomSpecialization() {
        List<String> specializations = List.of(
            "Mudanzas", "Carga frágil", "Documentos", "Electrodomésticos", 
            "Muebles", "Transporte express", "Carga pesada"
        );
        return specializations.get(random.nextInt(specializations.size()));
    }

    private String getRandomLastName() {
        List<String> lastNames = List.of(
            "Rodríguez", "García", "Martínez", "López", "González", "Pérez", 
            "Sánchez", "Ramírez", "Cruz", "Torres", "Flores", "Gómez"
        );
        return lastNames.get(random.nextInt(lastNames.size()));
    }
}