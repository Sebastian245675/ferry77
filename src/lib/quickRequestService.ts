// Servicio para el modo rápido de creación de solicitudes
import { uploadMultipleQuickRequestImages } from './quickRequestImageUpload';

const API_BASE_URL = 'http://localhost:8090/api';

export interface FileProcessingResult {
  fileName: string;
  fileType: string;
  success: boolean;
  error?: string;
  extractedData?: any;
  items?: any[];
  description?: string;
}

export interface QuickRequestData {
  title?: string;
  textDescription: string;
  uploadedFiles?: {
    fileName: string;
    fileType: string;
    extractedData?: any;
    imageUrl?: string;
  }[];
  profession?: string;
  location?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export class QuickRequestService {
  static async uploadFiles(files: File[]): Promise<{ success: boolean; results?: FileProcessingResult[]; error?: string }> {
    try {
      // Separate image files and other files
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      const otherFiles = files.filter(file => !file.type.startsWith('image/'));
      
      let results: FileProcessingResult[] = [];
      
      // Upload images to Firebase Storage ONLY (no backend processing)
      if (imageFiles.length > 0) {
        console.log('[QuickRequestService] Uploading images to Firebase Storage...');
        
        try {
          const firebaseResults = await uploadMultipleQuickRequestImages(imageFiles);
          
          // Create processing results for images with Firebase URLs
          const imageResults: FileProcessingResult[] = firebaseResults.map(result => ({
            success: true,
            fileName: result.originalName,
            fileType: 'image',
            extractedData: {
              type: 'image',
              imageUrl: result.url,
              storagePath: result.path,
              description: 'Imagen subida a Firebase Storage',
              products: ['Producto con imagen adjunta']
            }
          }));
          
          results = [...results, ...imageResults];
          console.log('[QuickRequestService] Images uploaded to Firebase (NO backend processing):', imageResults);
        } catch (error) {
          console.error('[QuickRequestService] Error uploading images to Firebase:', error);
          return {
            success: false,
            error: 'Error al subir imágenes a Firebase Storage'
          };
        }
      }
      
      // Process ONLY non-image files through backend
      if (otherFiles.length > 0) {
        console.log('[QuickRequestService] Processing non-image files through backend...');
        
        const formData = new FormData();
        otherFiles.forEach(file => {
          formData.append('files', file);
        });

        const response = await fetch(`${API_BASE_URL}/quick-request/upload-files`, {
          method: 'POST',
          body: formData,
        });

        const backendData = await response.json();
        
        if (backendData.success && backendData.results) {
          results.push(...backendData.results);
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error uploading files:', error);
      return {
        success: false,
        error: 'Error al subir archivos. Inténtalo de nuevo.'
      };
    }
  }

  static async processText(description: string): Promise<{ success: boolean; extracted?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/quick-request/process-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error processing text:', error);
      return {
        success: false,
        error: 'Error al procesar el texto. Inténtalo de nuevo.'
      };
    }
  }

  static async generateRequest(requestData: QuickRequestData): Promise<{ success: boolean; request?: any; error?: string }> {
    try {
      console.log('🚀 Enviando requestData al backend:', requestData);
      
      const response = await fetch(`${API_BASE_URL}/quick-request/generate-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('📥 Respuesta del backend generate-request:', data);
      
      return data;
    } catch (error) {
      console.error('Error generating request:', error);
      return {
        success: false,
        error: 'Error al generar la solicitud. Inténtalo de nuevo.'
      };
    }
  }

  static async saveRequest(
    usuarioId: string, 
    usuarioNombre: string, 
    usuarioEmail: string, 
    requestData: any
  ): Promise<{ success: boolean; solicitud?: any; error?: string }> {
    try {
      const payload = {
        usuarioId,
        usuarioNombre,
        usuarioEmail,
        requestData
      };

      const response = await fetch(`${API_BASE_URL}/quick-request/save-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving request:', error);
      return {
        success: false,
        error: 'Error al guardar la solicitud. Inténtalo de nuevo.'
      };
    }
  }
}

export default QuickRequestService;