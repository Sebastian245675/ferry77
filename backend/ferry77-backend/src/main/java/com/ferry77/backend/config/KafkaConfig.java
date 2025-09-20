package com.ferry77.backend.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableKafka
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true", matchIfMissing = false)
public class KafkaConfig {

    // Nombre del topic para eventos de propuestas
    public static final String TOPIC_PROPOSAL_EVENTS = "proposal-events";

    // Configuración del productor Kafka
    @Bean
    public ProducerFactory<String, String> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        
        // Configuraciones para alta disponibilidad y durabilidad
        props.put(ProducerConfig.ACKS_CONFIG, "all"); // Esperar confirmación de todas las réplicas
        props.put(ProducerConfig.RETRIES_CONFIG, 3); // Reintentos en caso de fallo
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384); // Tamaño de lote para eficiencia
        props.put(ProducerConfig.LINGER_MS_CONFIG, 1); // Tiempo de espera para formar lotes
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432); // Buffer de memoria
        
        return new DefaultKafkaProducerFactory<>(props);
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    // Configuración del consumidor Kafka
    @Bean
    public ConsumerFactory<String, String> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "notification-processor-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        
        // Configuraciones para procesamiento eficiente
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // Control manual de commits
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500); // Procesar hasta 500 mensajes por vez
        
        return new DefaultKafkaConsumerFactory<>(props);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        
        // Configurar para procesamiento en paralelo
        factory.setConcurrency(3); // 3 hilos consumidores para escalabilidad
        
        return factory;
    }

    // Crear el topic automáticamente
    @Bean
    public NewTopic proposalEventsTopic() {
        return new NewTopic(TOPIC_PROPOSAL_EVENTS, 6, (short) 1); // 6 particiones para throughput
    }
}