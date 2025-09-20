package com.ferry77.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "proposalTaskExecutor")
    public Executor proposalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Configuración optimizada para alta concurrencia
        executor.setCorePoolSize(10);      // Threads mínimos siempre activos
        executor.setMaxPoolSize(50);       // Máximo de threads en momentos pico
        executor.setQueueCapacity(500);    // Cola de tareas pendientes
        executor.setKeepAliveSeconds(60);  // Tiempo antes de liberar threads inactivos
        
        // Configuración para identificar threads
        executor.setThreadNamePrefix("ProposalAsync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        
        // Inicializar el executor
        executor.initialize();
        
        return executor;
    }

    @Bean(name = "generalTaskExecutor")
    public Executor generalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Configuración más conservadora para tareas generales
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setKeepAliveSeconds(60);
        
        executor.setThreadNamePrefix("GeneralAsync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        
        executor.initialize();
        
        return executor;
    }
}