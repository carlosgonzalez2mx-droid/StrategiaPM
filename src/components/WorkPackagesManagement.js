import React, { useState, useMemo } from 'react';

const WorkPackagesManagement = ({ 
  workPackages, 
  setWorkPackages,
  currentProject,
  onUpdateSchedule // Nuevo prop para sincronización con cronograma
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWP, setEditingWP] = useState(null);

  // Filtrar work packages
  const filteredWorkPackages = useMemo(() => {
    return workPackages.filter(wp => {
      const matchesSearch = !searchTerm || 
        (wp.wbs && wp.wbs.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (wp.name && wp.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || wp.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [workPackages, searchTerm, statusFilter]);

  // Función para sincronizar con cronograma
  const syncWithSchedule = (wpId, updates) => {
    if (onUpdateSchedule) {
      onUpdateSchedule(wpId, updates);
    }
  };

  // Helper function para clonar editingWP con una propiedad actualizada
  const updateEditingWP = (property, value) => {
    setEditingWP({
      id: editingWP.id,
      wbs: editingWP.wbs,
      name: editingWP.name,
      budget: editingWP.budget,
      plannedValue: editingWP.plannedValue,
      earnedValue: editingWP.earnedValue,
      actualCost: editingWP.actualCost,
      percentComplete: editingWP.percentComplete,
      status: editingWP.status,
      startDate: editingWP.startDate,
      endDate: editingWP.endDate,
      manager: editingWP.manager,
      description: editingWP.description,
      projectId: editingWP.projectId,
      createdAt: editingWP.createdAt,
      updatedAt: editingWP.updatedAt,
      [property]: value
    });
  };

  // Actualizar work package
  const updateWP = (id, updater) => {
    setWorkPackages(prev => prev.map(wp => {
      if (wp.id === id) {
        const updatedWP = Object.assign({}, wp, updater(wp));
        
        // Sincronizar con cronograma
        syncWithSchedule(id, {
          startDate: updatedWP.startDate,
          endDate: updatedWP.endDate,
          progress: updatedWP.percentComplete,
          cost: updatedWP.plannedValue,
          status: updatedWP.status
        });
        
        return updatedWP;
      }
      return wp;
    }));
  };

  // Agregar nuevo work package
  const handleAddWP = () => {
    const newWP = {
      id: Date.now().toString(),
      wbs: editingWP.wbs,
      name: editingWP.name,
      description: editingWP.description,
      budget: Number(editingWP.budget) || 0,
      plannedValue: Number(editingWP.plannedValue) || 0,
      earnedValue: 0,
      actualCost: 0,
      percentComplete: 0,
      status: 'pending',
      startDate: editingWP.startDate,
      endDate: editingWP.endDate,
      manager: editingWP.manager || ''
    };
    
    setWorkPackages(prev => {
      const newWorkPackages = prev.slice();
      newWorkPackages.push(newWP);
      return newWorkPackages;
    });
    
    // Sincronizar con cronograma - crear nueva tarea
    if (onUpdateSchedule) {
      onUpdateSchedule('create', {
        id: newWP.id,
        name: newWP.name,
        startDate: newWP.startDate,
        endDate: newWP.endDate,
        cost: newWP.plannedValue,
        progress: newWP.percentComplete,
        status: newWP.status,
        workPackageId: newWP.id
      });
    }
    
    setShowAddModal(false);
    setEditingWP(null);
  };

  // Eliminar work package
  const handleDeleteWP = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este paquete de trabajo?')) {
      setWorkPackages(prev => prev.filter(wp => wp.id !== id));
      
      // Sincronizar con cronograma - eliminar tarea
      if (onUpdateSchedule) {
        onUpdateSchedule('delete', { id });
      }
    }
  };

  // Editar work package
  const handleEditWP = (wp) => {
    setEditingWP(Object.assign({}, wp));
    setShowEditModal(true);
  };

  // Guardar edición de work package
  const handleSaveEdit = () => {
    if (editingWP.id) {
      setWorkPackages(prev => prev.map(wp => {
        if (wp.id === editingWP.id) {
          const updatedWP = Object.assign({}, editingWP);
          
          // Sincronizar con cronograma
          syncWithSchedule(editingWP.id, {
            startDate: updatedWP.startDate,
            endDate: updatedWP.endDate,
            progress: updatedWP.percentComplete,
            cost: updatedWP.plannedValue,
            status: updatedWP.status
          });
          
          return updatedWP;
        }
        return wp;
      }));
    }
    setShowEditModal(false);
    setEditingWP(null);
  };

  const getPerformanceColor = (value, isIndex = false) => {
    if (isIndex) {
      return value >= 1 ? 'text-green-600' : 'text-red-600';
    }
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏸️';
      case 'delayed': return '⚠️';
      default: return '⏸️';
    }
  };

  // Calcular métricas totales
  const totalMetrics = useMemo(() => {
    return workPackages.reduce((acc, wp) => {
      acc.totalBudget += wp.budget || 0;
      acc.totalPV += wp.plannedValue || 0;
      acc.totalEV += wp.earnedValue || 0;
      acc.totalAC += wp.actualCost || 0;
      return acc;
    }, { totalBudget: 0, totalPV: 0, totalEV: 0, totalAC: 0 });
  }, [workPackages]);

  const totalCV = totalMetrics.totalEV - totalMetrics.totalAC;
  const totalCPI = totalMetrics.totalAC > 0 ? totalMetrics.totalEV / totalMetrics.totalAC : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📋 Work Packages (WBS)</h1>
        <p className="text-indigo-100">Estructura de desglose del trabajo y control de paquetes</p>
      </div>

      {/* Métricas Totales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Presupuesto Total</div>
              <div className="text-2xl font-bold text-gray-800">
                ${(totalMetrics.totalBudget / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-blue-500 text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Valor Ganado (EV)</div>
              <div className="text-2xl font-bold text-gray-800">
                ${(totalMetrics.totalEV / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-green-500 text-2xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Costo Real (AC)</div>
              <div className="text-2xl font-bold text-gray-800">
                ${(totalMetrics.totalAC / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-yellow-500 text-2xl">💸</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">CPI Total</div>
              <div className={`text-2xl font-bold ${getPerformanceColor(totalCPI, true)}`}>
                {totalCPI.toFixed(2)}
              </div>
            </div>
            <div className="text-purple-500 text-2xl">📊</div>
          </div>
        </div>
      </div>

      {/* Controles y Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Buscar paquetes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded px-3 py-2"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todos los estados</option>
              <option value="completed">Completado</option>
              <option value="in-progress">En progreso</option>
              <option value="pending">Pendiente</option>
              <option value="delayed">Retrasado</option>
            </select>
          </div>
          <button
            onClick={() => {
              setEditingWP({});
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Nuevo Work Package
          </button>
        </div>
      </div>

      {/* Tabla de Work Packages */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paquete</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PV</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EV</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">AC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CV</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CPI</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Comp</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWorkPackages.map(wp => {
                const wpCV = wp.earnedValue - wp.actualCost;
                const wpCPI = wp.actualCost > 0 ? wp.earnedValue / wp.actualCost : 1;
                return (
                  <tr key={wp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{wp.wbs}</td>
                    <td className="px-4 py-3 text-sm font-medium">{wp.name}</td>
                    <td className="px-4 py-3 text-sm text-right">${(wp.budget / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-28 text-right border rounded px-2 py-1"
                        value={Number(wp.plannedValue || 0)}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value || 0));
                          updateWP(wp.id, p => { 
                            p.plannedValue = val; 
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-right">${(wp.earnedValue / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-28 text-right border rounded px-2 py-1"
                        value={Number(wp.actualCost || 0)}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value || 0));
                          updateWP(wp.id, p => { 
                            p.actualCost = val; 
                          });
                        }}
                      />
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${getPerformanceColor(wpCV)}`}>
                      ${(wpCV / 1000).toFixed(0)}K
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${getPerformanceColor(wpCPI, true)}`}>
                      {wpCPI.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: wp.percentComplete + '%' }} 
                          />
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-16 text-center border rounded px-1 py-0.5 text-xs"
                          value={Number(wp.percentComplete || 0)}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                            updateWP(wp.id, p => { 
                              p.percentComplete = val; 
                              p.earnedValue = (val / 100) * p.plannedValue;
                            });
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(wp.status)}`}>
                        {getStatusIcon(wp.status)} {wp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleEditWP(wp)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteWP(wp.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar/editar Work Package */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingWP?.id ? 'Editar Work Package' : 'Nuevo Work Package'}
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WBS *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.wbs || ''}
                    onChange={(e) => updateEditingWP('wbs', e.target.value)}
                    placeholder="1.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.name || ''}
                    onChange={(e) => updateEditingWP('name', e.target.value)}
                    placeholder="Nombre del paquete"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.budget || ''}
                    onChange={(e) => updateEditingWP('budget', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Planificado (PV)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.plannedValue || ''}
                    onChange={(e) => updateEditingWP('plannedValue', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.startDate || ''}
                    onChange={(e) => updateEditingWP('startDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.endDate || ''}
                    onChange={(e) => updateEditingWP('endDate', e.target.value)}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingWP?.description || ''}
                    onChange={(e) => updateEditingWP('description', e.target.value)}
                    placeholder="Descripción del paquete de trabajo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddWP}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Work Package */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editar Paquete de Trabajo</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WBS *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.wbs || ''}
                    onChange={(e) => updateEditingWP('wbs', e.target.value)}
                    placeholder="1.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.name || ''}
                    onChange={(e) => updateEditingWP('name', e.target.value)}
                    placeholder="Nombre del paquete"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.budget || ''}
                    onChange={(e) => updateEditingWP('budget', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Planificado (PV)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.plannedValue || ''}
                    onChange={(e) => updateEditingWP('plannedValue', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Ganado (EV)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.earnedValue || ''}
                    onChange={(e) => updateEditingWP('earnedValue', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Real (AC)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.actualCost || ''}
                    onChange={(e) => updateEditingWP('actualCost', Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Completado</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.percentComplete || ''}
                    onChange={(e) => updateEditingWP('percentComplete', Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.status || 'pending'}
                    onChange={(e) => updateEditingWP('status', e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="completed">Completado</option>
                    <option value="delayed">Retrasado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.startDate || ''}
                    onChange={(e) => updateEditingWP('startDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.endDate || ''}
                    onChange={(e) => updateEditingWP('endDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gerente</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingWP?.manager || ''}
                    onChange={(e) => updateEditingWP('manager', e.target.value)}
                    placeholder="Nombre del gerente"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingWP?.description || ''}
                    onChange={(e) => updateEditingWP('description', e.target.value)}
                    placeholder="Descripción del paquete de trabajo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

export default WorkPackagesManagement;
