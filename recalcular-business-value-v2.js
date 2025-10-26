/**
 * SCRIPT PARA RECALCULAR VALOR DE NEGOCIO DE TAREAS (VERSIÓN 2)
 *
 * Este script calcula automáticamente el "Valor de Negocio" (businessValue)
 * de todas las tareas de un proyecto, distribuyendo el "Valor Planificado"
 * del proyecto entre las tareas según:
 * - Costo de cada tarea
 * - Prioridad de cada tarea (peso: Crítica=2.0, Alta=1.5, Media=1.0, Baja=0.5)
 *
 * INSTRUCCIONES:
 * 1. Asegúrate de haber ejecutado "calcular-planned-value.js" primero
 * 2. Abre la consola del navegador (Cmd + Option + J en Safari)
 * 3. Copia y pega este script COMPLETO
 * 4. Presiona Enter
 * 5. Selecciona el proyecto
 * 6. Confirma el cálculo
 * 7. Recarga la página (Cmd + R)
 */

(function recalcularBusinessValue() {
  console.log('💼 INICIANDO RECÁLCULO DE VALOR DE NEGOCIO (V2)...\n');

  /**
   * Obtiene el peso numérico de una prioridad
   */
  function getPriorityWeight(priority) {
    const normalized = String(priority || 'medium').toLowerCase();

    const weights = {
      'critical': 2.0,
      'crítica': 2.0,
      'high': 1.5,
      'alta': 1.5,
      'medium': 1.0,
      'media': 1.0,
      'low': 0.5,
      'baja': 0.5
    };

    return weights[normalized] || 1.0;
  }

  /**
   * Calcula el valor de negocio de TODAS las tareas
   */
  function calculateAllTasksBusinessValue(tasks, projectPlannedValue) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.warn('⚠️ No hay tareas para calcular');
      return [];
    }

    if (!projectPlannedValue || projectPlannedValue <= 0) {
      console.warn('⚠️ Valor planificado es 0, asignando valor = costo');
      return tasks.map(function(task) {
        return Object.assign({}, task, {
          businessValue: task.cost || 0
        });
      });
    }

    // Calcular peso total
    let totalWeightedCost = 0;
    tasks.forEach(function(task) {
      const cost = task.cost || 0;
      const weight = getPriorityWeight(task.priority);
      totalWeightedCost += (cost * weight);
    });

    if (totalWeightedCost === 0) {
      console.warn('⚠️ Costo ponderado total es 0, distribuyendo equitativamente');
      const valuePerTask = Math.round(projectPlannedValue / tasks.length);
      return tasks.map(function(task) {
        return Object.assign({}, task, {
          businessValue: valuePerTask
        });
      });
    }

    // Calcular businessValue para cada tarea
    let remainingValue = projectPlannedValue;
    const tasksWithValue = [];

    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      const cost = task.cost || 0;
      const weight = getPriorityWeight(task.priority);
      const weightedCost = cost * weight;
      const proportion = weightedCost / totalWeightedCost;

      let businessValue;

      // Para la última tarea, asignar el valor restante
      if (index === tasks.length - 1) {
        businessValue = remainingValue;
      } else {
        businessValue = Math.round(projectPlannedValue * proportion);
        remainingValue -= businessValue;
      }

      tasksWithValue.push(Object.assign({}, task, {
        businessValue: Math.max(0, businessValue)
      }));
    }

    return tasksWithValue;
  }

  try {
    // 1. Obtener datos de localStorage
    const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
    const projects = portfolioData.projects || [];

    if (projects.length === 0) {
      console.error('❌ No se encontraron proyectos');
      alert('❌ No se encontraron proyectos.\n\nAsegúrate de tener proyectos creados.');
      return;
    }

    // 2. Mostrar proyectos disponibles
    console.log('📁 Proyectos disponibles:');
    projects.forEach(function(project, index) {
      console.log('  ' + (index + 1) + '. ' + project.name + ' (ID: ' + project.id + ')');
    });

    // 3. Pedir al usuario que seleccione el proyecto
    const projectPrompt = projects.map(function(p, i) {
      return (i + 1) + '. ' + p.name;
    }).join('\n');

    const projectIndex = parseInt(prompt(
      'Selecciona el proyecto para recalcular valores:\n\n' + projectPrompt +
      '\n\nIngresa el número (1-' + projects.length + '):'
    )) - 1;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      console.error('❌ Número de proyecto inválido');
      alert('❌ Número de proyecto inválido. Ejecuta el script nuevamente.');
      return;
    }

    const selectedProject = projects[projectIndex];
    console.log('\n✅ Proyecto seleccionado: ' + selectedProject.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Verificar que el proyecto tenga plannedValue
    if (!selectedProject.plannedValue || selectedProject.plannedValue === 0) {
      console.error('❌ El proyecto NO tiene Valor Planificado configurado');
      alert(
        '❌ ERROR: El proyecto NO tiene Valor Planificado.\n\n' +
        'Primero ejecuta el script "calcular-planned-value.js"\n' +
        'para calcular el Valor Planificado del proyecto.'
      );
      return;
    }

    console.log('📊 DATOS DEL PROYECTO:');
    console.log('   💰 Presupuesto: $' + (selectedProject.budget || 0).toLocaleString());
    console.log('   📈 TIR: ' + (selectedProject.irr || 0) + '%');
    console.log('   🎯 Valor Planificado: $' + selectedProject.plannedValue.toLocaleString() + '\n');

    // 5. Obtener tareas del proyecto
    const tasksByProject = portfolioData.tasksByProject || {};
    const currentTasks = tasksByProject[selectedProject.id] || [];

    if (currentTasks.length === 0) {
      console.error('❌ El proyecto NO tiene tareas');
      alert('❌ El proyecto "' + selectedProject.name + '" no tiene tareas.\n\nCrea tareas en el cronograma primero.');
      return;
    }

    console.log('📋 ANÁLISIS DE TAREAS ACTUAL:');
    console.log('   Total de tareas: ' + currentTasks.length);

    // Analizar estado actual
    let tareasConValor = 0;
    let tareasSinValor = 0;
    let tareasConCosto = 0;
    let tareasSinCosto = 0;
    let costoTotal = 0;
    let valorTotalActual = 0;

    currentTasks.forEach(function(task) {
      const hasValue = task.businessValue && task.businessValue > 0;
      const hasCost = task.cost && task.cost > 0;

      if (hasValue) {
        tareasConValor++;
        valorTotalActual += task.businessValue;
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

    console.log('   ✅ Con valor de negocio: ' + tareasConValor);
    console.log('   ❌ Sin valor de negocio: ' + tareasSinValor);
    console.log('   💰 Con costo: ' + tareasConCosto);
    console.log('   ⚠️  Sin costo: ' + tareasSinCosto);
    console.log('   💵 Costo total: $' + costoTotal.toLocaleString());
    console.log('   🎯 Valor total actual: $' + valorTotalActual.toLocaleString() + '\n');

    // 6. Calcular nuevos valores
    console.log('💡 CALCULANDO NUEVOS VALORES DE NEGOCIO...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const recalculatedTasks = calculateAllTasksBusinessValue(
      currentTasks,
      selectedProject.plannedValue
    );

    // Analizar nuevos valores
    let valorTotalNuevo = 0;
    let cambiosSignificativos = 0;

    recalculatedTasks.forEach(function(task, index) {
      valorTotalNuevo += task.businessValue;
      const valorAnterior = currentTasks[index].businessValue || 0;
      const diferencia = Math.abs(task.businessValue - valorAnterior);
      const porcentajeCambio = valorAnterior > 0 ? (diferencia / valorAnterior) * 100 : 100;

      if (porcentajeCambio > 10) {
        cambiosSignificativos++;
      }
    });

    console.log('📊 RESULTADO DEL CÁLCULO:');
    console.log('   Valor total calculado: $' + valorTotalNuevo.toLocaleString());
    console.log('   Valor planificado del proyecto: $' + selectedProject.plannedValue.toLocaleString());
    console.log('   Diferencia: $' + Math.abs(valorTotalNuevo - selectedProject.plannedValue).toLocaleString());
    console.log('   Tareas con cambios significativos (>10%): ' + cambiosSignificativos + '\n');

    // 7. Mostrar ejemplos de tareas con mayor valor
    console.log('🏆 TOP 10 TAREAS CON MAYOR VALOR DE NEGOCIO:');
    const sortedByValue = recalculatedTasks.slice().sort(function(a, b) {
      return b.businessValue - a.businessValue;
    });

    sortedByValue.slice(0, 10).forEach(function(task, index) {
      const priority = task.priority || 'media';
      const weight = getPriorityWeight(priority);
      const taskName = task.name.substring(0, 50) + (task.name.length > 50 ? '...' : '');
      console.log(
        '   ' + (index + 1) + '. ' + taskName + '\n' +
        '      💰 Costo: $' + (task.cost || 0).toLocaleString() + ' | ' +
        'Prioridad: ' + priority + ' (' + weight + 'x) | ' +
        'Valor: $' + task.businessValue.toLocaleString()
      );
    });

    // 8. Confirmar actualización
    const confirmLines = [
      '¿CONFIRMAS EL RECÁLCULO DE VALORES?',
      '',
      'Proyecto: ' + selectedProject.name,
      'Total de tareas: ' + recalculatedTasks.length,
      '',
      '🎯 Valor Planificado: $' + selectedProject.plannedValue.toLocaleString(),
      '💼 Valor total de tareas: $' + valorTotalNuevo.toLocaleString(),
      '',
      '✅ Tareas que recibirán valor: ' + tareasSinValor,
      '🔄 Tareas con cambios significativos: ' + cambiosSignificativos,
      ''
    ];

    if (tareasSinCosto > 0) {
      confirmLines.push('⚠️  ' + tareasSinCosto + ' tareas sin costo recibirán valor mínimo');
      confirmLines.push('');
    }

    confirmLines.push('Esta acción actualizará todas las tareas en localStorage.');
    confirmLines.push('');
    confirmLines.push('¿Continuar?');

    if (!confirm(confirmLines.join('\n'))) {
      console.log('❌ Recálculo cancelado por el usuario');
      alert('❌ Recálculo cancelado');
      return;
    }

    // 9. Guardar tareas actualizadas
    console.log('\n💾 GUARDANDO TAREAS ACTUALIZADAS EN LOCALSTORAGE...');

    portfolioData.tasksByProject[selectedProject.id] = recalculatedTasks;
    localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));

    console.log('✅ Tareas actualizadas exitosamente');

    // 10. Resumen final
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅✅✅ ¡VALORES DE NEGOCIO RECALCULADOS! ✅✅✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 RESUMEN:');
    console.log('   Proyecto: ' + selectedProject.name);
    console.log('   Total de tareas procesadas: ' + recalculatedTasks.length);
    console.log('   Valor Planificado del proyecto: $' + selectedProject.plannedValue.toLocaleString());
    console.log('   Valor total de tareas: $' + valorTotalNuevo.toLocaleString());
    console.log('   Tareas actualizadas: ' + (tareasSinValor + cambiosSignificativos));

    console.log('\n🔄 RECARGA LA PÁGINA AHORA (Cmd + R) para ver los cambios');

    // Mostrar alerta de éxito
    const successLines = [
      '✅ ¡VALORES DE NEGOCIO RECALCULADOS!',
      '',
      '📊 ' + recalculatedTasks.length + ' tareas procesadas',
      '💼 Valor total: $' + valorTotalNuevo.toLocaleString(),
      '',
      '🔄 RECARGA LA PÁGINA (Cmd + R)',
      'para ver los valores en la columna "Valor"'
    ];

    alert(successLines.join('\n'));

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack trace:', error.stack);
    alert('❌ Error crítico:\n\n' + error.message + '\n\nVerifica la consola para más detalles.');
  }
})();
