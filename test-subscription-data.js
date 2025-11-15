// Script de prueba - Verificar datos de suscripción en la aplicación
// Ejecutar esto en la consola del navegador después de iniciar sesión

console.log('🧪 PRUEBA DE DATOS DE SUSCRIPCIÓN');
console.log('=====================================\n');

// 1. Verificar que portfolioData existe
if (typeof portfolioData !== 'undefined' && portfolioData) {
  console.log('✅ portfolioData está disponible');

  // 2. Verificar datos de organización
  if (portfolioData.organization) {
    console.log('✅ Organization data cargada\n');

    console.log('📊 DATOS DE ORGANIZACIÓN:');
    console.log('  Nombre:', portfolioData.organization.name);
    console.log('  ID:', portfolioData.organization.id);
    console.log('  Plan (camelCase):', portfolioData.organization.subscriptionPlan);
    console.log('  Plan (snake_case):', portfolioData.organization.subscription_plan);
    console.log('  Estado:', portfolioData.organization.subscriptionStatus || portfolioData.organization.subscription_status);
    console.log('  Max Proyectos:', portfolioData.organization.maxProjects || portfolioData.organization.max_projects || 'Ilimitado');
    console.log('  Max Usuarios:', portfolioData.organization.maxUsers || portfolioData.organization.max_users || 'Ilimitado');

    // Verificar si es legacy
    const plan = portfolioData.organization.subscriptionPlan || portfolioData.organization.subscription_plan;
    if (plan === 'legacy') {
      console.log('\n✅ CONFIRMADO: Organización en plan LEGACY (sin límites)');
    } else {
      console.log('\n⚠️ ADVERTENCIA: Organización NO es legacy. Plan actual:', plan);
    }
  } else {
    console.log('❌ Organization data NO disponible');
  }

  // 3. Verificar conteo actual de recursos
  console.log('\n📈 USO ACTUAL:');
  const projectCount = portfolioData.projects?.length || 0;
  console.log('  Proyectos activos:', projectCount);

} else {
  console.log('❌ portfolioData NO está disponible en window');
  console.log('💡 Asegúrate de haber iniciado sesión y cargado el portfolio');
}

console.log('\n=====================================');
console.log('🔧 SIGUIENTE PASO: Probar SubscriptionService\n');

// Instrucciones para probar el servicio
console.log('Para probar el servicio, ejecuta en la consola:');
console.log(`
// Importar servicio (ajusta la ruta según sea necesario)
import subscriptionService from './services/SubscriptionService';

// Obtener ID de tu organización
const orgId = portfolioData.organization.id;

// Probar métodos
const subscription = await subscriptionService.getOrganizationSubscription(orgId);
console.log('Suscripción:', subscription);

const usage = await subscriptionService.getUsageStats(orgId);
console.log('Uso:', usage);

const canCreate = await subscriptionService.canCreateProject(orgId);
console.log('Puede crear proyecto:', canCreate);

const canAddUser = await subscriptionService.canAddUser(orgId);
console.log('Puede agregar usuario:', canAddUser);
`);
