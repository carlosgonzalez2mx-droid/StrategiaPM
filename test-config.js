// Script de prueba para verificar la configuración de URL
// Ejecutar en la consola del navegador para verificar

import { getAppBaseUrl, getAppUrl } from './src/utils/config.js';

console.log('=== TEST DE CONFIGURACIÓN DE URL ===');
console.log('URL base detectada:', getAppBaseUrl());
console.log('URL completa para signup:', getAppUrl('/signup?email=test@example.com&invited=true&org=123'));
console.log('Hostname actual:', window.location.hostname);
console.log('Origin actual:', window.location.origin);
console.log('Puerto actual:', window.location.port);

// Verificar variables de entorno
console.log('REACT_APP_BASE_URL:', process.env.REACT_APP_BASE_URL);
console.log('VITE_BASE_URL:', import.meta.env?.VITE_BASE_URL);
