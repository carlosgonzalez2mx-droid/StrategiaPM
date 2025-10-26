import React from 'react';
import { getIndicatorColor } from '../../utils/statusHelpers';
import { formatCurrency } from '../../utils/formatters';

const PMBOKIndicators = ({ 
  consolidatedCPI, 
  consolidatedSPI, 
  consolidatedVAC, 
  consolidatedEAC,
  tasksByProject 
}) => {
  const tasksCount = Object.values(tasksByProject || {}).flat().length;
  
  return (
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
            <strong>Fuente de datos:</strong> Calculado basado en {tasksCount} tareas del cronograma
            <span className="block text-sm mt-1">
              Los costos se estiman basándose en el campo "Costo" de cada tarea y su progreso actual.
            </span>
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
              {formatCurrency(consolidatedVAC)}
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
              {formatCurrency(consolidatedEAC)}
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
  );
};

export default PMBOKIndicators;
