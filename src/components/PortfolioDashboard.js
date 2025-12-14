import { logger } from '../utils/logger';

/**
 * PortfolioDashboard.js
 *
 * Componente que muestra la lista de proyectos en formato de tabla/dashboard.
 * Se usa dentro del TAB "Lista de Proyectos" en PortfolioStrategic.
 *
 * Contiene su propio modal de creación/edición de proyectos.
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
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'on-hold': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
      // Ensure numeric values are preserved
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
      status: 'active', // Default to active for new UX
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

      {/* KPIs del Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Proyectos</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalProjects}</p>
            </div>
            <div className="text-blue-500 text-2xl">📊</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Activos</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.activeProjects}</p>
            </div>
            <div className="text-emerald-500 text-2xl">🔄</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Completados</p>
              <p className="text-2xl font-bold text-slate-900">{metrics.completedProjects}</p>
            </div>
            <div className="text-indigo-500 text-2xl">✅</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Presupuesto Activo</p>
              <p className="text-2xl font-bold text-slate-900">${(metrics.totalBudget / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-violet-500 text-2xl">💰</div>
          </CardContent>
        </Card>
      </div>

      {/* Header Acciones */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Proyectos del Portafolio</h2>
        <div className="flex gap-2">
          {permissions.canEdit && (
            <Button onClick={handleNewProject} className="bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 shadow-lg">
              ➕ Nuevo Proyecto
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="space-y-3">
        {projects.length === 0 ? (
          <Card className="text-center py-12 border-dashed border-2 border-slate-200">
            <CardContent>
              <div className="text-4xl mb-4 opacity-20">📂</div>
              <p className="text-slate-500">No hay proyectos en el portafolio.</p>
              {permissions.canEdit && (
                <Button onClick={handleNewProject} variant="outline" className="mt-4">
                  Crear Primer Proyecto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortProjects(projects).map((project) => (
            <Card
              key={project.id}
              className={cn(
                "transition-all duration-200 cursor-pointer hover:shadow-md border-transparent hover:border-slate-300",
                currentProjectId === project.id ? "ring-2 ring-brand-500 ring-offset-2" : "border border-slate-200"
              )}
              onClick={() => setCurrentProjectId(project.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-slate-900 truncate">{project.name}</h3>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(project.status))}>
                        {project.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{project.startDate} - {project.endDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>💰</span>
                        <span>${(project.budget / 1000).toFixed(0)}k</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>👤</span>
                        <span className="truncate">{project.manager}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setSelectedProjectForFiles(project); setShowFileManager(true); }}
                      title="Archivos"
                      className="text-slate-400 hover:text-purple-600"
                    >
                      📎
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); duplicateProject(project.id); }}
                      title="Duplicar"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      📋
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                      title="Editar"
                      className="text-slate-400 hover:text-brand-600"
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
                      className="text-slate-400 hover:text-red-600"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <PortfolioCharts projects={projects} portfolioMetrics={portfolioMetrics} workPackages={workPackages} risks={risks} tasksByProject={tasksByProject} includeWeekendsByProject={includeWeekendsByProject} setIncludeWeekendsByProject={setIncludeWeekendsByProject} getCurrentProjectIncludeWeekends={getCurrentProjectIncludeWeekends} />
      <CorporateAlerts projects={projects} portfolioMetrics={portfolioMetrics} />


      {/* Modal Crear/Editar */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-0">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <CardTitle>{editingProject?.id ? 'Editar Proyecto' : 'Nuevo Proyecto'}</CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowProjectModal(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className={cn("w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none", errors.name ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.name || ''}
                    onChange={(e) => { updateProjectField('name', e.target.value); validateField('name', e.target.value); }}
                    placeholder="Ej. Implementación ERP"
                  />
                  <ErrorMessage error={errors.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Manager *</label>
                  <input
                    type="text"
                    className={cn("w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none", errors.manager ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.manager || ''}
                    onChange={(e) => { updateProjectField('manager', e.target.value); validateField('manager', e.target.value); }}
                    placeholder="Gerente del proyecto"
                  />
                  <ErrorMessage error={errors.manager} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha Inicio *</label>
                  <input
                    type="date"
                    className={cn("w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none", errors.startDate ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.startDate || ''}
                    onChange={(e) => { updateProjectField('startDate', e.target.value); validateField('startDate', e.target.value); }}
                  />
                  <ErrorMessage error={errors.startDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha Fin *</label>
                  <input
                    type="date"
                    className={cn("w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none", errors.endDate ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.endDate || ''}
                    onChange={(e) => { updateProjectField('endDate', e.target.value); validateField('endDate', e.target.value); }}
                  />
                  <ErrorMessage error={errors.endDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Presupuesto ($) *</label>
                  <input
                    type="number"
                    className={cn("w-full px-3 py-2 bg-white border rounded-lg text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none", errors.budget ? "border-red-300 bg-red-50" : "border-slate-200")}
                    value={editingProject?.budget || ''}
                    onChange={(e) => { updateProjectField('budget', parseFloat(e.target.value)); validateField('budget', e.target.value); }}
                  />
                  <ErrorMessage error={errors.budget} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                  <select
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
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

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowProjectModal(false)}>Cancelar</Button>
                <Button onClick={handleSaveProject} className="bg-brand-600 hover:bg-brand-700 text-white">
                  {editingProject?.id ? 'Guardar Cambios' : 'Crear Proyecto'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* File Manager Modal */}
      {showFileManager && selectedProjectForFiles && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">📎</div>
                <div>
                  <CardTitle>Archivos del Proyecto</CardTitle>
                  <p className="text-sm text-slate-500">{selectedProjectForFiles.name}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowFileManager(false)}>Cerrar</Button>
            </CardHeader>
            <CardContent className="p-0">
              <FileManager
                projectId={selectedProjectForFiles.id}
                category="general"
                isContextual={true}
                title=""
                onFileUploaded={() => { }}
              />
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default PortfolioDashboard;
