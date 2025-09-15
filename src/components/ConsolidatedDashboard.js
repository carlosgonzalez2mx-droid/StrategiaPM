import React from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';
import ConsolidatedCashFlow from './ConsolidatedCashFlow';

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
  invoicesByProject = {}
}) => {
  
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
  
  // Usar directamente el status que viene de la lista de "Hitos del Proyecto"
  // donde el usuario puede seleccionar: "En Proceso", "Realizado", "Atrasado"
  // Si no tiene status definido, tratarlo como "in-progress" (En Proceso)
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const inProgressMilestones = milestones.filter(m => 
    m.status === 'in-progress' || 
    m.status === 'pending' || 
    m.status === undefined || 
    m.status === null
  );
  const delayedMilestones = milestones.filter(m => m.status === 'delayed');
  
  // Logs de depuración
  const uniqueStatuses = [...new Set(milestones.map(m => m.status))];
  console.log('🔍 DEBUG HITOS PORTFOLIO:', {
    totalTasks: allTasks.length,
    totalMilestones: milestones.length,
    completed: completedMilestones.length,
    inProgress: inProgressMilestones.length,
    delayed: delayedMilestones.length,
    uniqueStatuses: uniqueStatuses,
    milestonesData: milestones.slice(0, 10).map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      statusType: typeof m.status,
      progress: m.progress,
      endDate: m.endDate,
      isMilestone: m.isMilestone
    })),
    allMilestonesStatuses: milestones.map(m => m.status)
  });

  // Calcular métricas EVM consolidadas
  const totalWorkPackageBudget = workPackages?.reduce((sum, wp) => sum + (wp.budget || 0), 0) || 0;
  const totalWorkPackageEarned = workPackages?.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0) || 0;
  const totalWorkPackageActual = workPackages?.reduce((sum, wp) => sum + (wp.actualCost || 0), 0) || 0;

  const consolidatedCPI = totalWorkPackageActual > 0 ? totalWorkPackageEarned / totalWorkPackageActual : 1;
  const consolidatedSPI = totalWorkPackageBudget > 0 ? totalWorkPackageEarned / totalWorkPackageBudget : 1;
  const consolidatedCV = totalWorkPackageEarned - totalWorkPackageActual;
  const consolidatedSV = totalWorkPackageEarned - totalWorkPackageBudget;
  const consolidatedVAC = totalWorkPackageBudget - (totalWorkPackageActual + (totalWorkPackageBudget - totalWorkPackageEarned));
  const consolidatedEAC = totalWorkPackageBudget / consolidatedCPI;

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
    switch(status) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-blue-600">Proyectos Activos</span>
            </div>
            <div className="text-3xl font-bold text-blue-800">
              {activeProjects.length}
            </div>
            <div className="text-sm text-blue-600 mt-1">
              de {projects?.length || 0} total
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💰</span>
              <span className="text-sm font-medium text-green-600">Presupuesto Total</span>
            </div>
            <div className="text-3xl font-bold text-green-800">
              ${(totalBudget / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-green-600 mt-1">
              Presupuesto asignado
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📅</span>
              <span className="text-sm font-medium text-purple-600">Inicio Más Temprano</span>
            </div>
            <div className="text-xl font-bold text-purple-800">
              {earliestStart ? earliestStart.toLocaleDateString('es-ES') : 'N/A'}
            </div>
            <div className="text-sm text-purple-600 mt-1">
              Fecha de inicio del portfolio
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏁</span>
              <span className="text-sm font-medium text-orange-600">Fin Más Tardío</span>
            </div>
            <div className="text-xl font-bold text-orange-800">
              {latestEnd ? latestEnd.toLocaleDateString('es-ES') : 'N/A'}
            </div>
            <div className="text-sm text-orange-600 mt-1">
              Fecha de fin del portfolio
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Proyecto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Presupuesto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Inicio</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fin</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map((project, index) => (
                <tr key={project.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(project.status)}</span>
                      <span className="font-medium text-gray-800">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' :
                      project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status === 'active' ? 'Activo' :
                       project.status === 'completed' ? 'Completado' :
                       project.status === 'on-hold' ? 'En Pausa' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    ${((project.budget || 0) / 1000).toFixed(0)}K
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString('es-ES') : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.endDate ? new Date(project.endDate).toLocaleDateString('es-ES') : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, Math.max(0, (project.progress || 0)))}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round(project.progress || 0)}%
                      </span>
          </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Indicadores Financieros Consolidados */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">💳</span>
          Indicadores Financieros Consolidados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📋</span>
              <span className="text-sm font-medium text-emerald-600">Órdenes de Compra</span>
              </div>
            <div className="text-3xl font-bold text-emerald-800">
              ${(totalPurchaseOrders / 1000).toFixed(0)}K
              </div>
            <div className="text-sm text-emerald-600 mt-1">
              Total en OC aprobadas
          </div>
        </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💸</span>
              <span className="text-sm font-medium text-amber-600">Anticipos</span>
              </div>
            <div className="text-3xl font-bold text-amber-800">
              ${(totalAdvances / 1000).toFixed(0)}K
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
              ${(totalInvoices / 1000).toFixed(0)}K
              </div>
            <div className="text-sm text-cyan-600 mt-1">
              Facturas ingresadas
          </div>
        </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🛡️</span>
              <span className="text-sm font-medium text-purple-600">Reservas</span>
            </div>
            <div className="text-3xl font-bold text-purple-800">
              ${(totalReserves / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-purple-600 mt-1">
              Contingencia + Gestión
            </div>
          </div>
        </div>
      </div>

      {/* 4. Indicadores de Riesgos del Portfolio */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">🛡️</span>
          Indicadores de Riesgos del Portfolio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🚨</span>
              <span className="text-sm font-medium text-red-600">Riesgos Activos</span>
                  </div>
            <div className="text-3xl font-bold text-red-800">
              {activeRisks.length}
                    </div>
            <div className="text-sm text-red-600 mt-1">
              Total de riesgos identificados
                  </div>
                </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">⚠️</span>
              <span className="text-sm font-medium text-orange-600">Alta Prioridad</span>
            </div>
            <div className="text-3xl font-bold text-orange-800">
              {highPriorityRisks.length}
            </div>
            <div className="text-sm text-orange-600 mt-1">
              Requieren atención inmediata
            </div>
        </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-yellow-600">Distribución</span>
                  </div>
            <div className="text-sm text-yellow-800">
              <div className="flex justify-between mb-1">
                <span>Alta: {highPriorityRisks.length}</span>
                <span>Media: {mediumPriorityRisks.length}</span>
                    </div>
              <div className="flex justify-between">
                <span>Baja: {lowPriorityRisks.length}</span>
                <span>Total: {activeRisks.length}</span>
                  </div>
                </div>
          </div>
        </div>
      </div>

      {/* 5. Hitos del Portfolio */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">🎯</span>
          Hitos del Portfolio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">✅</span>
              <span className="text-sm font-medium text-green-600">Completados</span>
          </div>
            <div className="text-3xl font-bold text-green-800">
              {completedMilestones.length}
            </div>
            <div className="text-sm text-green-600 mt-1">
              Hitos realizados
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium text-yellow-600">En Proceso</span>
            </div>
            <div className="text-3xl font-bold text-yellow-800">
              {inProgressMilestones.length}
            </div>
            <div className="text-sm text-yellow-600 mt-1">
              Hitos en ejecución
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">⚠️</span>
              <span className="text-sm font-medium text-red-600">Atrasados</span>
            </div>
            <div className="text-3xl font-bold text-red-800">
              {delayedMilestones.length}
            </div>
            <div className="text-sm text-red-600 mt-1">
              Hitos retrasados
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📈</span>
              <span className="text-sm font-medium text-blue-600">Progreso</span>
            </div>
            <div className="text-3xl font-bold text-blue-800">
              {milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0}%
            </div>
            <div className="text-sm text-blue-600 mt-1">
              Completitud general
            </div>
          </div>
        </div>
      </div>

      {/* 6. Indicadores PMBOK v7 con Explicaciones */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="text-3xl mr-3">📊</span>
          Indicadores PMBOK v7 - Gestión de Costos
        </h2>
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

      {/* 7. Flujo de Caja Consolidado */}
      <ConsolidatedCashFlow 
        projects={projects}
        tasksByProject={tasksByProject}
        purchaseOrdersByProject={purchaseOrdersByProject}
        advancesByProject={advancesByProject}
        invoicesByProject={invoicesByProject}
      />
    </div>
  );
};

export default ConsolidatedDashboard;