import React, { useMemo } from 'react';
import { 
  calculateAvgProcessingTime, 
  getTopCategories, 
  calculateProcessEfficiency 
} from '../../utils/changeHelpers';

const MetricCard = ({ title, value, icon, description, trend }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between mb-2">
      <span className="text-3xl">{icon}</span>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
    <div className="text-sm font-medium text-gray-600 mb-1">{title}</div>
    {description && <div className="text-xs text-gray-500">{description}</div>}
  </div>
);

const ChangeMetricsDashboard = ({ changes }) => {
  const metrics = useMemo(() => {
    const totalChanges = changes.length;
    const approvedChanges = changes.filter(c => c.status === 'approved' || c.status === 'implemented').length;
    const approvalRate = totalChanges > 0 ? (approvedChanges / totalChanges) * 100 : 0;
    
    return {
      avgProcessingTime: calculateAvgProcessingTime(changes),
      approvalRate: approvalRate.toFixed(1),
      topCategories: getTopCategories(changes),
      efficiency: calculateProcessEfficiency(changes),
      totalChanges,
      pendingReview: changes.filter(c => c.status === 'underReview').length
    };
  }, [changes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Tiempo Promedio"
        value={`${metrics.avgProcessingTime} días`}
        icon="⏱️"
        description="De solicitud a decisión"
      />
      <MetricCard
        title="Tasa de Aprobación"
        value={`${metrics.approvalRate}%`}
        icon="✅"
        description="Cambios aprobados/total"
      />
      <MetricCard
        title="Eficiencia"
        value={`${metrics.efficiency}%`}
        icon="⚡"
        description="Implementados a tiempo"
      />
      <MetricCard
        title="En Revisión"
        value={metrics.pendingReview}
        icon="🔍"
        description="Requieren atención"
      />
    </div>
  );
};

export default ChangeMetricsDashboard;
