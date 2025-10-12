import React, { useState } from 'react';

const AlternativesPanel = ({ change, onUpdateAlternatives, currentUserPermissions, onSelectAlternative, canSelect }) => {
  // Helper para formatear números seguros
  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined || value === '') return '0';
    const num = parseFloat(value);
    return isNaN(num) ? '0' : num.toFixed(decimals);
  };

  const [alternatives, setAlternatives] = useState(
    change.alternatives || [
      { 
        id: 1, 
        name: 'No hacer nada (Status Quo)', 
        cost: 0, 
        schedule: 0, 
        pros: ['Sin costos adicionales', 'Sin retrasos'],
        cons: ['Problema sin resolver', 'Riesgo de escalamiento']
      },
      { 
        id: 2, 
        name: 'Implementar cambio completo', 
        cost: parseFloat(change.impactCost) || 0, 
        schedule: parseFloat(change.impactSchedule) || 0,
        pros: ['Solución completa', 'Satisface todos los requisitos'],
        cons: ['Costo elevado', 'Mayor tiempo de implementación']
      },
      { 
        id: 3, 
        name: 'Solución parcial / Iterativa', 
        cost: (parseFloat(change.impactCost) || 0) * 0.6, 
        schedule: (parseFloat(change.impactSchedule) || 0) * 0.5,
        pros: ['Menor impacto inicial', 'Más flexible'],
        cons: ['Solución incompleta', 'Puede requerir cambios futuros']
      }
    ]
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlt, setNewAlt] = useState({ name: '', cost: 0, schedule: 0, pros: '', cons: '' });

  // Verificar si el usuario puede SELECCIONAR alternativas
  const canSelectAlternative = () => {
    // Solo aprobadores pueden seleccionar alternativas
    if (!currentUserPermissions) return false;
    
    const userRole = currentUserPermissions.functionalRole;
    const requiredApprover = change.requiredApprover;
    
    // Si requiere CCB, solo miembros CCB pueden seleccionar
    if (requiredApprover === 'ccb' || requiredApprover === 'executive_board') {
      const ccbRoles = ['executive', 'sponsor', 'project_manager', 'finance_manager', 'quality_manager', 'technical_lead'];
      return ccbRoles.includes(userRole);
    }
    
    // Si requiere Sponsor, solo Sponsor o superior
    if (requiredApprover === 'sponsor') {
      return ['executive', 'sponsor'].includes(userRole);
    }
    
    // Si requiere PM, PM o superior
    if (requiredApprover === 'project_manager') {
      return ['executive', 'sponsor', 'project_manager'].includes(userRole);
    }
    
    return false;
  };

  // Verificar si el usuario puede EDITAR/AGREGAR alternativas
  const canEditAlternatives = () => {
    // PM, Technical Lead, y superiores pueden agregar/editar alternativas
    const userRole = currentUserPermissions?.functionalRole;
    return ['executive', 'sponsor', 'project_manager', 'technical_lead', 'pmo_assistant'].includes(userRole);
  };

  const handleAddAlternative = () => {
    const alt = {
      id: alternatives.length + 1,
      name: newAlt.name,
      cost: parseFloat(newAlt.cost) || 0,
      schedule: parseFloat(newAlt.schedule) || 0,
      pros: newAlt.pros.split('\n').filter(p => p.trim()),
      cons: newAlt.cons.split('\n').filter(c => c.trim()),
      selected: false
    };
    
    const updated = [...alternatives, alt];
    setAlternatives(updated);
    onUpdateAlternatives(updated);
    setNewAlt({ name: '', cost: 0, schedule: 0, pros: '', cons: '' });
    setShowAddForm(false);
  };

  const handleSelectAlternative = (index) => {
    if (onSelectAlternative) {
      onSelectAlternative(index);
    } else {
      // Fallback: actualizar localmente
      const updated = alternatives.map((alt, i) => ({
        ...alt,
        selected: i === index
      }));
      setAlternatives(updated);
      onUpdateAlternatives(updated);
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-2xl mr-2">🔄</span>
        Análisis de Alternativas
      </h3>
      
      <div className="space-y-4 mb-4">
        {alternatives.map((alt, index) => (
          <div key={alt.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-lg mb-1">
                  Opción {index + 1}: {alt.name}
                </div>
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span>💰 Costo: ${formatNumber(alt.cost)}K</span>
                  <span>📅 Tiempo: {formatNumber(alt.schedule, 0)} días</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                  <span className="mr-1">✅</span> Ventajas
                </div>
                <ul className="text-sm space-y-1 text-gray-700">
                  {alt.pros.map((pro, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                  <span className="mr-1">❌</span> Desventajas
                </div>
                <ul className="text-sm space-y-1 text-gray-700">
                  {alt.cons.map((con, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Botón de selección */}
            {canSelect && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {canSelectAlternative() ? (
                  <button
                    onClick={() => handleSelectAlternative(index)}
                    disabled={alt.selected}
                    className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      alt.selected
                        ? 'bg-green-100 text-green-800 cursor-default border-2 border-green-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {alt.selected ? '✅ Seleccionada' : '📌 Seleccionar esta alternativa'}
                  </button>
                ) : (
                  <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm text-center">
                    🔒 Solo los aprobadores pueden seleccionar alternativas
                  </div>
                )}
              </div>
            )}
            
            {/* Mostrar si ya está seleccionada */}
            {!canSelect && alt.selected && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm text-center font-medium border-2 border-green-300">
                  ✅ Esta es la alternativa seleccionada
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {canEditAlternatives() ? (
        !showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-700 font-medium"
          >
            ➕ Agregar Alternativa
          </button>
        ) : (
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
          <h4 className="font-semibold text-gray-800 mb-3">Nueva Alternativa</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre de la alternativa"
              value={newAlt.name}
              onChange={(e) => setNewAlt({...newAlt, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Costo (K)"
                value={newAlt.cost}
                onChange={(e) => setNewAlt({...newAlt, cost: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="number"
                placeholder="Tiempo (días)"
                value={newAlt.schedule}
                onChange={(e) => setNewAlt({...newAlt, schedule: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <textarea
              placeholder="Ventajas (una por línea)"
              value={newAlt.pros}
              onChange={(e) => setNewAlt({...newAlt, pros: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <textarea
              placeholder="Desventajas (una por línea)"
              value={newAlt.cons}
              onChange={(e) => setNewAlt({...newAlt, cons: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddAlternative}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Agregar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
        )
      ) : (
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
          <p className="text-sm text-gray-500 italic">
            🔒 Solo el equipo de proyecto puede agregar alternativas
          </p>
        </div>
      )}
      
      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-800 text-sm mb-1">
              Proceso de Alternativas
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Equipo de proyecto:</strong> Puede agregar y analizar alternativas</li>
              <li>• <strong>Aprobadores/CCB:</strong> Seleccionan cuál alternativa implementar</li>
              <li>• La alternativa seleccionada será la que se implemente si se aprueba el cambio</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlternativesPanel;
