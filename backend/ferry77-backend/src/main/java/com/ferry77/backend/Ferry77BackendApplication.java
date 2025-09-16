package com.ferry77.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

/**
 * Main application class for Ferry77 Backend
 */
@SpringBootApplication
@EnableJpaRepositories
@EnableWebSocket
@EnableAsync
public class Ferry77BackendApplication {

    public static void main(String[] args) {
        System.out.println("🚛 Iniciando Ferry77 Backend Server...");
        SpringApplication.run(Ferry77BackendApplication.class, args);
        System.out.println("✅ Ferry77 Backend Server iniciado exitosamente!");
    }
}