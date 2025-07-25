import { useState, useEffect } from 'react';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { toast } from "@/hooks/use-toast";

/**
 * Este componente verifica y muestra el estado de las reglas de Firebase Storage
 * Solo para desarrollo, no usar en producción
 */
export default function StorageDebugger() {
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [bucketInfo, setBucketInfo] = useState('');
  const [testFileUrl, setTestFileUrl] = useState('');

  const checkStorageAccess = async () => {
    setIsChecking(true);
    setMessage('Verificando acceso a Firebase Storage...');
    setTestFileUrl('');

    try {
      const storage = getStorage();
      const auth = getAuth();
      const user = auth.currentUser;
      
      // Mostrar información del bucket
      const bucketName = storage.app.options.storageBucket;
      setBucketInfo(`Bucket: ${bucketName}`);

      if (!user) {
        setMessage('⚠️ No hay usuario autenticado. Inicia sesión primero.');
        setIsChecking(false);
        return;
      }

      // Verificar primera si podemos acceder a la información del bucket (reglas de lectura)
      try {
        const testUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?prefix=test`;
        const readResponse = await fetch(testUrl, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          } 
        });
        
        if (!readResponse.ok) {
          setMessage(`❌ Error al acceder al bucket: ${readResponse.status} ${readResponse.statusText}. 
          Posible problema con las reglas de Firebase Storage o CORS.`);
          
          toast({
            title: "Solución recomendada",
            description: "1. Abre la consola de Firebase y actualiza las reglas. 2. Configura CORS usando los pasos en cors-config.txt",
          });
          
          setIsChecking(false);
          return;
        } else {
          setMessage(`✅ Puedo acceder al bucket (reglas de lectura correctas). Intentando subir archivo...`);
        }
      } catch (readError) {
        console.error('Error al verificar acceso de lectura:', readError);
        setMessage(`❌ No se puede acceder al bucket: ${readError.message}`);
        setIsChecking(false);
        return;
      }
      
      // Intenta crear un archivo de prueba con un nombre simple
      const fileDate = new Date().toISOString().replace(/[-:.TZ]/g, '');
      const testRef = ref(storage, `debug/test_${fileDate}.txt`);
      
      try {
        // Subir un archivo de prueba
        await uploadString(testRef, 'Este es un archivo de prueba para verificar las reglas de Storage');
        
        // Obtener URL de descarga
        const downloadUrl = await getDownloadURL(testRef);
        setTestFileUrl(downloadUrl);
        
        // Intentar leer el archivo para verificar CORS
        const response = await fetch(downloadUrl);
        
        if (response.ok) {
          setMessage('✅ Firebase Storage configurado correctamente. Se puede subir y leer archivos.');
          
          // Eliminar el archivo de prueba después de verificar
          try {
            await deleteObject(testRef);
            console.log('Archivo de prueba eliminado');
          } catch (cleanupError) {
            console.warn('No se pudo eliminar el archivo de prueba:', cleanupError);
          }
        } else {
          setMessage(`⚠️ Se pudo subir el archivo pero no leerlo (${response.status}: ${response.statusText}). Posible problema CORS.`);
        }
      } catch (uploadError: any) {
        console.error('Error al subir archivo de prueba:', uploadError);
        
        // Mostrar código de error específico de Firebase Storage
        const errorCode = uploadError?.code || 'desconocido';
        const errorMessage = uploadError?.message || String(uploadError);
        
        setMessage(`❌ Error al subir archivo (${errorCode}): ${errorMessage}
        
Si el error es "storage/unauthorized", debes actualizar las reglas en Firebase Console.
Si es un error CORS, debes configurar CORS como se indica en cors-config.txt.`);
      }
    } catch (error) {
      console.error('Error general verificando Storage:', error);
      setMessage(`❌ Error general: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Verificar automáticamente al montar el componente
    checkStorageAccess();
  }, []);

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4 rounded">
      <div className="flex flex-col">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-yellow-800">
              <strong>Diagnóstico de Firebase Storage</strong> ({bucketInfo})
            </p>
            <div className="mt-1">
              <p className="text-sm text-yellow-700 whitespace-pre-line">
                {isChecking ? 'Verificando acceso a Firebase Storage...' : message}
              </p>
            </div>
            
            {testFileUrl && (
              <div className="mt-2 p-2 bg-white rounded border border-yellow-200">
                <p className="text-xs text-gray-600 mb-1">URL de prueba creada:</p>
                <a 
                  href={testFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 break-all hover:underline"
                >
                  {testFileUrl}
                </a>
              </div>
            )}
            
            <div className="mt-3 space-x-2">
              <button 
                className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded hover:bg-yellow-200 transition-colors"
                onClick={checkStorageAccess}
                disabled={isChecking}
              >
                {isChecking ? 'Verificando...' : 'Verificar acceso'}
              </button>
              
              <button 
                className="px-3 py-1 bg-white text-gray-600 border border-gray-300 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
                onClick={() => window.open("https://console.firebase.google.com/project/ferry-67757/storage/ferry-67757.appspot.com/rules", "_blank")}
              >
                Abrir reglas en Firebase Console
              </button>
              
              <button 
                className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                onClick={() => window.open("file:///c:/Users/Nadie/Downloads/ferry-craft-connect-main%20(1)/ferry-craft-connect-main/SOLUCION_CORS.txt", "_blank")}
              >
                Ver solución CORS
              </button>
            </div>
            
            <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
              <p><strong>Pasos para resolver:</strong></p>
              <ol className="ml-4 list-decimal">
                <li>Ve a Firebase Console → Storage → Rules</li>
                <li>Actualiza las reglas para permitir acceso (hay un ejemplo en el archivo "firebase-storage-rules.txt" en la raíz del proyecto)</li>
                <li>Para desarrollo, usa: <code className="bg-white px-1 rounded">allow read, write: if true;</code></li>
                <li>Haz clic en "Publicar" y espera unos minutos para que los cambios surtan efecto</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
