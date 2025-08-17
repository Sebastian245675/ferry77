import React, { useState } from "react";

export default function UbicacionButton({ onDireccionObtenida }: { onDireccionObtenida: (direccion: string) => void }) {
  const [cargando, setCargando] = useState(false);

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setCargando(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const data = await resp.json();
          onDireccionObtenida(data.display_name || "No se pudo obtener la dirección");
        } catch {
          alert("Error al obtener la dirección");
        } finally {
          setCargando(false);
        }
      },
      (err) => {
        alert("Error al obtener ubicación: " + err.message);
        setCargando(false);
      }
    );
  };

  return (
    <button
      type="button"
      onClick={obtenerUbicacion}
      disabled={cargando}
      style={{
        padding: "10px 16px",
        backgroundColor: "#0077ff",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: cargando ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px"
      }}
    >
      {cargando ? (
        <span className="spinner" style={{
          width: "16px",
          height: "16px",
          border: "2px solid rgba(255, 255, 255, 0.5)",
          borderTop: "2px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></span>
      ) : (
        "📍 Usar mi ubicación"
      )}
    </button>
  );
}
