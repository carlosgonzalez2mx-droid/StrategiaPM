/**
 * SCRIPT PARA SINCRONIZAR VALORES DE LOCALSTORAGE A SUPABASE
 *
 * Este script toma los businessValue calculados en localStorage
 * y los sincroniza a la columna business_value en Supabase
 *
 * INSTRUCCIONES:
 * 1. Asegúrate de estar logueado en la aplicación
 * 2. Abre la consola del navegador (Cmd + Option + J en Safari)
 * 3. Copia y pega este script COMPLETO
 * 4. Presiona Enter
 * 5. Espera a que termine (puede tomar un momento)
 */

(async function sincronizarValoresASupabase() {
  console.log('🔄 INICIANDO SINCRONIZACIÓN A SUPABASE...\n');

  try {
    // 1. Verificar que supabaseService existe
    if (typeof window.supabaseService === 'undefined' || !window.supabaseService) {
      console.error('❌ supabaseService no está disponible');
      alert('❌ Error: supabaseService no está disponible.\n\nAsegúrate de estar en la aplicación StrategiaPM.');
      return;
    }

    const supabase = window.supabaseService.supabase;

    if (!supabase) {
      console.error('❌ Supabase no está inicializado');
      alert('❌ Error: Supabase no está inicializado.');
      return;
    }

    console.log('✅ Supabase está disponible\n');

    // 2. Obtener datos de localStorage
    const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
    const projects = portfolioData.projects || [];

    // 3. Buscar el proyecto "Carry over"
    const carryOverProject = projects.find(function(p) {
      return p.name && p.name.toLowerCase().includes('carry over');
    });

    if (!carryOverProject) {
      console.error('❌ No se encontró el proyecto "Carry over"');
      alert('❌ No se encontró el proyecto "Carry over".');
      return;
    }

    console.log('✅ Proyecto encontrado: ' + carryOverProject.name);
    console.log('   ID: ' + carryOverProject.id);
    console.log('   Valor Planificado: $' + (carryOverProject.plannedValue || 0).toLocaleString() + '\n');

    // 4. Obtener tareas del proyecto
    const tasksByProject = portfolioData.tasksByProject || {};
    const tasks = tasksByProject[carryOverProject.id] || [];

    if (tasks.length === 0) {
      console.error('❌ No se encontraron tareas para este proyecto');
      alert('❌ No se encontraron tareas.');
      return;
    }

    console.log('📋 Tareas a sincronizar: ' + tasks.length + '\n');

    // 5. Filtrar tareas con businessValue
    const tasksWithValue = tasks.filter(function(task) {
      return task.businessValue && task.businessValue > 0;
    });

    if (tasksWithValue.length === 0) {
      console.error('❌ Ninguna tarea tiene businessValue');
      alert('❌ Ninguna tarea tiene businessValue.\n\nEjecuta primero el script "recalcular-business-value-v2.js"');
      return;
    }

    console.log('✅ Tareas con valor: ' + tasksWithValue.length);

    const valorTotal = tasksWithValue.reduce(function(sum, task) {
      return sum + task.businessValue;
    }, 0);

    console.log('💰 Valor total a sincronizar: $' + valorTotal.toLocaleString() + '\n');

    // 6. Confirmar con el usuario
    const confirmLines = [
      '¿CONFIRMAS LA SINCRONIZACIÓN A SUPABASE?',
      '',
      'Proyecto: ' + carryOverProject.name,
      'Tareas a actualizar: ' + tasksWithValue.length,
      'Valor total: $' + valorTotal.toLocaleString(),
      '',
      'Esta acción actualizará la columna "business_value"',
      'en la base de datos de Supabase.',
      '',
      '¿Continuar?'
    ];

    if (!confirm(confirmLines.join('\n'))) {
      console.log('❌ Sincronización cancelada por el usuario');
      alert('❌ Sincronización cancelada');
      return;
    }

    // 7. Sincronizar cada tarea
    console.log('🔄 Iniciando sincronización...\n');

    let exitosas = 0;
    let errores = 0;
    const erroresDetallados = [];

    for (let i = 0; i < tasksWithValue.length; i++) {
      const task = tasksWithValue[i];

      console.log((i + 1) + '/' + tasksWithValue.length + ' - ' + task.name);
      console.log('   businessValue: $' + task.businessValue.toLocaleString());
      console.log('   Actualizando en Supabase...');

      try {
        const resultado = await supabase
          .from('tasks')
          .update({ business_value: task.businessValue })
          .eq('id', task.id)
          .eq('project_id', carryOverProject.id);

        if (resultado.error) {
          console.error('   ❌ Error:', resultado.error.message);
          errores++;
          erroresDetallados.push({
            tarea: task.name,
            error: resultado.error.message
          });
        } else {
          console.log('   ✅ Actualizada exitosamente');
          exitosas++;
        }
      } catch (error) {
        console.error('   ❌ Error inesperado:', error.message);
        errores++;
        erroresDetallados.push({
          tarea: task.name,
          error: error.message
        });
      }

      console.log('');
    }

    // 8. Resumen final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅✅✅ SINCRONIZACIÓN COMPLETADA ✅✅✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 RESUMEN:');
    console.log('   Tareas procesadas: ' + tasksWithValue.length);
    console.log('   ✅ Exitosas: ' + exitosas);
    console.log('   ❌ Errores: ' + errores);
    console.log('   💰 Valor total sincronizado: $' + valorTotal.toLocaleString() + '\n');

    if (erroresDetallados.length > 0) {
      console.error('❌ ERRORES DETALLADOS:');
      erroresDetallados.forEach(function(e, index) {
        console.error('   ' + (index + 1) + '. ' + e.tarea);
        console.error('      Error: ' + e.error);
      });
      console.log('');
    }

    console.log('🔄 RECARGA LA PÁGINA AHORA (Cmd + R) para ver los cambios');

    // Mostrar alerta de éxito
    const successLines = [
      exitosas > 0 ? '✅ SINCRONIZACIÓN EXITOSA' : '❌ SINCRONIZACIÓN FALLIDA',
      '',
      'Tareas actualizadas: ' + exitosas + '/' + tasksWithValue.length,
      'Valor total: $' + valorTotal.toLocaleString(),
      ''
    ];

    if (errores > 0) {
      successLines.push('⚠️  ' + errores + ' tareas con errores');
      successLines.push('Revisa la consola para detalles');
      successLines.push('');
    }

    successLines.push('🔄 RECARGA LA PÁGINA (Cmd + R)');
    successLines.push('para ver los valores en la columna "Valor"');

    alert(successLines.join('\n'));

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack trace:', error.stack);
    alert('❌ Error crítico:\n\n' + error.message + '\n\nVerifica la consola para más detalles.');
  }
})();
