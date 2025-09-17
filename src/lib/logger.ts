/**
 * Utility para manejo de logs condicionalmente basado en el entorno
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // Log normal para development, silenciado en production
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // Info para development, silenciado en production
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  // Warnings siempre se muestran pero con prefijo en development
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[DEV]', ...args);
    } else {
      console.warn(...args);
    }
  },

  // Errores siempre se muestran
  error: (...args: any[]) => {
    console.error(...args);
  },

  // Debug específico para desarrollo con prefijo
  debug: (component: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG:${component}]`, ...args);
    }
  }
};