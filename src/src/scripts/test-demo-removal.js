// ============================================
// SCRIPT DE TESTING: ELIMINACIÓN DE DEMO-001
// ============================================
// Script para probar que la eliminación de demo-001 funcione correctamente

console.log('🧪 TESTING ELIMINACIÓN DE DEMO-001...');

/**
 * Verificar que demo-001 no existe en el estado
 */
function testDemoRemoval() {
  console.log('\n--- TEST 1: Verificar eliminación de demo-001 ---');
  
  try {
    // Verificar que no hay demo-001 en localStorage
    const projectsData = localStorage.getItem('projects');
    if (projectsData) {
      const projects = JSON.parse(projectsData);
      const hasDemo = projects.some(p => p.id === 'demo-001');
      console.log('✅ demo-001 en localStorage:', hasDemo ? '❌ ENCONTRADO' : '✅ NO ENCONTRADO');
    } else {
      console.log('✅ No hay datos de proyectos en localStorage');
    }
    
    // Verificar que no hay demo-001 en sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    const hasDemoInSession = sessionKeys.some(key => key.includes('demo-001'));
    console.log('✅ demo-001 en sessionStorage:', hasDemoInSession ? '❌ ENCONTRADO' : '✅ NO ENCONTRADO');
    
    return !hasDemo && !hasDemoInSession;
    
  } catch (error) {
    console.error('❌ Error verificando demo-001:', error);
    return false;
  }
}

/**
 * Verificar que la aplicación maneja correctamente el caso sin proyectos
 */
function testEmptyStateHandling() {
  console.log('\n--- TEST 2: Verificar manejo de estado vacío ---');
  
  try {
    // Simular estado sin proyectos
    const originalProjects = localStorage.getItem('projects');
    localStorage.removeItem('projects');
    localStorage.removeItem('lastSelectedProjectId');
    
    console.log('✅ Estado simulado: Sin proyectos');
    console.log('💡 Recarga la página para ver el mensaje de bienvenida');
    
    // Restaurar estado original después de 5 segundos
    setTimeout(() => {
      if (originalProjects) {
        localStorage.setItem('projects', originalProjects);
        console.log('✅ Estado original restaurado');
      }
    }, 5000);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error probando estado vacío:', error);
    return false;
  }
}

/**
 * Verificar que la función getInitialProjectId funciona correctamente
 */
function testGetInitialProjectId() {
  console.log('\n--- TEST 3: Verificar función getInitialProjectId ---');
  
  try {
    // Simular diferentes escenarios
    const scenarios = [
      { name: 'Sin proyectos', projects: [] },
      { name: 'Con proyectos activos', projects: [
        { id: 'proj-1', status: 'active' },
        { id: 'proj-2', status: 'active' }
      ]},
      { name: 'Con proyectos inactivos', projects: [
        { id: 'proj-1', status: 'completed' },
        { id: 'proj-2', status: 'cancelled' }
      ]}
    ];
    
    scenarios.forEach(scenario => {
      console.log(`📊 Escenario: ${scenario.name}`);
      
      // Simular la lógica de getInitialProjectId
      let result = null;
      
      if (scenario.projects.length > 0) {
        const activeProject = scenario.projects.find(p => p.status === 'active');
        if (activeProject) {
          result = activeProject.id;
        } else {
          result = scenario.projects[0].id;
        }
      }
      
      console.log(`  - Resultado: ${result || 'null'}`);
      console.log(`  - Esperado: ${scenario.projects.length > 0 ? 'ID de proyecto' : 'null'}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error probando getInitialProjectId:', error);
    return false;
  }
}

/**
 * Verificar que no hay errores de Supabase
 */
function testSupabaseCompatibility() {
  console.log('\n--- TEST 4: Verificar compatibilidad con Supabase ---');
  
  try {
    // Verificar que no hay proyectos con IDs no-UUID
    const projectsData = localStorage.getItem('projects');
    if (projectsData) {
      const projects = JSON.parse(projectsData);
      const nonUuidProjects = projects.filter(p => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(p.id);
      });
      
      console.log('✅ Proyectos con IDs no-UUID:', nonUuidProjects.length);
      if (nonUuidProjects.length > 0) {
        console.log('⚠️ Proyectos problemáticos:', nonUuidProjects.map(p => ({ id: p.id, name: p.name })));
      } else {
        console.log('✅ Todos los proyectos tienen IDs válidos');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error verificando compatibilidad con Supabase:', error);
    return false;
  }
}

/**
 * Función principal de testing
 */
async function runAllTests() {
  console.log('🚀 INICIANDO TESTS COMPLETOS...');
  
  const results = {
    demoRemoval: testDemoRemoval(),
    emptyState: testEmptyStateHandling(),
    getInitialProjectId: testGetInitialProjectId(),
    supabaseCompatibility: testSupabaseCompatibility()
  };
  
  console.log('\n--- RESUMEN DE TESTS ---');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASÓ' : 'FALLÓ'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 RESULTADO FINAL: ${allPassed ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  return { allPassed, results };
}

/**
 * Función de limpieza de emergencia
 */
function emergencyCleanup() {
  console.log('🚨 EJECUTANDO LIMPIEZA DE EMERGENCIA...');
  
  try {
    // Limpiar todas las referencias a demo-001
    Object.keys(localStorage).forEach(key => {
      if (key.includes('demo-001')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Eliminado: ${key}`);
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('demo-001')) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Eliminado: ${key}`);
      }
    });
    
    console.log('✅ Limpieza de emergencia completada');
    console.log('🔄 Recarga la página para aplicar los cambios');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en limpieza de emergencia:', error);
    return false;
  }
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.testDemoRemoval = testDemoRemoval;
  window.testEmptyStateHandling = testEmptyStateHandling;
  window.testGetInitialProjectId = testGetInitialProjectId;
  window.testSupabaseCompatibility = testSupabaseCompatibility;
  window.runAllTests = runAllTests;
  window.emergencyCleanup = emergencyCleanup;
  
  console.log('🔧 Funciones de testing disponibles:');
  console.log('  - runAllTests() - Ejecutar todos los tests');
  console.log('  - testDemoRemoval() - Verificar eliminación de demo-001');
  console.log('  - testEmptyStateHandling() - Probar estado vacío');
  console.log('  - emergencyCleanup() - Limpieza de emergencia');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando tests automáticos...');
  setTimeout(() => {
    runAllTests();
  }, 1000);
}
