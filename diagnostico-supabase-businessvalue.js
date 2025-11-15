/**
 * Script de diagnóstico para verificar business_value en Supabase
 * Ejecutar en la consola del navegador DESPUÉS de presionar "💰 Valores"
 */

console.log('🔍 DIAGNÓSTICO DE BUSINESS_VALUE EN SUPABASE');
console.log('='.repeat(80));

// Obtener datos del portafolio
const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
const projectId = portfolioData.currentProjectId;

if (!projectId) {
  console.error('❌ No hay proyecto actual seleccionado');
} else {
  console.log('✅ Proyecto actual:', projectId);

  const project = portfolioData.projects?.find(p => p.id === projectId);
  if (project) {
    console.log('📊 Proyecto:', project.name);
    console.log('💰 Planned Value:', project.plannedValue || 'NO DEFINIDO');
  }

  const tasks = portfolioData.tasksByProject?.[projectId] || [];
  console.log(`📋 Total de tareas en localStorage: ${tasks.length}`);

  // Verificar tareas con businessValue
  const tasksWithValue = tasks.filter(t => t.businessValue && t.businessValue > 0);
  const tasksWithoutValue = tasks.filter(t => !t.businessValue || t.businessValue === 0);

  console.log(`✅ Tareas CON businessValue: ${tasksWithValue.length}`);
  console.log(`❌ Tareas SIN businessValue: ${tasksWithoutValue.length}`);

  if (tasksWithValue.length > 0) {
    console.log('\n📊 TAREAS CON VALOR (localStorage):');
    tasksWithValue.slice(0, 5).forEach(t => {
      console.log(`  - ${t.name}: $${t.businessValue?.toLocaleString() || 0}`);
    });
  }

  // AHORA VERIFICAR EN SUPABASE
  console.log('\n🔍 VERIFICANDO SUPABASE...');
  console.log('Ejecutando query directa a Supabase...');

  // Obtener cliente de Supabase
  const supabaseUrl = 'https://ogqpsrsssrrytrqoyyph.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg';

  fetch(`${supabaseUrl}/rest/v1/tasks?project_id=eq.${projectId}&select=id,name,cost,business_value`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(`\n✅ Tareas desde SUPABASE: ${data.length}`);

    const supabaseTasksWithValue = data.filter(t => t.business_value && t.business_value > 0);
    const supabaseTasksWithoutValue = data.filter(t => !t.business_value || t.business_value === 0);

    console.log(`✅ Tareas CON business_value en Supabase: ${supabaseTasksWithValue.length}`);
    console.log(`❌ Tareas SIN business_value en Supabase: ${supabaseTasksWithoutValue.length}`);

    if (supabaseTasksWithValue.length > 0) {
      console.log('\n📊 TAREAS CON VALOR (Supabase):');
      supabaseTasksWithValue.slice(0, 5).forEach(t => {
        console.log(`  - ${t.name}: $${t.business_value?.toLocaleString() || 0}`);
      });
    }

    // COMPARAR
    console.log('\n🔎 COMPARACIÓN localStorage vs Supabase:');
    tasks.forEach(localTask => {
      const supabaseTask = data.find(st => st.id === localTask.id);
      if (supabaseTask) {
        const localValue = localTask.businessValue || 0;
        const supabaseValue = supabaseTask.business_value || 0;

        if (localValue !== supabaseValue) {
          console.warn(`⚠️ DIFERENCIA en "${localTask.name}":`);
          console.warn(`   localStorage: $${localValue.toLocaleString()}`);
          console.warn(`   Supabase: $${supabaseValue.toLocaleString()}`);
        }
      }
    });

    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
  })
  .catch(error => {
    console.error('❌ Error consultando Supabase:', error);
  });
}
