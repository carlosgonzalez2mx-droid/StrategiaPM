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
      console.error('Error en reasignación:', error);
      alert('❌ Error al reasignar tarea');
    } finally {
      setReassigning(prev => ({ ...prev, [taskId]: false }));
    }
  };
  
  if (orphanedTasks.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-yellow-800 font-semibold flex items-center">
          <span className="mr-2">⚠️</span>
          Tareas de Minuta sin Hito Asignado
        </h3>
        <span className="text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
          {orphanedTasks.length} tareas
        </span>
      </div>
      
      <p className="text-yellow-700 text-sm mb-3">
        Estas tareas perdieron su hito asignado. Reasígnalas para mantener la organización.
      </p>
      
      <div className="space-y-2">
        {orphanedTasks.map(task => {
          const daysUntilDeadline = Math.ceil((new Date(task.fecha) - new Date()) / (1000 * 60 * 60 * 24));
          const urgencyColor = daysUntilDeadline <= 3 ? 'text-red-600 bg-red-100' : 
                             daysUntilDeadline <= 7 ? 'text-orange-600 bg-orange-100' : 
                             'text-yellow-600 bg-yellow-100';
          
          return (
            <div key={task.id} className="bg-white p-3 rounded border border-yellow-200">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-800">{task.tarea}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                      <span className="mr-1">📝</span>
                      Minuta
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>👤 {task.responsable}</span>
                    <span>📅 {new Date(task.fecha).toLocaleDateString('es-ES')}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      task.estatus === 'Completado' ? 'bg-green-100 text-green-800' :
                      task.estatus === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.estatus}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                    {daysUntilDeadline === 0 ? 'Hoy' : 
                     daysUntilDeadline === 1 ? 'Mañana' : 
                     `${daysUntilDeadline} días`}
                  </span>
                  
                  <select 
                    value={task.hitoId || ''} 
                    onChange={(e) => handleReassign(task.id, e.target.value)}
                    disabled={reassigning[task.id]}
                    className="text-xs border border-gray-300 rounded px-2 py-1 min-w-[200px]"
                  >
                    <option value="">Seleccionar hito...</option>
                    {availableMilestones.map(milestone => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>
                  
                  {reassigning[task.id] && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
  useSupabase = false
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
          console.log('🔍 DEBUG: Cargando minutas para proyecto:', currentProjectId);
          // Importar el servicio de Supabase dinámicamente
          const { default: supabaseService } = await import('../services/SupabaseService');
          const { success, minutas } = await supabaseService.loadMinutasByProject(currentProjectId);
          if (success) {
            console.log(`🔍 DEBUG: Minutas recibidas de Supabase:`, minutas);
            setMinutaTasks(minutas);
            console.log(`✅ Minutas cargadas desde Supabase: ${minutas.length}`);
          } else {
            console.warn('⚠️ Error cargando minutas desde Supabase');
            setMinutaTasks([]);
          }
        } else {
          // Cargar desde portfolioData si está en modo local
          const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
          const minutasFromStorage = portfolioData.minutasByProject?.[currentProjectId] || [];
          setMinutaTasks(minutasFromStorage);
          console.log(`✅ Minutas cargadas desde localStorage: ${minutasFromStorage.length}`);
        }
      } catch (error) {
        console.error('❌ Error cargando minutas:', error);
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
    
    console.log('🎯 CÁLCULO PROGRESO HITO CORREGIDO:', {
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
    
    // Filtrar tareas que vencen en menos de 15 días y no están completadas
    const tasksNearDeadline = allTasks.filter(task => {
      if (task.isMilestone) return false; // Excluir hitos
      if (task.progress >= 100) return false; // Excluir tareas completadas
      
      const endDate = new Date(task.endDate);
      return endDate >= today && endDate <= fifteenDaysFromNow;
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
    
    console.log('🎯 TAREAS AGRUPADAS POR HITO (CORREGIDO):', {
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
    
    // Filtrar tareas de minuta que vencen en menos de 15 días y no están completadas
    const minutaTasksNearDeadline = minutaTasks.filter(minutaTask => {
      if (minutaTask.estatus === 'Completado') return false; // Excluir tareas completadas
      
      const endDate = new Date(minutaTask.fecha);
      return endDate >= today && endDate <= fifteenDaysFromNow;
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
      console.error('Error actualizando tarea de minuta:', error);
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
    
    return Object.values(unifiedGroups);
  };

  // Obtener proyecto actual
  const currentProject = projects?.find(p => p.id === currentProjectId) || projects[0];

  // IMPLEMENTACIÓN COMPLETA DEL FILTRADO POR PROYECTO
  // Usar las funciones helper del backup para obtener datos del proyecto actual

  // 1. Work Packages: Usar la función setWorkPackages que ya filtra por proyecto
  const projectWorkPackages = Array.isArray(workPackages) ? workPackages : [];

  // 2. Tasks: Usar la función setTasks que ya filtra por proyecto
  const projectTasks = Array.isArray(tasks) ? tasks : [];

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

  // Solo mostrar proyectos activos
  const activeProjects = projects?.filter(p => p.status === 'active') || [];

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
    
    const startDates = tasks.map(task => new Date(task.startDate));
    const minStartDate = new Date(Math.min(...startDates));
    
    return minStartDate.toISOString().split('T')[0];
  };

  // Calcular fecha de fin real del cronograma basada en las tareas
  const calculateProjectEndDate = () => {
    if (!tasks || tasks.length === 0) return null;
    
    const endDates = tasks.map(task => new Date(task.endDate));
    const maxEndDate = new Date(Math.max(...endDates));
    
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
      {/* Header del Proyecto */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-100 rounded-2xl shadow-lg p-6 text-gray-800 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100/30 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white/60 backdrop-blur rounded-2xl p-3 mr-4 shadow-sm">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-800">{currentProject.name}</h1>
                <p className="text-gray-600 text-lg">
                  Gestión integral del proyecto - PMBOK v7
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-700">
                  <span className="flex items-center space-x-1">
                    <span className="text-gray-500">👤</span>
                    <span>{currentProject.manager}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="text-yellow-600">💰</span>
                    <span>${(currentProject.budget / 1000).toFixed(0)}K</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="text-green-500">💼</span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 ml-2">
                      {evmMetrics.percentComplete?.toFixed(1) || 0}% completado
                    </span>
                  </span>
                </div>
                {/* Caso de negocio del proyecto */}
                <div className="mt-3">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 text-lg">💼</span>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-2">Caso de Negocio</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {currentProject.businessCase || 'Sin caso de negocio definido'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Fecha de Reporte</div>
              <input
                type="date"
                value={reportingDate}
                onChange={(e) => setReportingDate(e.target.value)}
                className="px-3 py-1 rounded bg-white text-gray-800 text-sm border border-gray-300 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Proyectos Activos */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Proyecto Activo
          </label>
          <div
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              useSupabase 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {useSupabase ? '🟢 Estado: Online' : '🔴 Estado: Offline'}
          </div>
        </div>
        <select
          value={currentProjectId}
          onChange={(e) => setCurrentProjectId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-800 text-sm">
              <span className="mr-2">✅</span>
              <span>
                <strong>Filtrado por proyecto implementado:</strong> Todas las pestañas muestran únicamente la información de 
                <strong> {currentProject?.name}</strong>. Los datos de otros proyectos NO se incluyen en las métricas ni en los módulos.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pestañas de Navegación */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap gap-1 px-4 overflow-x-auto scrollbar-hide tab-container">
            {projectTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap min-w-fit
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-1 sm:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido de las Pestañas */}
        <div>
          {activeTab === 'summary' && (
            <div className="space-y-8">
              {/* Header del Dashboard */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h1 className="text-3xl font-bold mb-2">📊 Dashboard Resumen</h1>
                <p className="text-indigo-100 text-lg">
                  {currentProject?.name || 'Proyecto no seleccionado'} - Vista ejecutiva del estado del proyecto
                </p>
              </div>

              {/* 1. Información del Proyecto */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="text-3xl mr-3">📈</span>
                  Información del Proyecto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">💰</span>
                      <span className="text-sm font-medium text-blue-600">Presupuesto</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-800">
                      ${((currentProject?.budget || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Presupuesto asignado
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">📅</span>
                      <span className="text-sm font-medium text-green-600">Inicio</span>
                    </div>
                    <div className="text-xl font-bold text-green-800">
                      {projectStartDate ? new Date(projectStartDate).toLocaleDateString('es-ES') : 'N/A'}
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Fecha de inicio del cronograma
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">🏁</span>
                      <span className="text-sm font-medium text-purple-600">Fin</span>
                    </div>
                    <div className="text-xl font-bold text-purple-800">
                      {projectEndDate ? new Date(projectEndDate).toLocaleDateString('es-ES') : 'N/A'}
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      Fecha de fin del cronograma
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Gestión Financiera */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="text-3xl mr-3">💳</span>
                  Gestión Financiera
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">📋</span>
                      <span className="text-sm font-medium text-emerald-600">Órdenes de Compra</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-800">
                      ${((projectPurchaseOrders?.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-emerald-600 mt-1">
                      Monto en OC aprobadas
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">💸</span>
                      <span className="text-sm font-medium text-amber-600">Anticipos</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-800">
                      ${((projectAdvances?.reduce((sum, adv) => sum + (adv.amount || 0), 0) || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-amber-600 mt-1">
                      Anticipos solicitados
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg border border-cyan-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">🧾</span>
                      <span className="text-sm font-medium text-cyan-600">Facturas</span>
                    </div>
                    <div className="text-3xl font-bold text-cyan-800">
                      ${((projectInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-cyan-600 mt-1">
                      Facturas ingresadas
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Reservas y Riesgos */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="text-3xl mr-3">🛡️</span>
                  Reservas y Riesgos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">⚠️</span>
                        <span className="text-sm font-medium text-orange-600">Reserva de Contingencia</span>
                      </div>
                      <div className="text-3xl font-bold text-orange-800">
                        ${((currentProject?.budget || 0) * 0.05 / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-orange-600 mt-1">
                        5% del presupuesto total
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-lg border border-pink-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">🎯</span>
                        <span className="text-sm font-medium text-pink-600">Reserva de Gestión</span>
                      </div>
                      <div className="text-3xl font-bold text-pink-800">
                        ${((currentProject?.budget || 0) * 0.1 / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-pink-600 mt-1">
                        10% del presupuesto total
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">🚨</span>
                      <span className="text-sm font-medium text-red-600">Principales Riesgos</span>
                    </div>
                    <div className="space-y-3">
                      {projectRisks?.slice(0, 3).map((risk, index) => {
                        // Calcular el Expected Monetary Value (EMV) = Probabilidad × Impacto en Costos
                        const emv = (risk.probability || 0) * (risk.costImpact || 0);
                        return (
                          <div key={risk.id} className="p-3 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <span className={`w-3 h-3 rounded-full ${
                                  risk.priority === 'high' ? 'bg-red-500' : 
                                  risk.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></span>
                                <span className="text-sm font-medium text-gray-800 truncate">
                                  {risk.name}
                                </span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                risk.priority === 'high' ? 'bg-red-100 text-red-800' : 
                                risk.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {risk.priority}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>Costo probable:</span>
                              <span className="font-semibold text-red-600">
                                ${(emv / 1000).toFixed(1)}K
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                              <span>Prob: {((risk.probability || 0) * 100).toFixed(0)}%</span>
                              <span>Impacto: ${((risk.costImpact || 0) / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!projectRisks || projectRisks.length === 0) && (
                        <div className="text-center text-gray-500 py-4">
                          No hay riesgos registrados
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Hitos del Proyecto */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">🎯</span>
                    Hitos del Proyecto
                  </div>
                  <span className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    {projectTasks?.filter(task => task.isMilestone).length || 0} hitos
                  </span>
                </h2>
                <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {projectTasks?.filter(task => task.isMilestone)
                    .sort((a, b) => {
                      // Ordenar por wbsCode (campo #) si existe, sino por nombre
                      const aCode = a.wbsCode || a.name;
                      const bCode = b.wbsCode || b.name;
                      return aCode.localeCompare(bCode, 'es', { numeric: true });
                    })
                    .map((milestone, index) => (
                    <div key={milestone.id} className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full ${
                            milestone.status === 'completed' ? 'bg-green-500' : 
                            milestone.status === 'in-progress' ? 'bg-yellow-500' : 
                            milestone.status === 'delayed' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {milestone.name}
                              <span className="ml-2 text-sm font-medium text-blue-600">
                                [{calculateMilestoneProgress(milestone, projectTasks)}%]
                              </span>
                            </h3>
                            <p className="text-sm text-gray-600">
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
                                console.log('🎯 CAMBIO DE ESTADO DE HITO:', {
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
                                
                                console.log('🎯 TAREAS ACTUALIZADAS:', {
                                  totalTasks: updatedTasks.length,
                                  milestoneTasks: updatedTasks.filter(t => t.isMilestone).length,
                                  updatedMilestone: updatedTasks.find(t => t.id === milestone.id)
                                });
                                
                                setTasks(updatedTasks);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-blue-500 ${
                                milestone.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                milestone.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 
                                milestone.status === 'delayed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              <option value="in-progress" className="bg-yellow-100 text-yellow-800">En Proceso</option>
                              <option value="completed" className="bg-green-100 text-green-800">Realizado</option>
                              <option value="delayed" className="bg-red-100 text-red-800">Atrasado</option>
                            </select>
                          ) : (
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              milestone.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              milestone.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 
                              milestone.status === 'delayed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {milestone.status === 'completed' ? 'Realizado' : 
                               milestone.status === 'in-progress' ? 'En Proceso' : 
                               milestone.status === 'delayed' ? 'Atrasado' : 'Pendiente'}
                              <span className="ml-1 text-gray-500">👀</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!projectTasks || projectTasks.filter(task => task.isMilestone).length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      <span className="text-4xl mb-4 block">🎯</span>
                      <p>No hay hitos definidos para este proyecto</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Alerta Tareas por Vencer */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">⚠️</span>
                    Alerta Tareas por Vencer
                    <span className="text-sm text-gray-500 ml-2">(Cronograma + Minutas)</span>
                  </div>
                  <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
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
                            // Actualizar estado local
                            setMinutaTasks(prev => prev.map(task => 
                              task.id === taskId ? { ...task, hitoId: newHitoId } : task
                            ));
                          }}
                          updateMinutaTaskHito={updateMinutaTaskHito}
                        />
                      )}
                      
                      {/* Mostrar grupos normales */}
                      {unifiedTasks.map((group, groupIndex) => (
                      <div key={group.milestone.id} className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-center mb-3">
                          <div className="w-3 h-3 rounded-full bg-orange-500 mr-3"></div>
                          <h3 className="font-semibold text-gray-800 text-lg">
                            {group.milestone.name}
                          </h3>
                          <span className="ml-2 text-sm text-orange-600">
                            ({group.tasks.length} tareas)
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {group.tasks.map((task, taskIndex) => {
                            const daysUntilDeadline = Math.ceil((new Date(task.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                            const urgencyColor = daysUntilDeadline <= 3 ? 'text-red-600 bg-red-100' : 
                                               daysUntilDeadline <= 7 ? 'text-orange-600 bg-orange-100' : 
                                               'text-yellow-600 bg-yellow-100';
                            
                            return (
                              <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="font-medium text-gray-800">{task.name}</h4>
                                      {/* Badge diferenciador de origen */}
                                      {task.source === 'cronograma' ? (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                                          <span className="mr-1">📋</span>
                                          Cronograma
                                        </span>
                                      ) : (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                                          <span className="mr-1">📝</span>
                                          Minuta
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                      <span>📅 {new Date(task.endDate).toLocaleDateString('es-ES')}</span>
                                      <span>👤 {task.assignedTo || task.responsable || 'Sin asignar'}</span>
                                      <span>📊 {task.progress || 0}% completado</span>
                                      {task.estatus && (
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          task.estatus === 'Completado' ? 'bg-green-100 text-green-800' :
                                          task.estatus === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {task.estatus}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                                      {daysUntilDeadline === 0 ? 'Hoy' : 
                                       daysUntilDeadline === 1 ? 'Mañana' : 
                                       `${daysUntilDeadline} días`}
                                    </span>
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-500 h-2 rounded-full" 
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
                    <div className="text-center text-gray-500 py-8">
                      <span className="text-4xl mb-4 block">✅</span>
                      <p>¡Excelente! No hay tareas próximas a vencer</p>
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
                console.log('Proyecto actualizado por cambio aprobado');
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
    </div>
  );
};

export default ProjectManagementTabs;
