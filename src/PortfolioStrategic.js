import React, { useState } from 'react';

// Componente helper para mostrar errores
const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return (
    <div className="text-red-600 text-xs mt-1 flex items-center">
      <span className="mr-1">⚠️</span>
      {error}
    </div>
  );
};

const PortfolioStrategic = ({ 
  projects, 
  setProjects,
  currentProjectId, 
  setCurrentProjectId,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject 
}) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [errors, setErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  // Debug: mostrar errores en consola cuando cambien
  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('❌ Errores de validación:', errors);
    }
  }, [errors]);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Helper function para clonar editingProject con una propiedad actualizada
  const updateEditingProject = (property, value) => {
    setEditingProject({
      id: editingProject.id,
      name: editingProject.name,
      description: editingProject.description,
      startDate: editingProject.startDate,
      endDate: editingProject.endDate,
      budget: editingProject.budget,
      status: editingProject.status,
      priority: editingProject.priority,
      manager: editingProject.manager,
      team: editingProject.team,
      createdAt: editingProject.createdAt,
      updatedAt: editingProject.updatedAt,
      version: editingProject.version,
      progress: editingProject.progress,
      sponsor: editingProject.sponsor,
      irr: editingProject.irr,
      objective: editingProject.objective,
      businessCase: editingProject.businessCase,
      [property]: value
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-600 border-gray-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'archived': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🟢';
      case 'inactive': return '⚫';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      case 'archived': return '📁';
      default: return '⏸️';
    }
  };

  const validateField = (field, value) => {
    const newErrors = Object.assign({}, errors);
    
    switch (field) {
      case 'name':
        if (!value || value.trim() === '') {
          newErrors.name = 'El nombre del proyecto es obligatorio';
        } else if (value.length < 3) {
          newErrors.name = 'El nombre debe tener al menos 3 caracteres';
        } else {
          delete newErrors.name;
        }
        break;
        
      case 'manager':
        if (!value || value.trim() === '') {
          newErrors.manager = 'El manager es obligatorio';
        } else {
          delete newErrors.manager;
        }
        break;
        
      case 'sponsor':
        if (!value || value.trim() === '') {
          newErrors.sponsor = 'El sponsor es obligatorio';
        } else {
          delete newErrors.sponsor;
        }
        break;
        
      case 'startDate':
        if (!value) {
          newErrors.startDate = 'La fecha de inicio es obligatoria';
        } else {
          delete newErrors.startDate;
        }
        break;
        
      case 'endDate':
        if (!value) {
          newErrors.endDate = 'La fecha de fin es obligatoria';
        } else if (editingProject?.startDate && new Date(value) <= new Date(editingProject.startDate)) {
          newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
        } else {
          delete newErrors.endDate;
        }
        break;
        
      case 'budget':
        if (value === '' || isNaN(value)) {
          newErrors.budget = 'El presupuesto debe ser un número válido';
        } else if (!value || value <= 0) {
          newErrors.budget = 'El presupuesto debe ser mayor a 0';
        } else if (value > 1000000000) {
          newErrors.budget = 'El presupuesto no puede exceder 1,000,000,000';
        } else {
          delete newErrors.budget;
        }
        break;
        
      case 'irr':
        if (value === '' || isNaN(value)) {
          newErrors.irr = 'La TIR debe ser un número válido';
        } else if (value < 0 || value > 100) {
          newErrors.irr = 'La TIR debe estar entre 0% y 100%';
        } else {
          delete newErrors.irr;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditProject = (project) => {
    console.log('🔄 Editando proyecto:', project);
    console.log('🔄 Estado antes de editar - showNewProjectModal:', showNewProjectModal);
    console.log('🔄 Estado antes de editar - editingProject:', editingProject);
    
    setEditingProject(Object.assign({}, project));
    setErrors({});
    setShowNewProjectModal(true);
    
    console.log('🔄 Estado después de editar - showNewProjectModal:', true);
    console.log('🔄 Estado después de editar - editingProject:', Object.assign({}, project));
  };

  const handleSaveProject = () => {
    console.log('💾 Guardando proyecto:', editingProject);
    
    // Validar todos los campos antes de guardar
    const isNameValid = validateField('name', editingProject.name);
    const isManagerValid = validateField('manager', editingProject.manager);
    const isSponsorValid = validateField('sponsor', editingProject.sponsor);
    const isStartDateValid = validateField('startDate', editingProject.startDate);
    const isEndDateValid = validateField('endDate', editingProject.endDate);
    const isBudgetValid = validateField('budget', editingProject.budget);
    const isIRRValid = validateField('irr', editingProject.irr);

    console.log('✅ Validaciones:', { isNameValid, isManagerValid, isSponsorValid, isStartDateValid, isEndDateValid, isBudgetValid, isIRRValid });

    // Si hay errores, no guardar
    if (!isNameValid || !isManagerValid || !isSponsorValid || 
        !isStartDateValid || !isEndDateValid || !isBudgetValid || !isIRRValid) {
      console.log('❌ Errores de validación:', errors);
      return;
    }

    if (editingProject.id) {
      console.log('🔄 Actualizando proyecto existente');
      updateProject(editingProject.id, editingProject);
    } else {
      console.log('➕ Creando nuevo proyecto');
      createProject(editingProject);
    }
    setShowNewProjectModal(false);
    setEditingProject(null);
    setErrors({});
  };

  const handleNewProject = () => {
    setEditingProject({
      id: '',
      name: '',
      description: '',
      status: 'inactive',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget: 100000,
      contingencyReserve: 10000,
      managementReserve: 5000,
      manager: '',
      sponsor: '',
      objective: '',
      businessCase: '',
      irr: 0,
      roi: 0,
      kickoffDate: '',
      stakeholders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    });
    setErrors({});
    setShowNewProjectModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header del Portfolio */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏢 Portfolio de Proyectos</h1>
            <p className="text-blue-100 text-lg">
              Gestión estratégica y configuración de proyectos
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Vista General', icon: '📊' },
              { id: 'projects', name: 'Lista de Proyectos', icon: '📋' },
              { id: 'metrics', name: 'Métricas del Portfolio', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Vista General */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">📊</span>
                    <h3 className="text-lg font-semibold text-blue-800">Total Proyectos</h3>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{projects.length}</div>
                  <div className="text-sm text-blue-600">
                    {projects.filter(p => p.status === 'active').length} activos
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">💰</span>
                    <h3 className="text-lg font-semibold text-green-800">Presupuesto Total</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${(projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.budget, 0) / 1000).toFixed(0)}K USD
                  </div>
                  <div className="text-sm text-green-600">
                    Solo proyectos activos
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">🎯</span>
                    <h3 className="text-lg font-semibold text-purple-800">Proyectos Prioritarios</h3>
                  </div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {projects.filter(p => p.priority === 'high' && p.status === 'active').length}
                  </div>
                  <div className="text-sm text-purple-600">
                    Prioridad alta (activos)
                  </div>
                </div>
              </div>

              {/* Proyecto Destacado */}
              {currentProject && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Proyecto Destacado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Información General</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Nombre:</span> {currentProject.name}</div>
                        <div><span className="font-medium">Manager:</span> {currentProject.manager}</div>
                        <div><span className="font-medium">Sponsor:</span> {currentProject.sponsor}</div>
                        <div><span className="font-medium">Estado:</span> 
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(currentProject.status)}`}>
                            {getStatusIcon(currentProject.status)} {currentProject.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Métricas Financieras</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="font-medium">Presupuesto:</span> ${(currentProject.budget / 1000).toFixed(0)}K USD</div>
                        <div><span className="font-medium">Reserva Contingencia:</span> ${(currentProject.contingencyReserve / 1000).toFixed(0)}K USD</div>
                        <div><span className="font-medium">Reserva Gestión:</span> ${(currentProject.managementReserve / 1000).toFixed(0)}K USD</div>
                        {currentProject.irr > 0 && (
                          <div><span className="font-medium">TIR:</span> {currentProject.irr.toFixed(2)}%</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Lista de Proyectos */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Proyectos del Portfolio</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {projects.filter(p => p.status === 'active').length} activo(s) / {projects.length} total
                    {statusFilter !== 'all' && (
                      <span className="ml-2 text-blue-600">
                        (Mostrando: {projects.filter(p => p.status === statusFilter).length})
                      </span>
                    )}
                  </div>
                  <select 
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    value={statusFilter}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Solo Activos</option>
                    <option value="inactive">Solo Inactivos</option>
                    <option value="completed">Solo Completados</option>
                    <option value="archived">Solo Archivados</option>
                  </select>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📁</div>
                  <div className="text-lg mb-2">No hay proyectos en el portfolio</div>
                  <button
                    onClick={handleNewProject}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Crear Primer Proyecto
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects
                    .filter(project => {
                      if (statusFilter === 'all') return true;
                      return project.status === statusFilter;
                    })
                    .map((project) => (
                    <div
                      key={project.id}
                      className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                        currentProjectId === project.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCurrentProjectId(project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{project.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                              {project.priority}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                              {getStatusIcon(project.status)} {project.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            {project.description}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>👤 {project.manager}</span>
                            <span>💰 ${(project.budget / 1000).toFixed(0)}K USD</span>
                            <span>📅 {project.startDate} - {project.endDate}</span>
                            {project.irr > 0 && <span>📈 TIR: {project.irr.toFixed(2)}%</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              console.log('🖱️ Botón de edición clickeado para proyecto:', project.id);
                              e.stopPropagation();
                              handleEditProject(project);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Editar proyecto"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateProject(project.id);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Duplicar proyecto"
                          >
                            📋
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProject(project.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar proyecto"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Métricas del Portfolio */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Métricas del Portfolio</h3>
              
              {/* Alerta Informativa */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-blue-600 text-xl mr-3">ℹ️</div>
                  <div className="text-blue-800 text-sm">
                    <strong>Importante:</strong> Las métricas financieras solo consideran proyectos con estado "Activo". 
                    Los proyectos "Inactivos" no suman al presupuesto total ni a las reservas del portfolio.
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Distribución por Estado</h4>
                  <div className="space-y-3">
                    {['active', 'completed', 'on-hold', 'cancelled'].map(status => {
                      const count = projects.filter(p => p.status === status).length;
                      const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>{getStatusIcon(status)}</span>
                            <span className="capitalize">{status}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Distribución por Prioridad</h4>
                  <div className="space-y-3">
                    {['high', 'medium', 'low'].map(priority => {
                      const count = projects.filter(p => p.priority === priority).length;
                      const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                      return (
                        <div key={priority} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="capitalize">{priority}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Análisis Financiero (Solo Proyectos Activos)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.budget, 0) / 1000).toFixed(0)}K USD
                    </div>
                    <div className="text-sm text-gray-600">Presupuesto Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${(projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.contingencyReserve + p.managementReserve, 0) / 1000).toFixed(0)}K USD
                    </div>
                    <div className="text-sm text-gray-600">Reservas Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {projects.filter(p => p.status === 'active' && p.irr > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Proyectos con TIR</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Nota:</strong> Las métricas financieras solo consideran proyectos con estado "Activo". 
                    Los proyectos "Inactivos" o "Completados" no influyen en los indicadores financieros.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Crear/Editar Proyecto */}
      {console.log('🎭 Renderizando modal - showNewProjectModal:', showNewProjectModal)}
              {showNewProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            {console.log('🎭 Modal renderizado - editingProject:', editingProject)}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingProject?.id ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setEditingProject(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className={`w-full border rounded px-3 py-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.name || ''}
                    onChange={(e) => {
                      setEditingProject({
                        id: editingProject.id,
                        name: e.target.value,
                        description: editingProject.description,
                        startDate: editingProject.startDate,
                        endDate: editingProject.endDate,
                        budget: editingProject.budget,
                        status: editingProject.status,
                        priority: editingProject.priority,
                        manager: editingProject.manager,
                        team: editingProject.team,
                        createdAt: editingProject.createdAt,
                        updatedAt: editingProject.updatedAt,
                        version: editingProject.version,
                        progress: editingProject.progress,
                        sponsor: editingProject.sponsor,
                        irr: editingProject.irr,
                        objective: editingProject.objective,
                        businessCase: editingProject.businessCase
                      });
                      validateField('name', e.target.value);
                    }}
                    onBlur={(e) => validateField('name', e.target.value)}
                    placeholder="Nombre del proyecto"
                  />
                  <ErrorMessage error={errors.name} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager *</label>
                  <input
                    type="text"
                    className={`w-full border rounded px-3 py-2 ${errors.manager ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.manager || ''}
                    onChange={(e) => {
                      updateEditingProject('manager', e.target.value);
                      validateField('manager', e.target.value);
                    }}
                    onBlur={(e) => validateField('manager', e.target.value)}
                    placeholder="Gerente del proyecto"
                  />
                  <ErrorMessage error={errors.manager} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor *</label>
                  <input
                    type="text"
                    className={`w-full border rounded px-3 py-2 ${errors.sponsor ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.sponsor || ''}
                    onChange={(e) => {
                      updateEditingProject('sponsor', e.target.value);
                      validateField('sponsor', e.target.value);
                    }}
                    onBlur={(e) => validateField('sponsor', e.target.value)}
                    placeholder="Patrocinador del proyecto"
                  />
                  <ErrorMessage error={errors.sponsor} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingProject?.priority || 'medium'}
                    onChange={(e) => updateEditingProject('priority', e.target.value)}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado del Proyecto *</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingProject?.status || 'inactive'}
                    onChange={(e) => updateEditingProject('status', e.target.value)}
                  >
                    <option value="inactive">⚫ Inactivo</option>
                    <option value="active">🟢 Activo</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Por defecto:</strong> Los proyectos nuevos y duplicados aparecen como "Inactivos" 
                    para revisión. Solo los proyectos "Activos" suman al dashboard consolidado y aparecen en Gestión de Proyectos.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    className={`w-full border rounded px-3 py-2 ${errors.startDate ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.startDate || ''}
                    onChange={(e) => {
                      updateEditingProject('startDate', e.target.value);
                      validateField('startDate', e.target.value);
                      // Revalidar fecha fin si ya existe
                      if (editingProject?.endDate) {
                        validateField('endDate', editingProject.endDate);
                      }
                    }}
                    onBlur={(e) => validateField('startDate', e.target.value)}
                  />
                  <ErrorMessage error={errors.startDate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin *</label>
                  <input
                    type="date"
                    className={`w-full border rounded px-3 py-2 ${errors.endDate ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.endDate || ''}
                    onChange={(e) => {
                      updateEditingProject('endDate', e.target.value);
                      validateField('endDate', e.target.value);
                    }}
                    onBlur={(e) => validateField('endDate', e.target.value)}
                  />
                  <ErrorMessage error={errors.endDate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (USD) *</label>
                  <input
                    type="number"
                    className={`w-full border rounded px-3 py-2 ${errors.budget ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.budget || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Solo permitir números y vacío
                      if (inputValue === '' || /^\d+$/.test(inputValue)) {
                        const numValue = inputValue === '' ? '' : Number(inputValue);
                        updateEditingProject('budget', numValue);
                        validateField('budget', numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      validateField('budget', value);
                    }}
                    placeholder="Presupuesto en USD (ej: 100000)"
                    min="0"
                  />
                  <ErrorMessage error={errors.budget} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIR (%)</label>
                  <input
                    type="number"
                    className={`w-full border rounded px-3 py-2 ${errors.irr ? 'border-red-500' : 'border-gray-300'}`}
                    value={editingProject?.irr || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Solo permitir números, punto decimal y vacío
                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                        const numValue = inputValue === '' ? '' : Number(inputValue);
                        updateEditingProject('irr', numValue);
                        validateField('irr', numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      validateField('irr', value);
                    }}
                    placeholder="Tasa Interna de Retorno (ej: 15.5)"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <ErrorMessage error={errors.irr} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.description || ''}
                    onChange={(e) => updateEditingProject('description', e.target.value)}
                    placeholder="Descripción detallada del proyecto"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo del Proyecto</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.objective || ''}
                    onChange={(e) => updateEditingProject('objective', e.target.value)}
                    placeholder="¿Qué se busca lograr con este proyecto?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caso de Negocio</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.businessCase || ''}
                    onChange={(e) => updateEditingProject('businessCase', e.target.value)}
                    placeholder="Justificación del proyecto desde el punto de vista del negocio"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setEditingProject(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={Object.keys(errors).length > 0}
                  className={`px-4 py-2 rounded transition-colors ${
                    Object.keys(errors).length > 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Guardar Proyecto {Object.keys(errors).length > 0 && `(${Object.keys(errors).length} errores)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioStrategic;
