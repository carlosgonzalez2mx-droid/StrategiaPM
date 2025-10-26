import React, { useState } from 'react';

const ProjectSelector = ({ 
  projects, 
  currentProjectId, 
  setCurrentProjectId,
  createProject,
  setViewMode 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentProject = projects.find(p => p.id === currentProjectId);
  
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      {/* Selector Principal */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="text-lg">📁</span>
          <span className="font-medium text-gray-700">
            {currentProject ? currentProject.name : 'Seleccionar Proyecto'}
          </span>
          <span className="text-gray-400">▼</span>
        </button>

        <button
          onClick={() => setViewMode('portfolio')}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>🏢</span>
          <span>Portfolio</span>
        </button>

        <button
          onClick={() => createProject()}
          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Nuevo</span>
        </button>
      </div>

      {/* Dropdown de Proyectos */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Buscar proyectos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Lista de proyectos */}
          <div className="max-h-64 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos disponibles'}
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                    currentProjectId === project.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-transparent'
                  }`}
                  onClick={() => {
                    setCurrentProjectId(project.id);
                    setShowDropdown(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                        <span className="text-gray-500">{getStatusIcon(project.status)}</span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-1">
                        {project.description}
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span>👤 {project.manager}</span>
                        <span>💰 ${(project.budget / 1000).toFixed(0)}K</span>
                        <span>📅 {project.startDate} - {project.endDate}</span>
                      </div>
                    </div>
                    
                    {currentProjectId === project.id && (
                      <div className="text-blue-500 text-lg">✓</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Información del proyecto actual */}
          {currentProject && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Proyecto Actual:</div>
              <div className="font-medium text-gray-900">{currentProject.name}</div>
              <div className="text-xs text-gray-500">
                {currentProject.manager} • ${(currentProject.budget / 1000).toFixed(0)}K
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default ProjectSelector;
