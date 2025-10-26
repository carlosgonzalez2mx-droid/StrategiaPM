import React, { useState, useMemo } from 'react';

const ResourceList = ({ 
  globalResources, 
  setGlobalResources 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados para nuevo recurso
  const [newResource, setNewResource] = useState({
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

  // Filtrar recursos
  const filteredResources = useMemo(() => {
    return globalResources.filter(resource => {
      const matchesSearch = !searchTerm || 
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resource.email && resource.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRole = roleFilter === 'all' || resource.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [globalResources, searchTerm, roleFilter, statusFilter]);

  // Obtener roles únicos
  const uniqueRoles = useMemo(() => {
    const roles = globalResources.map(r => r.role);
    return Array.from(new Set(roles));
  }, [globalResources]);

  // Calcular métricas de recursos
  const resourceMetrics = useMemo(() => {
    const totalResources = globalResources.length;
    const activeResources = globalResources.filter(r => r.status === 'active').length;
    const inactiveResources = globalResources.filter(r => r.status === 'inactive').length;
    const onLeaveResources = globalResources.filter(r => r.status === 'on-leave').length;
    
    const totalCost = globalResources.reduce((sum, r) => {
      const monthlyHours = r.availability * 160; // 160 horas por mes
      return sum + (monthlyHours * r.hourlyRate);
    }, 0);

    return {
      totalResources,
      activeResources,
      inactiveResources,
      onLeaveResources,
      totalCost
    };
  }, [globalResources]);

  // Agregar nuevo recurso
  const handleAddResource = () => {
    if (!newResource.name || !newResource.role) return;

    const resource = {
      id: 'res-' + String(Date.now()).slice(-6),
      name: newResource.name,
      role: newResource.role,
      skills: newResource.skills.split(',').map(s => s.trim()).filter(s => s),
      experience: newResource.experience,
      certifications: newResource.certifications ? newResource.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
      notes: newResource.notes
    };
    
    console.log('➕ Agregando nuevo recurso:', resource);
    console.log('➕ Recursos actuales antes de agregar:', globalResources);
    
    setGlobalResources(prev => {
      const newResources = prev.slice();
      newResources.push(resource);
      console.log('➕ Nuevos recursos después de agregar:', newResources);
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
        return Object.assign({}, resource, {
          name: editingResource.name,
          role: editingResource.role,
          skills: editingResource.skills.split(',').map(s => s.trim()).filter(s => s),
          availability: editingResource.availability,
          hourlyRate: editingResource.hourlyRate,
          status: editingResource.status,
          email: editingResource.email || resource.email,
          phone: editingResource.phone || resource.phone,
          department: editingResource.department || resource.department,
          experience: editingResource.experience || resource.experience,
          certifications: editingResource.certifications ? editingResource.certifications.split(',').map(s => s.trim()).filter(s => s) : resource.certifications,
          notes: editingResource.notes || resource.notes
        });
      }
      return resource;
    }));

    setShowEditModal(false);
    setEditingResource(null);
  };

  // Abrir modal de edición
  const openEditModal = (resource) => {
    setEditingResource(Object.assign({}, resource, {
      skills: Array.isArray(resource.skills) ? resource.skills.join(', ') : resource.skills,
      certifications: Array.isArray(resource.certifications) ? resource.certifications.join(', ') : resource.certifications
    }));
    setShowEditModal(true);
  };

  // Eliminar recurso
  const handleDeleteResource = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este recurso?')) {
      setGlobalResources(prev => prev.filter(r => r.id !== id));
    }
  };

  // Obtener color de estado
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'on-leave': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener icono de estado
  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '✅';
      case 'inactive': return '⏸️';
      case 'on-leave': return '🏖️';
      case 'terminated': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 rounded-2xl p-3 mr-4 shadow-sm">
          <span className="text-3xl">👥</span>
        </div>
        <div>
          <p className="text-gray-600 text-lg">Gestión global de recursos humanos del portafolio</p>
        </div>
      </div>

      {/* Métricas de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">👥</span>
            <span className="text-sm font-medium text-blue-600">Total Recursos</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{resourceMetrics.totalResources}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-green-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">✅</span>
            <span className="text-sm font-medium text-green-600">Activos</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{resourceMetrics.activeResources}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">⏸️</span>
            <span className="text-sm font-medium text-gray-600">Inactivos</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{resourceMetrics.inactiveResources}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-yellow-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🏖️</span>
            <span className="text-sm font-medium text-yellow-600">En Licencia</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{resourceMetrics.onLeaveResources}</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-purple-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-purple-600">Costo Mensual</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">${(resourceMetrics.totalCost / 1000).toFixed(0)}K</div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl p-4 border border-blue-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="on-leave">En licencia</option>
              <option value="terminated">Terminado</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Agregar Recurso</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Recursos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
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
                  Disponibilidad
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
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-2">👥</span>
                      <p className="text-lg font-medium">No hay recursos registrados</p>
                      <p className="text-sm">Agrega tu primer recurso para comenzar</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {resource.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {resource.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {resource.email || 'Sin email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {resource.role}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {resource.availability}%
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${resource.hourlyRate}/h
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(resource.status)}`}>
                        {getStatusIcon(resource.status)} {resource.status === 'active' ? 'Activo' :
                         resource.status === 'inactive' ? 'Inactivo' :
                         resource.status === 'on-leave' ? 'Licencia' :
                         'Terminado'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(resource)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar recurso"
                        >
                          ✏️
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
                ))
              )}
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
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    value={newResource.name}
                    onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol *</label>
                  <input
                    type="text"
                    value={newResource.role}
                    onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Project Manager, Desarrollador, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newResource.email}
                    onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@empresa.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Habilidades (separadas por comas)</label>
                  <input
                    type="text"
                    value={newResource.skills}
                    onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, skills: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="React, JavaScript, PMBOK, etc."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disponibilidad (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newResource.availability}
                      onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, availability: Number(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Costo por Hora ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={newResource.hourlyRate}
                      onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, hourlyRate: Number(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={newResource.status}
                    onChange={(e) => setNewResource({
                      id: newResource.id,
                      name: newResource.name,
                      role: newResource.role,
                      email: newResource.email,
                      skills: newResource.skills,
                      availability: newResource.availability,
                      hourlyRate: newResource.hourlyRate,
                      status: newResource.status,
                      projectId: newResource.projectId, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddResource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Agregar
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
                  <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    value={editingResource.name}
                    onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol *</label>
                  <input
                    type="text"
                    value={editingResource.role}
                    onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editingResource.email}
                    onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, skills: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Disponibilidad (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingResource.availability}
                      onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, availability: Number(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Costo por Hora ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingResource.hourlyRate}
                      onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, hourlyRate: Number(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={editingResource.status}
                    onChange={(e) => setEditingResource({
                      id: editingResource.id,
                      name: editingResource.name,
                      role: editingResource.role,
                      email: editingResource.email,
                      skills: editingResource.skills,
                      availability: editingResource.availability,
                      hourlyRate: editingResource.hourlyRate,
                      status: editingResource.status,
                      projectId: editingResource.projectId, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditResource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceList;
