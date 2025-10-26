/**
 * SCRIPT DE RESTAURACIÓN DE ORDEN DE TAREAS
 *
 * Este script restaura el orden correcto de las tareas basándose en un archivo Excel
 * mientras preserva todo el progreso, minutas, y datos actualizados.
 *
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (F12 → Console)
 * 2. Copia y pega este script completo
 * 3. Presiona Enter
 * 4. Sigue las instrucciones en pantalla
 */

(async function restoreTaskOrder() {
  console.log('🔧 INICIANDO RESTAURACIÓN DE ORDEN DE TAREAS...');

  // Crear elemento de input para el archivo
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.xls';

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.error('❌ No se seleccionó ningún archivo');
      return;
    }

    console.log('📂 Archivo seleccionado:', file.name);

    try {
      // Importar XLSX dinámicamente
      const XLSX = window.XLSX;
      if (!XLSX) {
        console.error('❌ XLSX no está disponible. Asegúrate de estar en la página del cronograma.');
        return;
      }

      // Leer el archivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      console.log('📊 Archivo Excel leído:', rows.length, 'filas');

      // Encontrar la fila de encabezados
      let headerRowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.some(cell => String(cell).toLowerCase().includes('tarea') || String(cell).toLowerCase().includes('nombre'))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        console.error('❌ No se encontró la fila de encabezados en el Excel');
        return;
      }

      console.log('📋 Encabezados encontrados en fila:', headerRowIndex + 1);

      // Extraer nombres de tareas del Excel (en orden correcto)
      const taskNamesInOrder = [];
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        // Buscar la columna de "Tarea" o "Nombre"
        const taskName = row[1] || row[0]; // Generalmente en columna A o B
        if (taskName && String(taskName).trim()) {
          taskNamesInOrder.push(String(taskName).trim());
        }
      }

      console.log('📝 Tareas extraídas del Excel (orden correcto):', taskNamesInOrder.length);
      console.log('Primera tarea:', taskNamesInOrder[0]);
      console.log('Última tarea:', taskNamesInOrder[taskNamesInOrder.length - 1]);

      // Obtener las tareas actuales de localStorage
      const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
      const projects = portfolioData.projects || [];

      if (projects.length === 0) {
        console.error('❌ No se encontraron proyectos en localStorage');
        return;
      }

      // Mostrar proyectos disponibles
      console.log('📁 Proyectos disponibles:');
      projects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
      });

      // Pedir al usuario que seleccione el proyecto
      const projectIndex = parseInt(prompt(`Ingresa el número del proyecto a corregir (1-${projects.length}):`)) - 1;

      if (projectIndex < 0 || projectIndex >= projects.length) {
        console.error('❌ Número de proyecto inválido');
        return;
      }

      const selectedProject = projects[projectIndex];
      console.log('✅ Proyecto seleccionado:', selectedProject.name);

      // Obtener las tareas del proyecto
      const tasksByProject = portfolioData.tasksByProject || {};
      const currentTasks = tasksByProject[selectedProject.id] || [];

      if (currentTasks.length === 0) {
        console.error('❌ No se encontraron tareas en el proyecto seleccionado');
        return;
      }

      console.log('📊 Tareas actuales en el proyecto:', currentTasks.length);
      console.log('🔍 Orden actual:', currentTasks.map(t => t.name).slice(0, 5));

      // Crear un mapa de nombre → tarea completa
      const taskMap = new Map();
      currentTasks.forEach(task => {
        // Normalizar el nombre para comparación (eliminar espacios extras, etc.)
        const normalizedName = task.name.trim().toLowerCase();
        taskMap.set(normalizedName, task);
      });

      // Reordenar las tareas según el orden del Excel
      const reorderedTasks = [];
      const notFoundTasks = [];

      taskNamesInOrder.forEach((excelTaskName, index) => {
        const normalizedExcelName = excelTaskName.trim().toLowerCase();
        const matchingTask = taskMap.get(normalizedExcelName);

        if (matchingTask) {
          // Encontrada - agregar a la lista reordenada con nuevo wbsCode
          reorderedTasks.push({
            ...matchingTask,
            wbsCode: index + 1  // Asignar wbsCode secuencial
          });
          taskMap.delete(normalizedExcelName); // Marcar como procesada
        } else {
          notFoundTasks.push(excelTaskName);
        }
      });

      // Agregar tareas que están en la app pero no en el Excel (al final)
      const remainingTasks = Array.from(taskMap.values());
      remainingTasks.forEach((task, index) => {
        reorderedTasks.push({
          ...task,
          wbsCode: reorderedTasks.length + 1
        });
      });

      console.log('✅ Tareas reordenadas:', reorderedTasks.length);
      console.log('🔍 Nuevo orden:', reorderedTasks.map(t => t.name).slice(0, 10));

      if (notFoundTasks.length > 0) {
        console.warn('⚠️ Tareas del Excel no encontradas en la app:', notFoundTasks.length);
        console.warn('Primeras 5:', notFoundTasks.slice(0, 5));
      }

      if (remainingTasks.length > 0) {
        console.warn('⚠️ Tareas en la app no encontradas en Excel:', remainingTasks.length);
        console.warn('Se agregaron al final:', remainingTasks.map(t => t.name));
      }

      // Confirmar con el usuario
      const confirmMessage = `
¿Confirmas la restauración del orden?

📊 Total de tareas: ${reorderedTasks.length}
✅ Tareas reordenadas correctamente: ${reorderedTasks.length - remainingTasks.length}
⚠️ Tareas no encontradas en Excel (agregadas al final): ${remainingTasks.length}

Primeras 5 tareas en el nuevo orden:
${reorderedTasks.slice(0, 5).map((t, i) => `${i + 1}. ${t.name}`).join('\n')}

⚠️ Esta acción no se puede deshacer fácilmente.
`;

      if (!confirm(confirmMessage)) {
        console.log('❌ Restauración cancelada por el usuario');
        return;
      }

      // Actualizar localStorage
      portfolioData.tasksByProject[selectedProject.id] = reorderedTasks;
      localStorage.setItem('portfolioData', JSON.stringify(portfolioData));

      console.log('✅ ORDEN RESTAURADO EXITOSAMENTE');
      console.log('🔄 Recarga la página para ver los cambios');

      alert('✅ Orden restaurado exitosamente!\n\n🔄 Recarga la página (F5) para ver los cambios.');

    } catch (error) {
      console.error('❌ Error al procesar el archivo:', error);
      alert('❌ Error al procesar el archivo. Verifica la consola para más detalles.');
    }
  };

  // Mostrar instrucciones
  console.log('📂 Selecciona el archivo Excel con el orden correcto...');
  fileInput.click();
})();
