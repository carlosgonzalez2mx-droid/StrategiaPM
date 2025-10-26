// ============================================
// SCRIPT DE BACKUP ANTES DE ELIMINAR DEMO-001
// ============================================
// Script para crear backup del estado actual antes de eliminar demo-001

console.log('🔒 CREANDO BACKUP ANTES DE ELIMINAR DEMO-001...');

/**
 * Crear backup completo del estado actual
 */
function createBackup() {
  try {
    // Verificar que la aplicación esté cargada
    if (typeof window === 'undefined' || !window.supabaseService) {
      console.error('❌ La aplicación no está cargada. Ejecuta este script en la consola del navegador.');
      return { success: false, error: 'Aplicación no cargada' };
    }

    // Obtener estado actual de localStorage
    const localStorageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('demo-001')) { // Excluir datos de demo-001
        try {
          localStorageData[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
    }

    // Obtener estado actual de sessionStorage
    const sessionStorageData = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && !key.includes('demo-001')) { // Excluir datos de demo-001
        try {
          sessionStorageData[key] = JSON.parse(sessionStorage.getItem(key));
        } catch (e) {
          sessionStorageData[key] = sessionStorage.getItem(key);
        }
      }
    }

    // Crear backup completo
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      description: 'Backup antes de eliminar demo-001',
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Guardar backup en localStorage
    localStorage.setItem('backup_before_demo_removal', JSON.stringify(backup));
    
    console.log('✅ Backup creado exitosamente');
    console.log('📊 Datos respaldados:');
    console.log('  - localStorage keys:', Object.keys(localStorageData).length);
    console.log('  - sessionStorage keys:', Object.keys(sessionStorageData).length);
    console.log('  - Timestamp:', backup.timestamp);
    
    return { success: true, backup };
    
  } catch (error) {
    console.error('❌ Error creando backup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verificar que hay proyectos reales antes de eliminar demo
 */
function verifyRealProjects() {
  try {
    // Buscar datos de proyectos en localStorage
    const projectsData = localStorage.getItem('projects');
    if (!projectsData) {
      console.warn('⚠️ No se encontraron proyectos en localStorage');
      return { hasRealProjects: false, projectCount: 0 };
    }

    const projects = JSON.parse(projectsData);
    const realProjects = projects.filter(p => p.id !== 'demo-001');
    const activeProjects = realProjects.filter(p => p.status === 'active');

    console.log('📊 Análisis de proyectos:');
    console.log('  - Total proyectos:', projects.length);
    console.log('  - Proyectos reales (sin demo-001):', realProjects.length);
    console.log('  - Proyectos activos:', activeProjects.length);
    console.log('  - Proyecto demo-001 encontrado:', projects.some(p => p.id === 'demo-001'));

    return {
      hasRealProjects: realProjects.length > 0,
      projectCount: realProjects.length,
      activeCount: activeProjects.length,
      hasDemo: projects.some(p => p.id === 'demo-001')
    };

  } catch (error) {
    console.error('❌ Error verificando proyectos:', error);
    return { hasRealProjects: false, projectCount: 0, error: error.message };
  }
}

/**
 * Función principal de backup
 */
async function runBackupProcess() {
  console.log('🚀 INICIANDO PROCESO DE BACKUP...');
  
  // Paso 1: Verificar proyectos reales
  console.log('\n--- PASO 1: Verificando proyectos reales ---');
  const projectCheck = verifyRealProjects();
  
  if (!projectCheck.hasRealProjects) {
    console.error('❌ NO SE PUEDE PROCEDER: No hay proyectos reales');
    console.log('💡 Crea al menos un proyecto real antes de eliminar demo-001');
    return { success: false, reason: 'No hay proyectos reales' };
  }
  
  console.log('✅ Verificación de proyectos exitosa');
  
  // Paso 2: Crear backup
  console.log('\n--- PASO 2: Creando backup ---');
  const backupResult = createBackup();
  
  if (!backupResult.success) {
    console.error('❌ Error creando backup:', backupResult.error);
    return { success: false, reason: 'Error en backup' };
  }
  
  console.log('✅ Backup completado exitosamente');
  
  // Paso 3: Resumen final
  console.log('\n--- RESUMEN FINAL ---');
  console.log('✅ Proyectos reales encontrados:', projectCheck.projectCount);
  console.log('✅ Proyectos activos:', projectCheck.activeCount);
  console.log('✅ Demo-001 encontrado:', projectCheck.hasDemo);
  console.log('✅ Backup creado:', backupResult.success);
  console.log('\n🎯 LISTO PARA ELIMINAR DEMO-001');
  
  return { 
    success: true, 
    projectCheck, 
    backup: backupResult.backup 
  };
}

/**
 * Función de rollback en caso de problemas
 */
function rollbackFromBackup() {
  try {
    const backupData = localStorage.getItem('backup_before_demo_removal');
    if (!backupData) {
      console.error('❌ No se encontró backup para rollback');
      return { success: false, error: 'No backup found' };
    }

    const backup = JSON.parse(backupData);
    
    // Restaurar localStorage
    Object.keys(backup.localStorage).forEach(key => {
      localStorage.setItem(key, JSON.stringify(backup.localStorage[key]));
    });
    
    // Restaurar sessionStorage
    Object.keys(backup.sessionStorage).forEach(key => {
      sessionStorage.setItem(key, JSON.stringify(backup.sessionStorage[key]));
    });
    
    console.log('✅ Estado restaurado desde backup');
    console.log('🔄 Recarga la página para aplicar los cambios');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error en rollback:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.createBackup = createBackup;
  window.verifyRealProjects = verifyRealProjects;
  window.runBackupProcess = runBackupProcess;
  window.rollbackFromBackup = rollbackFromBackup;
  
  console.log('🔧 Funciones de backup disponibles:');
  console.log('  - runBackupProcess() - Ejecutar proceso completo de backup');
  console.log('  - verifyRealProjects() - Verificar proyectos reales');
  console.log('  - createBackup() - Crear backup manual');
  console.log('  - rollbackFromBackup() - Restaurar desde backup');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando backup automático...');
  setTimeout(() => {
    runBackupProcess();
  }, 1000);
}
