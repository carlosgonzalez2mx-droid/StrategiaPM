/**
 * Script de prueba para el flujo de suscripciones
 *
 * Este script te ayuda a:
 * 1. Ver el plan actual de tu organización
 * 2. Cambiar el plan a "Free" para probar límites
 * 3. Verificar límites de proyectos
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.log('Asegúrate de tener REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en tu .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrganizationFromLocalStorage() {
  // En Node.js no tenemos acceso a localStorage, pero podemos pedir el ID
  console.log('\n📋 Para ejecutar este script, necesitas el ID de tu organización.');
  console.log('Puedes encontrarlo en el localStorage de tu navegador:');
  console.log('  1. Abre la consola del navegador (F12)');
  console.log('  2. Ve a la pestaña "Application" > "Local Storage"');
  console.log('  3. Busca la clave "strategiapm_portfolio_data"');
  console.log('  4. Copia el valor de "organization.id"\n');

  // Para simplificar, usaremos el primer organization que encontremos
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error obteniendo organización:', error);
    return null;
  }

  if (!orgs || orgs.length === 0) {
    console.error('❌ No se encontraron organizaciones');
    return null;
  }

  return orgs[0];
}

async function viewCurrentPlan(orgId) {
  console.log('\n🔍 Consultando plan actual...\n');

  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      subscription_plan,
      subscription_status,
      max_projects,
      max_users,
      subscription_start_date,
      trial_ends_at
    `)
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return null;
  }

  console.log('📊 Información del Plan Actual:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Organización: ${data.name}`);
  console.log(`Plan: ${data.subscription_plan || 'No definido'}`);
  console.log(`Estado: ${data.subscription_status || 'No definido'}`);
  console.log(`Límite de Proyectos: ${data.max_projects === null ? 'Ilimitado' : data.max_projects}`);
  console.log(`Límite de Usuarios: ${data.max_users === null ? 'Ilimitado' : data.max_users}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return data;
}

async function countCurrentProjects(orgId) {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) {
    console.error('❌ Error contando proyectos:', error);
    return 0;
  }

  return count || 0;
}

async function changePlanToFree(orgId) {
  console.log('\n🔄 Cambiando plan a "Free"...\n');

  const { data, error } = await supabase
    .from('organizations')
    .update({
      subscription_plan: 'free',
      subscription_status: 'active',
      max_projects: 1,
      max_users: 3,
      subscription_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error cambiando plan:', error);
    return false;
  }

  console.log('✅ Plan cambiado exitosamente a "Free"');
  console.log('   - Límite de proyectos: 1');
  console.log('   - Límite de usuarios: 3\n');

  return true;
}

async function changePlanToProfessional(orgId) {
  console.log('\n🔄 Cambiando plan a "Professional"...\n');

  const { data, error } = await supabase
    .from('organizations')
    .update({
      subscription_plan: 'professional',
      subscription_status: 'active',
      max_projects: null,
      max_users: null,
      subscription_start_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error cambiando plan:', error);
    return false;
  }

  console.log('✅ Plan cambiado exitosamente a "Professional"');
  console.log('   - Proyectos ilimitados');
  console.log('   - Usuarios ilimitados\n');

  return true;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   🧪 Test de Flujo de Suscripciones      ║');
  console.log('╚════════════════════════════════════════════╝');

  // Obtener organización
  const org = await getOrganizationFromLocalStorage();
  if (!org) {
    console.error('❌ No se pudo obtener la organización');
    process.exit(1);
  }

  console.log(`\n✅ Organización encontrada: ${org.name} (${org.id})\n`);

  // Ver plan actual
  const currentPlan = await viewCurrentPlan(org.id);

  // Contar proyectos actuales
  const projectCount = await countCurrentProjects(org.id);
  console.log(`📊 Proyectos actuales: ${projectCount}\n`);

  // Menú de opciones
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Opciones de Prueba:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  Para probar el LÍMITE de proyectos:');
  console.log('   - Ejecuta: node test-subscription-flow.js set-free');
  console.log('   - Luego ve a la app y trata de crear un segundo proyecto');
  console.log('   - Deberías ver el modal de upgrade\n');

  console.log('2️⃣  Para volver a ILIMITADO:');
  console.log('   - Ejecuta: node test-subscription-flow.js set-professional\n');

  console.log('3️⃣  Para ver el plan actual:');
  console.log('   - Ejecuta: node test-subscription-flow.js view\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Manejo de argumentos de línea de comandos
const command = process.argv[2];

(async () => {
  const org = await getOrganizationFromLocalStorage();
  if (!org) {
    console.error('❌ No se pudo obtener la organización');
    process.exit(1);
  }

  switch(command) {
    case 'set-free':
      await viewCurrentPlan(org.id);
      await changePlanToFree(org.id);
      await viewCurrentPlan(org.id);
      console.log('💡 Ahora ve a la app e intenta crear un segundo proyecto para ver el modal de upgrade.\n');
      break;

    case 'set-professional':
      await viewCurrentPlan(org.id);
      await changePlanToProfessional(org.id);
      await viewCurrentPlan(org.id);
      break;

    case 'view':
      await viewCurrentPlan(org.id);
      const count = await countCurrentProjects(org.id);
      console.log(`📊 Proyectos actuales: ${count}\n`);
      break;

    default:
      await main();
      break;
  }
})();
