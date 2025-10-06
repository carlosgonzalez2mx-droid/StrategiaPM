import React, { useMemo, useRef } from 'react';

// ===== Utilidades de tiempo =====
const DAY = 1000 * 60 * 60 * 24;


// ===== Funciones auxiliares para el Gantt de proyectos =====
const toISO = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const isWorkingDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // No es domingo (0) ni sábado (6)
};

const diffDaysExclusive = (start, end, includeWeekends = false) => {
  if (!start || !end) return 0;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (includeWeekends) {
    return Math.ceil((endDate - startDate) / DAY);
  } else {
    let days = 0;
    const current = new Date(startDate);
    
    while (current < endDate) {
      if (isWorkingDay(current)) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }
};

const addDays = (date, days, includeWeekends = false) => {
  const result = new Date(date);
  
  if (includeWeekends) {
    result.setDate(result.getDate() + days);
    return toISO(result);
  } else {
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (isWorkingDay(result)) {
        addedDays++;
      }
    }
    
    return toISO(result);
  }
};

const findColumnIndex = (targetDate, referenceDate, includeWeekends = false) => {
  if (!targetDate || !referenceDate) return 0;
  
  const target = new Date(targetDate);
  const reference = new Date(referenceDate);
  
  if (includeWeekends) {
    return Math.ceil((target - reference) / DAY);
  } else {
    let current = new Date(reference);
    let index = 0;
    
    while (current <= target) {
      if (isWorkingDay(current)) {
        index++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return index;
  }
};

const PortfolioCharts = ({ projects, portfolioMetrics = {}, workPackages = [], risks = [], tasksByProject = {} }) => {
  
  // Datos para gráfico de distribución por estado
  const statusData = [
    { name: 'Activos', count: portfolioMetrics?.activeProjects || projects.filter(p => p.status === 'active').length, color: '#3B82F6' },
    { name: 'Completados', count: portfolioMetrics?.completedProjects || projects.filter(p => p.status === 'completed').length, color: '#10B981' },
    { name: 'En Pausa', count: projects.filter(p => p.status === 'on-hold').length, color: '#F59E0B' },
    { name: 'Cancelados', count: projects.filter(p => p.status === 'cancelled').length, color: '#EF4444' }
  ].filter(item => item.count > 0);

  // Datos para gráfico de distribución por prioridad
  const priorityData = [
    { name: 'Alta', count: projects.filter(p => p.priority === 'high').length, color: '#EF4444' },
    { name: 'Media', count: projects.filter(p => p.priority === 'medium').length, color: '#F59E0B' },
    { name: 'Baja', count: projects.filter(p => p.priority === 'low').length, color: '#10B981' }
  ].filter(item => item.count > 0);

  // Datos para gráfico de presupuesto por proyecto (solo activos)
  const budgetData = projects.filter(p => p.status === 'active').map((project, index) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return {
      name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
      budget: project.budget / 1000,
      status: project.status,
      color: colors[index % colors.length] // Asignar color único a cada proyecto
    };
  });

  // Nuevos datos para work packages
  const workPackageStatusData = [
    { name: 'Completados', count: workPackages.filter(wp => wp.status === 'completed').length, color: '#10B981' },
    { name: 'En Progreso', count: workPackages.filter(wp => wp.status === 'in-progress').length, color: '#3B82F6' },
    { name: 'Pendientes', count: workPackages.filter(wp => wp.status === 'pending').length, color: '#F59E0B' },
    { name: 'Retrasados', count: workPackages.filter(wp => wp.status === 'delayed').length, color: '#EF4444' }
  ].filter(item => item.count > 0);

  // Datos para riesgos
  const riskPriorityData = [
    { name: 'Alta', count: risks.filter(r => r.priority === 'high').length, color: '#EF4444' },
    { name: 'Media', count: risks.filter(r => r.priority === 'medium').length, color: '#F59E0B' },
    { name: 'Baja', count: risks.filter(r => r.priority === 'low').length, color: '#10B981' }
  ].filter(item => item.count > 0);

  const riskStatusData = [
    { name: 'Activos', count: risks.filter(r => r.status === 'active').length, color: '#EF4444' },
    { name: 'Mitigados', count: risks.filter(r => r.status === 'mitigated').length, color: '#10B981' },
    { name: 'Cerrados', count: risks.filter(r => r.status === 'closed').length, color: '#6B7280' }
  ].filter(item => item.count > 0);

  // Función para crear gráfico de barras simple
  const SimpleBarChart = ({ data, title, valueKey, colorKey = 'color', height = 200 }) => {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    
    // Función para obtener color basado en el tipo de dato
    const getBarColor = (item, index) => {
      if (item[colorKey]) return item[colorKey];
      
      // Colores por defecto para diferentes tipos de datos
      const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
      return defaultColors[index % defaultColors.length];
    };
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
            const barColor = getBarColor(item, index);
            const barWidth = maxValue > 0 ? `${(item[valueKey] / maxValue) * 100}%` : '0%';
            const displayValue = typeof item[valueKey] === 'number' ? item[valueKey].toFixed(0) : item[valueKey];
            
            return (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm text-gray-600 truncate">{item.name}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-300"
                      style={{
                        backgroundColor: barColor,
                        width: barWidth,
                        minWidth: '40px'
                      }}
                    >
                      {displayValue}
                    </div>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right font-medium">
                  {displayValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Función para crear gráfico de dona simple
  const SimplePieChart = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    let currentAngle = 0;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="150" height="150" className="transform -rotate-90">
              {data.map((item, index) => {
                const percentage = (item.count / total) * 100;
                // Convertir porcentaje a grados (360 grados = 100%)
                const angleInDegrees = (percentage / 100) * 360;
                // Convertir grados a radianes para el cálculo de stroke-dasharray
                const circumference = 2 * Math.PI * 60; // 2πr donde r=60
                const strokeLength = (angleInDegrees / 360) * circumference;
                const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
                const strokeDashoffset = -currentAngle;
                currentAngle += strokeLength;
                
                return (
                  <circle
                    key={index}
                    cx="75"
                    cy="75"
                    r="60"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="text-sm text-gray-700">
                  {item.name}: {item.count} ({((item.count / total) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Funciones auxiliares para el Timeline
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
    return new Date(d.setDate(diff));
  };

  const getWeekNumber = (date, startWeek) => {
    const weekStart = getStartOfWeek(new Date(date));
    const startWeekStart = getStartOfWeek(new Date(startWeek));
    const diffTime = weekStart.getTime() - startWeekStart.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return Math.max(0, diffWeeks);
  };

  // NUEVAS FUNCIONES: Para obtener números reales de semana ISO
  const getISOWeekNumber = (date) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay() || 7; // Convertir domingo (0) a 7
    d.setDate(d.getDate() + 4 - dayOfWeek); // Ir al jueves de esta semana
    
    const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - firstDayOfYear) / (24 * 60 * 60 * 1000)) + 1;
    
    return Math.ceil(days / 7);
  };

  const getWeekYear = (date) => {
    const d = new Date(date);
    const dayOfWeek = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayOfWeek);
    return d.getFullYear();
  };

  const getWeekLabel = (date, previousYear = null) => {
    const weekNum = getISOWeekNumber(date);
    const year = getWeekYear(date);
    
    // Mostrar año solo cuando cambia
    if (previousYear === null || year !== previousYear) {
      return `Semana ${weekNum} (${year})`;
    }
    return `Semana ${weekNum}`;
  };

  const getProjectMilestones = (projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    return projectTasks
      .filter(task => task.isMilestone)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const calculateProjectProgress = (projectId, currentDate = new Date()) => {
    const projectTasks = tasksByProject[projectId] || [];
    const today = new Date(currentDate);
    
    // Tareas planificadas para completar hasta hoy
    const plannedTasks = projectTasks.filter(task => 
      new Date(task.endDate) <= today
    );
    
    // Tareas completadas hasta hoy
    const completedTasks = projectTasks.filter(task => 
      task.progress === 100 && new Date(task.endDate) <= today
    );
    
    if (plannedTasks.length === 0) return 100;
    
    return Math.round((completedTasks.length / plannedTasks.length) * 100);
  };

  const getProgressColor = (progressPercentage) => {
    if (progressPercentage >= 100) return '#10B981'; // Verde
    if (progressPercentage >= 80) return '#F59E0B';  // Amarillo
    return '#EF4444'; // Rojo
  };

  // ===== FUNCIONES ESPECÍFICAS PARA EL GANTT DE PROYECTOS =====
  
  // Función para obtener hitos de un proyecto con posicionamiento en píxeles - CORREGIDO: Usar días calendario
  const getProjectMilestonesForGantt = (projectId, referenceDate, pxPerDay, includeWeekends = false) => {
    const projectTasks = tasksByProject[projectId] || [];
    const milestones = projectTasks
      .filter(task => task.isMilestone)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .map((milestone, index) => {
        // CORRECCIÓN: Usar días calendario para que coincida con la generación de headers semanales
        const milestoneStartDate = new Date(milestone.startDate);
        const refDate = new Date(referenceDate);
        const leftDays = Math.floor((milestoneStartDate - refDate) / DAY);
        return {
          id: milestone.id,
          name: milestone.name,
          startDate: milestone.startDate,
          leftPx: leftDays * pxPerDay,
          number: index + 1
        };
      });
    
    return milestones;
  };

  // Función para generar barras del Gantt de proyectos - CORREGIDO: Usar días calendario
  const generateProjectGanttBars = (projects, referenceDate, pxPerDay, includeWeekends = false) => {
    return projects.map((project) => {
      const projectStartDate = project.startDate;
      const projectEndDate = project.endDate;
      
      // CORRECCIÓN: Usar días calendario para que coincida con la generación de headers semanales
      const startDate = new Date(projectStartDate);
      const endDate = new Date(projectEndDate);
      const refDate = new Date(referenceDate);
      
      const leftDays = Math.floor((startDate - refDate) / DAY);
      const endDays = Math.floor((endDate - refDate) / DAY);
      const durDays = Math.max(1, endDays - leftDays + 1);
      
      // Obtener hitos del proyecto
      const milestones = getProjectMilestonesForGantt(project.id, referenceDate, pxPerDay, includeWeekends);
      
      // Calcular progreso del proyecto
      const progressPercentage = calculateProjectProgress(project.id);
      const progressColor = getProgressColor(progressPercentage);
      
      return {
        id: project.id,
        name: project.name,
        startDate: projectStartDate,
        endDate: projectEndDate,
        leftPx: leftDays * pxPerDay,
        widthPx: durDays * pxPerDay,
        progressPercentage,
        progressColor,
        milestones,
        totalDays: durDays
      };
    });
  };

  // Función para generar encabezados del timeline (reutilizada del Gantt original)
  const generateProjectTimelineHeaders = (startDate, endDate, pxPerDay, includeWeekends = false) => {
    const headers = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Usar escala de semanas para mejor visualización
    const cur = new Date(start);
    while (cur <= end) {
      const labelStart = new Date(cur);
      const labelEnd = new Date(cur);
      labelEnd.setDate(labelEnd.getDate() + 6);
      
      const remaining = Math.min(7, diffDaysExclusive(labelStart, addDays(end, 1, includeWeekends), includeWeekends));
      
      headers.push({ 
        label: `S ${labelStart.getDate()}—${labelEnd.getDate()}`, 
        sub: labelStart.toLocaleDateString('es', { month: 'short' }), 
        width: remaining * pxPerDay 
      });
      
      cur.setDate(cur.getDate() + 7);
    }
    
    return headers;
  };

  const ProjectGanttChart = () => {
    // Configuración del Gantt
    const ROW_H = 50;
    const PADDING_TOP = 10;
    const pxPerDay = 20;
    const includeWeekends = false;
    
    // Refs para sincronización de scroll
    const headerRef = useRef(null);
    const contentRef = useRef(null);
    const isScrolling = useRef(false);
    
    // Calcular fechas del proyecto
    const projectDates = useMemo(() => {
      if (projects.length === 0) return { start: new Date(), end: new Date() };
      
      const dates = projects.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
      const projectStart = new Date(Math.min(...dates.map((d) => d.getTime())));
      const projectEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
      
      return { start: projectStart, end: projectEnd };
    }, [projects]);
    
    // Fecha de referencia del timeline
    const getTimelineReferenceDate = useMemo(() => {
      return toISO(projectDates.start);
    }, [projectDates.start]);
    
    // Calcular total de días y ancho del gráfico
    const totalDays = useMemo(() => {
      const pStart = getTimelineReferenceDate;
      const pEnd = toISO(projectDates.end);
      return Math.max(1, diffDaysExclusive(pStart, addDays(pEnd, 1, includeWeekends), includeWeekends));
    }, [getTimelineReferenceDate, projectDates.end, includeWeekends]);
    
    const chartWidthPx = useMemo(() => {
      return totalDays * pxPerDay;
    }, [totalDays]);
    
    // Línea "Hoy" - CORREGIDO: Usar días calendario para coincidir con headers semanales
    const todayLeftPx = useMemo(() => {
      const todayISO = toISO(new Date());
      // CORRECCIÓN: Usar días calendario para que coincida con la generación de headers semanales
      const todayDate = new Date(todayISO);
      const refDate = new Date(getTimelineReferenceDate);
      const daysDifference = Math.floor((todayDate - refDate) / DAY);
      return Math.min(Math.max(0, daysDifference * pxPerDay), chartWidthPx);
    }, [getTimelineReferenceDate, pxPerDay, chartWidthPx]);
    
    // Colores semánticos para el estado de cumplimiento
    const PROJECT_STATUS_COLORS = {
      COMPLETED: '#10B981',    // Verde - Todas las tareas vencidas completadas
      OVERDUE: '#EF4444',      // Rojo - Tareas vencidas sin completar  
      NO_TASKS: '#4A5568'      // Gris Oxford - Sin tareas vencidas
    };

    // Función para evaluar el estado de cumplimiento de tareas del proyecto
    const getProjectStatusColor = (projectId, currentDate = new Date()) => {
      const projectTasks = tasksByProject[projectId] || [];
      
      // Tareas que debieron cumplirse antes de hoy
      const overdueTasks = projectTasks.filter(task => 
        new Date(task.endDate) <= currentDate
      );
      
      // Si no hay tareas vencidas, color gris Oxford
      if (overdueTasks.length === 0) {
        return PROJECT_STATUS_COLORS.NO_TASKS;
      }
      
      // Verificar si todas las tareas vencidas están completadas
      const allCompleted = overdueTasks.every(task => task.progress === 100);
      
      return allCompleted ? PROJECT_STATUS_COLORS.COMPLETED : PROJECT_STATUS_COLORS.OVERDUE;
    };
    
    // Generar barras del Gantt - CORREGIDO: Usar días calendario para coincidir con headers semanales
    const projectGanttBars = useMemo(() => {
      return projects.map((project) => {
        // CORRECCIÓN: Usar días calendario para que coincida con la generación de headers semanales
        const projectStartDate = new Date(project.startDate);
        const projectEndDate = new Date(project.endDate);
        const refDate = new Date(getTimelineReferenceDate);
        
        const leftDays = Math.floor((projectStartDate - refDate) / DAY);
        const endDays = Math.floor((projectEndDate - refDate) / DAY);
        const durDays = Math.max(1, endDays - leftDays + 1);
        
        const milestones = (tasksByProject[project.id] || [])
          .filter(task => task.isMilestone)
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
          .map((milestone, index) => {
            // CORRECCIÓN: Usar días calendario para que coincida con la generación de headers semanales
            const milestoneStartDate = new Date(milestone.startDate);
            const mLeftDays = Math.floor((milestoneStartDate - refDate) / DAY);
            return {
              ...milestone,
              leftPx: mLeftDays * pxPerDay,
              number: index + 1 // Numeración consecutiva por proyecto
            };
          });
        
        return {
          id: project.id,
          name: project.name,
          startDate: project.startDate,
          endDate: project.endDate,
          leftPx: leftDays * pxPerDay,
          widthPx: durDays * pxPerDay,
          progressPercentage: project.progressPercentage,
          progressColor: getProjectStatusColor(project.id), // Usar nueva lógica de colores
          milestones,
          totalDays: durDays
        };
      });
    }, [projects, getTimelineReferenceDate, pxPerDay, includeWeekends, tasksByProject]);
    
    // Generar encabezados del timeline
    const timelineHeaders = useMemo(() => {
      const headers = [];
      const start = new Date(getTimelineReferenceDate);
      const end = new Date(toISO(projectDates.end));
      
      const cur = new Date(start);
      while (cur <= end) {
        const labelStart = new Date(cur);
        const labelEnd = new Date(cur);
        labelEnd.setDate(labelEnd.getDate() + 6);
        
        const remaining = Math.min(7, diffDaysExclusive(labelStart, addDays(end, 1, includeWeekends), includeWeekends));
        
        headers.push({ 
          label: `S ${labelStart.getDate()}—${labelEnd.getDate()}`, 
          sub: labelStart.toLocaleDateString('es', { month: 'short' }), 
          width: remaining * pxPerDay 
        });
        
        cur.setDate(cur.getDate() + 7);
      }
      
      return headers;
    }, [getTimelineReferenceDate, projectDates.end, pxPerDay, includeWeekends]);
    
    // Funciones de sincronización de scroll
    const onHeaderScroll = (e) => {
      if (contentRef.current && !isScrolling.current) {
        isScrolling.current = true;
        contentRef.current.scrollLeft = e.currentTarget.scrollLeft;
        setTimeout(() => { isScrolling.current = false; }, 10);
      }
    };
    
    const onContentScroll = (e) => {
      if (headerRef.current && !isScrolling.current) {
        isScrolling.current = true;
        headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        setTimeout(() => { isScrolling.current = false; }, 10);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Timeline de Proyectos</h3>
        
        {/* 🔴 CONTENEDOR PRINCIPAL ROJO - SIN BORDES */}
        <div className="rounded-lg p-2 max-w-full overflow-hidden" style={{ maxWidth: 'calc(100vw - 150px)' }}>
          
          {/* 🔵 CONTENEDOR PRINCIPAL INTERNO AZUL - SIN BORDES */}
          <div className="rounded-lg p-2 max-w-full overflow-x-auto overflow-hidden">
            
            {/* 🟢 CONTENEDOR 1 VERDE - SIN BORDES */}
            <div className="rounded-lg p-2 flex flex-col">
              
              {/* FILA 1: Header "Proyectos" + Contenedor 2 (Headers de fechas) */}
              <div className="flex mb-2 max-w-full overflow-hidden">
                {/* 🟡 COLUMNA FIJA AMARILLO - Sin bordes ni color de fondo */}
                <div className="rounded-lg p-2 w-64 flex-shrink-0 flex items-center">
                  <div className="text-sm font-semibold text-gray-700">
                    Proyectos
                  </div>
                </div>
                
                {/* 🩷 CONTENEDOR 2: HEADERS ROSA - Sin bordes */}
                <div className="rounded-lg p-2 flex-1 ml-2 min-w-0">
                  <div 
                    ref={headerRef}
                    onScroll={onHeaderScroll}
                    className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                  >
                    <div 
                      className="flex"
                      style={{ width: chartWidthPx }}
                    >
                      {timelineHeaders.map((header, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-600 text-center border-r border-gray-200 flex-shrink-0 py-2"
                          style={{ width: header.width, minWidth: header.width }}
                        >
                          <div className="font-medium">{header.label}</div>
                          <div className="text-gray-400">{header.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* FILA 2: Lista de proyectos + Contenedor 3 (Contenido/Barras) */}
              <div className="flex max-w-full overflow-hidden">
                {/* 🟡 COLUMNA FIJA AMARILLO - Lista de nombres de proyectos - Sin bordes */}
                <div className="rounded-lg p-2 w-64 flex-shrink-0">
                  <div className="relative" style={{ height: '400px' }}>
                    {projectGanttBars.map((project, index) => (
                      <div
                        key={project.id}
                        className="absolute text-sm font-medium text-gray-700 truncate flex items-center"
                        style={{ 
                          top: PADDING_TOP + index * (ROW_H + 8),
                          height: ROW_H,
                          width: '100%'
                        }}
                      >
                        {project.name}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 🟠 CONTENEDOR 3: CONTENIDO NARANJA - Sin bordes */}
                <div className="rounded-lg p-2 flex-1 ml-2 min-w-0">
                  <div 
                    ref={contentRef}
                    onScroll={onContentScroll}
                    className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                    style={{ height: '400px' }}
                  >
                    <div style={{ width: chartWidthPx, position: 'relative' }}>
                      {/* Línea "Hoy" */}
                      {todayLeftPx > 0 && todayLeftPx < chartWidthPx && (
                        <div
                          className="absolute z-10 w-0.5 bg-red-500"
                          style={{
                            left: todayLeftPx,
                            top: 0,
                            height: `${projects.length * (ROW_H + 8) + PADDING_TOP}px`
                          }}
                        >
                          <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded -mt-2 -ml-6 whitespace-nowrap">
                            HOY 500
                          </div>
                        </div>
                      )}
                      
                      {/* Barras de proyectos */}
                      {projectGanttBars.map((project, index) => (
                        <div
                          key={project.id}
                          className="absolute"
                          style={{
                            left: project.leftPx,
                            top: PADDING_TOP + index * (ROW_H + 8),
                            width: project.widthPx,
                            height: ROW_H - 4
                          }}
                        >
                          <div
                            className="relative rounded flex items-center px-2 text-white text-xs font-medium h-full"
                            style={{ backgroundColor: project.progressColor }}
                          >
                            {/* Hitos del proyecto - Numerados consecutivamente */}
                            {project.milestones.map((milestone) => (
                              <div
                                key={milestone.id}
                                className="absolute top-1/2 transform -translate-y-1/2 bg-white border-2 border-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm z-10"
                                style={{
                                  left: milestone.leftPx - project.leftPx
                                }}
                                title={`Hito ${milestone.number}: ${milestone.name}`}
                              >
                                {milestone.number}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
              </div>
              
            </div>
            
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="mt-4 text-xs text-gray-500 flex justify-between">
          <span>Inicio: {new Date(projectDates.start).toLocaleDateString('es')}</span>
          <span>Fin: {new Date(projectDates.end).toLocaleDateString('es')}</span>
        </div>
      </div>
    );
  };

  // Métricas financieras consolidadas
  const FinancialMetrics = () => {
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalContingency = projects.reduce((sum, p) => sum + p.contingencyReserve, 0);
    const totalManagement = projects.reduce((sum, p) => sum + p.managementReserve, 0);
    const totalReserves = totalContingency + totalManagement;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">💰 Métricas Financieras Consolidadas</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ${(totalBudget / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-blue-600">Presupuesto Total</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${(totalReserves / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-green-600">Reservas Totales</div>
          </div>
        </div>

        {/* Distribución del presupuesto */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Distribución del Presupuesto:</span>
          </div>
          
          {projects.map((project, index) => {
            const percentage = (project.budget / totalBudget) * 100;
            return (
              <div key={project.id} className="flex items-center">
                <div className="w-24 text-sm text-gray-600 truncate">{project.name}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-4 relative">
                    <div
                      className="h-4 bg-blue-500 rounded-full flex items-center justify-end pr-2 text-white text-xs"
                      style={{ width: `${percentage}%`, minWidth: '40px' }}
                    >
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  ${(project.budget / 1000).toFixed(0)}K
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {statusData.length > 0 && (
          <SimplePieChart
            data={statusData}
            title="📊 Distribución por Estado"
          />
        )}
        
        {priorityData.length > 0 && (
          <SimplePieChart
            data={priorityData}
            title="⚡ Distribución por Prioridad"
          />
        )}
      </div>

      {/* Gráfico de presupuestos */}
      {budgetData.length > 0 && (
        <SimpleBarChart
          data={budgetData}
          title="💰 Presupuesto por Proyecto (K$)"
          valueKey="budget"
          colorKey="color"
        />
      )}

      {/* Nuevos gráficos de Work Packages y Riesgos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workPackageStatusData.length > 0 && (
          <SimplePieChart
            data={workPackageStatusData}
            title="📋 Estado de Work Packages"
          />
        )}
        
        {riskStatusData.length > 0 && (
          <SimplePieChart
            data={riskStatusData}
            title="⚠️ Estado de Riesgos"
          />
        )}
      </div>

      {/* Gráfico de prioridad de riesgos */}
      {riskPriorityData.length > 0 && (
        <SimpleBarChart
          data={riskPriorityData}
          title="🎯 Prioridad de Riesgos"
          valueKey="count"
        />
      )}

      {/* Timeline de proyectos */}
      <ProjectGanttChart />

      {/* Métricas financieras */}
      <FinancialMetrics />
    </div>
  );
};

export default PortfolioCharts;
