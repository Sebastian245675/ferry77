package com.ferry77.backend.service;

import com.ferry77.backend.model.Ciudad;
import com.ferry77.backend.repository.CiudadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio optimizado para gestión de ciudades
 * Incluye caché en memoria para búsquedas ultra-rápidas
 */
@Service
@Transactional
public class CiudadService {

    @Autowired
    private CiudadRepository ciudadRepository;
    
    // Caché en memoria para ciudades frecuentemente consultadas
    private final ConcurrentHashMap<String, Ciudad> cacheNombres = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Ciudad> cacheCodigos = new ConcurrentHashMap<>();
    
    /**
     * Busca o crea una ciudad, normalizando el nombre
     * Este método es crítico para la optimización de búsquedas
     */
    public Ciudad buscarOCrearCiudad(String nombreCiudad) {
        if (nombreCiudad == null || nombreCiudad.trim().isEmpty()) {
            return getOrCreateDefaultCity();
        }
        
        String nombreNormalizado = normalizarNombre(nombreCiudad);
        
        // Verificar caché primero (ultra-rápido)
        Ciudad ciudadCache = cacheNombres.get(nombreNormalizado);
        if (ciudadCache != null) {
            return ciudadCache;
        }
        
        // Buscar en base de datos
        Optional<Ciudad> ciudadExistente = ciudadRepository.findByNombreIgnoreCaseExact(nombreNormalizado);
        
        if (ciudadExistente.isPresent()) {
            Ciudad ciudad = ciudadExistente.get();
            cacheNombres.put(nombreNormalizado, ciudad); // Agregar al caché
            return ciudad;
        }
        
        // Crear nueva ciudad si no existe
        String codigo = generarCodigo(nombreNormalizado);
        Ciudad nuevaCiudad = new Ciudad(nombreNormalizado, codigo, "Por definir");
        Ciudad ciudadGuardada = ciudadRepository.save(nuevaCiudad);
        
        // Agregar al caché
        cacheNombres.put(nombreNormalizado, ciudadGuardada);
        cacheCodigos.put(codigo, ciudadGuardada);
        
        return ciudadGuardada;
    }
    
    /**
     * Obtiene todas las ciudades activas (con caché)
     */
    public List<Ciudad> getCiudadesActivas() {
        return ciudadRepository.findByActivaTrueOrderByNombreAsc();
    }
    
    /**
     * Incrementa el contador de solicitudes para una ciudad
     */
    public void incrementarSolicitudes(String nombreCiudad) {
        Ciudad ciudad = buscarOCrearCiudad(nombreCiudad);
        ciudad.incrementarSolicitudes();
        ciudadRepository.save(ciudad);
        
        // Actualizar caché
        cacheNombres.put(normalizarNombre(nombreCiudad), ciudad);
    }
    
    /**
     * Decrementa el contador de solicitudes activas
     */
    public void decrementarSolicitudesActivas(String nombreCiudad) {
        Ciudad ciudad = buscarOCrearCiudad(nombreCiudad);
        ciudad.decrementarSolicitudesActivas();
        ciudadRepository.save(ciudad);
        
        // Actualizar caché
        cacheNombres.put(normalizarNombre(nombreCiudad), ciudad);
    }
    
    /**
     * Normaliza el nombre de la ciudad para evitar duplicados
     */
    private String normalizarNombre(String nombre) {
        if (nombre == null) return "Sin especificar";
        
        return nombre.trim()
                    .toLowerCase()
                    .replaceAll("[áàäâ]", "a")
                    .replaceAll("[éèëê]", "e")
                    .replaceAll("[íìïî]", "i")
                    .replaceAll("[óòöô]", "o")
                    .replaceAll("[úùüû]", "u")
                    .replaceAll("[ñ]", "n")
                    .replaceAll("[^a-z0-9\\s]", "")
                    .replaceAll("\\s+", " ")
                    .trim();
    }
    
    /**
     * Genera un código único para la ciudad
     */
    private String generarCodigo(String nombre) {
        if (nombre == null || nombre.length() < 2) {
            return "XX";
        }
        
        String[] palabras = nombre.split("\\s+");
        if (palabras.length >= 2) {
            return (palabras[0].substring(0, Math.min(2, palabras[0].length())) + 
                   palabras[1].substring(0, Math.min(2, palabras[1].length()))).toUpperCase();
        } else {
            return nombre.substring(0, Math.min(3, nombre.length())).toUpperCase();
        }
    }
    
    /**
     * Obtiene o crea una ciudad por defecto
     */
    private Ciudad getOrCreateDefaultCity() {
        String defaultCityName = "Sin especificar";
        return buscarOCrearCiudad(defaultCityName);
    }
    
    /**
     * Limpia el caché (útil para actualizaciones)
     */
    public void limpiarCache() {
        cacheNombres.clear();
        cacheCodigos.clear();
    }
    
    /**
     * Obtiene estadísticas de ciudades con actividad
     */
    public List<Ciudad> getCiudadesConActividad() {
        return ciudadRepository.findCiudadesConSolicitudesActivas();
    }
}