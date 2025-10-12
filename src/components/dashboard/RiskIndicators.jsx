import React from 'react';

const RiskIndicators = ({ activeRisks, highPriorityRisks, mediumPriorityRisks, lowPriorityRisks }) => {
  return (
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
  );
};

export default RiskIndicators;
