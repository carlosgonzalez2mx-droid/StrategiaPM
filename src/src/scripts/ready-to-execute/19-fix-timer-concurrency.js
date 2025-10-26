// ============================================
// CORRECCIÓN PRIORIDAD 4: Timer concurrency
// ============================================
// Prevenir ejecución concurrente de loadPortfolioData

/**
 * PATCH SEGURO PARA loadPortfolioData
 * Agregar protección contra ejecución concurrente
 */
function applyLoadPortfolioDataPatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA loadPortfolioData...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    const originalLoadPortfolioData = window.supabaseService.loadPortfolioData;
    
    if (originalLoadPortfolioData) {
      // Flag para prevenir ejecución concurrente
      let isLoadingPortfolio = false;
      
      window.supabaseService.loadPortfolioData = async function() {
        console.log('🔧 PATCH ACTIVO - loadPortfolioData con protección concurrente');
        
        // Verificar si ya está cargando
        if (isLoadingPortfolio) {
          console.log('⏸️ loadPortfolioData ya está ejecutándose, omitiendo...');
          return null;
        }
        
        try {
          // Marcar como cargando
          isLoadingPortfolio = true;
          console.log('🚀 Iniciando loadPortfolioData...');
          
          // Llamar función original
          const result = await originalLoadPortfolioData.call(this);
          
          console.log('✅ loadPortfolioData completado exitosamente');
          return result;
          
        } catch (error) {
          console.error('❌ Error en loadPortfolioData:', error);
          throw error;
        } finally {
          // Liberar flag
          isLoadingPortfolio = false;
          console.log('🔓 Flag de carga liberado');
        }
      };
      
      console.log('✅ PATCH loadPortfolioData APLICADO EXITOSAMENTE');
      return true;
    } else {
      console.error('❌ No se encontró loadPortfolioData en SupabaseService');
      return false;
    }
  } else {
    console.error('❌ SupabaseService no está disponible');
    return false;
  }
}

/**
 * PATCH SEGURO PARA console.time/timeEnd
 * Prevenir timers duplicados
 */
function applyConsoleTimerPatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA console.time/timeEnd...');
  
  if (typeof window !== 'undefined') {
    // Almacenar funciones originales
    const originalTime = console.time;
    const originalTimeEnd = console.timeEnd;
    
    // Set para rastrear timers activos
    const activeTimers = new Set();
    
    // Función time parcheada
    console.time = function(label) {
      if (activeTimers.has(label)) {
        console.warn(`⚠️ Timer "${label}" ya existe, omitiendo...`);
        return;
      }
      activeTimers.add(label);
      originalTime.call(console, label);
    };
    
    // Función timeEnd parcheada
    console.timeEnd = function(label) {
      if (!activeTimers.has(label)) {
        console.warn(`⚠️ Timer "${label}" no existe, omitiendo...`);
        return;
      }
      activeTimers.delete(label);
      originalTimeEnd.call(console, label);
    };
    
    console.log('✅ PATCH console.time/timeEnd APLICADO EXITOSAMENTE');
    return true;
  } else {
    console.error('❌ console no está disponible');
    return false;
  }
}

/**
 * PATCH SEGURO PARA safeSetTasksByProject
 * Mejorar manejo de actualizaciones concurrentes
 */
function applySafeSetTasksByProjectPatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA safeSetTasksByProject...');
  
  if (typeof window !== 'undefined' && window.App) {
    // Buscar la función safeSetTasksByProject en el contexto global
    const appContext = window.App;
    
    if (appContext && appContext.safeSetTasksByProject) {
      const originalSafeSetTasksByProject = appContext.safeSetTasksByProject;
      
      // Flag para rastrear actualizaciones
      let isUpdatingTasks = false;
      
      appContext.safeSetTasksByProject = function(projectId, tasks) {
        console.log('🔧 PATCH ACTIVO - safeSetTasksByProject con protección concurrente');
        
        // Verificar si ya está actualizando
        if (isUpdatingTasks) {
          console.log('⏸️ safeSetTasksByProject - ACTUALIZACIÓN EN PROGRESO, OMITIENDO');
          return;
        }
        
        try {
          // Marcar como actualizando
          isUpdatingTasks = true;
          console.log('🚀 Iniciando safeSetTasksByProject...');
          
          // Llamar función original
          const result = originalSafeSetTasksByProject.call(this, projectId, tasks);
          
          console.log('✅ safeSetTasksByProject completado exitosamente');
          return result;
          
        } catch (error) {
          console.error('❌ Error en safeSetTasksByProject:', error);
          throw error;
        } finally {
          // Liberar flag después de un delay
          setTimeout(() => {
            isUpdatingTasks = false;
            console.log('🔓 Flag de actualización liberado');
          }, 100);
        }
      };
      
      console.log('✅ PATCH safeSetTasksByProject APLICADO EXITOSAMENTE');
      return true;
    } else {
      console.warn('⚠️ No se encontró safeSetTasksByProject en App context');
      return false;
    }
  } else {
    console.warn('⚠️ App context no está disponible');
    return false;
  }
}

/**
 * VERIFICAR ESTADO DE TIMERS
 * Verifica el estado actual de los timers
 */
function verifyTimerState() {
  console.log('🔍 VERIFICANDO ESTADO DE TIMERS...');
  
  if (typeof window !== 'undefined') {
    // Verificar si hay timers activos (esto es difícil de detectar directamente)
    console.log('📊 Estado de console.time/timeEnd:');
    console.log('  - console.time disponible:', typeof console.time === 'function');
    console.log('  - console.timeEnd disponible:', typeof console.timeEnd === 'function');
    
    // Probar timer simple
    try {
      console.time('test-timer');
      setTimeout(() => {
        console.timeEnd('test-timer');
        console.log('✅ Timer de prueba funcionando correctamente');
      }, 100);
    } catch (error) {
      console.error('❌ Error en timer de prueba:', error);
    }
  }
}

/**
 * APLICAR TODAS LAS CORRECCIONES DE TIMERS
 * Función principal que aplica todas las correcciones
 */
async function applyTimerFixes() {
  console.log('🚀 INICIANDO CORRECCIÓN PRIORIDAD 4...');
  
  try {
    // Verificar estado actual
    verifyTimerState();
    
    // Aplicar patches
    const patch1 = applyLoadPortfolioDataPatch();
    const patch2 = applyConsoleTimerPatch();
    const patch3 = applySafeSetTasksByProjectPatch();
    
    const patchesApplied = [patch1, patch2, patch3].filter(Boolean).length;
    const totalPatches = 3;
    
    if (patchesApplied >= 2) { // Al menos 2 de 3 patches exitosos
      console.log(`✅ ${patchesApplied}/${totalPatches} PATCHES APLICADOS EXITOSAMENTE`);
      
      // Verificar estado después de aplicar patches
      console.log('🔍 VERIFICANDO ESTADO DESPUÉS DE PATCHES...');
      verifyTimerState();
      
      return { 
        success: true, 
        message: `Corrección aplicada exitosamente (${patchesApplied}/${totalPatches} patches)` 
      };
    } else {
      console.error('❌ POCOS PATCHES APLICADOS');
      return { success: false, error: 'No se pudieron aplicar suficientes patches' };
    }
    
  } catch (error) {
    console.error('❌ Error aplicando correcciones de timers:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.fixTimerConcurrency = applyTimerFixes;
  window.verifyTimerState = verifyTimerState;
  
  console.log('🔧 Funciones disponibles:');
  console.log('  - fixTimerConcurrency() - Aplicar corrección completa');
  console.log('  - verifyTimerState() - Verificar estado de timers');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando corrección automática...');
  applyTimerFixes().then(result => {
    if (result.success) {
      console.log('✅ Corrección completada exitosamente');
      console.log('🔄 Por favor, recarga la página (F5) para aplicar los cambios');
    } else {
      console.error('❌ Error en la corrección:', result.error);
    }
  });
}
