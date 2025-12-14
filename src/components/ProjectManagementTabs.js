import { logger } from '../utils/logger';

import React, { useState, useMemo, useEffect } from 'react';
import RiskManagement from './RiskManagement';
import ScheduleManagement from './ScheduleManagement';
import FinancialManagement from './FinancialManagement';
import ResourceManagement from './ResourceManagement';
import FileManager from './FileManager';
import ProjectAudit from './ProjectAudit';
import ChangeManagement from './ChangeManagement';
import CashFlowProjection from './CashFlowProjection';
import usePermissions from '../hooks/usePermissions';
import FloatingSaveButton from './FloatingSaveButton';
import { cn } from '../lib/utils';

// Componente para manejar tareas huérfanas
const OrphanedTasksManager = ({ orphanedTasks, availableMilestones, onReassign, updateMinutaTaskHito }) => {
  const [reassigning, setReassigning] = useState({});

  const handleReassign = async (taskId, newHitoId) => {
    if (!newHitoId) return;

    setReassigning(prev => ({ ...prev, [taskId]: true }));

    try {
      const success = await updateMinutaTaskHito(taskId, newHitoId);

      if (success) {
        // Notificar al componente padre
        onReassign(taskId, newHitoId);

        // Mostrar confirmación
        alert('✅ Tarea reasignada exitosamente');
      } else {
        alert('❌ Error al reasignar tarea');
      }
    } catch (error) {
      logger.error('Error en reasignación:', error);
      alert('❌ Error al reasignar tarea');
    } finally {
      setReassigning(prev => ({ ...prev, [taskId]: false }));
    }
  };

  if (orphanedTasks.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-900 font-bold text-lg flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            Tareas de Minuta sin Hito Asignado
          </h3>
          <span className="text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-1.5 rounded-full font-bold shadow-lg">
            {orphanedTasks.length} tareas
          </span>
        </div>

        <p className="text-amber-800 text-sm mb-4 font-medium">
          Estas tareas perdieron su hito asignado. Reasígnalas para mantener la organización.
        </p>

        <div className="space-y-3">
          {orphanedTasks.map(task => {
            const daysUntilDeadline = Math.ceil((new Date(task.fecha) - new Date()) / (1000 * 60 * 60 * 24));
            const urgencyColor = daysUntilDeadline <= 3 ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300' :
              daysUntilDeadline <= 7 ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-300' :
                'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300';

            return (
              <div key={task.id} className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-bold text-slate-900">{task.tarea}</span>
                      <span className="text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1 rounded-full flex items-center font-bold shadow-sm">
                        <span className="mr-1">📝</span>
                        Minuta
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-600">
                      <span className="font-medium">👤 {task.responsable}</span>
                      <span className="font-medium">📅 {new Date(task.fecha).toLocaleDateString('es-ES')}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 ${task.estatus === 'Completado' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300' :
                        task.estatus === 'En Proceso' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {task.estatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-lg ${urgencyColor}`}>
                      {daysUntilDeadline === 0 ? 'Hoy' :
                        daysUntilDeadline === 1 ? 'Mañana' :
                          `${daysUntilDeadline} días`}
                    </span>

                    <select
                      value={task.hitoId || ''}
                      onChange={(e) => handleReassign(task.id, e.target.value)}
                      disabled={reassigning[task.id]}
                      className="text-xs border-2 border-slate-200 rounded-lg px-3 py-2 min-w-[200px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
                    >
                      <option value="">Seleccionar hito...</option>
                      {availableMilestones.map(milestone => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </select>

                    {reassigning[task.id] && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProjectManagementTabs = ({
  projects,
  currentProjectId,
  setCurrentProjectId,
  workPackages,
  setWorkPackages,
  risks,
  setRisks,
  reportingDate,
  setReportingDate,
  tasks,
  setTasks,
  importTasks,
  includeWeekends,
  setIncludeWeekends,
  purchaseOrders,
  setPurchaseOrders,
  advances,
  setAdvances,
  invoices,
  setInvoices,
  contracts,
  setContracts,
  resourceAssignments,
  useSupabase = false,
  updateProjectMinutas,
  hasUnsavedChanges = false,
  onSave
}) => {
  // Hook de permisos
  const { permissions, isReadOnly } = usePermissions();

  const [activeTab, setActiveTab] = useState('summary');
  const [scheduleData, setScheduleData] = useState(null); // Nuevo estado para datos del cronograma
  const [archivedProjects, setArchivedProjects] = useState([]); // Estado para proyectos archivados

  // Estado para las tareas de minuta del proyecto actual
  const [minutaTasks, setMinutaTasks] = useState([]);
  const [loadingMinutas, setLoadingMinutas] = useState(false);

  // Definir pestañas con permisos ANTES de los useEffect
  const allProjectTabs = [
    { id: 'summary', name: 'Dashboard Resumen', icon: '📊', requiresEdit: false },
    { id: 'risks', name: 'Gestión de Riesgos', icon: '🛡️', requiresEdit: true },
    { id: 'schedule', name: 'Cronograma', icon: '📅', requiresEdit: true },
    { id: 'financial', name: 'Gestión Financiera', icon: '💰', requiresEdit: true },
    { id: 'resources', name: 'Gestión de Recursos', icon: '👥', requiresEdit: true },
    { id: 'changes', name: 'Control de Cambios', icon: '🔄', requiresEdit: true },
    { id: 'cashflow', name: 'Flujo de Caja', icon: '💸', requiresEdit: false },
    { id: 'files', name: 'Archivos', icon: '📎', requiresEdit: false },
    { id: 'audit', name: 'Auditoría Documental', icon: '📋', requiresEdit: false }
  ];

  // Filtrar pestañas basado en permisos del usuario
  const projectTabs = allProjectTabs.filter(tab => {
    if (tab.requiresEdit && isReadOnly()) {
      return false; // Ocultar pestañas de gestión para usuarios de solo lectura
    }
    return true;
  });

  // Escuchar eventos para cambiar de pestaña desde otros componentes
  useEffect(() => {
    const handleTabChange = (event) => {
      const tabName = event.detail;
      if (tabName && tabName !== activeTab) {
        setActiveTab(tabName);
      }
    };

    window.addEventListener('changeTab', handleTabChange);
    return () => {
      window.removeEventListener('changeTab', handleTabChange);
    };
  }, [activeTab]);

  // 🔧 CORRECCIÓN: Escuchar cambios de estado de minutas para sincronización con Dashboard
  useEffect(() => {
    const handleMinutaStatusUpdate = (event) => {
      const { tareaId, newStatus, projectId } = event.detail;

      // Solo actualizar si es del proyecto actual
      if (projectId === currentProjectId) {
        logger.debug('🔄 ProjectManagementTabs: Actualizando estado de minuta:', { tareaId, newStatus });
        setMinutaTasks(prev => prev.map(task =>
          task.id === tareaId ? { ...task, estatus: newStatus } : task
        ));
      }
    };

    window.addEventListener('minutaStatusChanged', handleMinutaStatusUpdate);
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusUpdate);
    };
  }, [currentProjectId]);

  // Redirigir a pestaña válida si el usuario está en una pestaña oculta
  useEffect(() => {
    const availableTabIds = projectTabs.map(tab => tab.id);
    if (!availableTabIds.includes(activeTab)) {
      // Si la pestaña actual no está disponible, ir a la primera disponible
      if (availableTabIds.length > 0) {
        setActiveTab(availableTabIds[0]);
      }
    }
  }, [projectTabs, activeTab]);

  // Cargar tareas de minuta del proyecto actual
  useEffect(() => {
    const loadMinutas = async () => {
      if (!currentProjectId) return;

      setLoadingMinutas(true);
      try {
        if (useSupabase) {
          // Cargar desde Supabase si está habilitado
          logger.debug('🔍 DEBUG: Cargando minutas para proyecto:', currentProjectId);
          // Importar el servicio de Supabase dinámicamente
          const { default: supabaseService } = await import('../services/SupabaseService');
          const { success, minutas } = await supabaseService.loadMinutasByProject(currentProjectId);
          if (success) {
            logger.debug(`🔍 DEBUG: Minutas recibidas de Supabase:`, minutas);
            setMinutaTasks(minutas);
            logger.debug(`✅ Minutas cargadas desde Supabase: ${minutas.length}`);
          } else {
            logger.warn('⚠️ Error cargando minutas desde Supabase');
            setMinutaTasks([]);
          }
        } else {
          // Cargar desde portfolioData si está en modo local
          const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
          const minutasFromStorage = portfolioData.minutasByProject?.[currentProjectId] || [];
          setMinutaTasks(minutasFromStorage);

          // ✅ CORRECCIÓN: Actualizar el estado global minutasByProject
          if (updateProjectMinutas) {
            updateProjectMinutas(currentProjectId, minutasFromStorage);
          }

          logger.debug(`✅ Minutas cargadas desde localStorage: ${minutasFromStorage.length}`);
        }
      } catch (error) {
        logger.error('❌ Error cargando minutas:', error);
        setMinutaTasks([]);
      } finally {
        setLoadingMinutas(false);
      }
    };

    loadMinutas();
  }, [currentProjectId, useSupabase]);

  // Función para calcular el progreso de hitos
  const calculateMilestoneProgress = (milestone, allTasks) => {
    if (!milestone || !allTasks) return 0;

    // CORRECCIÓN: Un hito debe mostrar su propio progreso, no el de las tareas relacionadas
    // El progreso del hito viene directamente del campo 'progress' de la tarea hito
    const milestoneProgress = milestone.progress || 0;

    logger.debug('🎯 CÁLCULO PROGRESO HITO CORREGIDO:', {
      milestoneName: milestone.name,
      milestoneId: milestone.id,
      milestoneProgress: milestoneProgress,
      milestoneStatus: milestone.status,
      milestoneProgressField: milestone.progress
    });

    return milestoneProgress;
  };

  // Función para obtener tareas próximas a vencer (menos de 15 días) - SOLO CRONOGRAMA
  const getTasksNearDeadline = (allTasks) => {
    if (!allTasks) return [];

    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    // Filtrar tareas que vencen en menos de 15 días Y tareas vencidas no completadas
    const tasksNearDeadline = allTasks.filter(task => {
      if (task.isMilestone) return false; // Excluir hitos
      if (task.progress >= 100) return false; // Excluir tareas completadas

      const endDate = new Date(task.endDate);

      // Incluir tareas vencidas (ya pasó la fecha) que no están completadas
      const isOverdue = endDate < today;

      // Incluir tareas que vencen en los próximos 15 días
      const isUpcoming = endDate >= today && endDate <= fifteenDaysFromNow;

      return isOverdue || isUpcoming;
    });

    // CORRECCIÓN: Agrupar tareas por hito - las tareas pertenecen al hito que las ANTECEDE
    const tasksByMilestone = {};

    // Obtener todos los hitos ordenados por fecha de inicio
    const milestones = allTasks
      .filter(t => t.isMilestone)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Para cada hito, encontrar todas las tareas que están ANTES de él
    milestones.forEach(milestone => {
      const milestoneDate = new Date(milestone.startDate);

      // Encontrar tareas que están antes de este hito (fecha de fin <= fecha del hito)
      const tasksBeforeMilestone = tasksNearDeadline.filter(task => {
        const taskEndDate = new Date(task.endDate);
        return taskEndDate <= milestoneDate;
      });

      // Excluir tareas que ya fueron asignadas a hitos anteriores
      const alreadyAssignedTaskIds = new Set();
      Object.values(tasksByMilestone).forEach(group => {
        group.tasks.forEach(t => alreadyAssignedTaskIds.add(t.id));
      });

      const unassignedTasks = tasksBeforeMilestone.filter(task =>
        !alreadyAssignedTaskIds.has(task.id)
      );

      if (unassignedTasks.length > 0) {
        tasksByMilestone[milestone.id] = {
          milestone: milestone,
          tasks: unassignedTasks
        };
      }
    });

    logger.debug('🎯 TAREAS AGRUPADAS POR HITO (CORREGIDO):', {
      tasksNearDeadline: tasksNearDeadline.length,
      tasksByMilestone: Object.keys(tasksByMilestone).length,
      details: Object.values(tasksByMilestone).map(group => ({
        milestoneName: group.milestone.name,
        milestoneId: group.milestone.id,
        tasksCount: group.tasks.length,
        tasksNames: group.tasks.map(t => t.name)
      }))
    });

    return Object.values(tasksByMilestone);
  };


  // Función para obtener tareas de minuta próximas a vencer
  const getMinutaTasksNearDeadline = (allTasks, minutaTasks) => {
    if (!minutaTasks || minutaTasks.length === 0) return [];

    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    // Filtrar tareas de minuta que vencen en menos de 15 días Y tareas vencidas no completadas
    const minutaTasksNearDeadline = minutaTasks.filter(minutaTask => {
      if (minutaTask.estatus === 'Completado') return false; // Excluir tareas completadas

      const endDate = new Date(minutaTask.fecha);

      // Incluir tareas vencidas (ya pasó la fecha) que no están completadas
      const isOverdue = endDate < today;

      // Incluir tareas que vencen en los próximos 15 días
      const isUpcoming = endDate >= today && endDate <= fifteenDaysFromNow;

      return isOverdue || isUpcoming;
    });

    // Agrupar tareas por hito
    const tasksByMilestone = {};

    minutaTasksNearDeadline.forEach(minutaTask => {
      // Encontrar el hito al que pertenece esta tarea de minuta
      const milestone = allTasks.find(task => task.id === minutaTask.hitoId && task.isMilestone);

      if (milestone) {
        if (!tasksByMilestone[milestone.id]) {
          tasksByMilestone[milestone.id] = {
            milestone: milestone,
            tasks: []
          };
        }

        // Convertir tarea de minuta al formato esperado
        const convertedTask = {
          id: minutaTask.id,
          name: minutaTask.tarea,
          endDate: minutaTask.fecha,
          progress: minutaTask.estatus === 'Completado' ? 100 :
            minutaTask.estatus === 'En Proceso' ? 50 : 0,
          responsable: minutaTask.responsable,
          estatus: minutaTask.estatus,
          source: 'minuta' // Identificador de origen
        };

        tasksByMilestone[milestone.id].tasks.push(convertedTask);
      }
    });

    return Object.values(tasksByMilestone);
  };

  // Función para detectar tareas de minuta huérfanas
  const getOrphanedMinutaTasks = (minutaTasks, allTasks) => {
    if (!minutaTasks || !allTasks) return [];

    return minutaTasks.filter(minutaTask => {
      // Buscar el hito al que está asignada la tarea
      const milestone = allTasks.find(task =>
        task.id === minutaTask.hitoId && task.isMilestone
      );

      // Si no se encuentra el hito, la tarea está huérfana
      return !milestone;
    });
  };

  // Función para actualizar el hito de una tarea de minuta
  const updateMinutaTaskHito = async (taskId, newHitoId) => {
    try {
      if (useSupabase) {
        // Actualizar en Supabase usando el método correcto
        const { default: supabaseService } = await import('../services/SupabaseService');
        const { success } = await supabaseService.updateMinuta(taskId, { milestone_id: newHitoId });
        if (!success) throw new Error('Error actualizando en Supabase');
      } else {
        // Actualizar en localStorage
        const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
        const projectMinutas = portfolioData.minutasByProject?.[currentProjectId] || [];

        const updatedMinutas = projectMinutas.map(task =>
          task.id === taskId ? { ...task, hitoId: newHitoId } : task
        );

        portfolioData.minutasByProject = {
          ...portfolioData.minutasByProject,
          [currentProjectId]: updatedMinutas
        };

        localStorage.setItem('portfolioData', JSON.stringify(portfolioData));
      }

      // Actualizar estado local
      setMinutaTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, hitoId: newHitoId } : task
      ));

      return true;
    } catch (error) {
      logger.error('Error actualizando tarea de minuta:', error);
      return false;
    }
  };

  // Función unificada para obtener todas las tareas próximas a vencer
  const getUnifiedTasksNearDeadline = (allTasks, minutaTasks) => {
    const cronogramaTasks = getTasksNearDeadline(allTasks);
    const minutaTasksNearDeadline = getMinutaTasksNearDeadline(allTasks, minutaTasks);

    // Agregar identificador de origen a las tareas del cronograma
    const cronogramaWithSource = cronogramaTasks.map(group => ({
      ...group,
      source: 'cronograma',
      tasks: group.tasks.map(task => ({ ...task, source: 'cronograma' }))
    }));

    const minutaWithSource = minutaTasksNearDeadline.map(group => ({
      ...group,
      source: 'minuta',
      tasks: group.tasks.map(task => ({ ...task, source: 'minuta' }))
    }));

    // Combinar y agrupar por hito
    const combinedGroups = [...cronogramaWithSource, ...minutaWithSource];

    // Agrupar por hito (combinar grupos del mismo hito)
    const unifiedGroups = {};

    combinedGroups.forEach(group => {
      const milestoneId = group.milestone.id;

      if (!unifiedGroups[milestoneId]) {
        unifiedGroups[milestoneId] = {
          milestone: group.milestone,
          tasks: []
        };
      }

      unifiedGroups[milestoneId].tasks.push(...group.tasks);
    });

    // CORRECCIÓN: Ordenar hitos por fecha de inicio para mantener consistencia con el cronograma
    const sortedGroups = Object.values(unifiedGroups).sort((a, b) => {
      const dateA = new Date(a.milestone.startDate);
      const dateB = new Date(b.milestone.startDate);
      return dateA - dateB; // Orden ascendente (más antiguo primero)
    });

    logger.debug('🎯 HITOS ORDENADOS POR FECHA:', {
      totalGroups: sortedGroups.length,
      order: sortedGroups.map(group => ({
        milestoneName: group.milestone.name,
        milestoneDate: group.milestone.startDate,
        tasksCount: group.tasks.length
      }))
    });

    return sortedGroups;
  };

  // Obtener proyecto actual
  const currentProject = projects?.find(p => p.id === currentProjectId) || projects[0];

  // IMPLEMENTACIÓN COMPLETA DEL FILTRADO POR PROYECTO
  // Usar las funciones helper del backup para obtener datos del proyecto actual

  // 1. Work Packages: Usar la función setWorkPackages que ya filtra por proyecto
  const projectWorkPackages = Array.isArray(workPackages) ? workPackages : [];

  // 2. Tasks: Usar la función setTasks que ya filtra por proyecto
  // CORRECCIÓN: Usar useMemo para asegurar actualización en tiempo real
  const projectTasks = useMemo(() => {
    logger.debug('🔄 ProjectManagementTabs - Recalculando projectTasks:', tasks?.length || 0);
    return Array.isArray(tasks) ? tasks : [];
  }, [tasks]);

  // 3. Purchase Orders: Usar la función setPurchaseOrders que ya filtra por proyecto
  const projectPurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];

  // 4. Advances: Usar la función setAdvances que ya filtra por proyecto
  const projectAdvances = Array.isArray(advances) ? advances : [];

  // 5. Invoices: Usar la función setInvoices que ya filtra por proyecto
  const projectInvoices = Array.isArray(invoices) ? invoices : [];

  // 6. Contracts: Usar la función setContracts que ya filtra por proyecto
  const projectContracts = Array.isArray(contracts) ? contracts : [];

  // 7. Risks: Usar la función setRisks que ya filtra por proyecto
  const projectRisks = Array.isArray(risks) ? risks : [];

  // 8. Resource Assignments: Usar la función setResourceAssignments que ya filtra por proyecto
  const projectResourceAssignments = Array.isArray(resourceAssignments) ? resourceAssignments : [];

  // Solo mostrar proyectos activos ordenados alfabéticamente (con soporte numérico)
  const activeProjects = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter(p => p.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      }));
  }, [projects]);

  // IMPORTANTE: Los datos deben filtrarse por proyecto seleccionado
  // Actualmente se están usando todos los datos sin filtrar, lo que puede mostrar información incorrecta

  // Calcular métricas EVM del proyecto actual
  const calculateEVMMetrics = () => {
    if (!currentProject) return {};

    // Calcular progreso basado en tareas del cronograma
    const projectTasks = Array.isArray(tasks) ? tasks : [];

    if (projectTasks.length === 0) {
      return { percentComplete: 0 };
    }

    // Calcular progreso promedio de las tareas (excluyendo hitos para consistencia)
    const regularTasks = projectTasks.filter(task => !task.isMilestone);

    if (regularTasks.length === 0) {
      return { percentComplete: 0 };
    }

    const totalProgress = regularTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    const percentComplete = Math.round(totalProgress / regularTasks.length);

    // Si hay work packages, usar métricas EVM tradicionales
    if (Array.isArray(projectWorkPackages) && projectWorkPackages.length > 0) {
      const BAC = projectWorkPackages.reduce((sum, wp) => sum + (wp.budget || 0), 0);
      const PV = projectWorkPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0);
      const EV = projectWorkPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0);
      const AC = projectWorkPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0);

      const CV = EV - AC;
      const SV = EV - PV;
      const CPI = AC > 0 ? EV / AC : 0;
      const SPI = PV > 0 ? EV / PV : 0;
      const percentSpent = BAC > 0 ? (AC / BAC) * 100 : 0;

      return { BAC, PV, EV, AC, CV, SV, CPI, SPI, percentComplete, percentSpent };
    }

    // Si no hay work packages, solo retornar el progreso basado en tareas
    return { percentComplete };
  };

  const evmMetrics = calculateEVMMetrics();

  // Calcular fecha de inicio real del cronograma basada en las tareas
  const calculateProjectStartDate = () => {
    if (!tasks || tasks.length === 0) return null;

    // DEBUG: Logging para identificar fechas inválidas
    const invalidTasks = tasks.filter(task =>
      !task.startDate || task.startDate === null || task.startDate === undefined
    );

    if (invalidTasks.length > 0) {
      logger.debug('⚠️ Tareas con fechas de inicio inválidas:', invalidTasks.map(t => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        isMilestone: t.isMilestone
      })));
    }

    // Filtrar tareas con fechas válidas
    const validStartDates = tasks
      .filter(task => task.startDate && task.startDate !== null && task.startDate !== undefined)
      .map(task => new Date(task.startDate))
      .filter(date => !isNaN(date.getTime())); // Filtrar fechas inválidas

    if (validStartDates.length === 0) {
      logger.debug('⚠️ No se encontraron fechas de inicio válidas');
      return null;
    }

    const minStartDate = new Date(Math.min(...validStartDates));

    // Verificar que la fecha mínima sea válida
    if (isNaN(minStartDate.getTime())) {
      logger.debug('⚠️ Fecha mínima calculada es inválida');
      return null;
    }

    logger.debug('✅ Fecha de inicio calculada:', minStartDate.toISOString().split('T')[0]);
    return minStartDate.toISOString().split('T')[0];
  };

  // Calcular fecha de fin real del cronograma basada en las tareas
  const calculateProjectEndDate = () => {
    if (!tasks || tasks.length === 0) return null;

    // DEBUG: Logging para identificar fechas inválidas
    const invalidTasks = tasks.filter(task =>
      !task.endDate || task.endDate === null || task.endDate === undefined
    );

    if (invalidTasks.length > 0) {
      logger.debug('⚠️ Tareas con fechas de fin inválidas:', invalidTasks.map(t => ({
        id: t.id,
        name: t.name,
        endDate: t.endDate,
        isMilestone: t.isMilestone
      })));
    }

    // Filtrar tareas con fechas válidas
    const validEndDates = tasks
      .filter(task => task.endDate && task.endDate !== null && task.endDate !== undefined)
      .map(task => new Date(task.endDate))
      .filter(date => !isNaN(date.getTime())); // Filtrar fechas inválidas

    if (validEndDates.length === 0) {
      logger.debug('⚠️ No se encontraron fechas de fin válidas');
      return null;
    }

    const maxEndDate = new Date(Math.max(...validEndDates));

    // Verificar que la fecha máxima sea válida
    if (isNaN(maxEndDate.getTime())) {
      logger.debug('⚠️ Fecha máxima calculada es inválida');
      return null;
    }

    logger.debug('✅ Fecha de fin calculada:', maxEndDate.toISOString().split('T')[0]);
    return maxEndDate.toISOString().split('T')[0];
  };

  const projectStartDate = calculateProjectStartDate();
  const projectEndDate = calculateProjectEndDate();

  const getPerformanceColor = (value) => {
    if (value >= 0) return 'text-green-600';
    return 'text-red-600';
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecciona un Proyecto</h2>
        <p className="text-gray-600">Elige un proyecto activo para ver su gestión detallada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Proyecto - Premium Colorful */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mr-4 shadow-lg border border-white/30">
                <span className="text-4xl">📊</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 tracking-tight">{currentProject.name}</h1>
                <p className="text-blue-100 text-lg tracking-wide">
                  {currentProject.description || 'Gestión integral del proyecto - PMBOK v7'}
                </p>
                <div className="flex items-center space-x-4 mt-3 text-sm">
                  <span className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
                    <span>👤</span>
                    <span className="font-medium">{currentProject.manager}</span>
                  </span>
                  <span className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
                    <span>💰</span>
                    <span className="font-bold">${(currentProject.budget / 1000).toFixed(0)}K</span>
                  </span>
                  <span className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30">
                    <span>💼</span>
                    <span className="font-bold">{evmMetrics.percentComplete?.toFixed(1) || 0}% completado</span>
                  </span>
                </div>
                {/* Caso de negocio del proyecto */}
                <div className="mt-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">💼</span>
                      <div>
                        <h4 className="font-bold text-white mb-2">Caso de Negocio</h4>
                        <p className="text-blue-100 text-sm leading-relaxed">
                          {currentProject.businessCase || 'Sin caso de negocio definido'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100 mb-2 font-medium">Fecha de Reporte</div>
              <input
                type="date"
                value={reportingDate}
                onChange={(e) => setReportingDate(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/90 text-slate-900 text-sm border-0 shadow-lg outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Proyectos Activos - Premium */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-bold text-slate-900">
            Proyecto Activo
          </label>
          <div
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg border-2 ${useSupabase
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300'
              : 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300'
              }`}
          >
            {useSupabase ? '🟢 Estado: Online' : '🔴 Estado: Offline'}
          </div>
        </div>
        <select
          value={currentProjectId}
          onChange={(e) => setCurrentProjectId(e.target.value)}
          className="w-full p-3 border-2 border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
        >
          <option value="" disabled>Seleccionar proyecto activo</option>
          {activeProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name} - {project.manager}
            </option>
          ))}
        </select>

        {/* Mensaje informativo sobre filtrado implementado */}
        {currentProjectId && (
          <div className="mt-4 p-4 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl max-w-full">
            <div className="flex items-start text-emerald-800 text-sm">
              <span className="text-xl mr-3 flex-shrink-0">✅</span>
              <span className="break-words">
                <strong>Filtrado por proyecto implementado:</strong> Todas las pestañas muestran únicamente la información de
                <strong> {currentProject?.name}</strong>. Los datos de otros proyectos NO se incluyen en las métricas ni en los módulos.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pestañas de Navegación - Premium */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
        <div className="border-b-2 border-slate-100">
          <nav className="flex flex-wrap gap-2 p-2 overflow-x-auto scrollbar-hide tab-container">
            {projectTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap min-w-fit",
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 scale-105'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className="text-lg mr-1 sm:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de las Pestañas */}
        <div>
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Header del Dashboard */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
                <div className="relative z-10">
                  <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 tracking-tight">
                    <span className="text-5xl">📊</span>
                    Dashboard Resumen
                  </h1>
                  <p className="text-indigo-100 text-lg tracking-wide">
                    {currentProject?.name || 'Proyecto no seleccionado'} - Vista ejecutiva del estado del proyecto
                  </p>
                </div>
              </div>

              {/* 1. Información del Proyecto */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10 tracking-tight">
                  <span className="text-4xl mr-4">📈</span>
                  Información del Proyecto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-xl shadow-blue-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">💰</span>
                        <span className="text-xs font-bold text-blue-100 uppercase">Presupuesto</span>
                      </div>
                      <div className="text-4xl font-bold">
                        ${((currentProject?.budget || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-blue-100 mt-2">
                        Presupuesto asignado
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-xl shadow-emerald-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">📅</span>
                        <span className="text-xs font-bold text-emerald-100 uppercase">Inicio</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {projectStartDate ? new Date(projectStartDate).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                      <div className="text-sm text-emerald-100 mt-2">
                        Fecha de inicio del cronograma
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-2xl shadow-xl shadow-purple-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">🏁</span>
                        <span className="text-xs font-bold text-purple-100 uppercase">Fin</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {projectEndDate ? new Date(projectEndDate).toLocaleDateString('es-ES') : 'N/A'}
                      </div>
                      <div className="text-sm text-purple-100 mt-2">
                        Fecha de fin del cronograma
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Gestión Financiera */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-emerald-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10 tracking-tight">
                  <span className="text-4xl mr-4">💳</span>
                  Gestión Financiera
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 rounded-2xl shadow-xl shadow-emerald-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">📋</span>
                        <span className="text-xs font-bold text-emerald-100 uppercase">Órdenes de Compra</span>
                      </div>
                      <div className="text-4xl font-bold">
                        ${((projectPurchaseOrders?.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-emerald-100 mt-2">
                        Monto en OC aprobadas
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-xl shadow-amber-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">💸</span>
                        <span className="text-xs font-bold text-amber-100 uppercase">Anticipos</span>
                      </div>
                      <div className="text-4xl font-bold">
                        ${((projectAdvances?.reduce((sum, adv) => sum + (adv.amount || 0), 0) || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-amber-100 mt-2">
                        Anticipos solicitados
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-2xl shadow-xl shadow-cyan-500/30 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">🧾</span>
                        <span className="text-xs font-bold text-cyan-100 uppercase">Facturas</span>
                      </div>
                      <div className="text-4xl font-bold">
                        ${((projectInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0) / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-cyan-100 mt-2">
                        Facturas ingresadas
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Reservas y Riesgos */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10 tracking-tight">
                  <span className="text-4xl mr-4">🛡️</span>
                  Reservas y Riesgos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-2xl shadow-xl shadow-orange-500/30 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-3xl">⚠️</span>
                          <span className="text-xs font-bold text-orange-100 uppercase">Contingencia</span>
                        </div>
                        <div className="text-4xl font-bold">
                          ${((currentProject?.budget || 0) * 0.05 / 1000).toFixed(0)}K
                        </div>
                        <div className="text-sm text-orange-100 mt-2">
                          5% del presupuesto total
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-2xl shadow-xl shadow-pink-500/30 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-3xl">🎯</span>
                          <span className="text-xs font-bold text-pink-100 uppercase">Gestión</span>
                        </div>
                        <div className="text-4xl font-bold">
                          ${((currentProject?.budget || 0) * 0.1 / 1000).toFixed(0)}K
                        </div>
                        <div className="text-sm text-pink-100 mt-2">
                          10% del presupuesto total
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-2xl border-2 border-red-200">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">🚨</span>
                      <span className="text-sm font-bold text-red-700 uppercase">Principales Riesgos</span>
                    </div>
                    <div className="space-y-3">
                      {projectRisks?.slice(0, 3).map((risk, index) => {
                        const emv = (risk.probability || 0) * (risk.costImpact || 0);
                        return (
                          <div key={risk.id} className="p-4 bg-white rounded-xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className={cn(
                                  "w-3 h-3 rounded-full shadow-lg",
                                  risk.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                                    risk.priority === 'medium' ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                                      'bg-gradient-to-r from-emerald-400 to-green-500'
                                )}></span>
                                <span className="text-sm font-bold text-slate-900 truncate">
                                  {risk.name}
                                </span>
                              </div>
                              <span className={cn(
                                "text-xs px-2.5 py-1 rounded-full font-bold border-2 shadow-sm",
                                risk.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300' :
                                  risk.priority === 'medium' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                                    'bg-gradient-to-r from-emerald-400 to-green-500 text-white border-emerald-300'
                              )}>
                                {risk.priority}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                              <span>Costo probable:</span>
                              <span className="font-bold text-red-600">
                                ${(emv / 1000).toFixed(1)}K
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                              <span>Prob: {((risk.probability || 0) * 100).toFixed(0)}%</span>
                              <span>Impacto: ${((risk.costImpact || 0) / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!projectRisks || projectRisks.length === 0) && (
                        <div className="text-center text-slate-500 py-8">
                          <span className="text-4xl mb-2 block opacity-20">🛡️</span>
                          <p className="font-medium">No hay riesgos registrados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Hitos del Proyecto */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center justify-between relative z-10 tracking-tight">
                  <div className="flex items-center">
                    <span className="text-4xl mr-4">🎯</span>
                    Hitos del Proyecto
                  </div>
                  <span className="text-sm bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-1.5 rounded-full font-bold shadow-lg">
                    {projectTasks?.filter(task => task.isMilestone).length || 0} hitos
                  </span>
                </h2>
                <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                  {(() => {
                    const milestones = projectTasks?.filter(task => task.isMilestone) || [];
                    logger.debug('🎯 Dashboard - Hitos actualizados:', milestones.map(m => ({
                      id: m.id,
                      name: m.name,
                      startDate: m.startDate,
                      endDate: m.endDate
                    })));
                    return milestones;
                  })()
                    .sort((a, b) => {
                      const aDate = new Date(a.startDate || a.endDate || '1900-01-01');
                      const bDate = new Date(b.startDate || b.endDate || '1900-01-01');
                      return aDate - bDate;
                    })
                    .map((milestone, index) => (
                      <div key={milestone.id} className="bg-gradient-to-r from-slate-50 to-purple-50 p-5 rounded-2xl border-2 border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={cn(
                              "w-4 h-4 rounded-full shadow-lg",
                              milestone.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                                milestone.status === 'in-progress' ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                                  milestone.status === 'delayed' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                                    'bg-slate-400'
                            )}></div>
                            <div>
                              <h3 className="font-bold text-slate-900">
                                {milestone.name}
                                <span className="ml-2 text-sm font-bold text-blue-600">
                                  [{calculateMilestoneProgress(milestone, projectTasks)}%]
                                </span>
                              </h3>
                              <p className="text-sm text-slate-600 font-medium">
                                {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString('es-ES') : 'Sin fecha'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {permissions.canEdit ? (
                              <select
                                value={milestone.status || 'in-progress'}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  logger.debug('🎯 CAMBIO DE ESTADO DE HITO:', {
                                    milestoneId: milestone.id,
                                    milestoneName: milestone.name,
                                    oldStatus: milestone.status,
                                    newStatus: newStatus,
                                    currentProjectId: currentProjectId
                                  });

                                  const updatedTasks = projectTasks.map(task =>
                                    task.id === milestone.id
                                      ? { ...task, status: newStatus }
                                      : task
                                  );

                                  logger.debug('🎯 TAREAS ACTUALIZADAS:', {
                                    totalTasks: updatedTasks.length,
                                    milestoneTasks: updatedTasks.filter(t => t.isMilestone).length,
                                    updatedMilestone: updatedTasks.find(t => t.id === milestone.id)
                                  });

                                  setTasks(updatedTasks);
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-xs font-bold border-2 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm",
                                  milestone.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300' :
                                    milestone.status === 'in-progress' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                                      milestone.status === 'delayed' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300' :
                                        'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                <option value="in-progress">En Proceso</option>
                                <option value="completed">Realizado</option>
                                <option value="delayed">Atrasado</option>
                              </select>
                            ) : (
                              <div className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm",
                                milestone.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300' :
                                  milestone.status === 'in-progress' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                                    milestone.status === 'delayed' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300' :
                                      'bg-slate-100 text-slate-700 border-slate-200'
                              )}>
                                {milestone.status === 'completed' ? 'Realizado' :
                                  milestone.status === 'in-progress' ? 'En Proceso' :
                                    milestone.status === 'delayed' ? 'Atrasado' : 'Pendiente'}
                                <span className="ml-1">👀</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {(!projectTasks || projectTasks.filter(task => task.isMilestone).length === 0) && (
                    <div className="text-center text-slate-500 py-12">
                      <span className="text-6xl mb-4 block opacity-20">🎯</span>
                      <p className="font-bold text-lg">No hay hitos definidos para este proyecto</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Alerta Tareas por Vencer */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center justify-between relative z-10 tracking-tight">
                  <div className="flex items-center">
                    <span className="text-4xl mr-4">⚠️</span>
                    <div>
                      <div>Alerta Tareas por Vencer</div>
                      <span className="text-xs text-slate-500 font-normal tracking-normal">(Vencidas + Próximas a vencer - Cronograma + Minutas)</span>
                    </div>
                  </div>
                  <span className="text-sm bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1.5 rounded-full font-bold shadow-lg">
                    {(() => {
                      const orphanedTasks = getOrphanedMinutaTasks(minutaTasks, projectTasks);
                      const unifiedTasks = getUnifiedTasksNearDeadline(projectTasks, minutaTasks);
                      const totalTasks = unifiedTasks.reduce((total, group) => total + group.tasks.length, 0) + orphanedTasks.length;
                      return `${totalTasks} tareas`;
                    })()}
                  </span>
                </h2>

                {(() => {
                  const orphanedTasks = getOrphanedMinutaTasks(minutaTasks, projectTasks);
                  const unifiedTasks = getUnifiedTasksNearDeadline(projectTasks, minutaTasks);

                  return unifiedTasks.length > 0 || orphanedTasks.length > 0 ? (
                    <div className="space-y-6">
                      {/* Mostrar tareas huérfanas primero si las hay */}
                      {orphanedTasks.length > 0 && (
                        <OrphanedTasksManager
                          orphanedTasks={orphanedTasks}
                          availableMilestones={projectTasks.filter(t => t.isMilestone)}
                          onReassign={(taskId, newHitoId) => {
                            setMinutaTasks(prev => prev.map(task =>
                              task.id === taskId ? { ...task, hitoId: newHitoId } : task
                            ));
                          }}
                          updateMinutaTaskHito={updateMinutaTaskHito}
                        />
                      )}

                      {/* Mostrar grupos normales */}
                      {unifiedTasks.map((group, groupIndex) => (
                        <div key={group.milestone.id} className="bg-gradient-to-br from-orange-50 to-red-50 p-5 rounded-2xl border-2 border-orange-200">
                          <div className="flex items-center mb-4">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-600 mr-3 shadow-lg"></div>
                            <h3 className="font-bold text-slate-900 text-lg">
                              {group.milestone.name}
                            </h3>
                            <span className="ml-2 text-sm bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1 rounded-full font-bold shadow-sm">
                              {group.tasks.length} tareas
                            </span>
                          </div>

                          <div className="space-y-3">
                            {group.tasks.map((task, taskIndex) => {
                              const daysUntilDeadline = Math.ceil((new Date(task.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                              const isOverdue = daysUntilDeadline < 0;

                              const urgencyColor = isOverdue ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300' :
                                daysUntilDeadline === 0 ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white border-red-200' :
                                  daysUntilDeadline <= 3 ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-300' :
                                    daysUntilDeadline <= 7 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                                      'bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-blue-300';

                              return (
                                <div key={task.id} className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <h4 className="font-bold text-slate-900">{task.name}</h4>
                                        {task.source === 'cronograma' ? (
                                          <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full flex items-center font-bold shadow-sm">
                                            <span className="mr-1">📋</span>
                                            Cronograma
                                          </span>
                                        ) : (
                                          <span className="text-xs bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1 rounded-full flex items-center font-bold shadow-sm">
                                            <span className="mr-1">📝</span>
                                            Minuta
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-4 text-sm text-slate-600 font-medium">
                                        <span>📅 {new Date(task.endDate).toLocaleDateString('es-ES')}</span>
                                        <span>👤 {task.assignedTo || task.responsable || 'Sin asignar'}</span>
                                        <span>📊 {task.progress || 0}% completado</span>
                                        {task.estatus && (
                                          <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-bold border-2",
                                            task.estatus === 'Completado' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300' :
                                              task.estatus === 'En Proceso' ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-amber-300' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                          )}>
                                            {task.estatus}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className={cn("px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-lg", urgencyColor)}>
                                        {isOverdue ? `Vencida hace ${Math.abs(daysUntilDeadline)} días` :
                                          daysUntilDeadline === 0 ? 'Vence hoy' :
                                            daysUntilDeadline === 1 ? 'Vence mañana' :
                                              `Vence en ${daysUntilDeadline} días`}
                                      </span>
                                      <div className="w-16 bg-slate-200 rounded-full h-2.5 shadow-inner">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full shadow-sm"
                                          style={{ width: `${task.progress || 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-12">
                      <span className="text-6xl mb-4 block opacity-20">✅</span>
                      <p className="font-bold text-lg">¡Excelente! No hay tareas próximas a vencer</p>
                      <p className="text-sm mt-2">Todas las tareas del cronograma y minutas están al día o completadas</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'risks' && (
            <RiskManagement
              projects={projects}
              currentProjectId={currentProjectId}
              setCurrentProjectId={setCurrentProjectId}
              risks={projectRisks}
              setRisks={setRisks}
              useSupabase={useSupabase}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleManagement
              tasks={projectTasks}
              setTasks={setTasks}
              importTasks={importTasks}
              projectData={currentProject}
              onScheduleDataChange={setScheduleData} // Nuevo prop para pasar datos del cronograma
              includeWeekends={includeWeekends}
              setIncludeWeekends={setIncludeWeekends}
              useSupabase={useSupabase}
              updateProjectMinutas={updateProjectMinutas}
            />
          )}

          {activeTab === 'financial' && (
            <FinancialManagement
              workPackages={projectWorkPackages}
              setWorkPackages={setWorkPackages}
              currentProject={currentProject}
              risks={projectRisks}
              scheduleData={scheduleData} // Pasar datos del cronograma
              includeWeekends={includeWeekends}
              purchaseOrders={purchaseOrders}
              setPurchaseOrders={setPurchaseOrders}
              advances={advances}
              setAdvances={setAdvances}
              invoices={invoices}
              setInvoices={setInvoices}
              contracts={contracts}
              setContracts={setContracts}
              useSupabase={useSupabase}
            />
          )}


          {activeTab === 'resources' && (
            <ResourceManagement
              projects={projects}
              workPackages={projectWorkPackages}
              currentProject={currentProject}
              includeWeekends={includeWeekends}
            />
          )}

          {activeTab === 'changes' && (
            <ChangeManagement
              currentProjectId={currentProjectId}
              projects={projects}
              workPackages={projectWorkPackages}
              tasks={projectTasks}
              purchaseOrders={projectPurchaseOrders}
              advances={projectAdvances}
              invoices={projectInvoices}
              contracts={projectContracts}
              onUpdateProject={() => {
                // Función para actualizar el proyecto cuando se apruebe un cambio
                logger.debug('Proyecto actualizado por cambio aprobado');
              }}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowProjection
              currentProjectId={currentProject?.id}
              currentProject={currentProject}
              projects={projects}
              workPackages={projectWorkPackages}
              tasks={tasks}
              purchaseOrders={projectPurchaseOrders}
              advances={projectAdvances}
              invoices={projectInvoices}
              contracts={projectContracts}
            />
          )}

          {activeTab === 'files' && (
            <FileManager
              projectId={currentProjectId}
              category="general"
              onFileUploaded={() => {
                // Archivo subido exitosamente desde pestaña de archivos
              }}
            />
          )}


          {activeTab === 'audit' && (
            <ProjectAudit
              projects={projects}
              currentProjectId={currentProjectId}
              workPackages={workPackages}
              risks={risks}
              tasks={tasks}
              purchaseOrders={purchaseOrders}
              advances={advances}
              invoices={invoices}
              contracts={contracts}
              resourceAssignments={resourceAssignments}
              useSupabase={useSupabase}
            />
          )}

        </div>
      </div>

      {/* Botón flotante de guardado */}
      <FloatingSaveButton
        onSave={onSave}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div >
  );
};

export default ProjectManagementTabs;
