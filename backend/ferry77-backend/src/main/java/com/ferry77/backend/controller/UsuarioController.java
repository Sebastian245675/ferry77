package com.ferry77.backend.controller;

import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.UsuarioRepository;
import com.ferry77.backend.service.EmailService;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EmailService emailService;

    @PostMapping
    public Usuario saveUsuario(@RequestBody Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    @GetMapping("/firebase/{firebaseUid}")
    public ResponseEntity<Usuario> getUserByFirebaseUid(@PathVariable String firebaseUid) {
        Usuario usuario = usuarioRepository.findByFirebaseUid(firebaseUid);
        if (usuario != null) {
            return ResponseEntity.ok(usuario);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            
            // Verificar si el usuario ya existe
            Usuario existingUser = usuarioRepository.findByEmail(email);
            if (existingUser != null && existingUser.getVerified()) {
                return ResponseEntity.badRequest().body(Map.of("error", "El email ya está registrado"));
            }

            // Generar código de verificación
            String verificationCode = emailService.generateVerificationCode();
            
            // Si el usuario ya existe pero no está verificado, actualizar código
            if (existingUser != null) {
                existingUser.setVerificationCode(verificationCode);
                existingUser.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
                usuarioRepository.save(existingUser);
            } else {
                // Crear nuevo usuario con campos mínimos para evitar validaciones
                Usuario usuario = new Usuario();
                usuario.setEmail(email);
                usuario.setNombreCompleto("Temporal"); // Campo temporal para pasar validación
                usuario.setTelefono("Temporal"); // Campo temporal para pasar validación
                usuario.setUserType("cliente"); // Default temporal
                usuario.setVerified(false);
                usuario.setVerificationCode(verificationCode);
                usuario.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
                
                usuarioRepository.save(usuario);
            }
            
            // Enviar código por email
            emailService.sendVerificationCode(email, verificationCode);
            
            return ResponseEntity.ok(Map.of("message", "Código de verificación enviado"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error enviando código: " + e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String code = request.get("code");
            
            Usuario usuario = usuarioRepository.findByEmail(email);
            if (usuario == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
            }

            // Verificar código y expiración
            if (!code.equals(usuario.getVerificationCode())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Código incorrecto"));
            }

            if (LocalDateTime.now().isAfter(usuario.getVerificationCodeExpiresAt())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Código expirado"));
            }

            // Marcar como verificado
            usuario.setVerified(true);
            usuario.setVerificationCode(null);
            usuario.setVerificationCodeExpiresAt(null);
            usuarioRepository.save(usuario);
            
            return ResponseEntity.ok(Map.of("message", "Email verificado correctamente"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error verificando código: " + e.getMessage()));
        }
    }

    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            
            Usuario usuario = usuarioRepository.findByEmail(email);
            if (usuario == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
            }

            if (!usuario.getVerified()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email no verificado"));
            }

            usuario.setPassword(password);
            usuarioRepository.save(usuario);
            
            return ResponseEntity.ok(Map.of("message", "Contraseña establecida correctamente"));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error estableciendo contraseña: " + e.getMessage()));
        }
    }
}
