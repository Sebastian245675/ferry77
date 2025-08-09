/**
 * DESACTIVADO: Este archivo contenía correcciones para problemas de visibilidad
 * que causaban conflictos con el sistema de diseño y los botones.
 */

// Función desactivada para permitir que el sistema de diseño funcione correctamente
export function enforceTextVisibility() {
  console.log('Text visibility enforcer está desactivado para evitar conflictos de estilo');
  // No hace nada, para permitir que los estilos originales funcionen
}

// No se registran los event listeners
// if (typeof window !== 'undefined') {
//   window.addEventListener('DOMContentLoaded', enforceTextVisibility);
//   window.addEventListener('load', enforceTextVisibility);
// }
