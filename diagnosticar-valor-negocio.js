/**
 * SCRIPT DE DIAGNÓSTICO DE VALOR DE NEGOCIO
 *
 * Este script verifica por qué la columna "Valor" no muestra datos
 * en el cronograma de tu proyecto.
 *
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (Cmd + Option + J en Safari)
 * 2. Copia y pega este script COMPLETO
 * 3. Presiona Enter
 * 4. Revisa el diagnóstico completo
 */

(function diagnosticarValorNegocio() {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE VALOR DE NEGOCIO...\n');

  try {
    // 1. Obtener datos de localStorage (clave correcta: "mi-dashboard-portfolio")
    const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
    const projects = portfolioData.projects || [];

    if (projects.length === 0) {
      console.error('❌ No se encontraron proyectos en localStorage');
      alert('❌ No se encontraron proyectos.\n\nAsegúrate de tener proyectos creados en la aplicación.');
      return;
    }

    // 2. Mostrar proyectos disponibles
    console.log('📁 Proyectos disponibles:');
    projects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
    });

    // 3. Pedir al usuario que seleccione el proyecto
    const projectPrompt = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const projectIndex = parseInt(prompt(
      `Selecciona el proyecto a diagnosticar:\n\n${projectPrompt}\n\nIngresa el número (1-${projects.length}):`
    )) - 1;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      console.error('❌ Número de proyecto inválido');
      alert('❌ Número de proyecto inválido. Ejecuta el script nuevamente.');
      return;
    }

    const selectedProject = projects[projectIndex];
    console.log('\n✅ Proyecto seleccionado:', selectedProject.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. DIAGNÓSTICO DEL PROYECTO
    console.log('📊 DIAGNÓSTICO DEL PROYECTO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const diagnostico = {
      presupuesto: selectedProject.budget || 0,
      tir: selectedProject.irr || 0,
      periodo: selectedProject.period || 3,
      plannedValue: selectedProject.plannedValue || 0
    };

    console.log(`   💰 Presupuesto: $${diagnostico.presupuesto.toLocaleString()}`);
    console.log(`   📈 TIR: ${diagnostico.tir}%`);
    console.log(`   📅 Periodo: ${diagnostico.periodo} años`);
    console.log(`   🎯 Valor Planificado: $${diagnostico.plannedValue.toLocaleString()}`);

    // 5. VERIFICAR PROBLEMA PRINCIPAL
    console.log('\n🔍 VERIFICANDO PROBLEMAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const problemas = [];
    const advertencias = [];

    // Problema 1: No hay plannedValue
    if (!diagnostico.plannedValue || diagnostico.plannedValue === 0) {
      problemas.push({
        tipo: 'CRÍTICO',
        mensaje: 'El proyecto NO tiene Valor Planificado (plannedValue) configurado',
        solucion: 'Ejecuta el script "calcular-planned-value.js" para calcularlo'
      });
    }

    // Problema 2: No hay presupuesto
    if (!diagnostico.presupuesto || diagnostico.presupuesto === 0) {
      problemas.push({
        tipo: 'CRÍTICO',
        mensaje: 'El proyecto NO tiene presupuesto configurado',
        solucion: 'Configura el presupuesto del proyecto en la vista "Vista Tabla - Cronograma"'
      });
    }

    // Problema 3: No hay TIR
    if (!diagnostico.tir || diagnostico.tir === 0) {
      advertencias.push({
        tipo: 'ADVERTENCIA',
        mensaje: 'El proyecto NO tiene TIR configurado',
        solucion: 'Configura la TIR del proyecto para un cálculo más preciso del valor'
      });
    }

    // 6. DIAGNÓSTICO DE TAREAS
    console.log('\n📋 DIAGNÓSTICO DE TAREAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const tasksByProject = portfolioData.tasksByProject || {};
    const tasks = tasksByProject[selectedProject.id] || [];

    if (tasks.length === 0) {
      problemas.push({
        tipo: 'CRÍTICO',
        mensaje: 'El proyecto NO tiene tareas',
        solucion: 'Crea tareas en el cronograma del proyecto'
      });
    } else {
      console.log(`   📊 Total de tareas: ${tasks.length}`);

      // Analizar tareas
      let tareasConValor = 0;
      let tareasSinValor = 0;
      let tareasConCosto = 0;
      let tareasSinCosto = 0;
      let costoTotal = 0;
      let valorTotal = 0;

      tasks.forEach(task => {
        const hasValue = task.businessValue && task.businessValue > 0;
        const hasCost = task.cost && task.cost > 0;

        if (hasValue) {
          tareasConValor++;
          valorTotal += task.businessValue;
        } else {
          tareasSinValor++;
        }

        if (hasCost) {
          tareasConCosto++;
          costoTotal += task.cost;
        } else {
          tareasSinCosto++;
        }
      });

      console.log(`   ✅ Tareas con valor de negocio: ${tareasConValor}`);
      console.log(`   ❌ Tareas sin valor de negocio: ${tareasSinValor}`);
      console.log(`   💰 Tareas con costo: ${tareasConCosto}`);
      console.log(`   ⚠️  Tareas sin costo: ${tareasSinCosto}`);
      console.log(`   💵 Costo total: $${costoTotal.toLocaleString()}`);
      console.log(`   🎯 Valor total de tareas: $${valorTotal.toLocaleString()}`);

      // Verificar si hay tareas sin valor
      if (tareasSinValor > 0) {
        problemas.push({
          tipo: 'PROBLEMA',
          mensaje: `${tareasSinValor} tareas NO tienen valor de negocio calculado`,
          solucion: 'Ejecuta el script "recalcular-business-value.js" para calcular los valores'
        });
      }

      // Verificar si hay tareas sin costo
      if (tareasSinCosto > 0) {
        advertencias.push({
          tipo: 'ADVERTENCIA',
          mensaje: `${tareasSinCosto} tareas NO tienen costo asignado`,
          solucion: 'Asigna costos a las tareas para un cálculo más preciso del valor'
        });
      }

      // Verificar consistencia de valores
      if (diagnostico.plannedValue > 0 && valorTotal > 0) {
        const diferencia = Math.abs(valorTotal - diagnostico.plannedValue);
        const porcentajeDif = (diferencia / diagnostico.plannedValue) * 100;

        console.log(`\n   📊 Comparación Valor Planificado vs Suma de Tareas:`);
        console.log(`      Valor Planificado Proyecto: $${diagnostico.plannedValue.toLocaleString()}`);
        console.log(`      Suma Valores de Tareas: $${valorTotal.toLocaleString()}`);
        console.log(`      Diferencia: $${diferencia.toLocaleString()} (${porcentajeDif.toFixed(2)}%)`);

        if (porcentajeDif > 5) {
          advertencias.push({
            tipo: 'ADVERTENCIA',
            mensaje: `Diferencia del ${porcentajeDif.toFixed(2)}% entre valor planificado y suma de tareas`,
            solucion: 'Ejecuta el script "recalcular-business-value.js" para sincronizar los valores'
          });
        }
      }
    }

    // 7. MOSTRAR RESUMEN DE PROBLEMAS
    console.log('\n📝 RESUMEN DE PROBLEMAS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (problemas.length === 0 && advertencias.length === 0) {
      console.log('✅ ¡NO SE ENCONTRARON PROBLEMAS!');
      console.log('\nTodo parece estar configurado correctamente.');
      console.log('Si aún no ves valores en la columna "Valor", intenta:');
      console.log('  1. Recargar la página (Cmd + R)');
      console.log('  2. Verificar que las tareas tengan costos y prioridades');
    } else {
      if (problemas.length > 0) {
        console.log('\n🔴 PROBLEMAS CRÍTICOS ENCONTRADOS:');
        problemas.forEach((p, i) => {
          console.log(`\n  ${i + 1}. ${p.mensaje}`);
          console.log(`     💡 Solución: ${p.solucion}`);
        });
      }

      if (advertencias.length > 0) {
        console.log('\n🟡 ADVERTENCIAS:');
        advertencias.forEach((a, i) => {
          console.log(`\n  ${i + 1}. ${a.mensaje}`);
          console.log(`     💡 Solución: ${a.solucion}`);
        });
      }
    }

    // 8. MOSTRAR CAUSA RAÍZ
    console.log('\n🎯 CAUSA RAÍZ DEL PROBLEMA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!diagnostico.plannedValue || diagnostico.plannedValue === 0) {
      console.log('❌ El proyecto NO tiene "Valor Planificado" (plannedValue) configurado.');
      console.log('\n📖 EXPLICACIÓN:');
      console.log('   La columna "Valor" muestra el "Valor de Negocio" de cada tarea,');
      console.log('   que se calcula distribuyendo el "Valor Planificado" del proyecto');
      console.log('   entre todas las tareas según su costo y prioridad.');
      console.log('\n   Sin un Valor Planificado del proyecto, no se puede calcular');
      console.log('   el valor de negocio de las tareas.');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   1. Ejecuta el script "calcular-planned-value.js"');
      console.log('   2. O configura manualmente la TIR y presupuesto en "Vista Tabla - Cronograma"');
    } else if (tareasSinValor > 0) {
      console.log('⚠️  Algunas tareas NO tienen valor de negocio calculado.');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   Ejecuta el script "recalcular-business-value.js" para calcular');
      console.log('   automáticamente el valor de negocio de todas las tareas.');
    } else {
      console.log('✅ Todo parece estar bien configurado.');
      console.log('\n   Si aún no ves valores en la columna "Valor":');
      console.log('   1. Recarga la página (Cmd + R)');
      console.log('   2. Verifica que estés viendo la columna correcta');
    }

    // 9. CREAR REPORTE DE ALERTA
    const alertLines = [];
    alertLines.push('📊 DIAGNÓSTICO DE VALOR DE NEGOCIO');
    alertLines.push('');
    alertLines.push(`Proyecto: ${selectedProject.name}`);
    alertLines.push('');

    if (problemas.length > 0) {
      alertLines.push(`🔴 ${problemas.length} problema(s) crítico(s) encontrado(s)`);
    }
    if (advertencias.length > 0) {
      alertLines.push(`🟡 ${advertencias.length} advertencia(s)`);
    }
    if (problemas.length === 0 && advertencias.length === 0) {
      alertLines.push('✅ No se encontraron problemas');
    }

    alertLines.push('');
    alertLines.push('Revisa la consola para más detalles.');

    alert(alertLines.join('\n'));

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack trace:', error.stack);
    alert(`❌ Error crítico:\n\n${error.message}\n\nVerifica la consola para más detalles.`);
  }
})();
