import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase"; 
import { ADMIN_EMAIL } from "@/pages/admin/config/adminConfig";

import { useState, useEffect } from "react";
import { getThemePreference } from "@/theme-utils";

export const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const [themeClass, setThemeClass] = useState(getThemePreference());
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeClass(getThemePreference());
    };
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  if (loading) {
    return (
      <div>
        <span
          className={`ml-4 text-lg font-medium ${
            themeClass === "dark" ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Cargando sesión...
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;

  return children;
};
