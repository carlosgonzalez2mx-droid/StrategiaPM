/**
 * SchedulePreview - Paso 3 del wizard: Vista Previa del Cronograma
 * StrategiaPM - MVP Implementation
 */

import React, { useState } from 'react';

const SchedulePreview = ({ wizardData, generatedSchedule, isGenerating, onGenerate }) => {
  const [selectedView, setSelectedView] = useState('overview');
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Debug logging
  console.log('🔍 SchedulePreview props:', {
    wizardData,
    generatedSchedule: generatedSchedule ? 'Presente' : 'Ausente',
    isGenerating,
    hasOnGenerate: !!onGenerate
  });

  // Generar cronograma si no existe
  const handleGenerate = () => {
    if (!generatedSchedule && !isGenerating) {
      onGenerate();
    }
  };

  // Formatear duración en días
  const formatDuration = (days) => {
    if (days < 7) return `${days} días`;
    if (days < 30) return `${Math.round(days / 7)} semanas`;
    return `${Math.round(days / 30)} meses`;
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Calcular estadísticas del cronograma
  const calculateStats = (schedule) => {
    if (!schedule) return null;

    const activities = schedule.activities || [];
    const milestones = schedule.milestones || [];
    
    const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
    const highPriorityActivities = activities.filter(a => a.priority === 'high').length;
    const criticalPathActivities = schedule.criticalPath?.length || 0;
    
    return {
      totalActivities: activities.length,
      totalMilestones: milestones.length,
      totalDuration: totalDuration,
      highPriorityActivities: highPriorityActivities,
      criticalPathActivities: criticalPathActivities,
      averageActivityDuration: activities.length > 0 ? Math.round(totalDuration / activities.length) : 0
    };
  };

  const stats = calculateStats(generatedSchedule);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          📊 Vista Previa del Cronograma
        </h3>
        <p className="text-gray-600">
          Revisa el cronograma generado por IA antes de aplicarlo a tu proyecto
        </p>
      </div>

      {/* Botón de Generación */}
      {!generatedSchedule && !isGenerating && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h4 className="text-xl font-semibold text-gray-800 mb-2">
            ¡Listo para Generar tu Cronograma!
          </h4>
          <p className="text-gray-600 mb-6">
            Con la información proporcionada, nuestro asistente de IA generará un cronograma optimizado para tu proyecto.
          </p>
          <button
            onClick={handleGenerate}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            🚀 Generar Cronograma con IA
          </button>
        </div>
      )}

      {/* Estado de Generación */}
      {isGenerating && (
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <div className="animate-spin text-6xl mb-4">🤖</div>
          <h4 className="text-xl font-semibold text-gray-800 mb-2">
            Generando Cronograma...
          </h4>
          <p className="text-gray-600 mb-4">
            Nuestro asistente de IA está analizando tu proyecto y generando el cronograma más apropiado.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-bounce w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="animate-bounce w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.1s' }}></div>
            <div className="animate-bounce w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}

      {/* Cronograma Generado */}
      {generatedSchedule && (
        <>
          {/* Información del Proyecto */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <span className="text-xl mr-2">📋</span>
              Información del Proyecto
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Proyecto</label>
                <p className="text-gray-900 font-semibold">{wizardData.projectName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <p className="text-gray-900">{wizardData.projectType}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Metodología</label>
                <p className="text-gray-900">{wizardData.methodology}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Equipo</label>
                <p className="text-gray-900">{wizardData.teamSize} personas</p>
              </div>
            </div>
          </div>

          {/* Estadísticas del Cronograma */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalActivities}</div>
                <div className="text-sm text-gray-600">Actividades</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalMilestones}</div>
                <div className="text-sm text-gray-600">Hitos</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{formatDuration(stats.totalDuration)}</div>
                <div className="text-sm text-gray-600">Duración Total</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.criticalPathActivities}</div>
                <div className="text-sm text-gray-600">Ruta Crítica</div>
              </div>
            </div>
          )}

          {/* Navegación de Vistas */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex border-b border-gray-200">
              {[
                { id: 'overview', label: 'Resumen', icon: '📊' },
                { id: 'activities', label: 'Actividades', icon: '📋' },
                { id: 'milestones', label: 'Hitos', icon: '🎯' },
                { id: 'timeline', label: 'Cronograma', icon: '📅' }
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    selectedView === view.id
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{view.icon}</span>
                  {view.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Vista de Resumen */}
              {selectedView === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h5 className="font-semibold text-gray-800 mb-3">Resumen del Cronograma</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h6 className="font-semibold text-gray-700 mb-2">Duración del Proyecto</h6>
                        <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
                        <p className="text-sm text-gray-600">
                          {stats.averageActivityDuration} días promedio por actividad
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h6 className="font-semibold text-gray-700 mb-2">Complejidad</h6>
                        <p className="text-2xl font-bold text-gray-900 capitalize">
                          {generatedSchedule.metadata?.complexity || 'medium'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {stats.highPriorityActivities} actividades de alta prioridad
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-800 mb-3">Template Utilizado</h5>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="font-semibold text-blue-800">
                        {generatedSchedule.metadata?.templateUsed || 'Template Genérico de Proyecto'}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        Generado el {formatDate(generatedSchedule.metadata?.generatedAt)}
                      </p>
                      {!generatedSchedule.metadata?.templateUsed && (
                        <p className="text-xs text-blue-500 mt-2">
                          ℹ️ Se utilizó un template genérico basado en mejores prácticas
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Vista de Actividades */}
              {selectedView === 'activities' && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-4">Actividades Generadas ({generatedSchedule.activities?.length || 0})</h5>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {generatedSchedule.activities?.map((activity, index) => (
                      <div key={activity.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h6 className="font-semibold text-gray-800">{activity.name}</h6>
                            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>⏱️ {activity.duration} días</span>
                              <span>📂 {activity.category}</span>
                              <span>🎯 {activity.priority}</span>
                              <span>👤 {activity.assignedTo}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              activity.priority === 'high' ? 'bg-red-100 text-red-800' :
                              activity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {activity.priority}
                            </div>
                            {activity.confidence && (
                              <div className="text-xs text-gray-500 mt-1">
                                Confianza: {Math.round(activity.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista de Hitos */}
              {selectedView === 'milestones' && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-4">Hitos Generados ({generatedSchedule.milestones?.length || 0})</h5>
                  <div className="space-y-3">
                    {generatedSchedule.milestones?.map((milestone, index) => (
                      <div key={milestone.id} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">🎯</span>
                          <div className="flex-1">
                            <h6 className="font-semibold text-gray-800">{milestone.name}</h6>
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>📂 {milestone.phase}</span>
                              <span>👤 {milestone.assignedTo}</span>
                            </div>
                            {milestone.criteria && (
                              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs text-gray-600">
                                  <strong>Criterio:</strong> {milestone.criteria}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista de Cronograma */}
              {selectedView === 'timeline' && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-4">Cronograma Temporal</h5>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-center">
                      📅 Vista de cronograma temporal disponible después de aplicar el cronograma
                    </p>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      Una vez aplicado, podrás ver el cronograma completo en la vista Gantt
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recomendaciones */}
          {generatedSchedule.recommendations && generatedSchedule.recommendations.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="text-xl mr-2">💡</span>
                  Recomendaciones de IA
                </h4>
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {showRecommendations ? '👁️‍🗨️ Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
              
              {showRecommendations && (
                <div className="space-y-3">
                  {generatedSchedule.recommendations.map((recommendation, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      recommendation.priority === 'high' ? 'border-red-500 bg-red-50' :
                      recommendation.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="flex items-start">
                        <span className="text-lg mr-3">
                          {recommendation.priority === 'high' ? '⚠️' :
                           recommendation.priority === 'medium' ? '💡' : '✅'}
                        </span>
                        <div>
                          <h6 className="font-semibold text-gray-800">{recommendation.title}</h6>
                          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
                          {recommendation.action && (
                            <p className="text-sm text-gray-700 mt-2 font-medium">
                              <strong>Acción sugerida:</strong> {recommendation.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Información de Confianza */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🤖</span>
              <div>
                <h6 className="font-semibold text-blue-800">Generado por Asistente de IA</h6>
                <p className="text-sm text-blue-600">
                  Este cronograma fue generado automáticamente basándose en las mejores prácticas y patrones de proyectos similares.
                  Puedes modificarlo después de aplicarlo a tu proyecto.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SchedulePreview;
