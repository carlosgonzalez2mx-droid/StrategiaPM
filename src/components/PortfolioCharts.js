import React, { useMemo, useRef } from 'react';

// ===== Utilidades de tiempo (importadas del Gantt) =====
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
  
  // Función para obtener hitos de un proyecto con posicionamiento en píxeles
  const getProjectMilestonesForGantt = (projectId, referenceDate, pxPerDay, includeWeekends = false) => {
    const projectTasks = tasksByProject[projectId] || [];
    const milestones = projectTasks
      .filter(task => task.isMilestone)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .map((milestone, index) => {
        const leftDays = findColumnIndex(milestone.startDate, referenceDate, includeWeekends);
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

  // Función para generar barras del Gantt de proyectos
  const generateProjectGanttBars = (projects, referenceDate, pxPerDay, includeWeekends = false) => {
    return projects.map((project) => {
      const projectStartDate = project.startDate;
      const projectEndDate = project.endDate;
      
      // Calcular posición y duración usando findColumnIndex
      const leftDays = findColumnIndex(projectStartDate, referenceDate, includeWeekends);
      const endColumnIndex = findColumnIndex(projectEndDate, referenceDate, includeWeekends);
      const durDays = Math.max(1, endColumnIndex - leftDays + 1);
      
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

  // Gantt de proyectos (basado en el Gantt del cronograma)
  const ProjectGanttChart = () => {
    // Configuración del Gantt (reutilizada del cronograma)
    const ROW_H = 50;
    const PADDING_TOP = 10;
    const pxPerDay = 28; // Escala de semanas
    const includeWeekends = false; // Por defecto sin fines de semana
    
    // Refs para sincronización de scroll
    const headerRef = useRef(null);
    const contentRef = useRef(null);
    const isScrolling = useRef(false);
    
    // Calcular fechas del proyecto
    const projectDates = useMemo(() => {
      if (projects.length === 0) return { start: new Date(), end: new Date() };
      
      const dates = projects.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
      return {
        start: new Date(Math.min(...dates.map((d) => d.getTime()))),
        end: new Date(Math.max(...dates.map((d) => d.getTime())))
      };
    }, [projects]);
    
    // Calcular total de días y ancho del gráfico
    const totalDays = useMemo(() => {
      const pStart = toISO(projectDates.start);
      const pEnd = toISO(projectDates.end);
      return Math.max(1, diffDaysExclusive(pStart, addDays(pEnd, 1, includeWeekends), includeWeekends));
    }, [projectDates, includeWeekends]);
    
    const chartWidthPx = useMemo(() => totalDays * pxPerDay, [totalDays, pxPerDay]);
    
    // Fecha de referencia para el timeline
    const getTimelineReferenceDate = useMemo(() => {
      return toISO(projectDates.start);
    }, [projectDates.start]);
    
    // Línea "Hoy"
    const todayLeftPx = useMemo(() => {
      const todayISO = toISO(new Date());
      const days = findColumnIndex(todayISO, getTimelineReferenceDate, includeWeekends);
      return Math.min(Math.max(0, days * pxPerDay), chartWidthPx);
    }, [getTimelineReferenceDate, pxPerDay, chartWidthPx, includeWeekends]);
    
    // Generar barras del Gantt de proyectos
    const projectGanttBars = useMemo(() => {
      return generateProjectGanttBars(projects, getTimelineReferenceDate, pxPerDay, includeWeekends);
    }, [projects, getTimelineReferenceDate, pxPerDay, includeWeekends]);
    
    // Generar encabezados del timeline
    const timelineHeaders = useMemo(() => {
      return generateProjectTimelineHeaders(
        projectDates.start, 
        projectDates.end, 
        pxPerDay, 
        includeWeekends
      );
    }, [projectDates, pxPerDay, includeWeekends]);
    
    // Funciones de sincronización de scroll (igual que en ScheduleManagement.js)
    const onHeaderScroll = (e) => {
      // Sincronizar scroll horizontal del contenido con los headers
      if (contentRef.current && !isScrolling.current) {
        isScrolling.current = true;
        contentRef.current.scrollLeft = e.currentTarget.scrollLeft;
        setTimeout(() => { isScrolling.current = false; }, 10);
      }
    };
    
    const onContentScroll = (e) => {
      // Sincronizar scroll horizontal de los headers con el contenido
      if (headerRef.current && !isScrolling.current) {
        isScrolling.current = true;
        headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        setTimeout(() => { isScrolling.current = false; }, 10);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Timeline de Proyectos</h3>
        
        {/* Encabezados del timeline - Scroll horizontal sincronizado */}
        <div className="flex items-center mb-4">
          <div className="w-48 flex-shrink-0 text-sm font-medium text-gray-700">
            Proyectos
          </div>
          <div 
            ref={headerRef}
            onScroll={onHeaderScroll}
            className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            style={{ 
              width: Math.max(chartWidthPx + 100, 800),
              minWidth: Math.max(chartWidthPx + 100, 800)
            }}
          >
            {timelineHeaders.map((header, index) => (
              <div
                key={index}
                className="text-xs text-gray-600 text-center border-r border-gray-200 flex-shrink-0"
                style={{ width: header.width, minWidth: header.width }}
              >
                <div className="font-medium">{header.label}</div>
                <div className="text-gray-400">{header.sub}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Contenido scrolleable del Gantt - Scroll sincronizado */}
        <div 
          ref={contentRef}
          onScroll={onContentScroll}
          className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
          style={{ height: '400px' }}
        >
          <div style={{ width: Math.max(chartWidthPx + 100, 800) }}>
            {/* Barras del Gantt */}
            <div className="relative">
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
                  <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded -mt-2 -ml-6">
                    HOY
                  </div>
                </div>
              )}
              
              {/* Barras de proyectos */}
              {projectGanttBars.map((project, index) => (
                <div
                  key={project.id}
                  className="absolute flex items-center"
                  style={{
                    left: 0,
                    top: PADDING_TOP + index * (ROW_H + 8),
                    height: ROW_H
                  }}
                >
                  {/* Nombre del proyecto */}
                  <div className="w-48 flex-shrink-0 text-sm font-medium text-gray-700 truncate pr-2">
                    {project.name}
                  </div>
                  
                  {/* Barra del proyecto */}
                  <div
                    className="relative rounded flex items-center px-2 text-white text-xs font-medium"
                    style={{
                      left: project.leftPx,
                      width: project.widthPx,
                      height: ROW_H - 4,
                      backgroundColor: project.progressColor
                    }}
                  >
                    {/* Hitos del proyecto */}
                    {project.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="absolute top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                        style={{
                          left: milestone.leftPx - project.leftPx
                        }}
                      >
                        {milestone.number}
                      </div>
                    ))}
                    
                    {/* Información del proyecto */}
                    <div className="ml-auto text-right">
                      <div className="text-xs font-bold">{project.progressPercentage}%</div>
                      <div className="text-xs opacity-80">{project.totalDays} días</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="mt-4 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Inicio: {new Date(projectDates.start).toLocaleDateString('es')}</span>
            <span>Fin: {new Date(projectDates.end).toLocaleDateString('es')}</span>
          </div>
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
