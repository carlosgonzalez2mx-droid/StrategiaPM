import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

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
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'on-leave': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'terminated': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Obtener icono de estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '✅';
      case 'inactive': return '⏸️';
      case 'on-leave': return '🏖️';
      case 'terminated': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Métricas de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">👥</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{resourceMetrics.totalResources}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Activos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{resourceMetrics.activeResources}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">⏸️</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Inactivos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{resourceMetrics.inactiveResources}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🏖️</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Licencia</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{resourceMetrics.onLeaveResources}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">💰</span>
              <span className="text-xs font-bold text-slate-500 uppercase">Costo Mensual</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">${(resourceMetrics.totalCost / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
              <input
                type="text"
                placeholder="Buscar recursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              >
                <option value="all">Todos los roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="on-leave">En licencia</option>
                <option value="terminated">Terminado</option>
              </select>
            </div>

            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 shadow-lg shrink-0"
            >
              ➕ Agregar Recurso
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Recursos */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recurso</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidad</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Costo/Hora</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3 opacity-20">👥</span>
                      <p className="text-base font-medium">No hay recursos encontrados</p>
                      <p className="text-sm mt-1">Intenta ajustar los filtros o agrega uno nuevo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold border border-brand-100">
                            {resource.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{resource.name}</div>
                          <div className="text-sm text-slate-400">{resource.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {resource.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-slate-600">{resource.availability}%</span>
                        <div className="ml-2 w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", resource.availability > 80 ? "bg-emerald-500" : resource.availability > 50 ? "bg-amber-500" : "bg-red-500")}
                            style={{ width: `${resource.availability}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                      ${resource.hourlyRate}/h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center w-fit gap-1.5", getStatusColor(resource.status))}>
                        {getStatusIcon(resource.status)}
                        <span className="capitalize">{resource.status === 'on-leave' ? 'Licencia' : resource.status === 'active' ? 'Activo' : resource.status === 'inactive' ? 'Inactivo' : 'Terminado'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditModal(resource)} title="Editar">
                          ✏️
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteResource(resource.id)} className="text-slate-400 hover:text-red-600" title="Eliminar">
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Agregar/Editar (Reutilizable) */}
      {(showAddModal || (showEditModal && editingResource)) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-0 animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <CardTitle>{showAddModal ? 'Agregar Nuevo Recurso' : 'Editar Recurso'}</CardTitle>
                <Button size="icon" variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingResource(null); }}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.name : editingResource?.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, name: val }));
                      else setEditingResource(prev => ({ ...prev, name: val }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="Nombre completo"
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.role : editingResource?.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, role: val }));
                      else setEditingResource(prev => ({ ...prev, role: val }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="Ej. Project Manager"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={showAddModal ? newResource.email : editingResource?.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, email: val }));
                      else setEditingResource(prev => ({ ...prev, email: val }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="email@empresa.com"
                  />
                </div>

                {/* Habilidades */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Habilidades</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.skills : editingResource?.skills}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, skills: val }));
                      else setEditingResource(prev => ({ ...prev, skills: val }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    placeholder="Ej: React, SQL, Liderazgo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Disp. (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={showAddModal ? newResource.availability : editingResource?.availability}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (showAddModal) setNewResource(prev => ({ ...prev, availability: val }));
                        else setEditingResource(prev => ({ ...prev, availability: val }));
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo/Hora ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={showAddModal ? newResource.hourlyRate : editingResource?.hourlyRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (showAddModal) setNewResource(prev => ({ ...prev, hourlyRate: val }));
                        else setEditingResource(prev => ({ ...prev, hourlyRate: val }));
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={showAddModal ? newResource.status : editingResource?.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, status: val }));
                      else setEditingResource(prev => ({ ...prev, status: val }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="on-leave">En licencia</option>
                    <option value="terminated">Terminado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingResource(null); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={showAddModal ? handleAddResource : handleEditResource}
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                >
                  {showAddModal ? 'Agregar Recurso' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResourceList;
