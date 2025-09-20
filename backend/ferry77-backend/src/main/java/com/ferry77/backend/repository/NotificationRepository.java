package com.ferry77.backend.repository;

import com.ferry77.backend.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Obtener notificaciones de un usuario con paginación (más recientes primero)
    Page<Notification> findByUsuarioIdOrderByCreatedAtDesc(String usuarioId, Pageable pageable);

    // Contar notificaciones no leídas de un usuario
    long countByUsuarioIdAndLeidaFalse(String usuarioId);

    // Obtener solo notificaciones no leídas de un usuario
    Page<Notification> findByUsuarioIdAndLeidaFalseOrderByCreatedAtDesc(String usuarioId, Pageable pageable);

    // Obtener notificaciones por tipo
    Page<Notification> findByUsuarioIdAndTipoOrderByCreatedAtDesc(String usuarioId, String tipo, Pageable pageable);

    // Marcar como leídas todas las notificaciones de un usuario
    @Query("UPDATE Notification n SET n.leida = true WHERE n.usuarioId = :usuarioId AND n.leida = false")
    int markAllAsReadByUsuarioId(@Param("usuarioId") String usuarioId);

    // Obtener notificaciones recientes (últimas 24 horas)
    @Query("SELECT n FROM Notification n WHERE n.usuarioId = :usuarioId AND n.createdAt >= :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentByUsuarioId(@Param("usuarioId") String usuarioId, @Param("since") LocalDateTime since);

    // Limpiar notificaciones antiguas (para mantenimiento)
    @Query("DELETE FROM Notification n WHERE n.createdAt < :before")
    int deleteOldNotifications(@Param("before") LocalDateTime before);

    // Obtener notificaciones por referencia (ej: todas las notificaciones de una propuesta)
    List<Notification> findByReferenciaIdOrderByCreatedAtDesc(String referenciaId);

    // Estadísticas: contar notificaciones por tipo para un usuario
    @Query("SELECT n.tipo, COUNT(n) FROM Notification n WHERE n.usuarioId = :usuarioId GROUP BY n.tipo")
    List<Object[]> countNotificationsByTypeForUser(@Param("usuarioId") String usuarioId);
}