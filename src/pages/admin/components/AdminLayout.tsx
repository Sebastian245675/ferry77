// src/components/AdminLayout.tsx
import React, { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  User,
  UserCheck,
  Clock,
  UserX,
  Building2,
  Truck,
  Inbox,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon?: React.ComponentType<any>;
  label: string;
}) => {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center gap-3 px-2 py-2 rounded-md transition ${
            isActive ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
          }`
        }
      >
        {Icon && <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />}
        <span className="text-sm">{label}</span>
      </NavLink>
    </li>
  );
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        {/* Logo y usuario */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow">
              F
            </div>
            <div>
              <h1 className="text-sm font-semibold">Ferry</h1>
              <p className="text-xs text-gray-500">Tu eres el administrador</p>
            </div>
          </div>

          {/* "Todos los usuarios" - opción destacada debajo */}
          <div className="mt-4">
            <NavLink
              to="/admin/usuarios/todos"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <Home className="w-4 h-4" />
              <span>Todos los usuarios</span>
            </NavLink>
            <NavLink
              to="/admin/usuarios/solicitudes"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`
              }
            >
              <Inbox className="w-4 h-4" />
              <span>Todas las solicitudes</span>
            </NavLink>

          </div>
        </div>

        {/* Scroll interno */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Bloque: Usuarios */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Usuarios</h2>
            <ul className="space-y-1">
              <NavItem to="/admin/usuarios/activos" icon={UserCheck} label="Activos" />
              <NavItem to="/admin/usuarios/verificar" icon={Clock} label="Por verificar" />
              <NavItem to="/admin/usuarios/rechazados" icon={UserX} label="Rechazados" />
            </ul>
          </div>

          <hr className="border-t border-gray-200 my-2" />

          {/* Bloque: Empresas */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Empresas</h2>
            <ul className="space-y-1">
              <NavItem to="/admin/empresas/activas" icon={Building2} label="Activas" />
              <NavItem to="/admin/empresas/verificar" icon={Clock} label="Por verificar" />
              <NavItem to="/admin/empresas/rechazadas" icon={UserX} label="Rechazadas" />
            </ul>
          </div>

          <hr className="border-t border-gray-200 my-2" />

          {/* Bloque: Repartidores */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Repartidores</h2>
            <ul className="space-y-1">
              <NavItem to="/admin/repartidores/activos" icon={Truck} label="Activos" />
              <NavItem to="/admin/repartidores/verificar" icon={Clock} label="Por verificar" />
              <NavItem to="/admin/repartidores/rechazados" icon={UserX} label="Rechazados" />
            </ul>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
