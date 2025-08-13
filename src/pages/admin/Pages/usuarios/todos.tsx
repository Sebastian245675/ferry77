// src/pages/admin/usuarios/Todos.tsx
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/pages/admin/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Trash2, Info, Filter } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function TodosUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [rolFiltro, setRolFiltro] = useState("todos");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [alerta, setAlerta] = useState("");

  useEffect(() => {
    const fetchUsuarios = async () => {
      const snap = await getDocs(collection(db, "users"));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsuarios(lista);
    };
    fetchUsuarios();
  }, []);

  const eliminarUsuario = async (id: string) => {
    await deleteDoc(doc(db, "users", id));
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    setAlerta("Usuario eliminado correctamente");
    setTimeout(() => setAlerta(""), 3000);
  };

  const usuariosFiltrados =
    rolFiltro === "todos"
      ? usuarios
      : usuarios.filter((u) => u.rol === rolFiltro);

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lista de usuarias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select
                onValueChange={(value) => setRolFiltro(value)}
                defaultValue="todos"
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="usuario">Normal</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="repartidor">Repartidor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              {usuariosFiltrados.map((usuario) => (
                <Card key={usuario.id} className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3">
                    {/* Nombre y rol */}
                    <div className="mb-2 sm:mb-0">
                    <h3 className="text-base font-semibold text-gray-800">
                        {usuario.name}
                    </h3>
                    <p className="text-sm text-gray-500">{usuario.rol}</p>
                    <p className="text-sm text-gray-500">{ usuario.companyName || usuario.nick}</p>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsuarioSeleccionado(usuario)}
                          >
                            <Info className="w-4 h-4 mr-1" />
                            Info
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[80vw] max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Información del usuario</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            {Object.entries(usuarioSeleccionado || {}).map(
                              ([key, value]) => (
                                <div key={key}>
                                  <p className="text-xs font-semibold text-gray-500 uppercase">
                                    {key}
                                  </p>
                                  <p className="text-sm text-gray-800">
                                    {String(value)}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>¿Estás segura?</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                              Esta acción eliminará a <strong>{usuario.nombre}</strong> de forma permanente.
                            </p>
                            <Button
                              variant="destructive"
                              onClick={() => eliminarUsuario(usuario.id)}
                            >
                              Confirmar eliminación
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {alerta && (
              <Alert className="mt-6">
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{alerta}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
