
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { MessageCircle, Phone, Mail, Search, ChevronDown, ChevronRight, Bot, User, Send, HelpCircle, Book, FileText, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: '¡Hola! Soy Ferry Bot, tu asistente virtual. ¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: '10:00'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'faq' | 'chat' | 'contact'>('faq');
  const { toast } = useToast();

  const faqs: FAQ[] = [
    {
      id: '1',
      question: '¿Cómo hago un pedido?',
      answer: 'Para hacer un pedido, ve a "Nueva Solicitud", selecciona las herramientas que necesitas, elige la urgencia y presupuesto, y envía tu solicitud. Las empresas te enviarán cotizaciones.',
      category: 'Pedidos'
    },
    {
      id: '2',
      question: '¿Cuánto tiempo tarda la entrega?',
      answer: 'El tiempo de entrega varía según la empresa y la urgencia del pedido. Generalmente: Urgente (1-2 horas), Normal (3-4 horas), No urgente (hasta 24 horas).',
      category: 'Entrega'
    },
    {
      id: '3',
      question: '¿Cómo funciona el sistema de puntos?',
      answer: 'Ganas puntos con cada pedido completado. Puedes canjear estos puntos por descuentos, envío gratis y otros beneficios en la sección de Recompensas.',
      category: 'Puntos'
    },
    {
      id: '4',
      question: '¿Puedo cancelar un pedido?',
      answer: 'Puedes cancelar un pedido antes de que sea confirmado por la empresa. Una vez confirmado, contacta directamente con la empresa para gestionar la cancelación.',
      category: 'Pedidos'
    },
    {
      id: '5',
      question: '¿Las empresas están verificadas?',
      answer: 'Sí, todas las empresas pasan por un proceso de verificación. Puedes ver su puntuación de seguridad, certificaciones y reseñas de otros usuarios.',
      category: 'Seguridad'
    },
    {
      id: '6',
      question: '¿Cómo recargo saldo en mi cuenta?',
      answer: 'Ve a la sección "Mi Saldo" desde el menú principal. Puedes recargar usando tarjeta de crédito, débito, transferencia bancaria o billeteras digitales.',
      category: 'Pagos'
    }
  ];

  const categories = [...new Set(faqs.map(faq => faq.category))];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendMessage = () => {
    if (newMessage.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        message: newMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      
      // Simular respuesta del bot
      setTimeout(() => {
        const botResponse = getBotResponse(newMessage);
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          message: botResponse,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, botMessage]);
      }, 1000);
    }
  };

  const getBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('pedido') || lowerMessage.includes('solicitud')) {
      return 'Para hacer un pedido, ve a "Nueva Solicitud" en el menú principal. Allí podrás seleccionar las herramientas que necesitas y enviar tu solicitud a las empresas.';
    } else if (lowerMessage.includes('entrega') || lowerMessage.includes('tiempo')) {
      return 'Los tiempos de entrega varían: Urgente (1-2 horas), Normal (3-4 horas), No urgente (hasta 24 horas). Puedes rastrear tu pedido en tiempo real desde "Rastrear".';
    } else if (lowerMessage.includes('puntos') || lowerMessage.includes('recompensas')) {
      return 'Ganas puntos con cada pedido completado. Puedes canjearlos por descuentos y beneficios en la sección "Recompensas". ¡Cada peso gastado te da puntos!';
    } else if (lowerMessage.includes('pago') || lowerMessage.includes('saldo')) {
      return 'Puedes recargar tu saldo desde "Mi Saldo". Aceptamos tarjetas, transferencias y billeteras digitales. También puedes pagar contra entrega en algunos casos.';
    } else if (lowerMessage.includes('empresa') || lowerMessage.includes('segur')) {
      return 'Todas nuestras empresas están verificadas. Puedes ver su puntuación de seguridad, certificaciones y reseñas de otros usuarios en su perfil.';
    } else {
      return 'Gracias por tu consulta. Si necesitas ayuda específica, puedes contactar a nuestro equipo de soporte o revisar las preguntas frecuentes. ¿Hay algo más en lo que pueda ayudarte?';
    }
  };

  const contactSupport = (type: string) => {
    toast({
      title: "Contactando soporte",
      description: `Abriendo ${type}...`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Centro de Ayuda</h1>
            <p className="text-gray-600">Encuentra respuestas rápidas o chatea con nuestro asistente</p>
          </div>

          {/* Navegación de tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'faq'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Book className="w-4 h-4 inline mr-2" />
              Preguntas Frecuentes
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bot className="w-4 h-4 inline mr-2" />
              Chat Bot
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'contact'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="w-4 h-4 inline mr-2" />
              Contacto
            </button>
          </div>

          {/* Preguntas Frecuentes */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              {/* Búsqueda */}
              <Card>
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar en preguntas frecuentes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Categorías */}
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Badge key={category} variant="outline" className="cursor-pointer hover:bg-blue-50">
                    {category}
                  </Badge>
                ))}
              </div>

              {/* FAQs */}
              <div className="space-y-3">
                {filteredFAQs.map(faq => (
                  <Card key={faq.id}>
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{faq.question}</h3>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {faq.category}
                            </Badge>
                          </div>
                          {expandedFAQ === faq.id ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <div className="px-4 pb-4 text-gray-600">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredFAQs.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">No se encontraron resultados</h3>
                    <p className="text-gray-600">Intenta con otros términos de búsqueda o contacta a nuestro soporte.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Chat Bot */}
          {activeTab === 'chat' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <span>Ferry Bot - Asistente Virtual</span>
                  <Badge className="bg-green-100 text-green-800">En línea</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3 bg-gray-50">
                    {chatMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-xs ${
                          msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.sender === 'user' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            {msg.sender === 'user' ? (
                              <User className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Bot className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          
                          <div
                            className={`p-3 rounded-lg ${
                              msg.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <span className={`text-xs mt-1 block ${
                              msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Escribe tu pregunta..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage('¿Cómo hago un pedido?')}
                    >
                      ¿Cómo hago un pedido?
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage('¿Cuánto tarda la entrega?')}
                    >
                      Tiempo de entrega
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage('¿Cómo funcionan los puntos?')}
                    >
                      Sistema de puntos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contacto */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Teléfono</h3>
                  <p className="text-gray-600 mb-4">Lunes a Viernes: 9:00 - 18:00</p>
                  <p className="font-medium mb-4">+54 11 1234-5678</p>
                  <Button 
                    onClick={() => contactSupport('llamada')}
                    className="w-full"
                  >
                    Llamar Ahora
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">WhatsApp</h3>
                  <p className="text-gray-600 mb-4">Respuesta inmediata</p>
                  <p className="font-medium mb-4">+54 9 11 1234-5678</p>
                  <Button 
                    onClick={() => contactSupport('WhatsApp')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Chatear
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Email</h3>
                  <p className="text-gray-600 mb-4">Respuesta en 24 horas</p>
                  <p className="font-medium mb-4">soporte@ferry.com</p>
                  <Button 
                    onClick={() => contactSupport('email')}
                    variant="outline"
                    className="w-full"
                  >
                    Enviar Email
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recursos adicionales */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recursos Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>Guía de Usuario</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <Video className="w-6 h-6 text-green-600" />
                  <span>Video Tutoriales</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                  <span>Comunidad</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Help;
