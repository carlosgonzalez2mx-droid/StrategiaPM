import React from 'react';

const PortfolioCharts = ({ projects, portfolioMetrics, workPackages = [], risks = [] }) => {
  
  // Datos para gráfico de distribución por estado
  const statusData = [
    { name: 'Activos', count: portfolioMetrics.activeProjects, color: '#3B82F6' },
    { name: 'Completados', count: portfolioMetrics.completedProjects, color: '#10B981' },
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

  // Timeline de proyectos
  const ProjectTimeline = () => {
    const sortedProjects = projects.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const earliestStart = new Date(Math.min(...projects.map(p => new Date(p.startDate))));
    const latestEnd = new Date(Math.max(...projects.map(p => new Date(p.endDate))));
    const totalDays = (latestEnd - earliestStart) / (1000 * 60 * 60 * 24);

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">📅 Timeline de Proyectos</h3>
        <div className="space-y-4">
          {sortedProjects.map((project, index) => {
            const startDays = (new Date(project.startDate) - earliestStart) / (1000 * 60 * 60 * 24);
            const duration = (new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24);
            const leftPercent = (startDays / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;

            const getStatusColor = (status) => {
              switch(status) {
                case 'active': return '#3B82F6';
                case 'completed': return '#10B981';
                case 'on-hold': return '#F59E0B';
                case 'cancelled': return '#EF4444';
                default: return '#6B7280';
              }
            };

            return (
              <div key={project.id} className="relative">
                <div className="flex items-center mb-1">
                  <div className="w-32 text-sm font-medium text-gray-700 truncate">
                    {project.name}
                  </div>
                  <div className="flex-1 mx-4 relative h-6 bg-gray-100 rounded">
                    <div
                      className="absolute h-6 rounded flex items-center px-2 text-white text-xs font-medium"
                      style={{
                        backgroundColor: getStatusColor(project.status),
                        left: `${leftPercent}%`,
                        width: `${Math.max(widthPercent, 5)}%`
                      }}
                    >
                      {duration > 30 && project.name.substring(0, 10)}
                    </div>
                  </div>
                  <div className="w-24 text-xs text-gray-500">
                    {Math.round(duration)} días
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Leyenda de fechas */}
          <div className="flex justify-between text-xs text-gray-500 mt-4 px-32">
            <span>{earliestStart.toLocaleDateString()}</span>
            <span>Hoy</span>
            <span>{latestEnd.toLocaleDateString()}</span>
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
      <ProjectTimeline />

      {/* Métricas financieras */}
      <FinancialMetrics />
    </div>
  );
};

export default PortfolioCharts;
