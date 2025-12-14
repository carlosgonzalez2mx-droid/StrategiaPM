import { logger } from '../utils/logger';

/**
 * PortfolioDashboard.js - Premium Colorful Design
 */

import React, { useMemo, useState, useEffect } from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';
import FileManager from './FileManager';
import usePermissions from '../hooks/usePermissions';
import subscriptionService from '../services/SubscriptionService';
import supabaseService from '../services/SupabaseService';

// Premium UI Components
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

// Componente para mostrar errores de validación
const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    {error}
  </p>;
};

const PortfolioDashboard = ({
  projects,
  currentProjectId,
  setCurrentProjectId,
  portfolioMetrics,
  workPackages,
  risks,
  globalResources,
  setGlobalResources,
  tasksByProject,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  archiveProject,
  includeWeekendsByProject,
  setIncludeWeekendsByProject,
  getCurrentProjectIncludeWeekends,
  triggerNewProject = false,
  onNewProjectTriggered
}) => {
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProjectInternal] = useState(null);
  const [errors, setErrors] = useState({});
  const [organizationId, setOrganizationId] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscriptionLimit, setSubscriptionLimit] = useState(null);

  const setEditingProject = (updater) => {
    if (typeof updater === 'function') {
      setEditingProjectInternal(updater);
    } else {
      setEditingProjectInternal(prev => {
        if (updater === null) return null;
        if (!prev) return updater;
        return { ...prev, ...updater };
      });
    }
  };

  const { permissions, isReadOnly, isLoading: permissionsLoading } = usePermissions();

  const sortProjects = (projectList) => {
    return [...projectList].sort((a, b) => {
      const nameA = a.name.trim();
      const nameB = b.name.trim();
      const startsWithNumberA = /^\d/.test(nameA);
      const startsWithNumberB = /^\d/.test(nameB);

      if (startsWithNumberA && startsWithNumberB) {
        const numA = parseInt(nameA.match(/^\d+/)[0]);
        const numB = parseInt(nameB.match(/^\d+/)[0]);
        if (numA !== numB) return numA - numB;
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      }
      if (startsWithNumberA) return -1;
      if (startsWithNumberB) return 1;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300';
      case 'medium': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-amber-300';
      case 'low': return 'bg-gradient-to-r from-emerald-400 to-green-500 text-white border-emerald-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-300';
      case 'completed': return 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-emerald-300';
      case 'on-hold': return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-300';
      case 'cancelled': return 'bg-gradient-to-r from-red-500 to-pink-600 text-white border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const updateProjectField = (fieldName, value) => {
    setEditingProject(prev => ({ ...prev, [fieldName]: value }));
  };

  const validateField = (fieldName, value) => {
    const newErrors = Object.assign({}, errors);
    switch (fieldName) {
      case 'name':
        if (!value || value.trim().length < 3) newErrors.name = 'Mínimo 3 caracteres';
        else delete newErrors.name;
        break;
      case 'manager':
      case 'sponsor':
        if (!value || value.trim().length < 2) newErrors[fieldName] = 'Mínimo 2 caracteres';
        else delete newErrors[fieldName];
        break;
      case 'startDate':
        if (!value) newErrors.startDate = 'Requerido';
        else delete newErrors.startDate;
        break;
      case 'endDate':
        if (!value) newErrors.endDate = 'Requerido';
        else if (editingProject?.startDate && value <= editingProject.startDate) newErrors.endDate = 'Debe ser posterior al inicio';
        else delete newErrors.endDate;
        break;
      case 'budget':
        if (!value || value <= 0) newErrors.budget = 'Mayor a 0';
        else delete newErrors.budget;
        break;
      default: break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditProject = (project) => {
    const projectToEdit = {
      ...project,
      description: project.description || '',
      objective: project.objective || '',
      businessCase: project.businessCase || '',
      kickoffDate: project.kickoffDate || '',
      stakeholders: project.stakeholders || [],
      budget: Number(project.budget),
      contingencyReserve: Number(project.contingencyReserve || 0),
      managementReserve: Number(project.managementReserve || 0),
      irr: Number(project.irr || 0),
      roi: Number(project.roi || 0),
    };
    setEditingProject(projectToEdit);
    setErrors({});
    setShowProjectModal(true);
  };

  const handleNewProject = () => {
    setEditingProject({
      id: '',
      name: '',
      description: '',
      status: 'active',
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
    setShowProjectModal(true);
  };

  useEffect(() => {
    if (triggerNewProject) {
      handleNewProject();
      if (onNewProjectTriggered) onNewProjectTriggered();
    }
  }, [triggerNewProject, onNewProjectTriggered]);

  useEffect(() => {
    const fetchOrganizationId = () => {
      const orgId = supabaseService.getCurrentOrganization();
      if (orgId) setOrganizationId(orgId);
    };
    fetchOrganizationId();
    const timer = setTimeout(() => { if (!organizationId) fetchOrganizationId(); }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveProject = async () => {
    setErrors({});
    const newErrors = {};

    if (!editingProject.name || editingProject.name.trim().length < 3) newErrors.name = 'Mínimo 3 caracteres';
    if (!editingProject.manager || editingProject.manager.trim().length < 2) newErrors.manager = 'Mínimo 2 caracteres';
    if (!editingProject.startDate) newErrors.startDate = 'Requerido';
    if (!editingProject.endDate) newErrors.endDate = 'Requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!editingProject.id && organizationId) {
      try {
        const canCreate = await subscriptionService.canCreateProject(organizationId);
        if (!canCreate.allowed) {
          setSubscriptionLimit(canCreate);
          setShowUpgradeModal(true);
          return;
        }
      } catch (error) {
        logger.error('Error verificando límites:', error);
      }
    }

    try {
      if (editingProject.id) {
        updateProject(editingProject.id, editingProject);
      } else {
        createProject(editingProject);
      }
      setShowProjectModal(false);
      setEditingProject(null);
      setErrors({});
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const calculatedMetrics = useMemo(() => {
    if (!projects || projects.length === 0) return { totalProjects: 0, activeProjects: 0, completedProjects: 0, totalBudget: 0 };
    const activeProjects = projects.filter(p => p.status === 'active');
    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalBudget: activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0)
    };
  }, [projects]);

  const metrics = portfolioMetrics || calculatedMetrics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* KPIs del Portfolio - Premium Colorful */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-blue-100 uppercase mb-2">Total Proyectos</p>
            <p className="text-4xl font-bold">{metrics.totalProjects}</p>
            <div className="text-2xl mt-2 opacity-80">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-emerald-100 uppercase mb-2">Activos</p>
            <p className="text-4xl font-bold">{metrics.activeProjects}</p>
            <div className="text-2xl mt-2 opacity-80">🔄</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-purple-100 uppercase mb-2">Completados</p>
            <p className="text-4xl font-bold">{metrics.completedProjects}</p>
            <div className="text-2xl mt-2 opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
          <div className="relative z-10">
            <p className="text-xs font-medium text-amber-100 uppercase mb-2">Presupuesto</p>
            <p className="text-4xl font-bold">${(metrics.totalBudget / 1000).toFixed(0)}K</p>
            <div className="text-2xl mt-2 opacity-80">💰</div>
          </div>
        </div>
      </div>

      {/* Header Acciones */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="text-3xl">📋</span>
          Proyectos del Portafolio
        </h2>
        <div className="flex gap-2">
          {permissions.canEdit && (
            <Button onClick={handleNewProject} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/30">
              ➕ Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="space-y-4 max-w-full overflow-hidden" style={{ maxWidth: 'calc(100vw - 300px)' }}>
        {projects.length === 0 ? (
          <Card className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300">
            <CardContent>
              <div className="text-5xl mb-4 opacity-30">📂</div>
              <p className="text-slate-600 text-lg font-medium">No hay proyectos en el portafolio.</p>
              {permissions.canEdit && (
                <Button onClick={handleNewProject} className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  ✨ Crear Primer Proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortProjects(projects).map((project) => (
            <div
              key={project.id}
              className={cn(
                "bg-white rounded-2xl p-6 transition-all duration-200 cursor-pointer border-2",
                currentProjectId === project.id
                  ? "border-blue-500 shadow-xl shadow-blue-500/20"
                  : "border-slate-200 hover:border-blue-300 hover:shadow-lg"
              )}
              onClick={() => setCurrentProjectId(project.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-slate-900 truncate">{project.name}</h3>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold shadow-lg", getPriorityColor(project.priority))}>
                      {project.priority}
                    </span>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold shadow-lg", getStatusColor(project.status))}>
                      {project.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-lg">📅</span>
                      <span className="font-medium">{project.startDate} - {project.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-lg">💰</span>
                      <span className="font-bold">${(project.budget / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-lg">👤</span>
                      <span className="truncate font-medium">{project.manager}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setSelectedProjectForFiles(project); setShowFileManager(true); }}
                    title="Archivos"
                    className="text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                  >
                    📎
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
                    title="Duplicar"
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    📋
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                    title="Editar"
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    ✏️
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Eliminar proyecto "${project.name}"?`)) deleteProject(project.id);
                    }}
                    title="Eliminar"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      <CorporateAlerts projects={projects} portfolioMetrics={portfolioMetrics} />

      {/* Modal Crear/Editar - Premium */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-blue-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{editingProject?.id ? '✏️ Editar Proyecto' : '✨ Nuevo Proyecto'}</h2>
                <Button size="icon" variant="ghost" onClick={() => setShowProjectModal(false)} className="text-white hover:bg-white/20">✕</Button>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className={cn("w-full px-4 py-3 bg-white border-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none", errors.name ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.name || ''}
                    onChange={(e) => { updateProjectField('name', e.target.value); validateField('name', e.target.value); }}
                    placeholder="Ej. Implementación ERP"
                  />
                  <ErrorMessage error={errors.name} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Manager *</label>
                  <input
                    type="text"
                    className={cn("w-full px-4 py-3 bg-white border-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none", errors.manager ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.manager || ''}
                    onChange={(e) => { updateProjectField('manager', e.target.value); validateField('manager', e.target.value); }}
                    placeholder="Gerente del proyecto"
                  />
                  <ErrorMessage error={errors.manager} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Inicio *</label>
                  <input
                    type="date"
                    className={cn("w-full px-4 py-3 bg-white border-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none", errors.startDate ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.startDate || ''}
                    onChange={(e) => { updateProjectField('startDate', e.target.value); validateField('startDate', e.target.value); }}
                  />
                  <ErrorMessage error={errors.startDate} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Fecha Fin *</label>
                  <input
                    type="date"
                    className={cn("w-full px-4 py-3 bg-white border-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none", errors.endDate ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.endDate || ''}
                    onChange={(e) => { updateProjectField('endDate', e.target.value); validateField('endDate', e.target.value); }}
                  />
                  <ErrorMessage error={errors.endDate} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Presupuesto ($) *</label>
                  <input
                    type="number"
                    className={cn("w-full px-4 py-3 bg-white border-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none", errors.budget ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.budget || ''}
                    onChange={(e) => { updateProjectField('budget', parseFloat(e.target.value)); validateField('budget', e.target.value); }}
                  />
                  <ErrorMessage error={errors.budget} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Estado</label>
                  <select
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={editingProject?.status || 'active'}
                    onChange={(e) => updateProjectField('status', e.target.value)}
                  >
                    <option value="active">Activo</option>
                    <option value="on-hold">En Espera</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t-2 border-slate-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowProjectModal(false)} className="hover:bg-slate-100">Cancelar</Button>
                <Button onClick={handleSaveProject} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  {editingProject?.id ? '💾 Guardar Cambios' : '✨ Crear Proyecto'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Manager Modal */}
      {showFileManager && selectedProjectForFiles && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-purple-200">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">📎</div>
                <div>
                  <h2 className="text-2xl font-bold">Archivos del Proyecto</h2>
                  <p className="text-purple-100 text-sm">{selectedProjectForFiles.name}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowFileManager(false)} className="text-white hover:bg-white/20">Cerrar</Button>
            </div>
            <div className="p-0">
              <FileManager
                projectId={selectedProjectForFiles.id}
                category="general"
                isContextual={true}
                title=""
                onFileUploaded={() => { }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PortfolioDashboard;
