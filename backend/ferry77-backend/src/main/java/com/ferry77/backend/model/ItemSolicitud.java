package com.ferry77.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "items_solicitud")
public class ItemSolicitud {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;
    
    @Column(nullable = false)
    private Integer cantidad = 1;
    
    @Column(length = 1000)
    private String especificaciones;
    
    @Column(name = "imagen_url")
    private String imagenUrl;
    
    private Double precio;

    // Constructor vacío
    public ItemSolicitud() {}

    // Constructor con parámetros
    public ItemSolicitud(String nombre, Integer cantidad, String especificaciones, String imagenUrl, Double precio) {
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.especificaciones = especificaciones;
        this.imagenUrl = imagenUrl;
        this.precio = precio;
    }

    // Getters y setters
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

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public String getEspecificaciones() {
        return especificaciones;
    }

    public void setEspecificaciones(String especificaciones) {
        this.especificaciones = especificaciones;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public Double getPrecio() {
        return precio;
    }

    public void setPrecio(Double precio) {
        this.precio = precio;
    }
}
