// =====================================================
// SCRIPT DE MANTENIMIENTO: SINCRONIZACIÓN DE USUARIOS
// =====================================================
// Este script ejecuta tareas de mantenimiento periódicas
// para mantener sincronizadas las tablas auth.users y public.users

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// FUNCIONES DE MANTENIMIENTO
// =====================================================

/**
 * Ejecuta health check completo del sistema
 */
async function runHealthCheck() {
  console.log('🔍 Ejecutando health check...');
  
  try {
    const { data, error } = await supabase.rpc('verify_user_sync_integrity');
    
    if (error) {
      console.error('❌ Error en health check:', error);
      return { success: false, error: error.message };
    }
    
    const result = data[0];
    console.log('📊 Resultado del health check:');
    console.log(`   Estado: ${result.status}`);
    console.log(`   Usuarios auth: ${result.auth_count}`);
    console.log(`   Usuarios public: ${result.public_count}`);
    console.log(`   Faltantes en public: ${result.missing_in_public}`);
    console.log(`   Faltantes en auth: ${result.missing_in_auth}`);
    console.log(`   Desactualizados: ${result.out_of_sync}`);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error ejecutando health check:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ejecuta reparación automática del sistema
 */
async function runAutoRepair() {
  console.log('🔧 Ejecutando reparación automática...');
  
  try {
    const { data, error } = await supabase.rpc('auto_repair_user_sync');
    
    if (error) {
      console.error('❌ Error en reparación automática:', error);
      return { success: false, error: error.message };
    }
    
    console.log('📊 Resultado de la reparación:');
    data.forEach(action => {
      console.log(`   ${action.action}: ${action.count} - ${action.message}`);
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error ejecutando reparación:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincroniza un usuario específico
 */
async function syncSpecificUser(userId) {
  console.log(`🔄 Sincronizando usuario específico: ${userId}`);
  
  try {
    // Obtener datos del usuario de auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser.user) {
      console.error('❌ Usuario no encontrado en auth.users:', authError);
      return { success: false, error: 'Usuario no encontrado en auth.users' };
    }
    
    const user = authUser.user;
    
    // Verificar si existe en public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando usuario existente:', checkError);
      return { success: false, error: checkError.message };
    }
    
    if (existingUser) {
      // Actualizar usuario existente
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0],
          role: user.user_metadata?.role || 'user',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('❌ Error actualizando usuario:', updateError);
        return { success: false, error: updateError.message };
      }
      
      console.log('✅ Usuario actualizado en public.users');
      return { success: true, action: 'updated' };
    } else {
      // Crear usuario nuevo
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0],
          role: user.user_metadata?.role || 'user'
        });
      
      if (createError) {
        console.error('❌ Error creando usuario:', createError);
        return { success: false, error: createError.message };
      }
      
      console.log('✅ Usuario creado en public.users');
      return { success: true, action: 'created' };
    }
  } catch (error) {
    console.error('❌ Error sincronizando usuario específico:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica proyectos con owner_id problemático
 */
async function checkProblematicProjects() {
  console.log('🔍 Verificando proyectos problemáticos...');
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        owner_id,
        created_at
      `);
    
    if (error) {
      console.error('❌ Error obteniendo proyectos:', error);
      return { success: false, error: error.message };
    }
    
    const problematicProjects = [];
    
    for (const project of data) {
      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', project.owner_id)
        .single();
      
      if (userError || !publicUser) {
        problematicProjects.push({
          projectId: project.id,
          projectName: project.name,
          ownerId: project.owner_id,
          issue: 'Owner no existe en public.users'
        });
      }
    }
    
    console.log(`📊 Proyectos problemáticos encontrados: ${problematicProjects.length}`);
    problematicProjects.forEach(project => {
      console.log(`   ❌ ${project.projectName} (${project.projectId}) - ${project.issue}`);
    });
    
    return { success: true, data: problematicProjects };
  } catch (error) {
    console.error('❌ Error verificando proyectos problemáticos:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Genera reporte completo del sistema
 */
async function generateSystemReport() {
  console.log('📋 Generando reporte completo del sistema...');
  
  const report = {
    timestamp: new Date().toISOString(),
    healthCheck: null,
    projectsCheck: null,
    recommendations: []
  };
  
  // Health check
  const healthResult = await runHealthCheck();
  report.healthCheck = healthResult;
  
  // Verificar proyectos
  const projectsResult = await checkProblematicProjects();
  report.projectsCheck = projectsResult;
  
  // Generar recomendaciones
  if (healthResult.success) {
    const health = healthResult.data;
    if (health.missing_in_public > 0 || health.out_of_sync > 0) {
      report.recommendations.push('🔧 Ejecutar reparación automática');
    }
    if (health.missing_in_auth > 0) {
      report.recommendations.push('⚠️ Revisar usuarios huérfanos en public.users');
    }
  }
  
  if (projectsResult.success && projectsResult.data.length > 0) {
    report.recommendations.push('🚨 Reparar proyectos con owner_id inválido');
  }
  
  if (report.recommendations.length === 0) {
    report.recommendations.push('✅ Sistema saludable, no se requieren acciones');
  }
  
  console.log('📊 Reporte del sistema:');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 Script de Mantenimiento de Sincronización de Usuarios');
  console.log('=====================================================');
  
  switch (command) {
    case 'health':
      await runHealthCheck();
      break;
      
    case 'repair':
      await runAutoRepair();
      break;
      
    case 'sync-user':
      const userId = args[1];
      if (!userId) {
        console.error('❌ Error: Se requiere userId para sync-user');
        console.log('Uso: node maintenance-user-sync.js sync-user <userId>');
        process.exit(1);
      }
      await syncSpecificUser(userId);
      break;
      
    case 'check-projects':
      await checkProblematicProjects();
      break;
      
    case 'report':
      await generateSystemReport();
      break;
      
    case 'full':
      console.log('🔄 Ejecutando mantenimiento completo...');
      await generateSystemReport();
      const healthResult = await runHealthCheck();
      if (healthResult.success && healthResult.data.status === 'UNHEALTHY') {
        console.log('🔧 Sistema no saludable, ejecutando reparación...');
        await runAutoRepair();
        console.log('✅ Reparación completada, ejecutando health check final...');
        await runHealthCheck();
      }
      break;
      
    default:
      console.log('📖 Comandos disponibles:');
      console.log('  health          - Ejecutar health check');
      console.log('  repair          - Ejecutar reparación automática');
      console.log('  sync-user <id>  - Sincronizar usuario específico');
      console.log('  check-projects  - Verificar proyectos problemáticos');
      console.log('  report          - Generar reporte completo');
      console.log('  full            - Ejecutar mantenimiento completo');
      console.log('');
      console.log('Ejemplos:');
      console.log('  node maintenance-user-sync.js health');
      console.log('  node maintenance-user-sync.js repair');
      console.log('  node maintenance-user-sync.js sync-user 123e4567-e89b-12d3-a456-426614174000');
      console.log('  node maintenance-user-sync.js full');
      break;
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  runHealthCheck,
  runAutoRepair,
  syncSpecificUser,
  checkProblematicProjects,
  generateSystemReport
};
