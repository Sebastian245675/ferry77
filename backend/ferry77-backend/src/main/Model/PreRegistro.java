package main.Model;

import jakarta.persistence.*;
import lombok.Data;
@Entity
@Data
public class PreRegistro {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String userType;
    private String nombre;
    private String email;
    private String telefono;
    private String profesion;
    private String empresa;
    private String ciudad;

    // Getters and Setters
}