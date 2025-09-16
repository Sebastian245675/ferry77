package com.ferry77.backend.controller;

import com.ferry77.backend.model.Usuario;
import com.ferry77.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

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
}
