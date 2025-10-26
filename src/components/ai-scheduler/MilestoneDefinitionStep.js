// =====================================================
// MILESTONE DEFINITION STEP COMPONENT
// Paso del wizard para definir hitos del proyecto
// =====================================================

import React, { useState, useEffect } from 'react';

const MilestoneDefinitionStep = ({ 
  wizardData, 
  onUpdate 
}) => {
  const [milestones, setMilestones] = useState([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Cargar hitos predefinidos basados en el tipo de proyecto
  useEffect(() => {
    const predefinedMilestones = getPredefinedMilestones(wizardData.projectType);
    setMilestones(predefinedMilestones);
  }, [wizardData.projectType]);

  // Actualizar wizardData cuando cambien los hitos
  useEffect(() => {
    onUpdate({ milestones });
  }, [milestones, onUpdate]);

  // Obtener hitos predefinidos por tipo de proyecto
  const getPredefinedMilestones = (projectType) => {
    const milestoneTemplates = {
      'construccion': [
        { id: 'milestone-1', name: 'HITO: Aprobación de planos', description: 'Aprobación final de planos arquitectónicos y estructurales' },
        { id: 'milestone-2', name: 'HITO: Inicio de obra', description: 'Inicio formal de la construcción' },
        { id: 'milestone-3', name: 'HITO: Estructura terminada', description: 'Completar estructura principal' },
        { id: 'milestone-4', name: 'HITO: Instalaciones completadas', description: 'Instalaciones eléctricas, hidráulicas y sanitarias' },
        { id: 'milestone-5', name: 'HITO: Obra terminada', description: 'Construcción completamente terminada' }
      ],
      'software': [
        { id: 'milestone-1', name: 'HITO: Análisis completado', description: 'Análisis de requisitos y diseño de sistema' },
        { id: 'milestone-2', name: 'HITO: Prototipo funcional', description: 'Primera versión funcional del software' },
        { id: 'milestone-3', name: 'HITO: Desarrollo terminado', description: 'Desarrollo completo de funcionalidades' },
        { id: 'milestone-4', name: 'HITO: Pruebas completadas', description: 'Testing y corrección de errores' },
        { id: 'milestone-5', name: 'HITO: Despliegue en producción', description: 'Lanzamiento oficial del software' }
      ],
      'manufactura': [
        { id: 'milestone-1', name: 'HITO: Diseño de producto', description: 'Diseño final del producto a manufacturar' },
        { id: 'milestone-2', name: 'HITO: Prototipo validado', description: 'Prototipo aprobado y validado' },
        { id: 'milestone-3', name: 'HITO: Línea de producción', description: 'Configuración de línea de producción' },
        { id: 'milestone-4', name: 'HITO: Producción piloto', description: 'Primera producción de prueba' },
        { id: 'milestone-5', name: 'HITO: Producción en masa', description: 'Inicio de producción comercial' }
      ],
      'general': [
        { id: 'milestone-1', name: 'HITO: Proyecto iniciado', description: 'Kickoff formal del proyecto' },
        { id: 'milestone-2', name: 'HITO: Planificación completada', description: 'Plan detallado del proyecto aprobado' },
        { id: 'milestone-3', name: 'HITO: Fase de ejecución', description: 'Inicio de la fase principal de ejecución' },
        { id: 'milestone-4', name: 'HITO: Entregables completados', description: 'Todos los entregables principales terminados' },
        { id: 'milestone-5', name: 'HITO: Proyecto cerrado', description: 'Cierre formal del proyecto' }
      ]
    };

    return milestoneTemplates[projectType] || milestoneTemplates.general;
  };

  // Agregar nuevo hito
  const addMilestone = () => {
    if (!newMilestone.trim()) return;

    const milestone = {
      id: `milestone-${Date.now()}`,
      name: newMilestone.trim(),
      description: '',
      isCustom: true
    };

    setMilestones(prev => [...prev, milestone]);
    setNewMilestone('');
    setShowAddForm(false);
  };

  // Eliminar hito
  const removeMilestone = (milestoneId) => {
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
  };

  // Editar hito
  const editMilestone = (milestoneId, field, value) => {
    setMilestones(prev => prev.map(m => 
      m.id === milestoneId ? { ...m, [field]: value } : m
    ));
  };

  // Reordenar hitos
  const reorderMilestones = (fromIndex, toIndex) => {
    setMilestones(prev => {
      const newMilestones = [...prev];
      const [moved] = newMilestones.splice(fromIndex, 1);
      newMilestones.splice(toIndex, 0, moved);
      return newMilestones;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="text-4xl mr-3">🎯</span>
          Definir hitos del proyecto
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          Los hitos son puntos clave en tu proyecto que marcan el progreso y la entrega de resultados importantes. 
          Hemos predefinido algunos hitos comunes para tu tipo de proyecto, pero puedes personalizarlos.
        </p>
      </div>

      {/* Lista de hitos */}
      <div className="space-y-4 mb-6">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">🎯</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={milestone.name}
                      onChange={(e) => editMilestone(milestone.id, 'name', e.target.value)}
                      className="w-full text-lg font-semibold text-gray-800 border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                      placeholder="Nombre del hito"
                    />
                  </div>
                </div>
                
                <textarea
                  value={milestone.description}
                  onChange={(e) => editMilestone(milestone.id, 'description', e.target.value)}
                  className="w-full text-gray-600 border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción del hito (opcional)"
                  rows={2}
                />
                
                {milestone.isCustom && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ✨ Personalizado
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {/* Botones de reordenar */}
                {index > 0 && (
                  <button
                    onClick={() => reorderMilestones(index, index - 1)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Mover hacia arriba"
                  >
                    ⬆️
                  </button>
                )}
                
                {index < milestones.length - 1 && (
                  <button
                    onClick={() => reorderMilestones(index, index + 1)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Mover hacia abajo"
                  >
                    ⬇️
                  </button>
                )}
                
                {/* Botón eliminar */}
                <button
                  onClick={() => removeMilestone(milestone.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="Eliminar hito"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar nuevo hito */}
      {showAddForm ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Agregar nuevo hito</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del nuevo hito"
              onKeyPress={(e) => e.key === 'Enter' && addMilestone()}
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={addMilestone}
                disabled={!newMilestone.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agregar hito
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewMilestone('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <span className="text-xl mr-2">➕</span>
          Agregar hito personalizado
        </button>
      )}

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
          <span className="mr-2">💡</span>
          Consejos para definir hitos
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Los hitos deben ser medibles y verificables</li>
          <li>• Deben representar entregables tangibles</li>
          <li>• Considera las dependencias entre hitos</li>
          <li>• Incluye hitos de aprobación y validación</li>
        </ul>
      </div>

      {/* Resumen */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Resumen de hitos</h4>
            <p className="text-gray-600 text-sm">
              {milestones.length} hitos definidos para el proyecto
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">{milestones.length}</div>
            <div className="text-sm text-gray-500">hitos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneDefinitionStep;
