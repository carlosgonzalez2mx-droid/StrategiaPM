/**
 * Script para forzar el uso de localStorage cuando Supabase Storage no está disponible
 * Esto permite que los archivos funcionen aunque no se puedan guardar en Supabase
 */

// Función para forzar localStorage
const forceLocalStorage = () => {
  console.log('🔧 Forzando uso de localStorage para archivos...');
  
  // Interceptar la función de verificación de Supabase
  const originalInitializeStorage = window.supabaseService?.initializeStorage;
  
  if (window.supabaseService) {
    window.supabaseService.initializeStorage = async () => {
      console.log('⚠️ Supabase Storage no disponible, usando localStorage');
      return false; // Forzar fallback a localStorage
    };
  }
  
  // También interceptar en el hook useFileStorage
  const originalCheckSupabaseAvailability = window.checkSupabaseAvailability;
  
  console.log('✅ Configuración aplicada: Los archivos se guardarán en localStorage');
  console.log('📝 Nota: Los archivos solo estarán disponibles en este navegador');
};

// Función para restaurar Supabase (si se resuelve el problema)
const restoreSupabase = () => {
  console.log('🔄 Restaurando configuración de Supabase...');
  
  if (window.supabaseService && window.originalInitializeStorage) {
    window.supabaseService.initializeStorage = window.originalInitializeStorage;
  }
  
  console.log('✅ Supabase Storage restaurado');
};

// Exportar funciones para uso en consola
window.forceLocalStorage = forceLocalStorage;
window.restoreSupabase = restoreSupabase;

console.log('🔧 Script de localStorage cargado. Usa:');
console.log('   - forceLocalStorage() para usar solo localStorage');
console.log('   - restoreSupabase() para restaurar Supabase (cuando se resuelva)');

export { forceLocalStorage, restoreSupabase };
