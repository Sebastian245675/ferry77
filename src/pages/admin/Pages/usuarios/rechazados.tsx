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
import { CheckCircle, XCircle, Clock } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function RechazadosUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [aceptados, setAceptados] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [rechazados, setRechazados] = useState([]);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const aceptados = lista.filter(
        (u) =>
          u.status?.toLowerCase().trim() === "aceptado" &&
          u.rol === "usuario"
      );
      const pendientes = lista.filter(
        (u) => u.status?.toLowerCase().trim() === "pendiente"
      );
      const rechazados = lista.filter(
        (u) => u.status?.toLowerCase().trim() === "rechazado"
      );

      setUsuarios(lista);
      setAceptados(aceptados);
      setPendientes(pendientes);
      setRechazados(rechazados);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      const ref = doc(db, "users", id);
      await updateDoc(ref, { status: nuevoEstado });
      setRechazados((prev) => prev.filter((u) => u.id !== id));
      fetchUsuarios();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-6">
        {/* Cards resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <CardTitle>Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {aceptados.length}
              </p>
            </CardContent>
          </Card>

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

        {/* Lista de usuarios rechazados */}
        <Card>
          <CardHeader className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <CardTitle>Usuarios rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {rechazados.map((usuario) => (
                <Card key={usuario.id} className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3">
                    <div className="mb-2 sm:mb-0">
                      <h3 className="text-base font-semibold text-gray-800">
                        {usuario.name}
                      </h3>
                      <p className="text-sm text-gray-500">{usuario.rol}</p>
                      <p className="text-sm text-gray-500">
                        {usuario.companyName || usuario.nick}
                      </p>
                    </div>

                    <Select
                      onValueChange={(value) =>
                        cambiarEstado(usuario.id, value)
                      }
                      defaultValue="rechazado"
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aceptado">Aceptado</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
