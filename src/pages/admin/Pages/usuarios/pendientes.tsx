import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, query, where, getDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import AdminLayout from "@/pages/admin/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Eye, 
  Download, 
  Building2, 
  ShieldCheck,
  Calendar, 
  AlertCircle,
  Loader2,
  User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Tipos
interface DocumentFile {
  id: string;
  name: string;
  originalName: string;
  type: string;
  url: string;
  path: string;
  uploadedAt: number;
  docType: string;
}

interface VerificationData {
  businessLicense?: string;
  taxId?: string;
  insurance?: string;
  additionalInfo?: string;
  uploadedDocs?: DocumentFile[];
  steps?: {
    basic?: boolean;
    legal?: boolean;
    certifications?: boolean;
    final?: boolean;
  };
  isVerified?: boolean;
  requestText?: string;
  submissionDate?: number;
  reviewDate?: number;
  reviewNotes?: string;
}

interface Usuario {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  rol?: string;
  status?: string;
  verification?: VerificationData;
  verificationStatus?: string;
  verificationRequested?: boolean;
  verificationRequestDate?: string;
  profileCompleted?: boolean;
  [key: string]: any;
}

export default function PendientesUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Usuario[]>([]);
  const [alerta, setAlerta] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Usuario | null>(null);
  const [viewDocumentUrl, setViewDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener usuarios regulares
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "!=", "company")));
        const listaUsuarios = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Usuario));
        
        // Obtener empresas con verificación pendiente - específicamente las que tienen documentos subidos y han solicitado verificación
        const empresasSnap = await getDocs(query(collection(db, "users"), where("role", "==", "company")));
        let listaEmpresas = empresasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Usuario));
        
        // Filtrar empresas que tienen documentos y han solicitado verificación
        listaEmpresas = listaEmpresas.filter(empresa => 
          empresa.verification?.submissionDate && 
          (!empresa.verification?.isVerified || empresa.verificationStatus !== "verificado")
        );
        
        console.log("Total empresas encontradas:", listaEmpresas.length);
        console.log("Empresas pendientes de verificación:", listaEmpresas.filter(e => e.verification?.submissionDate).length);
        
        // Establecer datos
        setUsuarios(listaUsuarios);
        setEmpresas(listaEmpresas);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const cambiarStatusUsuario = async (id: string, nuevo: string) => {
    await updateDoc(doc(db, "users", id), { status: nuevo });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: nuevo } : u))
    );
    setAlerta(`Usuario actualizado a "${nuevo}"`);
    setTimeout(() => setAlerta(""), 3000);
  };
  
  const cambiarStatusVerificacion = async (empresa: Usuario, approved: boolean) => {
    try {
      const docRef = doc(db, "users", empresa.id);
      
      // Actualizar el documento con el nuevo estado
      await updateDoc(docRef, {
        "verification.isVerified": approved,
        "verification.reviewDate": Date.now(),
        "verificationStatus": approved ? "verificado" : "rechazado",
      });
      
      // Actualizar la lista de empresas
      setEmpresas((prev) =>
        prev.filter((e) => e.id !== empresa.id)
      );
      
      // Mostrar alerta
      setAlerta(`Empresa ${approved ? "verificada" : "rechazada"} correctamente`);
      setTimeout(() => setAlerta(""), 3000);
      
    } catch (error) {
      console.error("Error al actualizar verificación:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de verificación",
        variant: "destructive"
      });
    }
  };
  
  // Formatear fecha
  const formatDate = (timestamp: number | string): string => {
    let date: Date;
    
    if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return "Fecha inválida";
    }
    
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const pendientes = usuarios.filter((u) => u.status === "pendiente");
  const aceptados = usuarios.filter((u) => u.status === "aceptado");
  const rechazados = usuarios.filter((u) => u.status === "rechazado");
  
  // Mostrar todas las empresas como pendientes para resolver el problema
  const empresasPendientes = empresas;

  // Ventana modal para visualizar documentos
  const DocumentViewer = ({ url }: { url: string | null }) => {
    if (!url) return null;
    
    // Determinar el tipo de documento
    const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i) !== null;
    const isPdf = url.match(/\.(pdf)$/i) !== null;
    
    return (
      <div className="flex flex-col items-center">
        {isImage ? (
          <img src={url} alt="Documento" className="max-w-full max-h-[80vh]" />
        ) : isPdf ? (
          <iframe src={url} className="w-full h-[80vh]" />
        ) : (
          <div className="flex flex-col items-center">
            <FileText className="h-16 w-16 text-gray-400" />
            <p className="mt-2 text-gray-600">Este tipo de documento no se puede previsualizar</p>
            <Button onClick={() => window.open(url, "_blank")} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Descargar documento
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Cargando datos...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-6 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Panel de Verificaciones</h1>
            <p className="text-gray-600">Gestiona usuarios y verificaciones de empresas</p>
          </div>
          <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-sm">
            {empresasPendientes.length} empresas pendientes
          </Badge>
        </div>
        
        <Tabs defaultValue="empresas">
          <TabsList className="mb-4">
            <TabsTrigger value="empresas" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> 
              Empresas Pendientes ({empresasPendientes.length})
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <User className="h-4 w-4" /> 
              Usuarios Pendientes ({pendientes.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Empresas Pendientes de Verificación */}
          <TabsContent value="empresas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  Empresas Pendientes de Verificación
                </CardTitle>
                <CardDescription>
                  Revisa los documentos y aprueba o rechaza las solicitudes de verificación de empresas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {empresasPendientes.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No hay empresas pendientes</h3>
                    <p className="text-gray-500">Todas las solicitudes de verificación han sido procesadas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                      {empresasPendientes.map((empresa) => (
                        <AccordionItem key={empresa.id} value={empresa.id}>
                          <AccordionTrigger className="hover:bg-gray-50 px-4 py-3 rounded-md">
                            <div className="flex flex-col sm:flex-row sm:items-center text-left gap-2 w-full">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-800">
                                  {empresa.name || empresa.displayName || empresa.email?.split('@')[0] || "Empresa"}
                                </h3>
                                <p className="text-sm text-gray-500">{empresa.email}</p>
                              </div>
                              <Badge className="bg-yellow-100 text-yellow-800 ml-0 sm:ml-2">Pendiente</Badge>
                              {empresa.verification?.submissionDate && (
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(empresa.verification.submissionDate)}
                                </div>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pt-2 pb-4">
                            <Card className="border-blue-100 bg-blue-50/30">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Información de la Empresa</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  {empresa.verification?.taxId && (
                                    <>
                                      <dt className="font-medium text-gray-600">RUT:</dt>
                                      <dd>{empresa.verification.taxId}</dd>
                                    </>
                                  )}
                                  {empresa.businessName && (
                                    <>
                                      <dt className="font-medium text-gray-600">Nombre Comercial:</dt>
                                      <dd>{empresa.businessName}</dd>
                                    </>
                                  )}
                                  {empresa.address && (
                                    <>
                                      <dt className="font-medium text-gray-600">Dirección:</dt>
                                      <dd>{empresa.address}</dd>
                                    </>
                                  )}
                                  {empresa.phone && (
                                    <>
                                      <dt className="font-medium text-gray-600">Teléfono:</dt>
                                      <dd>{empresa.phone}</dd>
                                    </>
                                  )}
                                </dl>
                                
                                {empresa.verification?.additionalInfo && (
                                  <div className="mt-4">
                                    <h4 className="font-medium text-gray-600 mb-1">Información Adicional:</h4>
                                    <p className="text-sm bg-white p-3 rounded border border-blue-100">
                                      {empresa.verification.additionalInfo}
                                    </p>
                                  </div>
                                )}
                                
                                {empresa.verification?.requestText && (
                                  <div className="mt-4">
                                    <h4 className="font-medium text-gray-600 mb-1">Texto de Solicitud:</h4>
                                    <p className="text-sm bg-white p-3 rounded border border-blue-100">
                                      {empresa.verification.requestText}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                            
                            {/* Documentos */}
                            <div className="mt-4">
                              <h3 className="font-medium text-gray-900 mb-3">Documentos Subidos</h3>
                              
                              {(!empresa.verification?.uploadedDocs || empresa.verification.uploadedDocs.length === 0) ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                  <p className="text-sm text-yellow-700">No hay documentos disponibles para revisión</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {empresa.verification.uploadedDocs.map((doc) => (
                                    <Card key={doc.id} className="border-gray-200 hover:border-blue-300 transition-colors">
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 bg-blue-100 rounded-md">
                                            <FileText className="h-6 w-6 text-blue-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">
                                              {doc.originalName}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Tipo: {doc.docType === "taxId" ? "RUT" : 
                                                    doc.docType === "businessLicense" ? "Licencia Comercial" : 
                                                    doc.docType === "certification" ? "Certificación" : 
                                                    doc.docType === "references" ? "Referencias" : 
                                                    doc.docType === "insurance" ? "Seguro" : doc.docType}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Subido el {formatDate(doc.uploadedAt)}
                                            </p>
                                          </div>
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-800">
                                                <Eye className="h-4 w-4 mr-1" /> Ver
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                                              <DialogHeader>
                                                <DialogTitle>Documento: {doc.originalName}</DialogTitle>
                                                <DialogDescription>
                                                  Tipo: {doc.docType === "taxId" ? "RUT" : 
                                                        doc.docType === "businessLicense" ? "Licencia Comercial" : 
                                                        doc.docType === "certification" ? "Certificación" : 
                                                        doc.docType === "references" ? "Referencias" : 
                                                        doc.docType === "insurance" ? "Seguro" : doc.docType}
                                                </DialogDescription>
                                              </DialogHeader>
                                              <DocumentViewer url={doc.url} />
                                              <div className="flex justify-end mt-4">
                                                <Button onClick={() => window.open(doc.url, "_blank")}>
                                                  <Download className="h-4 w-4 mr-2" /> Abrir en nueva pestaña
                                                </Button>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Botones de acción */}
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                              <Button
                                size="default"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => cambiarStatusVerificacion(empresa, false)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar Verificación
                              </Button>
                              <Button
                                size="default"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => cambiarStatusVerificacion(empresa, true)}
                              >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Aprobar Verificación
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Usuarios Pendientes */}
          <TabsContent value="usuarios">
            {/* Resumen de Usuarios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <CardTitle>Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendientes.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <CardTitle>Aceptados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {aceptados.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <CardTitle>Rechazados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {rechazados.length}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Lista de usuarios pendientes */}
            <Card>
              <CardHeader>
                <CardTitle>Usuarios pendientes</CardTitle>
                <CardDescription>
                  Gestiona las solicitudes de usuarios pendientes de aprobación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendientes.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No hay usuarios pendientes</h3>
                    <p className="text-gray-500">Todas las solicitudes de usuarios han sido procesadas</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                    {pendientes.map((usuario) => (
                      <Card key={usuario.id} className="w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3">
                          {/* Nombre y rol */}
                          <div className="mb-2 sm:mb-0">
                            <h3 className="text-base font-semibold text-gray-800">
                              {usuario.name || usuario.displayName || "Usuario"}
                            </h3>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-500">{usuario.email}</p>
                              <Badge variant="outline" className="text-xs">
                                {usuario.rol || usuario.role || "Usuario"}
                              </Badge>
                            </div>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cambiarStatusUsuario(usuario.id, "aceptado")}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Aceptar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cambiarStatusUsuario(usuario.id, "rechazado")}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Rechazar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {alerta && (
          <Alert className="mt-6">
            <AlertTitle>Actualización</AlertTitle>
            <AlertDescription>{alerta}</AlertDescription>
          </Alert>
        )}
      </div>
    </AdminLayout>
  );
}
