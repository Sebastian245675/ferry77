package com.ferry77.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import com.ferry77.backend.validation.ValidUserType;

@Entity
public class PreRegistro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El tipo de usuario es obligatorio")
    @ValidUserType
    private String userType;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no es válido")
    private String email;

    @NotBlank(message = "El teléfono es obligatorio")
    @Pattern(regexp = "^\\d{10}$", message = "El teléfono debe tener exactamente 10 dígitos")
    private String telefono;

    private String profesion;
    private String empresa;
    private String ciudad;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getProfesion() { return profesion; }
    public void setProfesion(String profesion) { this.profesion = profesion; }

    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; }

    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }

    // Validación personalizada para nombre completo
    public boolean isNombreCompletoValido() {
        if (nombre == null) return false;
        String[] partes = nombre.trim().split("\\s+");
        return partes.length >= 4; // mínimo 2 nombres y 2 apellidos
    }
}