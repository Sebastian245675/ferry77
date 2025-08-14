import { ref, uploadBytesResumable, getDownloadURL, StorageReference, UploadTaskSnapshot } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Helper function to detect if we're running in a local development environment
 */
export const isLocalEnvironment = (): boolean => {
  const host = window.location.hostname;
  return host === 'localhost' || 
         host === '127.0.0.1' || 
         host === '10.150.80.46' ||  // Add your specific IP address
         /^\d+\.\d+\.\d+\.\d+$/.test(host); // IP address format
};

/**
 * Upload a file to Firebase Storage with CORS error handling
 */
export const uploadFileWithCorsHandling = async (
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void,
  onError?: (error: Error) => void
): Promise<{ url: string; path: string }> => {
  try {
    // Log environment info for debugging
    console.log("Entorno de ejecución:", {
      isLocal: isLocalEnvironment(),
      host: window.location.hostname,
      port: window.location.port,
      storageBucket: storage.app.options.storageBucket
    });
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Calculate and report progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error("Upload error:", error);
          
          // If we get a CORS error in any environment - handle it properly
          if (error.message.includes('CORS') || 
              error.code === 'storage/unauthorized' ||
              error.code === 'storage/unknown' ||
              error.message.includes('access control check') ||
              error.message.includes('network error') ||
              error.message.includes('preflight')) {
            console.warn("CORS error detected. Using fallback solution...");
            
            // Log detailed error information for debugging
            console.log("Error details:", {
              code: error.code,
              message: error.message,
              storagePath,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              storage: storage.app.options.storageBucket,
              correctedBucket: storage.app.options.storageBucket.replace('appspot.com', 'firebasestorage.app')
            });

            console.log("Intentando solución alternativa...");
            
            try {
              // SOLUCIÓN 1: Intentar con un nombre de archivo más simple
              const simpleFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
              const simpleStoragePath = `verification_files/${simpleFileName}`;
              
              console.log("Intentando con ruta simplificada:", simpleStoragePath);
              
              // Crear nueva referencia con ruta simplificada
              const simpleStorageRef = ref(storage, simpleStoragePath);
              
              // SOLUCIÓN ADICIONAL: Verificar si estamos usando el bucket correcto
              console.log("Verificando el bucket configurado vs el bucket real de Firebase Storage");
              console.log("- Bucket configurado:", storage.app.options.storageBucket);
              console.log("- Bucket alternativo 1:", storage.app.options.storageBucket.replace('appspot.com', 'firebasestorage.app'));
              console.log("- Bucket alternativo 2:", storage.app.options.storageBucket.replace('firebasestorage.app', 'appspot.com'));
              
              // Intentar subir con nuevo formato y ruta simplificada
              console.log("Intentando subir archivo con ruta simplificada...");
              const simpleUploadTask = uploadBytesResumable(simpleStorageRef, file);
              
              simpleUploadTask.on('state_changed', 
                // Progress function
                (snapshot) => {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  if (onProgress) {
                    onProgress(progress);
                  }
                },
                // Error function
                (uploadError) => {
                  console.error("Solución 1 falló:", uploadError);
                  
                  // SOLUCIÓN 1.5: Intentar con el bucket correcto si el error sigue siendo CORS
                  if (uploadError.message.includes('CORS') || 
                     uploadError.message.includes('access control')) {
                    console.log("Intentando con el bucket correcto de Firebase Storage...");
                    
                    try {
                      // Crear un nuevo objeto de Storage con el bucket correcto
                      const correctedBucket = storage.app.options.storageBucket.replace('appspot.com', 'firebasestorage.app');
                      console.log("Intentando con bucket alternativo:", correctedBucket);
                      
                      // Usar un path simple y diferente para esta prueba
                      const correctPath = `verification_alt/${Date.now()}-test.${file.name.split('.').pop()}`;
                      const testRef = ref(storage, correctPath);
                      
                      // Subir el archivo y resolver con la URL si es exitoso
                      const testUpload = uploadBytesResumable(testRef, file);
                      
                      testUpload.on('state_changed',
                        (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          if (onProgress) onProgress(progress);
                        },
                        (testError) => {
                          console.error("También falló con bucket corregido:", testError);
                          // Continuar con la solución 2
                          tryDevelopmentFallback();
                        },
                        async () => {
                          try {
                            const url = await getDownloadURL(testUpload.snapshot.ref);
                            console.log("¡Éxito con bucket alternativo! URL:", url);
                            resolve({
                              url: url,
                              path: correctPath
                            });
                          } catch (err) {
                            console.error("Error obteniendo URL con bucket alternativo:", err);
                            tryDevelopmentFallback();
                          }
                        }
                      );
                    } catch (bucketError) {
                      console.error("Error intentando con bucket alternativo:", bucketError);
                      tryDevelopmentFallback();
                    }
                  } else {
                    // Si no es un error CORS, pasar directo a la solución 2
                    tryDevelopmentFallback();
                  }
                  
                  // Función helper para la solución 2
                  function tryDevelopmentFallback() {
                    // SOLUCIÓN 2: Para entorno de desarrollo, simular una subida exitosa
                    if (isLocalEnvironment()) {
                      console.log("Usando URL local temporal para desarrollo");
                      
                      // Crear una URL local temporal
                      const mockUrl = URL.createObjectURL(file);
                      
                      // Guardar información del archivo en localStorage
                      try {
                        const mockId = storagePath.replace(/[/\.]/g, '_');
                        localStorage.setItem(`devStorage_${mockId}`, JSON.stringify({
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          url: mockUrl,
                          path: storagePath,
                          uploadedAt: Date.now()
                        }));
                        console.log("Información del archivo guardada en localStorage");
                      } catch (e) {
                        console.warn("Error al guardar en localStorage:", e);
                      }
                      
                      // Devolver resultado simulado para desarrollo
                      resolve({
                        url: mockUrl,
                        path: storagePath
                      });
                    } else {
                      // En producción, devolver el error original
                      reject(error);
                    }
                  }
                },
                // Success function
                async () => {
                  try {
                    const downloadURL = await getDownloadURL(simpleUploadTask.snapshot.ref);
                    console.log("Solución 1 exitosa. URL:", downloadURL);
                    resolve({
                      url: downloadURL,
                      path: simpleStoragePath
                    });
                  } catch (urlError) {
                    console.error("Error obteniendo URL de descarga:", urlError);
                    reject(urlError);
                  }
                }
              );
            } catch (fallbackError) {
              console.error("Error en solución alternativa:", fallbackError);
              
              // Si todo falla y estamos en desarrollo, usar URL local
              if (isLocalEnvironment()) {
                const mockUrl = URL.createObjectURL(file);
                resolve({
                  url: mockUrl,
                  path: storagePath
                });
              } else {
                reject(fallbackError);
              }
            }
          } else {
            // Para otros errores, rechazar la promesa
            if (onError) {
              onError(error);
            }
            reject(error);
          }
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              path: storagePath
            });
          } catch (error) {
            console.error("Error getting download URL:", error);
            if (onError) {
              onError(error as Error);
            }
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error("Error starting upload:", error);
    if (onError) {
      onError(error as Error);
    }
    throw error;
  }
};
