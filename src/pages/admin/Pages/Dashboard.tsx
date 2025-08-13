// src/pages/admin/Dashboard.tsx
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "@/pages/admin/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [usuarios, setUsuarios] = useState(0);
  const [empresas, setEmpresas] = useState(0);
  const [normales, setNormales] = useState(0);
  const [repartidores, setRepartidores] = useState(0);
  const [ganancias, setGanancias] = useState([]);

  const añoActual = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      // 🔍 Obtener todos los usuarios
      const userSnap = await getDocs(collection(db, "users"));
      let total = 0,
        emp = 0,
        norm = 0,
        rep = 0;

      userSnap.forEach((doc) => {
        total++;
        const rol = doc.data().rol;
        if (rol === "empresa") emp++;
        else if (rol === "usuario") norm++;
        else if (rol === "repartidor") rep++;
      });

      setUsuarios(total);
      setEmpresas(emp);
      setNormales(norm);
      setRepartidores(rep);

      // 📈 Obtener ganancias del año actual
      const gananciasSnap = await getDocs(collection(db, "ganancias"));
      const datos = gananciasSnap.docs
        .map((doc) => doc.data())
        .filter((item) => item.año === añoActual)
        .map((item) => ({
          name: item.mes,
          ganancias: item.monto,
        }));

      setGanancias(datos);
    };

    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className="mt-6 space-y-6">
        {/* Rectángulo de descripción */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-4 shadow-sm">
          <p className="text-sm text-blue-900 text-center">
            Bienvenido a <strong>Mi Ferretería</strong>, su aliado confiable en
            herramientas, materiales y soluciones para el hogar y la industria.
            Comprometidos con la calidad, el servicio y los mejores precios.
          </p>
        </div>

        {/* Cards estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Usuarios activos</h2>
            <p className="text-2xl font-bold">{usuarios}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Empresas</h2>
            <p className="text-2xl font-bold">{empresas}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Usuarios normales</h2>
            <p className="text-2xl font-bold">{normales}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-sm font-medium text-gray-500">Repartidores</h2>
            <p className="text-2xl font-bold">{repartidores}</p>
          </div>
        </div>

        {/* Gráfica */}
        <Card>
          <CardHeader>
            <CardTitle>Ganancias ({añoActual})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ganancias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="ganancias"
                    stroke="#4f46e5"
                    strokeDasharray="5 5"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
