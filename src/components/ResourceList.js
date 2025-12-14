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

  const uniqueRoles = useMemo(() => {
    const roles = globalResources.map(r => r.role);
    return Array.from(new Set(roles));
  }, [globalResources]);

  const resourceMetrics = useMemo(() => {
    const totalResources = globalResources.length;
    const activeResources = globalResources.filter(r => r.status === 'active').length;
    const inactiveResources = globalResources.filter(r => r.status === 'inactive').length;
    const onLeaveResources = globalResources.filter(r => r.status === 'on-leave').length;

    const totalCost = globalResources.reduce((sum, r) => {
      const monthlyHours = r.availability * 160;
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

  const openEditModal = (resource) => {
    setEditingResource(Object.assign({}, resource, {
      skills: Array.isArray(resource.skills) ? resource.skills.join(', ') : resource.skills,
      certifications: Array.isArray(resource.certifications) ? resource.certifications.join(', ') : resource.certifications
    }));
    setShowEditModal(true);
  };

  const handleDeleteResource = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este recurso?')) {
      setGlobalResources(prev => prev.filter(r => r.id !== id));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300';
      case 'inactive': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'on-leave': return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-300';
      case 'terminated': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

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
      {/* Métricas de Recursos - Premium Colorful */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">👥</span>
              <span className="text-xs font-bold text-blue-100 uppercase">Total</span>
            </div>
            <div className="text-4xl font-bold">{resourceMetrics.totalResources}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">✅</span>
              <span className="text-xs font-bold text-emerald-100 uppercase">Activos</span>
            </div>
            <div className="text-4xl font-bold">{resourceMetrics.activeResources}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-400 to-slate-600 rounded-2xl p-6 text-white shadow-xl shadow-slate-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">⏸️</span>
              <span className="text-xs font-bold text-slate-100 uppercase">Inactivos</span>
            </div>
            <div className="text-4xl font-bold">{resourceMetrics.inactiveResources}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🏖️</span>
              <span className="text-xs font-bold text-amber-100 uppercase">Licencia</span>
            </div>
            <div className="text-4xl font-bold">{resourceMetrics.onLeaveResources}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">💰</span>
              <span className="text-xs font-bold text-purple-100 uppercase">Costo</span>
            </div>
            <div className="text-4xl font-bold">${(resourceMetrics.totalCost / 1000).toFixed(0)}K</div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <Card className="shadow-lg border-2 border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar recursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="all">Todos los roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
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
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/30 shrink-0"
            >
              ➕ Agregar Recurso
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Recursos */}
      <Card className="overflow-hidden shadow-xl border-2 border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Recurso</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Disponibilidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Costo/Hora</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <span className="text-5xl mb-4 opacity-20">👥</span>
                      <p className="text-lg font-medium">No hay recursos encontrados</p>
                      <p className="text-sm mt-1">Intenta ajustar los filtros o agrega uno nuevo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredResources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">
                            {resource.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">{resource.name}</div>
                          <div className="text-sm text-slate-400">{resource.email || 'Sin email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border-2 border-slate-200">
                        {resource.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-600">{resource.availability}%</span>
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={cn("h-full rounded-full",
                              resource.availability > 80 ? "bg-gradient-to-r from-emerald-500 to-green-600" :
                                resource.availability > 50 ? "bg-gradient-to-r from-amber-500 to-orange-600" :
                                  "bg-gradient-to-r from-red-500 to-pink-600"
                            )}
                            style={{ width: `${resource.availability}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-600">
                      ${resource.hourlyRate}/h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold border-2 flex items-center w-fit gap-1.5 shadow-lg", getStatusColor(resource.status))}>
                        {getStatusIcon(resource.status)}
                        <span className="capitalize">{resource.status === 'on-leave' ? 'Licencia' : resource.status === 'active' ? 'Activo' : resource.status === 'inactive' ? 'Inactivo' : 'Terminado'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditModal(resource)} title="Editar" className="hover:bg-blue-50 hover:text-blue-600">
                          ✏️
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteResource(resource.id)} className="hover:bg-red-50 hover:text-red-600" title="Eliminar">
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

      {/* Modal Agregar/Editar */}
      {(showAddModal || (showEditModal && editingResource)) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-md shadow-2xl border-2 border-blue-200 rounded-2xl overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{showAddModal ? '✨ Agregar Recurso' : '✏️ Editar Recurso'}</h2>
                <Button size="icon" variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingResource(null); }} className="text-white hover:bg-white/20">✕</Button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.name : editingResource?.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, name: val }));
                      else setEditingResource(prev => ({ ...prev, name: val }));
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Rol *</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.role : editingResource?.role}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, role: val }));
                      else setEditingResource(prev => ({ ...prev, role: val }));
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Ej. Project Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={showAddModal ? newResource.email : editingResource?.email}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, email: val }));
                      else setEditingResource(prev => ({ ...prev, email: val }));
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="email@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Habilidades</label>
                  <input
                    type="text"
                    value={showAddModal ? newResource.skills : editingResource?.skills}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, skills: val }));
                      else setEditingResource(prev => ({ ...prev, skills: val }));
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Ej: React, SQL, Liderazgo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Disp. (%)</label>
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
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Costo/Hora ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={showAddModal ? newResource.hourlyRate : editingResource?.hourlyRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (showAddModal) setNewResource(prev => ({ ...prev, hourlyRate: val }));
                        else setEditingResource(prev => ({ ...prev, hourlyRate: val }));
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={showAddModal ? newResource.status : editingResource?.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (showAddModal) setNewResource(prev => ({ ...prev, status: val }));
                      else setEditingResource(prev => ({ ...prev, status: val }));
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="on-leave">En licencia</option>
                    <option value="terminated">Terminado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-slate-100">
                <Button variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingResource(null); }} className="hover:bg-slate-100">
                  Cancelar
                </Button>
                <Button
                  onClick={showAddModal ? handleAddResource : handleEditResource}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                >
                  {showAddModal ? '✨ Agregar' : '💾 Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceList;
