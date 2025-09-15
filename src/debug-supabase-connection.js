// Script de diagnóstico para problemas de conexión con Supabase
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://ogqpsrsssrrytrqoyyph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnosticarConexionSupabase() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE CONEXIÓN SUPABASE');
  console.log('================================================');
  
  try {
    // 1. Verificar conexión básica
    console.log('1️⃣ Verificando conexión básica...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      return;
    }
    
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      console.log('   ID de usuario:', user.id);
    } else {
      console.log('⚠️ No hay usuario autenticado');
      console.log('   Esto puede ser normal si no has iniciado sesión');
    }
    
    // 2. Verificar tabla de organizaciones
    console.log('\n2️⃣ Verificando tabla de organizaciones...');
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*');
    
    if (orgError) {
      console.error('❌ Error accediendo a organizaciones:', orgError);
    } else {
      console.log('✅ Organizaciones encontradas:', organizations?.length || 0);
      if (organizations && organizations.length > 0) {
        organizations.forEach((org, index) => {
          console.log(`   ${index + 1}. ${org.name} (ID: ${org.id}, Owner: ${org.owner_id})`);
        });
      }
    }
    
    // 3. Verificar tabla de proyectos
    console.log('\n3️⃣ Verificando tabla de proyectos...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    
    if (projectsError) {
      console.error('❌ Error accediendo a proyectos:', projectsError);
    } else {
      console.log('✅ Proyectos encontrados:', projects?.length || 0);
      if (projects && projects.length > 0) {
        projects.forEach((project, index) => {
          console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
          console.log(`      - Organización: ${project.organization_id}`);
          console.log(`      - Owner: ${project.owner_id}`);
          console.log(`      - Estado: ${project.status}`);
          console.log(`      - Creado: ${project.created_at}`);
        });
      }
    }
    
    // 4. Verificar proyectos por organización (si hay usuario autenticado)
    if (user) {
      console.log('\n4️⃣ Verificando proyectos por organización del usuario...');
      
      // Buscar organización del usuario
      const { data: userOrg, error: userOrgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (userOrgError) {
        console.error('❌ Error buscando organización del usuario:', userOrgError);
      } else if (userOrg) {
        console.log('✅ Organización del usuario encontrada:', userOrg.id);
        
        // Buscar proyectos de la organización
        const { data: userProjects, error: userProjectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('organization_id', userOrg.id);
        
        if (userProjectsError) {
          console.error('❌ Error buscando proyectos de la organización:', userProjectsError);
        } else {
          console.log('✅ Proyectos de la organización:', userProjects?.length || 0);
          if (userProjects && userProjects.length > 0) {
            userProjects.forEach((project, index) => {
              console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
              console.log(`      - Estado: ${project.status}`);
              console.log(`      - Presupuesto: $${project.budget}`);
            });
          }
        }
      } else {
        console.log('⚠️ No se encontró organización para el usuario');
      }
    }
    
    // 5. Verificar estructura de la base de datos
    console.log('\n5️⃣ Verificando estructura de la base de datos...');
    const tables = ['projects', 'organizations', 'users', 'tasks', 'risks', 'resources'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ Tabla ${table}: Error - ${error.message}`);
        } else {
          console.log(`   ✅ Tabla ${table}: Accesible`);
        }
      } catch (err) {
        console.log(`   ❌ Tabla ${table}: Error - ${err.message}`);
      }
    }
    
    // 6. Verificar políticas RLS (Row Level Security)
    console.log('\n6️⃣ Verificando políticas de seguridad...');
    console.log('   ℹ️ Las políticas RLS pueden estar bloqueando el acceso a los datos');
    console.log('   ℹ️ Verifica en el dashboard de Supabase que las políticas estén configuradas correctamente');
    
    console.log('\n================================================');
    console.log('🏁 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error general en el diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnosticarConexionSupabase();
