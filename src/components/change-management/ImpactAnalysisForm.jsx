import React, { useState } from 'react';

const ImpactAnalysisForm = ({ change, onComplete, onUpdateAlternatives }) => {
  // Helper para formatear números seguros
  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined || value === '') return '0';
    const num = parseFloat(value);
    return isNaN(num) ? '0' : num.toFixed(decimals);
  };

  const [analysis, setAnalysis] = useState({
    costDetails: change.impactCost || '',
    scheduleDetails: change.impactSchedule || '',
    scopeDetails: change.impactScope || '',
    qualityDetails: change.impactQuality || '',
    resourcesDetails: change.impactResources || ''
  });

  const [alternatives, setAlternatives] = useState(change.alternatives || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlternative, setNewAlternative] = useState({
    name: '',
    description: '',
    cost: '',
    schedule: '',
    pros: [''],
    cons: ['']
  });

  const isComplete = () => {
    const hasAllDetails = 
      analysis.costDetails &&
      analysis.scheduleDetails &&
      analysis.scopeDetails &&
      analysis.qualityDetails &&
      analysis.resourcesDetails;
    
    const hasEnoughAlternatives = alternatives.length >= 3;
    
    return hasAllDetails && hasEnoughAlternatives;
  };

  const handleAddAlternative = () => {
    if (!newAlternative.name || !newAlternative.description) {
      alert('❌ Completa nombre y descripción de la alternativa');
      return;
    }

    const alt = {
      ...newAlternative,
      id: `alt-${Date.now()}`,
      addedAt: new Date().toISOString()
    };

    const updatedAlternatives = [...alternatives, alt];
    setAlternatives(updatedAlternatives);
    onUpdateAlternatives(updatedAlternatives);

    setNewAlternative({
      name: '',
      description: '',
      cost: '',
      schedule: '',
      pros: [''],
      cons: ['']
    });
    setShowAddForm(false);
  };

  return (
    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center space-x-2">
            <span className="text-2xl">📊</span>
            <span>Análisis de Impacto Completo</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Completa todas las secciones y agrega mínimo 3 alternativas
          </p>
        </div>
        
        {isComplete() ? (
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-lg animate-pulse"
          >
            ✅ Completar Análisis
          </button>
        ) : (
          <div className="text-sm text-gray-500 text-right">
            <div className="font-semibold">Pendiente:</div>
            <div>{alternatives.length}/3 alternativas</div>
          </div>
        )}
      </div>

      {/* Análisis de 5 áreas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Impacto en Costos (Detalle)
          </label>
          <textarea
            value={analysis.costDetails}
            onChange={(e) => setAnalysis({...analysis, costDetails: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Describe el impacto detallado en costos..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Impacto en Cronograma (Detalle)
          </label>
          <textarea
            value={analysis.scheduleDetails}
            onChange={(e) => setAnalysis({...analysis, scheduleDetails: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Describe el impacto detallado en cronograma..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📋 Impacto en Alcance (Detalle)
          </label>
          <textarea
            value={analysis.scopeDetails}
            onChange={(e) => setAnalysis({...analysis, scopeDetails: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Describe el impacto detallado en alcance..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⭐ Impacto en Calidad (Detalle)
          </label>
          <textarea
            value={analysis.qualityDetails}
            onChange={(e) => setAnalysis({...analysis, qualityDetails: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Describe el impacto detallado en calidad..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            👥 Impacto en Recursos (Detalle)
          </label>
          <textarea
            value={analysis.resourcesDetails}
            onChange={(e) => setAnalysis({...analysis, resourcesDetails: e.target.value})}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            placeholder="Describe el impacto detallado en recursos humanos y materiales..."
          />
        </div>
      </div>

      {/* Alternativas */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800">
            🔄 Alternativas ({alternatives.length}/3 mínimo)
          </h4>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            ➕ Agregar Alternativa
          </button>
        </div>

        {/* Lista de alternativas */}
        <div className="space-y-4">
          {alternatives.map((alt, index) => (
            <div key={alt.id || index} className="bg-white rounded-lg p-4 border border-gray-200">
              <h5 className="font-semibold text-gray-800 mb-2">
                Opción {index + 1}: {alt.name}
              </h5>
              <p className="text-sm text-gray-600 mb-3">{alt.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">💰 Costo:</span>
                  <div className="font-medium">${formatNumber(alt.cost)}K</div>
                </div>
                <div>
                  <span className="text-gray-500">📅 Tiempo:</span>
                  <div className="font-medium">{formatNumber(alt.schedule, 0)} días</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario agregar alternativa */}
        {showAddForm && (
          <div className="mt-4 bg-white rounded-lg p-6 border-2 border-blue-300">
            <h5 className="font-semibold text-gray-800 mb-4">Nueva Alternativa</h5>
            <div className="space-y-4">
              <input
                type="text"
                value={newAlternative.name}
                onChange={(e) => setNewAlternative({...newAlternative, name: e.target.value})}
                placeholder="Nombre de la alternativa"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <textarea
                value={newAlternative.description}
                onChange={(e) => setNewAlternative({...newAlternative, description: e.target.value})}
                placeholder="Descripción detallada"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={newAlternative.cost}
                  onChange={(e) => setNewAlternative({...newAlternative, cost: e.target.value})}
                  placeholder="Costo (K)"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={newAlternative.schedule}
                  onChange={(e) => setNewAlternative({...newAlternative, schedule: e.target.value})}
                  placeholder="Tiempo (días)"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleAddAlternative}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✅ Agregar
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-lg">💡</span>
          <div className="flex-1">
            <h5 className="font-semibold text-yellow-800 text-sm mb-1">
              Requerimientos del Análisis
            </h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Completa el análisis detallado de las 5 áreas de impacto</li>
              <li>• Agrega mínimo 3 alternativas (incluyendo "No hacer nada" si aplica)</li>
              <li>• Una vez completo, el botón "Completar Análisis" se habilitará</li>
              <li>• El cambio pasará a estado "Listo para Revisión"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisForm;

