package com.ferry77.backend.dto;

public class UpdateUbicacionRequest {
    private Long ciudadId;
    private String ciudadNombre;

    public Long getCiudadId() { return ciudadId; }
    public void setCiudadId(Long ciudadId) { this.ciudadId = ciudadId; }

    public String getCiudadNombre() { return ciudadNombre; }
    public void setCiudadNombre(String ciudadNombre) { this.ciudadNombre = ciudadNombre; }
}
