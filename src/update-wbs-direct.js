// CÓDIGO PARA EJECUTAR EN LA CONSOLA DEL NAVEGADOR
// Copia y pega este código completo en la consola del navegador

(function() {
  console.log('🔍 Iniciando búsqueda del proyecto de Sopladora de Vinagre...');
  
  // Obtener datos del portfolio
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  const projects = portfolioData.projects || [];
  const tasksByProject = portfolioData.tasksByProject || {};
  
  console.log('📊 Proyectos disponibles:');
  projects.forEach(project => {
    const taskCount = tasksByProject[project.id]?.length || 0;
    console.log(`- ${project.id}: "${project.name}" (${taskCount} tareas)`);
  });
  
  // Buscar proyecto que contenga "sopladora" o "vinagre"
  let targetProject = null;
  for (const project of projects) {
    const name = project.name.toLowerCase();
    if (name.includes('sopladora') || name.includes('vinagre') || name.includes('p1')) {
      targetProject = project;
      break;
    }
  }
  
  if (!targetProject) {
    console.log('❌ No se encontró el proyecto de Sopladora de Vinagre');
    console.log('💡 Asegúrate de que el proyecto esté creado y tenga tareas');
    console.log('💡 Verifica que el nombre del proyecto contenga "sopladora", "vinagre" o "p1"');
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
  
  // Mostrar primeras 5 tareas para verificar
  console.log('📋 Primeras 5 tareas:');
  tasks.slice(0, 5).forEach((task, index) => {
    console.log(`${index + 1}. "${task.name}" (wbsCode actual: ${task.wbsCode})`);
  });
  
  // Mostrar últimas 5 tareas
  if (tasks.length > 5) {
    console.log('📋 Últimas 5 tareas:');
    tasks.slice(-5).forEach((task, index) => {
      const realIndex = tasks.length - 5 + index;
      console.log(`${realIndex + 1}. "${task.name}" (wbsCode actual: ${task.wbsCode})`);
    });
  }
  
  // Actualizar wbsCode secuencialmente
  console.log('🔄 Actualizando wbsCode secuencialmente...');
  const updatedTasks = tasks.map((task, index) => {
    const newWbsCode = `${index + 1}`;
    return {
      ...task,
      wbsCode: newWbsCode
    };
  });
  
  // Guardar en localStorage
  portfolioData.tasksByProject[targetProject.id] = updatedTasks;
  localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));
  
  console.log('✅ wbsCode actualizado exitosamente');
  console.log('📋 Resumen de cambios (primeras 10 tareas):');
  updatedTasks.slice(0, 10).forEach((task, index) => {
    console.log(`${index + 1}. "${task.name}" → wbsCode: ${task.wbsCode}`);
  });
  
  if (updatedTasks.length > 10) {
    console.log(`... y ${updatedTasks.length - 10} tareas más`);
  }
  
  console.log('🔄 Recarga la página para ver los cambios en el cronograma');
  console.log('💡 Los números de predecesoras también se actualizarán automáticamente');
  
})();
