import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Upload, FileImage, MessageSquare, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import DashboardLayout from "@/components/barraempresa";

interface QuickQuoteRequest {
  id: string;
  titulo: string;
  profesion?: string;
  ubicacion?: string;
  presupuesto?: number;
  usuarioNombre?: string;
  items?: Array<{
    id: number;
    nombre: string;
    cantidad: number;
    especificaciones?: string;
    imagenUrl?: string; // Cambiar a camelCase como en el backend
  }>;
}

const QuickQuoteResponse: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const user = auth.currentUser;

  // Obtener ID de la solicitud desde URL params
  const queryParams = new URLSearchParams(location.search);
  const requestId = queryParams.get("id");

  const [request, setRequest] = useState<QuickQuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Estados para la respuesta
  const [responseType, setResponseType] = useState<'message' | 'image' | 'excel' | null>(null);
  const [message, setMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refs para inputs de archivos
  const imageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos de la solicitud
  React.useEffect(() => {
    console.log('🚀 QuickQuoteResponse cargado, requestId:', requestId);
    
    const fetchRequestData = async () => {
      if (!requestId) {
        console.error('❌ No hay requestId');
        toast({
          title: "Error",
          description: "No se especificó el ID de la solicitud",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      try {
        console.log('📡 Haciendo fetch a:', `http://localhost:8090/api/solicitudes/${requestId}`);
        const response = await fetch(`http://localhost:8090/api/solicitudes/${requestId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Datos de solicitud recibidos:', data);
          console.log('📦 Items de la solicitud:', data.items);
          
          // Verificar si hay URLs de imagen
          if (data.items) {
            data.items.forEach((item: any, index: number) => {
              console.log(`🖼️ Item ${index}: ${item.nombre}, imagenUrl:`, item.imagenUrl);
            });
          }
          
          // TEST TEMPORAL: Agregar imagen forzada si no hay
          if (data.items && data.items.length > 0 && !data.items[0].imagenUrl) {
            console.log('⚠️ TEST: Agregando imagen temporal');
            data.items[0].imagenUrl = "https://firebasestorage.googleapis.com/v0/b/ferry-67757.firebasestorage.app/o/quick_requests%2FiDOgjylZM8Tc0YWy4YmsQiD6ryn2%2Fquickrequest_iDOgjylZM8Tc0YWy4YmsQiD6ryn2_1759270047942.jpg?alt=media&token=f620afee-5518-4947-ad38-2c6ec96a61d8";
          }
          
          setRequest(data);
        } else {
          throw new Error('No se pudo cargar la solicitud');
        }
      } catch (error) {
        console.error('Error cargando solicitud:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la solicitud",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [requestId, navigate]);

  const handleResponseTypeChange = (type: 'message' | 'image' | 'excel') => {
    setResponseType(type);
    // Limpiar estados anteriores
    setMessage('');
    setUploadedFile(null);
    setPreviewUrl(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo de imagen válido",
          variant: "destructive",
        });
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen no puede ser mayor a 5MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea un archivo Excel
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo Excel (.xls, .xlsx) o CSV",
          variant: "destructive",
        });
        return;
      }

      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "El archivo no puede ser mayor a 10MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !request) {
      toast({
        title: "Error",
        description: "No se pudo verificar la autenticación del usuario",
        variant: "destructive",
      });
      return;
    }

    // Validar que se haya seleccionado una forma de respuesta
    if (!responseType) {
      toast({
        title: "Error",
        description: "Por favor selecciona una forma de responder",
        variant: "destructive",
      });
      return;
    }

    // Validar contenido según el tipo
    if (responseType === 'message' && !message.trim()) {
      toast({
        title: "Error",
        description: "Por favor escribe un mensaje",
        variant: "destructive",
      });
      return;
    }

    if ((responseType === 'image' || responseType === 'excel') && !uploadedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      // Obtener datos de la empresa
      const companyResponse = await fetch(`http://localhost:8090/api/usuarios/firebase/${user.uid}`);
      const companyData = companyResponse.ok ? await companyResponse.json() : null;

      if (!companyData?.id) {
        throw new Error("No se pudo obtener la información de la empresa");
      }

      // Preparar FormData para envío
      const formData = new FormData();
      formData.append('companyId', companyData.id.toString());
      formData.append('solicitudId', request.id);
      formData.append('responseType', responseType);
      formData.append('companyName', companyData?.companyName || companyData?.nick || companyData?.nombreCompleto || "Empresa");

      if (responseType === 'message') {
        formData.append('message', message);
      } else if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      // Enviar al backend
      const response = await fetch('http://localhost:8090/api/proposals/quick-response', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar la respuesta rápida');
      }

      toast({
        title: "¡Respuesta enviada!",
        description: "Tu cotización rápida ha sido enviada al cliente exitosamente",
      });

      // Navegar de regreso al dashboard
      navigate('/backoffice');

    } catch (error) {
      console.error('Error enviando respuesta rápida:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la respuesta. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando solicitud...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No se pudo cargar la solicitud</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cotización Rápida</h1>
              <p className="text-gray-600">Responde de forma ágil a la solicitud del cliente</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Detalles de la solicitud */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{request.titulo}</h3>
                {request.profesion && (
                  <p className="text-gray-600 mt-2">Profesión: {request.profesion}</p>
                )}
              </div>

              {request.ubicacion && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Ubicación:</span>
                  <p className="text-gray-600">{request.ubicacion}</p>
                </div>
              )}

              {request.presupuesto && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Presupuesto:</span>
                  <p className="text-gray-600">${request.presupuesto.toLocaleString()}</p>
                </div>
              )}

              {request.items && request.items.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Items solicitados:</span>
                  <div className="space-y-2 mt-2">
                    {request.items.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{item.nombre}</span>
                          <Badge variant="outline">Cant: {item.cantidad}</Badge>
                        </div>
                        {item.especificaciones && (
                          <p className="text-sm text-gray-600 mt-1">{item.especificaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mostrar imágenes adjuntas */}
              {request.items && request.items.some(item => item.imagenUrl) && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Imágenes adjuntas:</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {request.items
                      .filter(item => item.imagenUrl)
                      .map((item, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={item.imagenUrl}
                            alt={`Imagen de ${item.nombre}`}
                            className="w-full h-24 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => window.open(item.imagenUrl, '_blank')}
                            onError={(e) => {
                              console.error('Error cargando imagen:', item.imagenUrl);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
                              Click para ampliar
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Columna derecha: Opciones de respuesta */}
          <Card>
            <CardHeader>
              <CardTitle>Tu Respuesta Rápida</CardTitle>
              <CardDescription>
                Elige cómo quieres responder a esta solicitud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Opciones de respuesta */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Tipo de respuesta:</h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* Opción Mensaje */}
                  <div 
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      responseType === 'message' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleResponseTypeChange('message')}
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Mensaje de texto</p>
                        <p className="text-sm text-gray-600">Responde con un mensaje personalizado</p>
                      </div>
                    </div>
                  </div>

                  {/* Opción Imagen */}
                  <div 
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      responseType === 'image' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleResponseTypeChange('image')}
                  >
                    <div className="flex items-center space-x-3">
                      <FileImage className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">Subir imagen</p>
                        <p className="text-sm text-gray-600">Envía una imagen con tu cotización</p>
                      </div>
                    </div>
                  </div>

                  {/* Opción Excel */}
                  <div 
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      responseType === 'excel' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleResponseTypeChange('excel')}
                  >
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Archivo Excel</p>
                        <p className="text-sm text-gray-600">Envía tu cotización en Excel (.xlsx, .xls, .csv)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenido específico según el tipo seleccionado */}
              {responseType === 'message' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Tu mensaje:
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu cotización aquí. Puedes incluir precios, tiempos de entrega, condiciones de pago, etc."
                    rows={6}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    {message.length}/1000 caracteres
                  </p>
                </div>
              )}

              {responseType === 'image' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Seleccionar imagen:
                  </label>
                  
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {!uploadedFile ? (
                    <Button
                      variant="outline"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-gray-400"
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Haz clic para seleccionar una imagen</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (máx 5MB)</p>
                      </div>
                    </Button>
                  ) : (
                    <div className="relative">
                      {previewUrl && (
                        <div className="border rounded-lg overflow-hidden">
                          <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600 truncate flex-1">
                          {uploadedFile.name}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeFile}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {responseType === 'excel' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Seleccionar archivo Excel:
                  </label>
                  
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  
                  {!uploadedFile ? (
                    <Button
                      variant="outline"
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-gray-400"
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Haz clic para seleccionar un archivo Excel</p>
                        <p className="text-xs text-gray-500 mt-1">.xlsx, .xls, .csv (máx 10MB)</p>
                      </div>
                    </Button>
                  ) : (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeFile}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón de envío */}
              <div className="border-t pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={sending || !responseType || 
                    (responseType === 'message' && !message.trim()) || 
                    ((responseType === 'image' || responseType === 'excel') && !uploadedFile)
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {sending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Respuesta Rápida
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QuickQuoteResponse;