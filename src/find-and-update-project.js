// Script para encontrar y actualizar el proyecto de Sopladora de Vinagre
// Ejecutar en la consola del navegador

console.log('🔍 Buscando proyecto de Sopladora de Vinagre...');

// Función para buscar todos los proyectos
function findAllProjects() {
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  console.log('📊 Datos del portfolio encontrados:', portfolioData);
  
  const projects = portfolioData.projects || [];
  const tasksByProject = portfolioData.tasksByProject || {};
  
  console.log('📋 Proyectos disponibles:');
  projects.forEach(project => {
    const taskCount = tasksByProject[project.id]?.length || 0;
    console.log(`- ${project.id}: "${project.name}" (${taskCount} tareas)`);
  });
  
  return { projects, tasksByProject };
}

// Función para buscar proyecto por palabras clave
function findProjectByKeywords(keywords) {
  const { projects, tasksByProject } = findAllProjects();
  
  for (const project of projects) {
    const name = project.name.toLowerCase();
    const hasKeywords = keywords.every(keyword => 
      name.includes(keyword.toLowerCase())
    );
    
    if (hasKeywords) {
      const tasks = tasksByProject[project.id] || [];
      console.log(`✅ Proyecto encontrado: "${project.name}"`);
      console.log(`📋 Tiene ${tasks.length} tareas`);
      
      return {
        projectId: project.id,
        project: project,
        tasks: tasks
      };
    }
  }
  
  return null;
}

// Función para actualizar wbsCode secuencialmente
function updateWbsCodesSequentially(projectData) {
  if (!projectData) {
    console.log('❌ No hay datos del proyecto');
    return;
  }
  
  const { projectId, tasks } = projectData;
  
  console.log(`🔄 Actualizando wbsCode para ${tasks.length} tareas...`);
  
  // Actualizar wbsCode secuencialmente del 1 al número de tareas
  const updatedTasks = tasks.map((task, index) => {
    const newWbsCode = `${index + 1}`;
    console.log(`Tarea ${index + 1}: "${task.name}" → wbsCode: ${newWbsCode}`);
    
    return {
      ...task,
      wbsCode: newWbsCode
    };
  });
  
  // Actualizar en localStorage
  const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
  portfolioData.tasksByProject[projectId] = updatedTasks;
  localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));
  
  console.log('✅ wbsCode actualizado exitosamente en localStorage');
  console.log('🔄 Recarga la página para ver los cambios');
  
  return updatedTasks;
}

// Buscar proyecto con diferentes combinaciones de palabras clave
const keywords = [
  ['sopladora', 'vinagre'],
  ['sopladora'],
  ['vinagre'],
  ['botella'],
  ['p1']
];

let projectData = null;
for (const keywordSet of keywords) {
  projectData = findProjectByKeywords(keywordSet);
  if (projectData) {
    console.log(`✅ Proyecto encontrado con palabras clave: ${keywordSet.join(', ')}`);
    break;
  }
}

if (projectData) {
  updateWbsCodesSequentially(projectData);
} else {
  console.log('❌ No se encontró el proyecto. Ejecuta findAllProjects() para ver todos los proyectos disponibles.');
}
