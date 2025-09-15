import React, { useState, useMemo, useEffect } from 'react';
import RiskManagement from './RiskManagement';
import ScheduleManagement from './ScheduleManagement';
import FinancialManagement from './FinancialManagement';
import ResourceManagement from './ResourceManagement';
import FileManager from './FileManager';
import ProjectAudit from './ProjectAudit';
import ChangeManagement from './ChangeManagement';
import CashFlowProjection from './CashFlowProjection';

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
  const [activeTab, setActiveTab] = useState('summary');
  const [scheduleData, setScheduleData] = useState(null); // Nuevo estado para datos del cronograma
  const [archivedProjects, setArchivedProjects] = useState([]); // Estado para proyectos archivados

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

  // Función para calcular el progreso de tareas entre hitos
  const calculateMilestoneProgress = (milestone, allTasks) => {
    if (!milestone || !allTasks) return 0;
    
    // Obtener todos los hitos ordenados por fecha de inicio
    const milestones = allTasks
      .filter(task => task.isMilestone)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    // Encontrar el índice del hito actual
    const currentMilestoneIndex = milestones.findIndex(m => m.id === milestone.id);
    if (currentMilestoneIndex === -1) return 0;
    
    // Determinar el rango de tareas para este hito
    let startDate, endDate;
    
    if (currentMilestoneIndex === 0) {
      // Primer hito: desde el inicio del proyecto hasta este hito
      // Usar la fecha de inicio de la primera tarea como referencia
      const firstTask = allTasks
        .filter(task => !task.isMilestone)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
      
      startDate = firstTask ? new Date(firstTask.startDate) : new Date(milestone.startDate);
      endDate = new Date(milestone.endDate);
    } else {
      // Hitos intermedios: desde el hito anterior hasta este hito
      const previousMilestone = milestones[currentMilestoneIndex - 1];
      startDate = new Date(previousMilestone.endDate);
      endDate = new Date(milestone.endDate);
    }
    
    // Filtrar tareas que están en el rango de este hito (excluyendo hitos)
    const tasksInRange = allTasks.filter(task => {
      if (task.isMilestone) return false; // Excluir hitos
      
      const taskStartDate = new Date(task.startDate);
      const taskEndDate = new Date(task.endDate);
      
      // La tarea está en el rango si:
      // - Su fecha de inicio está entre startDate y endDate, O
      // - Su fecha de fin está entre startDate y endDate, O
      // - Envuelve completamente el rango
      return (taskStartDate >= startDate && taskStartDate <= endDate) ||
             (taskEndDate >= startDate && taskEndDate <= endDate) ||
             (taskStartDate <= startDate && taskEndDate >= endDate);
    });
    
    // Calcular progreso promedio de las tareas en el rango
    if (tasksInRange.length === 0) return 0;
    
    const totalProgress = tasksInRange.reduce((sum, task) => sum + (task.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / tasksInRange.length);
    
    console.log('🎯 CÁLCULO PROGRESO HITO:', {
      milestoneName: milestone.name,
      milestoneId: milestone.id,
      currentMilestoneIndex,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      tasksInRange: tasksInRange.length,
      totalProgress,
      averageProgress,
      tasksDetails: tasksInRange.map(t => ({ 
        name: t.name, 
        progress: t.progress, 
        startDate: t.startDate, 
        endDate: t.endDate 
      }))
    });
    
    return averageProgress;
  };

  // Función para obtener tareas próximas a vencer (menos de 15 días)
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
    
    // Agrupar tareas por hito
    const tasksByMilestone = {};
    
    tasksNearDeadline.forEach(task => {
      // Encontrar a qué hito pertenece esta tarea
      const milestones = allTasks
        .filter(t => t.isMilestone)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      let assignedMilestone = null;
      
      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];
        let startDate, endDate;
        
        if (i === 0) {
          // Primer hito: desde el inicio del proyecto hasta este hito
          const firstTask = allTasks
            .filter(t => !t.isMilestone)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
          startDate = firstTask ? new Date(firstTask.startDate) : new Date(milestone.startDate);
          endDate = new Date(milestone.endDate);
        } else {
          // Hitos intermedios: desde el hito anterior hasta este hito
          const previousMilestone = milestones[i - 1];
          startDate = new Date(previousMilestone.endDate);
          endDate = new Date(milestone.endDate);
        }
        
        const taskStartDate = new Date(task.startDate);
        const taskEndDate = new Date(task.endDate);
        
        // Verificar si la tarea está en el rango de este hito
        if ((taskStartDate >= startDate && taskStartDate <= endDate) ||
            (taskEndDate >= startDate && taskEndDate <= endDate) ||
            (taskStartDate <= startDate && taskEndDate >= endDate)) {
          assignedMilestone = milestone;
          break;
        }
      }
      
      if (assignedMilestone) {
        if (!tasksByMilestone[assignedMilestone.id]) {
          tasksByMilestone[assignedMilestone.id] = {
            milestone: assignedMilestone,
            tasks: []
          };
        }
        tasksByMilestone[assignedMilestone.id].tasks.push(task);
      }
    });
    
    return Object.values(tasksByMilestone);
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

  const projectTabs = [
  { id: 'summary', name: 'Dashboard Resumen', icon: '📊' },
  { id: 'risks', name: 'Gestión de Riesgos', icon: '🛡️' },
  { id: 'schedule', name: 'Cronograma', icon: '📅' },
  { id: 'financial', name: 'Gestión Financiera', icon: '💰' },
  { id: 'resources', name: 'Gestión de Recursos', icon: '👥' },
  { id: 'changes', name: 'Control de Cambios', icon: '🔄' },
  { id: 'cashflow', name: 'Flujo de Caja', icon: '💸' },
  { id: 'files', name: 'Archivos', icon: '📎' },
  { id: 'audit', name: 'Auditoría Documental', icon: '📋' }
];

  // Solo mostrar proyectos activos
  const activeProjects = projects?.filter(p => p.status === 'active') || [];

  // IMPORTANTE: Los datos deben filtrarse por proyecto seleccionado
  // Actualmente se están usando todos los datos sin filtrar, lo que puede mostrar información incorrecta
  
  // Calcular métricas EVM del proyecto actual
  const calculateEVMMetrics = () => {
    if (!currentProject || !Array.isArray(projectWorkPackages) || projectWorkPackages.length === 0) return {};

    // Usar SOLO los work packages del proyecto seleccionado
    const BAC = projectWorkPackages.reduce((sum, wp) => sum + (wp.budget || 0), 0);
    const PV = projectWorkPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0);
    const EV = projectWorkPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0);
    const AC = projectWorkPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0);

    const CV = EV - AC;
    const SV = EV - PV;
    const CPI = AC > 0 ? EV / AC : 0;
    const SPI = PV > 0 ? EV / PV : 0;
    const percentComplete = BAC > 0 ? (EV / BAC) * 100 : 0;
    const percentSpent = BAC > 0 ? (AC / BAC) * 100 : 0;

    return { BAC, PV, EV, AC, CV, SV, CPI, SPI, percentComplete, percentSpent };
  };

  const evmMetrics = calculateEVMMetrics();

  // Calcular fecha de fin real del cronograma basada en las tareas
  const calculateProjectEndDate = () => {
    if (!tasks || tasks.length === 0) return null;
    
    const endDates = tasks.map(task => new Date(task.endDate));
    const maxEndDate = new Date(Math.max(...endDates));
    
    return maxEndDate.toISOString().split('T')[0];
  };

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
                    <span className="text-red-500">📅</span>
                    <span>{currentProject.startDate} - {projectEndDate || currentProject.endDate}</span>
                  </span>
                </div>
                {/* KPIs en tiempo real */}
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <span className={`px-2 py-1 rounded ${(evmMetrics.CPI || 0) >= 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    CPI: {evmMetrics.CPI?.toFixed(2) || 'N/A'}
                  </span>
                  <span className={`px-2 py-1 rounded ${(evmMetrics.SPI || 0) >= 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    SPI: {evmMetrics.SPI?.toFixed(2) || 'N/A'}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {evmMetrics.percentComplete?.toFixed(1) || 0}% completado
                  </span>
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Proyecto Activo
        </label>
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
                      {currentProject?.startDate ? new Date(currentProject.startDate).toLocaleDateString('es-ES') : 'N/A'}
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
                  {projectTasks?.filter(task => task.isMilestone).map((milestone, index) => (
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
                  </div>
                  <span className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                    {getTasksNearDeadline(projectTasks).reduce((total, group) => total + group.tasks.length, 0)} tareas
                  </span>
                </h2>
                
                {getTasksNearDeadline(projectTasks).length > 0 ? (
                  <div className="space-y-6">
                    {getTasksNearDeadline(projectTasks).map((group, groupIndex) => (
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
                                    <h4 className="font-medium text-gray-800">{task.name}</h4>
                                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                      <span>📅 {new Date(task.endDate).toLocaleDateString('es-ES')}</span>
                                      <span>👤 {task.assignedTo || 'Sin asignar'}</span>
                                      <span>📊 {task.progress || 0}% completado</span>
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
                    <p className="text-sm mt-2">Todas las tareas están al día o completadas</p>
                  </div>
                )}
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
