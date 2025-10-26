// Script para reordenar las tareas del proyecto P1: Sopladora de botella de Vinagre
// Ejecutar en la consola del navegador

(function() {
  console.log('🔧 Iniciando reordenamiento de tareas del proyecto P1: Sopladora de botella de Vinagre...');
  
  // Obtener datos del portfolio
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  const projects = portfolioData.projects || [];
  const tasksByProject = portfolioData.tasksByProject || {};
  
  // Buscar el proyecto P1: Sopladora de botella de Vinagre
  let targetProject = null;
  for (const project of projects) {
    const name = project.name.toLowerCase();
    if (name.includes('sopladora') || name.includes('vinagre') || name.includes('p1')) {
      targetProject = project;
      break;
    }
  }
  
  if (!targetProject) {
    console.log('❌ No se encontró el proyecto P1: Sopladora de botella de Vinagre');
    return;
  }
  
  console.log(`✅ Proyecto encontrado: "${targetProject.name}"`);
  
  // Obtener tareas del proyecto
  const tasks = tasksByProject[targetProject.id] || [];
  console.log(`📋 Tareas encontradas: ${tasks.length}`);
  
  if (tasks.length === 0) {
    console.log('❌ El proyecto no tiene tareas');
    return;
  }
  
  // ORDEN CORRECTO según las imágenes que me pasaste
  const correctOrder = [
    "Aprobación y alta del activo en SAP",
    "Generación de edital con equipo de Producción",
    "Envío de editales a proveedores para participar en el proyecto",
    "Solución de dudas técnicas",
    "Selección de proveedor",
    "Preparación de contrato con área legal",
    "Alta del proveedor en sistema y para factoraje",
    "Definición del equipo de proyecto",
    "Kick-off meeting con proveedor seleccionado",
    "Hito: OC linea vinagre realizada",
    "Programación de 1er anticipo 30%",
    "Ajuste del Project Charter",
    "HITO: Anticipo linea vinagre pagado (30%)",
    "Análisis de requerimientos técnicos",
    "Estudio de sitio en Empacadora San Marcos",
    "Diseño de instalación y layout",
    "Especificaciones técnicas finales",
    "Elaboración de edital para compresores",
    "Licitación para compra de compresores",
    "OC compresores",
    "Hito: OC compresores realizada",
    "Gestión de pago OC compresores",
    "Hito: compresores pagado (100%)",
    "Elaboración de edital para modif infraestructura",
    "Licitación para infraestructura e instalación",
    "OC infraestructura e instalación",
    "Hito: OC infraestructura e instalación realizada",
    "Gestión de anticipo OC infraestructura",
    "Hito: anticipo infraestructura pagado (30%)",
    "Plan de instalación y cronograma detallado",
    "Análisis de riesgos y plan de mitigación",
    "Preparación de cimentación y bases",
    "Instalación de servicios eléctricos",
    "Preparación de conexiones de aire comprimido",
    "Instalación de sistemas de drenaje",
    "Gestión de anticipo OC infraestructura",
    "Hito: anticipo infraestructura pagado (60%)",
    "Adecuaciones de espacio físico",
    "HITO: Sitio listo",
    "Inicio de fabricación con proveedor seleccionado",
    "Control de calidad durante fabricación",
    "Pruebas de fábrica (FAT)",
    "Preparación para envío",
    "Programación 2o y 3er anticipo linea de vinagre (50%+20%)",
    "Hito: 2o anticipo linea de vinagre pagado (50%)",
    "Transporte a Empacadora San Marcos",
    "Hito: Equipo fabricado y recibido en SM",
    "Recepción e inspección del equipo",
    "Posicionamiento y alineación",
    "Conexiones eléctricas",
    "Conexiones neumáticas",
    "Instalación de sistemas de control",
    "Integración con línea de producción existente",
    "Hito: Instalación completa",
    "Hito: 3er anticipo infraestructura (10%)",
    "Pruebas de funcionamiento individual",
    "Pruebas de integración con línea",
    "Calibración y ajustes finos",
    "Pruebas de rendimiento y capacidad",
    "Documentación de resultados",
    "Hito: Pruebas exitosas",
    "Capacitación a operadores",
    "Capacitación a personal de mantenimiento",
    "Entrega de manuales y documentación",
    "Certificación final del equipo",
    "Hito: Proyecto terminado",
    "Evaluación post-implementación",
    "Entregar KPIs para seguimiento en Atlas",
    "Documentación de lecciones aprendidas",
    "Liberación de garantías",
    "Pago último anticipo (20%)",
    "Cierre administrativo y financiero"
  ];
  
  console.log('🔄 Reordenando tareas según el orden correcto...');
  
  // Crear array reordenado
  const reorderedTasks = [];
  
  for (let i = 0; i < correctOrder.length; i++) {
    const correctTaskName = correctOrder[i];
    const taskIndex = i + 1;
    
    // Buscar la tarea por nombre
    const task = tasks.find(t => t.name === correctTaskName);
    
    if (task) {
      // Actualizar wbsCode y agregar a la lista reordenada
      const reorderedTask = {
        ...task,
        wbsCode: `${taskIndex}`
      };
      reorderedTasks.push(reorderedTask);
      console.log(`${taskIndex}. "${task.name}" → wbsCode: ${taskIndex}`);
    } else {
      console.warn(`⚠️ Tarea no encontrada: "${correctTaskName}"`);
    }
  }
  
  // Verificar si hay tareas que no se encontraron
  const foundTaskNames = reorderedTasks.map(t => t.name);
  const notFoundTasks = tasks.filter(t => !foundTaskNames.includes(t.name));
  
  if (notFoundTasks.length > 0) {
    console.log('⚠️ Tareas no encontradas en el orden correcto:');
    notFoundTasks.forEach(task => {
      console.log(`- "${task.name}"`);
    });
    
    // Agregar las tareas no encontradas al final
    notFoundTasks.forEach((task, index) => {
      const taskIndex = reorderedTasks.length + index + 1;
      const reorderedTask = {
        ...task,
        wbsCode: `${taskIndex}`
      };
      reorderedTasks.push(reorderedTask);
      console.log(`${taskIndex}. "${task.name}" → wbsCode: ${taskIndex} (agregada al final)`);
    });
  }
  
  console.log(`✅ Reordenamiento completado: ${reorderedTasks.length} tareas`);
  
  // Guardar en localStorage
  portfolioData.tasksByProject[targetProject.id] = reorderedTasks;
  localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));
  
  console.log('💾 Cambios guardados en localStorage');
  console.log('🔄 Recarga la página para ver el orden correcto');
  
})();
