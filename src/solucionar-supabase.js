// Script para solucionar problemas de conexión con Supabase
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://ogqpsrsssrrytrqoyyph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function solucionarProblemaSupabase() {
  console.log('🔧 SOLUCIONANDO PROBLEMA DE CONEXIÓN SUPABASE');
  console.log('===============================================');
  
  try {
    // 1. Verificar si hay usuario autenticado
    console.log('1️⃣ Verificando autenticación...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      console.log('💡 SOLUCIÓN: Verifica que las credenciales de Supabase sean correctas');
      return;
    }
    
    if (!user) {
      console.log('⚠️ No hay usuario autenticado');
      console.log('💡 SOLUCIÓN: Necesitas iniciar sesión primero');
      console.log('   - Ve a tu aplicación y haz clic en "Conectar con la Nube"');
      console.log('   - O inicia sesión con tu email y contraseña');
      return;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    // 2. Verificar si existe organización para el usuario
    console.log('\n2️⃣ Verificando organización del usuario...');
    const { data: userOrg, error: userOrgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    
    if (userOrgError) {
      if (userOrgError.code === 'PGRST116') {
        console.log('⚠️ No se encontró organización para el usuario');
        console.log('💡 SOLUCIÓN: Creando organización...');
        
        // Crear organización para el usuario
        const { data: newOrg, error: createOrgError } = await supabase
          .from('organizations')
          .insert({
            name: `${user.email.split('@')[0]}'s Organization`,
            owner_id: user.id
          })
          .select('id')
          .single();
        
        if (createOrgError) {
          console.error('❌ Error creando organización:', createOrgError);
          return;
        }
        
        console.log('✅ Organización creada:', newOrg.id);
        userOrg = newOrg;
      } else {
        console.error('❌ Error buscando organización:', userOrgError);
        return;
      }
    } else {
      console.log('✅ Organización encontrada:', userOrg.id);
    }
    
    // 3. Verificar proyectos en la organización
    console.log('\n3️⃣ Verificando proyectos en la organización...');
    const { data: orgProjects, error: orgProjectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', userOrg.id);
    
    if (orgProjectsError) {
      console.error('❌ Error buscando proyectos de la organización:', orgProjectsError);
      return;
    }
    
    console.log('✅ Proyectos encontrados en la organización:', orgProjects?.length || 0);
    
    if (orgProjects && orgProjects.length > 0) {
      console.log('\n📋 PROYECTOS ENCONTRADOS:');
      orgProjects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name}`);
        console.log(`      - ID: ${project.id}`);
        console.log(`      - Estado: ${project.status}`);
        console.log(`      - Presupuesto: $${project.budget}`);
        console.log(`      - Creado: ${new Date(project.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('⚠️ No hay proyectos en la organización');
      console.log('💡 SOLUCIÓN: Crear proyectos desde la aplicación');
    }
    
    // 4. Verificar si hay proyectos en otras organizaciones
    console.log('\n4️⃣ Verificando proyectos en otras organizaciones...');
    const { data: allProjects, error: allProjectsError } = await supabase
      .from('projects')
      .select('*, organizations!inner(name, owner_id)');
    
    if (allProjectsError) {
      console.error('❌ Error buscando todos los proyectos:', allProjectsError);
    } else {
      console.log('✅ Total de proyectos en la base de datos:', allProjects?.length || 0);
      
      if (allProjects && allProjects.length > 0) {
        console.log('\n📋 TODOS LOS PROYECTOS:');
        allProjects.forEach((project, index) => {
          console.log(`   ${index + 1}. ${project.name}`);
          console.log(`      - ID: ${project.id}`);
          console.log(`      - Organización: ${project.organizations.name}`);
          console.log(`      - Owner: ${project.organizations.owner_id}`);
          console.log(`      - Estado: ${project.status}`);
        });
      }
    }
    
    // 5. Verificar políticas RLS
    console.log('\n5️⃣ Verificando políticas de seguridad...');
    console.log('ℹ️ Las políticas RLS pueden estar bloqueando el acceso');
    console.log('💡 SOLUCIÓN: Verifica en el dashboard de Supabase:');
    console.log('   1. Ve a Authentication > Policies');
    console.log('   2. Verifica que las políticas estén habilitadas');
    console.log('   3. Asegúrate de que el usuario tenga permisos para leer las tablas');
    
    // 6. Crear proyecto de prueba si no hay proyectos
    if (!orgProjects || orgProjects.length === 0) {
      console.log('\n6️⃣ Creando proyecto de prueba...');
      
      const testProject = {
        id: `test-${Date.now()}`,
        name: 'Proyecto de Prueba',
        description: 'Proyecto creado para verificar la conexión',
        status: 'active',
        priority: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 50000,
        manager: user.email,
        sponsor: 'Sistema',
        organization_id: userOrg.id,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newProject, error: createProjectError } = await supabase
        .from('projects')
        .insert(testProject)
        .select('*')
        .single();
      
      if (createProjectError) {
        console.error('❌ Error creando proyecto de prueba:', createProjectError);
      } else {
        console.log('✅ Proyecto de prueba creado:', newProject.name);
      }
    }
    
    console.log('\n===============================================');
    console.log('🏁 DIAGNÓSTICO Y SOLUCIÓN COMPLETADOS');
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('   1. Recarga tu aplicación');
    console.log('   2. Verifica que aparezcan los proyectos');
    console.log('   3. Si no aparecen, revisa la consola del navegador para errores');
    console.log('   4. Verifica las políticas RLS en Supabase');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar solución
solucionarProblemaSupabase();
