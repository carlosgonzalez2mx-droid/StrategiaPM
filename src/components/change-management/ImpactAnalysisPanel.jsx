import React from 'react';
import { calculateDetailedImpact } from '../../utils/changeHelpers';

const ImpactCard = ({ title, icon, value, color, details }) => (
  <div className={`bg-gradient-to-br ${color} rounded-lg p-4 border`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <div className="text-right">
        <div className="text-xs text-gray-600">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
    {details && (
      <div className="space-y-1 text-xs text-gray-700">
        {details.map((detail, i) => (
          <div key={i}>{detail}</div>
        ))}
      </div>
    )}
  </div>
);

const ImpactAnalysisPanel = ({ change, project }) => {
  const analysis = calculateDetailedImpact(change, project);
  
  const getImpactColor = (score) => {
    if (score < 20) return 'from-green-50 to-green-100 border-green-200';
    if (score < 40) return 'from-yellow-50 to-yellow-100 border-yellow-200';
    if (score < 60) return 'from-orange-50 to-orange-100 border-orange-200';
    return 'from-red-50 to-red-100 border-red-200';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-2xl mr-2">📊</span>
        Análisis de Impacto Detallado
      </h3>
      
      {/* Triple Restricción */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ImpactCard
          title="Impacto en Costo"
          icon="💰"
          value={`$${analysis.cost}K`}
          color="from-emerald-50 to-emerald-100 border-emerald-200"
          details={[
            `% del presupuesto: ${analysis.costPercentage}%`,
            `Presupuesto restante: $${analysis.remainingBudget}K`
          ]}
        />
        <ImpactCard
          title="Impacto en Tiempo"
          icon="📅"
          value={`${analysis.schedule} días`}
          color="from-blue-50 to-blue-100 border-blue-200"
          details={[
            `% de retraso: ${analysis.delayPercentage}%`,
            analysis.newEndDate ? `Nueva fecha: ${analysis.newEndDate}` : 'Sin cambio de fecha'
          ]}
        />
        <ImpactCard
          title="Impacto en Alcance"
          icon="📋"
          value={change.impactScope ? 'Alto' : 'Bajo'}
          color="from-purple-50 to-purple-100 border-purple-200"
          details={[
            `Entregables: ${analysis.affectedDeliverables}`,
            `Complejidad: ${analysis.complexity}`
          ]}
        />
      </div>
      
      {/* Otras Áreas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-semibold text-gray-700 mb-2">⭐ Impacto en Calidad</div>
          <div className="text-sm text-gray-600">{change.impactQuality || 'Sin impacto especificado'}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-semibold text-gray-700 mb-2">👥 Impacto en Recursos</div>
          <div className="text-sm text-gray-600">{change.impactResources || 'Sin impacto especificado'}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-semibold text-gray-700 mb-2">🛡️ Impacto en Riesgos</div>
          <div className="text-sm text-gray-600">{analysis.risks}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="font-semibold text-gray-700 mb-2">👔 Impacto en Stakeholders</div>
          <div className="text-sm text-gray-600">{analysis.stakeholders}</div>
        </div>
      </div>
      
      {/* Puntuación Total y Recomendación */}
      <div className={`rounded-lg p-4 border ${getImpactColor(analysis.totalImpactScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-gray-800">Puntuación de Impacto Total</div>
          <div className="text-3xl font-bold">{analysis.totalImpactScore}</div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            style={{ width: `${Math.min(100, analysis.totalImpactScore)}%` }}
          />
        </div>
      </div>
      
      {/* Recomendación del Sistema */}
      <div className={`mt-4 p-4 rounded-lg border ${
        analysis.recommendation === 'approve' 
          ? 'bg-green-50 border-green-200' 
          : analysis.recommendation === 'review'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start space-x-2">
          <span className="text-2xl">
            {analysis.recommendation === 'approve' ? '✅' : analysis.recommendation === 'review' ? '⚠️' : '❌'}
          </span>
          <div>
            <div className="font-bold text-gray-800 mb-1">Recomendación del Sistema</div>
            <div className="text-sm text-gray-700">{analysis.recommendationReason}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisPanel;
