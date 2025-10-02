import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, Users, FileText, TrendingUp, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

const WeeklyPlanningTab = ({ 
  projects, 
  tasksByProject, 
  minutasByProject, 
  weeklyPlanningData, 
  setWeeklyPlanningData 
}) => {
  const [dateRange, setDateRange] = useState(weeklyPlanningData?.dateRange || {
    start: getStartOfWeek(new Date()),
    end: getEndOfWeek(new Date())
  });
  const [previousWeekData, setPreviousWeekData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ NUEVA: Función utilitaria para validar fechas
  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900;
  };

  // ✅ NUEVA: Función utilitaria para normalizar fechas
  const normalizeDate = (dateString) => {
    if (!isValidDate(dateString)) return null;
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Filtrar solo proyectos activos
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'active'), 
    [projects]
  );

  // Calcular fechas de la semana pasada
  const previousWeekRange = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() - 7);
    return { start, end };
  }, [dateRange]);

  // Cargar datos de la semana pasada al cambiar el rango de fechas
  useEffect(() => {
    loadPreviousWeekData();
  }, [dateRange, activeProjects]);


  const loadPreviousWeekData = async () => {
    setIsLoading(true);
    try {
      const complianceData = await calculatePreviousWeekCompliance();
      setPreviousWeekData(complianceData);
    } catch (error) {
      console.error('Error cargando datos de la semana pasada:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePreviousWeekCompliance = async () => {
    const compliance = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      byProject: {}
    };

    for (const project of activeProjects) {
      const projectTasks = tasksByProject[project.id] || [];
      const projectMinuteTasks = minutasByProject[project.id] || [];
      
      // ✅ CORREGIDO: Filtrar tareas que VENCÍAN en la semana pasada
      const previousWeekTasks = projectTasks.filter(task => {
        const taskDate = new Date(task.endDate || task.startDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= previousWeekRange.start && taskDate <= previousWeekRange.end;
      });

      const previousWeekMinuteTasks = projectMinuteTasks.filter(task => {
        const taskDate = new Date(task.fecha);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= previousWeekRange.start && taskDate <= previousWeekRange.end;
      });

      const allPreviousTasks = [...previousWeekTasks, ...previousWeekMinuteTasks];
      
      // ✅ CORREGIDO: Calcular correctamente completadas y pendientes
      const completed = allPreviousTasks.filter(t => 
        t.progress === 100 || t.estatus === 'Completado'
      ).length;
      
      const pending = allPreviousTasks.filter(t => 
        t.progress < 100 && t.estatus !== 'Completado'
      ).length;
      
      // ✅ CORREGIDO: Tareas que vencieron en semana pasada y siguen pendientes HOY
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue = allPreviousTasks.filter(t => {
        const dueDate = new Date(t.endDate || t.fecha);
        dueDate.setHours(0, 0, 0, 0);
        const isPending = t.progress < 100 || t.estatus !== 'Completado';
        return dueDate < today && isPending;
      }).length;
      
      compliance.byProject[project.id] = {
        projectName: project.name,
        total: allPreviousTasks.length,
        completed: completed,
        pending: pending,
        overdue: overdue
      };

      compliance.totalTasks += allPreviousTasks.length;
      compliance.completedTasks += completed;
      compliance.pendingTasks += pending;
      compliance.overdueTasks += overdue;
    }

    return compliance;
  };

  // ✅ CORREGIDO: Obtener tareas que vencen DENTRO del rango seleccionado
  const getCurrentWeekTasks = (projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = minutasByProject[projectId] || [];
    
    console.log('🔍 getCurrentWeekTasks - Filtrando tareas de la semana:', {
      projectId,
      dateRange: {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      },
      totalScheduleTasks: projectTasks.length,
      totalMinuteTasks: projectMinuteTasks.length
    });
    
    // Filtrar tareas del cronograma que vencen en la semana actual Y están pendientes
    const currentWeekTasks = projectTasks.filter(task => {
      const taskDate = normalizeDate(task.endDate || task.startDate);
      
      // Validar que la fecha sea válida
      if (!taskDate) {
        console.warn('⚠️ Fecha inválida en tarea de cronograma (semana actual):', task.name, task.endDate);
        return false;
      }
      
      const isInRange = taskDate >= dateRange.start && taskDate <= dateRange.end;
      const isPending = task.progress < 100;
      
      if (isInRange && isPending) {
        console.log('📋 Tarea de semana actual encontrada (cronograma):', {
          name: task.name,
          dueDate: taskDate.toISOString().split('T')[0],
          progress: task.progress
        });
      }
      
      return isInRange && isPending;
    });

    // Filtrar tareas de minutas que vencen en la semana actual Y están pendientes
    const currentWeekMinuteTasks = projectMinuteTasks.filter(task => {
      const taskDate = normalizeDate(task.fecha);
      
      // Validar que la fecha sea válida
      if (!taskDate) {
        console.warn('⚠️ Fecha inválida en tarea de minuta (semana actual):', task.tarea, task.fecha);
        return false;
      }
      
      const isInRange = taskDate >= dateRange.start && taskDate <= dateRange.end;
      const estatus = (task.estatus || '').toLowerCase().trim();
      const isPending = estatus !== 'completado' && estatus !== 'completada';
      
      if (isInRange && isPending) {
        console.log('📋 Tarea de semana actual encontrada (minuta):', {
          name: task.tarea,
          dueDate: taskDate.toISOString().split('T')[0],
          estatus: task.estatus
        });
      }
      
      return isInRange && isPending;
    });

    console.log('✅ getCurrentWeekTasks - Resultado:', {
      projectId,
      currentWeekTasks: currentWeekTasks.length,
      currentWeekMinuteTasks: currentWeekMinuteTasks.length,
      totalCurrentWeek: currentWeekTasks.length + currentWeekMinuteTasks.length
    });

    return {
      scheduleTasks: currentWeekTasks,
      minuteTasks: currentWeekMinuteTasks
    };
  };

  const getOverdueTasks = (projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = minutasByProject[projectId] || [];
    
    // ✅ CORREGIDO: Usar fecha actual en lugar del inicio del rango
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 getOverdueTasks - Filtrando tareas vencidas:', {
      projectId,
      today: today.toISOString().split('T')[0],
      totalScheduleTasks: projectTasks.length,
      totalMinuteTasks: projectMinuteTasks.length
    });
    
    // Tareas del cronograma vencidas
    const overdueScheduleTasks = projectTasks.filter(task => {
      const dueDate = normalizeDate(task.endDate || task.startDate);
      
      // Validar que la fecha sea válida
      if (!dueDate) {
        console.warn('⚠️ Fecha inválida en tarea de cronograma:', task.name, task.endDate);
        return false;
      }
      
      const isOverdue = dueDate < today;
      const isPending = task.progress < 100;
      
      if (isOverdue && isPending) {
        console.log('📋 Tarea vencida encontrada (cronograma):', {
          name: task.name,
          dueDate: dueDate.toISOString().split('T')[0],
          progress: task.progress
        });
      }
      
      return isOverdue && isPending;
    });

    // Minutas vencidas
    const overdueMinuteTasks = projectMinuteTasks.filter(task => {
      const dueDate = normalizeDate(task.fecha);
      
      // Validar que la fecha sea válida
      if (!dueDate) {
        console.warn('⚠️ Fecha inválida en tarea de minuta:', task.tarea, task.fecha);
        return false;
      }
      
      // Verificar estatus de forma case-insensitive
      const estatus = (task.estatus || '').toLowerCase().trim();
      const isPending = estatus !== 'completado' && estatus !== 'completada';
      const isOverdue = dueDate < today;
      
      if (isOverdue && isPending) {
        console.log('📋 Tarea vencida encontrada (minuta):', {
          name: task.tarea,
          dueDate: dueDate.toISOString().split('T')[0],
          estatus: task.estatus
        });
      }
      
      return isOverdue && isPending;
    });

    console.log('✅ getOverdueTasks - Resultado:', {
      projectId,
      overdueScheduleTasks: overdueScheduleTasks.length,
      overdueMinuteTasks: overdueMinuteTasks.length,
      totalOverdue: overdueScheduleTasks.length + overdueMinuteTasks.length
    });

    return {
      scheduleTasks: overdueScheduleTasks,
      minuteTasks: overdueMinuteTasks
    };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCompletionPercentage = () => {
    if (previousWeekData?.totalTasks === 0) return 0;
    return Math.round((previousWeekData?.completedTasks / previousWeekData?.totalTasks) * 100);
  };

  // Función para exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título del documento
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Planificación Semanal', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Fechas
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Resumen de cumplimiento semana pasada
    if (previousWeekData) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Resumen Semana Pasada', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Tareas Completadas: ${previousWeekData.completedTasks}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Tareas Pendientes: ${previousWeekData.pendingTasks}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Tareas Vencidas: ${previousWeekData.overdueTasks}`, 20, yPosition);
      yPosition += 5;
      doc.text(`Cumplimiento: ${getCompletionPercentage()}%`, 20, yPosition);
      yPosition += 15;
    }

    // Tareas por proyecto
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Tareas de la Semana Actual', 20, yPosition);
    yPosition += 15;

    activeProjects.forEach((project) => {
      const currentTasks = getCurrentWeekTasks(project.id);
      const overdueTasks = getOverdueTasks(project.id);
      
      const allTasks = [
        ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma' })),
        ...currentTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha })),
        ...overdueTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
        ...overdueTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: true }))
      ];

      if (allTasks.length === 0) return;

      // Verificar si necesitamos una nueva página
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Nombre del proyecto
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${project.name}`, 20, yPosition);
      yPosition += 8;

      // Tareas vencidas
      const overdueTasksList = allTasks.filter(t => t.isOverdue);
      if (overdueTasksList.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(220, 38, 38); // Rojo
        doc.text('Tareas Vencidas:', 25, yPosition);
        yPosition += 6;

        overdueTasksList.forEach((task) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0); // Negro
          doc.text(`• ${task.name} (${task.type})`, 30, yPosition);
          yPosition += 4;
          doc.text(`  Vence: ${formatDate(task.endDate)}`, 30, yPosition);
          yPosition += 4;
        });
        yPosition += 5;
      }

      // Tareas de la semana
      const currentWeekTasksList = allTasks.filter(t => !t.isOverdue);
      if (currentWeekTasksList.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(59, 130, 246); // Azul
        doc.text('Tareas de la Semana:', 25, yPosition);
        yPosition += 6;

        currentWeekTasksList.forEach((task) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0); // Negro
          doc.text(`• ${task.name} (${task.type})`, 30, yPosition);
          yPosition += 4;
          doc.text(`  Vence: ${formatDate(task.endDate)}`, 30, yPosition);
          if (task.description) {
            doc.text(`  Responsable: ${task.description}`, 30, yPosition);
            yPosition += 4;
          }
          yPosition += 4;
        });
      }

      yPosition += 10;
    });

    // Guardar el PDF
    const fileName = `Planificacion_Semanal_${formatDate(dateRange.start).replace(/\//g, '-')}_${formatDate(dateRange.end).replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="weekly-planning-tab bg-gray-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-blue-600" />
            Planificación Semanal
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Hasta:</label>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de Cumplimiento Semana Pasada */}
      {previousWeekData && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
            Cumplimiento Semana Pasada ({formatDate(previousWeekRange.start)} - {formatDate(previousWeekRange.end)})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">Completadas</p>
                  <p className="text-2xl font-bold text-green-900">{previousWeekData.completedTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-900">{previousWeekData.pendingTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">Vencidas</p>
                  <p className="text-2xl font-bold text-red-900">{previousWeekData.overdueTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Cumplimiento</p>
                  <p className="text-2xl font-bold text-blue-900">{getCompletionPercentage()}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle por proyecto */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Detalle por Proyecto:</h4>
            {Object.values(previousWeekData.byProject).map((project, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{project.projectName}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-green-600">✓ {project.completed}</span>
                  <span className="text-sm text-orange-600">⏱ {project.pending}</span>
                  <span className="text-sm text-red-600">⚠ {project.overdue}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {project.total > 0 ? Math.round((project.completed / project.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Lista de Tareas por Proyecto */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <FileText className="mr-2 h-6 w-6 text-blue-600" />
            Tareas de la Semana Actual
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({formatDate(dateRange.start)} - {formatDate(dateRange.end)})
            </span>
          </h3>
          
          <div className="space-y-6">
            {activeProjects.map((project) => {
              const currentTasks = getCurrentWeekTasks(project.id);
              const overdueTasks = getOverdueTasks(project.id);
              const totalTasks = currentTasks.scheduleTasks.length + currentTasks.minuteTasks.length + 
                               overdueTasks.scheduleTasks.length + overdueTasks.minuteTasks.length;
              
              // Mostrar el proyecto si tiene tareas vencidas O tareas de la semana actual
              if (totalTasks === 0) return null;
              
              return (
                <ProjectTasksList
                  key={project.id}
                  project={project}
                  currentTasks={currentTasks}
                  overdueTasks={overdueTasks}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar las tareas del proyecto en formato de lista
const ProjectTasksList = ({ project, currentTasks, overdueTasks: overdueTasksParam }) => {
  // Función para formatear fechas
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const allTasks = [
    ...overdueTasksParam.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
    ...overdueTasksParam.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: true })),
    ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: false })),
    ...currentTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: false }))
  ];

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p>No hay tareas para este proyecto en el período seleccionado.</p>
      </div>
    );
  }

  const overdueTasks = allTasks.filter(t => t.isOverdue);
  const currentWeekTasks = allTasks.filter(t => !t.isOverdue);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header del proyecto */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
          {project.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({allTasks.length} tareas)
          </span>
        </h4>
      </div>

      <div className="divide-y divide-gray-200">
        {/* Tareas vencidas */}
        {overdueTasks.length > 0 && (
          <div className="p-6 bg-red-50">
            <h5 className="text-md font-semibold text-red-800 mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Tareas Vencidas ({overdueTasks.length})
            </h5>
            <div className="space-y-3">
              {overdueTasks.map((task, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 mb-1">{task.name}</h6>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Vence: {formatDate(task.endDate)}
                        </span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          {task.type}
                        </span>
                        {task.priority && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                      Vencida
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tareas de la semana actual */}
        {currentWeekTasks.length > 0 && (
          <div className="p-6">
            <h5 className="text-md font-semibold text-blue-800 mb-4 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Tareas de la Semana ({currentWeekTasks.length})
            </h5>
            <div className="space-y-3">
              {currentWeekTasks.map((task, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h6 className="font-medium text-gray-900 mb-1">{task.name}</h6>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Vence: {formatDate(task.endDate)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {task.type}
                        </span>
                        {task.priority && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      Pendiente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Funciones auxiliares
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // Domingo de la misma semana
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

export default WeeklyPlanningTab;