package com.ferry77.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entidad Ciudad normalizada para optimizar las consultas por ubicación
 * Esto evita duplicados y mejora significativamente el rendimiento de filtrado
 */
@Entity
@Table(name = "ciudades", indexes = {
    @Index(name = "idx_ciudad_nombre", columnList = "nombre", unique = true),
    @Index(name = "idx_ciudad_codigo", columnList = "codigo", unique = true),
    @Index(name = "idx_ciudad_activa", columnList = "activa"),
    @Index(name = "idx_ciudad_nombre_activa", columnList = "nombre, activa")
})
public class Ciudad {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String nombre; // Ej: "Buenos Aires", "Madrid", "Bogotá"

    @Column(unique = true, nullable = false)
    private String codigo; // Ej: "BA", "MAD", "BOG" - para búsquedas rápidas

    @Column(nullable = false)
    private String pais; // Ej: "Argentina", "España", "Colombia"

    @Column(nullable = false)
    private Boolean activa = true; // Para deshabilitar ciudades sin perder datos

    private LocalDateTime fechaCreacion = LocalDateTime.now();
    
    // Para estadísticas y optimización
    @Column(nullable = false)
    private Integer totalSolicitudes = 0;
    
    @Column(nullable = false)
    private Integer solicitudesActivas = 0;

    // Constructores
    public Ciudad() {}

    public Ciudad(String nombre, String codigo, String pais) {
        this.nombre = nombre;
        this.codigo = codigo;
        this.pais = pais;
        this.activa = true;
        this.fechaCreacion = LocalDateTime.now();
        this.totalSolicitudes = 0;
        this.solicitudesActivas = 0;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
    }

    public Boolean getActiva() {
        return activa;
    }

    public void setActiva(Boolean activa) {
        this.activa = activa;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public Integer getTotalSolicitudes() {
        return totalSolicitudes;
    }

    public void setTotalSolicitudes(Integer totalSolicitudes) {
        this.totalSolicitudes = totalSolicitudes;
    }

    public Integer getSolicitudesActivas() {
        return solicitudesActivas;
    }

    public void setSolicitudesActivas(Integer solicitudesActivas) {
        this.solicitudesActivas = solicitudesActivas;
    }

    // Métodos de utilidad
    public void incrementarSolicitudes() {
        this.totalSolicitudes++;
        this.solicitudesActivas++;
    }

    public void decrementarSolicitudesActivas() {
        if (this.solicitudesActivas > 0) {
            this.solicitudesActivas--;
        }
    }

    @Override
    public String toString() {
        return "Ciudad{" +
                "id=" + id +
                ", nombre='" + nombre + '\'' +
                ", codigo='" + codigo + '\'' +
                ", pais='" + pais + '\'' +
                ", activa=" + activa +
                ", solicitudesActivas=" + solicitudesActivas +
                '}';
    }
}