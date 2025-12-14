import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { cn } from '../lib/utils';

const CorporateAlerts = ({ projects, portfolioMetrics = {} }) => {

  const criticalProjects = projects.filter(project => {
    const isOverdue = new Date(project.endDate) < new Date() && project.status !== 'completed';
    const isHighPriority = project.priority === 'high';
    return isOverdue || (isHighPriority && project.status === 'active');
  });

  const highBudgetProjects = projects.filter(project => {
    if (!portfolioMetrics?.totalBudget || portfolioMetrics.totalBudget <= 0) {
      return false;
    }
    return project.budget > portfolioMetrics.totalBudget * 0.3;
  });

  const upcomingDeadlines = projects.filter(project => {
    const daysToEnd = (new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysToEnd > 0 && daysToEnd <= 30 && project.status === 'active';
  });

  const alerts = [];

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

  if (portfolioMetrics?.activeProjects > 5) {
    alerts.push({
      type: 'capacity',
      title: 'Alta Carga de Proyectos',
      message: `${portfolioMetrics.activeProjects} proyectos activos pueden sobrecargar recursos`,
      details: ['Considerar priorización de proyectos', 'Evaluar capacidad de recursos'],
      icon: '⚡',
      color: 'purple'
    });
  }

  if (portfolioMetrics?.completedProjects > 0 && criticalProjects.length === 0) {
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
    switch (color) {
      case 'red': return 'from-red-500 to-pink-600';
      case 'yellow': return 'from-amber-500 to-orange-600';
      case 'blue': return 'from-blue-500 to-indigo-600';
      case 'purple': return 'from-purple-500 to-pink-600';
      case 'green': return 'from-emerald-500 to-green-600';
      default: return 'from-slate-400 to-slate-600';
    }
  };

  const getIconColor = (color) => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'yellow': return 'text-amber-600';
      case 'blue': return 'text-blue-600';
      case 'purple': return 'text-purple-600';
      case 'green': return 'text-emerald-600';
      default: return 'text-slate-600';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="shadow-xl border-2 border-emerald-100">
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-4 opacity-30">✅</div>
          <p className="font-bold text-xl text-slate-700">No hay alertas activas</p>
          <p className="text-sm mt-2 text-slate-500">El portfolio está funcionando correctamente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-2 border-red-100">
      <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-red-100">
        <CardTitle className="flex items-center text-lg text-red-900">
          🔔 Alertas Corporativas
          <span className="ml-3 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            {alerts.filter(a => a.type === 'critical').length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={cn("border-2 rounded-2xl p-6 transition-all hover:shadow-xl relative overflow-hidden",
              alert.color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50' :
                alert.color === 'yellow' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50' :
                  alert.color === 'blue' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50' :
                    alert.color === 'purple' ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50' :
                      alert.color === 'green' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50' :
                        'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100'
            )}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10 flex items-start gap-4">
              <span className={cn("text-4xl mt-1", getIconColor(alert.color))}>
                {alert.icon}
              </span>
              <div className="flex-1">
                <div className="font-bold text-lg mb-2 text-slate-900">{alert.title}</div>
                <div className="text-sm mb-3 text-slate-700 font-medium">{alert.message}</div>

                {alert.details && alert.details.length > 0 && (
                  <div className="text-xs space-y-2 text-slate-600">
                    {alert.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2">
                        <span className="w-2 h-2 bg-current rounded-full"></span>
                        {detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Resumen de alertas */}
        <div className="mt-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-700">Resumen de Alertas:</span>
            <div className="flex gap-6">
              <span className="text-red-600 font-bold flex items-center gap-1">
                🚨 {alerts.filter(a => a.type === 'critical').length} Críticas
              </span>
              <span className="text-amber-600 font-bold flex items-center gap-1">
                ⚠️ {alerts.filter(a => a.color === 'yellow').length} Advertencias
              </span>
              <span className="text-blue-600 font-bold flex items-center gap-1">
                ℹ️ {alerts.filter(a => a.color === 'blue').length} Informativas
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CorporateAlerts;
