import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  Save,
  Star,
  Award,
  Calendar,
  ShieldCheck,
  Building2,
  Edit,
  Plus,
  Trash2,
  Tag,
  Upload,
  Loader2,
  X,
  DollarSign,
  Package,
  Image,
  Scale,
  Link,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db, storage } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { uploadFileWithCorsHandling } from "../lib/storageHelpers";
import { generateInventoryManagementToken, getInventoryManagementUrl } from "../lib/inventoryLinkService";


// MOCK de datos de empresa
const company = {
  name: "Mi Empresa S.A.",
  email: "empresa@email.com",
  phone: "+34 123 456 789",
  address: "Calle Falsa 123, Madrid",
  website: "https://miempresa.com",
  description: "Empresa dedicada a la carpintería y construcción.",
  category: "carpinteria",
  profileImage: "",
  isVerified: true,
  rating: 4.7,
};

// Aquí continúa el código existente hasta llegar a handleProfileImageUpload

const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log("[UPLOAD] Inicio del proceso de subida de imagen");
  const file = e.target.files?.[0];
  if (!file) {
    console.log("[UPLOAD] No se seleccionó ningún archivo");
    return;
  }
  
  console.log("[UPLOAD] Archivo seleccionado:", file.name, "Tipo:", file.type, "Tamaño:", file.size);
  
  // Validar tipo de archivo (solo imágenes)
  if (!file.type.startsWith('image/')) {
    console.log("[UPLOAD] Error: Tipo de archivo no válido:", file.type);
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
    console.log("[UPLOAD] Error: Archivo demasiado grande:", file.size);
    toast({
      title: "Error",
      description: "La imagen no debe superar los 2MB",
      variant: "destructive"
    });
    return;
  }
  
  try {
    setIsUploading(true);
    console.log("[UPLOAD] Estado de carga activado");
    
    // Crear una URL local para previsualización inmediata
    const localPreviewUrl = URL.createObjectURL(file);
    console.log("[UPLOAD] URL de previsualización local creada:", localPreviewUrl);
    
    // Actualizar estado con previsualización local inmediata para mejorar UX
    setFormData(prev => ({
      ...prev,
      profileImage: localPreviewUrl
    }));
    console.log("[UPLOAD] Estado actualizado con previsualización local");
    
    // Notificación de carga iniciada
    toast({
      title: "Procesando imagen",
      description: "Subiendo imagen al servidor...",
    });
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.log("[UPLOAD] Error: Usuario no autenticado");
      throw new Error("Debes iniciar sesión para subir una imagen");
    }
    console.log("[UPLOAD] Usuario autenticado:", user.uid);
    
    // Crear ruta para el archivo en Firebase Storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `profile_${user.uid}_${Date.now()}.${fileExt}`;
    const storagePath = `company_profiles/${user.uid}/${fileName}`;
    console.log("[UPLOAD] Ruta de almacenamiento creada:", storagePath);
    
    let finalImageUrl;
    
    // Detectar si estamos en entorno local
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log("[UPLOAD] Detectado entorno local, usando estrategia de desarrollo");
      
      // En desarrollo, usamos la URL de previsualización local
      finalImageUrl = localPreviewUrl;
      
      // Guardar en localStorage para persistencia en desarrollo
      const localStorageKey = `profile_image_${user.uid}`;
      localStorage.setItem(localStorageKey, localPreviewUrl);
      
      // Notificar al usuario
      toast({
        title: "Modo desarrollo",
        description: "En desarrollo se usa la previsualización local. En producción se subirá a Firebase.",
        duration: 5000
      });
      
      // Simular una pequeña demora para mejor UX
      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      try {
        console.log("[UPLOAD] Entorno de producción, subiendo a Firebase Storage");
        
        // Usar el helper de carga con manejo de CORS
        const uploadResult = await uploadFileWithCorsHandling(
          file,
          storagePath,
          // Callback de progreso
          (progress) => {
            console.log(`[UPLOAD] Progreso: ${progress.toFixed(2)}%`);
          },
          // Callback de error
          (error) => {
            console.error("[UPLOAD] Error durante la subida:", error);
          }
        );
        
        console.log("[UPLOAD] Imagen subida exitosamente:", uploadResult);
        finalImageUrl = uploadResult.url;
        
        // Verificar si la URL es accesible
        const img = new window.Image();
        const imageAccessiblePromise = new Promise<boolean>((resolve) => {
          img.onload = () => {
            console.log("[UPLOAD] La imagen es accesible");
            resolve(true);
          };
          img.onerror = () => {
            console.log("[UPLOAD] La imagen podría no ser accesible inmediatamente");
            resolve(false);
          };
          img.src = finalImageUrl;
        });
        
        // Dar un tiempo para verificar accesibilidad
        const isAccessible = await Promise.race([
          imageAccessiblePromise,
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000))
        ]);
        
        if (!isAccessible) {
          console.log("[UPLOAD] Advertencia: La imagen puede tardar en estar disponible");
          toast({
            title: "Información",
            description: "La imagen puede tardar unos minutos en estar visible en todos los dispositivos.",
            duration: 5000
          });
        }
      } catch (error) {
        console.error("[UPLOAD] Error subiendo la imagen:", error);
        
        // Usar la previsualización local como respaldo
        finalImageUrl = localPreviewUrl;
        
        toast({
          title: "Advertencia",
          description: "Hubo un problema al subir la imagen. Se usará una versión temporal.",
          duration: 5000
        });
      }
    }
    
    // Actualizar el estado con la URL final
    setFormData(prev => ({
      ...prev,
      profileImage: finalImageUrl
    }));
    console.log("[UPLOAD] Estado actualizado con URL final:", finalImageUrl);
    
    // Actualizar en Firestore
    try {
      console.log("[UPLOAD] Iniciando actualización en Firestore...");
      // Actualizar Firestore - en users
      const userDoc = doc(db, "users", user.uid);
      console.log("[UPLOAD] Actualizando colección users...");
      await setDoc(userDoc, { 
        profileImage: finalImageUrl,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      console.log("[UPLOAD] Colección users actualizada");
      
      // Actualizar empresas collection si existe
      const companyDoc = doc(db, "empresas", user.uid);
      console.log("[UPLOAD] Actualizando colección empresas...");
      await setDoc(companyDoc, { 
        profileImage: finalImageUrl,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      console.log("[UPLOAD] Colección empresas actualizada");
      
      // Actualizar la URL en listados collection también
      const listadoDoc = doc(db, "listados", user.uid);
      console.log("[UPLOAD] Verificando existencia de documento en listados...");
      const listadoSnapshot = await getDoc(listadoDoc);
      if (listadoSnapshot.exists()) {
        console.log("[UPLOAD] Documento en listados encontrado, actualizando companyLogo...");
        await updateDoc(listadoDoc, { companyLogo: finalImageUrl });
        console.log("[UPLOAD] companyLogo actualizado en listados");
      } else {
        console.log("[UPLOAD] Documento en listados no existe, se omite la actualización");
      }
    } catch (firestoreError) {
      console.error("[UPLOAD] Error al actualizar Firestore:", firestoreError);
      toast({
        title: "Advertencia",
        description: "Imagen subida pero hubo un problema al actualizar la base de datos",
        variant: "destructive"
      });
    }
    
    // Mostrar notificación de éxito
    toast({
      title: "¡Imagen actualizada!",
      description: "La imagen de perfil se ha actualizado correctamente.",
      duration: 3000
    });
    
    // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      console.log("[UPLOAD] Limpiando input de archivo");
      fileInputRef.current.value = '';
    }
    
    // Liberar la URL de objeto local para evitar memory leaks
    if (localPreviewUrl) {
      console.log("[UPLOAD] Liberando URL de objeto local");
      URL.revokeObjectURL(localPreviewUrl);
    }
    
    // Desactivar estado de carga
    setIsUploading(false);
    
    return finalImageUrl;
  } catch (err) {
    console.error("[UPLOAD] Error general en la subida:", err);
    setIsUploading(false);
    
    toast({
      title: "Error",
      description: err instanceof Error ? err.message : "Hubo un problema al procesar la imagen",
      variant: "destructive",
      duration: 5000
    });
    
    return null;
  }
};

// Aquí continúa el código existente
// Este archivo es solo una referencia para mostrar cómo debería quedar la implementación del handleProfileImageUpload
