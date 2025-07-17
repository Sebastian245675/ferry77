import React from "react";
import { Button } from "./ui/button";
import { MessageSquare } from "lucide-react";
import { ButtonProps } from "./ui/button";
import { useNavigate } from "react-router-dom";
// Importa la función global para abrir chat
import { openChatByClientName } from "../backoficce/Messages";

interface ContactClientButtonProps extends ButtonProps {
  clientId: string;
  clientName: string;
  requestId?: string;
}

export const ContactClientButton: React.FC<ContactClientButtonProps> = ({
  clientId,
  clientName,
  requestId,
  ...props
}) => {
  const navigate = useNavigate();
  const handleContact = () => {
    // Abre la sección de mensajes y selecciona el chat del cliente
    navigate("/messages");
    setTimeout(() => {
      if (openChatByClientName) openChatByClientName(clientName);
    }, 100); // Espera breve para asegurar que Messages esté montado
  };

  return (
    <Button onClick={handleContact} {...props}>
      <MessageSquare className="h-3 w-3 mr-1" /> Contactar
    </Button>
  );
};

export default ContactClientButton;
