import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, AlertCircle, FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

// ============================================================================
// UTILIDADES
// ============================================================================

const DEBUG_MODE = false;

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
  d.setHours(0, 0, 0, 0);
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
  useSupabase = false
}) => {
  const [dateRange, setDateRange] = useState(weeklyPlanningData?.dateRange || {
    start: getStartOfWeek(new Date()),
    end: getEndOfWeek(new Date())
  });
  const [previousWeekData, setPreviousWeekData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localMinutaTasks, setLocalMinutaTasks] = useState({});
  const [loadingMinutas, setLoadingMinutas] = useState(false);

  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      // Force re-render implicitly
    };
    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status === 'active');
  }, [projects]);

  const previousWeekRange = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(dateRange.end);
    end.setDate(end.getDate() - 7);
    return { start, end };
  }, [dateRange]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filterTasksByDateRange = useCallback((tasks, startDate, endDate, isMinuteTask = false) => {
    return tasks.filter(task => {
      const taskDate = normalizeDate(
        isMinuteTask ? task.fecha : (task.endDate || task.startDate)
      );
      if (!taskDate) return false;
      return taskDate >= startDate && taskDate <= endDate;
    });
  }, []);

  const filterOverdueTasks = useCallback((tasks, isMinuteTask = false) => {
    return tasks.filter(task => {
      const dueDate = normalizeDate(
        isMinuteTask ? task.fecha : (task.endDate || task.startDate)
      );
      if (!dueDate) return false;
      const isPending = isTaskPending(task, isMinuteTask);
      return dueDate < today && isPending;
    });
  }, [today]);

  const getCurrentWeekTasks = useCallback((projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = localMinutaTasks[projectId] || [];

    const scheduleTasks = filterTasksByDateRange(projectTasks, dateRange.start, dateRange.end)
      .filter(task => isTaskPending(task, false));

    const minuteTasks = filterTasksByDateRange(projectMinuteTasks, dateRange.start, dateRange.end, true)
      .filter(task => isTaskPending(task, true));

    return { scheduleTasks, minuteTasks };
  }, [tasksByProject, localMinutaTasks, dateRange, filterTasksByDateRange]);

  const getOverdueTasks = useCallback((projectId) => {
    const projectTasks = tasksByProject[projectId] || [];
    const projectMinuteTasks = localMinutaTasks[projectId] || [];

    const scheduleTasks = filterOverdueTasks(projectTasks, false);
    const minuteTasks = filterOverdueTasks(projectMinuteTasks, true);

    return { scheduleTasks, minuteTasks };
  }, [tasksByProject, localMinutaTasks, filterOverdueTasks]);

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

      const completed = allPreviousTasks.filter((task, idx) =>
        isTaskCompleted(task, idx >= previousWeekScheduleTasks.length)
      ).length;

      const pending = allPreviousTasks.filter((task, idx) =>
        isTaskPending(task, idx >= previousWeekScheduleTasks.length)
      ).length;

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

  const loadPreviousWeekData = useCallback(async () => {
    setIsLoading(true);
    try {
      const complianceData = await calculatePreviousWeekCompliance();
      setPreviousWeekData(complianceData);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [calculatePreviousWeekCompliance]);

  useEffect(() => {
    loadPreviousWeekData();
  }, [loadPreviousWeekData]);

  useEffect(() => {
    if (setWeeklyPlanningData) {
      setWeeklyPlanningData({ dateRange, previousWeekData });
    }
  }, [dateRange, previousWeekData, setWeeklyPlanningData]);

  useEffect(() => {
    const loadMinutasForAllProjects = async () => {
      if (!projects || projects.length === 0) return;
      setLoadingMinutas(true);
      try {
        const minutasByProjectLocal = {};
        for (const project of activeProjects) {
          try {
            if (useSupabase) {
              const { default: supabaseService } = await import('../services/SupabaseService');
              const { success, minutas } = await supabaseService.loadMinutasByProject(project.id);
              if (success) minutasByProjectLocal[project.id] = minutas || [];
            } else {
              const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
              minutasByProjectLocal[project.id] = portfolioData.minutasByProject?.[project.id] || [];
            }
          } catch (error) {
            console.error(error);
          }
        }
        setLocalMinutaTasks(minutasByProjectLocal);
      } finally {
        setLoadingMinutas(false);
      }
    };
    loadMinutasForAllProjects();
  }, [projects, activeProjects, useSupabase]);

  const exportToPDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Planificación Semanal', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Período: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Tareas de la Semana Actual', 20, yPosition);
      yPosition += 15;

      activeProjects.forEach((project) => {
        const currentTasks = getCurrentWeekTasks(project.id);
        const overdueTasks = getOverdueTasks(project.id);
        const allTasks = [
          ...overdueTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
          ...overdueTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: true })),
          ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: false })),
          ...currentTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: false }))
        ];
        if (allTasks.length === 0) return;
        if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = 20; }

        doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`${project.name}`, 20, yPosition); yPosition += 8;
        const overdueList = allTasks.filter(t => t.isOverdue);
        if (overdueList.length > 0) {
          doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(220, 38, 38); doc.text('Tareas Vencidas:', 25, yPosition); yPosition += 6;
          overdueList.forEach((task) => {
            if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
            doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.text(`${task.name} (${task.type})`, 35, yPosition); yPosition += 4;
            doc.text(`  Vence: ${formatDate(task.endDate)}`, 35, yPosition); yPosition += 4;
          });
          yPosition += 5;
        }
        const currentList = allTasks.filter(t => !t.isOverdue);
        if (currentList.length > 0) {
          doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(59, 130, 246); doc.text('Tareas de la Semana:', 25, yPosition); yPosition += 6;
          currentList.forEach((task) => {
            if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
            doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(0, 0, 0); doc.text(`${task.name} (${task.type})`, 35, yPosition); yPosition += 4;
            doc.text(`  Vence: ${formatDate(task.endDate)}`, 35, yPosition);
            if (task.description) { yPosition += 4; doc.text(`  Responsable: ${task.description}`, 35, yPosition); }
            yPosition += 4;
          });
        }
        yPosition += 10;
      });
      doc.save(`Planificacion_Semanal_${formatDate(dateRange.start).replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error exportando PDF');
    }
  }, [dateRange, activeProjects, getCurrentWeekTasks, getOverdueTasks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Controls - Premium Colorful */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            Planificación Semanal
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
              <label className="text-sm font-medium text-white">Desde:</label>
              <input
                type="date"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                className="px-3 py-1 bg-white/90 text-slate-900 border-0 rounded-lg text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
              <label className="text-sm font-medium text-white">Hasta:</label>
              <input
                type="date"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                className="px-3 py-1 bg-white/90 text-slate-900 border-0 rounded-lg text-sm outline-none"
              />
            </div>
            <Button
              onClick={exportToPDF}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-2 border-white/30 shadow-lg flex gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card className="shadow-xl border-2 border-indigo-100">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
          <CardTitle className="flex items-center gap-2 text-lg text-indigo-900">
            <FileText className="h-5 w-5" />
            Tareas del Período
            <span className="ml-2 text-sm font-normal text-indigo-600">
              ({formatDate(dateRange.start)} - {formatDate(dateRange.end)})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
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
          {activeProjects.every(project => {
            const currentTasks = getCurrentWeekTasks(project.id);
            const overdueTasks = getOverdueTasks(project.id);
            return (currentTasks.scheduleTasks.length === 0 &&
              currentTasks.minuteTasks.length === 0 &&
              overdueTasks.scheduleTasks.length === 0 &&
              overdueTasks.minuteTasks.length === 0);
          }) && (
              <div className="text-center py-16 text-slate-500">
                <div className="text-5xl mb-4 opacity-20">📅</div>
                <p className="text-lg font-medium">No hay tareas planificadas para este período.</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

const ProjectTasksList = React.memo(({ project, currentTasks, overdueTasks }) => {
  const allTasks = useMemo(() => [
    ...overdueTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: true })),
    ...overdueTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: true })),
    ...currentTasks.scheduleTasks.map(t => ({ ...t, type: 'Cronograma', isOverdue: false })),
    ...currentTasks.minuteTasks.map(t => ({ ...t, type: 'Minuta', name: t.tarea, description: t.responsable, endDate: t.fecha, isOverdue: false }))
  ], [currentTasks, overdueTasks]);

  if (allTasks.length === 0) return null;

  return (
    <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-lg">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b-2 border-blue-100">
        <h4 className="font-bold text-slate-800 flex items-center gap-3">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg"></div>
          {project.name}
          <span className="text-xs font-bold bg-white border-2 border-blue-200 text-blue-700 px-3 py-1 rounded-full shadow-sm">
            {allTasks.length} tareas
          </span>
        </h4>
      </div>
      <div className="divide-y divide-slate-100">
        {allTasks.map((task, index) => (
          <TaskCard key={`${task.id}-${index}`} task={task} isOverdue={task.isOverdue} />
        ))}
      </div>
    </div>
  );
});

const TaskCard = React.memo(({ task, isOverdue }) => (
  <div className={cn(
    "p-5 transition-all hover:bg-gradient-to-r flex items-start justify-between group",
    isOverdue ? "bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100" : "hover:from-blue-50 hover:to-indigo-50"
  )}>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <h6 className={cn("font-bold", isOverdue ? "text-red-700" : "text-slate-900")}>{task.name}</h6>
        {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
      </div>
      {task.description && (
        <p className="text-sm text-slate-500 mb-2 line-clamp-1">{task.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          {formatDate(task.endDate)}
        </span>
        <span className={cn("px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider shadow-sm",
          task.type === 'Cronograma' ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" : "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
        )}>
          {task.type}
        </span>
        {task.priority && (
          <span className="px-2 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] uppercase font-bold tracking-wider shadow-sm">
            {task.priority}
          </span>
        )}
      </div>
    </div>
    <div className="ml-4 shrink-0">
      <span className={cn("px-3 py-1.5 text-xs rounded-full font-bold border-2 shadow-lg",
        isOverdue
          ? "bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300"
          : "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300"
      )}>
        {isOverdue ? '🚨 Vencida' : '✅ Pendiente'}
      </span>
    </div>
  </div>
));

export default WeeklyPlanningTab;