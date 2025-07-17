import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/firebase' // Importar Firebase para inicializarlo antes de renderizar la app

createRoot(document.getElementById("root")!).render(<App />);
