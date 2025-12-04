import React, { useEffect, useState } from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';
import ConsolidatedCashFlow from './ConsolidatedCashFlow';
import CashFlowChart from './dashboard/CashFlowChart';
import FloatingSaveButton from './FloatingSaveButton';

const ConsolidatedDashboard = ({
  projects,
  portfolioMetrics,
  workPackages = [],
  risks = [],
  purchaseOrders = [],
  advances = [],
  invoices = [],
  tasksByProject = {},
  purchaseOrdersByProject = {},
  advancesByProject = {},
  invoicesByProject = {},
  hasUnsavedChanges = false,
  onSave
}) => {

  // 🚀 NUEVO: Estado para forzar re-render cuando cambien las tareas de minutas
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // 🚀 NUEVO: Escuchar eventos de actualización de tareas de minutas
  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      console.log('🔄 ConsolidatedDashboard: Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });

      // Forzar re-render del Dashboard
      console.log('🔄 ConsolidatedDashboard: Forzando re-render del Dashboard...');
      setDashboardRefreshKey(prev => prev + 1);
    };

    // Agregar listener
    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);

    // Cleanup
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  // Calcular métricas del portfolio (solo proyectos activos)
  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalReserves = activeProjects.reduce((sum, p) => sum + ((p.budget || 0) * 0.15), 0); // 15% total reserves

  // Calcular fechas del portfolio
  const projectDates = activeProjects.map(p => ({
    start: p.startDate ? new Date(p.startDate) : null,
    end: p.endDate ? new Date(p.endDate) : null
  })).filter(d => d.start && d.end);

  const earliestStart = projectDates.length > 0 ?
    new Date(Math.min(...projectDates.map(d => d.start.getTime()))) : null;
  const latestEnd = projectDates.length > 0 ?
    new Date(Math.max(...projectDates.map(d => d.end.getTime()))) : null;

  // Calcular métricas financieras consolidadas
  const totalPurchaseOrders = purchaseOrders?.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
  const totalAdvances = advances?.reduce((sum, adv) => sum + (adv.amount || 0), 0) || 0;
  const totalInvoices = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

  // Calcular métricas de riesgos
  const activeRisks = risks?.filter(r => r.status === 'active') || [];
  const highPriorityRisks = activeRisks.filter(r => r.priority === 'high');
  const mediumPriorityRisks = activeRisks.filter(r => r.priority === 'medium');
  const lowPriorityRisks = activeRisks.filter(r => r.priority === 'low');

  // Calcular métricas de hitos del portfolio
  // Los hitos vienen de la sección "Hitos del Proyecto" en cada proyecto
  const allTasks = Object.values(tasksByProject || {}).flat();
  const milestones = allTasks.filter(task => task.isMilestone);

  // CORRECCIÓN MEJORADA: Clasificación más precisa de hitos
  // Un hito está completado si su progreso es 100%
  // Un hito está en proceso si tiene algún progreso (mayor a 0%)
  // Un hito está retrasado solo si tiene fecha de fin pasada y progreso < 100%
  const completedMilestones = milestones.filter(m => (m.progress || 0) >= 100);
  const inProgressMilestones = milestones.filter(m => (m.progress || 0) > 0);

  // Para hitos retrasados: verificar si la fecha de fin ya pasó y no está completado
  const currentDate = new Date();
  const delayedMilestones = milestones.filter(m => {
    const progress = m.progress || 0;
    if (progress >= 100) return false; // Si está completado, no está retrasado

    // Si tiene fecha de fin, verificar si ya pasó
    if (m.endDate) {
      const endDate = new Date(m.endDate);
      return endDate < currentDate && progress < 100;
    }

    // Si no tiene fecha de fin, no considerarlo retrasado
    return false;
  });

  // Hitos pendientes: los que no están en ninguna de las categorías anteriores
  const pendingMilestones = milestones.filter(m => {
    const progress = m.progress || 0;
    return progress === 0 && !delayedMilestones.includes(m);
  });

  // Logs de depuración mejorados
  console.log('🔍 DEBUG HITOS PORTFOLIO MEJORADO:', {
    totalTasks: allTasks.length,
    totalMilestones: milestones.length,
    completed: completedMilestones.length,
    inProgress: inProgressMilestones.length,
    delayed: delayedMilestones.length,
    pending: pendingMilestones.length,
    currentDate: currentDate.toISOString().split('T')[0],
    milestonesData: milestones.slice(0, 5).map(m => ({
      id: m.id,
      name: m.name,
      progress: m.progress,
      endDate: m.endDate,
      isDelayed: m.endDate ? new Date(m.endDate) < currentDate && (m.progress || 0) < 100 : false,
      classification: (m.progress || 0) >= 100 ? 'completed' :
        (m.progress || 0) > 0 ? 'in-progress' : 'pending'
    })),
    progressDistribution: {
      '0%': milestones.filter(m => (m.progress || 0) === 0).length,
      '1-99%': milestones.filter(m => (m.progress || 0) > 0 && (m.progress || 0) < 100).length,
      '100%': milestones.filter(m => (m.progress || 0) >= 100).length
    },
    dateAnalysis: {
      milestonesWithEndDate: milestones.filter(m => m.endDate).length,
      milestonesPastDueDate: milestones.filter(m => m.endDate && new Date(m.endDate) < currentDate).length,
      milestonesPastDueAndIncomplete: delayedMilestones.length
    }
  });

  // Calcular métricas EVM consolidadas basadas en tareas reales
  // Si no hay workPackages, calcular basado en tareas del cronograma
  let totalWorkPackageBudget, totalWorkPackageEarned, totalWorkPackageActual;

  if (workPackages && workPackages.length > 0) {
    // Usar datos de workPackages si están disponibles
    totalWorkPackageBudget = workPackages.reduce((sum, wp) => sum + (wp.budget || 0), 0);
    totalWorkPackageEarned = workPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0);
    totalWorkPackageActual = workPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0);
  } else {
    // Calcular basado en tareas del cronograma
    const allTasks = Object.values(tasksByProject || {}).flat();

    // BAC (Budget at Completion): suma de costos de todas las tareas
    totalWorkPackageBudget = allTasks.reduce((sum, task) => sum + (task.cost || 0), 0);

    // EV (Earned Value): suma de costos * progreso de tareas
    totalWorkPackageEarned = allTasks.reduce((sum, task) => {
      const progress = (task.progress || 0) / 100;
      return sum + ((task.cost || 0) * progress);
    }, 0);

    // ✅ CORRECCIÓN: AC (Actual Cost) - usar facturas pagadas reales de todos los proyectos
    // Consolidar todas las facturas de todos los proyectos
    const allInvoices = Object.values(invoicesByProject || {}).flat();

    // Sumar solo las facturas pagadas (status === 'paid')
    totalWorkPackageActual = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    console.log('💰 AC CALCULATION DEBUG:', {
      totalInvoices: allInvoices.length,
      paidInvoices: allInvoices.filter(inv => inv.status === 'paid').length,
      totalWorkPackageActual,
      invoicesByProject: Object.keys(invoicesByProject || {}).length
    });
  }

  const consolidatedCPI = totalWorkPackageActual > 0 ? totalWorkPackageEarned / totalWorkPackageActual : 1;
  const consolidatedSPI = totalWorkPackageBudget > 0 ? totalWorkPackageEarned / totalWorkPackageBudget : 1;
  const consolidatedCV = totalWorkPackageEarned - totalWorkPackageActual;
  const consolidatedSV = totalWorkPackageEarned - totalWorkPackageBudget;
  const consolidatedVAC = totalWorkPackageBudget - (totalWorkPackageActual + (totalWorkPackageBudget - totalWorkPackageEarned));
  const consolidatedEAC = totalWorkPackageActual > 0 ? totalWorkPackageBudget / consolidatedCPI : totalWorkPackageBudget;

  // Logging para debug de métricas EVM
  console.log('📊 MÉTRICAS EVM CALCULADAS:', {
    dataSource: workPackages && workPackages.length > 0 ? 'workPackages' : 'tasks + invoices',
    workPackagesCount: workPackages?.length || 0,
    tasksCount: Object.values(tasksByProject || {}).flat().length,
    invoicesCount: Object.values(invoicesByProject || {}).flat().length,
    paidInvoicesCount: Object.values(invoicesByProject || {}).flat().filter(inv => inv.status === 'paid').length,
    totalWorkPackageBudget,
    totalWorkPackageEarned,
    totalWorkPackageActual,
    consolidatedCPI,
    consolidatedSPI,
    consolidatedVAC,
    consolidatedEAC
  });

  // Función para obtener el color del indicador
  const getIndicatorColor = (value, type) => {
    if (type === 'cpi' || type === 'spi') {
      return value >= 1 ? 'text-green-600' : value >= 0.9 ? 'text-yellow-600' : 'text-red-600';
    }
    if (type === 'variance') {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-600';
  };

  // Función para obtener el icono de estatus
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Ejecutivo */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📈 Dashboard Consolidado</h1>
        <p className="text-indigo-100 text-lg">
          Vista ejecutiva del estado general del portfolio de proyectos
        </p>
      </div>

      {/* 1. Vista General del Portfolio */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">🏢</span>
          Vista General del Portfolio
        </h2>

        {/* Primera fila: Métricas básicas */}
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Métricas Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Proyectos Activos */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📊</span>
              <span className="text-xs font-medium text-blue-600">Proyectos Activos</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {activeProjects.length}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              de {projects?.length || 0} total
            </div>
          </div>

          {/* Presupuesto Total */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">💰</span>
              <span className="text-xs font-medium text-green-600">Presupuesto Total</span>
            </div>
            <div className="text-2xl font-bold text-green-800">
              ${(() => {
                const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
                return (totalBudget / 1000).toFixed(0);
              })()}K
            </div>
            <div className="text-xs text-green-600 mt-1">
              Presupuesto asignado
            </div>
          </div>

          {/* Inicio Más Temprano */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📅</span>
              <span className="text-xs font-medium text-purple-600">Inicio Más Temprano</span>
            </div>
            <div className="text-lg font-bold text-purple-800">
              {(() => {
                let earliestDate = null;
                activeProjects.forEach(project => {
                  const projectTasks = tasksByProject[project.id] || [];
                  projectTasks.forEach(task => {
                    if (task.startDate) {
                      const taskStart = new Date(task.startDate);
                      if (!earliestDate || taskStart < earliestDate) {
                        earliestDate = taskStart;
                      }
                    }
                  });
                });
                return earliestDate ? earliestDate.toLocaleDateString('es-ES') : 'N/A';
              })()}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              Fecha de inicio del portfolio
            </div>
          </div>

          {/* Fin Más Tardío */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🏁</span>
              <span className="text-xs font-medium text-orange-600">Fin Más Tardío</span>
            </div>
            <div className="text-lg font-bold text-orange-800">
              {(() => {
                let latestDate = null;
                activeProjects.forEach(project => {
                  const projectTasks = tasksByProject[project.id] || [];
                  projectTasks.forEach(task => {
                    if (task.endDate) {
                      const taskEnd = new Date(task.endDate);
                      if (!latestDate || taskEnd > latestDate) {
                        latestDate = taskEnd;
                      }
                    }
                  });
                });
                return latestDate ? latestDate.toLocaleDateString('es-ES') : 'N/A';
              })()}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Fecha de fin del portfolio
            </div>
          </div>
        </div>

        {/* Segunda fila: Indicadores de desempeño */}
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Indicadores de Desempeño</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* % Cumplimiento Promedio */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">✅</span>
              <span className="text-xs font-medium text-emerald-600">% Cumplimiento Promedio</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {(() => {
                const currentDate = new Date();
                let totalCompliance = 0;
                let projectCount = 0;

                activeProjects.forEach(project => {
                  const projectTasks = tasksByProject[project.id] || [];
                  const overdueTasks = projectTasks.filter(task => {
                    if (!task.endDate) return false;
                    return new Date(task.endDate) < currentDate;
                  });

                  if (overdueTasks.length > 0) {
                    const completedOverdue = overdueTasks.filter(task => (task.progress || 0) >= 100).length;
                    const compliance = (completedOverdue / overdueTasks.length) * 100;
                    totalCompliance += compliance;
                    projectCount++;
                  }
                });

                const avgCompliance = projectCount > 0 ? totalCompliance / projectCount : 100;
                return avgCompliance.toFixed(1);
              })()}%
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              Tareas cumplidas a tiempo
            </div>
          </div>

          {/* Avance Cronograma Promedio */}
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📈</span>
              <span className="text-xs font-medium text-cyan-600">Avance Cronograma Promedio</span>
            </div>
            <div className="text-2xl font-bold text-cyan-800">
              {(() => {
                const totalProgress = activeProjects.reduce((sum, p) => sum + (p.progress || 0), 0);
                const avgProgress = activeProjects.length > 0 ? totalProgress / activeProjects.length : 0;
                return Math.round(avgProgress);
              })()}%
            </div>
            <div className="text-xs text-cyan-600 mt-1">
              Progreso general del portfolio
            </div>
          </div>

          {/* Riesgos Activos Totales */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">⚠️</span>
              <span className="text-xs font-medium text-red-600">Riesgos Activos Totales</span>
            </div>
            <div className="text-2xl font-bold text-red-800">
              {(() => {
                let totalRisks = 0;
                activeProjects.forEach(project => {
                  const projectRisks = risks?.filter(r => r.projectId === project.id && r.status === 'active') || [];
                  totalRisks += projectRisks.length;
                });
                return totalRisks;
              })()}
            </div>
            <div className="text-xs text-red-600 mt-1">
              Riesgos que requieren atención
            </div>
          </div>
        </div>

        {/* Tercera fila: Indicadores financieros */}
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Indicadores Financieros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Órdenes de Compra Totales */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">🛒</span>
              <span className="text-xs font-medium text-indigo-600">Órdenes de Compra</span>
            </div>
            <div className="text-2xl font-bold text-indigo-800">
              ${(() => {
                let totalPOs = 0;
                activeProjects.forEach(project => {
                  const projectPOs = purchaseOrdersByProject[project.id] || [];
                  totalPOs += projectPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
                });
                return (totalPOs / 1000).toFixed(0);
              })()}K
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              Total comprometido
            </div>
          </div>

          {/* Anticipos Totales */}
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-4 rounded-lg border border-violet-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">💵</span>
              <span className="text-xs font-medium text-violet-600">Anticipos</span>
            </div>
            <div className="text-2xl font-bold text-violet-800">
              ${(() => {
                let totalAdvances = 0;
                activeProjects.forEach(project => {
                  const projectAdvances = advancesByProject[project.id] || [];
                  totalAdvances += projectAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
                });
                return (totalAdvances / 1000).toFixed(0);
              })()}K
            </div>
            <div className="text-xs text-violet-600 mt-1">
              Anticipos otorgados
            </div>
          </div>

          {/* Facturación Total */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">📄</span>
              <span className="text-xs font-medium text-teal-600">Facturación</span>
            </div>
            <div className="text-2xl font-bold text-teal-800">
              ${(() => {
                let totalInvoices = 0;
                activeProjects.forEach(project => {
                  const projectInvoices = invoicesByProject[project.id] || [];
                  totalInvoices += projectInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                });
                return (totalInvoices / 1000).toFixed(0);
              })()}K
            </div>
            <div className="text-xs text-teal-600 mt-1">
              Total facturado
            </div>
          </div>
        </div>
      </div>

      {/* 2. Indicadores por Proyecto */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">📊</span>
          Indicadores por Proyecto
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Proyecto</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">Fecha<br />Inicio</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">Fecha<br />Fin</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">%<br />Cumplimiento</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">Avance<br />Cronograma</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">Riesgos<br />Activos</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Presupuesto<br />Asignado</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Órdenes de<br />Compra</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Anticipos</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Facturación</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Ordenar proyectos: primero por número al inicio del nombre, luego alfabéticamente
                const sortedProjects = [...activeProjects].sort((a, b) => {
                  // Extraer número al inicio del nombre
                  const numA = parseInt(a.name.match(/^(\d+)/)?.[1] || '999999');
                  const numB = parseInt(b.name.match(/^(\d+)/)?.[1] || '999999');

                  if (numA !== numB) {
                    return numA - numB;
                  }

                  // Si los números son iguales, ordenar alfabéticamente
                  return a.name.localeCompare(b.name);
                });

                return sortedProjects.map((project) => {
                  // Obtener tareas del proyecto
                  const projectTasks = tasksByProject[project.id] || [];

                  // Calcular Fecha Inicio y Fecha Fin desde las tareas
                  let startDate = null;
                  let endDate = null;

                  if (projectTasks.length > 0) {
                    const taskDates = projectTasks
                      .filter(task => task.startDate || task.endDate)
                      .map(task => ({
                        start: task.startDate ? new Date(task.startDate) : null,
                        end: task.endDate ? new Date(task.endDate) : null
                      }));

                    const startDates = taskDates.map(d => d.start).filter(d => d !== null);
                    const endDates = taskDates.map(d => d.end).filter(d => d !== null);

                    if (startDates.length > 0) {
                      startDate = new Date(Math.min(...startDates.map(d => d.getTime())));
                    }
                    if (endDates.length > 0) {
                      endDate = new Date(Math.max(...endDates.map(d => d.getTime())));
                    }
                  }

                  // Calcular % Cumplimiento
                  const currentDate = new Date();
                  const overdueTasks = projectTasks.filter(task => {
                    if (!task.endDate) return false;
                    return new Date(task.endDate) < currentDate;
                  });
                  const completedOverdue = overdueTasks.filter(task => (task.progress || 0) >= 100).length;
                  const totalOverdue = overdueTasks.length;
                  const compliancePercentage = totalOverdue > 0 ? (completedOverdue / totalOverdue) * 100 : 100;

                  // Contar riesgos activos
                  const projectRisks = risks?.filter(r => r.projectId === project.id && r.status === 'active') || [];
                  const activeRisksCount = projectRisks.length;

                  // Calcular Órdenes de Compra
                  const projectPOs = purchaseOrdersByProject[project.id] || [];
                  const totalPOs = projectPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

                  // Calcular Anticipos
                  const projectAdvances = advancesByProject[project.id] || [];
                  const totalAdvances = projectAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);

                  // Calcular Facturación
                  const projectInvoices = invoicesByProject[project.id] || [];
                  const totalInvoices = projectInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

                  return (
                    <tr key={project.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{getStatusIcon(project.status)}</span>
                          <span className="font-medium text-gray-800 line-clamp-2 leading-tight">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600 whitespace-nowrap">
                        {startDate ? startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600 whitespace-nowrap">
                        {endDate ? endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${compliancePercentage >= 90 ? 'bg-green-100 text-green-800' :
                          compliancePercentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {compliancePercentage.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 mb-1">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, (project.progress || 0)))}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {Math.round(project.progress || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${activeRisksCount === 0 ? 'bg-green-100 text-green-800' :
                          activeRisksCount <= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {activeRisksCount}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-gray-800 whitespace-nowrap">
                        ${((project.budget || 0) / 1000).toFixed(0)}K
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-blue-700 whitespace-nowrap">
                        ${(totalPOs / 1000).toFixed(0)}K
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-purple-700 whitespace-nowrap">
                        ${(totalAdvances / 1000).toFixed(0)}K
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-green-700 whitespace-nowrap">
                        ${(totalInvoices / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Indicadores PMBOK v7 con Explicaciones */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">📊</span>
          Indicadores PMBOK v7 - Gestión de Costos
        </h2>

        {/* Nota informativa sobre el cálculo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-blue-600 text-xl mr-3">ℹ️</div>
            <div className="text-blue-800">
              <strong>Fuente de datos:</strong> {workPackages && workPackages.length > 0
                ? `Calculado basado en ${workPackages.length} paquetes de trabajo`
                : `Calculado basado en ${Object.values(tasksByProject || {}).flat().length} tareas del cronograma`}
              {!(workPackages && workPackages.length > 0) && (
                <span className="block text-sm mt-1">
                  Los costos se estiman basándose en el campo "Costo" de cada tarea y su progreso actual.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-800">CPI - Cost Performance Index</h3>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-blue-800 mb-2">
                {consolidatedCPI.toFixed(2)}
              </div>
              <div className={`text-sm font-medium mb-2 ${getIndicatorColor(consolidatedCPI, 'cpi')}`}>
                {consolidatedCPI >= 1 ? '✅ Eficiencia de costos positiva' :
                  consolidatedCPI >= 0.9 ? '⚠️ Eficiencia de costos aceptable' :
                    '❌ Eficiencia de costos deficiente'}
              </div>
              <div className="text-xs text-gray-600">
                <strong>¿Qué significa?</strong> Mide la eficiencia del costo del trabajo realizado.
                Valores ≥ 1.0 indican que el proyecto está dentro del presupuesto.
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-800">SPI - Schedule Performance Index</h3>
                <span className="text-2xl">📅</span>
              </div>
              <div className="text-3xl font-bold text-green-800 mb-2">
                {consolidatedSPI.toFixed(2)}
              </div>
              <div className={`text-sm font-medium mb-2 ${getIndicatorColor(consolidatedSPI, 'spi')}`}>
                {consolidatedSPI >= 1 ? '✅ Eficiencia de cronograma positiva' :
                  consolidatedSPI >= 0.9 ? '⚠️ Eficiencia de cronograma aceptable' :
                    '❌ Eficiencia de cronograma deficiente'}
              </div>
              <div className="text-xs text-gray-600">
                <strong>¿Qué significa?</strong> Mide la eficiencia del cronograma del trabajo realizado.
                Valores ≥ 1.0 indican que el proyecto está adelantado.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-800">VAC - Variance at Completion</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className={`text-3xl font-bold mb-2 ${getIndicatorColor(consolidatedVAC, 'variance')}`}>
                ${(consolidatedVAC / 1000).toFixed(0)}K
              </div>
              <div className={`text-sm font-medium mb-2 ${getIndicatorColor(consolidatedVAC, 'variance')}`}>
                {consolidatedVAC >= 0 ? '✅ Proyecto dentro del presupuesto' :
                  '❌ Proyecto excederá el presupuesto'}
              </div>
              <div className="text-xs text-gray-600">
                <strong>¿Qué significa?</strong> Predice la diferencia entre el presupuesto total y el costo final estimado.
                Valores positivos indican ahorro proyectado.
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-800">EAC - Estimate at Completion</h3>
                <span className="text-2xl">🎯</span>
              </div>
              <div className="text-3xl font-bold text-orange-800 mb-2">
                ${(consolidatedEAC / 1000).toFixed(0)}K
              </div>
              <div className="text-sm font-medium mb-2 text-orange-700">
                Costo total estimado del proyecto
              </div>
              <div className="text-xs text-gray-600">
                <strong>¿Qué significa?</strong> Predice el costo total del proyecto basado en el rendimiento actual.
                Se calcula como: Presupuesto Total ÷ CPI.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6.5. Gráfica de Flujo de Caja */}
      <CashFlowChart
        totalPurchaseOrders={totalPurchaseOrders}
        totalAdvances={totalAdvances}
        totalInvoices={totalInvoices}
      />

      {/* 7. Flujo de Caja Consolidado */}
      <ConsolidatedCashFlow
        projects={projects}
        tasksByProject={tasksByProject}
        purchaseOrdersByProject={purchaseOrdersByProject}
        advancesByProject={advancesByProject}
        invoicesByProject={invoicesByProject}
      />

      {/* Botón flotante de guardado */}
      <FloatingSaveButton
        onSave={onSave}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
};

export default ConsolidatedDashboard;