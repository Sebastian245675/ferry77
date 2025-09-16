package com.ferry77.backend.controller;

import com.ferry77.backend.model.PreRegistro;
import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.PreRegistroRepository;
import com.ferry77.backend.repository.UsuarioRepository;
import com.ferry77.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preregistro")
@CrossOrigin(origins = "*")
public class PreRegistroController {

    @Autowired
    private PreRegistroRepository preRegistroRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<?> save(@Valid @RequestBody PreRegistro preRegistro, BindingResult result) {
        if (result.hasErrors()) {
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        if (!preRegistro.isNombreCompletoValido()) {
            return ResponseEntity.badRequest().body("El nombre completo debe tener al menos dos nombres y dos apellidos.");
        }
        
        // Guardar en tabla preregistros (sistema actual)
        preRegistroRepository.save(preRegistro);
        
        // También guardar en tabla usuarios para centralizar datos
        Usuario usuario = new Usuario();
        usuario.setNombreCompleto(preRegistro.getNombre());
        usuario.setEmail(preRegistro.getEmail());
        usuario.setTelefono(preRegistro.getTelefono());
        usuario.setCiudad(preRegistro.getCiudad());
        usuario.setUserType(preRegistro.getUserType());
        // Para pre-registros no tenemos Firebase UID aún
        usuario.setFirebaseUid("PRE-" + System.currentTimeMillis());
        usuarioRepository.save(usuario);
        
        // Enviar email de notificación
        emailService.sendPreRegistroEmail(preRegistro.getEmail(), preRegistro.getNombre(), preRegistro.getUserType());
        
        return ResponseEntity.ok(preRegistro);
    }
}
