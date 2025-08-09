// Función que aplica el tema oscuro a componentes específicos
const applyDarkModeToComponents = () => {
  // Aplicar a Navbar
  const navbars = document.querySelectorAll('nav, header, .navbar');
  navbars.forEach(navbar => {
    navbar.classList.add('dark-bg-nav');
    (navbar as HTMLElement).style.setProperty('background-color', '#1f2937', 'important');
    (navbar as HTMLElement).style.setProperty('border-color', '#374151', 'important');
  });

  // Aplicar a BottomNavigation
  const bottomNavs = document.querySelectorAll('.fixed.bottom-0');
  bottomNavs.forEach(nav => {
    nav.classList.add('dark-bg-nav');
    (nav as HTMLElement).style.setProperty('background-color', '#1f2937', 'important');
    (nav as HTMLElement).style.setProperty('border-color', '#374151', 'important');
  });

  // Aplicar a cards
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.classList.add('dark-bg-card');
    (card as HTMLElement).style.setProperty('background-color', '#1f2937', 'important');
    (card as HTMLElement).style.setProperty('border-color', '#374151', 'important');
    (card as HTMLElement).style.setProperty('color', '#f3f4f6', 'important');
  });

  // Aplicar a inputs
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.classList.add('dark-input');
    (input as HTMLElement).style.setProperty('background-color', '#374151', 'important');
    (input as HTMLElement).style.setProperty('border-color', '#4b5563', 'important');
    (input as HTMLElement).style.setProperty('color', '#f3f4f6', 'important');
  });
  
  // Aplicar a textos
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, label');
  textElements.forEach(el => {
    if ((el as HTMLElement).style.color === '' || 
        (el as HTMLElement).style.color.includes('rgb(17, 24, 39)') ||
        (el as HTMLElement).style.color.includes('#111827')) {
      (el as HTMLElement).style.setProperty('color', '#f3f4f6', 'important');
    }
  });
};

// Función para aplicar tema oscuro a toda la aplicación
export const applyDarkTheme = () => {
  // Aplicar clases al HTML y body
  document.documentElement.classList.add('dark');
  document.body.classList.add('dark-mode');
  
  // Configurar colores de fondo con !important para sobrescribir estilos en línea
  document.body.style.backgroundColor = '#111827';
  document.body.style.setProperty('background-color', '#111827', 'important');
  document.documentElement.style.setProperty('background-color', '#111827', 'important');
  
  // Aplicar a todos los contenedores principales
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.className = 'dark-theme';
    appRoot.style.setProperty('background-color', '#111827', 'important');
  }
  
  // Aplicar a todos los contenedores de pantalla completa
  const fullScreenContainers = document.querySelectorAll('.min-h-screen');
  fullScreenContainers.forEach(container => {
    container.classList.add('dark-bg');
    (container as HTMLElement).style.setProperty('background-color', '#111827', 'important');
  });
  
  // Aplicar a todos los componentes principales
  applyDarkModeToComponents();
  
  // Guardar en localStorage
  localStorage.setItem('theme', 'dark');
  
  // Disparar evento para notificar cambio de tema
  window.dispatchEvent(new Event('themechange'));
};

// Función que aplica el tema claro a componentes específicos
const applyLightModeToComponents = () => {
  // Restaurar Navbar
  const navbars = document.querySelectorAll('nav, header, .navbar');
  navbars.forEach(navbar => {
    navbar.classList.remove('dark-bg-nav');
    (navbar as HTMLElement).style.removeProperty('background-color');
    (navbar as HTMLElement).style.removeProperty('border-color');
  });

  // Restaurar BottomNavigation
  const bottomNavs = document.querySelectorAll('.fixed.bottom-0');
  bottomNavs.forEach(nav => {
    nav.classList.remove('dark-bg-nav');
    (nav as HTMLElement).style.removeProperty('background-color');
    (nav as HTMLElement).style.removeProperty('border-color');
  });

  // Restaurar cards
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.classList.remove('dark-bg-card');
    (card as HTMLElement).style.removeProperty('background-color');
    (card as HTMLElement).style.removeProperty('border-color');
    (card as HTMLElement).style.removeProperty('color');
  });

  // Restaurar inputs
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.classList.remove('dark-input');
    (input as HTMLElement).style.removeProperty('background-color');
    (input as HTMLElement).style.removeProperty('border-color');
    (input as HTMLElement).style.removeProperty('color');
  });
  
  // Restaurar textos
  const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, label');
  textElements.forEach(el => {
    if ((el as HTMLElement).style.color === '#f3f4f6' || 
        (el as HTMLElement).style.color.includes('rgb(243, 244, 246)')) {
      (el as HTMLElement).style.removeProperty('color');
    }
  });
};

// Función para aplicar tema claro a toda la aplicación
export const applyLightTheme = () => {
  // Quitar clases del HTML y body
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark-mode');
  
  // Configurar colores de fondo con !important para sobrescribir estilos en línea
  document.body.style.backgroundColor = '#f9fafb';
  document.body.style.setProperty('background-color', '#f9fafb', 'important');
  document.documentElement.style.setProperty('background-color', '#f9fafb', 'important');
  
  // Aplicar al contenedor principal
  const appRoot = document.getElementById('root');
  if (appRoot) {
    appRoot.className = 'light-theme';
    appRoot.style.setProperty('background-color', '#f9fafb', 'important');
  }
  
  // Aplicar a todos los contenedores de pantalla completa
  const fullScreenContainers = document.querySelectorAll('.min-h-screen');
  fullScreenContainers.forEach(container => {
    container.classList.remove('dark-bg');
    (container as HTMLElement).style.setProperty('background-color', '#f9fafb', 'important');
  });
  
  // Aplicar a todos los componentes principales
  applyLightModeToComponents();
  
  // Guardar en localStorage
  localStorage.setItem('theme', 'light');
  
  // Disparar evento para notificar cambio de tema
  window.dispatchEvent(new Event('themechange'));
};

// Función para leer la preferencia de tema
export const getThemePreference = (): 'dark' | 'light' => {
  // Revisar localStorage primero
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }
  
  // Si no hay preferencia guardada, usar preferencia del sistema
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  // Por defecto, usar tema claro
  return 'light';
};

// Función para inicializar el tema al cargar la aplicación
export const initializeTheme = () => {
  const themePreference = getThemePreference();
  if (themePreference === 'dark') {
    applyDarkTheme();
  } else {
    applyLightTheme();
  }
};
