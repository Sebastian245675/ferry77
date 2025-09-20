package com.ferry77.backend.repository;

import com.ferry77.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByFirebaseUid(String firebaseUid);
    Usuario findByEmail(String email);
    
    @Query("SELECT DISTINCT u.ciudad FROM Usuario u WHERE u.ciudad IS NOT NULL AND u.ciudad <> ''")
    List<String> findDistinctCiudades();
}
