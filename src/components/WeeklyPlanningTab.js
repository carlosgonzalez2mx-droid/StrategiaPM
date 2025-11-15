import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, Users, FileText, TrendingUp, Download } from 'lucide-react';
// ✅ OPCIONAL: Descomentar si quieres usar el indicador de carga
// import { Calendar, Clock, CheckCircle, AlertCircle, Users, FileText, TrendingUp, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

// ============================================================================
// UTILIDADES - Movidas fuera del componente para mejor rendimiento
// ============================================================================

const DEBUG_MODE = false; // ✅ Control centralizado de logs

const log = (...args) => {
  if (DEBUG_MODE) console.log(...args);
};

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getFullYear() > 1900;
};

const normalizeDate = (dateString) => {
  if (!isValidDate(dateString)) return null;
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // ✅ Normalizado a medianoche para consistencia
  return d;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// ✅ Funciones centralizadas para estado de tareas
const isTaskCompleted = (task, isMinuteTask = false) => {
  if (isMinuteTask) {
    const estatus = (task.estatus || '').toLowerCase().trim();
    return estatus === 'completado' || estatus === 'completada';
  }
  return task.progress === 100;
};

const isTaskPending = (task, isMinuteTask = false) => {
  return !isTaskCompleted(task, isMinuteTask);
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const WeeklyPlanningTab = ({ 
  projects, 
  tasksByProject, 
  minutasByProject, 
  weeklyPlanningData, 
  setWeeklyPlanningData,
  useSupabase = false // ✅ Nuevo prop para determinar fuente de datos
}) => {
  // Estado
  const [dateRange, setDateRange] = useState(weeklyPlanningData?.dateRange || {
    start: getStartOfWeek(new Date()),
    end: getEndOfWeek(new Date())
  });
  const [previousWeekData, setPreviousWeekData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ NUEVO: Estado local para minutas (independiente de props)
  const [localMinutaTasks, setLocalMinutaTasks] = useState({});
  const [loadingMinutas, setLoadingMinutas] = useState(false);
  
  // ⚠️ OPCIONAL: Descomenta si quieres manejo de errores en UI
  // const [error, setError] = useState(null);

  // 🚀 NUEVO: Escuchar eventos de actualización de tareas de minutas
  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      console.log('🔄 WeeklyPlanningTab: Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });
      
      // Forzar re-render del componente para actualizar las tareas de minutas
      console.log('🔄 WeeklyPlanningTab: Forzando re-render de tareas de minutas...');
      // El componente se re-renderizará automáticamente cuando cambien los datos
    };

    // Agregar listener
    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);

    // Cleanup
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  // ✅ Proyectos activos memoizados
  const activeProjects = useMemo(() => {
    const filtered = projects.filter(p => p.status === 'active');
    
    log('🏢 PROYECTOS ACTIVOS:', {
      total: projects.length,
      active: filtered.length,
      projects: filtered.map(p => ({ id: p.id, name: p.name }))
    });
    
    log('📊 ESTRUCTURA DE DATOS:', {
      tasksByProjectKeys: Object.keys(tasksByProject || {}),
      minutasByProjectKeys: Object.keys(localMinutaTasks || {}),
      tasksByProject: tasksByProject,
      localMinutaTasks: localMinutaTasks
    });
    
    return filtered;
  }, [projects, tasksByProject, localMinutaTasks]);

  // ✅ Rango de semana anterior memoizado
  const previousWeekRange = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() - 7);
    return { start, end };
  }, [dateRange]);

  // ✅ Fecha actual memoizada
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ============================================================================
  // FUNCIONES DE FILTRADO - Ahora con useCallback para evitar recreación
  // ============================================================================

  // ✅ Función genérica para filtrar tareas por rango de fechas
  const filterTasksByDateRange = useCallback((tasks, startDate, endDate, isMinuteTask = false) => {
    return tasks.filter(task => {
      const taskDate = normalizeDate(
        isMinuteTask ? task.fecha : (task.endDate || task.startDate)
      );
      
      if (!taskDate) {
        log(`⚠️ Fecha inválida en tarea:`, task.name || task.tarea);
        return false;
      }
      
      return taskDate >= startDate && taskDate <= endDate;
    });
  }, []);

  // ✅ Función genérica para filtrar tareas vencidas
  const filterOverdueTasks = useCallback((tasks, isMinuteTask = false) => {
    return tasks.filter(task => {
      const dueDate = normalizeDate(
        isMinuteTask ? task.fecha : (task.endDate || task.startDate)
      );
      
      if (!dueDate) {
        log(`⚠️ Fecha inválida en tarea vencida:`, task.name || task.tarea);
        return false;
      }
      
      const isPending = isTaskPending(task, isMinuteTask);
      return dueDate < today && isPending;
    });
  }, [today]);

  // ✅ Obtener tareas de la semana actual (memoizado por proyecto)
  const getCurrentWeekTasks = useCallback((projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = localMinutaTasks[projectId] || [];
    
    log('📅 getCurrentWeekTasks:', {
      projectId,
      totalScheduleTasks: projectTasks.length,
      totalMinuteTasks: projectMinuteTasks.length,
      dateRange: {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      }
    });
    
    // Debug detallado de tareas del proyecto
    if (projectTasks.length > 0) {
      log('📋 Tareas de cronograma del proyecto:', projectTasks.map(t => ({
        id: t.id,
        name: t.name,
        endDate: t.endDate,
        progress: t.progress
      })));
    }
    
    if (projectMinuteTasks.length > 0) {
      log('📋 Tareas de minutas del proyecto:', projectMinuteTasks.map(t => ({
        id: t.id,
        tarea: t.tarea,
        fecha: t.fecha,
        estatus: t.estatus
      })));
    }
    
    // Filtrar tareas pendientes de cronograma
    const scheduleTasks = filterTasksByDateRange(projectTasks, dateRange.start, dateRange.end)
      .filter(task => isTaskPending(task, false));
    
    // Filtrar tareas pendientes de minutas
    const minuteTasks = filterTasksByDateRange(projectMinuteTasks, dateRange.start, dateRange.end, true)
      .filter(task => isTaskPending(task, true));

    log('✅ Tareas de semana actual:', {
      projectId,
      scheduleTasks: scheduleTasks.length,
      minuteTasks: minuteTasks.length,
      totalFiltered: scheduleTasks.length + minuteTasks.length
    });

    return { scheduleTasks, minuteTasks };
  }, [tasksByProject, localMinutaTasks, dateRange, filterTasksByDateRange]);

  // ✅ Obtener tareas vencidas (memoizado por proyecto)
  const getOverdueTasks = useCallback((projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = localMinutaTasks[projectId] || [];
    
    log('🔍 getOverdueTasks:', { projectId, today: today.toISOString().split('T')[0] });
    
    const scheduleTasks = filterOverdueTasks(projectTasks, false);
    const minuteTasks = filterOverdueTasks(projectMinuteTasks, true);

    log('✅ Tareas vencidas:', {
      projectId,
      scheduleTasks: scheduleTasks.length,
      minuteTasks: minuteTasks.length
    });

    return { scheduleTasks, minuteTasks };
  }, [tasksByProject, localMinutaTasks, today, filterOverdueTasks]);

  // ============================================================================
  // CÁLCULO DE CUMPLIMIENTO SEMANA PASADA
  // ============================================================================

  const calculatePreviousWeekCompliance = useCallback(async () => {
    const compliance = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      byProject: {}
    };

    for (const project of activeProjects) {
      const projectTasks = tasksByProject[project.id] || [];
      const projectMinuteTasks = localMinutaTasks[project.id] || [];
      
      // Tareas que vencían en la semana pasada
      const previousWeekScheduleTasks = filterTasksByDateRange(
        projectTasks, 
        previousWeekRange.start, 
        previousWeekRange.end
      );
      
      const previousWeekMinuteTasks = filterTasksByDateRange(
        projectMinuteTasks, 
        previousWeekRange.start, 
        previousWeekRange.end, 
        true
      );

      const allPreviousTasks = [...previousWeekScheduleTasks, ...previousWeekMinuteTasks];
      
      // Contar por estado
      const completed = allPreviousTasks.filter((task, idx) => 
        isTaskCompleted(task, idx >= previousWeekScheduleTasks.length)
      ).length;
      
      const pending = allPreviousTasks.filter((task, idx) => 
        isTaskPending(task, idx >= previousWeekScheduleTasks.length)
      ).length;
      
      // Tareas que vencieron la semana pasada y SIGUEN pendientes hoy
      const overdue = allPreviousTasks.filter((task, idx) => {
        const isMinute = idx >= previousWeekScheduleTasks.length;
        const dueDate = normalizeDate(isMinute ? task.fecha : (task.endDate || task.startDate));
        return dueDate < today && isTaskPending(task, isMinute);
      }).length;
      
      compliance.byProject[project.id] = {
        projectName: project.name,
        total: allPreviousTasks.length,
        completed,
        pending,
        overdue
      };

      compliance.totalTasks += allPreviousTasks.length;
      compliance.completedTasks += completed;
      compliance.pendingTasks += pending;
      compliance.overdueTasks += overdue;
    }

    return compliance;
  }, [activeProjects, tasksByProject, localMinutaTasks, previousWeekRange, today, filterTasksByDateRange]);

  // ✅ Cargar datos con manejo de errores mejorado
  const loadPreviousWeekData = useCallback(async () => {
    setIsLoading(true);
    // if (setError) setError(null); // Descomentar si usas error state
    
    try {
      const complianceData = await calculatePreviousWeekCompliance();
      setPreviousWeekData(complianceData);
    } catch (err) {
      console.error('Error cargando datos de la semana pasada:', err);
      // if (setError) setError('No se pudieron cargar los datos de la semana anterior'); // Descomentar si usas error state
    } finally {
      setIsLoading(false);
    }
  }, [calculatePreviousWeekCompliance]);

  // Efecto para cargar datos
  useEffect(() => {
    loadPreviousWeekData();
  }, [loadPreviousWeekData]);

  // ✅ Sincronizar estado con componente padre (para persistencia o estado global)
  useEffect(() => {
    if (setWeeklyPlanningData) {
      setWeeklyPlanningData({ dateRange, previousWeekData });
    }
  }, [dateRange, previousWeekData, setWeeklyPlanningData]);

  // ✅ NUEVO: Cargar minutas independientemente (replicando lógica de ProjectManagementTabs.js)
  useEffect(() => {
    const loadMinutasForAllProjects = async () => {
      if (!projects || projects.length === 0) return;

      setLoadingMinutas(true);
      try {
        log('🔍 WeeklyPlanningTab - Iniciando carga independiente de minutas para todos los proyectos activos');
        
        const minutasByProjectLocal = {};
        
        for (const project of activeProjects) {
          try {
            if (useSupabase) {
              // Cargar desde Supabase si está habilitado
              log(`🔍 Cargando minutas desde Supabase para proyecto: ${project.id}`);
              const { default: supabaseService } = await import('../services/SupabaseService');
              const { success, minutas } = await supabaseService.loadMinutasByProject(project.id);
              if (success) {
                minutasByProjectLocal[project.id] = minutas || [];
                log(`✅ Minutas cargadas desde Supabase para ${project.name}: ${minutas?.length || 0}`);
              } else {
                log(`⚠️ Error cargando minutas desde Supabase para ${project.name}`);
                minutasByProjectLocal[project.id] = [];
              }
            } else {
              // Cargar desde portfolioData si está en modo local
              const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
              const minutasFromStorage = portfolioData.minutasByProject?.[project.id] || [];
              minutasByProjectLocal[project.id] = minutasFromStorage;
              log(`✅ Minutas cargadas desde localStorage para ${project.name}: ${minutasFromStorage.length}`);
            }
          } catch (error) {
            console.error(`❌ Error cargando minutas para proyecto ${project.name}:`, error);
            minutasByProjectLocal[project.id] = [];
          }
        }
        
        setLocalMinutaTasks(minutasByProjectLocal);
        log('✅ WeeklyPlanningTab - Carga independiente de minutas completada:', {
          totalProjects: activeProjects.length,
          minutasByProject: Object.keys(minutasByProjectLocal).reduce((acc, key) => {
            acc[key] = minutasByProjectLocal[key].length;
            return acc;
          }, {})
        });
        
      } catch (error) {
        console.error('❌ Error general cargando minutas en WeeklyPlanningTab:', error);
        setLocalMinutaTasks({});
      } finally {
        setLoadingMinutas(false);
      }
    };

    loadMinutasForAllProjects();
  }, [projects, activeProjects, useSupabase]); // ✅ Dependencias correctas

  // ============================================================================
  // FUNCIONES AUXILIARES
  // ============================================================================

  const getCompletionPercentage = () => {
    if (!previousWeekData || previousWeekData.totalTasks === 0) return 0;
    return Math.round((previousWeekData.completedTasks / previousWeekData.totalTasks) * 100);
  };

  // ✅ Exportar PDF con manejo de errores
  const exportToPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Título
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Planificación Semanal', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Fechas
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // Tareas por proyecto
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Tareas de la Semana Actual', 20, yPosition);
      yPosition += 15;

      activeProjects.forEach((project) => {
        const currentTasks = getCurrentWeekTasks(project.id);
        const overdueTasks = getOverdueTasks(project.id);
        
        const allTasks = [
          ...overdueTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
          ...overdueTasks.minuteTasks.map(t => ({ 
            ...t, 
            type: 'Minuta', 
            name: t.tarea, 
            description: t.responsable, 
            endDate: t.fecha, 
            isOverdue: true 
          })),
          ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: false })),
          ...currentTasks.minuteTasks.map(t => ({ 
            ...t, 
            type: 'Minuta', 
            name: t.tarea, 
            description: t.responsable, 
            endDate: t.fecha, 
            isOverdue: false 
          }))
        ];

        if (allTasks.length === 0) return;

        // Nueva página si es necesario
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
        const overdueList = allTasks.filter(t => t.isOverdue);
        if (overdueList.length > 0) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text('Tareas Vencidas:', 25, yPosition);
          yPosition += 6;

          overdueList.forEach((task) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }

            // Dibujar checkbox
            doc.setDrawColor(220, 38, 38); // Color rojo para tareas vencidas
            doc.setLineWidth(0.3);
            doc.rect(30, yPosition - 3, 3, 3); // Recuadro de 3x3mm

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`${task.name} (${task.type})`, 35, yPosition);
            yPosition += 4;
            doc.text(`  Vence: ${formatDate(task.endDate)}`, 35, yPosition);
            yPosition += 4;
          });
          yPosition += 5;
        }

        // Tareas de la semana
        const currentList = allTasks.filter(t => !t.isOverdue);
        if (currentList.length > 0) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(59, 130, 246);
          doc.text('Tareas de la Semana:', 25, yPosition);
          yPosition += 6;

          currentList.forEach((task) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }

            // Dibujar checkbox
            doc.setDrawColor(59, 130, 246); // Color azul para tareas de la semana
            doc.setLineWidth(0.3);
            doc.rect(30, yPosition - 3, 3, 3); // Recuadro de 3x3mm

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`${task.name} (${task.type})`, 35, yPosition);
            yPosition += 4;
            doc.text(`  Vence: ${formatDate(task.endDate)}`, 35, yPosition);
            if (task.description) {
              yPosition += 4;
              doc.text(`  Responsable: ${task.description}`, 35, yPosition);
            }
            yPosition += 4;
          });
        }

        yPosition += 10;
      });

      // Guardar
      const fileName = `Planificacion_Semanal_${formatDate(dateRange.start).replace(/\//g, '-')}_${formatDate(dateRange.end).replace(/\//g, '-')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('Error al generar el PDF. Por favor intenta de nuevo.');
    }
  }, [dateRange, previousWeekData, activeProjects, getCurrentWeekTasks, getOverdueTasks]);

  // ============================================================================
  // RENDER
  // ============================================================================

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
              // disabled={isLoading} // ✅ OPCIONAL: Descomentar para deshabilitar durante carga
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* ✅ OPCIONAL: Indicador de carga - Descomenta si quieres mostrar loading */}
      {/* {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-blue-800">Cargando datos de la semana...</span>
        </div>
      )} */}

      {/* ✅ OPCIONAL: Manejo de errores - Descomenta si agregas el estado 'error' */}
      {/* {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )} */}

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

// ============================================================================
// COMPONENTE DE LISTA DE TAREAS DEL PROYECTO
// ============================================================================

const ProjectTasksList = React.memo(({ project, currentTasks, overdueTasks }) => {
  const allTasks = useMemo(() => [
    ...overdueTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
    ...overdueTasks.minuteTasks.map(t => ({ 
      ...t, 
      type: 'Minuta', 
      name: t.tarea, 
      description: t.responsable, 
      endDate: t.fecha, 
      isOverdue: true 
    })),
    ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: false })),
    ...currentTasks.minuteTasks.map(t => ({ 
      ...t, 
      type: 'Minuta', 
      name: t.tarea, 
      description: t.responsable, 
      endDate: t.fecha, 
      isOverdue: false 
    }))
  ], [currentTasks, overdueTasks]);

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p>No hay tareas para este proyecto en el período seleccionado.</p>
      </div>
    );
  }

  const overdueList = allTasks.filter(t => t.isOverdue);
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
        {overdueList.length > 0 && (
          <div className="p-6 bg-red-50">
            <h5 className="text-md font-semibold text-red-800 mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              Tareas Vencidas ({overdueList.length})
            </h5>
            <div className="space-y-3">
              {overdueList.map((task, index) => (
                <TaskCard key={`overdue-${index}`} task={task} isOverdue={true} />
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
                <TaskCard key={`current-${index}`} task={task} isOverdue={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ✅ Componente reutilizable para tarjetas de tareas
const TaskCard = React.memo(({ task, isOverdue }) => (
  <div className={`bg-white p-4 rounded-lg border ${
    isOverdue ? 'border-red-200' : 'border-gray-200 hover:border-blue-300'
  } transition-colors`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h6 className="font-medium text-gray-900 mb-1">{task.name}</h6>
        {task.description && (
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        )}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Vence: {formatDate(task.endDate)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            task.type === 'Cronograma' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {task.type}
          </span>
          {task.priority && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
              {task.priority}
            </span>
          )}
        </div>
      </div>
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
        isOverdue 
          ? 'bg-red-100 text-red-800' 
          : 'bg-green-100 text-green-800'
      }`}>
        {isOverdue ? 'Vencida' : 'Pendiente'}
      </span>
    </div>
  </div>
));

ProjectTasksList.displayName = 'ProjectTasksList';
TaskCard.displayName = 'TaskCard';

export default WeeklyPlanningTab;