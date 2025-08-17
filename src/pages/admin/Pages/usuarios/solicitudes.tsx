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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Inbox } from "lucide-react";

export default function SolicitudesUsuarios() {
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const snap = await getDocs(collection(db, "solicitud"));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSolicitudes(lista);
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, "solicitud", id), { status: nuevoEstado });
      fetchSolicitudes();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-6">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-500" />
            <CardTitle>Todas las solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
              {solicitudes.map((solicitud) => (
                <Card key={solicitud.id} className="w-full border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Nombre</p>
                      <p className="text-sm text-gray-800">{solicitud.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Correo</p>
                      <p className="text-sm text-gray-800">{solicitud.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Rol</p>
                      <p className="text-sm text-gray-800">{solicitud.rol}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Estado</p>
                      <Select
                        onValueChange={(value) =>
                          cambiarEstado(solicitud.id, value)
                        }
                        defaultValue={solicitud.status}
                      >
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aceptado">Aceptado</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
