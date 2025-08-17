import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/pages/admin/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export default function PendientesUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [alerta, setAlerta] = useState("");

  useEffect(() => {
    const fetchUsuarios = async () => {
      const snap = await getDocs(collection(db, "users"));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsuarios(lista);
    };
    fetchUsuarios();
  }, []);

  const cambiarstatus = async (id: string, nuevo: string) => {
    await updateDoc(doc(db, "users", id), { status: nuevo });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: nuevo } : u))
    );
    setAlerta(`Usuario actualizado a "${nuevo}"`);
    setTimeout(() => setAlerta(""), 3000);
  };

  const pendientes = usuarios.filter((u) => u.status === "pendiente");
  const aceptados = usuarios.filter((u) => u.status === "aceptado");
  const rechazados = usuarios.filter((u) => u.status === "rechazado");

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Lista de pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
              {pendientes.map((usuario) => (
                <Card key={usuario.id} className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3">
                    {/* Nombre y rol */}
                    <div className="mb-2 sm:mb-0">
                      <h3 className="text-base font-semibold text-gray-800">
                        {usuario.name}
                      </h3>
                      <p className="text-sm text-gray-500">{usuario.rol}</p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cambiarstatus(usuario.id, "aceptado")}
                      >
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cambiarstatus(usuario.id, "rechazado")}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {alerta && (
              <Alert className="mt-6">
                <AlertTitle>Actualización</AlertTitle>
                <AlertDescription>{alerta}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
