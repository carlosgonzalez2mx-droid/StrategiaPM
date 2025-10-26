// Script para actualizar la columna # de un proyecto específico
// Ejecutar en la consola del navegador

console.log('🔍 Buscando proyecto "P1: Sopladora de botella de Vinagre"...');

// Función para buscar el proyecto
function findProject() {
  // Buscar en localStorage
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  console.log('📊 Datos del portfolio:', portfolioData);
  
  // Buscar en tasksByProject
  const tasksByProject = portfolioData.tasksByProject || {};
  console.log('📋 Proyectos con tareas:', Object.keys(tasksByProject));
  
  // Buscar el proyecto por nombre
  let targetProjectId = null;
  let targetProject = null;
  
  // Buscar en projects
  const projects = portfolioData.projects || [];
  for (const project of projects) {
    if (project.name && project.name.includes('Sopladora') && project.name.includes('Vinagre')) {
      targetProjectId = project.id;
      targetProject = project;
      console.log('✅ Proyecto encontrado:', project);
      break;
    }
  }
  
  if (!targetProjectId) {
    console.log('❌ Proyecto no encontrado. Proyectos disponibles:');
    projects.forEach(p => console.log(`- ${p.id}: ${p.name}`));
    return null;
  }
  
  // Obtener las tareas del proyecto
  const projectTasks = tasksByProject[targetProjectId] || [];
  console.log(`📋 Tareas del proyecto ${targetProject.name}:`, projectTasks.length);
  
  return {
    projectId: targetProjectId,
    project: targetProject,
    tasks: projectTasks
  };
}

// Función para actualizar wbsCode
function updateWbsCodes(projectData) {
  if (!projectData) {
    console.log('❌ No hay datos del proyecto');
    return;
  }
  
  const { projectId, tasks } = projectData;
  
  // Actualizar wbsCode secuencialmente del 1 al 72
  const updatedTasks = tasks.map((task, index) => ({
    ...task,
    wbsCode: `${index + 1}`
  }));
  
  console.log('🔄 Actualizando wbsCode de las tareas...');
  updatedTasks.forEach((task, index) => {
    console.log(`Tarea ${index + 1}: "${task.name}" → wbsCode: ${task.wbsCode}`);
  });
  
  // Actualizar en localStorage
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  portfolioData.tasksByProject[projectId] = updatedTasks;
  localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));
  
  console.log('✅ wbsCode actualizado exitosamente');
  console.log('🔄 Recarga la página para ver los cambios');
  
  return updatedTasks;
}

// Ejecutar la búsqueda y actualización
const projectData = findProject();
if (projectData) {
  updateWbsCodes(projectData);
} else {
  console.log('❌ No se pudo encontrar el proyecto');
}
