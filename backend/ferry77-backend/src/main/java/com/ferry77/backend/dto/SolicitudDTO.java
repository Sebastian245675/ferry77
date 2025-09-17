package com.ferry77.backend.dto;

import java.util.List;

public class SolicitudDTO {
    public String usuarioId;
    public String usuarioNombre;
    public String usuarioEmail;
    public String titulo;
    public String profesion;
    public String ubicacion;
    public Double presupuesto;
    public List<ItemDTO> items;

    public static class ItemDTO {
        public String nombre;
        public Integer cantidad;
        public String especificaciones;
        public String imagenUrl;
        public Double precio;

        // Constructor vacío
        public ItemDTO() {}

        // Constructor con parámetros
        public ItemDTO(String nombre, Integer cantidad, String especificaciones, String imagenUrl, Double precio) {
            this.nombre = nombre;
            this.cantidad = cantidad;
            this.especificaciones = especificaciones;
            this.imagenUrl = imagenUrl;
            this.precio = precio;
        }
    }

    // Constructor vacío
    public SolicitudDTO() {}

    // Constructor con parámetros
    public SolicitudDTO(String usuarioId, String usuarioNombre, String usuarioEmail, String titulo, 
                       String profesion, String ubicacion, Double presupuesto, List<ItemDTO> items) {
        this.usuarioId = usuarioId;
        this.usuarioNombre = usuarioNombre;
        this.usuarioEmail = usuarioEmail;
        this.titulo = titulo;
        this.profesion = profesion;
        this.ubicacion = ubicacion;
        this.presupuesto = presupuesto;
        this.items = items;
    }
}
