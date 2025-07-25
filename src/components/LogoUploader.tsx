import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Building2, Upload, Loader2 } from 'lucide-react';
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface LogoUploaderProps {
  currentLogo: string;
  onLogoUpdated: (newLogoUrl: string) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ currentLogo, onLogoUpdated }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo (solo imágenes)
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Validar tamaño de archivo (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 2MB",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Notificación de carga iniciada
      toast({
        title: "Subiendo logo",
        description: "Por favor espera mientras se sube tu imagen...",
      });
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Debes iniciar sesión para subir un logo");
      }
      
      // Crear referencia en Storage - SIN timestamp para evitar problemas con CORS
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `logo_${user.uid}.${fileExt}`;
      const storagePath = `company_logos/${user.uid}/${fileName}`;
      const logoRef = ref(storage, storagePath);
      
      console.log(`Subiendo archivo a: ${storagePath}`);
      
      try {
        // Subir archivo a Firebase Storage
        const snapshot = await uploadBytes(logoRef, file);
        console.log('Imagen subida correctamente:', snapshot);
        
        // MÉTODO ALTERNATIVO: Generar URL directa para evitar CORS
        const bucketName = storage.app.options.storageBucket;
        const logoUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
        console.log('URL directa generada:', logoUrl);
        
        // Intenta también obtener URL oficial (solo para verificar si funciona)
        try {
          const downloadUrl = await getDownloadURL(logoRef);
          console.log('URL oficial de Firebase:', downloadUrl);
          // Si llega aquí, usar la URL oficial
          return processUploadSuccess(downloadUrl);
        } catch (urlError) {
          console.warn('No se pudo obtener URL oficial, usando URL directa:', urlError);
          // Si falla, usar la URL directa
          return processUploadSuccess(logoUrl);
        }
      } catch (uploadError) {
        throw uploadError;
      }
      
      // Función interna para procesar el éxito de la carga
      async function processUploadSuccess(logoUrl) {
      
        // Actualizar Firestore - primero users
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);
        
        if (userSnapshot.exists()) {
          await updateDoc(userDoc, { logo: logoUrl });
        } else {
          await setDoc(userDoc, { 
            logo: logoUrl,
            createdAt: new Date().toISOString() 
          });
        }
        
        // Actualizar empresas collection
        try {
          const companyDoc = doc(db, "empresas", user.uid);
          const companySnapshot = await getDoc(companyDoc);
          
          if (companySnapshot.exists()) {
            await updateDoc(companyDoc, { logo: logoUrl });
          } else {
            await setDoc(companyDoc, { 
              logo: logoUrl,
              createdAt: new Date().toISOString() 
            });
          }
        } catch (err) {
          console.error("Error al actualizar logo en colección empresas:", err);
        }
        
        // Actualizar listados collection
        try {
          const listadoDoc = doc(db, "listados", user.uid);
          const listadoSnapshot = await getDoc(listadoDoc);
          
          if (listadoSnapshot.exists()) {
            await updateDoc(listadoDoc, { companyLogo: logoUrl });
          }
        } catch (err) {
          console.error("Error al actualizar logo en colección listados:", err);
        }
        
        // Notificar éxito
        toast({
          title: "Logo actualizado",
          description: "El logo de tu empresa ha sido actualizado exitosamente",
        });
        
        // Llamar al callback con la nueva URL
        onLogoUpdated(logoUrl);
        
        // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      console.error("Error al subir logo:", err);
      
      // Mejor diagnóstico de errores
      let errorMsg = "No se pudo subir el logo. Intenta nuevamente.";
      
      if (err?.code === 'storage/unauthorized') {
        errorMsg = "Error de permisos: Revisa las reglas de Firebase Storage. Haz clic en 'Ver solución CORS' en el componente de diagnóstico.";
      } else if (err?.code?.startsWith('storage/')) {
        errorMsg = `Error de Firebase Storage: ${err.code}`;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast({
        title: "Error al subir logo",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Contenedor del logo */}
      <div className="relative h-32 w-32 bg-white border-2 border-blue-200 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-xs mt-2 text-white font-medium">Subiendo...</p>
            </div>
          </div>
        )}
        
        {currentLogo ? (
          <img 
            src={currentLogo}
            alt="Logo empresa" 
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("Error al cargar la imagen:", currentLogo);
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Logo';
            }}
          />
        ) : (
          <div className="flex flex-col items-center text-gray-300">
            <Building2 className="h-16 w-16" />
            <p className="text-xs mt-1">Sin logo</p>
          </div>
        )}
      </div>
      
      {/* Input y botón para cargar logo */}
      <div className="mt-3 w-full">
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {currentLogo ? "Cambiar logo" : "Subir logo"}
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-1 text-center">
          PNG, JPG, GIF (máx. 2MB)
        </p>
      </div>
    </div>
  );
};

export default LogoUploader;
