package com.ferry77.backend.repository;

import com.ferry77.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Usuario findByFirebaseUid(String firebaseUid);
    
    @Query("SELECT u FROM Usuario u WHERE u.email = :email ORDER BY u.id ASC")
    List<Usuario> findAllByEmail(@Param("email") String email);
    
    default Usuario findByEmail(String email) {
        List<Usuario> users = findAllByEmail(email);
        return users.isEmpty() ? null : users.get(0);
    }
    
    @Query("SELECT DISTINCT u.ciudad FROM Usuario u WHERE u.ciudad IS NOT NULL AND u.ciudad <> ''")
    List<String> findDistinctCiudades();
}
