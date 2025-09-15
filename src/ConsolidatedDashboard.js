import React from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';

const ConsolidatedDashboard = ({ projects, portfolioMetrics, workPackages = [], risks = [] }) => {
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Calcular métricas adicionales (solo proyectos activos)
  const activeProjects = projects.filter(p => p.status === 'active');
  const totalBudget = activeProjects.reduce((sum, p) => sum + p.budget, 0);
  const totalReserves = activeProjects.reduce((sum, p) => sum + p.contingencyReserve + p.managementReserve, 0);
  const highPriorityProjects = activeProjects.filter(p => p.priority === 'high');
  const projectsWithIRR = activeProjects.filter(p => p.irr > 0);
  const averageIRR = projectsWithIRR.length > 0 
    ? projectsWithIRR.reduce((sum, p) => sum + p.irr, 0) / projectsWithIRR.length 
    : 0;

  // Métricas adicionales de work packages y riesgos
  const totalWorkPackages = workPackages.length;
  const completedWorkPackages = workPackages.filter(wp => wp.status === 'completed').length;
  const inProgressWorkPackages = workPackages.filter(wp => wp.status === 'in-progress').length;
  const totalWorkPackageBudget = workPackages.reduce((sum, wp) => sum + (wp.budget || 0), 0);
  const totalWorkPackageEarned = workPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0);
  const totalWorkPackageActual = workPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0);

  // Métricas de riesgos
  const activeRisks = risks.filter(r => r.status === 'active');
  const highPriorityRisks = risks.filter(r => r.priority === 'high');
  const totalRiskImpact = risks.reduce((sum, r) => sum + (r.costImpact || 0), 0);

  // Calcular métricas EVM consolidadas
  const consolidatedCPI = totalWorkPackageActual > 0 ? totalWorkPackageEarned / totalWorkPackageActual : 1;
  const consolidatedSPI = totalWorkPackageBudget > 0 ? totalWorkPackageEarned / totalWorkPackageBudget : 1;
  const consolidatedCV = totalWorkPackageEarned - totalWorkPackageActual;
  const consolidatedSV = totalWorkPackageEarned - totalWorkPackageBudget;

  return (
    <div className="space-y-6">
      {/* Header Ejecutivo */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">📈 Dashboard Consolidado</h1>
          <p className="text-indigo-100 text-lg">
            Vista ejecutiva del estado general del portfolio
          </p>
        </div>
      </div>

      {/* Alerta Informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-blue-600 text-xl mr-3">ℹ️</div>
          <div className="text-blue-800">
            <strong>Nota:</strong> Este dashboard solo muestra métricas de proyectos con estado "Activo". 
            Los proyectos "Inactivos" no influyen en los indicadores financieros ni en las métricas del portfolio.
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Proyectos Activos</div>
              <div className="text-3xl font-bold text-gray-800">
                {activeProjects.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                de {projects.length} total
              </div>
            </div>
            <div className="text-blue-500 text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Presupuesto Total</div>
              <div className="text-3xl font-bold text-gray-800">
                ${(totalBudget / 1000).toFixed(0)}K USD
              </div>
              <div className="text-sm text-gray-600 mt-1">
                ${(totalReserves / 1000).toFixed(0)}K USD reservas
              </div>
            </div>
            <div className="text-green-500 text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Prioridad Alta</div>
              <div className="text-3xl font-bold text-gray-800">
                {highPriorityProjects.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Requieren atención
              </div>
            </div>
            <div className="text-purple-500 text-3xl">🎯</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">TIR Promedio</div>
              <div className="text-3xl font-bold text-gray-800">
                {averageIRR.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {projectsWithIRR.length} proyectos
              </div>
            </div>
            <div className="text-orange-500 text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Work Packages</div>
              <div className="text-3xl font-bold text-gray-800">
                {totalWorkPackages}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {completedWorkPackages} completados
              </div>
            </div>
            <div className="text-indigo-500 text-3xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Riesgos Activos</div>
              <div className="text-3xl font-bold text-gray-800">
                {activeRisks.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {highPriorityRisks.length} alta prioridad
              </div>
            </div>
            <div className="text-red-500 text-3xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Estado del Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen por Estado */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Portfolio</h3>
          <div className="space-y-3">
            {[
              { status: 'active', label: 'Activos', color: 'bg-green-100 text-green-800' },
              { status: 'completed', label: 'Completados', color: 'bg-blue-100 text-blue-800' },
              { status: 'on-hold', label: 'En Pausa', color: 'bg-yellow-100 text-yellow-800' },
              { status: 'cancelled', label: 'Cancelados', color: 'bg-red-100 text-red-800' }
            ].map(({ status, label, color }) => {
              const count = projects.filter(p => p.status === status).length;
              const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getStatusIcon(status)}</span>
                    <span className="font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          status === 'active' ? 'bg-green-500' :
                          status === 'completed' ? 'bg-blue-500' :
                          status === 'on-hold' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen por Prioridad */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución por Prioridad</h3>
          <div className="space-y-3">
            {[
              { priority: 'high', label: 'Alta', color: 'bg-red-100 text-red-800' },
              { priority: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
              { priority: 'low', label: 'Baja', color: 'bg-green-100 text-green-800' }
            ].map(({ priority, label, color }) => {
              const count = projects.filter(p => p.priority === priority).length;
              const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getPriorityIcon(priority)}</span>
                    <span className="font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          priority === 'high' ? 'bg-red-500' :
                          priority === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Proyectos Destacados */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Proyectos Destacados</h3>
        
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <div>No hay proyectos en el portfolio</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Proyecto con mayor presupuesto */}
            {(() => {
              const maxBudgetProject = projects.reduce((max, p) => 
                p.budget > max.budget ? p : max, projects[0]
              );
              return (
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">💰</span>
                    <h4 className="font-semibold text-gray-800">Mayor Presupuesto</h4>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{maxBudgetProject.name}</div>
                  <div className="text-lg font-bold text-blue-600">
                    ${(maxBudgetProject.budget / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {maxBudgetProject.manager}
                  </div>
                </div>
              );
            })()}

            {/* Proyecto con mayor TIR */}
            {(() => {
              const maxIRRProject = projects.filter(p => p.irr > 0).reduce((max, p) => 
                p.irr > max.irr ? p : max, { irr: 0 }
              );
              return maxIRRProject.irr > 0 ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">📈</span>
                    <h4 className="font-semibold text-gray-800">Mejor TIR</h4>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{maxIRRProject.name}</div>
                  <div className="text-lg font-bold text-green-600">
                    {maxIRRProject.irr.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {maxIRRProject.manager}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Proyecto más reciente */}
            {(() => {
              const latestProject = projects.reduce((latest, p) => 
                new Date(p.createdAt) > new Date(latest.createdAt) ? p : latest, projects[0]
              );
              return (
                <div className="border border-gray-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">🆕</span>
                    <h4 className="font-semibold text-gray-800">Más Reciente</h4>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">{latestProject.name}</div>
                  <div className="text-lg font-bold text-purple-600">
                    {new Date(latestProject.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {latestProject.manager}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Métricas EVM Consolidadas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Métricas EVM Consolidadas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {consolidatedCPI.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">CPI Consolidado</div>
            <div className="text-xs text-gray-500">
              {consolidatedCPI >= 1 ? '✅ En presupuesto' : '⚠️ Sobre presupuesto'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {consolidatedSPI.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">SPI Consolidado</div>
            <div className="text-xs text-gray-500">
              {consolidatedSPI >= 1 ? '✅ En tiempo' : '⚠️ Retrasado'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              ${(consolidatedCV / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-gray-600">CV Consolidado</div>
            <div className="text-xs text-gray-500">
              {consolidatedCV >= 0 ? '✅ Favorable' : '⚠️ Desfavorable'}
            </div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              ${(consolidatedSV / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-gray-600">SV Consolidado</div>
            <div className="text-xs text-gray-500">
              {consolidatedSV >= 0 ? '✅ Adelantado' : '⚠️ Retrasado'}
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Corporativas */}
      <CorporateAlerts projects={projects} portfolioMetrics={portfolioMetrics} />

      {/* Gráficos Consolidados */}
      <PortfolioCharts projects={projects} portfolioMetrics={portfolioMetrics} workPackages={workPackages} risks={risks} />

      {/* Resumen Ejecutivo */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen Ejecutivo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Estado General del Portfolio</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div>• <strong>{activeProjects.length}</strong> proyectos activos en ejecución</div>
              <div>• <strong>{projects.filter(p => p.status === 'completed').length}</strong> proyectos completados exitosamente</div>
              <div>• <strong>{highPriorityProjects.length}</strong> proyectos de alta prioridad requieren atención</div>
              <div>• <strong>${(totalBudget / 1000).toFixed(0)}K</strong> presupuesto total comprometido</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Recomendaciones</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {highPriorityProjects.length > 0 && (
                <div>• ⚠️ Revisar {highPriorityProjects.length} proyecto(s) de alta prioridad</div>
              )}
              {projects.filter(p => p.status === 'on-hold').length > 0 && (
                <div>• ⏸️ Evaluar {projects.filter(p => p.status === 'on-hold').length} proyecto(s) en pausa</div>
              )}
              {activeProjects.length > 5 && (
                <div>• ⚡ Considerar capacidad de recursos para {activeProjects.length} proyectos activos</div>
              )}
              <div>• 📊 Monitorear métricas EVM de proyectos activos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedDashboard;
