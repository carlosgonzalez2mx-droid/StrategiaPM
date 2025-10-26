import React from 'react';

const CorporateAlerts = ({ projects, portfolioMetrics }) => {
  
  // Identificar proyectos críticos
  const criticalProjects = projects.filter(project => {
    // Aquí deberíamos tener las métricas EVM de cada proyecto
    // Por ahora, usamos criterios básicos
    const isOverdue = new Date(project.endDate) < new Date() && project.status !== 'completed';
    const isHighPriority = project.priority === 'high';
    return isOverdue || (isHighPriority && project.status === 'active');
  });

  // Proyectos con presupuesto alto
  const highBudgetProjects = projects.filter(project => 
    project.budget > portfolioMetrics.totalBudget * 0.3
  );

  // Proyectos próximos a vencer
  const upcomingDeadlines = projects.filter(project => {
    const daysToEnd = (new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysToEnd > 0 && daysToEnd <= 30 && project.status === 'active';
  });

  // Alertas del sistema
  const alerts = [];

  // Alerta de proyectos críticos
  if (criticalProjects.length > 0) {
    alerts.push({
      type: 'critical',
      title: 'Proyectos Críticos',
      message: `${criticalProjects.length} proyecto(s) requieren atención inmediata`,
      details: criticalProjects.map(p => p.name),
      icon: '🚨',
      color: 'red'
    });
  }

  // Alerta de presupuesto concentrado
  if (highBudgetProjects.length > 0) {
    alerts.push({
      type: 'budget',
      title: 'Concentración de Presupuesto',
      message: `${highBudgetProjects.length} proyecto(s) concentran >30% del presupuesto total`,
      details: highBudgetProjects.map(p => `${p.name}: $${(p.budget / 1000).toFixed(0)}K`),
      icon: '💰',
      color: 'yellow'
    });
  }

  // Alerta de deadlines próximos
  if (upcomingDeadlines.length > 0) {
    alerts.push({
      type: 'deadline',
      title: 'Deadlines Próximos',
      message: `${upcomingDeadlines.length} proyecto(s) terminan en los próximos 30 días`,
      details: upcomingDeadlines.map(p => {
        const days = Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return `${p.name}: ${days} días`;
      }),
      icon: '⏰',
      color: 'blue'
    });
  }

  // Alerta de capacidad del portfolio
  if (portfolioMetrics.activeProjects > 5) {
    alerts.push({
      type: 'capacity',
      title: 'Alta Carga de Proyectos',
      message: `${portfolioMetrics.activeProjects} proyectos activos pueden sobrecargar recursos`,
      details: ['Considerar priorización de proyectos', 'Evaluar capacidad de recursos'],
      icon: '⚡',
      color: 'purple'
    });
  }

  // Alerta de éxito
  if (portfolioMetrics.completedProjects > 0 && criticalProjects.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Portfolio Saludable',
      message: `${portfolioMetrics.completedProjects} proyecto(s) completado(s) sin alertas críticas`,
      details: ['Excelente gestión del portfolio', 'Continuar con las mejores prácticas'],
      icon: '✅',
      color: 'green'
    });
  }

  const getAlertColor = (color) => {
    switch(color) {
      case 'red': return 'bg-red-50 border-red-500 text-red-700';
      case 'yellow': return 'bg-yellow-50 border-yellow-500 text-yellow-700';
      case 'blue': return 'bg-blue-50 border-blue-500 text-blue-700';
      case 'purple': return 'bg-purple-50 border-purple-500 text-purple-700';
      case 'green': return 'bg-green-50 border-green-500 text-green-700';
      default: return 'bg-gray-50 border-gray-500 text-gray-700';
    }
  };

  const getIconColor = (color) => {
    switch(color) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'blue': return 'text-blue-500';
      case 'purple': return 'text-purple-500';
      case 'green': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">🔔 Alertas Corporativas</h3>
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">✅</div>
          <div>No hay alertas activas</div>
          <div className="text-sm mt-1">El portfolio está funcionando correctamente</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        🔔 Alertas Corporativas
        <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {alerts.filter(a => a.type === 'critical').length}
        </span>
      </h3>
      
      <div className="space-y-4">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`border-l-4 p-4 rounded-lg ${getAlertColor(alert.color)}`}
          >
            <div className="flex items-start">
              <span className={`text-xl mr-3 ${getIconColor(alert.color)}`}>
                {alert.icon}
              </span>
              <div className="flex-1">
                <div className="font-semibold mb-1">{alert.title}</div>
                <div className="text-sm mb-2">{alert.message}</div>
                
                {alert.details && alert.details.length > 0 && (
                  <div className="text-xs space-y-1">
                    {alert.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center">
                        <span className="w-2 h-2 bg-current rounded-full mr-2 opacity-50"></span>
                        {detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de alertas */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Resumen de Alertas:</span>
          <div className="flex space-x-4">
            <span className="text-red-600">
              🚨 {alerts.filter(a => a.type === 'critical').length} Críticas
            </span>
            <span className="text-yellow-600">
              ⚠️ {alerts.filter(a => a.color === 'yellow').length} Advertencias
            </span>
            <span className="text-blue-600">
              ℹ️ {alerts.filter(a => a.color === 'blue').length} Informativas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateAlerts;
