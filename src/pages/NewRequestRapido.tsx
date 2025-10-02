import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  ArrowLeft, 
  FileText, 
  Image, 
  Send, 
  Trash2, 
  Eye,
  MessageSquare,
  Zap,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { QuickRequestService, FileProcessingResult } from '../lib/quickRequestService';
import { getAuth } from 'firebase/auth';
import '../styles/quick-request.css';

interface NewRequestRapidoProps {
  onBack: () => void;
}

interface UploadedFile {
  id: string;
  file: File;
  type: 'pdf' | 'excel' | 'image';
  preview?: string;
  processing?: boolean;
  extracted?: FileProcessingResult;
}

const NewRequestRapido: React.FC<NewRequestRapidoProps> = ({ onBack }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [textDescription, setTextDescription] = useState('');
  const [requestTitle, setRequestTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedRequest, setGeneratedRequest] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setCurrentUser(auth.currentUser);
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Crear archivos temporales mientras se procesan
    const tempFiles: UploadedFile[] = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      type: getFileType(file),
      processing: true
    }));

    setFiles(prev => [...prev, ...tempFiles]);

    // Procesar archivos en el backend
    try {
      const result = await QuickRequestService.uploadFiles(selectedFiles);
      
      if (result.success && result.results) {
        // Actualizar archivos con resultados del procesamiento
        setFiles(prev => prev.map(f => {
          const tempFile = tempFiles.find(tf => tf.file.name === f.file.name);
          if (tempFile) {
            const processedResult = result.results!.find(r => r.fileName === f.file.name);
            if (processedResult) {
              return {
                ...f,
                processing: false,
                extracted: processedResult
              };
            }
          }
          return f;
        }));
      } else {
        // Error en el procesamiento
        console.error('Error processing files:', result.error);
        setFiles(prev => prev.map(f => {
          const tempFile = tempFiles.find(tf => tf.file.name === f.file.name);
          return tempFile ? { ...f, processing: false } : f;
        }));
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setFiles(prev => prev.map(f => {
        const tempFile = tempFiles.find(tf => tf.file.name === f.file.name);
        return tempFile ? { ...f, processing: false } : f;
      }));
    }

    // Crear previews para imágenes
    tempFiles.forEach(newFile => {
      if (newFile.type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, preview: e.target?.result as string }
              : f
          ));
        };
        reader.readAsDataURL(newFile.file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (file: File): 'pdf' | 'excel' | 'image' => {
    if (file.type.includes('pdf')) return 'pdf';
    if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'excel';
    if (file.type.includes('image')) return 'image';
    return 'image'; // default
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const generateRequest = async () => {
    setIsProcessing(true);
    
    try {
      // Preparar datos para enviar al backend
      const requestData = {
        title: requestTitle || 'Solicitud rápida', // Usar el título del usuario o uno por defecto
        textDescription,
        uploadedFiles: files.map(f => ({
          fileName: f.file.name,
          fileType: f.type,
          extractedData: f.extracted?.extractedData,
          imageUrl: f.extracted?.extractedData?.imageUrl // Incluir URL de imagen si existe
        })),
        profession: 'construcción', // Por defecto
        location: 'Por definir'
      };

      console.log('🔍 RequestData enviado a generateRequest:', requestData);
      console.log('🔍 Archivos con URLs:', requestData.uploadedFiles.filter(f => f.imageUrl));

      const result = await QuickRequestService.generateRequest(requestData);
      
      if (result.success && result.request) {
        setGeneratedRequest(result.request);
        setShowPreview(true);
      } else {
        console.error('Error generating request:', result.error);
        alert('Error al generar la solicitud: ' + (result.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error generating request:', error);
      alert('Error al generar la solicitud. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmRequest = async () => {
    if (!currentUser) {
      alert('Error: Usuario no autenticado');
      return;
    }

    if (!generatedRequest) {
      alert('Error: No hay solicitud para guardar');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('🔍 Guardando solicitud rápida:', {
        usuarioId: currentUser.uid,
        usuarioNombre: currentUser.displayName,
        usuarioEmail: currentUser.email,
        requestData: generatedRequest
      });

      const result = await QuickRequestService.saveRequest(
        currentUser.uid,
        currentUser.displayName || 'Usuario',
        currentUser.email || '',
        generatedRequest
      );

      if (result.success) {
        alert('¡Solicitud creada exitosamente! Pronto las empresas comenzarán a enviar cotizaciones.');
        onBack(); // Volver a la pantalla anterior
      } else {
        console.error('Error al guardar:', result.error);
        alert('Error al guardar la solicitud: ' + (result.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error inesperado al guardar:', error);
      alert('Error inesperado al guardar la solicitud. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'excel': return <FileText className="w-8 h-8 text-green-500" />;
      case 'image': return <Image className="w-8 h-8 text-blue-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  if (showPreview && generatedRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setShowPreview(false)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a editar</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Preview de la Solicitud</h1>
            <div></div>
          </div>

          {/* Preview Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Solicitud Generada</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Título</label>
                <p className="mt-1 text-gray-900">{generatedRequest.title}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">Profesión</label>
                  <p className="mt-1 text-gray-900">{generatedRequest.profession}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <p className="mt-1 text-gray-900">{generatedRequest.tipo}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Productos/Items</label>
                <div className="mt-2 space-y-3">
                  {generatedRequest.items.map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.specifications}</p>
                      <p className="text-sm text-gray-500 mt-1">Cantidad: {item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>

              {files.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Archivos Adjuntos</label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {files.map(file => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-3 text-center">
                        {getFileIcon(file.type)}
                        <p className="text-xs text-gray-600 mt-1 truncate">{file.file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => setShowPreview(false)}
              disabled={isSaving}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Editar Solicitud
            </button>
            <button
              onClick={confirmRequest}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirmar y Enviar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <div className="flex items-center space-x-2">
            <Zap className="w-6 h-6 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900">Modo Rápido</h1>
          </div>
          <div></div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Left Column - Input Methods */}
          <div className="space-y-6">
            
            {/* File Upload Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Subir Archivos</span>
              </h3>
              
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Excel, Imágenes (máx. 10MB cada uno)
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Uploaded Files */}
              {files.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-gray-900">Archivos subidos:</h4>
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        {/* Mostrar preview de imagen o ícono */}
                        {file.type === 'image' && file.preview ? (
                          <div className="relative">
                            <img 
                              src={file.preview} 
                              alt={file.file.name}
                              className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200"
                            />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <Image className="w-2 h-2 text-white" />
                            </div>
                          </div>
                        ) : (
                          getFileIcon(file.type)
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{file.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            {file.type === 'image' && ' • Imagen'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Botón para ver imagen en grande */}
                        {file.type === 'image' && file.preview && (
                          <button
                            onClick={() => {
                              // Crear modal para ver imagen
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                              modal.innerHTML = `
                                <div class="relative max-w-4xl max-h-4xl p-4">
                                  <img src="${file.preview}" alt="${file.file.name}" class="max-w-full max-h-full rounded-lg" />
                                  <button class="absolute top-2 right-2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                                </div>
                              `;
                              modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
                              document.body.appendChild(modal);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Ver imagen completa"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {file.processing && (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text Description Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Detalles de la Solicitud</span>
              </h3>
              
              <div className="space-y-4">
                {/* Campo de Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Título de la solicitud
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    placeholder="Ej: Herramientas para reparación de baño"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                {/* Campo de Descripción */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción detallada
                  </label>
                  <textarea
                    id="description"
                    value={textDescription}
                    onChange={(e) => setTextDescription(e.target.value)}
                    placeholder="Describe lo que necesitas como si estuvieras hablando con un amigo...&#10;&#10;Ejemplo: &quot;Hola, necesito herramientas para arreglar mi baño. Tengo que cambiar unas tuberías y arreglar el lavamanos. También necesito cemento y algunas cosas de plomería...&quot;"
                    className="w-full h-32 p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div className="text-sm text-gray-500">
                  💡 Puedes escribir de manera natural. Nuestro sistema entenderá qué productos necesitas.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Instructions & Action */}
          <div className="space-y-6">
            
            {/* Instructions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ¿Cómo funciona?
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Sube tus archivos</h4>
                    <p className="text-sm text-gray-600">
                      Catálogos PDF, listas de Excel, fotos de productos que necesitas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Describe naturalmente</h4>
                    <p className="text-sm text-gray-600">
                      Explica tu proyecto como si hablaras con un amigo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Generamos tu solicitud</h4>
                    <p className="text-sm text-gray-600">
                      Nuestro sistema crea automáticamente la solicitud estructurada
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-green-600">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Revisa y confirma</h4>
                    <p className="text-sm text-gray-600">
                      Puedes editar la solicitud antes de enviarla
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <button
                onClick={generateRequest}
                disabled={!textDescription && files.length === 0}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${
                  !textDescription && files.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generando solicitud...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Generar Solicitud</span>
                  </>
                )}
              </button>
              
              {!textDescription && files.length === 0 && (
                <p className="text-sm text-gray-500 text-center mt-3">
                  Agrega al menos una descripción o archivo para continuar
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">💡 Tips para mejores resultados:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sé específico sobre cantidades y medidas</li>
                <li>• Menciona la marca si es importante</li>
                <li>• Incluye el uso que le darás</li>
                <li>• Agrega fotos si tienes ejemplos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRequestRapido;