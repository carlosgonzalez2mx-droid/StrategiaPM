import React from 'react';

const AlternativeSelectionPanel = ({ change, onSelectAlternative }) => {
  // Helper para formatear números seguros
  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined || value === '') return '0';
    const num = parseFloat(value);
    return isNaN(num) ? '0' : num.toFixed(decimals);
  };

  if (!change.alternatives || change.alternatives.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          ⚠️ No hay alternativas registradas para este cambio.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
          <span className="text-2xl">🎯</span>
          <span>Seleccionar Alternativa a Implementar</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          El cambio ha sido aprobado. Selecciona cuál alternativa se implementará.
        </p>
      </div>

      <div className="space-y-4">
        {change.alternatives.map((alt, index) => (
          <div 
            key={alt.id || index}
            className={`bg-white rounded-lg p-6 border-2 transition-all ${
              change.selectedAlternative === index
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-lg mb-2">
                  Opción {index + 1}: {alt.name}
                </h4>
                <p className="text-gray-600 mb-4">{alt.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-500">💰 Costo:</span>
                    <div className="font-semibold text-gray-800">${formatNumber(alt.cost)}K</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">📅 Tiempo:</span>
                    <div className="font-semibold text-gray-800">{formatNumber(alt.schedule, 0)} días</div>
                  </div>
                </div>

                {alt.pros && alt.pros.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-green-700 mb-1">✅ Ventajas:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {alt.pros.map((pro, i) => (
                        <li key={i}>• {pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {alt.cons && alt.cons.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-red-700 mb-1">❌ Desventajas:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {alt.cons.map((con, i) => (
                        <li key={i}>• {con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => onSelectAlternative(index)}
                disabled={change.selectedAlternative === index}
                className={`ml-4 px-6 py-3 rounded-lg font-semibold transition-all ${
                  change.selectedAlternative === index
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg'
                }`}
              >
                {change.selectedAlternative === index ? '✅ Seleccionada' : '📌 Seleccionar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="flex-1">
            <h5 className="font-semibold text-blue-800 text-sm mb-1">
              Siguiente Paso
            </h5>
            <p className="text-xs text-blue-700">
              Una vez seleccionada la alternativa, el cambio pasará automáticamente a estado "Implementando" 
              y se podrá iniciar la ejecución del cambio aprobado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlternativeSelectionPanel;

