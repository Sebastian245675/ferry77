package com.ferry77.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    @Autowired
    private JavaMailSender mailSender;

    public void sendPreRegistroEmail(String to, String nombre, String userType) {
        try {
            logger.info("Iniciando envío de email a: {}", to);
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setFrom("j24291972@gmail.com");
            message.setSubject("¡Gracias por tu pre-registro en Ferry77!");
            
            String messageText = buildEmailMessage(nombre, userType);
            message.setText(messageText);
            
            logger.debug("Enviando mensaje: {}", message);
            mailSender.send(message);
            logger.info("Email enviado exitosamente a: {}", to);
            
        } catch (Exception e) {
            logger.error("Error enviando email a {}: {}", to, e.getMessage(), e);
            // No lanzamos excepción para que el pre-registro se complete
            // aunque falle el email
        }
    }

    
    private String buildEmailMessage(String nombre, String userType) {
        String tipoUsuario = userType.equals("cliente") ? "profesional" : "ferretería/proveedor";
        
        return String.format(
            "Hola %s,\n\n" +
            "¡Gracias por tu pre-registro en Ferry77!\n\n" +
            "Hemos recibido tu solicitud como %s y pronto nos pondremos en contacto contigo " +
            "para informarte sobre el lanzamiento de nuestra plataforma.\n\n" +
            "Ferry77 conectará profesionales de la construcción y oficios con ferreterías " +
            "y proveedores de materiales en toda Colombia.\n\n" +
            "Beneficios de tu pre-registro:\n" +
            "• Acceso prioritario cuando lancemos la plataforma\n" +
            "• Tarifas preferenciales durante el primer mes\n" +
            "• Información exclusiva sobre nuevas funcionalidades\n\n" +
            "Mantente atento a tu correo electrónico para más novedades.\n\n" +
            "Saludos cordiales,\n" +
            "Equipo Ferry77\n\n" +
            "---\n" +
            "Este es un correo automático, por favor no responder.",
            nombre, tipoUsuario
        );
    }
    public void sendVerificationCode(String to, String code) {
        try {
            logger.info("Iniciando envío de código a: {}", to);
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setFrom("j24291972@gmail.com");
            message.setSubject("Ferry77 - Código de Verificación");
            message.setText("Tu código de verificación es: " + code + 
                          "\n\nEste código expira en 15 minutos." +
                          "\n\nSi no solicitaste este código, ignora este mensaje.");
            
            logger.info("Enviando mensaje via SMTP...");
            mailSender.send(message);
            logger.info("✅ Email enviado exitosamente a: {}", to);
            
        } catch (org.springframework.mail.MailException e) {
            logger.error("❌ Error de email: {}", e.getMessage());
            throw new RuntimeException("Error de conexión con el servidor de email");
        } catch (Exception e) {
            logger.error("❌ Error general: {}", e.getMessage(), e);
            throw new RuntimeException("Error enviando código: " + e.getMessage());
        }
    }

    public String generateVerificationCode() {
        java.util.Random random = new java.util.Random();
        int code = 100000 + random.nextInt(900000); // Genera código de 6 dígitos
        return String.valueOf(code);
    }
}