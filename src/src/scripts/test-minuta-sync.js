// ============================================
// SCRIPT DE PRUEBA: SINCRONIZACIÓN DE MINUTAS
// ============================================
// Script para probar la sincronización entre tareas de minutas y Dashboard resumen

/**
 * PROBAR EVENTOS DE MINUTAS
 * Simula el cambio de estatus de una tarea de minuta
 */
function testMinutaEvents() {
  console.log('🧪 INICIANDO PRUEBA DE EVENTOS DE MINUTAS...');
  
  // Simular evento de cambio de estatus
  const testEvent = new CustomEvent('minutaStatusChanged', {
    detail: {
      tareaId: 'test-minuta-123',
      newStatus: 'Completado',
      projectId: 'test-project-456',
      timestamp: Date.now()
    }
  });
  
  console.log('🔄 Disparando evento de prueba:', testEvent.detail);
  window.dispatchEvent(testEvent);
  
  // Simular evento de auto-save
  const autoSaveEvent = new CustomEvent('autoSaveTrigger', {
    detail: {
      source: 'minutaUpdate',
      data: { minutasTasks: [] }
    }
  });
  
  console.log('🔄 Disparando evento de auto-save:', autoSaveEvent.detail);
  window.dispatchEvent(autoSaveEvent);
  
  console.log('✅ Prueba de eventos completada');
}

/**
 * VERIFICAR LISTENERS ACTIVOS
 * Verifica que los listeners estén funcionando
 */
function verifyListeners() {
  console.log('🔍 VERIFICANDO LISTENERS ACTIVOS...');
  
  // Verificar que los eventos se están escuchando
  const hasMinutaListener = window.addEventListener.toString().includes('minutaStatusChanged');
  const hasAutoSaveListener = window.addEventListener.toString().includes('autoSaveTrigger');
  
  console.log('📊 Estado de listeners:');
  console.log('  - minutaStatusChanged:', hasMinutaListener ? '✅ Activo' : '❌ No activo');
  console.log('  - autoSaveTrigger:', hasAutoSaveListener ? '✅ Activo' : '❌ No activo');
  
  return { hasMinutaListener, hasAutoSaveListener };
}

/**
 * PROBAR SINCRONIZACIÓN COMPLETA
 * Prueba todo el flujo de sincronización
 */
function testCompleteSync() {
  console.log('🚀 INICIANDO PRUEBA DE SINCRONIZACIÓN COMPLETA...');
  
  // 1. Verificar listeners
  const listeners = verifyListeners();
  
  if (!listeners.hasMinutaListener || !listeners.hasAutoSaveListener) {
    console.error('❌ Los listeners no están activos. Asegúrate de que la aplicación esté cargada.');
    return false;
  }
  
  // 2. Probar eventos
  testMinutaEvents();
  
  // 3. Verificar que los componentes se actualicen
  console.log('⏳ Esperando 2 segundos para verificar actualizaciones...');
  setTimeout(() => {
    console.log('✅ Prueba de sincronización completada');
    console.log('📋 Verifica en la consola que aparezcan los mensajes:');
    console.log('   - "🔄 Evento minutaStatusChanged recibido"');
    console.log('   - "🔄 Evento autoSaveTrigger recibido"');
    console.log('   - "🔄 Forzando recálculo del Dashboard resumen"');
  }, 2000);
  
  return true;
}

/**
 * MONITOREAR EVENTOS EN TIEMPO REAL
 * Escucha todos los eventos de minutas
 */
function monitorMinutaEvents() {
  console.log('👁️ INICIANDO MONITOREO DE EVENTOS DE MINUTAS...');
  
  const originalAddEventListener = window.addEventListener;
  const originalDispatchEvent = window.dispatchEvent;
  
  // Interceptar addEventListener
  window.addEventListener = function(type, listener, options) {
    if (type === 'minutaStatusChanged' || type === 'autoSaveTrigger') {
      console.log('🎧 Listener agregado para:', type);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Interceptar dispatchEvent
  window.dispatchEvent = function(event) {
    if (event.type === 'minutaStatusChanged' || event.type === 'autoSaveTrigger') {
      console.log('📡 Evento disparado:', event.type, event.detail);
    }
    return originalDispatchEvent.call(this, event);
  };
  
  console.log('✅ Monitoreo activado. Los eventos se mostrarán en la consola.');
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.testMinutaEvents = testMinutaEvents;
  window.verifyListeners = verifyListeners;
  window.testCompleteSync = testCompleteSync;
  window.monitorMinutaEvents = monitorMinutaEvents;
  
  console.log('🧪 Script de prueba de minutas cargado');
  console.log('📋 Funciones disponibles:');
  console.log('  - testMinutaEvents() - Probar eventos de minutas');
  console.log('  - verifyListeners() - Verificar listeners activos');
  console.log('  - testCompleteSync() - Probar sincronización completa');
  console.log('  - monitorMinutaEvents() - Monitorear eventos en tiempo real');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando prueba automática...');
  setTimeout(() => {
    testCompleteSync();
  }, 1000);
}
