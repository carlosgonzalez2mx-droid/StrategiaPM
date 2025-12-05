import { logger } from '../utils/logger';

/**
 * PortfolioDashboard.js
 *
 * Componente que muestra la lista de proyectos en formato de tabla/dashboard.
 * Se usa dentro del TAB "Lista de Proyectos" en PortfolioStrategic.
 *
 * Contiene su propio modal de creación/edición de proyectos que se abre desde:
 * - Botón "Nuevo Proyecto" en la barra superior
 * - Botón "Editar" (✏️) en cada fila de proyecto
 *
 * NOTA: Este componente es diferente de PortfolioStrategic que tiene su propio modal
 * para crear proyectos desde la vista Overview.
 */

import React, { useMemo, useState, useEffect } from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';
import FileManager from './FileManager';
import usePermissions from '../hooks/usePermissions';
import subscriptionService from '../services/SubscriptionService';
import supabaseService from '../services/SupabaseService';

// Componente para mostrar errores de validación
const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return <p className="text-red-500 text-xs mt-1">{error}</p>;
};

const PortfolioDashboard = ({
  projects,
  currentProjectId,
  setCurrentProjectId,
  portfolioMetrics, // Nuevo prop para métricas actualizadas
  workPackages, // Nuevo prop para work packages
  risks, // Nuevo prop para riesgos
  globalResources, // Nuevo prop para recursos globales
  setGlobalResources, // Nuevo prop para actualizar recursos
  tasksByProject, // Nuevo prop para tareas por proyecto
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  archiveProject,
  includeWeekendsByProject,
  setIncludeWeekendsByProject,
  getCurrentProjectIncludeWeekends,
  triggerNewProject = false, // Nueva prop para abrir modal externamente
  onNewProjectTriggered // Callback para notificar que se procesó el trigger
}) => {
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProjectInternal] = useState(null);
  const [errors, setErrors] = useState({});
  const [organizationId, setOrganizationId] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscriptionLimit, setSubscriptionLimit] = useState(null);

  // Wrapper para setEditingProject que siempre usa patrón callback
  // Esto previene el bug de campos que se borran al editar
  const setEditingProject = (updater) => {
    if (typeof updater === 'function') {
      // Ya es una función, usar directamente
      setEditingProjectInternal(updater);
    } else {
      // Es un objeto, convertir a función callback que preserve estado anterior
      setEditingProjectInternal(prev => {
        // Si es null (resetear), usar directamente
        if (updater === null) return null;
        // Si no hay estado previo, usar el nuevo objeto
        if (!prev) return updater;
        // Merge: preservar prev y sobrescribir con updater
        return { ...prev, ...updater };
      });
    }
  };

  // Hook de permisos
  const { permissions, isReadOnly, isLoading: permissionsLoading } = usePermissions();

  // Función para ordenar proyectos: primero números (ascendente), luego letras (A-Z)
  const sortProjects = (projectList) => {
    return [...projectList].sort((a, b) => {
      const nameA = a.name.trim();
      const nameB = b.name.trim();

      const startsWithNumberA = /^\d/.test(nameA);
      const startsWithNumberB = /^\d/.test(nameB);

      // Si ambos inician con número, ordenar numéricamente
      if (startsWithNumberA && startsWithNumberB) {
        const numA = parseInt(nameA.match(/^\d+/)[0]);
        const numB = parseInt(nameB.match(/^\d+/)[0]);
        if (numA !== numB) return numA - numB;
        // Si los números son iguales, ordenar alfabéticamente el resto
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
      }

      // Si solo A inicia con número, A va primero
      if (startsWithNumberA) return -1;

      // Si solo B inicia con número, B va primero
      if (startsWithNumberB) return 1;

      // Si ambos inician con letra, ordenar alfabéticamente (A-Z)
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  // Función auxiliar para actualizar campos del proyecto de forma segura
  const updateProjectField = (fieldName, value) => {
    setEditingProject(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Función para validar campos en tiempo real
  const validateField = (fieldName, value) => {
    const newErrors = Object.assign({}, errors);

    switch (fieldName) {
      case 'name':
        if (!value || value.trim().length < 3) {
          newErrors.name = 'El nombre debe tener al menos 3 caracteres';
        } else {
          delete newErrors.name;
        }
        break;
      case 'manager':
        if (!value || value.trim().length < 2) {
          newErrors.manager = 'El manager debe tener al menos 2 caracteres';
        } else {
          delete newErrors.manager;
        }
        break;
      case 'sponsor':
        if (!value || value.trim().length < 2) {
          newErrors.sponsor = 'El sponsor debe tener al menos 2 caracteres';
        } else {
          delete newErrors.sponsor;
        }
        break;
      case 'startDate':
        if (!value) {
          newErrors.startDate = 'La fecha de inicio es requerida';
        } else {
          delete newErrors.startDate;
        }
        break;
      case 'endDate':
        if (!value) {
          newErrors.endDate = 'La fecha de fin es requerida';
        } else if (editingProject?.startDate && value <= editingProject.startDate) {
          newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
        } else {
          delete newErrors.endDate;
        }
        break;
      case 'budget':
        if (!value || value <= 0) {
          newErrors.budget = 'El presupuesto debe ser mayor a 0';
        } else {
          delete newErrors.budget;
        }
        break;
      case 'irr':
        if (value && (value < 0 || value > 100)) {
          newErrors.irr = 'La TIR debe estar entre 0% y 100%';
        } else {
          delete newErrors.irr;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para manejar la edición de proyecto
  const handleEditProject = (project) => {
    logger.debug('🔍 Proyecto original para editar:', project);
    logger.debug('🔍 Estado del proyecto original:', project.status);

    // Preservar el estado actual del proyecto al editar
    // NO usar valores por defecto que sobrescriban el estado real
    const projectToEdit = {
      ...project,
      // Solo usar valores por defecto para campos que realmente no existan
      description: project.description || '',
      objective: project.objective || '',
      businessCase: project.businessCase || '',
      kickoffDate: project.kickoffDate || '',
      stakeholders: project.stakeholders || [],
      // NO sobrescribir campos críticos como status, priority, etc.
      // Estos deben mantenerse exactamente como están en el proyecto original
    };

    logger.debug('🔍 Proyecto preparado para editar:', projectToEdit);
    logger.debug('🔍 Estado del proyecto preparado:', projectToEdit.status);

    setEditingProject(projectToEdit);
    setErrors({});
    setShowProjectModal(true);
  };

  // Función para manejar la creación de nuevo proyecto
  const handleNewProject = () => {
    setEditingProject({
      id: '',
      name: '',
      description: '',
      status: 'inactive',
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

  // useEffect para manejar trigger externo de nuevo proyecto
  React.useEffect(() => {
    if (triggerNewProject) {
      handleNewProject();
      // Notificar al padre que se procesó el trigger
      if (onNewProjectTriggered) {
        onNewProjectTriggered();
      }
    }
  }, [triggerNewProject, onNewProjectTriggered]);

  // useEffect para obtener organizationId desde SupabaseService
  useEffect(() => {
    const fetchOrganizationId = () => {
      try {
        // Obtener desde SupabaseService (fuente principal)
        const orgId = supabaseService.getCurrentOrganization();

        if (orgId) {
          setOrganizationId(orgId);
          logger.debug('✅ PortfolioDashboard - Organization ID cargado:', orgId);
        } else {
          logger.warn('⚠️ PortfolioDashboard - No se encontró organization ID');
        }
      } catch (error) {
        logger.error('❌ Error obteniendo organizationId:', error);
      }
    };

    // Intentar obtener inmediatamente
    fetchOrganizationId();

    // Si no se encuentra, reintentar después de 1 segundo
    const timer = setTimeout(() => {
      if (!organizationId) {
        logger.debug('🔄 PortfolioDashboard - Reintentando obtener organization ID...');
        fetchOrganizationId();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Función para guardar proyecto
  const handleSaveProject = async () => {
    // Limpiar errores previos
    setErrors({});

    // Validar todos los campos obligatorios
    const newErrors = {};

    if (!editingProject.name || editingProject.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!editingProject.manager || editingProject.manager.trim().length < 2) {
      newErrors.manager = 'El manager debe tener al menos 2 caracteres';
    }

    if (!editingProject.sponsor || editingProject.sponsor.trim().length < 2) {
      newErrors.sponsor = 'El sponsor debe tener al menos 2 caracteres';
    }

    if (!editingProject.startDate) {
      newErrors.startDate = 'La fecha de inicio es requerida';
    }

    if (!editingProject.endDate) {
      newErrors.endDate = 'La fecha de fin es requerida';
    } else if (editingProject.startDate && editingProject.endDate <= editingProject.startDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    if (!editingProject.budget || editingProject.budget <= 0) {
      newErrors.budget = 'El presupuesto debe ser mayor a 0';
    }

    if (editingProject.irr && (editingProject.irr < 0 || editingProject.irr > 100)) {
      newErrors.irr = 'La TIR debe estar entre 0% y 100%';
    }

    // Si hay errores, mostrarlos y no guardar
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mostrar alerta con el número de errores
      alert(`❌ No se puede guardar el proyecto. Hay ${Object.keys(newErrors).length} errores de validación.`);
      return;
    }

    // Validar límites de suscripción si es un proyecto nuevo
    if (!editingProject.id && organizationId) {
      logger.debug('🔍 Validando límites de suscripción para organizationId:', organizationId);
      try {
        const canCreate = await subscriptionService.canCreateProject(organizationId);
        logger.debug('📊 Resultado de validación:', canCreate);

        if (!canCreate.allowed) {
          logger.warn('⛔ Límite alcanzado - Mostrando modal de upgrade');
          // Guardar información del límite para mostrar en el modal
          setSubscriptionLimit(canCreate);
          setShowUpgradeModal(true);
          return;
        }
        logger.debug('✅ Validación pasada - Puede crear proyecto');
      } catch (error) {
        logger.error('❌ Error verificando límites de suscripción:', error);
        // Continuar con la creación en caso de error (fail-safe)
      }
    } else {
      logger.debug('ℹ️ Editando proyecto existente - No se requiere validación de suscripción. ID:', editingProject.id);
    }

    // Si no hay errores, proceder a guardar
    try {
      if (editingProject.id) {
        // Actualizar proyecto existente
        updateProject(editingProject.id, editingProject);
        alert('✅ Proyecto actualizado exitosamente');
      } else {
        // Crear nuevo proyecto
        createProject(editingProject);
        alert('✅ Proyecto creado exitosamente');
      }

      setShowProjectModal(false);
      setEditingProject(null);
      setErrors({});
    } catch (error) {
      alert(`❌ Error al guardar el proyecto: ${error.message} `);
    }
  };

  // Calcular métricas del portfolio con datos actualizados
  const calculatedMetrics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
        averageProgress: 0,
        totalWorkPackages: 0,
        totalRisks: 0,
        activeRisks: 0
      };
    }

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const activeProjectsList = projects.filter(p => p.status === 'active');
    const totalBudget = activeProjectsList.reduce((sum, p) => sum + (p.budget || 0), 0);
    const averageProgress = activeProjectsList.length > 0
      ? activeProjectsList.reduce((sum, p) => sum + (p.progress || 0), 0) / activeProjectsList.length
      : 0;

    // Métricas adicionales de work packages y riesgos
    const totalWorkPackages = workPackages ? workPackages.length : 0;
    const totalRisks = risks ? risks.length : 0;
    const activeRisks = risks ? risks.filter(r => r.status === 'active').length : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      averageProgress: Math.round(averageProgress),
      totalWorkPackages,
      totalRisks,
      activeRisks
    };
  }, [projects, workPackages, risks]);

  // Usar métricas del portfolio si están disponibles, sino usar las calculadas
  const metrics = portfolioMetrics || calculatedMetrics;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">

      {/* Nota Informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-blue-600 text-xl mr-3">ℹ️</div>
          <div className="text-blue-800">
            <strong>Nota:</strong> Las métricas financieras y KPIs solo consideran proyectos con estado "Activo".
            Los proyectos "Inactivos" o "Completados" no influyen en los indicadores financieros.
          </div>
        </div>
      </div>

      {/* KPIs del Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Proyectos</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.totalProjects}
              </div>
            </div>
            <div className="text-blue-500 text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Proyectos Activos</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.activeProjects}
              </div>
            </div>
            <div className="text-green-500 text-2xl">🔄</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Completados</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.completedProjects}
              </div>
            </div>
            <div className="text-purple-500 text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Presupuesto Proyectos Activos</div>
              <div className="text-2xl font-bold text-gray-800">
                ${(metrics.totalBudget / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-indigo-500 text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Acciones del Portfolio */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Acciones del Portfolio</h2>
          <div className="flex space-x-2">
            {/* Solo mostrar botón crear si tiene permisos */}
            {permissions.canEdit && (
              <button
                onClick={handleNewProject}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Nuevo Proyecto</span>
              </button>
            )}
            {isReadOnly() && (
              <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg border">
                <span>👀</span> Modo solo lectura
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Proyectos del Portfolio</h2>

        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <div>No hay proyectos en el portfolio</div>
            <button
              onClick={handleNewProject}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Primer Proyecto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortProjects(projects).map((project) => (
              <div
                key={project.id}
                className={`border rounded - lg p - 4 transition - all duration - 200 cursor - pointer hover: shadow - md ${currentProjectId === project.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  } `}
                onClick={() => setCurrentProjectId(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <span className={`px - 2 py - 1 rounded - full text - xs font - medium border ${getPriorityColor(project.priority)} `}>
                        {project.priority}
                      </span>
                      <span className={`px - 2 py - 1 rounded - full text - xs font - medium border ${getStatusColor(project.status)} `}>
                        {getStatusIcon(project.status)} {project.status}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      {project.description}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📅 {project.startDate} - {project.endDate}</span>
                      <span>💰 ${(project.budget / 1000).toFixed(0)}K</span>
                      <span>👤 {project.manager}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectForFiles(project);
                        setShowFileManager(true);
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Ver archivos del proyecto"
                    >
                      📎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProject(project.id);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Duplicar proyecto"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Editar proyecto"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Archivar proyecto "${project.name}" ? Se moverá al archivo y se limpiarán sus datos del sistema activo.`)) {
                          archiveProject(project.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                      title="Archivar proyecto"
                    >
                      📁
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Eliminar proyecto "${project.name}" ? Esta acción no se puede deshacer.`)) {
                          deleteProject(project.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar proyecto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Métricas del Proyecto Actual */}
      {currentProjectId && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Métricas del Proyecto Actual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {portfolioMetrics?.currentProjectCPI?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">CPI</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {portfolioMetrics?.currentProjectSPI?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">SPI</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                ${(portfolioMetrics?.currentProjectCV / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">CV</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                ${(portfolioMetrics?.currentProjectSV / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">SV</div>
            </div>
          </div>
        </div>
      )}


      {/* Alertas Corporativas */}
      <CorporateAlerts projects={projects} portfolioMetrics={portfolioMetrics} />

      {/* Gráficos y Análisis */}
      <PortfolioCharts projects={projects} portfolioMetrics={portfolioMetrics} workPackages={workPackages} risks={risks} tasksByProject={tasksByProject} includeWeekendsByProject={includeWeekendsByProject} setIncludeWeekendsByProject={setIncludeWeekendsByProject} getCurrentProjectIncludeWeekends={getCurrentProjectIncludeWeekends} />

      {/* Gestor de Archivos del Proyecto Seleccionado */}
      {showFileManager && selectedProjectForFiles && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <span className="text-2xl">📎</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Archivos del Proyecto: {selectedProjectForFiles.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Gestión completa de documentos y archivos adjuntos
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowFileManager(false);
                setSelectedProjectForFiles(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              ✕ Cerrar
            </button>
          </div>

          <FileManager
            projectId={selectedProjectForFiles.id}
            category="general"
            isContextual={true}
            title={`📎 Archivos de ${selectedProjectForFiles.name} `}
            onFileUploaded={() => {
              // Archivo subido exitosamente desde portfolio de proyectos
            }}
          />
        </div>
      )}

      {/* Modal para Crear/Editar Proyecto */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingProject?.id ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h2>
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    className={`w - full border rounded px - 3 py - 2 ${errors.name ? 'border-red-500' : 'border-red-300'} `}
                    value={editingProject?.name || ''}
                    onChange={(e) => {
                      updateProjectField('name', e.target.value);
                      validateField('name', e.target.value);
                    }}
                    onBlur={(e) => validateField('name', e.target.value)}
                    placeholder="Nombre del proyecto"
                  />
                  <ErrorMessage error={errors.name} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager *</label>
                  <input
                    type="text"
                    className={`w - full border rounded px - 3 py - 2 ${errors.manager ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.manager || ''}
                    onChange={(e) => {
                      updateProjectField('manager', e.target.value);
                      validateField('manager', e.target.value);
                    }}
                    onBlur={(e) => validateField('manager', e.target.value)}
                    placeholder="Gerente del proyecto"
                  />
                  <ErrorMessage error={errors.manager} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor *</label>
                  <input
                    type="text"
                    className={`w - full border rounded px - 3 py - 2 ${errors.sponsor ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.sponsor || ''}
                    onChange={(e) => {
                      updateProjectField('sponsor', e.target.value);
                      validateField('sponsor', e.target.value);
                    }}
                    onBlur={(e) => validateField('sponsor', e.target.value)}
                    placeholder="Patrocinador del proyecto"
                  />
                  <ErrorMessage error={errors.sponsor} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingProject?.priority || 'medium'}
                    onChange={(e) => updateProjectField('priority', e.target.value)}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado del Proyecto *</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingProject?.status || 'inactive'}
                    onChange={(e) => updateProjectField('status', e.target.value)}
                  >
                    <option value="inactive">⚫ Inactivo</option>
                    <option value="active">🟢 Activo</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Por defecto:</strong> Los proyectos nuevos y duplicados aparecen como "Inactivos"
                    para revisión. Solo los proyectos "Activos" suman al dashboard consolidado y aparecen en Gestión de Proyectos.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    className={`w - full border rounded px - 3 py - 2 ${errors.startDate ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.startDate || ''}
                    onChange={(e) => {
                      updateProjectField('startDate', e.target.value);
                      validateField('startDate', e.target.value);
                      // Revalidar fecha fin si ya existe
                      if (editingProject?.endDate) {
                        validateField('endDate', editingProject.endDate);
                      }
                    }}
                    onBlur={(e) => validateField('startDate', e.target.value)}
                  />
                  <ErrorMessage error={errors.startDate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin *</label>
                  <input
                    type="text"
                    className={`w - full border rounded px - 3 py - 2 ${errors.endDate ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.endDate || ''}
                    onChange={(e) => {
                      updateProjectField('endDate', e.target.value);
                      validateField('endDate', e.target.value);
                    }}
                    onBlur={(e) => validateField('endDate', e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                  <ErrorMessage error={errors.endDate} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (USD) *</label>
                  <input
                    type="number"
                    className={`w - full border rounded px - 3 py - 2 ${errors.budget ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.budget || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Solo permitir números y vacío
                      if (inputValue === '' || /^\d+$/.test(inputValue)) {
                        const numValue = inputValue === '' ? '' : Number(inputValue);
                        updateProjectField('budget', numValue);
                        validateField('budget', numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      validateField('budget', value);
                    }}
                    placeholder="Presupuesto en USD (ej: 100000)"
                    min="0"
                  />
                  <ErrorMessage error={errors.budget} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIR (%)</label>
                  <input
                    type="number"
                    className={`w - full border rounded px - 3 py - 2 ${errors.irr ? 'border-red-500' : 'border-gray-300'} `}
                    value={editingProject?.irr || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      // Solo permitir números, punto decimal y vacío
                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                        const numValue = inputValue === '' ? '' : Number(inputValue);

                        // Calcular plannedValue automáticamente
                        const period = editingProject?.period || 3;
                        const budget = editingProject?.budget || 0;
                        const newPlannedValue = budget * Math.pow(1 + (numValue / 100), period);

                        updateProjectField('irr', numValue);
                        updateProjectField('plannedValue', Math.round(newPlannedValue));
                        validateField('irr', numValue);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? '' : Number(e.target.value);
                      validateField('irr', value);
                    }}
                    placeholder="Tasa Interna de Retorno (ej: 15.5)"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <ErrorMessage error={errors.irr} />
                </div>

                {/* Campo: Periodo del Proyecto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Periodo del Proyecto (años)
                  </label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 border-gray-300"
                    value={editingProject?.period || 3}
                    onChange={(e) => {
                      const newPeriod = parseInt(e.target.value) || 3;

                      // Recalcular plannedValue con nuevo periodo
                      const budget = editingProject?.budget || 0;
                      const irr = editingProject?.irr || 0;
                      const newPlannedValue = budget * Math.pow(1 + (irr / 100), newPeriod);

                      updateProjectField('period', newPeriod);
                      updateProjectField('plannedValue', Math.round(newPlannedValue));
                    }}
                    placeholder="Ej: 3"
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Duración estimada del proyecto para cálculo de valor con TIR
                  </p>
                </div>

                {/* Campo: Valor Planificado del Proyecto - ANCHO COMPLETO */}
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    💰 Valor Planificado del Proyecto (USD)
                    <span className="ml-2 text-blue-600 text-xs font-semibold">
                      (Auto-calculado con TIR)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full border-2 rounded px-3 py-2 border-blue-300 bg-white text-lg font-semibold"
                      value={editingProject?.plannedValue || 0}
                      onChange={(e) => {
                        updateProjectField('plannedValue', parseFloat(e.target.value) || 0);
                      }}
                      placeholder="Calculado automáticamente"
                      min="0"
                      step="10000"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const budget = editingProject?.budget || 0;
                        const irr = editingProject?.irr || 0;
                        const period = editingProject?.period || 3;
                        const calculated = budget * Math.pow(1 + (irr / 100), period);
                        updateProjectField('plannedValue', Math.round(calculated));
                      }}
                      className="absolute right-2 top-2 text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 font-medium"
                      title="Recalcular automáticamente"
                    >
                      🔄 Recalcular
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    Fórmula: ${(editingProject?.budget || 0).toLocaleString()} × (1 + {editingProject?.irr || 0}%)^{editingProject?.period || 3} = <span className="text-green-600 font-bold">${(editingProject?.plannedValue || 0).toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Este valor se distribuirá automáticamente entre todas las tareas del cronograma según su costo y prioridad.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.description || ''}
                    onChange={(e) => updateProjectField('description', e.target.value)}
                    placeholder="Descripción detallada del proyecto"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo del Proyecto</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.objective || ''}
                    onChange={(e) => updateProjectField('objective', e.target.value)}
                    placeholder="¿Qué se busca lograr con este proyecto?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caso de Negocio</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingProject?.businessCase || ''}
                    onChange={(e) => updateProjectField('businessCase', e.target.value)}
                    placeholder="Justificación del proyecto desde el punto de vista del negocio"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProject}
                  disabled={Object.keys(errors).length > 0}
                  className={`px - 4 py - 2 rounded transition - colors ${Object.keys(errors).length > 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    } `}
                >
                  Guardar Proyecto {Object.keys(errors).length > 0 && `(${Object.keys(errors).length} errores)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upgrade cuando se alcanza el límite */}
      {showUpgradeModal && subscriptionLimit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">⚠️</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-center mb-2">Límite Alcanzado</h2>
              <p className="text-gray-600 text-center mb-4">{subscriptionLimit.message}</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Proyectos actuales:</span>
                  <span className="text-sm font-bold text-blue-600">
                    {subscriptionLimit.currentCount} / {subscriptionLimit.maxCount}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(subscriptionLimit.currentCount / subscriptionLimit.maxCount) * 100}% ` }}
                  ></div>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center mb-6">{subscriptionLimit.suggestion}</p>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSubscriptionLimit(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Redirigir a página de planes/upgrade
                    alert('🚀 Función de upgrade en desarrollo. Aquí se redigiría a la página de planes.');
                    setShowUpgradeModal(false);
                    setSubscriptionLimit(null);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Ver Planes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDashboard;
