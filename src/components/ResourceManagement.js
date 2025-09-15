import React, { useState, useMemo } from 'react';

const ResourceManagement = ({ 
  projects, 
  workPackages, 
  currentProject,
  globalResources,
  setGlobalResources,
  includeWeekends = false,
  getCurrentProjectResourceAssignments,
  updateCurrentProjectResourceAssignments,
  getCurrentProjectResources,
  getAvailableResources,
  calculateResourceWorkload
}) => {
  // Usar recursos globales en lugar de estado interno
  const resources = globalResources || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Estados para nuevo recurso
  const [newResource, setNewResource] = useState({
    name: '',
    role: '',
    skills: '',
    availability: 100,
    hourlyRate: 0,
    status: 'active'
  });

  // Estados para asignación
  const [assignment, setAssignment] = useState({
    resourceId: '',
    projectId: '',
    workPackageId: '',
    allocation: 0,
    startDate: '',
    endDate: ''
  });

  // Filtrar recursos
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesSearch = !searchTerm || 
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || resource.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [resources, searchTerm, roleFilter]);

  // Obtener roles únicos
  const uniqueRoles = useMemo(() => {
    const roles = resources.map(r => r.role);
    return Array.from(new Set(roles));
  }, [resources]);

  // Calcular métricas de recursos
  const resourceMetrics = useMemo(() => {
    const totalResources = resources.length;
    const activeResources = resources.filter(r => r.status === 'active').length;
    const overworkedResources = resources.filter(r => calculateResourceWorkload(r.id) > 90).length;
    const availableResources = resources.filter(r => calculateResourceWorkload(r.id) < 50).length;
    
    const totalCost = resources.reduce((sum, r) => {
      const monthlyHours = r.availability * 160; // 160 horas por mes
      return sum + (monthlyHours * r.hourlyRate);
    }, 0);

    const averageWorkload = resources.length > 0 ? 
      resources.reduce((sum, r) => sum + calculateResourceWorkload(r.id), 0) / resources.length : 0;

    return {
      totalResources,
      activeResources,
      overworkedResources,
      availableResources,
      totalCost,
      averageWorkload
    };
  }, [resources, calculateResourceWorkload]);

  // Agregar nuevo recurso
  const handleAddResource = () => {
    if (!newResource.name || !newResource.role) return;

    const resource = {
      id: 'res-' + String(Date.now()).slice(-6),
      name: newResource.name,
      role: newResource.role,
      availability: newResource.availability,
      hourlyRate: newResource.hourlyRate,
      skills: newResource.skills.split(',').map(s => s.trim()),
      email: newResource.email || '',
      phone: newResource.phone || '',
      department: newResource.department || '',
      experience: newResource.experience || '',
      certifications: newResource.certifications ? newResource.certifications.split(',').map(s => s.trim()) : [],
      notes: newResource.notes || ''
    };
    
    setGlobalResources(prev => {
      const newResources = prev.slice();
      newResources.push(resource);
      return newResources;
    });
    setShowAddModal(false);
    setNewResource({
      name: '',
      role: '',
      skills: '',
      availability: 100,
      hourlyRate: 0,
      status: 'active',
      email: '',
      phone: '',
      department: '',
      experience: '',
      certifications: '',
      notes: ''
    });
  };

  // Editar recurso existente
  const handleEditResource = () => {
    if (!editingResource) return;

    setGlobalResources(prev => prev.map(resource => {
      if (resource.id === editingResource.id) {
        return {
          id: resource.id,
          name: editingResource.name,
          role: editingResource.role,
          availability: editingResource.availability,
          hourlyRate: editingResource.hourlyRate,
          skills: editingResource.skills.split(',').map(s => s.trim()),
          email: editingResource.email || resource.email,
          phone: editingResource.phone || resource.phone,
          department: editingResource.department || resource.department,
          experience: editingResource.experience || resource.experience,
          certifications: editingResource.certifications ? editingResource.certifications.split(',').map(s => s.trim()) : resource.certifications,
          notes: editingResource.notes || resource.notes,
          status: editingResource.status
        };
      }
      return resource;
    }));

    setShowEditModal(false);
    setEditingResource(null);
  };

  // Abrir modal de edición
  const openEditModal = (resource) => {
    setEditingResource({
      id: resource.id,
      name: resource.name,
      role: resource.role,
      availability: resource.availability,
      hourlyRate: resource.hourlyRate,
      skills: Array.isArray(resource.skills) ? resource.skills.join(', ') : resource.skills,
      email: resource.email,
      phone: resource.phone,
      department: resource.department,
      experience: resource.experience,
      certifications: Array.isArray(resource.certifications) ? resource.certifications.join(', ') : resource.certifications,
      notes: resource.notes,
      status: resource.status
    });
    setShowEditModal(true);
  };

  // Asignar recurso a proyecto
  const handleAssignResource = () => {
    if (!assignment.resourceId || !assignment.projectId) return;

    const currentAssignments = getCurrentProjectResourceAssignments();
    const newAssignment = {
      id: 'assign-' + String(Date.now()).slice(-6),
      projectId: currentProject?.id || '',
      resourceId: assignment.resourceId,
      workPackageId: assignment.workPackageId,
      role: assignment.role,
      allocation: assignment.allocation,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      hourlyRate: assignment.hourlyRate,
      status: 'active',
      notes: assignment.notes || ''
    };

    updateCurrentProjectResourceAssignments(() => {
      const updatedAssignments = currentAssignments.slice();
      updatedAssignments.push(newAssignment);
      return updatedAssignments;
    });

    setShowAssignModal(false);
    setAssignment({
      resourceId: '',
      projectId: '',
      workPackageId: '',
      allocation: 0,
      startDate: '',
      endDate: '',
      role: '',
      hourlyRate: 0,
      notes: ''
    });
  };

  // Eliminar recurso
  const handleDeleteResource = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este recurso?')) {
      setGlobalResources(prev => prev.filter(r => r.id !== id));
    }
  };

  // Obtener color de carga de trabajo
  const getWorkloadColor = (workload) => {
    if (workload > 90) return 'text-red-600 bg-red-100';
    if (workload > 75) return 'text-yellow-600 bg-yellow-100';
    if (workload > 50) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  // Obtener icono de estado
  const getStatusIcon = (workload) => {
    if (workload > 90) return '🔴';
    if (workload > 75) return '🟡';
    if (workload > 50) return '🔵';
    return '🟢';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-100 rounded-2xl shadow-lg p-6 text-gray-800 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100/30 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white/60 backdrop-blur rounded-2xl p-3 mr-4 shadow-sm">
                  <span className="text-3xl">👥</span>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-gray-800">Gestión de Recursos</h1>
                  <p className="text-gray-600 text-lg">
                    Administración de recursos humanos y asignación de proyectos
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Indicador de configuración de días laborables */}
                <div className="bg-white/60 backdrop-blur rounded-2xl px-4 py-2 shadow-sm">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">📅 Días laborables:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      includeWeekends 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {includeWeekends ? 'Lunes a Domingo' : 'Lunes a Viernes'}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">{resourceMetrics.totalResources}</div>
                  <div className="text-gray-600">Recursos Totales</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Recursos Activos</div>
              <div className="text-2xl font-bold text-gray-800">
                {resourceMetrics.activeResources}
              </div>
            </div>
            <div className="text-green-500 text-2xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Sobrecargados</div>
              <div className="text-2xl font-bold text-gray-800">
                {resourceMetrics.overworkedResources}
              </div>
            </div>
            <div className="text-red-500 text-2xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Disponibles</div>
              <div className="text-2xl font-bold text-gray-800">
                {resourceMetrics.availableResources}
              </div>
            </div>
            <div className="text-blue-500 text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Costo Mensual</div>
              <div className="text-2xl font-bold text-gray-800">
                ${(resourceMetrics.totalCost / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-purple-500 text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todos los roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              📋 Asignar Recurso
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              ➕ Agregar Recurso
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Recursos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carga de Trabajo
                </th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Proyectos
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Costo/Hora
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Estado
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Acciones
                 </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {resource.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                                             <div className="ml-4">
                         <div 
                           className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                           onClick={() => {
                             setSelectedResource(resource);
                             setShowDetailsModal(true);
                           }}
                         >
                           {resource.name}
                         </div>
                         <div className="text-sm text-gray-500">
                           {Array.isArray(resource.skills) ? resource.skills.slice(0, 2).join(', ') : resource.skills}
                         </div>
                       </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {resource.role}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getStatusIcon(calculateResourceWorkload(resource.id))}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span>{calculateResourceWorkload(resource.id)}%</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              calculateResourceWorkload(resource.id) > 90 ? 'bg-red-500' :
                              calculateResourceWorkload(resource.id) > 75 ? 'bg-yellow-500' :
                              calculateResourceWorkload(resource.id) > 50 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${calculateResourceWorkload(resource.id)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCurrentProjectResourceAssignments().filter(a => a.resourceId === resource.id).length} asignaciones
                  </td>
                  
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     ${resource.hourlyRate}/h
                   </td>
                   
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                       resource.status === 'active' ? 'bg-green-100 text-green-800' :
                       resource.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                       resource.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                       'bg-red-100 text-red-800'
                     }`}>
                       {resource.status === 'active' ? 'Activo' :
                        resource.status === 'inactive' ? 'Inactivo' :
                        resource.status === 'on-leave' ? 'Licencia' :
                        'Terminado'}
                     </span>
                   </td>
                   
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                     <div className="flex space-x-2">
                       <button
                         onClick={() => openEditModal(resource)}
                         className="text-green-600 hover:text-green-900"
                         title="Editar recurso"
                       >
                         ✏️
                       </button>
                       <button
                         onClick={() => {
                           setSelectedResource(resource);
                           setShowAssignModal(true);
                         }}
                         className="text-blue-600 hover:text-blue-900"
                         title="Asignar a proyecto"
                       >
                         📋
                       </button>
                       <button
                         onClick={() => handleDeleteResource(resource.id)}
                         className="text-red-600 hover:text-red-900"
                         title="Eliminar recurso"
                       >
                         🗑️
                       </button>
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar recurso */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Nuevo Recurso</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    value={newResource.name}
                    onChange={(e) => setNewResource({
                      name: e.target.value,
                      role: newResource.role,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      email: newResource.email,
                      phone: newResource.phone,
                      department: newResource.department,
                      experience: newResource.experience,
                      certifications: newResource.certifications,
                      notes: newResource.notes
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <input
                    type="text"
                    value={newResource.role}
                    onChange={(e) => setNewResource({
                      name: newResource.name,
                      role: e.target.value,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      email: newResource.email,
                      phone: newResource.phone,
                      department: newResource.department,
                      experience: newResource.experience,
                      certifications: newResource.certifications,
                      notes: newResource.notes
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Habilidades (separadas por comas)</label>
                  <input
                    type="text"
                    value={newResource.skills}
                    onChange={(e) => setNewResource({
                      name: newResource.name,
                      role: newResource.role,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      email: newResource.email,
                      phone: newResource.phone,
                      department: newResource.department,
                      experience: newResource.experience,
                      certifications: newResource.certifications,
                      notes: newResource.notes, skills: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Disponibilidad (%)</label>
                  <input
                    type="number"
                    value={newResource.availability}
                    onChange={(e) => setNewResource({
                      name: newResource.name,
                      role: newResource.role,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      email: newResource.email,
                      phone: newResource.phone,
                      department: newResource.department,
                      experience: newResource.experience,
                      certifications: newResource.certifications,
                      notes: newResource.notes, availability: Number(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Costo por Hora ($)</label>
                  <input
                    type="number"
                    value={newResource.hourlyRate}
                    onChange={(e) => setNewResource({
                      name: newResource.name,
                      role: newResource.role,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      email: newResource.email,
                      phone: newResource.phone,
                      department: newResource.department,
                      experience: newResource.experience,
                      certifications: newResource.certifications,
                      notes: newResource.notes, hourlyRate: Number(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddResource}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar recurso */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asignar Recurso a Proyecto</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recurso</label>
                  <select
                    value={assignment.resourceId}
                    onChange={(e) => setAssignment({
                      resourceId: e.target.value,
                      projectId: assignment.projectId,
                      taskId: assignment.taskId,
                      allocation: assignment.allocation,
                      hourlyRate: assignment.hourlyRate,
                      startDate: assignment.startDate,
                      endDate: assignment.endDate,
                      notes: assignment.notes
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar recurso</option>
                    {resources.map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name} ({resource.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Proyecto</label>
                  <select
                    value={assignment.projectId}
                    onChange={(e) => setAssignment({
                      resourceId: assignment.resourceId,
                      projectId: assignment.projectId,
                      taskId: assignment.taskId,
                      allocation: assignment.allocation,
                      hourlyRate: assignment.hourlyRate,
                      startDate: assignment.startDate,
                      endDate: assignment.endDate,
                      notes: assignment.notes, projectId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar proyecto</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asignación (%)</label>
                  <input
                    type="number"
                    value={assignment.allocation}
                    onChange={(e) => setAssignment({
                      resourceId: assignment.resourceId,
                      projectId: assignment.projectId,
                      taskId: assignment.taskId,
                      allocation: assignment.allocation,
                      hourlyRate: assignment.hourlyRate,
                      startDate: assignment.startDate,
                      endDate: assignment.endDate,
                      notes: assignment.notes, allocation: Number(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={assignment.startDate}
                    onChange={(e) => setAssignment({
                      resourceId: assignment.resourceId,
                      projectId: assignment.projectId,
                      taskId: assignment.taskId,
                      allocation: assignment.allocation,
                      hourlyRate: assignment.hourlyRate,
                      startDate: assignment.startDate,
                      endDate: assignment.endDate,
                      notes: assignment.notes, startDate: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha de Fin</label>
                  <input
                    type="date"
                    value={assignment.endDate}
                    onChange={(e) => setAssignment({
                      resourceId: assignment.resourceId,
                      projectId: assignment.projectId,
                      taskId: assignment.taskId,
                      allocation: assignment.allocation,
                      hourlyRate: assignment.hourlyRate,
                      startDate: assignment.startDate,
                      endDate: assignment.endDate,
                      notes: assignment.notes, endDate: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignResource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Asignar
                </button>
              </div>
            </div>
          </div>
                 </div>
       )}

       {/* Modal para editar recurso */}
       {showEditModal && editingResource && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Recurso</h3>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Nombre</label>
                   <input
                     type="text"
                     value={editingResource.name}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, name: e.target.value})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Rol</label>
                   <input
                     type="text"
                     value={editingResource.role}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, role: e.target.value})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Habilidades (separadas por comas)</label>
                   <input
                     type="text"
                     value={editingResource.skills}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, skills: e.target.value})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Disponibilidad (%)</label>
                   <input
                     type="number"
                     value={editingResource.availability}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, availability: Number(e.target.value)})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700">Costo por Hora ($)</label>
                   <input
                     type="number"
                     value={editingResource.hourlyRate}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, hourlyRate: Number(e.target.value)})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700">Estado</label>
                   <select
                     value={editingResource.status}
                     onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      skills: editingResource.skills,
                      email: editingResource.email,
                      phone: editingResource.phone,
                      department: editingResource.department,
                      experience: editingResource.experience,
                      certifications: editingResource.certifications,
                      notes: editingResource.notes,
                      status: editingResource.status, status: e.target.value})}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                   >
                     <option value="active">Activo</option>
                     <option value="inactive">Inactivo</option>
                     <option value="on-leave">En licencia</option>
                     <option value="terminated">Terminado</option>
                   </select>
                 </div>
               </div>
               
               <div className="flex justify-end space-x-3 mt-6">
                 <button
                   onClick={() => {
                     setShowEditModal(false);
                     setEditingResource(null);
                   }}
                   className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={handleEditResource}
                   className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                 >
                   Guardar Cambios
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Modal de detalles del recurso */}
       {showDetailsModal && selectedResource && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Detalles del Recurso</h3>
                 <button
                   onClick={() => setShowDetailsModal(false)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   ✕
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div className="flex items-center space-x-3">
                   <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                     <span className="text-lg font-medium text-gray-700">
                       {selectedResource.name.split(' ').map(n => n[0]).join('')}
                     </span>
                   </div>
                   <div>
                     <h4 className="text-lg font-semibold text-gray-900">{selectedResource.name}</h4>
                     <p className="text-sm text-gray-600">{selectedResource.role}</p>
                   </div>
                 </div>

                 <div className="border-t pt-4">
                   <h5 className="font-medium text-gray-700 mb-2">Información General</h5>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-gray-600">Estado:</span>
                       <span className={`px-2 py-1 rounded text-xs font-medium ${
                         selectedResource.status === 'active' ? 'bg-green-100 text-green-800' :
                         selectedResource.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                         selectedResource.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'
                       }`}>
                         {selectedResource.status === 'active' ? 'Activo' :
                          selectedResource.status === 'inactive' ? 'Inactivo' :
                          selectedResource.status === 'on-leave' ? 'Licencia' :
                          'Terminado'}
                       </span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Disponibilidad:</span>
                       <span className="font-medium">{selectedResource.availability}%</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Costo por hora:</span>
                       <span className="font-medium">${selectedResource.hourlyRate}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Carga actual:</span>
                       <span className={`font-medium ${
                         calculateResourceWorkload(selectedResource.id) > 90 ? 'text-red-600' :
                         calculateResourceWorkload(selectedResource.id) > 75 ? 'text-yellow-600' :
                         calculateResourceWorkload(selectedResource.id) > 50 ? 'text-blue-600' :
                         'text-green-600'
                       }`}>
                         {calculateResourceWorkload(selectedResource.id)}%
                       </span>
                     </div>
                   </div>
                 </div>

                 <div className="border-t pt-4">
                   <h5 className="font-medium text-gray-700 mb-2">Habilidades</h5>
                   <div className="flex flex-wrap gap-2">
                     {Array.isArray(selectedResource.skills) ? selectedResource.skills.map((skill, index) => (
                       <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                         {skill}
                       </span>
                     )) : (
                       <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                         {selectedResource.skills}
                       </span>
                     )}
                   </div>
                 </div>

                 <div className="border-t pt-4">
                   <h5 className="font-medium text-gray-700 mb-2">Proyectos Asignados</h5>
                   <div className="space-y-1">
                                           {getCurrentProjectResourceAssignments().filter(a => a.resourceId === selectedResource.id).length > 0 ? (
                        getCurrentProjectResourceAssignments().filter(a => a.resourceId === selectedResource.id).map((assignment, index) => {
                                                    const project = projects.find(p => p.id === assignment.projectId);
                           return project ? (
                           <div key={index} className="text-sm text-gray-600">
                             • {project.name}
                           </div>
                         ) : null;
                       })
                     ) : (
                       <div className="text-sm text-gray-500 italic">No hay proyectos asignados</div>
                     )}
                   </div>
                 </div>
               </div>
               
               <div className="flex justify-end space-x-3 mt-6">
                 <button
                   onClick={() => openEditModal(selectedResource)}
                   className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                 >
                   ✏️ Editar
                 </button>
                 <button
                   onClick={() => setShowDetailsModal(false)}
                   className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                 >
                   Cerrar
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default ResourceManagement;
