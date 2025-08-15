import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, XCircle, Clock, CheckCircle, File, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface VerificationRequest {
  id: string;
  companyName: string;
  requestDate: string;
  taxId: string;
  documentUrls: Record<string, string>;
  status: string;
  requestText: string;
}

export default function VerificationAdmin() {
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<VerificationRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  async function fetchVerificationRequests() {
    setLoading(true);
    try {
      // Query for all users with verificationStatus field
      const usersRef = collection(db, "users");
      const pendingQuery = query(usersRef, where("verificationStatus", "==", "pendiente"));
      const approvedQuery = query(usersRef, where("verificationStatus", "==", "aprobado"));
      const rejectedQuery = query(usersRef, where("verificationStatus", "==", "rechazado"));

      // Get pending requests
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingData = await Promise.all(pendingSnapshot.docs.map(async doc => {
        const userData = doc.data();
        // Fetch verification data from user document
        const verificationData = userData.verification || {};
        
        return {
          id: doc.id,
          companyName: userData.companyName || "Empresa sin nombre",
          requestDate: new Date(userData.verificationRequestDate || Date.now()).toLocaleDateString("es-CO"),
          taxId: verificationData.taxId || "No especificado",
          documentUrls: verificationData.uploadedDocs?.reduce((acc: Record<string, string>, doc: any) => {
            acc[doc.docType] = doc.url;
            return acc;
          }, {}) || {},
          status: "pendiente",
          requestText: verificationData.requestText || "No hay texto de solicitud",
        };
      }));
      
      // Get approved requests
      const approvedSnapshot = await getDocs(approvedQuery);
      const approvedData = await Promise.all(approvedSnapshot.docs.map(async doc => {
        const userData = doc.data();
        const verificationData = userData.verification || {};
        
        return {
          id: doc.id,
          companyName: userData.companyName || "Empresa sin nombre",
          requestDate: new Date(userData.verificationRequestDate || Date.now()).toLocaleDateString("es-CO"),
          taxId: verificationData.taxId || "No especificado",
          documentUrls: verificationData.uploadedDocs?.reduce((acc: Record<string, string>, doc: any) => {
            acc[doc.docType] = doc.url;
            return acc;
          }, {}) || {},
          status: "aprobado",
          requestText: verificationData.requestText || "No hay texto de solicitud",
        };
      }));
      
      // Get rejected requests
      const rejectedSnapshot = await getDocs(rejectedQuery);
      const rejectedData = await Promise.all(rejectedSnapshot.docs.map(async doc => {
        const userData = doc.data();
        const verificationData = userData.verification || {};
        
        return {
          id: doc.id,
          companyName: userData.companyName || "Empresa sin nombre",
          requestDate: new Date(userData.verificationRequestDate || Date.now()).toLocaleDateString("es-CO"),
          taxId: verificationData.taxId || "No especificado",
          documentUrls: verificationData.uploadedDocs?.reduce((acc: Record<string, string>, doc: any) => {
            acc[doc.docType] = doc.url;
            return acc;
          }, {}) || {},
          status: "rechazado",
          requestText: verificationData.requestText || "No hay texto de solicitud",
          rejectionReason: verificationData.reviewNotes || "",
        };
      }));

      setPendingRequests(pendingData);
      setApprovedRequests(approvedData);
      setRejectedRequests(rejectedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes de verificación.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  async function approveRequest(id: string) {
    setProcessingId(id);
    try {
      const userRef = doc(db, "users", id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("Usuario no encontrado");
      }
      
      const userData = userDoc.data();
      
      // Update user document with verification status
      await updateDoc(userRef, {
        verificationStatus: "aprobado",
        isVerified: true,
        verificationApprovalDate: new Date().toISOString()
      });
      
      // Update verification data in user document
      if (userData.verification) {
        await updateDoc(userRef, {
          "verification.isVerified": true,
          "verification.reviewDate": Date.now(),
          "verification.steps.final": true
        });
      }
      
      toast({
        title: "Verificación Aprobada",
        description: "La empresa ha sido verificada exitosamente.",
      });
      
      // Refresh the lists
      await fetchVerificationRequests();
    } catch (error) {
      console.error("Error approving verification:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la verificación.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectRequest(id: string) {
    if (!rejectionReason) {
      toast({
        title: "Error",
        description: "Debes proporcionar una razón de rechazo.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingId(id);
    try {
      const userRef = doc(db, "users", id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("Usuario no encontrado");
      }
      
      const userData = userDoc.data();
      
      // Update user document with verification status
      await updateDoc(userRef, {
        verificationStatus: "rechazado",
        isVerified: false,
        verificationRejectionDate: new Date().toISOString(),
        verificationRejectionReason: rejectionReason
      });
      
      // Update verification data in user document
      if (userData.verification) {
        await updateDoc(userRef, {
          "verification.isVerified": false,
          "verification.reviewDate": Date.now(),
          "verification.reviewNotes": rejectionReason
        });
      }
      
      toast({
        title: "Verificación Rechazada",
        description: "La verificación ha sido rechazada.",
      });
      
      // Reset rejection reason
      setRejectionReason("");
      setSelectedRequest(null);
      
      // Refresh the lists
      await fetchVerificationRequests();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la verificación.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  function openRejectionDialog(request: VerificationRequest) {
    setSelectedRequest(request);
  }

  function viewDocument(url: string) {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Error",
        description: "No se encontró el documento solicitado.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Administración de Verificaciones</h1>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="pending" className="relative">
            Pendientes
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {loading ? (
            <div className="flex justify-center p-8">
              <Clock className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">Cargando solicitudes...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <Alert className="bg-gray-50">
              <AlertDescription>
                No hay solicitudes de verificación pendientes.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableCaption>Solicitudes pendientes de verificación</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha de Solicitud</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.companyName}</TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.taxId}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {request.documentUrls?.taxId && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewDocument(request.documentUrls.taxId)}
                          >
                            <File className="h-4 w-4 mr-1" />
                            RUT
                          </Button>
                        )}
                        {request.documentUrls?.businessLicense && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewDocument(request.documentUrls.businessLicense)}
                          >
                            <File className="h-4 w-4 mr-1" />
                            Licencia
                          </Button>
                        )}
                        {request.documentUrls?.insurance && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewDocument(request.documentUrls.insurance)}
                          >
                            <File className="h-4 w-4 mr-1" />
                            Seguro
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processingId === request.id}
                          onClick={() => approveRequest(request.id)}
                        >
                          {processingId === request.id ? (
                            <Clock className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openRejectionDialog(request)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`/empresas/${request.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver perfil
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        
        <TabsContent value="approved">
          {loading ? (
            <div className="flex justify-center p-8">
              <Clock className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">Cargando solicitudes...</span>
            </div>
          ) : approvedRequests.length === 0 ? (
            <Alert className="bg-gray-50">
              <AlertDescription>
                No hay solicitudes aprobadas.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableCaption>Solicitudes de verificación aprobadas</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha de Solicitud</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.companyName}
                      <Badge className="ml-2 bg-green-500">Verificada</Badge>
                    </TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.taxId}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/empresas/${request.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver perfil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        
        <TabsContent value="rejected">
          {loading ? (
            <div className="flex justify-center p-8">
              <Clock className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">Cargando solicitudes...</span>
            </div>
          ) : rejectedRequests.length === 0 ? (
            <Alert className="bg-gray-50">
              <AlertDescription>
                No hay solicitudes rechazadas.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableCaption>Solicitudes de verificación rechazadas</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha de Solicitud</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Motivo de rechazo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.companyName}
                      <Badge className="ml-2 bg-red-500">Rechazada</Badge>
                    </TableCell>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell>{request.taxId}</TableCell>
                    <TableCell>
                      {(request as any).rejectionReason || "No especificado"}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/empresas/${request.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver perfil
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Rechazar verificación</CardTitle>
              <CardDescription>
                Por favor, proporciona un motivo para el rechazo de la verificación de {selectedRequest.companyName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Escribe el motivo del rechazo aquí..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Este mensaje será visible para la empresa.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedRequest(null);
                  setRejectionReason("");
                }}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => rejectRequest(selectedRequest.id)}
                disabled={!rejectionReason || processingId === selectedRequest.id}
              >
                {processingId === selectedRequest.id ? (
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Confirmar rechazo
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
