import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// import './theme.css' // Comentado: causaba conflictos con el sistema de diseño
// import './dark-mode-overrides.css' // Comentado: causaba conflictos con el sistema de diseño
// import './text-visibility-fix.css' // Comentado: causaba conflictos con el sistema de diseño
import './button-fix.css' // Solución para los botones blancos
import './lib/firebase' // Importar Firebase para inicializarlo antes de renderizar la app
// import { initializeTheme } from './theme-utils' // Comentado: causaba conflictos con el sistema de diseño
// import { enforceTextVisibility } from './text-visibility-enforcer' // Comentado: causaba conflictos con el sistema de diseño

// Inicializar el tema antes de renderizar la aplicación
// initializeTheme(); // Comentado: causaba conflictos con el sistema de diseño

// Forzar la visibilidad del texto
// enforceTextVisibility(); // Comentado: causaba conflictos con el sistema de diseño

createRoot(document.getElementById("root")!).render(<App />);
