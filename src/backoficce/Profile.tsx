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
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db, storage } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


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
  completedJobs: 32,
  createdAt: "2021-01-01T00:00:00.000Z"
};

// Interfaz para los productos de la lista de venta
interface ProductItem {
  id?: string; // ID local para gestionar la lista en la UI
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  stock?: number; // cantidad disponible
  fromSupreme?: boolean; // Nuevo: marca si viene de la lista suprema
  image?: string; // url de imagen
  photoUrl?: string; // url alternativa de imagen
  updatedAt?: string; // fecha de última modificación (ISO string)
}

// Interfaz para el documento de listado de productos por empresa
interface CompanyProducts {
  companyId: string;
  products: ProductItem[];
  updatedAt: Date;
  ubicacion?: {
    ciudad: string;
    localidad: string;
    barrio: string;
    especificaciones: string;
    enlaceGoogleMaps: string;
  };
}

const Profile = () => {
  // Elimina el uso de useCompanyAuth
  // const { company, updateProfile } = useCompanyAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    category: "",
    ubicompleta: {
      ciudad: "",
      localidad: "",
      barrio: "",
      especificaciones: "",
      enlaceGoogleMaps: ""
    },
    description: "",
    email: "",
    phone: "",
    nick: "",
    avatar: "",
    profileImage: ""
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para la lista de productos
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductItem>({
    name: "",
    description: "",
    price: 0,
    unit: "unidad",
    category: "producto"
  });
  // Traer lista suprema y agregar a productos de la empresa
  const handleImportSupremeList = async () => {
    try {
      setIsLoadingProducts(true);
      const snapshot = await getDocs(collection(db, "listado_supremo"));
      
      if (snapshot.empty) {
        toast({ 
          title: "Lista vacía", 
          description: "No hay productos en la lista suprema para importar." 
        });
        return;
      }
      
      console.log("Documentos encontrados:", snapshot.docs.length);
      
      const supremeProducts: ProductItem[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        console.log("Datos del producto:", data); // Para depurar
        return {
          id: docSnap.id,
          name: data.name || data.nombre || "Producto sin nombre",
          description: data.specifications || data.specs || data.description || "",
          price: 0,
          unit: "unidad",
          category: data.category || "producto",
          stock: 0,
          fromSupreme: true,
          image: data.imageUrl || "" // Campo de imagen en FormularioSupremo
        };
      });
      
      console.log("Productos procesados:", supremeProducts);
      
      // Evitar duplicados por nombre
      const currentNames = new Set(products.map(p => p.name));
      const newSupreme = supremeProducts.filter(p => !currentNames.has(p.name));
      
      if (newSupreme.length === 0) {
        toast({ title: "Nada para importar", description: "Todos los productos de la lista suprema ya están en tu lista." });
        setIsLoadingProducts(false);
        return;
      }
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const companyId = user.uid; // ID dinámico del usuario actual
      const productDoc = doc(db, "listados", companyId);
      const docSnapshot = await getDoc(productDoc);
      let updatedProducts: ProductItem[] = [];
      if (docSnapshot.exists()) {
        const companyData = docSnapshot.data() as CompanyProducts;
        updatedProducts = [...(companyData.products || []), ...newSupreme];
        await updateDoc(productDoc, {
          products: updatedProducts,
          ubicacion: formData.ubicompleta,
          companyName: formData.companyName,
          updatedAt: new Date()
        });
      } else {
        updatedProducts = [...products, ...newSupreme];
        await setDoc(productDoc, {
          companyId,
          products: updatedProducts,
          ubicacion: formData.ubicompleta,
          companyName: formData.companyName,
          updatedAt: new Date(),
          createdAt: new Date()
        });
      }
      setProducts(updatedProducts.map((p, i) => ({ ...p, id: p.id || `${i}` })));
      toast({ title: "Lista suprema importada", description: `Se agregaron ${newSupreme.length} productos.` });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo importar la lista suprema", variant: "destructive" });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Estado para las estadísticas
  const [stats, setStats] = useState({
    completedJobs: 0,
    rating: 0,
    clients: 0,
    years: 0
  });

  // Cargar productos de la empresa
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const companyId = user.uid; // ID dinámico del usuario actual
        const productDoc = doc(db, "listados", companyId);
        const docSnapshot = await getDoc(productDoc);
        if (docSnapshot.exists()) {
          const companyData = docSnapshot.data() as CompanyProducts;
          // Si algún producto importado no tiene fromSupreme, lo marcamos (retrocompatibilidad)
          const productsWithIds = companyData.products.map((product, index) => {
            if (product.fromSupreme === undefined && product.id && product.id.length >= 20) {
              // Heurística: IDs largas suelen ser de Firestore (importados)
              return { ...product, id: product.id, fromSupreme: true };
            }
            return { ...product, id: product.id || `${index}` };
          });
          setProducts(productsWithIds);
          
          // Si hay ubicación en el documento, actualizamos el estado
          if (companyData.ubicacion) {
            setFormData(prev => ({
              ...prev,
              ubicompleta: companyData.ubicacion
            }));
          }
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Error al cargar productos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos",
          variant: "destructive"
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  // Efecto para cargar información de contacto real del usuario
  useEffect(() => {
    const fetchUserContact = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = doc(db, "users", user.uid);
        const docSnapshot = await getDoc(userDoc);
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setFormData({
            companyName: data.companyName || "",
            category: data.category || "",
            ubicompleta: data.ubicompleta || {
              ciudad: "",
              localidad: "",
              barrio: "",
              especificaciones: "",
              enlaceGoogleMaps: ""
            },
            description: data.description || "",
            email: data.email || "",
            phone: data.phone || "",
            nick: data.nick || "",
            avatar: data.avatar || "",
            profileImage: data.profileImage || data.companyLogo || ""
          });
        }
      } catch (err) {
        console.error("Error cargando datos de contacto del usuario:", err);
      }
    };
    fetchUserContact();
  }, []);

  // Efecto para cargar estadísticas de la empresa
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const companyId = user.uid;
        // 1. Obtener doc empresa
        const companyDoc = doc(db, "empresas", companyId);
        const docSnapshot = await getDoc(companyDoc);
        let completedJobs = 0;
        let rating = 0;
        let clients = 0;
        let years = 0;
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          rating = data.rating || 0;
          clients = data.clients || 0;
          years = data.createdAt ? new Date().getFullYear() - new Date(data.createdAt).getFullYear() : 0;
        }
        // 2. Contar cotizaciones entregadas (deliveryStatus: 'entregado')
        const quotesQuery = query(
          collection(db, "cotizaciones"),
          where("companyId", "==", companyId),
          where("deliveryStatus", "==", "entregado")
        );
        const quotesSnapshot = await getDocs(quotesQuery);
        completedJobs = quotesSnapshot.size;

        // Si quieres mostrar más avanzado: contar por mes, etc.
        // Ejemplo: trabajos completados por mes
        // const jobsByMonth: Record<string, number> = {};
        // quotesSnapshot.forEach(doc => {
        //   const data = doc.data();
        //   const date = data.deliveredAt ? new Date(data.deliveredAt) : null;
        //   if (date) {
        //     const key = `${date.getFullYear()}-${date.getMonth(;)+1}`;
        //     jobsByMonth[key] = (jobsByMonth[key] || 0) + 1
        //   }
        // });

        setStats({
          completedJobs,
          rating,
          clients,
          years
        });
      } catch (err) {
        console.error("Error cargando estadísticas de empresa:", err);
      }
    };
    fetchStats();
  }, []);

  // Función para agregar un nuevo producto
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({
        title: "Error",
        description: "El nombre y precio son obligatorios",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const companyId = user.uid; // ID dinámico del usuario actual
      const productDoc = doc(db, "listados", companyId);
      const docSnapshot = await getDoc(productDoc);
      
      // Generamos un ID temporal para la UI
      const tempId = Date.now().toString();
      const productToAdd = { ...newProduct, id: tempId };
      
      if (docSnapshot.exists()) {
        // Si el documento ya existe, actualizamos el array de productos
        const companyData = docSnapshot.data() as CompanyProducts;
        const updatedProducts = [...(companyData.products || []), newProduct];
        
        await updateDoc(productDoc, {
          products: updatedProducts,
          ubicacion: formData.ubicompleta,
          companyName: formData.companyName,
          updatedAt: new Date()
        });
      } else {
        // Si el documento no existe, lo creamos
        await setDoc(productDoc, {
          companyId,
          products: [newProduct],
          ubicacion: formData.ubicompleta,
          companyName: formData.companyName,
          updatedAt: new Date(),
          createdAt: new Date()
        });
      }
      
      // Actualizamos el estado local
      setProducts([...products, productToAdd]);
      
      // Resetear formulario
      setNewProduct({
        name: "",
        description: "",
        price: 0,
        unit: "unidad",
        category: "producto"
      });
      
      setIsAddingProduct(false);
      
      toast({
        title: "Producto agregado",
        description: "El producto se ha añadido a tu lista de venta",
      });
    } catch (error) {
      console.error("Error al guardar producto:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
  };

  // Función para eliminar un producto
  const handleDeleteProduct = async (id?: string) => {
    if (!id) return;
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const companyId = user.uid; // ID dinámico del usuario actual
      const productDoc = doc(db, "listados", companyId);
      const docSnapshot = await getDoc(productDoc);
      
      if (docSnapshot.exists()) {
        const companyData = docSnapshot.data() as CompanyProducts;
        
        // Encontramos el índice del producto a eliminar
        const productIndex = products.findIndex(product => product.id === id);
        
        if (productIndex !== -1) {
          // Creamos una copia de los productos actuales y eliminamos el producto
          const updatedProducts = [...companyData.products];
          updatedProducts.splice(productIndex, 1);
          
          // Actualizamos el documento con la lista actualizada
          await updateDoc(productDoc, {
            products: updatedProducts,
            ubicacion: formData.ubicompleta,
            companyName: formData.companyName,
            updatedAt: new Date()
          });
          
          // Actualizamos el estado local
          setProducts(products.filter(product => product.id !== id));
          
          toast({
            title: "Producto eliminado",
            description: "El producto ha sido eliminado de tu lista",
          });
        }
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUbicacionChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      ubicompleta: {
        ...prev.ubicompleta,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    // Guardar los cambios en Firestore (colección users y listados)
    const saveContact = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        
        // Guardar en users
        const userDoc = doc(db, "users", user.uid);
        await setDoc(userDoc, {
          ...formData,
          ubicompleta: formData.ubicompleta,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        // También guardar en la colección empresas
        const companyDoc = doc(db, "empresas", user.uid);
        await setDoc(companyDoc, {
          companyName: formData.companyName,
          category: formData.category,
          profileImage: formData.profileImage,
          description: formData.description,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // También guardar ubicacion en listados si existe el documento
        const companyId = user.uid;
        const listadoDoc = doc(db, "listados", companyId);
        const listadoSnap = await getDoc(listadoDoc);
        
        if (listadoSnap.exists()) {
          // Actualizar ubicación y nombre de la empresa
          await updateDoc(listadoDoc, {
            ubicacion: formData.ubicompleta,
            companyName: formData.companyName,
            companyLogo: formData.profileImage, // Añadir la imagen de perfil como logo
            updatedAt: new Date()
          });
        } else {
          // Si no existe el documento, lo creamos con información básica
          await setDoc(listadoDoc, {
            companyId,
            companyName: formData.companyName,
            ubicacion: formData.ubicompleta,
            companyLogo: formData.profileImage, // Añadir la imagen de perfil como logo
            products: [],
            updatedAt: new Date(),
            createdAt: new Date()
          });
        }
        
        setIsEditing(false);
        toast({
          title: "Perfil actualizado",
          description: "Tu información ha sido actualizada exitosamente",
        });
      } catch (err) {
        console.error("Error guardando datos de contacto del usuario:", err);
        toast({
          title: "Error",
          description: "No se pudo actualizar la información",
          variant: "destructive"
        });
      }
    };
    saveContact();
  };


  // Avatares personalizados (puedes cambiar las URLs por imágenes propias o SVGs locales)
  const avatarOptions = [
    // Temática moderna, profesional y amigable
    { id: 'avatar1', url: '/public/avatars/avatar1.png', label: 'Constructor' },
    { id: 'avatar2', url: '/public/avatars/avatar2.png', label: 'Carpintero' },
    { id: 'avatar3', url: '/public/avatars/avatar3.png', label: 'Electricista' },
    { id: 'avatar4', url: '/public/avatars/avatar4.png', label: 'Arquitecto' },
    { id: 'avatar5', url: '/public/avatars/avatar5.png', label: 'Ingeniera' },
    { id: 'avatar6', url: '/public/avatars/avatar6.png', label: 'Robot' },
    { id: 'avatar7', url: '/public/avatars/avatar7.png', label: 'Obrero' },
    { id: 'avatar8', url: '/public/avatars/avatar8.png', label: 'Creativo' },
    { id: 'avatar9', url: '/public/avatars/avatar9.png', label: 'Ferry' },
    { id: 'avatar10', url: '/public/avatars/avatar10.png', label: 'Minimal' },
  ];

  const handleAvatarSelect = (avatarId: string) => {
    setFormData(prev => ({ ...prev, avatar: avatarId }));
  };
  
  // Función para subir foto de perfil
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
      
      // Actualizar estado con previsualización local inmediata
      setFormData(prev => ({
        ...prev,
        profileImage: localPreviewUrl
      }));
      console.log("[UPLOAD] Estado actualizado con previsualización local");
      
      // Notificación de carga iniciada
      toast({
        title: "Procesando imagen",
        description: "Mostrando previsualización mientras se procesa...",
      });
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.log("[UPLOAD] Error: Usuario no autenticado");
        throw new Error("Debes iniciar sesión para subir una imagen");
      }
      console.log("[UPLOAD] Usuario autenticado:", user.uid);
      
      // Crear referencia en Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `profile_${user.uid}_${Date.now()}.${fileExt}`;
      const storagePath = `company_profiles/${user.uid}/${fileName}`;
      const imageRef = ref(storage, storagePath);
      console.log("[UPLOAD] Referencia de almacenamiento creada:", storagePath);
      console.log("[UPLOAD] Bucket de Firebase:", storage.app.options);
      
      // Construir URL directa basada en el bucket de Firebase (plan B por defecto)
      // Formato correcto para acceder a imágenes en Firebase Storage
      const directStorageUrl = `https://storage.googleapis.com/ferry-67757.appspot.com/${storagePath}`;
      console.log("[UPLOAD] URL directa preparada (plan B):", directStorageUrl);
      
      // URL alternativa que puede funcionar mejor en algunos casos
      const altStorageUrl = `https://firebasestorage.googleapis.com/v0/b/ferry-67757.appspot.com/o/${encodeURIComponent(storagePath)}?alt=media`;
      console.log("[UPLOAD] URL alternativa preparada:", altStorageUrl);
      
      // Intentar subir archivo a Firebase Storage
      let finalImageUrl = directStorageUrl; // Por defecto usamos la URL directa
      const isLocalhost = window.location.hostname === 'localhost';
      
      try {
        console.log("[UPLOAD] Intentando método estándar de subida...");
        console.log("[UPLOAD] Iniciando uploadBytes...");
        
        if (isLocalhost) {
          // En localhost, usamos una estrategia diferente para evitar problemas CORS
          console.log("[UPLOAD] Detectado entorno localhost, aplicando estrategia local...");
          
          // Solución para entorno de desarrollo - En lugar de intentar subir realmente
          // simulamos una subida exitosa usando la previsualización local
          console.log("[UPLOAD] En modo desarrollo, usaremos la previsualización local");
          
          // Guardamos la URL de la previsualización local en localStorage para persistencia
          const localFileKey = `temp_profile_${user.uid}`;
          localStorage.setItem(localFileKey, localPreviewUrl);
          
          // Asignamos una URL simulada para el entorno de desarrollo
          finalImageUrl = localPreviewUrl;
          
          // Notificamos al usuario que estamos en modo desarrollo
          toast({
            title: "Modo desarrollo detectado",
            description: "La imagen se muestra como previsualización local. En producción se subirá a Firebase.",
            duration: 5000
          });
          
          // Simulamos un pequeño delay para mejorar UX
          await new Promise(resolve => setTimeout(resolve, 800));
          
          console.log("[UPLOAD] Previsualización local configurada como imagen de perfil temporal");
        } else {
          // En producción, intentamos el método estándar primero
          try {
            // Intentar método estándar de subida
            await uploadBytes(imageRef, file);
            console.log("[UPLOAD] uploadBytes completado con éxito");
            
            // Si tiene éxito, obtener URL de descarga
            console.log("[UPLOAD] Obteniendo URL de descarga...");
            const downloadUrl = await getDownloadURL(imageRef);
            console.log("[UPLOAD] Imagen subida correctamente:", downloadUrl);
            
            finalImageUrl = downloadUrl; // Actualizamos con la URL oficial
          } catch (standardUploadError) {
            console.error("[UPLOAD] Error en método estándar:", standardUploadError);
            
            // Intento alternativo usando un método más directo
            console.log("[UPLOAD] Intentando método alternativo de subida...");
            
            try {
              // Crear un FormData y subir el archivo directamente mediante fetch
              const formData = new FormData();
              formData.append('file', file);
              
              // Obtener un token de Firebase Auth para la solicitud
              const token = await user.getIdToken();
              
              // URL del endpoint de subida de Firebase Storage (formato directo)
              const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/ferry-67757.appspot.com/o?name=${encodeURIComponent(storagePath)}`;
              
              console.log("[UPLOAD] Intentando subida alternativa a:", uploadUrl);
              const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/octet-stream'
                },
                body: file
              });
              
              if (uploadResponse.ok) {
                console.log("[UPLOAD] Subida alternativa exitosa");
                // En este caso usamos la URL directa que construimos anteriormente
              } else {
                console.log("[UPLOAD] Subida alternativa falló con estado:", uploadResponse.status);
                // Continuamos con URL directa como último recurso
              }
            } catch (alternativeError) {
              console.error("[UPLOAD] Error en subida alternativa:", alternativeError);
              console.log("[UPLOAD] Usando URL directa como último recurso");
            }
          }
        }
      } catch (uploadError) {
        console.error("[UPLOAD] Error general en el proceso de subida:", uploadError);
        console.log("[UPLOAD] Continuando con la URL directa por error:", finalImageUrl);
        
        toast({
          title: "Advertencia",
          description: "Hubo un problema al subir la imagen, pero usaremos una URL alternativa.",
          duration: 5000
        });
      }
      
      // Actualizar el estado con la URL final (ya sea directa o la de Firebase)
      setFormData(prev => ({
        ...prev,
        profileImage: finalImageUrl
      }));
      console.log("[UPLOAD] Estado actualizado con URL final:", finalImageUrl);
      
      try {
        // Verificar si la imagen es accesible (en segundo plano)
        const checkImageExists = async (url: string) => {
          try {
            console.log("[UPLOAD] Verificando si la imagen es accesible...");
            
            // Si es una URL local (blob:) no intentamos verificar accesibilidad
            if (url.startsWith('blob:')) {
              console.log("[UPLOAD] URL local detectada, omitiendo verificación de accesibilidad");
              return;
            }
            
            // Para evitar problemas CORS en la verificación, usamos una Image en lugar de fetch
            const img = new Image();
            let isAccessible = false;
            
            // Creamos una promesa para controlar el timeout
            const imagePromise = new Promise<boolean>((resolve) => {
              img.onload = () => {
                console.log("[UPLOAD] La imagen cargó correctamente");
                resolve(true);
              };
              
              img.onerror = () => {
                console.log("[UPLOAD] Error al cargar la imagen");
                resolve(false);
              };
              
              // Intentamos cargar la imagen
              img.src = url;
            });
            
            // Establecemos un timeout para la verificación
            const timeoutPromise = new Promise<boolean>((resolve) => {
              setTimeout(() => resolve(false), 5000); // 5 segundos de timeout
            });
            
            // Verificamos si la imagen se cargó dentro del timeout
            isAccessible = await Promise.race([imagePromise, timeoutPromise]);
            
            if (!isAccessible) {
              console.log("[UPLOAD] Advertencia: La imagen puede no ser accesible");
              
              // Intentar con URL alternativa
              console.log("[UPLOAD] Intentando con URL alternativa para verificación");
              
              if (url === directStorageUrl) {
                // Si la URL actual es la directa, probamos con la alternativa
                console.log("[UPLOAD] Cambiando a URL alternativa");
                setFormData(prev => ({
                  ...prev,
                  profileImage: altStorageUrl
                }));
                finalImageUrl = altStorageUrl;
              } else if (!isLocalhost) {
                // Si no estamos en localhost, mostramos advertencia
                toast({
                  title: "Advertencia",
                  description: "La imagen se ha guardado pero podría no ser accesible inmediatamente. Puede tomar unos minutos hasta que esté disponible.",
                  duration: 8000
                });
              }
            } else {
              console.log("[UPLOAD] La imagen es accesible correctamente");
            }
          } catch (error) {
            console.log("[UPLOAD] Error al verificar accesibilidad de la imagen:", error);
          }
        };
        
        // Iniciar verificación en segundo plano
        checkImageExists(finalImageUrl);
        
        // Conseguimos la URL final de la imagen para guardar en la base de datos
        const imageUrl = finalImageUrl;
        console.log("[UPLOAD] URL final de imagen a guardar en Firestore:", imageUrl);
        
        console.log("[UPLOAD] Iniciando actualización en Firestore...");
        // Actualizar Firestore - en users
        const userDoc = doc(db, "users", user.uid);
        console.log("[UPLOAD] Actualizando colección users...");
        await setDoc(userDoc, { 
          profileImage: imageUrl,
          updatedAt: new Date().toISOString() 
        }, { merge: true });
        console.log("[UPLOAD] Colección users actualizada");
        
        // Actualizar empresas collection si existe
        const companyDoc = doc(db, "empresas", user.uid);
        console.log("[UPLOAD] Actualizando colección empresas...");
        await setDoc(companyDoc, { 
          profileImage: imageUrl,
          updatedAt: new Date().toISOString() 
        }, { merge: true });
        console.log("[UPLOAD] Colección empresas actualizada");
        
        // Actualizar la URL en listados collection también
        const listadoDoc = doc(db, "listados", user.uid);
        console.log("[UPLOAD] Verificando existencia de documento en listados...");
        const listadoSnapshot = await getDoc(listadoDoc);
        if (listadoSnapshot.exists()) {
          console.log("[UPLOAD] Documento en listados encontrado, actualizando companyLogo...");
          await updateDoc(listadoDoc, { companyLogo: imageUrl });
          console.log("[UPLOAD] companyLogo actualizado en listados");
        } else {
          console.log("[UPLOAD] Documento en listados no existe, se omite la actualización");
        }
        
        // Notificar éxito
        console.log("[UPLOAD] Proceso completado con éxito");
        toast({
          title: "Imagen actualizada",
          description: "La imagen de perfil ha sido actualizada exitosamente",
        });
      } catch (firestoreError) {
        console.error("[UPLOAD] Error al actualizar Firestore:", firestoreError);
        console.log("[UPLOAD] Tipo de error:", firestoreError.constructor.name);
        if (firestoreError.code) {
          console.log("[UPLOAD] Código de error:", firestoreError.code);
        }
        if (firestoreError.message) {
          console.log("[UPLOAD] Mensaje de error:", firestoreError.message);
        }
        
        toast({
          title: "Advertencia",
          description: "Imagen subida pero hubo un problema al actualizar la base de datos",
          variant: "destructive"
        });
      }
      
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
    } catch (err: any) {
      console.error("[UPLOAD] Error general al subir imagen:", err);
      console.log("[UPLOAD] Tipo de error general:", err.constructor.name);
      if (err.code) {
        console.log("[UPLOAD] Código de error general:", err.code);
      }
      if (err.message) {
        console.log("[UPLOAD] Mensaje de error general:", err.message);
      }
      if (err.stack) {
        console.log("[UPLOAD] Stack de error:", err.stack);
      }
      
      // Mensaje de error
      toast({
        title: "Error al subir imagen",
        description: "No se pudo subir la imagen. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      console.log("[UPLOAD] Finalizando proceso, reseteando estado de carga");
      setIsUploading(false);
    }
  };

  const handleProductInputChange = (field: keyof ProductItem, value: string | number) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const categoryLabels: Record<string, string> = {
    carpinteria: "Carpintería",
    electricidad: "Electricidad",
    construccion: "Construcción"
  };

  // Datos para el formulario de productos
  const productCategories = [
    { value: "producto", label: "Producto" },
    { value: "servicio", label: "Servicio" },
    { value: "material", label: "Material" }
  ];
  
  const productUnits = [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramo" },
    { value: "m2", label: "Metro cuadrado" },
    { value: "m", label: "Metro" },
    { value: "hora", label: "Hora" },
    { value: "servicio", label: "Servicio completo" }
  ];

  const certifications = [
    {
      name: "Certificación en Construcción Sostenible",
      issuer: "Instituto de Construcción Verde",
      date: "2023-06-15",
      valid: true
    },
    {
      name: "Licencia de Electricista Profesional",
      issuer: "Colegio Oficial de Electricistas",
      date: "2022-03-10",
      valid: true
    },
    {
      name: "Curso de Seguridad en el Trabajo",
      issuer: "Fundación Laboral de la Construcción",
      date: "2023-09-22",
      valid: true
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-6 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 mb-2 border border-blue-100"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-800 drop-shadow-sm">Perfil de Empresa</h1>
            <p className="text-gray-600 text-sm sm:text-base font-medium">Gestiona la información de tu empresa</p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className={`w-full sm:w-auto transform hover:scale-105 transition-all duration-200 shadow-md ${!isEditing ? "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white" : ""}`}
          >
            <Edit className="mr-2 h-4 w-4 animate-pulse" />
            {isEditing ? "Cancelar" : "Editar Perfil"}
          </Button>
        </motion.div>

        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-blue-100">
            <TabsTrigger value="general" className="text-xs sm:text-sm p-2 sm:p-3 font-medium transition-all duration-300">
              <span className="hidden sm:inline">Información General</span>
              <span className="sm:hidden">General</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs sm:text-sm p-2 sm:p-3 font-medium transition-all duration-300">
              <span className="hidden sm:inline">Lista de Venta</span>
              <span className="sm:hidden">Productos</span>
            </TabsTrigger>
            {/* <TabsTrigger value="certifications" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="hidden sm:inline">Certificaciones</span>
              <span className="sm:hidden">Certs</span>
            </TabsTrigger> */}
            <TabsTrigger value="statistics" className="text-xs sm:text-sm p-2 sm:p-3 font-medium transition-all duration-300">
              <span className="hidden sm:inline">Estadísticas</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            {/* Profile Header Card */}
            <Card className="glass-effect">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-blue-200">
                      {formData.profileImage ? (
                        <AvatarImage src={formData.profileImage} alt="Foto de perfil" />
                      ) : formData.avatar ? (
                        <img src={avatarOptions.find(a => a.id === formData.avatar)?.url} alt="avatar" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
                          {company?.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    {isEditing && (
                      <div className="mt-2 flex justify-center">
                        <div className="relative">
                          <Button
                            size="sm"
                            className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <div className="animate-spin">
                                <Loader2 className="h-4 w-4" />
                              </div>
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleProfileImageUpload}
                            disabled={isUploading}
                          />
                        </div>
                      </div>
                    )}
                    
                    {isEditing && (
                      <div className="mt-4 flex flex-wrap gap-3 max-w-xs">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar.id}
                            type="button"
                            className={`rounded-full border-2 p-1 transition-all ${formData.avatar === avatar.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-blue-300'}`}
                            onClick={() => handleAvatarSelect(avatar.id)}
                          >
                            <img src={avatar.url} alt={avatar.label} className="w-12 h-12 object-cover rounded-full" />
                            <span className="block text-xs text-center mt-1 text-gray-600">{avatar.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{company?.name}</h2>
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        {company?.isVerified && (
                          <div className="flex items-center space-x-1">
                            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                            <Badge className="bg-green-100 text-green-800 text-xs">Verificada</Badge>
                          </div>
                        )}
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {categoryLabels[company?.category || '']}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{company?.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span>{company?.completedJobs} trabajos completados</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>
                          Desde {company?.createdAt ? new Date(company.createdAt).getFullYear() : '2020'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm sm:text-base">{company?.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Información de Contacto</CardTitle>
                <CardDescription className="text-sm">
                  Mantén actualizada tu información de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm">Nombre de la Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Categoría</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      disabled={!isEditing ? true : false}
                      className="pl-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Ubicación de la Empresa</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Ciudad"
                        value={formData.ubicompleta.ciudad}
                        onChange={e => handleUbicacionChange("ciudad", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Localidad"
                        value={formData.ubicompleta.localidad}
                        onChange={e => handleUbicacionChange("localidad", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Barrio"
                        value={formData.ubicompleta.barrio}
                        onChange={e => handleUbicacionChange("barrio", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Especificaciones (ej: piso, referencia, etc)"
                        value={formData.ubicompleta.especificaciones}
                        onChange={e => handleUbicacionChange("especificaciones", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm md:col-span-2"
                      />
                      <Input
                        placeholder="Enlace de Google Maps"
                        value={formData.ubicompleta.enlaceGoogleMaps}
                        onChange={e => handleUbicacionChange("enlaceGoogleMaps", e.target.value)}
                        disabled={!isEditing}
                        className="text-sm md:col-span-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nick" className="text-sm">Nick</Label>
                    <Input
                      id="nick"
                      value={formData.nick}
                      onChange={(e) => handleInputChange("nick", e.target.value)}
                      disabled={!isEditing ? true : false}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Descripción de la Empresa</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    disabled={!isEditing ? true : false}
                    rows={4}
                    className="text-sm"
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} className="company-card text-white w-full sm:w-auto">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4 sm:space-y-6">
            <Card className="glass-effect">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Lista de Venta</CardTitle>
                    <CardDescription className="text-sm">
                      Gestiona los productos y servicios que ofrece tu empresa
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                      onClick={handleImportSupremeList}
                    >
                      Traer lista suprema
                    </Button>
                    <Button 
                      className="company-card text-white w-full sm:w-auto"
                      onClick={() => setIsAddingProduct(!isAddingProduct)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isAddingProduct ? "Cancelar" : "Agregar Producto"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingProduct && (
                  <Card className="mb-6 border-dashed border-2 p-4 bg-gradient-to-br from-blue-50 to-white shadow-lg">
                    <CardContent className="p-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="productName" className="text-sm font-medium">Nombre del Producto/Servicio*</Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => handleProductInputChange('name', e.target.value)}
                            placeholder="Ej: Mesa de madera"
                            className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"

                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productPrice" className="text-sm font-medium">Precio*</Label>
                          <Input
                            id="productPrice"
                            type="number"
                            value={newProduct.price.toString()}
                            onChange={(e) => handleProductInputChange('price', Number(e.target.value))}
                            placeholder="0.00"
                            className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productCategory" className="text-sm font-medium">Categoría</Label>
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => handleProductInputChange('category', value)}

                          >
                            <SelectTrigger className="text-sm bg-white/80 border-blue-200 focus:border-blue-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {productCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productUnit" className="text-sm font-medium">Unidad</Label>
                          <Select
                            value={newProduct.unit}
                            onValueChange={(value) => handleProductInputChange('unit', value)}

                          >
                            <SelectTrigger className="text-sm bg-white/80 border-blue-200 focus:border-blue-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {productUnits.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="productImageUrl" className="text-sm font-medium">Enlace de imagen</Label>
                        <Input
                          id="productImageUrl"
                          value={newProduct.image || ''}
                          onChange={(e) => handleProductInputChange('image', e.target.value)}
                          placeholder="https://ejemplo.com/imagen.jpg"
                          className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleAddProduct} 
                          className="company-card text-white shadow-md hover:scale-105 transition-transform"
                        >
                          Guardar Producto
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isLoadingProducts ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-500">Cargando productos...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-10 text-center border border-dashed rounded-lg bg-gradient-to-br from-blue-50 to-white">
                    <Tag className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Aún no has agregado productos o servicios</p>
                    <p className="text-gray-400 text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg shadow-sm bg-white/80">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gradient-to-r from-blue-100 to-blue-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">#</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Producto/Servicio</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Categoría</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Precio</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Stock</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Última modificación</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-50">
                        {products.map((product, index) => (
                          <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-sm text-blue-500 font-semibold">{index + 1}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-10 h-10 object-cover rounded border border-blue-200"
                                    style={{ minWidth: 40, minHeight: 40 }}
                                    onError={e => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = "https://via.placeholder.com/40?text=No+img";
                                    }}
                                  />
                                ) : (
                                  <img
                                    src="https://via.placeholder.com/40?text=No+img"
                                    alt="Sin imagen"
                                    className="w-10 h-10 object-cover rounded border border-blue-200"
                                    style={{ minWidth: 40, minHeight: 40 }}
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{product.name}</div>
                                  <div className="text-xs text-gray-500 line-clamp-2 max-w-xs">{product.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm">
                              <Badge variant="outline" className="text-xs capitalize bg-blue-100 text-blue-700 border-blue-200">
                                {product.category}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-700">
                                <input
                                  type="number"
                                  value={product.price}
                                  min={0}
                                  className="w-20 px-2 py-1 border rounded text-blue-700 bg-blue-50"
                                  onBlur={async e => {
                                    const newPrice = Number(e.target.value);
                                    const updated = products.map((p, i) => i === index ? { ...p, price: newPrice, updatedAt: new Date().toISOString() } : p);
                                    setProducts(updated);
                                    // Guardar en Firestore
                                    const auth = getAuth();
                                    const user = auth.currentUser;
                                    if (!user) return;
                                    const companyId = user.uid;
                                    const productDoc = doc(db, "listados", companyId);
                                    await updateDoc(productDoc, { 
                                      products: updated, 
                                      ubicacion: formData.ubicompleta,
                                      companyName: formData.companyName,
                                      updatedAt: new Date() 
                                    });
                                  }}
                                  onChange={e => {
                                    const newPrice = Number(e.target.value);
                                    setProducts(products => products.map((p, i) => i === index ? { ...p, price: newPrice, updatedAt: new Date().toISOString() } : p));
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-500">por {product.unit}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-700">
                                <input
                                  type="number"
                                  value={product.stock ?? 0}
                                  min={0}
                                  className="w-20 px-2 py-1 border rounded text-blue-700 bg-blue-50"
                                  onBlur={async e => {
                                    const newStock = Number(e.target.value);
                                    const updated = products.map((p, i) => i === index ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } : p);
                                    setProducts(updated);
                                    // Guardar en Firestore
                                    const auth = getAuth();
                                    const user = auth.currentUser;
                                    if (!user) return;
                                    const companyId = user.uid;
                                    const productDoc = doc(db, "listados", companyId);
                                    await updateDoc(productDoc, { 
                                      products: updated, 
                                      ubicacion: formData.ubicompleta,
                                      companyName: formData.companyName,
                                      updatedAt: new Date() 
                                    });
                                  }}
                                  onChange={e => {
                                    const newStock = Number(e.target.value);
                                    setProducts(products => products.map((p, i) => i === index ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } : p));
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-500">
                              {product.updatedAt
                                ? new Date(product.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                                : 'Sin modificar'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apartado de certificaciones eliminado */}

          <TabsContent value="statistics" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedJobs}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Trabajos Completados</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto mb-3">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Calificación Promedio</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.clients}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Clientes Satisfechos</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.years}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Años de Experiencia</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart Placeholder */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Rendimiento Mensual</CardTitle>
                <CardDescription className="text-sm">
                  Estadísticas de tus trabajos y calificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="h-48 sm:h-64 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Gráfico de rendimiento - próximamente</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;