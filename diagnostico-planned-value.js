/**
 * Script de diagnóstico para verificar plannedValue en proyectos
 * Ejecutar en la consola del navegador
 */

console.log('🔍 DIAGNÓSTICO DE PLANNED VALUE');
console.log('='.repeat(60));

// Obtener datos del portafolio
const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');

if (!portfolioData.projects || portfolioData.projects.length === 0) {
  console.log('❌ No se encontraron proyectos en localStorage');
} else {
  console.log(`✅ Se encontraron ${portfolioData.projects.length} proyecto(s)\n`);

  portfolioData.projects.forEach((project, index) => {
    console.log(`\n📊 PROYECTO ${index + 1}: ${project.name}`);
    console.log('─'.repeat(60));
    console.log('📌 ID:', project.id);
    console.log('💰 Presupuesto (budget):', project.budget ? `$${project.budget.toLocaleString()}` : 'NO DEFINIDO');
    console.log('📈 TIR (irr):', project.irr !== undefined ? `${project.irr}%` : 'NO DEFINIDO');
    console.log('📅 Periodo (period):', project.period || 'NO DEFINIDO');
    console.log('💎 Planned Value:', project.plannedValue !== undefined ? `$${project.plannedValue.toLocaleString()}` : '❌ NO EXISTE');

    // Calcular el plannedValue esperado
    if (project.budget && project.irr) {
      const period = project.period || 3;
      const expectedPlannedValue = project.budget * Math.pow(1 + (project.irr / 100), period);
      console.log('\n🧮 CÁLCULO ESPERADO:');
      console.log(`   Fórmula: ${project.budget.toLocaleString()} × (1 + ${project.irr}%)^${period}`);
      console.log(`   Resultado esperado: $${Math.round(expectedPlannedValue).toLocaleString()}`);

      if (project.plannedValue !== undefined) {
        const difference = Math.abs(project.plannedValue - expectedPlannedValue);
        const percentDiff = (difference / expectedPlannedValue) * 100;

        if (difference < 1) {
          console.log('   ✅ El plannedValue guardado coincide con el esperado');
        } else {
          console.log(`   ⚠️ Diferencia: $${Math.round(difference).toLocaleString()} (${percentDiff.toFixed(2)}%)`);
        }
      } else {
        console.log('   ❌ PROBLEMA: plannedValue NO está guardado en el proyecto');
        console.log('   💡 SOLUCIÓN: Edita el proyecto y guárdalo de nuevo');
      }
    } else {
      console.log('\n⚠️ No se puede calcular plannedValue (faltan budget o TIR)');
    }

    // Verificar tareas del proyecto
    const tasks = portfolioData.tasksByProject?.[project.id] || [];
    console.log(`\n📋 TAREAS: ${tasks.length} tarea(s)`);

    if (tasks.length > 0) {
      const tasksWithValue = tasks.filter(t => t.businessValue > 0);
      const tasksWithoutValue = tasks.filter(t => !t.businessValue || t.businessValue === 0);
      const totalBusinessValue = tasks.reduce((sum, t) => sum + (t.businessValue || 0), 0);

      console.log(`   ✅ Con valor de negocio: ${tasksWithValue.length}`);
      console.log(`   ❌ Sin valor de negocio: ${tasksWithoutValue.length}`);
      console.log(`   💰 Suma total de valores: $${totalBusinessValue.toLocaleString()}`);

      if (project.plannedValue && totalBusinessValue > 0) {
        const coverage = (totalBusinessValue / project.plannedValue) * 100;
        console.log(`   📊 Cobertura: ${coverage.toFixed(1)}% del plannedValue`);
      }
    }
  });
}

console.log('\n' + '='.repeat(60));
console.log('🏁 FIN DEL DIAGNÓSTICO');
console.log('\n💡 RECOMENDACIONES:');
console.log('1. Si plannedValue NO EXISTE: Edita el proyecto, modifica el TIR y guárdalo');
console.log('2. Si plannedValue EXISTE pero las tareas no tienen valor: Usa el botón "💰 Valores" en el cronograma');
console.log('3. Si el botón "💰 Valores" no aparece: Es porque plannedValue = 0 en el proyecto');
