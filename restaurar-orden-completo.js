/**
 * SCRIPT DE RESTAURACIÓN DE ORDEN - LISTO PARA EJECUTAR
 *
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (Cmd + Option + J en Safari)
 * 2. Copia y pega este script COMPLETO
 * 3. Presiona Enter
 * 4. Selecciona el proyecto cuando te lo pida
 * 5. Confirma la restauración
 * 6. Recarga la página (Cmd + R)
 */

(function restaurarOrdenCompleto() {
  console.log('🔧 INICIANDO RESTAURACIÓN DE ORDEN DE TAREAS...');

  // ORDEN CORRECTO DE LAS TAREAS (del Excel)
  const ordenCorrecto = [
    "Visita y cotización Istem para modificación Fase 1",
    "Elaboración OC Fase 1: 430, 1kg y 2.8kg con pad",
    "HITO: OC Fase 1 completada",
    "Modificación de receta de SMI para colocación de Pad",
    "Pruebas con producto terminado",
    "Pruebas de almacenamiento",
    "HITO: Fase 1 terminada",
    "Fase 2: Aprobación y alta del activo en SAP",
    "Generación de edital",
    "Envío de editales a proveedores",
    "Solución de dudas técnicas",
    "Selección de proveedor",
    "Preparación de contrato con área legal",
    "Alta del proveedor en sistema y para factoraje",
    "Definición del equipo de proyecto",
    "Kick-off meeting con proveedor",
    "HITO: Orden de compra Carton Less realizada",
    "Evaluación del equipo actual",
    "Ingeniería de modificaciones mecánicas (transp y SMI)",
    "Plan de paradas de línea para modificación",
    "Programar 1er anticipo (30%)",
    "HITO: Diseño Aprobado",
    "Programar 1er anticipo (30%)",
    "Coordinación de paradas de producción",
    "HITO: 1er anticipo pagado (30%)",
    "Fabricación de componentes mecánicos nuevos",
    "Modificación de componentes existentes",
    "Programación de recetas para nuevos formatos",
    "Pruebas en simulador/banco de pruebas",
    "Control de calidad de componentes",
    "HITO: Componentes mecánicos fabricados",
    "Programar pago 2o anticipo (60%)",
    "HITO: Pago 2o anticipo (60%)",
    "Desmontaje de componentes a modificar",
    "Instalación de nuevos componentes mecánicos",
    "Modificación de sistema de alimentación",
    "Modificación de sistema de film plástico",
    "Conexiones eléctricas y neumáticas",
    "Instalación de nuevo software",
    "HITO: Instalación Completa en Ll Lletejado",
    "Programar pago 3er anticipo (10%)",
    "HITO: Pago 3er anticipo (10%)",
    "Pruebas de funcionamiento básico",
    "Calibración de sensores y actuadores",
    "Pruebas con formato 380 solo film",
    "HITO: Todas las Pruebas Exitosas",
    "Capacitación a operadores de línea",
    "Capacitación a técnicos de mantenimiento",
    "Capacitación en nuevas recetas y formatos",
    "Entrega de documentación actualizada",
    "HITO: Personal Capacitado",
    "Producción piloto con nuevos formatos",
    "Medición de eficiencias y rendimientos",
    "Validación de calidad en producción",
    "Aprobación final para producción normal",
    "HITO: Validación Aprobada",
    "Evaluación post-implementación",
    "Documentación final actualizada",
    "Entrega de garantías",
    "Cierre administrativo y financiero",
    "Plan de paradas de línea para modificación",
    "HITO: Proyecto cerrado"
  ];

  console.log('📊 Tareas en orden correcto definidas:', ordenCorrecto.length);

  try {
    // Obtener datos de localStorage
    const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
    const projects = portfolioData.projects || [];

    if (projects.length === 0) {
      console.error('❌ No se encontraron proyectos en localStorage');
      alert('❌ No se encontraron proyectos.\n\nAsegúrate de tener proyectos creados en la aplicación.');
      return;
    }

    // Mostrar proyectos disponibles
    console.log('📁 Proyectos disponibles:');
    projects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
    });

    // Pedir al usuario que seleccione el proyecto
    const projectPrompt = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const projectIndex = parseInt(prompt(
      `Selecciona el proyecto a corregir:\n\n${projectPrompt}\n\nIngresa el número (1-${projects.length}):`
    )) - 1;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      console.error('❌ Número de proyecto inválido');
      alert('❌ Número de proyecto inválido. Ejecuta el script nuevamente.');
      return;
    }

    const selectedProject = projects[projectIndex];
    console.log('✅ Proyecto seleccionado:', selectedProject.name);

    // Obtener las tareas del proyecto
    const tasksByProject = portfolioData.tasksByProject || {};
    const currentTasks = tasksByProject[selectedProject.id] || [];

    if (currentTasks.length === 0) {
      console.error('❌ No se encontraron tareas en el proyecto seleccionado');
      alert(`❌ El proyecto "${selectedProject.name}" no tiene tareas.`);
      return;
    }

    console.log('📊 Tareas actuales en el proyecto:', currentTasks.length);
    console.log('🔍 Primeras 5 tareas actuales:', currentTasks.slice(0, 5).map(t => t.name));

    // Crear un mapa de nombre → tarea completa (normalizado para comparación)
    const taskMap = new Map();
    currentTasks.forEach(task => {
      const normalizedName = task.name.trim().toLowerCase();
      taskMap.set(normalizedName, task);
    });

    console.log('📋 Mapa de tareas creado con', taskMap.size, 'tareas');

    // Reordenar las tareas según el orden del Excel
    const reorderedTasks = [];
    const notFoundTasks = [];

    ordenCorrecto.forEach((nombreTarea, index) => {
      const normalizedName = nombreTarea.trim().toLowerCase();
      const matchingTask = taskMap.get(normalizedName);

      if (matchingTask) {
        // Encontrada - agregar a la lista reordenada con nuevo wbsCode
        reorderedTasks.push({
          ...matchingTask,
          wbsCode: index + 1  // Asignar wbsCode secuencial
        });
        taskMap.delete(normalizedName); // Marcar como procesada
      } else {
        // No encontrada - agregar a la lista de no encontradas
        notFoundTasks.push(nombreTarea);
      }
    });

    // Agregar tareas que están en la app pero no en el Excel (al final)
    const remainingTasks = Array.from(taskMap.values());
    remainingTasks.forEach((task) => {
      console.warn(`⚠️ Tarea en app NO encontrada en Excel: "${task.name}"`);
      reorderedTasks.push({
        ...task,
        wbsCode: reorderedTasks.length + 1
      });
    });

    console.log('✅ Tareas reordenadas correctamente:', reorderedTasks.length);
    console.log('🔍 Primeras 10 tareas en el nuevo orden:');
    reorderedTasks.slice(0, 10).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name} (wbsCode: ${t.wbsCode})`);
    });

    if (notFoundTasks.length > 0) {
      console.warn('⚠️ Tareas del Excel NO encontradas en la app:', notFoundTasks.length);
      console.warn('Lista completa de tareas no encontradas:');
      notFoundTasks.forEach((taskName, index) => {
        console.warn(`  ${index + 1}. "${taskName}"`);
      });
    }

    if (remainingTasks.length > 0) {
      console.warn('⚠️ Tareas en la app NO encontradas en el Excel:', remainingTasks.length);
      console.warn('Estas tareas se agregarán al final del cronograma:');
      remainingTasks.forEach((task, index) => {
        console.warn(`  ${index + 1}. "${task.name}"`);
      });
    }

    // Construir mensaje de confirmación
    const confirmLines = [
      '¿CONFIRMAS LA RESTAURACIÓN DEL ORDEN?',
      '',
      `📊 Total de tareas: ${reorderedTasks.length}`,
      `✅ Tareas coincidentes: ${reorderedTasks.length - remainingTasks.length}`,
      `⚠️ Tareas del Excel no encontradas: ${notFoundTasks.length}`,
      `⚠️ Tareas de la app no en Excel: ${remainingTasks.length}`,
      '',
      'Primeras 5 tareas en el nuevo orden:'
    ];

    reorderedTasks.slice(0, 5).forEach((t, i) => {
      confirmLines.push(`${i + 1}. ${t.name}`);
    });

    confirmLines.push('');
    confirmLines.push('⚠️ Esta acción NO se puede deshacer fácilmente.');
    confirmLines.push('');
    confirmLines.push('¿Continuar?');

    const confirmMessage = confirmLines.join('\n');

    if (!confirm(confirmMessage)) {
      console.log('❌ Restauración cancelada por el usuario');
      alert('❌ Restauración cancelada');
      return;
    }

    // Actualizar localStorage
    console.log('💾 Guardando en localStorage...');
    portfolioData.tasksByProject[selectedProject.id] = reorderedTasks;
    localStorage.setItem('portfolioData', JSON.stringify(portfolioData));

    console.log('✅✅✅ ¡ORDEN RESTAURADO EXITOSAMENTE! ✅✅✅');
    console.log('');
    console.log('📊 RESUMEN FINAL:');
    console.log(`   - Total de tareas: ${reorderedTasks.length}`);
    console.log(`   - Tareas reordenadas: ${reorderedTasks.length - remainingTasks.length}`);
    console.log(`   - Tareas no encontradas en Excel: ${notFoundTasks.length}`);
    console.log(`   - Tareas no encontradas en app: ${remainingTasks.length}`);
    console.log('');
    console.log('🔄 RECARGA LA PÁGINA AHORA (Cmd + R) para ver los cambios');

    const successLines = [
      '✅ ¡ORDEN RESTAURADO EXITOSAMENTE!',
      '',
      `📊 ${reorderedTasks.length} tareas procesadas`,
      `✅ ${reorderedTasks.length - remainingTasks.length} tareas reordenadas`,
      '',
      '🔄 RECARGA LA PÁGINA (Cmd + R) para ver los cambios'
    ];

    if (notFoundTasks.length > 0) {
      successLines.push('');
      successLines.push(`⚠️ ${notFoundTasks.length} tareas del Excel no se encontraron en la app`);
    }

    if (remainingTasks.length > 0) {
      successLines.push(`⚠️ ${remainingTasks.length} tareas de la app se agregaron al final`);
    }

    alert(successLines.join('\n'));

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack trace:', error.stack);
    alert(`❌ Error crítico:\n\n${error.message}\n\nVerifica la consola para más detalles.`);
  }
})();
