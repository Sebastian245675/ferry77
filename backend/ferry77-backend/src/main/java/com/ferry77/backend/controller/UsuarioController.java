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
    
    // Endpoint para buscar usuario por email
    @GetMapping("/email/{email}")
    public ResponseEntity<Usuario> getUsuarioByEmail(@PathVariable String email) {
        try {
            Usuario usuario = usuarioRepository.findByEmail(email);
            if (usuario != null) {
                System.out.println("[EMAIL_SEARCH] Usuario encontrado: " + usuario.getEmail() + " - Tipo: " + usuario.getUserType());
                return ResponseEntity.ok(usuario);
            } else {
                System.out.println("[EMAIL_SEARCH] Usuario no encontrado para email: " + email);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("[ERROR] Error buscando usuario por email: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoint para buscar usuario por ID numérico
    @GetMapping("/{id}")
    public ResponseEntity<Usuario> getUsuarioById(@PathVariable Long id) {
        try {
            var usuario = usuarioRepository.findById(id);
            if (usuario.isPresent()) {
                System.out.println("[ID_SEARCH] Usuario encontrado: " + usuario.get().getEmail() + " - Tipo: " + usuario.get().getUserType());
                return ResponseEntity.ok(usuario.get());
            } else {
                System.out.println("[ID_SEARCH] Usuario no encontrado para ID: " + id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("[ERROR] Error buscando usuario por ID: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoint para sincronizar usuario de Firebase con MySQL
    @PostMapping("/sync-firebase")
    public ResponseEntity<?> syncFirebaseUser(@RequestBody Map<String, Object> firebaseUser) {
        try {
            String firebaseUid = (String) firebaseUser.get("uid");
            String email = (String) firebaseUser.get("email");
            String displayName = (String) firebaseUser.get("displayName");
            String userType = (String) firebaseUser.get("userType");
            String companyName = (String) firebaseUser.get("companyName");
            String nick = (String) firebaseUser.get("nick");

            System.out.println("[SYNC] Sincronizando usuario Firebase: " + firebaseUid);

            // Verificar si ya existe
            Usuario existingUser = usuarioRepository.findByFirebaseUid(firebaseUid);
            
            if (existingUser != null) {
                System.out.println("[SYNC] Usuario ya existe con ID: " + existingUser.getId());
                return ResponseEntity.ok(existingUser);
            }

            // Crear nuevo usuario
            Usuario usuario = new Usuario();
            usuario.setFirebaseUid(firebaseUid);
            usuario.setEmail(email);
            usuario.setNombreCompleto(displayName != null ? displayName : "Usuario");
            usuario.setTelefono("Temporal"); // Campo requerido
            usuario.setUserType(userType != null ? userType : "cliente");
            usuario.setCompanyName(companyName);
            usuario.setNick(nick);
            usuario.setVerified(true); // Usuario viene de Firebase ya autenticado

            Usuario savedUser = usuarioRepository.save(usuario);
            System.out.println("[SYNC] Usuario creado con ID: " + savedUser.getId());
            
            return ResponseEntity.ok(savedUser);

        } catch (Exception e) {
            System.err.println("[ERROR] Error sincronizando usuario Firebase: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Error sincronizando usuario: " + e.getMessage()));
        }
    }
    
    @PutMapping("/update-firebase-uid")
    public ResponseEntity<?> updateFirebaseUid(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String newFirebaseUid = request.get("firebaseUid");
            
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email es requerido"));
            }
            
            if (newFirebaseUid == null || newFirebaseUid.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Firebase UID es requerido"));
            }
            
            Usuario usuario = usuarioRepository.findByEmail(email);
            if (usuario == null) {
                return ResponseEntity.notFound().build();
            }
            
            System.out.println("[UPDATE] Actualizando Firebase UID para usuario: " + email);
            System.out.println("[UPDATE] UID anterior: " + usuario.getFirebaseUid());
            System.out.println("[UPDATE] UID nuevo: " + newFirebaseUid);
            
            usuario.setFirebaseUid(newFirebaseUid);
            Usuario updatedUser = usuarioRepository.save(usuario);
            
            System.out.println("[UPDATE] Firebase UID actualizado exitosamente");
            return ResponseEntity.ok(updatedUser);
            
        } catch (Exception e) {
            System.err.println("[ERROR] Error actualizando Firebase UID: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Error actualizando UID: " + e.getMessage()));
        }
    }
}
