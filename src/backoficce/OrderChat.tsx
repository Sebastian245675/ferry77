import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db, rtdb } from "../lib/firebase";
import { ref, push, onValue, off } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ArrowLeft, Send } from "lucide-react";
import DashboardLayout from "@/components/barraempresa";

interface ChatMessage {
  id: string;
  message: string;
  timestamp: string;
  sender: 'user' | 'delivery';
}

const OrderChat = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        navigate("/dashboard");
        return;
      }

      try {
        const orderDoc = await getDoc(doc(db, "cotizaciones", orderId));
        if (orderDoc.exists()) {
          setOrderDetails(orderDoc.data());
        } else {
          console.error("Orden no encontrada");
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error al cargar detalles del pedido:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, navigate]);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    if (!orderId) return;
    
    const chatRef = ref(rtdb, `deliveryChats/${orderId}`);
    const handle = onValue(chatRef, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(child => {
        const val = child.val();
        msgs.push({
          id: child.key || '',
          message: val.message || '',
          timestamp: val.timestamp || '',
          sender: val.sender
        });
      });
      setMessages(msgs);
    });
    
    return () => off(chatRef, 'value', handle);
  }, [orderId]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !orderId) return;
    
    const chatRef = ref(rtdb, `deliveryChats/${orderId}`);
    await push(chatRef, {
      message: messageText,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      sender: 'delivery'
    });
    
    setMessageText("");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando chat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat de Pedido</h1>
            <p className="text-gray-600">
              {orderDetails?.requestTitle || "Pedido"} - Cliente: {orderDetails?.clientName || orderDetails?.userId || "Cliente"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Conversación</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Área de mensajes */}
              <div className="h-[60vh] overflow-y-auto border rounded-lg p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay mensajes aún. Envía el primer mensaje al cliente.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'delivery' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          msg.sender === 'delivery'
                            ? 'bg-green-600 text-white'
                            : 'bg-white border text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <span className={`text-xs mt-1 block ${
                          msg.sender === 'delivery' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input para enviar mensajes */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Escribe un mensaje para el cliente..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OrderChat;
