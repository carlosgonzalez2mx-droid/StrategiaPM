// ============================================
// CORRECCIÓN PRIORIDAD 3: users table filter
// ============================================
// Corregir getBackupStats para no aplicar organization_id filter a users table

/**
 * PATCH SEGURO PARA getBackupStats
 * Excluye users table del filtro organization_id
 */
function applyGetBackupStatsPatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA getBackupStats...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    const originalGetBackupStats = window.supabaseService.getBackupStats;
    
    if (originalGetBackupStats) {
      window.supabaseService.getBackupStats = async function() {
        console.log('🔧 PATCH ACTIVO - getBackupStats con filtro corregido');
        
        try {
          const tables = [
            'organizations',
            'projects',
            'tasks',
            'risks',
            'purchase_orders',
            'advances',
            'invoices',
            'contracts',
            'resources',
            'resource_assignments',
            'users' // ← Esta tabla NO debe tener filtro organization_id
          ];
          
          const stats = {};
          let totalRecords = 0;
          
          for (const tableName of tables) {
            try {
              let query = this.supabase.from(tableName).select('*', { count: 'exact', head: true });
              
              // CORRECCIÓN: Solo aplicar organization_id filter a tablas que lo tienen
              const tablesWithOrganizationId = [
                'projects',
                'tasks', 
                'risks',
                'purchase_orders',
                'advances',
                'invoices',
                'contracts',
                'resources',
                'resource_assignments'
              ];
              
              if (tableName !== 'organizations' && 
                  tableName !== 'users' && 
                  tablesWithOrganizationId.includes(tableName) && 
                  this.organizationId) {
                query = query.eq('organization_id', this.organizationId);
                console.log(`📊 Aplicando filtro organization_id a ${tableName}`);
              } else {
                console.log(`📊 Sin filtro organization_id para ${tableName} (no aplicable)`);
              }
              
              const { count, error } = await query;
              
              if (error) {
                console.warn(`⚠️ Error contando tabla ${tableName}:`, error);
                stats[tableName] = 0;
              } else {
                stats[tableName] = count || 0;
                totalRecords += count || 0;
              }
            } catch (tableError) {
              console.error(`❌ Error contando tabla ${tableName}:`, tableError);
              stats[tableName] = 0;
            }
          }
          
          console.log('✅ getBackupStats PATCH EXITOSO - Filtros corregidos');
          return {
            ...stats,
            totalRecords,
            timestamp: new Date().toISOString()
          };
          
        } catch (error) {
          console.error('❌ Error en getBackupStats parcheado:', error);
          throw error;
        }
      };
      
      console.log('✅ PATCH getBackupStats APLICADO EXITOSAMENTE');
      return true;
    } else {
      console.error('❌ No se encontró getBackupStats en SupabaseService');
      return false;
    }
  } else {
    console.error('❌ SupabaseService no está disponible');
    return false;
  }
}

/**
 * VERIFICACIÓN DE TABLAS CON ORGANIZATION_ID
 * Verifica qué tablas tienen la columna organization_id
 */
async function verifyTablesWithOrganizationId() {
  console.log('🔍 VERIFICANDO TABLAS CON ORGANIZATION_ID...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    const tablesToCheck = [
      'organizations',
      'projects',
      'tasks',
      'risks',
      'purchase_orders',
      'advances',
      'invoices',
      'contracts',
      'resources',
      'resource_assignments',
      'users'
    ];
    
    const results = {};
    
    for (const tableName of tablesToCheck) {
      try {
        // Intentar query con organization_id filter
        const { error } = await window.supabaseService.supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', 'test-uuid');
        
        if (error && error.code === '42703') {
          // Error 42703 = column does not exist
          results[tableName] = { hasOrganizationId: false, error: 'Column does not exist' };
        } else {
          // No error o error diferente = column exists
          results[tableName] = { hasOrganizationId: true, error: null };
        }
      } catch (err) {
        results[tableName] = { hasOrganizationId: false, error: err.message };
      }
    }
    
    console.log('📊 Resultados de verificación:');
    Object.entries(results).forEach(([table, result]) => {
      console.log(`  - ${table}: ${result.hasOrganizationId ? '✅ TIENE' : '❌ NO TIENE'} organization_id`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    return results;
  } else {
    console.error('❌ SupabaseService no disponible para verificación');
    return null;
  }
}

/**
 * PROBAR getBackupStats CORREGIDO
 * Prueba la función corregida
 */
async function testGetBackupStats() {
  console.log('🧪 PROBANDO getBackupStats CORREGIDO...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    try {
      const stats = await window.supabaseService.getBackupStats();
      console.log('✅ getBackupStats ejecutado exitosamente:', stats);
      return { success: true, stats };
    } catch (error) {
      console.error('❌ Error en getBackupStats:', error);
      return { success: false, error: error.message };
    }
  } else {
    console.error('❌ SupabaseService no disponible');
    return { success: false, error: 'SupabaseService no disponible' };
  }
}

/**
 * APLICAR CORRECCIÓN COMPLETA
 * Función principal que aplica la corrección
 */
async function applyUsersTableFix() {
  console.log('🚀 INICIANDO CORRECCIÓN PRIORIDAD 3...');
  
  try {
    // Verificar tablas con organization_id
    await verifyTablesWithOrganizationId();
    
    // Aplicar patch
    const patchApplied = applyGetBackupStatsPatch();
    
    if (patchApplied) {
      console.log('✅ PATCH APLICADO EXITOSAMENTE');
      
      // Probar función corregida
      const testResult = await testGetBackupStats();
      
      if (testResult.success) {
        console.log('✅ PRUEBA EXITOSA - getBackupStats funcionando correctamente');
        return { success: true, message: 'Corrección aplicada y probada exitosamente' };
      } else {
        console.error('❌ PRUEBA FALLÓ:', testResult.error);
        return { success: false, error: `Prueba falló: ${testResult.error}` };
      }
    } else {
      console.error('❌ PATCH FALLÓ');
      return { success: false, error: 'No se pudo aplicar el patch' };
    }
    
  } catch (error) {
    console.error('❌ Error aplicando corrección:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.fixUsersTableFilter = applyUsersTableFix;
  window.verifyTablesWithOrganizationId = verifyTablesWithOrganizationId;
  window.testGetBackupStats = testGetBackupStats;
  
  console.log('🔧 Funciones disponibles:');
  console.log('  - fixUsersTableFilter() - Aplicar corrección completa');
  console.log('  - verifyTablesWithOrganizationId() - Verificar tablas');
  console.log('  - testGetBackupStats() - Probar función corregida');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando corrección automática...');
  applyUsersTableFix().then(result => {
    if (result.success) {
      console.log('✅ Corrección completada exitosamente');
      console.log('🔄 Por favor, recarga la página (F5) para aplicar los cambios');
    } else {
      console.error('❌ Error en la corrección:', result.error);
    }
  });
}
