package com.ferry77.backend.repository;

import com.ferry77.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByFirebaseUid(String firebaseUid);
    Usuario findByEmail(String email);
}
