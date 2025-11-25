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
import ProjectArchive from './ProjectArchive';
import WeeklyPlanningTab from './WeeklyPlanningTab';
import NotificationBadge from './notifications/NotificationBadge';
import UsageIndicator from './subscription/UsageIndicator';
import { calculatePlannedValueFromIRR } from '../utils/businessValueCalculator';


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
  useSupabase
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
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
      
      // Forzar re-render del componente para actualizar el Dashboard resumen
      logger.debug('🔄 PortfolioStrategic: Forzando re-render del Dashboard resumen...');
      // El componente se re-renderizará automáticamente cuando cambien los datos
    };

    // Agregar listener
    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);

    // Cleanup
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    };
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Función para validar si un proyecto puede ser archivado
  const canArchiveProject = (project) => {
    const validations = [];
    
    logger.debug('🔍 VALIDANDO ARCHIVADO para proyecto:', project.name);
    logger.debug('📊 Progreso del proyecto:', project.progress);
    logger.debug('📋 Total de tareas disponibles:', tasks.length);
    
    // 1. Verificar que el proyecto esté completado (100% de progreso)
    if (project.progress < 100) {
      validations.push(`El proyecto debe estar 100% completado (actual: ${project.progress}%)`);
    }
    
    // 2. Verificar que todas las tareas estén finalizadas
    // Filtrar tareas del proyecto actual
    const projectTasks = tasks.filter(task => 
      task.workPackageId === project.id || task.projectId === project.id
    );
    
    logger.debug('📋 Tareas del proyecto:', projectTasks.length);
    
    const incompleteTasks = projectTasks.filter(task => 
      task.progress < 100 && task.status !== 'completed'
    );
    
    logger.debug('❌ Tareas incompletas:', incompleteTasks.length);
    
    if (incompleteTasks.length > 0) {
      validations.push(`Todas las tareas deben estar completadas (${incompleteTasks.length} tareas pendientes)`);
    }
    
    // 3. Verificar que no haya dependencias activas
    // Verificar si hay tareas con dependencias no completadas
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
    
    // 4. Verificar que la documentación esté completa
    // Verificar si hay archivos pendientes o documentación incompleta
    const projectFiles = []; // Placeholder - en implementación real se conectaría con FileManager
    const requiredDocuments = ['Acta de Inicio', 'Cronograma', 'Presupuesto', 'Acta de Cierre'];
    const missingDocuments = requiredDocuments.filter(doc => 
      !projectFiles.some(file => file.name.includes(doc))
    );
    
    if (missingDocuments.length > 0) {
      validations.push(`Documentación incompleta: ${missingDocuments.join(', ')}`);
    }
    
    // 5. Verificar que tenga las aprobaciones necesarias
    // Verificar si hay órdenes de compra, facturas o contratos pendientes
    const projectPurchaseOrders = purchaseOrders.filter(po => 
      po.projectId === project.id || po.workPackageId === project.id
    );
    const projectInvoices = invoices.filter(inv => 
      inv.projectId === project.id || inv.workPackageId === project.id
    );
    const projectContracts = contracts.filter(contract => 
      contract.projectId === project.id || contract.workPackageId === project.id
    );
    
    const pendingApprovals = [];
    if (projectPurchaseOrders.some(po => po.status === 'pending')) {
      pendingApprovals.push('Órdenes de compra pendientes');
    }
    if (projectInvoices.some(inv => inv.status === 'pending')) {
      pendingApprovals.push('Facturas pendientes');
    }
    if (projectContracts.some(contract => contract.status === 'pending')) {
      pendingApprovals.push('Contratos pendientes');
    }
    
    if (pendingApprovals.length > 0) {
      validations.push(`Aprobaciones pendientes: ${pendingApprovals.join(', ')}`);
    }
    
    logger.debug('✅ Validaciones encontradas:', validations);
    logger.debug('🎯 Puede archivar:', validations.length === 0);
    
    return {
      canArchive: validations.length === 0,
      validations: validations
    };
  };

  // Función para archivar proyecto
  const handleArchiveProject = (projectId) => {
    const projectToArchive = projects.find(p => p.id === projectId);
    if (!projectToArchive) return;

    // Validar si el proyecto puede ser archivado
    const validation = canArchiveProject(projectToArchive);
    
    if (!validation.canArchive) {
      // Mostrar modal de validación
      const validationMessage = validation.validations.join('\n• ');
      alert(`❌ No se puede archivar el proyecto "${projectToArchive.name}"\n\nRazones:\n• ${validationMessage}\n\nPor favor, complete todos los requisitos antes de archivar.`);
      return;
    }

    // Confirmar archivado
    const confirmMessage = `¿Está seguro de que desea archivar el proyecto "${projectToArchive.name}"?\n\nEste proyecto será movido al archivo y ya no estará disponible para edición.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Agregar a la lista de archivados
    const archivedProject = {
      id: projectToArchive.id,
      name: projectToArchive.name,
      description: projectToArchive.description,
      startDate: projectToArchive.startDate,
      endDate: projectToArchive.endDate,
      budget: projectToArchive.budget,
      status: projectToArchive.status,
      priority: projectToArchive.priority,
      manager: projectToArchive.manager,
      team: projectToArchive.team,
      createdAt: projectToArchive.createdAt,
      updatedAt: projectToArchive.updatedAt,
      version: projectToArchive.version,
      progress: projectToArchive.progress,
      archivedAt: new Date().toISOString(),
      archivedBy: 'Usuario Actual' // En un sistema real, esto vendría del contexto de usuario
    };
    
    setArchivedProjects(prev => {
      const newArchived = prev.slice();
      newArchived.push(archivedProject);
      return newArchived;
    });
    
    // Cambiar el estado del proyecto a 'archived'
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { 
            id: p.id,
            name: p.name,
            description: p.description,
            startDate: p.startDate,
            endDate: p.endDate,
            budget: p.budget,
            status: 'archived',
            priority: p.priority,
            manager: p.manager,
            team: p.team,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            version: p.version,
            progress: p.progress,
            archivedAt: new Date().toISOString()
          }
        : p
    );
    
    setProjects(updatedProjects);
    
    // Si el proyecto archivado era el actual, cambiar a otro proyecto activo
    if (currentProjectId === projectId) {
      const activeProjects = updatedProjects.filter(p => p.status === 'active');
      if (activeProjects.length > 0) {
        setCurrentProjectId(activeProjects[0].id);
      }
    }

    // Mostrar confirmación de archivado exitoso
    alert(`✅ Proyecto "${projectToArchive.name}" archivado exitosamente.`);
  };

  // Función para ver detalles de proyecto archivado
  const viewArchivedProject = (project) => {
    setSelectedArchivedProject(project);
    setShowArchivedDetails(true);
  };

  // Función para cerrar detalles de proyecto archivado
  const closeArchivedDetails = () => {
    setSelectedArchivedProject(null);
    setShowArchivedDetails(false);
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

  const handleDuplicateProject = (projectId) => {
    logger.debug('📋 Duplicando proyecto con ID:', projectId);

    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (!projectToDuplicate) {
      logger.error('❌ Proyecto no encontrado para duplicar');
      return;
    }

    // Crear una copia del proyecto con nuevo ID y nombre
    const duplicatedProject = {
      id: 'proj-' + String(Date.now()).slice(-6),
      name: `${projectToDuplicate.name} (Copia)`,
      description: projectToDuplicate.description,
      startDate: projectToDuplicate.startDate,
      endDate: projectToDuplicate.endDate,
      budget: projectToDuplicate.budget,
      status: projectToDuplicate.status,
      priority: projectToDuplicate.priority,
      manager: projectToDuplicate.manager,
      team: projectToDuplicate.team,
      createdAt: projectToDuplicate.createdAt,
      updatedAt: projectToDuplicate.updatedAt,
      version: projectToDuplicate.version,
      progress: projectToDuplicate.progress
    };

    logger.debug('📋 Proyecto duplicado creado:', duplicatedProject);

    // Agregar el proyecto duplicado
    createProject(duplicatedProject);
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header del Portfolio */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-2xl shadow-lg p-6 text-gray-800 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100/30 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white/60 backdrop-blur rounded-2xl p-3 mr-4 shadow-sm">
                <span className="text-3xl">🏢</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-800">Portafolio de Proyectos</h1>
                <p className="text-gray-600 text-lg">Gestión estratégica y configuración de proyectos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {organizationId && (
                <UsageIndicator
                  organizationId={organizationId}
                  variant="compact"
                />
              )}
              <NotificationBadge />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Vista General', icon: '📊' },
              { id: 'projects', name: 'Lista de Proyectos', icon: '📋' },
              { id: 'resources', name: 'Lista de Recursos', icon: '👥' },
              { id: 'weekly-planning', name: 'Planificación Semanal', icon: '📅' },
              { id: 'archive', name: 'Archivado de Proyectos', icon: '📁' },
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
              {/* Mensaje de bienvenida cuando no hay proyectos */}
              {projects.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">
                    ¡Bienvenido a tu Portfolio de Proyectos!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comienza creando tu primer proyecto para gestionar cronogramas, riesgos, presupuestos y más.
                  </p>
                  <button
                    onClick={handleNewProject}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg transition-colors"
                  >
                    ➕ Crear Primer Proyecto
                  </button>
                </div>
              )}

              {/* Métricas - solo mostrar si hay proyectos */}
              {projects.length > 0 && (
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
              )}

              {/* Proyecto Destacado */}
              {projects.length > 0 && currentProject && (
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
            <>
              {(() => {
                logger.debug('🔍 DEBUG - Datos que se pasan a WeeklyPlanningTab:');
                logger.debug('  📊 projects:', projects);
                logger.debug('  📊 tasksByProject:', tasksByProject);
                logger.debug('  📊 minutasByProject:', minutasByProject);
                logger.debug('  📊 Estructura minutasByProject:', Object.keys(minutasByProject || {}));

                // Ver ejemplo de minutas de un proyecto
                const firstProjectId = Object.keys(minutasByProject || {})[0];
                if (firstProjectId) {
                  logger.debug(`  📊 Ejemplo minutas proyecto ${firstProjectId}:`, minutasByProject[firstProjectId]);
                }
                return null;
              })()}
              <WeeklyPlanningTab 
                projects={projects}
                tasksByProject={tasksByProject}
                minutasByProject={minutasByProject}
                weeklyPlanningData={weeklyPlanningData}
                setWeeklyPlanningData={setWeeklyPlanningData}
                useSupabase={useSupabase}
              />
            </>
          )}

          {/* Tab: Archivado de Proyectos */}
          {activeTab === 'archive' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">📁</span>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">Archivado de Proyectos</h3>
                    <p className="text-gray-600">Gestión centralizada del ciclo de vida completo de proyectos</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Proyectos Activos - Lista para Archivar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                      <span>📋</span>
                      <span>Proyectos Activos</span>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">Selecciona un proyecto para archivarlo</p>
                  </div>
                  <div className="p-6">
                    {projects.filter(p => p.status === 'active').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-2 block">📭</span>
                        <p>No hay proyectos activos para archivar</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {projects.filter(p => p.status === 'active').map(project => {
                          const validation = canArchiveProject(project);
                          const canArchive = validation.canArchive;
                          
                          return (
                            <div key={project.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                              canArchive 
                                ? 'bg-gray-50 border-gray-200' 
                                : 'bg-red-50 border-red-200'
                            }`}>
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-800">{project.name}</h5>
                                <p className="text-sm text-gray-600">{project.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                    {project.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Progreso: {project.progress}%
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Creado: {new Date(project.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                
                                {/* Mostrar validaciones si no puede ser archivado */}
                                {!canArchive && (
                                  <div className="mt-2 p-2 bg-red-100 rounded border border-red-200">
                                    <p className="text-xs text-red-700 font-medium mb-1">⚠️ Requisitos pendientes para archivado:</p>
                                    <ul className="text-xs text-red-600 space-y-1">
                                      {validation.validations.map((validation, index) => (
                                        <li key={index} className="flex items-start">
                                          <span className="mr-1">•</span>
                                          <span>{validation}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                              
                              <div className="ml-4 flex flex-col space-y-2">
                                <button
                                  onClick={() => handleArchiveProject(project.id)}
                                  disabled={!canArchive}
                                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                                    canArchive
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={canArchive ? 'Archivar proyecto' : 'No cumple requisitos para archivado'}
                                >
                                  <span>📁</span>
                                  <span>Archivar</span>
                                </button>
                                
                                {!canArchive && (
                                  <span className="text-xs text-red-600 text-center">
                                    No disponible
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Proyectos Archivados */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                      <span>📦</span>
                      <span>Proyectos Archivados</span>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">Historial de proyectos archivados</p>
                  </div>
                  <div className="p-6">
                    {archivedProjects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-2 block">📭</span>
                        <p>No hay proyectos archivados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {archivedProjects.map(project => (
                          <div key={project.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-800">{project.name}</h5>
                                <p className="text-sm text-gray-600">{project.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Archivado
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Archivado: {new Date(project.archivedAt).toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Por: {project.archivedBy}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4 flex space-x-2">
                                <button
                                  onClick={() => viewArchivedProject(project)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                                  title="Ver detalles del proyecto archivado"
                                >
                                  <span>👁️</span>
                                  <span>Ver</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

      {/* Modal de Detalles de Proyecto Archivado */}
      {showArchivedDetails && selectedArchivedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">📁</span>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {selectedArchivedProject.name}
                    </h3>
                    <p className="text-sm text-gray-600">Proyecto Archivado</p>
                  </div>
                </div>
                <button
                  onClick={closeArchivedDetails}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">📊 Información General</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Archivado
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progreso:</span>
                      <span className="font-medium">{selectedArchivedProject.progress}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archivado:</span>
                      <span>{new Date(selectedArchivedProject.archivedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Archivado por:</span>
                      <span>{selectedArchivedProject.archivedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creado:</span>
                      <span>{new Date(selectedArchivedProject.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">📝 Descripción</h4>
                  <p className="text-sm text-gray-600">
                    {selectedArchivedProject.description || 'Sin descripción disponible'}
                  </p>
                </div>
              </div>

              {/* Datos del Proyecto */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tareas del Proyecto */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                    <span>📋</span>
                    <span>Tareas del Cronograma</span>
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const projectTasks = tasks.filter(task => 
                        task.workPackageId === selectedArchivedProject.id || 
                        task.projectId === selectedArchivedProject.id
                      );
                      
                      if (projectTasks.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 italic">
                            No hay tareas registradas para este proyecto
                          </p>
                        );
                      }
                      
                      return (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            Total: {projectTasks.length} tareas
                          </p>
                          <p className="text-sm text-gray-600">
                            Completadas: {projectTasks.filter(t => t.progress === 100).length}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pendientes: {projectTasks.filter(t => t.progress < 100).length}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Documentos y Archivos */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                    <span>📎</span>
                    <span>Auditoría Documental</span>
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const projectAuditLogs = auditLogs.filter(log => 
                        log.projectId === selectedArchivedProject.id || 
                        log.workPackageId === selectedArchivedProject.id
                      );
                      
                      if (projectAuditLogs.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 italic">
                            No hay registros de auditoría para este proyecto
                          </p>
                        );
                      }
                      
                      // Agrupar por tipo de documento
                      const documentTypes = projectAuditLogs.reduce((acc, log) => {
                        const type = log.documentType || 'Otros';
                        if (!acc[type]) acc[type] = [];
                        acc[type].push(log);
                        return acc;
                      }, {});
                      
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 font-medium">
                            Total de documentos: {projectAuditLogs.length}
                          </p>
                          <div className="space-y-1">
                            {Object.entries(documentTypes).map(([type, logs]) => (
                              <div key={type} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">{type}:</span>
                                <span className="font-medium">{logs.length}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Métricas Finales */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <span>📈</span>
                  <span>Métricas Finales</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedArchivedProject.progress}%
                    </div>
                    <div className="text-gray-600">Progreso Final</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(() => {
                        const projectTasks = tasks.filter(task => 
                          task.workPackageId === selectedArchivedProject.id || 
                          task.projectId === selectedArchivedProject.id
                        );
                        return projectTasks.length;
                      })()}
                    </div>
                    <div className="text-gray-600">Tareas Totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Date(selectedArchivedProject.archivedAt).toLocaleDateString()}
                    </div>
                    <div className="text-gray-600">Fecha de Archivado</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedArchivedProject.archivedBy}
                    </div>
                    <div className="text-gray-600">Responsable</div>
                  </div>
                </div>
              </div>

              {/* Auditoría Documental Detallada */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Registro de Auditoría Documental</span>
                </h4>
                <div className="space-y-3">
                  {(() => {
                    const projectAuditLogs = auditLogs.filter(log => 
                      log.projectId === selectedArchivedProject.id || 
                      log.workPackageId === selectedArchivedProject.id
                    );
                    
                    if (projectAuditLogs.length === 0) {
                      return (
                        <p className="text-sm text-gray-500 italic text-center py-4">
                          No hay registros de auditoría documental para este proyecto
                        </p>
                      );
                    }
                    
                    // Ordenar por fecha (más reciente primero)
                    const sortedLogs = projectAuditLogs.sort((a, b) => 
                      new Date(b.timestamp) - new Date(a.timestamp)
                    );
                    
                    return (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {sortedLogs.map((log, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-800">
                                    {log.documentType || 'Documento'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    log.action === 'create' ? 'bg-green-100 text-green-800' :
                                    log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                    log.action === 'delete' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.action === 'create' ? 'Creado' :
                                     log.action === 'update' ? 'Modificado' :
                                     log.action === 'delete' ? 'Eliminado' : 'Acción'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  {log.description || 'Sin descripción'}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>Por: {log.user || 'Sistema'}</span>
                                  <span>•</span>
                                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Nota de Solo Lectura */}
              <div className="bg-gray-100 p-4 rounded-lg border-l-4 border-gray-400">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div>
                    <h5 className="font-medium text-gray-800">Proyecto Archivado</h5>
                    <p className="text-sm text-gray-600 mt-1">
                      Este proyecto está archivado y es de solo lectura. Los datos se mantienen 
                      para consulta histórica y auditoría, pero no se puede modificar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeArchivedDetails}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Funciones auxiliares para fechas
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // Domingo de la misma semana
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

export default PortfolioStrategic;
