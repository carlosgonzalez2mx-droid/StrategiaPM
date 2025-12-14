import { logger } from '../utils/logger';

/**
 * PortfolioStrategic.js
 *
 * Componente principal del Portfolio con diseño premium y colorido
 */

import React, { useState, useEffect } from 'react';
import PortfolioDashboard from './PortfolioDashboard';
import ResourceList from './ResourceList';
import WeeklyPlanningTab from './WeeklyPlanningTab';
import NotificationBadge from './notifications/NotificationBadge';
import UsageIndicator from './subscription/UsageIndicator';
import { calculatePlannedValueFromIRR } from '../utils/businessValueCalculator';
import FloatingSaveButton from './FloatingSaveButton';

// Premium UI Components
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

const PortfolioStrategic = ({
  projects,
  setProjects,
  currentProjectId,
  setCurrentProjectId,
  portfolioMetrics,
  workPackages,
  risks,
  globalResources,
  setGlobalResources,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  tasks,
  tasksByProject,
  minutasByProject,
  purchaseOrders,
  advances,
  invoices,
  contracts,
  auditLogs,
  includeWeekendsByProject,
  setIncludeWeekendsByProject,
  getCurrentProjectIncludeWeekends,
  useSupabase,
  hasUnsavedChanges = false,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [triggerNewProject, setTriggerNewProject] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [selectedArchivedProject, setSelectedArchivedProject] = useState(null);
  const [showArchivedDetails, setShowArchivedDetails] = useState(false);
  const [weeklyPlanningData, setWeeklyPlanningData] = useState({
    dateRange: {
      start: getStartOfWeek(new Date()),
      end: getEndOfWeek(new Date())
    },
    previousWeekCompliance: null,
    projectTasks: {}
  });
  const [organizationId, setOrganizationId] = useState(null);

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getEndOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(d.setDate(diff));
  }

  const handleNewProject = () => {
    setActiveTab('projects');
    setTriggerNewProject(true);
  };

  const handleNewProjectTriggered = () => {
    setTriggerNewProject(false);
  };

  useEffect(() => {
    try {
      const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
      if (portfolioData) {
        const portfolio = JSON.parse(portfolioData);
        setOrganizationId(portfolio?.organization?.id);
      }
    } catch (error) {
      logger.error('Error obteniendo organizationId:', error);
    }
  }, []);

  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      logger.debug('🔄 PortfolioStrategic: Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });
    };

    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const canArchiveProject = (project) => {
    const validations = [];
    const projectTasks = tasks.filter(task =>
      task.workPackageId === project.id || task.projectId === project.id
    );

    if (project.progress < 100) {
      validations.push(`El proyecto debe estar 100% completado (actual: ${project.progress}%)`);
    }

    const incompleteTasks = projectTasks.filter(task =>
      task.progress < 100 && task.status !== 'completed'
    );
    if (incompleteTasks.length > 0) {
      validations.push(`Todas las tareas deben estar completadas (${incompleteTasks.length} tareas pendientes)`);
    }

    const tasksWithDependencies = projectTasks.filter(task =>
      task.predecessors && task.predecessors.length > 0
    );
    const tasksWithIncompleteDependencies = tasksWithDependencies.filter(task => {
      const predecessorTasks = task.predecessors.map(predId =>
        projectTasks.find(t => t.id === predId)
      ).filter(Boolean);
      return predecessorTasks.some(pred => pred.progress < 100);
    });
    if (tasksWithIncompleteDependencies.length > 0) {
      validations.push('No debe haber dependencias activas con tareas incompletas');
    }

    const projectPurchaseOrders = purchaseOrders.filter(po => po.projectId === project.id);
    if (projectPurchaseOrders.some(po => po.status === 'pending')) {
      validations.push('Órdenes de compra pendientes');
    }

    return {
      canArchive: validations.length === 0,
      validations: validations
    };
  };

  const handleArchiveProject = (projectId) => {
    const projectToArchive = projects.find(p => p.id === projectId);
    if (!projectToArchive) return;

    const validation = canArchiveProject(projectToArchive);
    if (!validation.canArchive) {
      const validationMessage = validation.validations.join('\n• ');
      alert(`❌ No se puede archivar el proyecto "${projectToArchive.name}"\n\nRazones:\n• ${validationMessage}\n\nPor favor, complete todos los requisitos antes de archivar.`);
      return;
    }

    if (!window.confirm(`¿Está seguro de que desea archivar el proyecto "${projectToArchive.name}"?`)) {
      return;
    }

    const archivedProject = {
      ...projectToArchive,
      status: 'archived',
      archivedAt: new Date().toISOString(),
      archivedBy: 'Usuario Actual'
    };

    setArchivedProjects(prev => [...prev, archivedProject]);

    const updatedProjects = projects.map(p =>
      p.id === projectId ? { ...p, status: 'archived', archivedAt: new Date().toISOString() } : p
    );

    setProjects(updatedProjects);

    if (currentProjectId === projectId) {
      const activeProjects = updatedProjects.filter(p => p.status === 'active');
      if (activeProjects.length > 0) {
        setCurrentProjectId(activeProjects[0].id);
      }
    }
    alert(`✅ Proyecto "${projectToArchive.name}" archivado exitosamente.`);
  };

  const viewArchivedProject = (project) => {
    setSelectedArchivedProject(project);
    setShowArchivedDetails(true);
  };

  const handleDuplicateProject = (projectId) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (!projectToDuplicate) return;

    const duplicatedProject = {
      ...projectToDuplicate,
      id: 'proj-' + String(Date.now()).slice(-6),
      name: `${projectToDuplicate.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createProject(duplicatedProject);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'on-hold': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'archived': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      case 'archived': return '📁';
      default: return '⚪';
    }
  };

  const tabs = [
    { id: 'projects', name: 'Lista de Proyectos', icon: '📋' },
    { id: 'resources', name: 'Lista de Recursos', icon: '👥' },
    { id: 'weekly-planning', name: 'Planificación Semanal', icon: '📅' },
    { id: 'archive', name: 'Archivado', icon: '📁' }
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 min-h-screen">
      {/* Premium Colorful Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
              <span className="text-4xl">🏢</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Portafolio de Proyectos</h1>
              <p className="text-blue-100 text-sm mt-1">Gestión estratégica y control centralizado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {organizationId && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                <UsageIndicator
                  organizationId={organizationId}
                  variant="compact"
                />
              </div>
            )}
            <NotificationBadge />
          </div>
        </div>
      </div>

      {/* Premium Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3 px-5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">


        {/* Tab: Lista de Proyectos */}
        {activeTab === 'projects' && (
          <PortfolioDashboard
            projects={projects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            portfolioMetrics={portfolioMetrics}
            workPackages={workPackages}
            risks={risks}
            globalResources={globalResources}
            setGlobalResources={setGlobalResources}
            tasksByProject={tasksByProject}
            createProject={createProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
            duplicateProject={handleDuplicateProject}
            archiveProject={handleArchiveProject}
            includeWeekendsByProject={includeWeekendsByProject}
            setIncludeWeekendsByProject={setIncludeWeekendsByProject}
            getCurrentProjectIncludeWeekends={getCurrentProjectIncludeWeekends}
            triggerNewProject={triggerNewProject}
            onNewProjectTriggered={handleNewProjectTriggered}
          />
        )}

        {/* Tab: Lista de Recursos */}
        {activeTab === 'resources' && (
          <ResourceList
            globalResources={globalResources}
            setGlobalResources={setGlobalResources}
          />
        )}

        {/* Tab: Planificación Semanal */}
        {activeTab === 'weekly-planning' && (
          <WeeklyPlanningTab
            projects={projects}
            tasksByProject={tasksByProject}
            minutasByProject={minutasByProject}
            weeklyPlanningData={weeklyPlanningData}
            setWeeklyPlanningData={setWeeklyPlanningData}
            useSupabase={useSupabase}
          />
        )}

        {/* Tab: Archivado */}
        {activeTab === 'archive' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <Card className="shadow-xl border-2 border-blue-100">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="text-blue-900">Proyectos Activos</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {projects.filter(p => p.status === 'active').length === 0 ? (
                  <p className="text-slate-500 py-8 text-center italic">No hay proyectos activos para archivar</p>
                ) : (
                  <div className="space-y-3">
                    {projects.filter(p => p.status === 'active').map(project => {
                      const { canArchive, validations } = canArchiveProject(project);

                      return (
                        <div key={project.id} className="p-4 rounded-xl border-2 border-slate-200 bg-white hover:shadow-lg hover:border-blue-300 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-900">{project.name}</h4>
                              <p className="text-sm text-slate-500 mb-2">{project.description}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getStatusColor(project.status))}>
                                  {project.status}
                                </span>
                                <span className="text-xs text-slate-400">Progreso: {project.progress}%</span>
                              </div>
                              {!canArchive && (
                                <div className="mt-3 bg-amber-50 rounded-lg p-3 border-2 border-amber-200 text-xs text-amber-800">
                                  <strong className="flex items-center gap-1">
                                    <span>⚠️</span>
                                    Requisitos pendientes:
                                  </strong>
                                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                    {validations.map((v, i) => <li key={i}>{v}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={canArchive ? "default" : "secondary"}
                              disabled={!canArchive}
                              onClick={() => handleArchiveProject(project.id)}
                              className={cn("shrink-0 ml-4", canArchive && "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg")}
                            >
                              📁 Archivar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
                <CardTitle className="text-purple-900">Archivo Histórico</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {archivedProjects.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center italic">El archivo está vacío</p>
                ) : (
                  <div className="space-y-3">
                    {archivedProjects.map(project => (
                      <div key={project.id} className="p-4 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border-2 border-slate-200 opacity-75 hover:opacity-100 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-700">{project.name}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">📁 Archivado</span>
                              <span className="text-xs text-slate-400">{new Date(project.archivedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => viewArchivedProject(project)} className="hover:bg-purple-100">
                            👁️ Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}


      </div>
    </div>
  );
};

export default PortfolioStrategic;
