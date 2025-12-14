import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { cn } from '../lib/utils';

const CorporateAlerts = ({ projects, portfolioMetrics = {} }) => {

  // Identificar proyectos críticos
  const criticalProjects = projects.filter(project => {
    // Aquí deberíamos tener las métricas EVM de cada proyecto
    // Por ahora, usamos criterios básicos
    const isOverdue = new Date(project.endDate) < new Date() && project.status !== 'completed';
    const isHighPriority = project.priority === 'high';
    return isOverdue || (isHighPriority && project.status === 'active');
  });

  // Proyectos con presupuesto alto
  const highBudgetProjects = projects.filter(project => {
    // Verificar que portfolioMetrics.totalBudget exista y sea válido
    if (!portfolioMetrics?.totalBudget || portfolioMetrics.totalBudget <= 0) {
      return false; // No mostrar alertas si no hay presupuesto total
    }
    return project.budget > portfolioMetrics.totalBudget * 0.3;
  });

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

  // Alerta de éxito
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
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      case 'yellow': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'purple': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'green': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      default: return 'bg-slate-50 border-slate-200 text-slate-800';
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
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          <div className="text-4xl mb-3 opacity-30">✅</div>
          <p className="font-medium text-slate-700">No hay alertas activas</p>
          <p className="text-sm mt-1">El portfolio está funcionando correctamente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="flex items-center text-lg">
          🔔 Alertas Corporativas
          <span className="ml-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {alerts.filter(a => a.type === 'critical').length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={cn("border rounded-lg p-4 transition-all hover:shadow-sm", getAlertColor(alert.color))}
          >
            <div className="flex items-start gap-4">
              <span className={cn("text-2xl mt-0.5", getIconColor(alert.color))}>
                {alert.icon}
              </span>
              <div className="flex-1">
                <div className="font-semibold mb-1">{alert.title}</div>
                <div className="text-sm mb-3 opacity-90">{alert.message}</div>

                {alert.details && alert.details.length > 0 && (
                  <div className="text-xs space-y-1.5 opacity-80">
                    {alert.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
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
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Resumen de Alertas:</span>
          <div className="flex gap-4">
            <span className="text-red-600 font-medium">
              🚨 {alerts.filter(a => a.type === 'critical').length} Críticas
            </span>
            <span className="text-amber-600 font-medium">
              ⚠️ {alerts.filter(a => a.color === 'yellow').length} Advertencias
            </span>
            <span className="text-blue-600 font-medium">
              ℹ️ {alerts.filter(a => a.color === 'blue').length} Informativas
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CorporateAlerts;
