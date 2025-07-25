import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  Upload,
  FileText,
  Award,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Camera,
  X,
  Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db, storage } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Obtener el ID de la empresa autenticada
const auth = getAuth();
const user = auth.currentUser;
const companyId = user ? user.uid : null; // ID dinámico del usuario actual

// Tipos para TypeScript
interface DocumentFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  url: string;
  path: string;
  uploadedAt: number;
  docType: string; // Tipo de documento: "businessLicense", "taxId", "insurance", "certification"
}

interface VerificationData {
  businessLicense: string;
  taxId: string;
  insurance: string;
  additionalInfo: string;
  uploadedDocs: DocumentFile[];
  steps: {
    basic: boolean;
    legal: boolean;
    certifications: boolean;
    final: boolean;
  };
  isVerified: boolean;
  requestText: string;
  submissionDate?: number;
  reviewDate?: number;
  reviewNotes?: string;
}

const defaultVerificationData: VerificationData = {
  businessLicense: "",
  taxId: "",
  insurance: "",
  additionalInfo: "",
  uploadedDocs: [],
  steps: {
    basic: false,
    legal: false,
    certifications: false,
    final: false
  },
  isVerified: false,
  requestText: ""
};


const Verification = () => {
  // const { company, updateProfile } = useCompanyAuth(); // Elimina o comenta esta línea
  const [company, setCompany] = useState<any>({ isVerified: false });
  const [verificationData, setVerificationData] = useState<VerificationData>(defaultVerificationData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: {progress: number, uploading: boolean}}>({});
  
  // Cargar datos de verificación de Firestore
  useEffect(() => {
    const fetchVerification = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "verificaciones", companyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<VerificationData>;
          setVerificationData({
            ...defaultVerificationData,
            ...data,
            steps: { ...defaultVerificationData.steps, ...(data.steps || {}) },
            uploadedDocs: (data.uploadedDocs as DocumentFile[]) || []
          });
          setCompany({ isVerified: !!data.isVerified });
        } else {
          // Crear documento vacío para este companyId si no existe
          await setDoc(docRef, defaultVerificationData);
          setVerificationData(defaultVerificationData);
          setCompany({ isVerified: false });
        }
      } catch (e) {
        console.error("Error cargando verificación:", e);
        toast({ title: "Error", description: "No se pudo cargar la verificación", variant: "destructive" });
      } finally {
        setLoading(false);
      }

    };
    fetchVerification();
  }, []);




  // Documentos requeridos y su estado - Solo RUT obligatorio
  const requiredDocuments = [
    {
      key: "businessLicense",
      name: "Licencia Comercial",
      description: "Documento oficial de registro de la empresa",
      required: false,
      uploaded: verificationData.uploadedDocs.some(doc => doc.docType === "businessLicense")
    },
    {
      key: "taxId",
      name: "RUT / Número de Identificación Fiscal",
      description: "RUT de la empresa",
      required: true,
      uploaded: verificationData.uploadedDocs.some(doc => doc.docType === "taxId")
    },
    {
      key: "insurance",
      name: "Seguro de Responsabilidad Civil",
      description: "Póliza de seguro vigente",
      required: false,
      uploaded: verificationData.uploadedDocs.some(doc => doc.docType === "insurance")
    },
    {
      key: "certifications",
      name: "Certificados Profesionales",
      description: "Certificaciones y licencias del sector",
      required: false,
      uploaded: verificationData.uploadedDocs.some(doc => doc.docType === "certification")
    },
    {
      key: "references",
      name: "Referencias Comerciales",
      description: "Cartas de recomendación y referencias de clientes",
      required: false,
      uploaded: verificationData.uploadedDocs.some(doc => doc.docType === "references")
    }
  ];

  // El paso de información básica ha sido eliminado

  // Validar documentos legales - Solo se requiere el RUT
  const requiredDocsComplete = verificationData.uploadedDocs.some(doc => doc.docType === "taxId");
  const certificationsComplete = verificationData.uploadedDocs.some(doc => doc.docType === "certification");

  // Solo pasos de documentación y verificación final
  const verificationSteps = [
    {
      id: "legal",
      title: "Documentos Legales",
      description: "Licencia comercial y documentos fiscales",
      icon: FileText,
      status: requiredDocsComplete ? "completed" : "pending"
    },
    {
      id: "certifications",
      title: "Certificaciones",
      description: "Certificaciones profesionales (opcional)",
      icon: Award,
      status: requiredDocsComplete ? (certificationsComplete ? "completed" : "pending") : "locked"
    },
    {
      id: "final",
      title: "Verificación Final",
      description: "Revisión y aprobación",
      icon: ShieldCheck,
      status: requiredDocsComplete ? (company?.isVerified ? "completed" : "pending") : "locked"
    }
  ];

  const completedSteps = verificationSteps.filter(step => step.status === "completed").length;
  const progress = (completedSteps / verificationSteps.length) * 100;

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Insignia de Verificación",
      description: "Muestra tu estado verificado a los clientes"
    },
    {
      icon: Award,
      title: "Mayor Credibilidad",
      description: "Los clientes confían más en empresas verificadas"
    },
    {
      icon: Building2,
      title: "Más Oportunidades",
      description: "Acceso prioritario a proyectos premium"
    }
  ];


  // Subida de archivos a Firebase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Si es documento requerido, solo permitir un archivo
    if (docType !== "certification" && 
        verificationData.uploadedDocs.some(doc => doc.docType === docType)) {
      toast({
        title: "Error",
        description: `Ya existe un documento de tipo ${docType}. Elimínalo antes de subir uno nuevo.`,
        variant: "destructive"
      });
      return;
    }

    // Procesamos cada archivo
    Array.from(files).forEach(async (file) => {
      // Crear ID único para el archivo
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Actualizar estado para mostrar progreso
      setUploadingFiles(prev => ({
        ...prev,
        [fileId]: { progress: 0, uploading: true }
      }));
      
      // Crear referencia en Firebase Storage
      const fileExtension = file.name.split('.').pop();
      const storageRef = ref(storage, `verification/${companyId}/${docType}/${fileId}.${fileExtension}`);
      
      try {
        // Iniciar la subida
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Monitorear progreso
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadingFiles(prev => ({
              ...prev,
              [fileId]: { progress, uploading: true }
            }));
          },
          (error) => {
            console.error("Error subiendo archivo:", error);
            setUploadingFiles(prev => {
              const newState = {...prev};
              delete newState[fileId];
              return newState;
            });
            toast({
              title: "Error",
              description: "No se pudo subir el archivo. Inténtalo nuevamente.",
              variant: "destructive"
            });
          },
          async () => {
            // Subida completada exitosamente
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Crear objeto del documento
            const newDoc: DocumentFile = {
              id: fileId,
              name: file.name,
              originalName: file.name,
              type: file.type,
              url: downloadURL,
              path: `verification/${companyId}/${docType}/${fileId}.${fileExtension}`,
              uploadedAt: Date.now(),
              docType
            };
            
            // Actualizar estado
            const updatedDocs = [...verificationData.uploadedDocs, newDoc];
            await saveVerification({ uploadedDocs: updatedDocs });
            
            // Limpiar estado de carga
            setUploadingFiles(prev => {
              const newState = {...prev};
              delete newState[fileId];
              return newState;
            });
            
            toast({
              title: "Archivo subido",
              description: `${file.name} fue subido exitosamente`,
            });
          }
        );
      } catch (e) {
        console.error("Error iniciando subida:", e);
        setUploadingFiles(prev => {
          const newState = {...prev};
          delete newState[fileId];
          return newState;
        });
        toast({
          title: "Error",
          description: "No se pudo iniciar la subida del archivo",
          variant: "destructive"
        });
      }
    });
  };

  // Eliminar documento de Storage y Firestore
  const removeDocument = async (docFile: DocumentFile) => {
    try {
      // Eliminar de Storage
      const fileRef = ref(storage, docFile.path);
      await deleteObject(fileRef);
      
      // Actualizar Firestore
      const updatedDocs = verificationData.uploadedDocs.filter(doc => doc.id !== docFile.id);
      await saveVerification({ uploadedDocs: updatedDocs });
      
      toast({
        title: "Documento eliminado",
        description: `${docFile.name} fue eliminado exitosamente`,
      });
    } catch (e) {
      console.error("Error eliminando documento:", e);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento. Inténtalo nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Guardar cambios en Firestore
  const saveVerification = async (changes: Partial<VerificationData>) => {
    setSaving(true);
    try {
      const docRef = doc(db, "verificaciones", companyId);
      const newData = { ...verificationData, ...changes };
      await setDoc(docRef, newData, { merge: true });
      setVerificationData(prev => ({ ...prev, ...changes }));
    } catch (e) {
      console.error("Error guardando verificación:", e);
      toast({ title: "Error", description: "No se pudo guardar los cambios", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };



  // (El paso de información básica ha sido eliminado)



  // Enviar solicitud de verificación final (solo requiere RUT)
  const handleSubmitVerification = async () => {
    // Verificar que el RUT esté cargado
    if (!verificationData.uploadedDocs.some(doc => doc.docType === "taxId")) {
      toast({
        title: "Error",
        description: "Debes subir el documento RUT antes de solicitar la verificación.",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar que se haya ingresado el número de RUT
    if (!verificationData.taxId) {
      toast({
        title: "Error",
        description: "Debes ingresar el número de RUT antes de solicitar la verificación.",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar que haya un texto de solicitud
    if (!verificationData.requestText || verificationData.requestText.length < 20) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un texto de solicitud más detallado (mínimo 20 caracteres).",
        variant: "destructive"
      });
      return;
    }
    
    // En un entorno real, esto cambiaría el estado a "pendiente de revisión"
    // y un administrador tendría que aprobar la solicitud
    await saveVerification({ 
      submissionDate: Date.now(),
      steps: {
        ...verificationData.steps,
        legal: true,
        certifications: certificationsComplete,
        final: true
      }
    });
    
    // En un entorno de producción real, esto se eliminaría
    // y el estado de verificación lo cambiaría un administrador
    setTimeout(async () => {
      await saveVerification({ 
        isVerified: true,
        reviewDate: Date.now(),
        reviewNotes: "Verificación aprobada automáticamente. En producción, esto lo haría un administrador."
      });
      setCompany({ isVerified: true });
      toast({
        title: "¡Verificación Aprobada!",
        description: "Tu empresa ha sido verificada exitosamente.",
      });
    }, 2000); // Simulamos un pequeño retraso
    
    toast({
      title: "Solicitud Enviada",
      description: "Tu solicitud de verificación está siendo procesada.",
    });
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "locked":
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case "locked":
        return <Badge variant="secondary">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">No iniciado</Badge>;
    }
  };


  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900">Verificación de Empresa</h1>
          <p className="text-gray-600">Verifica tu empresa para ganar credibilidad y confianza</p>
        </div>
        {company?.isVerified ? (
          <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2 flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5" />
            Empresa Verificada
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2 flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Verificación Pendiente
          </Badge>
        )}
      </div>

      {company?.isVerified ? (
        <Alert className="rounded-lg shadow-md">
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            ¡Felicitaciones! Tu empresa ya está verificada. Los clientes pueden ver tu insignia de verificación.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="rounded-lg shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            La verificación de tu empresa aumentará tu credibilidad y te dará acceso a más oportunidades de negocio.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Steps - Responsive */}
      <Card className="glass-effect shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Verificación de Empresa</CardTitle>
          <CardDescription>
            Completa los siguientes pasos para verificar tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Paso 1: Documentos legales (RUT) */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">Documento RUT</h3>
                  <div className="flex items-center space-x-2">
                    {requiredDocsComplete ? 
                      <CheckCircle className="h-5 w-5 text-green-500" /> : 
                      <Clock className="h-5 w-5 text-yellow-500" />
                    }
                    {requiredDocsComplete ? 
                      <Badge className="bg-green-100 text-green-800">Completado</Badge> :
                      <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                    }
                  </div>
                </div>
                <p className="text-sm text-gray-600">Sube el RUT de tu empresa para verificación</p>
              </div>
            </div>

            {/* Paso 2: Certificaciones (opcional) */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">Certificaciones</h3>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-sm text-gray-600">Puedes subir certificaciones adicionales si las tienes</p>
              </div>
            </div>

            {/* Paso 3: Referencias Comerciales (opcional) */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900">Referencias Comerciales</h3>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <p className="text-sm text-gray-600">Cartas de recomendación y referencias de clientes</p>
              </div>
            </div>

            {/* Enviar solicitud */}
            {!company?.isVerified && requiredDocsComplete && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSubmitVerification} disabled={saving || !verificationData.taxId} className="bg-primary text-white hover:bg-primary-dark">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Enviar Solicitud de Verificación
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulario de verificación solo si no está verificada */}
      {!company?.isVerified && (
        <>
          {/* Document Upload */}
          <Card className="glass-effect shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Subir Documentos</CardTitle>
              <CardDescription>
                Sube los documentos requeridos para la verificación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Información importante */}
              <Alert className="mb-6 rounded-lg shadow-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Para la verificación de tu empresa, solo se requiere el documento RUT. Las certificaciones y referencias comerciales son opcionales.
                </AlertDescription>
              </Alert>

              {/* File Upload Sections - Responsive */}
              <div className="space-y-6">
                <h3 className="font-semibold text-gray-900">Documentos:</h3>
                
                {/* Documento: RUT - ÚNICO REQUERIDO */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-blue-50/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">RUT / Número de Identificación Fiscal</h4>
                      <p className="text-sm text-gray-600">RUT de la empresa</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  </div>
                  
                  {verificationData.uploadedDocs.some(doc => doc.docType === "taxId") ? (
                    <div className="bg-green-50 rounded-lg p-4">
                      {verificationData.uploadedDocs
                        .filter(doc => doc.docType === "taxId")
                        .map(doc => (
                          <div key={doc.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{doc.originalName}</span>
                                <p className="text-xs text-gray-500">Subido el {new Date(doc.uploadedAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.url, "_blank")}>
                                Ver
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => removeDocument(doc)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="p-2 bg-blue-50 rounded-full w-fit mx-auto mb-2">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "taxId")}
                          className="hidden"
                        />
                        <Button className="mb-2 company-card text-white">
                          <FileText className="mr-2 h-4 w-4" />
                          Subir RUT
                        </Button>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Formatos aceptados: PDF, JPG, PNG
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Certificaciones (Opcional) */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Certificaciones Profesionales</h4>
                      <p className="text-sm text-gray-600">Certificaciones y licencias del sector</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  
                  {verificationData.uploadedDocs.some(doc => doc.docType === "certification") && (
                    <div className="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
                      {verificationData.uploadedDocs
                        .filter(doc => doc.docType === "certification")
                        .map(doc => (
                          <div key={doc.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{doc.originalName}</span>
                                <p className="text-xs text-gray-500">Subido el {new Date(doc.uploadedAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.url, "_blank")}>
                                Ver
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => removeDocument(doc)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="p-2 bg-blue-50 rounded-full w-fit mx-auto mb-2">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "certification")}
                        className="hidden"
                      />
                      <Button className="mb-2 company-card text-white">
                        <FileText className="mr-2 h-4 w-4" />
                        Subir Certificaciones
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Puedes subir múltiples certificaciones. Formatos aceptados: PDF, JPG, PNG
                    </p>
                  </div>
                </div>
                
                {/* Referencias Comerciales (Opcional) */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Referencias Comerciales</h4>
                      <p className="text-sm text-gray-600">Cartas de recomendación y referencias de clientes</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  
                  {verificationData.uploadedDocs.some(doc => doc.docType === "references") && (
                    <div className="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
                      {verificationData.uploadedDocs
                        .filter(doc => doc.docType === "references")
                        .map(doc => (
                          <div key={doc.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{doc.originalName}</span>
                                <p className="text-xs text-gray-500">Subido el {new Date(doc.uploadedAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => window.open(doc.url, "_blank")}>
                                Ver
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => removeDocument(doc)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="p-2 bg-blue-50 rounded-full w-fit mx-auto mb-2">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, "references")}
                        className="hidden"
                      />
                      <Button className="mb-2 company-card text-white">
                        <FileText className="mr-2 h-4 w-4" />
                        Subir Referencias
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Puedes subir múltiples cartas de recomendación. Formatos aceptados: PDF, JPG, PNG
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Loading Indicators for File Uploads */}
              {Object.keys(uploadingFiles).length > 0 && (
                <div className="mt-6 border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-gray-900 mb-3">Archivos en proceso de subida:</h4>
                  <div className="space-y-3">
                    {Object.entries(uploadingFiles).map(([id, { progress }]) => (
                      <div key={id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Subiendo archivo...</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information Card - Simplified */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-xl">Información Adicional</CardTitle>
                  <CardDescription>
                    Proporciona detalles adicionales para facilitar la verificación
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Número de RUT</Label>
                    <Input
                      id="taxId"
                      placeholder="76.123.456-7"
                      value={verificationData.taxId}
                      onChange={e => {
                        setVerificationData(prev => ({ ...prev, taxId: e.target.value }));
                        saveVerification({ taxId: e.target.value });
                      }}
                    />
                    <p className="text-xs text-gray-500">Ingresa el RUT de tu empresa sin puntos ni guiones</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Información Adicional (Opcional)</Label>
                    <Textarea
                      id="additionalInfo"
                      placeholder="Proporciona cualquier información adicional sobre tu empresa..."
                      rows={3}
                      value={verificationData.additionalInfo}
                      onChange={e => {
                        setVerificationData(prev => ({ ...prev, additionalInfo: e.target.value }));
                        saveVerification({ additionalInfo: e.target.value });
                      }}
                    />
                  </div>
                  
                  {/* Texto de Solicitud */}
                  <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="requestText" className="text-base font-medium">
                      Texto de Solicitud de Verificación
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Explica brevemente por qué solicitas la verificación y cualquier detalle relevante sobre tu empresa
                    </p>
                    <Textarea
                      id="requestText"
                      placeholder="Somos una empresa especializada en... Solicitamos la verificación para poder..."
                      rows={5}
                      value={verificationData.requestText}
                      onChange={e => {
                        setVerificationData(prev => ({ ...prev, requestText: e.target.value }));
                        saveVerification({ requestText: e.target.value });
                      }}
                      className="min-h-[120px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Final Submission Section */}
              <Card className="mt-6 border-primary/20">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-xl">Enviar Solicitud de Verificación</CardTitle>
                  <CardDescription>
                    Una vez que hayas subido todos los documentos requeridos, podrás enviar tu solicitud
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Requirements Checklist - Simplified */}
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-gray-900">Requisitos para enviar la solicitud:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center space-x-2">
                          {verificationData.uploadedDocs.some(doc => doc.docType === "taxId") ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : 
                            <Clock className="h-4 w-4 text-gray-400" />
                          }
                          <span className={`text-sm ${verificationData.uploadedDocs.some(doc => doc.docType === "taxId") ? 'text-green-600' : 'text-gray-600'}`}>
                            Documento RUT / Identificación Fiscal
                          </span>
                        </li>
                        <li className="flex items-center space-x-2">
                          {!!verificationData.taxId ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : 
                            <Clock className="h-4 w-4 text-gray-400" />
                          }
                          <span className={`text-sm ${!!verificationData.taxId ? 'text-green-600' : 'text-gray-600'}`}>
                            Número de RUT
                          </span>
                        </li>
                        <li className="flex items-center space-x-2">
                          {!!verificationData.requestText ? 
                            <CheckCircle className="h-4 w-4 text-green-500" /> : 
                            <Clock className="h-4 w-4 text-gray-400" />
                          }
                          <span className={`text-sm ${!!verificationData.requestText ? 'text-green-600' : 'text-gray-600'}`}>
                            Texto de solicitud de verificación
                          </span>
                        </li>
                      </ul>
                    </div>
                    
                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitVerification}
                        className="company-card text-white"
                        disabled={
                          saving || 
                          !requiredDocsComplete || 
                          !verificationData.taxId || 
                          !verificationData.requestText || 
                          verificationData.requestText.length < 20 ||
                          Object.keys(uploadingFiles).length > 0
                        }
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Enviar Solicitud de Verificación
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Verification;