// Script ejecutable para actualizar wbsCode del proyecto de Sopladora de Vinagre
// Este script se puede ejecutar directamente desde Node.js o en el navegador

const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando actualización de wbsCode para proyecto de Sopladora de Vinagre...');

// Función para leer datos del localStorage (simulado)
function readPortfolioData() {
  try {
    // Intentar leer desde archivo de respaldo si existe
    const backupPath = path.join(__dirname, '..', 'backup-portfolio-data.json');
    if (fs.existsSync(backupPath)) {
      const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log('📊 Datos leídos desde archivo de respaldo');
      return data;
    }
    
    // Si no hay archivo de respaldo, crear datos de ejemplo
    console.log('⚠️ No se encontró archivo de respaldo, creando datos de ejemplo');
    return {
      projects: [],
      tasksByProject: {}
    };
  } catch (error) {
    console.error('❌ Error leyendo datos:', error);
    return {
      projects: [],
      tasksByProject: {}
    };
  }
}

// Función para buscar proyecto
function findProject(portfolioData) {
  const projects = portfolioData.projects || [];
  const tasksByProject = portfolioData.tasksByProject || {};
  
  console.log('📊 Proyectos disponibles:');
  projects.forEach(project => {
    const taskCount = tasksByProject[project.id]?.length || 0;
    console.log(`- ${project.id}: "${project.name}" (${taskCount} tareas)`);
  });
  
  // Buscar proyecto que contenga "sopladora", "vinagre" o "p1"
  for (const project of projects) {
    const name = project.name.toLowerCase();
    if (name.includes('sopladora') || name.includes('vinagre') || name.includes('p1')) {
      console.log(`✅ Proyecto encontrado: "${project.name}"`);
      return {
        projectId: project.id,
        project: project,
        tasks: tasksByProject[project.id] || []
      };
    }
  }
  
  return null;
}

// Función para actualizar wbsCode
function updateWbsCodes(projectData) {
  if (!projectData) {
    console.log('❌ No hay datos del proyecto');
    return null;
  }
  
  const { projectId, tasks } = projectData;
  
  if (tasks.length === 0) {
    console.log('❌ El proyecto no tiene tareas');
    return null;
  }
  
  console.log(`📋 Tareas encontradas: ${tasks.length}`);
  
  // Mostrar primeras 5 tareas
  console.log('📋 Primeras 5 tareas:');
  tasks.slice(0, 5).forEach((task, index) => {
    console.log(`${index + 1}. "${task.name}" (wbsCode actual: ${task.wbsCode})`);
  });
  
  // Actualizar wbsCode secuencialmente
  console.log('🔄 Actualizando wbsCode secuencialmente...');
  const updatedTasks = tasks.map((task, index) => {
    const newWbsCode = `${index + 1}`;
    return {
      ...task,
      wbsCode: newWbsCode
    };
  });
  
  console.log('✅ wbsCode actualizado exitosamente');
  console.log('📋 Resumen de cambios:');
  updatedTasks.forEach((task, index) => {
    if (index < 10) { // Mostrar solo las primeras 10 para no saturar la consola
      console.log(`${index + 1}. "${task.name}" → wbsCode: ${task.wbsCode}`);
    }
  });
  
  if (updatedTasks.length > 10) {
    console.log(`... y ${updatedTasks.length - 10} tareas más`);
  }
  
  return updatedTasks;
}

// Función principal
function main() {
  const portfolioData = readPortfolioData();
  const projectData = findProject(portfolioData);
  
  if (!projectData) {
    console.log('❌ No se encontró el proyecto de Sopladora de Vinagre');
    console.log('💡 Asegúrate de que el proyecto esté creado y tenga tareas');
    return;
  }
  
  const updatedTasks = updateWbsCodes(projectData);
  
  if (updatedTasks) {
    // Actualizar los datos
    portfolioData.tasksByProject[projectData.projectId] = updatedTasks;
    
    // Guardar en archivo de respaldo
    const backupPath = path.join(__dirname, '..', 'backup-portfolio-data.json');
    fs.writeFileSync(backupPath, JSON.stringify(portfolioData, null, 2));
    
    console.log('💾 Datos guardados en archivo de respaldo');
    console.log('🔄 Ahora necesitas actualizar manualmente en la aplicación:');
    console.log('1. Abre la consola del navegador (F12)');
    console.log('2. Ejecuta: localStorage.setItem("mi-dashboard-portfolio", JSON.stringify(' + JSON.stringify(portfolioData) + '))');
    console.log('3. Recarga la página');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main, findProject, updateWbsCodes };
