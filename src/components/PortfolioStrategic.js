import { logger } from '../utils/logger';

/**
 * PortfolioStrategic.js
 *
 * Componente principal del Portfolio que contiene los TABS:
 * - Overview: Vista estratégica con métricas y proyecto destacado
 * - Lista de Proyectos: Muestra PortfolioDashboard (tabla de proyectos)
 * - Recursos: Gestión de recursos
 * - Archivo: Proyectos archivados
 * - Planeación Semanal: Planificación semanal
 *
 * Creación de proyectos:
 * - El botón "Crear Primer Proyecto" (cuando no hay proyectos) cambia al tab
 *   "Lista de Proyectos" y abre el modal de PortfolioDashboard.
 * - Todas las operaciones de creación/edición usan el modal de PortfolioDashboard.
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
  const [activeTab, setActiveTab] = useState('overview');
  const [triggerNewProject, setTriggerNewProject] = useState(false); // Para triggear modal en PortfolioDashboard
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

  // Helper functions for date range
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

  // Función para manejar la creación de nuevo proyecto
  // Cambia al tab "projects" y triggerea el modal de PortfolioDashboard
  const handleNewProject = () => {
    setActiveTab('projects');
    setTriggerNewProject(true);
  };

  // Callback para resetear el trigger después de que se procese
  const handleNewProjectTriggered = () => {
    setTriggerNewProject(false);
  };

  // Obtener organizationId al cargar
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

  // 🚀 NUEVO: Escuchar eventos de actualización de tareas de minutas
  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      logger.debug('🔄 PortfolioStrategic: Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });
      // Forzar re-render implícito
    };

    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Función para validar si un proyecto puede ser archivado
  const canArchiveProject = (project) => {
    const validations = [];
    const projectTasks = tasks.filter(task =>
      task.workPackageId === project.id || task.projectId === project.id
    );

    // 1. Verificar que el proyecto esté completado (100% de progreso)
    if (project.progress < 100) {
      validations.push(`El proyecto debe estar 100% completado (actual: ${project.progress}%)`);
    }

    // 2. Verificar que todas las tareas estén finalizadas
    const incompleteTasks = projectTasks.filter(task =>
      task.progress < 100 && task.status !== 'completed'
    );
    if (incompleteTasks.length > 0) {
      validations.push(`Todas las tareas deben estar completadas (${incompleteTasks.length} tareas pendientes)`);
    }

    // 3. Verificar que no haya dependencias activas
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

    // 4. (Simplificado) Documentación y Aprobaciones
    const projectPurchaseOrders = purchaseOrders.filter(po => po.projectId === project.id);
    if (projectPurchaseOrders.some(po => po.status === 'pending')) {
      validations.push('Órdenes de compra pendientes');
    }

    return {
      canArchive: validations.length === 0,
      validations: validations
    };
  };

  // Función para archivar proyecto
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
    { id: 'overview', name: 'Vista General', icon: '📊' },
    { id: 'projects', name: 'Lista de Proyectos', icon: '📋' },
    { id: 'resources', name: 'Lista de Recursos', icon: '👥' },
    { id: 'weekly-planning', name: 'Planificación Semanal', icon: '📅' },
    { id: 'archive', name: 'Archivado', icon: '📁' },
    { id: 'metrics', name: 'Métricas', icon: '📈' }
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden p-6 bg-slate-50/50 min-h-screen">
      {/* Premium Header */}
      <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
            <span className="text-2xl">🏢</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portafolio de Proyectos</h1>
            <p className="text-slate-500 text-sm">Gestión estratégica y control centralizado</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {organizationId && (
            <UsageIndicator
              organizationId={organizationId}
              variant="compact"
            />
          )}
          <NotificationBadge />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10 mx-[-1.5rem] px-6 shadow-sm">
        <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-brand-500 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[500px]">
        {/* Tab: Vista General */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Empty State */}
            {projects.length === 0 && (
              <Card className="text-center py-16">
                <CardContent className="flex flex-col items-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🚀</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">¡Bienvenido a StrategiaPM!</h3>
                  <p className="text-slate-500 max-w-md mb-8">
                    Tu espacio central para gestionar proyectos de manera profesional. Comienza creando tu primer proyecto.
                  </p>
                  <Button onClick={handleNewProject} size="lg" variant="default" className="shadow-lg shadow-brand-500/20">
                    Crear Primer Proyecto
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Metrics Grid */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Proyectos</h3>
                      <span className="text-2xl">📊</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{projects.length}</div>
                    <div className="text-sm text-slate-500">
                      {projects.filter(p => p.status === 'active').length} activos
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Presupuesto Activo</h3>
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      ${(projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.budget, 0) / 1000).toFixed(0)}K
                    </div>
                    <div className="text-sm text-slate-500">Total comprometido</div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Alta Prioridad</h3>
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {projects.filter(p => p.priority === 'high' && p.status === 'active').length}
                    </div>
                    <div className="text-sm text-slate-500">Proyectos críticos</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Featured Project */}
            {projects.length > 0 && currentProject && (
              <Card>
                <CardHeader>
                  <CardTitle>Proyecto Destacado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          {currentProject.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 leading-tight">{currentProject.name}</h4>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-block mt-1", getStatusColor(currentProject.status))}>
                            {currentProject.status}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500">Gerente</p>
                          <p className="font-medium text-slate-900">{currentProject.manager}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Sponsor</p>
                          <p className="font-medium text-slate-900">{currentProject.sponsor}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <h5 className="font-medium text-slate-900 mb-4">Salud Financiera</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Presupuesto Total</span>
                          <span className="font-mono font-medium text-slate-900">${(currentProject.budget / 1000).toFixed(1)}k</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Reservas</span>
                          <span className="font-mono font-medium text-slate-900">${((currentProject.contingencyReserve + currentProject.managementReserve) / 1000).toFixed(1)}k</span>
                        </div>
                        {currentProject.irr > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Rentabilidad (TIR)</span>
                            <span className="font-mono font-medium text-emerald-600">+{currentProject.irr}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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
            <Card>
              <CardHeader>
                <CardTitle>Proyectos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                {projects.filter(p => p.status === 'active').length === 0 ? (
                  <p className="text-slate-500 py-8 text-center italic">No hay proyectos activos para archivar</p>
                ) : (
                  <div className="space-y-3">
                    {projects.filter(p => p.status === 'active').map(project => {
                      const { canArchive, validations } = canArchiveProject(project);

                      return (
                        <div key={project.id} className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-sm transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-slate-900">{project.name}</h4>
                              <p className="text-sm text-slate-500 mb-2">{project.description}</p>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", getStatusColor(project.status))}>
                                  {project.status}
                                </span>
                                <span className="text-xs text-slate-400">Progreso: {project.progress}%</span>
                              </div>
                              {!canArchive && (
                                <div className="mt-3 bg-amber-50 rounded p-2 border border-amber-100 text-xs text-amber-800">
                                  <strong>Requisitos pendientes:</strong>
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
                              className="shrink-0 ml-4"
                            >
                              Archivar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Archivo Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                {archivedProjects.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center italic">El archivo está vacío</p>
                ) : (
                  <div className="space-y-3">
                    {archivedProjects.map(project => (
                      <div key={project.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-slate-700">{project.name}</h4>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Archivado</span>
                              <span className="text-xs text-slate-400">{new Date(project.archivedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => viewArchivedProject(project)}>
                            Ver
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

        {/* Tab: Métricas */}
        {activeTab === 'metrics' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">📈</div>
                <CardTitle>Análisis del Portafolio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800 flex items-center gap-3">
                <span>ℹ️</span>
                Las métricas financieras solo consideran proyectos con estado "Activo".
              </div>
              <div className="divide-y divide-slate-100">
                {['active', 'completed', 'on-hold', 'cancelled'].map(status => {
                  const count = projects.filter(p => p.status === status).length;
                  const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                  return (
                    <div key={status} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(status)}</span>
                        <span className="capitalize font-medium text-slate-700">{status}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 max-w-xs ml-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              status === 'active' ? 'bg-emerald-500' :
                                status === 'completed' ? 'bg-blue-500' :
                                  status === 'cancelled' ? 'bg-red-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-slate-500 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PortfolioStrategic;
