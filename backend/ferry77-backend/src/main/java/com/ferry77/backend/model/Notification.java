package com.ferry77.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_usuario", columnList = "usuarioId"),
    @Index(name = "idx_notifications_created", columnList = "createdAt"),
    @Index(name = "idx_notifications_leida", columnList = "leida"),
    @Index(name = "idx_notifications_usuario_fecha", columnList = "usuarioId, createdAt"),
    @Index(name = "idx_notifications_usuario_leida", columnList = "usuarioId, leida"),
    @Index(name = "idx_notifications_unread", columnList = "usuarioId, leida, createdAt")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false, length = 128)
    private String usuarioId;

    @Column(name = "tipo", length = 64, nullable = false)
    private String tipo;

    @Column(name = "referencia_id", length = 128)
    private String referenciaId;

    @Column(name = "titulo", length = 255, nullable = false)
    private String titulo;

    @Column(name = "mensaje", columnDefinition = "TEXT")
    private String mensaje;

    @Column(name = "payload", columnDefinition = "JSON")
    private String payload; // JSON string para datos adicionales

    @Column(name = "leida")
    private Boolean leida = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Constructor vacío
    public Notification() {}

    // Constructor con parámetros principales
    public Notification(String usuarioId, String tipo, String titulo, String mensaje) {
        this.usuarioId = usuarioId;
        this.tipo = tipo;
        this.titulo = titulo;
        this.mensaje = mensaje;
        this.leida = false;
        this.createdAt = LocalDateTime.now();
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

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getReferenciaId() {
        return referenciaId;
    }

    public void setReferenciaId(String referenciaId) {
        this.referenciaId = referenciaId;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Boolean getLeida() {
        return leida;
    }

    public void setLeida(Boolean leida) {
        this.leida = leida;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "Notification{" +
                "id=" + id +
                ", usuarioId='" + usuarioId + '\'' +
                ", tipo='" + tipo + '\'' +
                ", titulo='" + titulo + '\'' +
                ", leida=" + leida +
                ", createdAt=" + createdAt +
                '}';
    }
}