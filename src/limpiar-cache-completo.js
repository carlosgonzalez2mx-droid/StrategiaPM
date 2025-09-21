// =====================================================
// SCRIPT PARA LIMPIAR CACHE COMPLETO
// =====================================================
// Ejecutar en la consola del navegador (F12 > Console)

console.log('🧹 LIMPIANDO CACHE COMPLETO...');

// 1. Limpiar localStorage
localStorage.clear();
console.log('✅ localStorage limpio');

// 2. Limpiar sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage limpio');

// 3. Limpiar IndexedDB (si existe)
if (window.indexedDB) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name);
      console.log('✅ IndexedDB eliminado:', db.name);
    });
  });
}

// 4. Limpiar cache del service worker (si existe)
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log('✅ Cache eliminado:', cacheName);
    });
  });
}

// 5. Forzar recarga completa
console.log('🔄 RECARGANDO APLICACIÓN...');
setTimeout(() => {
  window.location.reload(true);
}, 1000);
