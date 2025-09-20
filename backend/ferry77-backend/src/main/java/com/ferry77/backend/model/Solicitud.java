package com.ferry77.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "solicitudes", indexes = {
    @Index(name = "idx_usuario", columnList = "usuarioId"),
    @Index(name = "idx_estado", columnList = "estado"),
    @Index(name = "idx_fecha", columnList = "fechaCreacion"),
    // NUEVOS ÍNDICES OPTIMIZADOS PARA FILTRADO POR CIUDAD Y ESTADO
    @Index(name = "idx_ubicacion", columnList = "ubicacion"),
    @Index(name = "idx_estado_ubicacion", columnList = "estado, ubicacion"),
    @Index(name = "idx_ubicacion_estado_fecha", columnList = "ubicacion, estado, fechaCreacion"),
    @Index(name = "idx_pendientes_ciudad", columnList = "estado, ubicacion, fechaCreacion"),
    // Índice para búsquedas frecuentes de solicitudes activas por ubicación
    @Index(name = "idx_activas_ubicacion", columnList = "ubicacion, estado, fechaCreacion")
})
public class Solicitud {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String usuarioId;
    private String usuarioNombre;
    private String usuarioEmail;
    private String telefono; // Teléfono del usuario que hizo la solicitud
    private String titulo;
    private String profesion;
    private String tipo; // herramienta o herraje
    private String ubicacion;
    private Double presupuesto;
    private String estado; // pendiente, cotizando, finalizada, cancelada

    private LocalDateTime fechaCreacion = LocalDateTime.now();

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "solicitud_id")
    private List<ItemSolicitud> items;

    // Constructor vacío
    public Solicitud() {
        this.estado = "pendiente";
        this.fechaCreacion = LocalDateTime.now();
    }

    // Getters y setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(String usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getUsuarioNombre() {
        return usuarioNombre;
    }

    public void setUsuarioNombre(String usuarioNombre) {
        this.usuarioNombre = usuarioNombre;
    }

    public String getUsuarioEmail() {
        return usuarioEmail;
    }

    public void setUsuarioEmail(String usuarioEmail) {
        this.usuarioEmail = usuarioEmail;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getProfesion() {
        return profesion;
    }

    public void setProfesion(String profesion) {
        this.profesion = profesion;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public Double getPresupuesto() {
        return presupuesto;
    }

    public void setPresupuesto(Double presupuesto) {
        this.presupuesto = presupuesto;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public List<ItemSolicitud> getItems() {
        return items;
    }

    public void setItems(List<ItemSolicitud> items) {
        this.items = items;
    }
}
