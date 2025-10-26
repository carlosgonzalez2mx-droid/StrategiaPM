import React, { useState } from 'react';

/**
 * Diagrama de Flujo Interactivo del Control de Cambios
 * Muestra el proceso completo con roles y montos
 */
const ChangeFlowDiagram = () => {
  const [hoveredStep, setHoveredStep] = useState(null);
  const [selectedPath, setSelectedPath] = useState('all'); // 'all', 'small', 'medium', 'large'

  const steps = [
    {
      id: 1,
      title: 'Solicitar Cambio',
      icon: '📝',
      roles: ['Team Member', 'Coordinator', 'PMO Assistant'],
      description: 'Cualquier miembro del equipo puede solicitar un cambio',
      color: 'bg-blue-100 border-blue-300',
      textColor: 'text-blue-800'
    },
    {
      id: 2,
      title: 'Evaluar Impacto',
      icon: '📊',
      roles: ['Project Manager'],
      description: 'El PM evalúa costo, cronograma, alcance y calidad',
      color: 'bg-purple-100 border-purple-300',
      textColor: 'text-purple-800'
    }
  ];

  const paths = {
    small: {
      name: 'Cambio Pequeño',
      icon: '📗',
      monto: '$0 - $25,000',
      color: 'bg-green-100 border-green-300',
      textColor: 'text-green-800',
      steps: [
        {
          title: 'Aprobar/Rechazar',
          icon: '✅',
          roles: ['Project Manager'],
          description: 'El PM puede aprobar directamente',
          time: '1-2 días'
        },
        {
          title: 'Implementar',
          icon: '🚀',
          roles: ['Technical Lead', 'PM', 'Coordinator'],
          description: 'Se implementa el cambio aprobado',
          time: '2-3 días'
        }
      ]
    },
    medium: {
      name: 'Cambio Mediano',
      icon: '📙',
      monto: '$25,001 - $100,000',
      color: 'bg-yellow-100 border-yellow-300',
      textColor: 'text-yellow-800',
      steps: [
        {
          title: 'Escalar a Sponsor',
          icon: '⬆️',
          roles: ['Project Manager'],
          description: 'El PM escala por exceder su límite',
          time: '1 día'
        },
        {
          title: 'Aprobar/Rechazar',
          icon: '✅',
          roles: ['Sponsor'],
          description: 'El Sponsor revisa y decide',
          time: '2-3 días'
        },
        {
          title: 'Implementar',
          icon: '🚀',
          roles: ['Technical Lead', 'PM', 'Coordinator'],
          description: 'Se implementa el cambio aprobado',
          time: '2-3 días'
        }
      ]
    },
    large: {
      name: 'Cambio Grande',
      icon: '📕',
      monto: 'Más de $100,000',
      color: 'bg-red-100 border-red-300',
      textColor: 'text-red-800',
      steps: [
        {
          title: 'Escalar a CCB',
          icon: '⬆️',
          roles: ['Project Manager'],
          description: 'Requiere votación del Change Control Board',
          time: '1 día'
        },
        {
          title: 'Votación CCB',
          icon: '🗳️',
          roles: ['Executive', 'Sponsor', 'PM', 'Finance', 'Quality', 'Technical'],
          description: 'Miembros del CCB votan (Quorum: 60%, Mayoría: >50%)',
          time: '5-7 días'
        },
        {
          title: 'Implementar',
          icon: '🚀',
          roles: ['Technical Lead', 'PM', 'Coordinator'],
          description: 'Se implementa el cambio aprobado',
          time: '3-5 días'
        }
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              🔄 Flujo del Control de Cambios
            </h3>
            <p className="text-gray-600">
              Entiende cómo participan los roles funcionales en cada tipo de cambio
            </p>
          </div>
          
          {/* Filtro de rutas */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">Filtrar por tipo:</span>
            <button
              onClick={() => setSelectedPath('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPath === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPath('small')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPath === 'small'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              📗 Pequeños
            </button>
            <button
              onClick={() => setSelectedPath('medium')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPath === 'medium'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              📙 Medianos
            </button>
            <button
              onClick={() => setSelectedPath('large')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPath === 'large'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              📕 Grandes
            </button>
          </div>
        </div>

        {/* Leyenda de límites */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3">💰 Límites de Aprobación por Rol</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📗</span>
              <div>
                <div className="font-semibold text-green-800">$0 - $25,000</div>
                <div className="text-gray-600">📊 Project Manager</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📙</span>
              <div>
                <div className="font-semibold text-yellow-800">$25K - $100K</div>
                <div className="text-gray-600">🎯 Sponsor</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📕</span>
              <div>
                <div className="font-semibold text-red-800">&gt; $100,000</div>
                <div className="text-gray-600">👔 Executive / CCB</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pasos iniciales (comunes a todos) */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-4 text-lg">📋 Pasos Iniciales (Comunes a Todos los Cambios)</h3>
        <div className="grid grid-cols-2 gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
              className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${step.color} ${
                hoveredStep === step.id ? 'shadow-lg scale-[1.02] transform' : 'shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <div className={`font-bold text-lg ${step.textColor}`}>{step.title}</div>
                  <div className="text-xs text-gray-600">Paso {step.id}</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">{step.description}</p>
              <div className="flex flex-wrap gap-1">
                {step.roles.map((role, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-white/70 px-2 py-1 rounded-full font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decisión de ruta */}
      <div className="relative">
        <div className="flex items-center justify-center">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg px-8 py-5 border-2 border-gray-400 shadow-md">
            <div className="text-center">
              <div className="text-3xl mb-2">🤔</div>
              <div className="font-bold text-gray-800 text-lg">¿Cuánto cuesta el cambio?</div>
              <div className="text-sm text-gray-600 mt-1">Se evalúa el impacto económico</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center mt-6">
          <div className="flex space-x-16">
            <div className="text-center">
              <div className="w-1 h-16 bg-green-400 mx-auto rounded-full"></div>
              <div className="text-sm text-green-600 font-bold mt-2">↓ Pequeño</div>
            </div>
            <div className="text-center">
              <div className="w-1 h-16 bg-yellow-400 mx-auto rounded-full"></div>
              <div className="text-sm text-yellow-600 font-bold mt-2">↓ Mediano</div>
            </div>
            <div className="text-center">
              <div className="w-1 h-16 bg-red-400 mx-auto rounded-full"></div>
              <div className="text-sm text-red-600 font-bold mt-2">↓ Grande</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rutas por monto */}
      <div className="space-y-6">
        {Object.entries(paths).map(([key, path]) => {
          if (selectedPath !== 'all' && selectedPath !== key) return null;

          return (
            <div key={key}>
              <div className={`border-2 rounded-lg p-6 ${path.color} shadow-md`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{path.icon}</span>
                    <div>
                      <h3 className={`font-bold text-xl ${path.textColor}`}>
                        {path.name}
                      </h3>
                      <div className="text-sm text-gray-700 font-medium">{path.monto}</div>
                    </div>
                  </div>
                  <div className="bg-white/80 px-4 py-2 rounded-lg border border-gray-300">
                    <div className="text-xs text-gray-600">Tiempo estimado</div>
                    <div className="text-lg font-bold text-gray-800">
                      ⏱️ {
                        path.steps.reduce((acc, step) => {
                          const days = parseInt(step.time.split('-')[1]) || 1;
                          return acc + days;
                        }, 0)
                      } días
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {path.steps.map((step, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white rounded-lg p-5 border-2 border-gray-300 hover:shadow-xl hover:border-blue-400 transition-all transform hover:scale-105"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-3xl">{step.icon}</span>
                        <div className="font-bold text-gray-800 text-base">{step.title}</div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{step.description}</p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500">⏱️</span>
                          <span className="font-medium text-gray-700">{step.time}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {step.roles.map((role, roleIdx) => (
                            <span
                              key={roleIdx}
                              className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold border border-blue-200"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paso final (común a todos) */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-4 text-lg">🎯 Paso Final (Todos los Cambios)</h3>
        <div className="border-2 rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-4xl">📋</span>
            <div>
              <div className="font-bold text-green-800 text-xl">Actualizar Proyecto</div>
              <div className="text-sm text-gray-600">Paso Final - Cierre del Cambio</div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            El cambio implementado se refleja automáticamente en el proyecto: cronograma actualizado, presupuesto ajustado, alcance modificado y documentación generada.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-white/70 px-3 py-1 rounded-full font-medium border border-green-200">
              📊 Project Manager
            </span>
            <span className="text-xs bg-white/70 px-3 py-1 rounded-full font-medium border border-green-200">
              🤖 Sistema Automático
            </span>
          </div>
        </div>
      </div>

      {/* Notas importantes */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 shadow-md">
        <div className="flex items-start space-x-3">
          <span className="text-3xl">📌</span>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">Notas Importantes</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">🔔</span>
                <span><strong>Notificaciones automáticas:</strong> Se envían en cada cambio de estado a todos los involucrados</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">🗳️</span>
                <span><strong>CCB Quorum:</strong> Requiere al menos 60% de participación y mayoría simple (&gt;50%) para aprobar</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">💰</span>
                <span><strong>Límites acumulativos:</strong> Si un cambio afecta costo Y cronograma, se usa el límite más restrictivo</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">⭐</span>
                <span><strong>Roles especializados:</strong> Finance y Quality Managers participan en CCB con criterios específicos de validación</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">📊</span>
                <span><strong>Trazabilidad completa:</strong> Cada acción queda registrada en el historial de auditoría del cambio</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeFlowDiagram;
