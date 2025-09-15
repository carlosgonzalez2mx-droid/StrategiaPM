import React, { useState } from 'react';

const PortfolioSettings = ({ 
  projects, 
  portfolioMetrics, 
  onClose,
  exportPortfolio,
  importPortfolio,
  clearPortfolioData 
}) => {
  const [activeTab, setActiveTab] = useState('general');

  // Estadísticas del sistema
  const systemStats = {
    totalProjects: projects.length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
    totalReserves: projects.reduce((sum, p) => sum + p.contingencyReserve + p.managementReserve, 0),
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    dataSize: new Blob([JSON.stringify({ projects })]).size,
    lastUpdated: localStorage.getItem('mi-dashboard-portfolio') 
      ? JSON.parse(localStorage.getItem('mi-dashboard-portfolio')).lastUpdated 
      : 'N/A'
  };

  // Validaciones del sistema
  const systemValidations = [
    {
      check: 'Proyectos sin presupuesto',
      status: projects.filter(p => !p.budget || p.budget === 0).length === 0,
      count: projects.filter(p => !p.budget || p.budget === 0).length
    },
    {
      check: 'Proyectos sin fechas',
      status: projects.filter(p => !p.startDate || !p.endDate).length === 0,
      count: projects.filter(p => !p.startDate || !p.endDate).length
    },
    {
      check: 'Proyectos sin manager',
      status: projects.filter(p => !p.manager).length === 0,
      count: projects.filter(p => !p.manager).length
    },
    {
      check: 'Consistencia de datos',
      status: projects.every(p => p.id && p.name),
      count: projects.filter(p => !p.id || !p.name).length
    }
  ];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">⚙️ Configuración del Portfolio</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar de navegación */}
          <div className="w-48 bg-gray-50 border-r p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'general' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 General
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'data' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                💾 Datos
              </button>
              <button
                onClick={() => setActiveTab('validation')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'validation' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✅ Validación
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'export' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                📤 Exportar/Importar
              </button>
            </nav>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 p-6 overflow-y-auto">
            
            {/* Tab General */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Estadísticas del Portfolio</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemStats.totalProjects}
                    </div>
                    <div className="text-sm text-blue-600">Total Proyectos</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${(systemStats.totalBudget / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-green-600">Presupuesto Total</div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${(systemStats.totalReserves / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-purple-600">Reservas Totales</div>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">
                      {systemStats.activeProjects}
                    </div>
                    <div className="text-sm text-indigo-600">Proyectos Activos</div>
                  </div>
                  
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">
                      {systemStats.completedProjects}
                    </div>
                    <div className="text-sm text-emerald-600">Completados</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {formatBytes(systemStats.dataSize)}
                    </div>
                    <div className="text-sm text-gray-600">Tamaño de Datos</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Información del Sistema</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Última actualización: {systemStats.lastUpdated ? new Date(systemStats.lastUpdated).toLocaleString() : 'N/A'}</div>
                    <div>Versión: 1.0.0</div>
                    <div>Navegador: {navigator.userAgent.split(' ')[0]}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Datos */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Gestión de Datos</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-yellow-500 text-xl mr-3">⚠️</span>
                    <div>
                      <div className="font-semibold text-yellow-800">Importante</div>
                      <div className="text-sm text-yellow-700">
                        Los datos se almacenan localmente en tu navegador. 
                        Recomendamos hacer respaldos regulares.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Almacenamiento Local</h4>
                    <div className="text-sm text-gray-600 mb-3">
                      Tamaño actual: {formatBytes(systemStats.dataSize)}
                    </div>
                    <button
                      onClick={() => {
                        const data = localStorage.getItem('mi-dashboard-portfolio');
                        if (data) {
                          navigator.clipboard.writeText(data);
                          alert('Datos copiados al portapapeles');
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      📋 Copiar Datos Raw
                    </button>
                  </div>

                  <div className="border p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Limpieza de Datos</h4>
                    <div className="text-sm text-gray-600 mb-3">
                      Eliminar todos los datos almacenados localmente.
                    </div>
                    <button
                      onClick={clearPortfolioData}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      🗑️ Limpiar Todo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Validación */}
            {activeTab === 'validation' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Validación de Datos</h3>
                
                <div className="space-y-3">
                  {systemValidations.map((validation, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        validation.status 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`text-xl mr-3 ${
                          validation.status ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {validation.status ? '✅' : '❌'}
                        </span>
                        <div>
                          <div className={`font-semibold ${
                            validation.status ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {validation.check}
                          </div>
                          {!validation.status && (
                            <div className="text-sm text-red-600">
                              {validation.count} problema(s) encontrado(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-blue-500 text-xl mr-3">ℹ️</span>
                    <div>
                      <div className="font-semibold text-blue-800">Estado General</div>
                      <div className="text-sm text-blue-700">
                        {systemValidations.every(v => v.status) 
                          ? 'Todos los datos están correctos' 
                          : 'Se encontraron algunos problemas que requieren atención'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Exportar/Importar */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Exportar/Importar Portfolio</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">📥 Exportar</h4>
                    <div className="text-sm text-gray-600 mb-4">
                      Descargar todos los datos del portfolio en formato JSON.
                    </div>
                    <button
                      onClick={exportPortfolio}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      📥 Exportar Portfolio
                    </button>
                  </div>

                  <div className="border p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">📤 Importar</h4>
                    <div className="text-sm text-gray-600 mb-4">
                      Cargar datos de portfolio desde un archivo JSON.
                    </div>
                    <label className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer block text-center">
                      📤 Importar Portfolio
                      <input
                        type="file"
                        accept=".json"
                        onChange={importPortfolio}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-yellow-500 text-xl mr-3">⚠️</span>
                    <div>
                      <div className="font-semibold text-yellow-800 mb-1">Importante</div>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <div>• El archivo de exportación contiene todos los proyectos y configuraciones</div>
                        <div>• Al importar, se reemplazarán todos los datos actuales</div>
                        <div>• Recomendamos hacer una exportación antes de importar nuevos datos</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSettings;
