// Script para corregir problemas de conexión con Supabase en la aplicación React
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://ogqpsrsssrrytrqoyyph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función mejorada para cargar datos del portafolio
export async function loadPortfolioDataImproved() {
  try {
    console.log('🚀 Cargando datos del portafolio (versión mejorada)...');
    
    // 1. Verificar usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      return null;
    }
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado');
      return null;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    // 2. Buscar o crear organización
    let organizationId = null;
    
    // Buscar organización existente
    const { data: existingOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (orgError && orgError.code !== 'PGRST116') {
      console.error('❌ Error buscando organización:', orgError);
      return null;
    }
    
    if (existingOrg) {
      organizationId = existingOrg.id;
      console.log('✅ Organización encontrada:', organizationId);
    } else {
      // Crear organización si no existe
      console.log('🏢 Creando organización para el usuario...');
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
        return null;
      }
      
      organizationId = newOrg.id;
      console.log('✅ Organización creada:', organizationId);
    }
    
    // 3. Cargar proyectos de la organización
    console.log('📋 Cargando proyectos de la organización...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (projectsError) {
      console.error('❌ Error cargando proyectos:', projectsError);
      return null;
    }
    
    console.log(`✅ Proyectos encontrados: ${projects?.length || 0}`);
    
    // 4. Si no hay proyectos, crear uno de demostración
    if (!projects || projects.length === 0) {
      console.log('📝 Creando proyecto de demostración...');
      
      const demoProject = {
        id: `demo-${Date.now()}`,
        name: 'Proyecto de Demostración',
        description: 'Proyecto de ejemplo para familiarizarse con el sistema',
        status: 'active',
        priority: 'medium',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: 100000,
        manager: user.email,
        sponsor: 'Sistema',
        organization_id: organizationId,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: newProject, error: createProjectError } = await supabase
        .from('projects')
        .insert(demoProject)
        .select('*')
        .single();
      
      if (createProjectError) {
        console.error('❌ Error creando proyecto de demostración:', createProjectError);
        return null;
      }
      
      projects = [newProject];
      console.log('✅ Proyecto de demostración creado');
    }
    
    // 5. Cargar datos relacionados
    const tasksByProject = {};
    const risksByProject = {};
    const purchaseOrdersByProject = {};
    const advancesByProject = {};
    const invoicesByProject = {};
    const contractsByProject = {};
    const resourceAssignmentsByProject = {};
    const auditLogsByProject = {};
    const includeWeekendsByProject = {};
    
    for (const project of projects) {
      // Cargar tareas
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id);
      tasksByProject[project.id] = tasks || [];
      
      // Cargar riesgos
      const { data: risks } = await supabase
        .from('risks')
        .select('*')
        .eq('project_id', project.id);
      risksByProject[project.id] = risks || [];
      
      // Cargar órdenes de compra
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('project_id', project.id);
      purchaseOrdersByProject[project.id] = purchaseOrders || [];
      
      // Cargar anticipos
      const { data: advances } = await supabase
        .from('advances')
        .select('*')
        .eq('project_id', project.id);
      advancesByProject[project.id] = advances || [];
      
      // Cargar facturas
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', project.id);
      invoicesByProject[project.id] = invoices || [];
      
      // Cargar contratos
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('project_id', project.id);
      contractsByProject[project.id] = contracts || [];
      
      // Cargar asignaciones de recursos
      const { data: assignments } = await supabase
        .from('resource_assignments')
        .select('*')
        .eq('project_id', project.id);
      resourceAssignmentsByProject[project.id] = assignments || [];
      
      // Cargar logs de auditoría
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('project_id', project.id);
      auditLogsByProject[project.id] = auditLogs || [];
      
      // Cargar configuración
      const { data: config } = await supabase
        .from('project_configurations')
        .select('*')
        .eq('project_id', project.id)
        .single();
      includeWeekendsByProject[project.id] = config ? config.include_weekends : false;
    }
    
    // 6. Cargar recursos globales
    const { data: globalResources } = await supabase
      .from('resources')
      .select('*')
      .eq('organization_id', organizationId);
    
    // 7. Cargar alertas corporativas
    const { data: corporateAlerts } = await supabase
      .from('corporate_alerts')
      .select('*')
      .eq('organization_id', organizationId);
    
    // 8. Preparar datos del portafolio
    const portfolioData = {
      projects: projects || [],
      tasksByProject: tasksByProject,
      risksByProject: risksByProject,
      globalResources: globalResources || [],
      corporateAlerts: corporateAlerts || [],
      purchaseOrdersByProject: purchaseOrdersByProject,
      advancesByProject: advancesByProject,
      invoicesByProject: invoicesByProject,
      contractsByProject: contractsByProject,
      resourceAssignmentsByProject: resourceAssignmentsByProject,
      auditLogsByProject: auditLogsByProject,
      includeWeekendsByProject: includeWeekendsByProject,
      currentProjectId: projects && projects.length > 0 ? projects[0].id : null,
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ Datos del portafolio cargados exitosamente');
    console.log(`   Proyectos: ${portfolioData.projects.length}`);
    console.log(`   Proyecto actual: ${portfolioData.currentProjectId}`);
    
    return portfolioData;
    
  } catch (error) {
    console.error('❌ Error general cargando datos del portafolio:', error);
    return null;
  }
}

// Función para diagnosticar problemas
export async function diagnosticarProblemasSupabase() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMAS SUPABASE');
  console.log('=====================================');
  
  try {
    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError);
      return false;
    }
    
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado');
      console.log('💡 SOLUCIÓN: Inicia sesión en tu aplicación');
      return false;
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    // 2. Verificar organización
    console.log('2️⃣ Verificando organización...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    
    if (orgError && orgError.code !== 'PGRST116') {
      console.error('❌ Error con organización:', orgError);
      return false;
    }
    
    if (!org) {
      console.warn('⚠️ No hay organización para el usuario');
      console.log('💡 SOLUCIÓN: Se creará automáticamente');
      return false;
    }
    
    console.log('✅ Organización encontrada:', org.name);
    
    // 3. Verificar proyectos
    console.log('3️⃣ Verificando proyectos...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', org.id);
    
    if (projectsError) {
      console.error('❌ Error con proyectos:', projectsError);
      return false;
    }
    
    console.log(`✅ Proyectos encontrados: ${projects?.length || 0}`);
    
    if (projects && projects.length > 0) {
      projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name} (${project.status})`);
      });
    } else {
      console.warn('⚠️ No hay proyectos en la organización');
      console.log('💡 SOLUCIÓN: Se creará un proyecto de demostración');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return false;
  }
}

// Función para sincronizar datos locales con Supabase
export async function sincronizarDatosLocales() {
  try {
    console.log('🔄 Sincronizando datos locales con Supabase...');
    
    // Cargar datos desde localStorage
    const localData = localStorage.getItem('mi-dashboard-portfolio');
    if (!localData) {
      console.log('⚠️ No hay datos locales para sincronizar');
      return false;
    }
    
    const data = JSON.parse(localData);
    console.log('📊 Datos locales encontrados:', {
      proyectos: data.projects?.length || 0,
      tareas: Object.keys(data.tasksByProject || {}).length,
      riesgos: Object.keys(data.risksByProject || {}).length
    });
    
    // Verificar usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No hay usuario autenticado para sincronizar');
      return false;
    }
    
    // Buscar organización
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (orgError && orgError.code !== 'PGRST116') {
      console.error('❌ Error con organización:', orgError);
      return false;
    }
    
    if (!org) {
      console.log('🏢 Creando organización...');
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
        return false;
      }
      
      org = newOrg;
    }
    
    // Sincronizar proyectos
    if (data.projects && data.projects.length > 0) {
      console.log('📋 Sincronizando proyectos...');
      
      const projectsToSync = data.projects.map(project => ({
        ...project,
        organization_id: org.id,
        owner_id: user.id,
        updated_at: new Date().toISOString()
      }));
      
      const { error: projectsError } = await supabase
        .from('projects')
        .upsert(projectsToSync, { onConflict: 'id' });
      
      if (projectsError) {
        console.error('❌ Error sincronizando proyectos:', projectsError);
        return false;
      }
      
      console.log('✅ Proyectos sincronizados');
    }
    
    // Sincronizar tareas
    if (data.tasksByProject) {
      console.log('📝 Sincronizando tareas...');
      
      for (const projectId in data.tasksByProject) {
        const tasks = data.tasksByProject[projectId];
        if (tasks && tasks.length > 0) {
          const tasksToSync = tasks.map(task => ({
            ...task,
            project_id: projectId,
            owner_id: user.id,
            updated_at: new Date().toISOString()
          }));
          
          const { error: tasksError } = await supabase
            .from('tasks')
            .upsert(tasksToSync, { onConflict: 'id' });
          
          if (tasksError) {
            console.warn(`⚠️ Error sincronizando tareas para proyecto ${projectId}:`, tasksError);
          }
        }
      }
      
      console.log('✅ Tareas sincronizadas');
    }
    
    // Sincronizar riesgos
    if (data.risksByProject) {
      console.log('🛡️ Sincronizando riesgos...');
      
      for (const projectId in data.risksByProject) {
        const risks = data.risksByProject[projectId];
        if (risks && risks.length > 0) {
          const risksToSync = risks.map(risk => ({
            ...risk,
            project_id: projectId,
            owner_id: user.id,
            updated_at: new Date().toISOString()
          }));
          
          const { error: risksError } = await supabase
            .from('risks')
            .upsert(risksToSync, { onConflict: 'id' });
          
          if (risksError) {
            console.warn(`⚠️ Error sincronizando riesgos para proyecto ${projectId}:`, risksError);
          }
        }
      }
      
      console.log('✅ Riesgos sincronizados');
    }
    
    console.log('✅ Sincronización completada');
    return true;
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return false;
  }
}

export default supabase;
