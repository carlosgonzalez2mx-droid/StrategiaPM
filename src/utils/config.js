/**
 * Obtiene la URL base de la aplicación según el ambiente
 */
export function getAppBaseUrl() {
  // 1. Intentar obtener de variable de entorno
  const envUrl = import.meta.env?.VITE_BASE_URL || process.env.REACT_APP_BASE_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // 2. Detectar automáticamente según el hostname
  const hostname = window.location.hostname;
  
  // Si estamos en localhost o 127.0.0.1 → desarrollo
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:${window.location.port || 3000}`;
  }
  
  // Si estamos en Vercel o cualquier dominio real → usar origin
  return window.location.origin;
}

/**
 * Genera URL completa con path
 */
export function getAppUrl(path = '') {
  const baseUrl = getAppBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
