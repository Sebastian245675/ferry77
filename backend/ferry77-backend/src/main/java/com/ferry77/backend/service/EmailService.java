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

    public void sendCotizacionEmail(String clienteEmail, String clienteNombre, String solicitudTitulo, 
                                   String empresaNombre, String valorCotizacion, Long proposalId) {
        try {
            logger.info("Enviando email de cotización a: {}", clienteEmail);
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(clienteEmail);
            message.setFrom("j24291972@gmail.com");
            message.setSubject("¡Nueva cotización recibida en Ferry77!");
            
            String messageText = buildCotizacionEmailMessage(clienteNombre, solicitudTitulo, 
                                                           empresaNombre, valorCotizacion, proposalId);
            message.setText(messageText);
            
            logger.debug("Enviando mensaje de cotización: {}", message);
            mailSender.send(message);
            logger.info("✅ Email de cotización enviado exitosamente a: {}", clienteEmail);
            
        } catch (Exception e) {
            logger.error("❌ Error enviando email de cotización a {}: {}", clienteEmail, e.getMessage(), e);
            // No lanzamos excepción para que la cotización se complete
            // aunque falle el email
        }
    }
    
    private String buildCotizacionEmailMessage(String clienteNombre, String solicitudTitulo, 
                                             String empresaNombre, String valorCotizacion, Long proposalId) {
        return String.format(
            "Hola %s,\n\n" +
            "¡Tienes una nueva cotización en Ferry77! 🎉\n\n" +
            "📋 DETALLES DE LA COTIZACIÓN:\n" +
            "• Solicitud: %s\n" +
            "• Empresa: %s\n" +
            "• Valor total: %s\n\n" +
            "🔗 REVISA TU COTIZACIÓN:\n" +
            "Ingresa a la aplicación Ferry77 para ver todos los detalles, comparar precios " +
            "y gestionar tu solicitud.\n\n" +
            "📱 ACCEDE DESDE:\n" +
            "• Aplicación web: http://localhost:5173\n" +
            "• Sección: Mis Solicitudes > Ver Cotizaciones\n\n" +
            "💡 PRÓXIMOS PASOS:\n" +
            "1. Revisa los detalles de la cotización\n" +
            "2. Compara con otras ofertas si las tienes\n" +
            "3. Contacta directamente con la empresa si tienes preguntas\n" +
            "4. Acepta la cotización que mejor se adapte a tus necesidades\n\n" +
            "¿Necesitas ayuda? Responde a este correo o contáctanos a través de la aplicación.\n\n" +
            "¡Gracias por usar Ferry77! 🚚\n" +
            "Conectamos profesionales con los mejores proveedores.\n\n" +
            "---\n" +
            "Equipo Ferry77\n" +
            "Este es un correo automático, pero puedes responder si necesitas ayuda.\n\n" +
            "ID de cotización: #%d",
            clienteNombre, solicitudTitulo, empresaNombre, valorCotizacion, proposalId
        );
    }

    public void sendProposalAcceptedEmail(String empresaEmail, String empresaNombre, String clienteNombre, 
                                        String clienteEmail, String clienteTelefono, String solicitudTitulo, 
                                        String valorCotizacion, String tiempoEntrega) {
        try {
            logger.info("Enviando email de propuesta aceptada a: {}", empresaEmail);
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(empresaEmail);
            message.setFrom("j24291972@gmail.com");
            message.setSubject("🎉 ¡Tu cotización ha sido aceptada! - Ferry77");
            
            String messageText = String.format(
                "¡Excelentes noticias %s!\n\n" +
                "Tu cotización para \"%s\" ha sido aceptada por el cliente.\n\n" +
                "📋 DATOS DEL CLIENTE:\n" +
                "• Nombre: %s\n" +
                "• Email: %s\n" +
                "• Teléfono: %s\n\n" +
                "💰 DETALLES DE LA COTIZACIÓN:\n" +
                "• Precio: %s\n" +
                "• Tiempo de entrega: %s\n\n" +
                "📞 PRÓXIMOS PASOS:\n" +
                "1. Contacta al cliente lo antes posible\n" +
                "2. Coordina los detalles del servicio\n" +
                "3. Programa la entrega/trabajo\n\n" +
                "💡 RECOMENDACIONES:\n" +
                "• Confirma todos los detalles por escrito\n" +
                "• Mantén al cliente informado del progreso\n" +
                "• Proporciona un servicio de calidad\n\n" +
                "¡Felicidades por cerrar esta venta! 🎉\n\n" +
                "---\n" +
                "Equipo Ferry77\n" +
                "Conectamos profesionales con los mejores proveedores.\n\n" +
                "¿Necesitas ayuda? Responde a este correo.",
                empresaNombre, solicitudTitulo, clienteNombre, clienteEmail, 
                clienteTelefono != null ? clienteTelefono : "No proporcionado",
                valorCotizacion, tiempoEntrega != null ? tiempoEntrega : "No especificado"
            );
            
            message.setText(messageText);
            
            logger.debug("Enviando mensaje de aceptación: {}", message);
            mailSender.send(message);
            logger.info("✅ Email de aceptación enviado exitosamente a: {}", empresaEmail);
            
        } catch (Exception e) {
            logger.error("❌ Error enviando email de aceptación a {}: {}", empresaEmail, e.getMessage(), e);
        }
    }
}