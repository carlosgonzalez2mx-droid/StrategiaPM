import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './index.css';

// Servicios
import filePersistenceService from './services/FilePersistenceService';
import supabaseService from './services/SupabaseService';

// Contextos
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProjectsProvider, useProjects } from './contexts/ProjectsContext';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';
import { ConcurrencyProvider } from './contexts/ConcurrencyContext';

// Logger
import { logger } from './utils/logger';

// Hooks
import usePermissions from './hooks/usePermissions';
import useIdleTimeout from './hooks/useIdleTimeout';

// Utilidades de precarga
import { preloadComponentsOnIdle } from './utils/preloadComponents';

// Componentes pequeños y frecuentes (carga directa)
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import SyncIndicator from './components/SyncIndicator';
import FileStatusIndicator from './components/FileStatusIndicator';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import SupabaseAuth from './components/SupabaseAuth';
import SplashScreen from './components/SplashScreen';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import TrialStatusBanner from './components/subscription/TrialStatusBanner';
import OverLimitBanner from './components/subscription/OverLimitBanner';

// Hooks personalizados para guardado
import { useUnsavedChanges, useBeforeUnload, useSaveShortcut } from './hooks/useSaveState';

// Componentes grandes con lazy loading (code splitting)
const ConsolidatedDashboard = lazy(() => import('./components/ConsolidatedDashboard'));
const IntegratedPMODashboard = lazy(() => import('./components/IntegratedPMODashboard'));
const PortfolioStrategic = lazy(() => import('./components/PortfolioStrategic'));
const ProjectManagementTabs = lazy(() => import('./components/ProjectManagementTabs'));
const FloatingSaveButton = lazy(() => import('./components/FloatingSaveButton'));
const ScheduleManagement = lazy(() => import('./components/ScheduleManagement'));
const FinancialManagement = lazy(() => import('./components/FinancialManagement'));
const ResourceManagement = lazy(() => import('./components/ResourceManagement'));
const RiskManagement = lazy(() => import('./components/RiskManagement'));
const ChangeManagement = lazy(() => import('./components/ChangeManagement'));
const CashFlowProjection = lazy(() => import('./components/CashFlowProjection'));
const FileManager = lazy(() => import('./components/FileManager'));
const ReportsManagement = lazy(() => import('./components/ReportsManagement'));
const ProjectAudit = lazy(() => import('./components/ProjectAudit'));
const ProjectArchive = lazy(() => import('./components/ProjectArchive'));
const OrganizationMembers = lazy(() => import('./components/OrganizationMembers'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const UpgradeModal = lazy(() => import('./components/subscription/UpgradeModal'));
const ConflictResolutionDialog = lazy(() => import('./components/ConflictResolutionDialog'));

// Subscription Components (lazy loading)
const SubscriptionSuccess = lazy(() => import('./components/subscription/SubscriptionSuccess'));
const SubscriptionCancelled = lazy(() => import('./components/subscription/SubscriptionCancelled'));

// Super Admin Components (lazy loading)
const SuperAdminRoute = lazy(() => import('./components/admin/SuperAdminRoute'));
const SuperAdminDashboard = lazy(() => import('./components/admin/SuperAdminDashboard'));
const OrganizationDetails = lazy(() => import('./components/admin/OrganizationDetails'));

// Función de ordenamiento de tareas por wbsCode (importada desde ScheduleManagement)
const sortTasksByWbsCode = (tasks) => {
  return [...tasks].sort((a, b) => {
    // Función mejorada para manejar diferentes formatos de wbsCode
    const getNumericValue = (wbsCode) => {
      if (!wbsCode) return 0;

      // Si es un número directo
      if (typeof wbsCode === 'number') return wbsCode;

      // Si es string, extraer solo los números
      const numericMatch = String(wbsCode).match(/\d+/);
      if (numericMatch) {
        return parseInt(numericMatch[0], 10);
      }

      // Si contiene "Sin predecesoras" o similar, poner al final
      if (String(wbsCode).toLowerCase().includes('sin')) return 999999;

      return 0;
    };

    const aNum = getNumericValue(a.wbsCode);
    const bNum = getNumericValue(b.wbsCode);

    // Si los números son iguales, mantener orden original
    if (aNum === bNum) {
      return 0;
    }

    return aNum - bNum;
  });
};

// Componente principal de la aplicación (requiere autenticación)
function MainApp() {
  const { user, showSplash, completeSplash, logout } = useAuth();

  // Hook de permisos para detectar usuarios de solo lectura
  const { isReadOnly, userRole, isLoading: permissionsLoading } = usePermissions();

  // 🔐 Auto-logout después de 5 minutos de inactividad
  useIdleTimeout(
    async () => {
      console.log('⏱️ Sesión expirada por inactividad - cerrando sesión automáticamente');
      await logout();
      // Recargar la página para forzar redirect a login
      window.location.reload();
    },
    5 * 60 * 1000, // 5 minutos
    {
      onWarning: () => {
        console.log('⚠️ La sesión expirará en 1 minuto por inactividad');
        // Opcional: Mostrar notificación al usuario
      },
      warningTime: 60 * 1000 // Advertencia 1 minuto antes
    }
  );

  // Precargar componentes más utilizados cuando el navegador esté idle
  useEffect(() => {
    preloadComponentsOnIdle([
      ProjectManagementTabs,
      ScheduleManagement,
      FinancialManagement,
      ConsolidatedDashboard
    ]);
  }, []);

  // ===== CONTEXTO DE PROYECTOS =====
  // Usar el nuevo ProjectsContext en lugar de estado local
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    getCurrentProject
  } = useProjects();

  // ===== CONTEXTO FINANCIERO =====
  // Usar el nuevo FinancialContext en lugar de estado local
  const {
    purchaseOrdersByProject,
    setPurchaseOrdersByProject,
    advancesByProject,
    setAdvancesByProject,
    invoicesByProject,
    setInvoicesByProject,
    contractsByProject,
    setContractsByProject,
    globalResources,
    setGlobalResources,
    resourceAssignmentsByProject,
    setResourceAssignmentsByProject,
    getCurrentProjectPurchaseOrders,
    getCurrentProjectAdvances,
    getCurrentProjectInvoices,
    getCurrentProjectContracts,
    getCurrentProjectResourceAssignments,
    updateCurrentProjectPurchaseOrders,
    updateCurrentProjectAdvances,
    updateCurrentProjectInvoices,
    updateCurrentProjectContracts,
    updateCurrentProjectResourceAssignments,
  } = useFinancial();

  // ===== CONTEXTO DE TAREAS =====
  // Usar el nuevo TasksContext en lugar de estado local
  const {
    tasksByProject,
    setTasksByProject,
    safeSetTasksByProject,
    minutasByProject,
    setMinutasByProject,
    risksByProject,
    setRisksByProject,
    includeWeekendsByProject,
    setIncludeWeekendsByProject,
    auditLogsByProject,
    setAuditLogsByProject,
    getCurrentProjectTasks,
    getCurrentProjectMinutas,
    getCurrentProjectRisks,
    getCurrentProjectIncludeWeekends,
    getCurrentProjectAuditLogs,
    updateCurrentProjectTasks,
    updateCurrentProjectMinutas,
    updateCurrentProjectRisks,
    updateCurrentProjectIncludeWeekends,
    updateCurrentProjectAuditLogs,
    importTasksToCurrentProject,
  } = useTasks();

  // ===== CONTEXTO DE CONFIGURACIÓN =====
  // Usar el nuevo ConfigContext en lugar de estado local
  const {
    portfolioViewMode,
    setPortfolioViewMode,
    viewMode,
    setViewMode,
    useSupabase,
    setUseSupabase,
    supabaseInitialized,
    setSupabaseInitialized,
    showAuthModal,
    setShowAuthModal,
    dataLoaded,
    setDataLoaded,
  } = useConfig();

  // ===== ESTADO DE GUARDADO MANUAL =====
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // ===== ESTADO DE CONFLICTOS =====
  const [conflicts, setConflicts] = useState([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Crear objeto con datos actuales para tracking de cambios
  const currentData = useMemo(() => ({
    projects,
    currentProjectId,
    tasksByProject,
    risksByProject,
    minutasByProject,
    purchaseOrdersByProject,
    advancesByProject,
    invoicesByProject,
    contractsByProject,
    globalResources,
    resourceAssignmentsByProject,
    auditLogsByProject,
    includeWeekendsByProject
  }), [
    projects,
    currentProjectId,
    tasksByProject,
    risksByProject,
    minutasByProject,
    purchaseOrdersByProject,
    advancesByProject,
    invoicesByProject,
    contractsByProject,
    globalResources,
    resourceAssignmentsByProject,
    auditLogsByProject,
    includeWeekendsByProject
  ]);

  // Hook para detectar cambios sin guardar
  const { hasUnsavedChanges, markAsSaved } = useUnsavedChanges(currentData);

  // NOTA: Script de diagnóstico deshabilitado temporalmente
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     import('./debug-file-storage').catch(err => {
  //       logger.warn('No se pudo cargar el script de diagnóstico:', err);
  //     });
  //   }
  // }, []);

  // Work Packages eliminados - ya no se usan
  // Tareas, minutas, riesgos - MIGRADO A TasksContext

  // cleanTasksByProject, getCurrentProjectTasks, cleanCorruptDataOnce
  // MIGRADO A TasksContext - ahora vienen del hook useTasks()

  // ===== SISTEMA DE GUARDADO MANUAL =====

  /**
   * Función principal de guardado manual
   * Se ejecuta cuando el usuario presiona el botón "Guardar" o Ctrl+S
   */
  const handleManualSave = useCallback(async () => {
    // Validar que hay cambios y no está guardando
    if (!hasUnsavedChanges || isSaving) {
      logger.debug('⏭️ Guardado omitido - No hay cambios o ya está guardando');
      return;
    }

    // Validar autenticación
    if (!useSupabase || !supabaseService.isAuthenticated()) {
      logger.warn('⚠️ No se puede guardar - No autenticado o Supabase deshabilitado');
      setSaveError('No estás autenticado. Por favor, inicia sesión.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const saveStartTime = Date.now();
    logger.debug('💾 Iniciando guardado manual...');

    try {
      // Preparar datos para guardar
      const dataToSave = {
        projects,
        currentProjectId,
        tasksByProject,
        risksByProject,
        minutasByProject,
        purchaseOrdersByProject,
        advancesByProject,
        invoicesByProject,
        contractsByProject,
        globalResources,
        resourceAssignmentsByProject,
        auditLogsByProject,
        includeWeekendsByProject,
        timestamp: new Date().toISOString()
      };

      // Guardar en Supabase
      const result = await supabaseService.savePortfolioData(dataToSave);

      // ✅ NUEVO: Manejar conflictos
      if (result && result.conflicts && result.conflicts.length > 0) {
        logger.warn('🔴 Conflictos detectados:', result.conflicts);
        setConflicts(result.conflicts);
        setShowConflictDialog(true);
        setIsSaving(false);
        return; // No continuar con sincronización de archivos
      }

      // ✅ NUEVO: Verificar si el guardado fue exitoso
      const success = result === true || (result && result.success === true);

      // ✅ NUEVO: Sincronizar archivos de localStorage a Supabase
      if (success) {
        logger.debug('📁 Sincronizando archivos de todos los proyectos...');

        try {
          // Importar dinámicamente useFileStorage para acceder a syncWithSupabase
          const { default: useFileStorage } = await import('./hooks/useFileStorage');

          let totalFilesSynced = 0;

          // Sincronizar archivos de cada proyecto
          for (const project of projects) {
            try {
              // Verificar si hay archivos en localStorage para este proyecto
              const key = `project-files-${project.id}`;
              const savedFiles = localStorage.getItem(key);
              const localFiles = savedFiles ? JSON.parse(savedFiles) : [];

              // Solo sincronizar si hay archivos locales que no estén en Supabase
              const filesToSync = localFiles.filter(file => !file.storagePath && file.content);

              if (filesToSync.length > 0) {
                logger.debug(`📤 Sincronizando ${filesToSync.length} archivos del proyecto ${project.name}...`);

                // Subir cada archivo a Supabase
                for (const file of filesToSync) {
                  try {
                    // Reconstruir File object desde base64
                    const base64Data = file.content.split(',')[1];
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: file.mimeType });
                    const fileObject = new File([blob], file.fileName, { type: file.mimeType });

                    // Subir a Supabase con metadata completa
                    const metadata = {
                      description: file.description || '',
                      relatedItemId: file.relatedItemId || null,
                      originalName: file.fileName,
                      uploadedBy: supabaseService.getCurrentUser()?.email || 'Usuario',
                      mimeType: file.mimeType
                    };

                    const uploadResult = await supabaseService.uploadFileToStorage(
                      fileObject,
                      project.id,
                      file.category || 'general',
                      metadata
                    );

                    if (uploadResult.success) {
                      totalFilesSynced++;
                      logger.debug(`✅ Archivo sincronizado: ${file.fileName}`);
                    }
                  } catch (fileError) {
                    logger.error(`❌ Error sincronizando archivo ${file.fileName}:`, fileError);
                  }
                }
              }
            } catch (projectError) {
              logger.error(`❌ Error sincronizando archivos del proyecto ${project.name}:`, projectError);
            }
          }

          if (totalFilesSynced > 0) {
            logger.debug(`✅ ${totalFilesSynced} archivos sincronizados exitosamente a Supabase`);
          } else {
            logger.debug('📂 No hay archivos nuevos para sincronizar');
          }
        } catch (syncError) {
          logger.error('❌ Error en sincronización de archivos (no crítico):', syncError);
          // No fallar el guardado completo por error en archivos
        }
      }

      if (success) {
        const duration = Date.now() - saveStartTime;
        logger.debug(`✅ Guardado exitoso en ${duration}ms`);

        // Actualizar estado
        setLastSaved(new Date());
        markAsSaved();

        // Disparar evento para actualizar UI
        const event = new CustomEvent('manualSaveComplete', {
          detail: { duration, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
      } else {
        throw new Error('Error guardando en Supabase');
      }
    } catch (error) {
      logger.error('❌ Error en guardado manual:', error);
      setSaveError(error.message || 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }, [
    hasUnsavedChanges,
    isSaving,
    useSupabase,
    projects,
    currentProjectId,
    tasksByProject,
    risksByProject,
    minutasByProject,
    purchaseOrdersByProject,
    advancesByProject,
    invoicesByProject,
    contractsByProject,
    globalResources,
    resourceAssignmentsByProject,
    auditLogsByProject,
    includeWeekendsByProject,
    markAsSaved
  ]);

  /**
   * Manejar resolución de conflictos
   */
  const handleConflictResolve = useCallback(async (resolutions) => {
    logger.debug('🔧 Resolviendo conflictos:', resolutions);

    try {
      // Aplicar resoluciones a los datos
      const resolvedConflicts = conflicts.map((conflict, index) => {
        const resolution = resolutions[index];

        if (!resolution) {
          logger.warn(`⚠️ No hay resolución para conflicto ${index}`);
          return null;
        }

        let resolvedValue;
        if (resolution.choice === 'yours') {
          resolvedValue = conflict.yourData;
        } else if (resolution.choice === 'theirs') {
          resolvedValue = conflict.currentData;
        } else if (resolution.choice === 'custom') {
          try {
            // Intentar parsear como JSON si es posible
            resolvedValue = JSON.parse(resolution.customValue);
          } catch {
            // Si no es JSON válido, usar como string
            resolvedValue = resolution.customValue;
          }
        }

        return {
          table: conflict.table,
          recordId: conflict.recordId,
          resolvedData: resolvedValue
        };
      }).filter(Boolean);

      logger.debug('✅ Conflictos resueltos:', resolvedConflicts);

      // Aplicar cambios resueltos al estado local
      resolvedConflicts.forEach(resolved => {
        if (resolved.table === 'tasks') {
          setTasksByProject(prev => ({
            ...prev,
            [currentProjectId]: prev[currentProjectId].map(task =>
              task.id === resolved.recordId ? { ...task, ...resolved.resolvedData } : task
            )
          }));
        }
        // Agregar más tablas según sea necesario
      });

      // Cerrar diálogo
      setShowConflictDialog(false);
      setConflicts([]);

      // Reintentar guardado
      logger.debug('🔄 Reintentando guardado después de resolver conflictos...');
      await handleManualSave();

    } catch (error) {
      logger.error('❌ Error resolviendo conflictos:', error);
      setSaveError(`Error resolviendo conflictos: ${error.message}`);
    }
  }, [conflicts, currentProjectId, handleManualSave]);

  /**
   * Cancelar resolución de conflictos
   */
  const handleConflictCancel = useCallback(() => {
    logger.debug('❌ Usuario canceló resolución de conflictos');
    setShowConflictDialog(false);
    setConflicts([]);
    setIsSaving(false);
  }, []);

  // ===== AUTO-GUARDADO DE RESPALDO (cada 5 minutos) =====
  useEffect(() => {
    // Solo activar si hay cambios sin guardar
    if (!hasUnsavedChanges || !useSupabase) {
      return;
    }

    logger.debug('⏰ Programando auto-guardado de respaldo en 5 minutos...');

    const autoSaveTimer = setTimeout(() => {
      if (hasUnsavedChanges && !isSaving) {
        logger.debug('🔄 Ejecutando auto-guardado de respaldo...');
        handleManualSave();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      clearTimeout(autoSaveTimer);
    };
  }, [hasUnsavedChanges, useSupabase, isSaving, handleManualSave]);

  // Prevenir cierre con cambios sin guardar
  useBeforeUnload(hasUnsavedChanges);

  // Atajo de teclado Ctrl+S / Cmd+S
  useSaveShortcut(handleManualSave, hasUnsavedChanges);

  // NOTA: safeSetTasksByProject, updateCurrentProjectTasks, importTasksToCurrentProject
  // ahora vienen de TasksContext (via useTasks hook)

  // Función para limpiar duplicados en Supabase
  const cleanDuplicatesInSupabase = async () => {
    if (useSupabase && supabaseService.isAuthenticated()) {
      logger.debug(' Iniciando limpieza de duplicados en Supabase...');
      const success = await supabaseService.cleanDuplicatesInSupabase();
      if (success) {
        alert('✅ Duplicados limpiados exitosamente en Supabase');
        // Recargar datos después de limpiar
        window.location.reload();
      } else {
        alert('❌ Error limpiando duplicados en Supabase');
      }
    } else {
      alert('⚠️ No hay conexión a Supabase');
    }
  };

  // Función para limpiar tareas duplicadas del proyecto actual - CON MONITOREO INTELIGENTE
  const cleanDuplicateTasks = () => {
    const currentTasks = getCurrentProjectTasks();
    if (!Array.isArray(currentTasks) || currentTasks.length === 0) {
      logger.debug(' No hay tareas para verificar duplicados');
      return;
    }

    logger.debug(`🔍 Verificando duplicados en proyecto ${currentProjectId}...`);
    logger.debug(`📊 Total de tareas: ${currentTasks.length}`);

    // Detectar duplicados REALES (mismo ID)
    const taskIds = new Set();
    const duplicateIds = [];
    const duplicateDetails = [];

    for (const task of currentTasks) {
      if (taskIds.has(task.id)) {
        duplicateIds.push(task.id);
        duplicateDetails.push(`ID: ${task.id}, Nombre: ${task.name}`);
        logger.warn(`🚨 DUPLICADO REAL detectado: ${task.id} - ${task.name}`);
      } else {
        taskIds.add(task.id);
      }
    }

    if (duplicateIds.length > 0) {
      logger.warn(`🚨 DUPLICADOS REALES detectados: ${duplicateIds.length}`);
      logger.warn('📋 Detalles:', duplicateDetails);

      // Crear backup antes de limpiar
      const backup = JSON.stringify(currentTasks);
      localStorage.setItem(`duplicates-backup-${currentProjectId}-${Date.now()}`, backup);
      logger.debug(' Backup de tareas duplicadas creado');

      // Limpiar solo duplicados reales (mantener la primera ocurrencia)
      const uniqueTasks = [];
      const seenIds = new Set();

      for (const task of currentTasks) {
        if (!seenIds.has(task.id)) {
          uniqueTasks.push(task);
          seenIds.add(task.id);
        }
      }

      logger.debug(`🧹 Limpiados ${duplicateIds.length} duplicados reales`);
      updateCurrentProjectTasks(uniqueTasks);
    } else {
      logger.debug(' Sin duplicados reales detectados');
    }
  };

  // NOTA: getCurrentProjectIncludeWeekends, updateCurrentProjectIncludeWeekends,
  // risksByProject, minutasByProject, getCurrentProjectRisks, getCurrentProjectMinutas
  // ahora vienen de TasksContext (via useTasks hook)

  // Función para actualizar minutas de un proyecto específico
  const updateProjectMinutas = (projectId, newMinutas) => {
    setMinutasByProject(prev => ({
      ...prev,
      [projectId]: newMinutas
    }));
  };

  // NOTA: updateCurrentProjectRisks ahora viene de TasksContext (via useTasks hook)

  // updateCurrentProjectPurchaseOrders, updateCurrentProjectAdvances,
  // updateCurrentProjectInvoices, updateCurrentProjectContracts
  // MIGRADO A FinancialContext - ahora vienen del hook useFinancial()

  // ===== FUNCIONES DE GESTIÓN FINANCIERA =====
  // MIGRADO A FinancialContext - purchaseOrders, advances, invoices, contracts, resources
  // Las funciones getCurrentProjectXXX() ahora vienen del hook useFinancial()

  // ===== FUNCIONES DE AUDITORÍA =====
  // NOTA: auditLogsByProject, getCurrentProjectAuditLogs
  // ahora vienen de TasksContext (via useTasks hook)

  // NOTA: dataLoaded ahora viene de ConfigContext (via useConfig hook)

  // ===== SISTEMA DE PERSISTENCIA =====

  // Función para guardar y cerrar
  // Funciones de autenticación
  const handleAuthSuccess = async (user) => {
    logger.debug(' Usuario autenticado:', user);
    setUseSupabase(true);
    setShowAuthModal(false);

    // Recargar datos desde Supabase
    const savedData = await supabaseService.loadPortfolioData();
    if (savedData) {
      if (savedData.projects && Array.isArray(savedData.projects) && savedData.projects.length > 0) {
        setProjects(savedData.projects);
      }
      if (savedData.currentProjectId) {
        setCurrentProjectId(savedData.currentProjectId);
      }
      if (savedData.tasksByProject) {
        safeSetTasksByProject(savedData.tasksByProject);
      }
      if (savedData.risksByProject) {
        setRisksByProject(savedData.risksByProject);
      }
      if (savedData.globalResources) {
        setGlobalResources(savedData.globalResources);
      }
    }
  };

  const handleAuthCancel = () => {
    logger.error(' Usuario canceló autenticación, usando modo local');
    setShowAuthModal(false);
    setUseSupabase(false);
  };

  const handleSaveAndClose = async () => {
    try {
      logger.debug('💾 Guardando datos antes de cerrar...');

      // Usar la función de guardado manual
      await handleManualSave();

      if (!saveError) {
        alert('✅ Datos guardados exitosamente. Puedes cerrar la aplicación manualmente.');
      } else {
        throw new Error(saveError);
      }
    } catch (error) {
      logger.error('❌ Error guardando datos:', error);
      alert('❌ Error al guardar los datos. Por favor, inténtalo de nuevo.');
    }
  };

  // Cargar datos del localStorage o Supabase al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        logger.debug(' Iniciando carga de datos...');

        // Inicializar Supabase primero
        logger.debug(' Inicializando Supabase...');
        const supabaseReady = await supabaseService.initialize();
        setSupabaseInitialized(supabaseReady);

        if (supabaseReady) {
          if (supabaseService.getCurrentUser()) {
            logger.debug(' Supabase inicializado con usuario autenticado');
            setUseSupabase(true);

            // Cargar datos desde Supabase
            logger.debug(' Cargando datos desde Supabase...');
            const savedData = await supabaseService.loadPortfolioData();
            logger.debug(' Resultado de loadPortfolioData():', savedData);

            if (!savedData) {
              logger.warn('⚠️ Error cargando datos desde Supabase');
              logger.warn('⚠️ Continuando con datos locales...');
              // Solo deshabilitar si hay ERROR real, no si es usuario nuevo sin datos
              setUseSupabase(false);
            } else if (!savedData.organization) {
              logger.error('❌ Usuario autenticado pero sin organización');
              logger.error('❌ Esto no debería suceder - verificar RLS y membresías');
              setUseSupabase(false);
            } else {
              // Usuario tiene organización - puede o no tener proyectos
              logger.debug(' Organización detectada en Supabase:', savedData.organization.name);
              logger.debug(' Proyectos encontrados:', savedData.projects?.length || 0);

              // MANTENER useSupabase = true incluso si no hay proyectos (usuario nuevo)
              // Esto permite guardar nuevos proyectos que se creen

              // Usar datos de Supabase si existen
              if (savedData.projects && Array.isArray(savedData.projects) && savedData.projects.length > 0) {
                logger.debug(' Cargando proyectos desde Supabase:', savedData.projects.length);
                setProjects(savedData.projects);
              } else {
                logger.debug(' Usuario nuevo sin proyectos - listo para crear el primero');
                setProjects([]); // Usuario nuevo comienza con array vacío
              }
              if (savedData.currentProjectId) {
                setCurrentProjectId(savedData.currentProjectId);
              }
              if (savedData.tasksByProject) {
                safeSetTasksByProject(savedData.tasksByProject);
              }
              if (savedData.minutasByProject) {
                setMinutasByProject(savedData.minutasByProject);
              }
              if (savedData.risksByProject) {
                setRisksByProject(savedData.risksByProject);
              }
              if (savedData.purchaseOrdersByProject) {
                setPurchaseOrdersByProject(savedData.purchaseOrdersByProject);
              }
              if (savedData.advancesByProject) {
                setAdvancesByProject(savedData.advancesByProject);
              }
              if (savedData.invoicesByProject) {
                setInvoicesByProject(savedData.invoicesByProject);
              }
              if (savedData.contractsByProject) {
                setContractsByProject(savedData.contractsByProject);
              }
              if (savedData.globalResources) {
                setGlobalResources(savedData.globalResources);
              }
              setDataLoaded(true);
              return;
            }
          } else {
            logger.warn(' Supabase disponible pero sin usuario autenticado');
            // Mostrar modal de autenticación inmediatamente
            setShowAuthModal(true);
          }
        }

        // Fallback: usar localStorage si Supabase no está disponible
        logger.warn(' Supabase no disponible, usando localStorage...');
        setUseSupabase(false);

        // Inicializar servicio de persistencia local
        logger.debug(' Inicializando filePersistenceService...');
        await filePersistenceService.initialize();
        logger.debug(' filePersistenceService inicializado');

        // Cargar datos desde el servicio local
        logger.debug(' Llamando a filePersistenceService.loadData()...');
        const savedData = await filePersistenceService.loadData();
        logger.debug(' Resultado de loadData():', savedData);

        if (savedData) {
          logger.debug(' Datos encontrados, cargando...');
          logger.debug(' globalResources en datos guardados:', savedData.globalResources);

          if (savedData.projects && Array.isArray(savedData.projects) && savedData.projects.length > 0) {
            logger.debug(' Cargando proyectos guardados:', savedData.projects.length);
            setProjects(savedData.projects);
          } else {
            logger.debug(' No hay proyectos guardados válidos, manteniendo proyectos iniciales');
          }
          if (savedData.currentProjectId) {
            setCurrentProjectId(savedData.currentProjectId);
          }
          if (savedData.tasksByProject) {
            safeSetTasksByProject(savedData.tasksByProject);
          }
          if (savedData.minutasByProject) {
            setMinutasByProject(savedData.minutasByProject);
          }
          if (savedData.includeWeekendsByProject) {
            setIncludeWeekendsByProject(savedData.includeWeekendsByProject);
          }
          if (savedData.risksByProject) {
            setRisksByProject(savedData.risksByProject);
          }
          if (savedData.purchaseOrdersByProject) {
            setPurchaseOrdersByProject(savedData.purchaseOrdersByProject);
          }
          if (savedData.advancesByProject) {
            setAdvancesByProject(savedData.advancesByProject);
          }
          if (savedData.invoicesByProject) {
            setInvoicesByProject(savedData.invoicesByProject);
          }
          if (savedData.contractsByProject) {
            setContractsByProject(savedData.contractsByProject);
          }
          if (savedData.globalResources) {
            logger.debug(' Estableciendo globalResources:', savedData.globalResources);
            setGlobalResources(savedData.globalResources);
          }
          if (savedData.resourceAssignmentsByProject) {
            setResourceAssignmentsByProject(savedData.resourceAssignmentsByProject);
          }
          if (savedData.auditLogsByProject) {
            setAuditLogsByProject(savedData.auditLogsByProject);
          }
        } else {
          logger.debug(' No se encontraron datos guardados');
          logger.debug(' savedData es:', savedData);
        }

        // NOTA: La limpieza de datos corruptos ahora se hace automáticamente
        // en TasksContext via safeSetTasksByProject

        // Marcar que los datos iniciales se han cargado
        logger.debug(' Marcando dataLoaded como true');
        setDataLoaded(true);
      } catch (error) {
        logger.error('❌ Error al cargar datos:', error);
        logger.error('❌ Stack trace:', error.stack);
        // Marcar como cargado incluso si hay error para evitar bloqueo
        setDataLoaded(true);
      }
    };

    loadData();
  }, []);

  // SOLUCIÓN PERMANENTE: Recargar datos desde Supabase cuando cambie el proyecto actual
  useEffect(() => {
    if (!dataLoaded || !useSupabase || !supabaseService.isAuthenticated()) {
      return;
    }

    const reloadProjectData = async () => {
      try {
        // ✅ NUEVO: Verificar si hay cambios sin guardar antes de recargar
        if (hasUnsavedChanges) {
          const userConfirmed = window.confirm(
            '⚠️ Tienes cambios sin guardar en el proyecto actual. ¿Deseas guardarlos antes de cambiar de proyecto?'
          );

          if (userConfirmed) {
            await handleManualSave();
          } else {
            // Usuario decidió no guardar - marcar como guardado para evitar advertencias
            markAsSaved();
          }
        }

        logger.debug('🔄 Recargando datos para el proyecto actual:', currentProjectId);
        const savedData = await supabaseService.loadPortfolioData();

        if (savedData) {
          // Actualizar solo los datos específicos del proyecto actual
          if (savedData.purchaseOrdersByProject) {
            setPurchaseOrdersByProject(savedData.purchaseOrdersByProject);
          }
          if (savedData.risksByProject) {
            setRisksByProject(savedData.risksByProject);
          }
          if (savedData.tasksByProject) {
            safeSetTasksByProject(savedData.tasksByProject);
          }
          if (savedData.advancesByProject) {
            setAdvancesByProject(savedData.advancesByProject);
          }
          if (savedData.invoicesByProject) {
            setInvoicesByProject(savedData.invoicesByProject);
          }
          if (savedData.contractsByProject) {
            setContractsByProject(savedData.contractsByProject);
          }
        }
      } catch (error) {
        logger.error('❌ Error recargando datos del proyecto:', error);
      }
    };

    reloadProjectData();
  }, [currentProjectId, dataLoaded, useSupabase]);

  // Escuchar eventos de restauración e importación
  useEffect(() => {
    const handleDataRestore = (event) => {
      const { data } = event.detail;

      if (data.projects) setProjects(data.projects);
      if (data.currentProjectId) setCurrentProjectId(data.currentProjectId);
      if (data.tasksByProject) safeSetTasksByProject(data.tasksByProject);
      if (data.risksByProject) setRisksByProject(data.risksByProject);
      if (data.purchaseOrdersByProject) {
        setPurchaseOrdersByProject(data.purchaseOrdersByProject);
      }
      if (data.advancesByProject) setAdvancesByProject(data.advancesByProject);
      if (data.invoicesByProject) setInvoicesByProject(data.invoicesByProject);
      if (data.contractsByProject) setContractsByProject(data.contractsByProject);
      if (data.globalResources) setGlobalResources(data.globalResources);
      if (data.resourceAssignmentsByProject) setResourceAssignmentsByProject(data.resourceAssignmentsByProject);
      if (data.auditLogsByProject) setAuditLogsByProject(data.auditLogsByProject);
    };

    const handleDataImport = (event) => {
      const { data } = event.detail;

      if (data.projects) setProjects(data.projects);
      if (data.currentProjectId) setCurrentProjectId(data.currentProjectId);
      if (data.tasksByProject) safeSetTasksByProject(data.tasksByProject);
      if (data.risksByProject) setRisksByProject(data.risksByProject);
      if (data.purchaseOrdersByProject) {
        setPurchaseOrdersByProject(data.purchaseOrdersByProject);
      }
      if (data.advancesByProject) setAdvancesByProject(data.advancesByProject);
      if (data.invoicesByProject) setInvoicesByProject(data.invoicesByProject);
      if (data.contractsByProject) setContractsByProject(data.contractsByProject);
      if (data.globalResources) setGlobalResources(data.globalResources);
      if (data.resourceAssignmentsByProject) setResourceAssignmentsByProject(data.resourceAssignmentsByProject);
      if (data.auditLogsByProject) setAuditLogsByProject(data.auditLogsByProject);
    };

    const handleToggleSupabase = (event) => {
      const { useSupabase: newUseSupabase } = event.detail;
      logger.debug(' Toggle Supabase desde ProjectManagementTabs:', newUseSupabase);
      setUseSupabase(newUseSupabase);
    };

    const handleRequestSupabaseAuth = (event) => {
      const { action } = event.detail;
      logger.debug(' Solicitud de autenticación Supabase:', action);

      if (action === 'activate') {
        // Verificar si ya está autenticado
        if (supabaseService.isAuthenticated()) {
          logger.debug(' Ya está autenticado, activando Supabase...');
          setUseSupabase(true);
          alert('✅ Supabase activado\n\nLos datos se sincronizarán automáticamente con la base de datos en la nube.');
        } else {
          logger.debug(' No está autenticado, mostrando modal...');
          setShowAuthModal(true);
        }
      }
    };

    window.addEventListener('dataRestore', handleDataRestore);
    window.addEventListener('dataImport', handleDataImport);
    window.addEventListener('toggleSupabase', handleToggleSupabase);
    window.addEventListener('requestSupabaseAuth', handleRequestSupabaseAuth);

    return () => {
      window.removeEventListener('dataRestore', handleDataRestore);
      window.removeEventListener('dataImport', handleDataImport);
      window.removeEventListener('toggleSupabase', handleToggleSupabase);
      window.removeEventListener('requestSupabaseAuth', handleRequestSupabaseAuth);
    };
  }, []);

  // ===== SISTEMA DE GUARDADO CON THROTTLING =====

  // Ref para controlar el throttling y evitar bucles infinitos
  const saveTimeoutRef = useRef(null);
  const lastSaveDataRef = useRef(null);
  const isSavingRef = useRef(false);

  // Función para comparar si los datos han cambiado realmente
  const hasDataChanged = (newData, oldData) => {
    if (!oldData) return true;

    // Comparar solo los campos esenciales para evitar guardados innecesarios
    const essentialFields = [
      'projects', 'currentProjectId', 'tasksByProject', 'risksByProject',
      'globalResources', 'purchaseOrdersByProject', 'advancesByProject',
      'invoicesByProject', 'contractsByProject', 'resourceAssignmentsByProject',
      'auditLogsByProject'
    ];

    return essentialFields.some(field => {
      const newValue = newData[field];
      const oldValue = oldData[field];

      // Para tareas, verificar cambios más específicos y robustos
      if (field === 'tasksByProject') {
        if (!newValue || !oldValue) return newValue !== oldValue;

        // Verificar si el número de tareas cambió
        const newTaskCount = Object.values(newValue).reduce((total, tasks) => total + (tasks?.length || 0), 0);
        const oldTaskCount = Object.values(oldValue).reduce((total, tasks) => total + (tasks?.length || 0), 0);

        if (newTaskCount !== oldTaskCount) {
          logger.debug(`📊 Cambio detectado en tareas: ${oldTaskCount} → ${newTaskCount}`);
          return true;
        }

        // Verificar cambios en tareas específicas por proyecto
        for (const projectId in newValue) {
          const newTasks = newValue[projectId] || [];
          const oldTasks = oldValue[projectId] || [];

          if (newTasks.length !== oldTasks.length) {
            logger.debug(`📊 Cambio en número de tareas del proyecto ${projectId}: ${oldTasks.length} → ${newTasks.length}`);
            return true;
          }

          // Crear hashes de contenido para comparación más eficiente
          const newTaskHashes = newTasks.map(task =>
            JSON.stringify({
              id: task.id,
              name: task.name,
              duration: task.duration,
              startDate: task.startDate,
              endDate: task.endDate,
              progress: task.progress,
              status: task.status,
              predecessors: task.predecessors,
              successors: task.successors
            })
          ).sort();

          const oldTaskHashes = oldTasks.map(task =>
            JSON.stringify({
              id: task.id,
              name: task.name,
              duration: task.duration,
              startDate: task.startDate,
              endDate: task.endDate,
              progress: task.progress,
              status: task.status,
              predecessors: task.predecessors,
              successors: task.successors
            })
          ).sort();

          // Comparar hashes ordenados
          if (JSON.stringify(newTaskHashes) !== JSON.stringify(oldTaskHashes)) {
            logger.debug(`📊 Cambio detectado en contenido de tareas del proyecto ${projectId}`);
            return true;
          }
        }
        return false;
      }

      if (field === 'projects' || field === 'risksByProject' ||
        field === 'globalResources' || field === 'purchaseOrdersByProject' ||
        field === 'advancesByProject' || field === 'invoicesByProject' ||
        field === 'contractsByProject' || field === 'resourceAssignmentsByProject' ||
        field === 'auditLogsByProject' || field === 'minutasByProject') {
        return JSON.stringify(newValue) !== JSON.stringify(oldValue);
      }

      return newValue !== oldValue;
    });
  };

  // Función de guardado con throttling
  const throttledSave = useCallback((dataToSave) => {
    // Cancelar guardado anterior si existe
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Verificar si los datos han cambiado realmente
    if (!hasDataChanged(dataToSave, lastSaveDataRef.current)) {
      logger.debug(' Datos sin cambios, omitiendo guardado');
      return;
    }

    // Verificar que no esté guardando ya
    if (isSavingRef.current) {
      logger.debug('⏳ Ya hay un guardado en progreso, omitiendo');
      return;
    }

    // PROTECCIÓN INTELIGENTE: Verificar duplicación masiva vs. proyectos grandes legítimos
    const tasksByProject = dataToSave.tasksByProject || {};
    const totalTasks = Object.values(tasksByProject).reduce((total, tasks) => total + (tasks?.length || 0), 0);
    const projectCount = Object.keys(tasksByProject).length;
    const avgTasksPerProject = projectCount > 0 ? totalTasks / projectCount : 0;

    // Detectar duplicación masiva: muchas tareas en pocos proyectos (ratio sospechoso)
    const isMassiveDuplication = totalTasks > 1000 && avgTasksPerProject > 800;

    if (isMassiveDuplication) {
      logger.error(`🚨 ALERTA: Posible duplicación masiva detectada:`);
      logger.error(`  • Total tareas: ${totalTasks}`);
      logger.error(`  • Proyectos: ${projectCount}`);
      logger.error(`  • Promedio por proyecto: ${avgTasksPerProject.toFixed(1)}`);
      logger.error(`  • Cancelando guardado por seguridad`);
      return;
    }

    // Log informativo para proyectos grandes legítimos
    if (totalTasks > 500) {
      logger.debug(`📊 Proyecto grande detectado: ${totalTasks} tareas en ${projectCount} proyectos (promedio: ${avgTasksPerProject.toFixed(1)} tareas/proyecto)`);
    }

    // Guardar con throttling de 1 segundo y cola de guardado
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true;

        logger.debug(' Guardando datos con throttling...');
        logger.debug(' DEBUG - Estado antes de guardar:');
        logger.debug('   useSupabase:', useSupabase);
        logger.debug('   isAuthenticated:', supabaseService.isAuthenticated());

        // Guardar usando Supabase si está disponible, sino usar localStorage
        if (useSupabase && supabaseService.isAuthenticated()) {
          logger.debug(' Guardando en Supabase...');
          const success = await supabaseService.savePortfolioData(dataToSave);
          if (!success) {
            throw new Error('Error guardando en Supabase');
          }
          logger.debug(' Datos guardados en Supabase');
        } else {
          logger.debug(' NO guardando en Supabase - Usando localStorage');
          logger.debug('   Razón: useSupabase =', useSupabase, ', isAuthenticated =', supabaseService.isAuthenticated());
          // Fallback: usar localStorage y archivo local
          try {
            localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(dataToSave));
            logger.debug(' Datos guardados en localStorage');
          } catch (error) {
            logger.error('❌ Error guardando en localStorage:', error);
            // Si localStorage falla, intentar limpiar datos antiguos
            if (error.name === 'QuotaExceededError') {
              logger.debug(' Espacio insuficiente, limpiando datos antiguos...');
              // Aquí podrías implementar limpieza de datos antiguos
            }
            throw error;
          }

          // Guardar en archivo local (persistente) con reintentos
          let retries = 3;
          while (retries > 0) {
            try {
              await filePersistenceService.saveData(dataToSave);
              break;
            } catch (error) {
              retries--;
              if (retries === 0) throw error;
              logger.debug(`🔄 Reintentando guardado... (${retries} intentos restantes)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Actualizar referencia de último guardado
        lastSaveDataRef.current = dataToSave;

        logger.debug(' Datos guardados exitosamente');

        // Disparar evento de sincronización SOLO si es necesario
        // y no estamos en el proceso de carga inicial
        if (dataLoaded) {
          const syncEvent = new CustomEvent('dataSync', {
            detail: {
              type: 'portfolio_data_saved',
              timestamp: new Date().toISOString(),
              source: 'throttled_save'
            }
          });
          window.dispatchEvent(syncEvent);
        }

      } catch (error) {
        logger.error('❌ Error guardando datos:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000); // Throttling de 1 segundo
  }, [dataLoaded]);

  // Guardar datos cuando cambien (solo después de cargar datos iniciales)
  useEffect(() => {
    // No guardar hasta que se hayan cargado los datos iniciales
    if (!dataLoaded) {
      logger.debug('⏳ Esperando a que se carguen los datos iniciales...');
      return;
    }

    logger.debug(' useEffect GUARDADO - EJECUTÁNDOSE:', {
      tasksByProjectKeys: Object.keys(tasksByProject),
      tasksForCurrentProject: tasksByProject[currentProjectId] ? tasksByProject[currentProjectId].length : 'UNDEFINED',
      currentProjectId,
      totalTasks: Object.values(tasksByProject).reduce((total, tasks) => total + (tasks?.length || 0), 0)
    });

    const dataToSave = {
      projects,
      currentProjectId,
      tasksByProject,
      minutasByProject,
      includeWeekendsByProject,
      risksByProject,
      purchaseOrdersByProject,
      advancesByProject,
      invoicesByProject,
      contractsByProject,
      globalResources,
      resourceAssignmentsByProject,
      auditLogsByProject,
      timestamp: new Date().toISOString()
    };

    // Usar función de guardado con throttling
    throttledSave(dataToSave);
  }, [projects, currentProjectId, tasksByProject, minutasByProject, includeWeekendsByProject, risksByProject, purchaseOrdersByProject, advancesByProject, invoicesByProject, contractsByProject, globalResources, resourceAssignmentsByProject, auditLogsByProject, dataLoaded]); // INCLUIDO tasksByProject y minutasByProject en las dependencias para guardado automático

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Actualizar progreso automático de proyectos cuando cambien las tareas
  useEffect(() => {
    if (!dataLoaded || !tasksByProject) return;

    logger.debug(' ACTUALIZANDO PROGRESO AUTOMÁTICO DE PROYECTOS');

    // Actualizar progreso de todos los proyectos activos
    let hasUpdates = false;
    const updates = [];

    projects.forEach(project => {
      if (project.status === 'active') {
        const newProgress = calculateProjectProgress(project.id);

        // Solo actualizar si el progreso ha cambiado
        if (newProgress !== project.progress) {
          logger.debug(`📊 Actualizando progreso del proyecto ${project.name}: ${project.progress}% → ${newProgress}%`);
          updates.push({ id: project.id, progress: newProgress });
          hasUpdates = true;
        }
      }
    });

    // Aplicar todas las actualizaciones de una vez
    if (hasUpdates) {
      setProjects(prev => prev.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update
          ? { ...p, progress: update.progress, updatedAt: new Date().toISOString() }
          : p;
      }));
    }
  }, [tasksByProject, dataLoaded]); // Removido 'projects' de las dependencias para evitar bucle infinito

  // ===== FUNCIONES DE GESTIÓN DE PROYECTOS =====

  // Función helper segura para obtener datos del proyecto actual
  const getCurrentProjectData = (dataType) => {
    if (!currentProjectId) return [];

    switch (dataType) {
      case 'tasks':
        return tasksByProject[currentProjectId] || [];
      case 'risks':
        return risksByProject[currentProjectId] || [];
      case 'minutas':
        return minutasByProject[currentProjectId] || [];
      case 'purchaseOrders':
        return purchaseOrdersByProject[currentProjectId] || [];
      case 'advances':
        return advancesByProject[currentProjectId] || [];
      case 'invoices':
        return invoicesByProject[currentProjectId] || [];
      case 'contracts':
        return contractsByProject[currentProjectId] || [];
      case 'resourceAssignments':
        return resourceAssignmentsByProject[currentProjectId] || [];
      case 'auditLogs':
        return auditLogsByProject[currentProjectId] || [];
      default:
        return [];
    }
  };

  // Función para calcular el progreso automático del proyecto basado en sus tareas
  const calculateProjectProgress = (projectId) => {
    const projectTasks = tasksByProject[projectId] || [];

    if (projectTasks.length === 0) {
      return 0;
    }

    // Calcular progreso promedio de todas las tareas (excluyendo hitos)
    const regularTasks = projectTasks.filter(task => !task.isMilestone);

    if (regularTasks.length === 0) {
      return 0;
    }

    const totalProgress = regularTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    const averageProgress = Math.round(totalProgress / regularTasks.length);

    logger.debug(' CÁLCULO PROGRESO AUTOMÁTICO:', {
      projectId,
      totalTasks: projectTasks.length,
      regularTasks: regularTasks.length,
      totalProgress,
      averageProgress,
      tasksDetails: regularTasks.map(t => ({
        name: t.name,
        progress: t.progress,
        isMilestone: t.isMilestone
      }))
    });

    return Math.min(100, Math.max(0, averageProgress));
  };

  const createProject = (projectData) => {
    // Generar UUID válido para el proyecto
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const newProject = {
      id: generateUUID(),
      name: projectData.name,
      description: projectData.description,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      budget: projectData.budget,
      plannedValue: projectData.plannedValue || 0, // PMBOK 7 - Valor de negocio esperado
      status: projectData.status,
      priority: projectData.priority,
      manager: projectData.manager,
      sponsor: projectData.sponsor || '',
      objective: projectData.objective || '',
      businessCase: projectData.businessCase || '',
      irr: projectData.irr || 0,
      roi: projectData.roi || 0,
      contingencyReserve: projectData.contingencyReserve || 0,
      managementReserve: projectData.managementReserve || 0,
      kickoffDate: projectData.kickoffDate || '',
      stakeholders: projectData.stakeholders || [],
      team: projectData.team || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      progress: 0
    };

    setProjects(prev => {
      const updatedProjects = prev.slice();
      updatedProjects.push(newProject);
      return updatedProjects;
    });

    // Work Packages eliminados - ya no se usan

    setTasksByProject(prev => {
      const updatedProjects = Object.assign({}, prev);
      updatedProjects[newProject.id] = [];
      return updatedProjects;
    });

    setIncludeWeekendsByProject(prev => {
      const updatedProjects = Object.assign({}, prev);
      updatedProjects[newProject.id] = false; // Por defecto: solo días laborales
      return updatedProjects;
    });

    setRisksByProject(prev => {
      const updatedProjects = Object.assign({}, prev);
      updatedProjects[newProject.id] = [];
      return updatedProjects;
    });

    return newProject;
  };

  const updateProject = (projectId, updates) => {
    // Calcular progreso automático si no se proporciona explícitamente
    const autoProgress = updates.progress !== undefined ? updates.progress : calculateProjectProgress(projectId);

    // Actualizar localmente - el auto-save se encargará de guardar en Supabase
    setProjects(prev => prev.map(project =>
      project.id === projectId
        ? {
          id: project.id,
          name: updates.name || project.name,
          description: updates.description || project.description,
          startDate: updates.startDate || project.startDate,
          endDate: updates.endDate || project.endDate,
          budget: updates.budget || project.budget,
          plannedValue: updates.plannedValue !== undefined ? updates.plannedValue : project.plannedValue,
          status: updates.status !== undefined ? updates.status : project.status, // ✅ CORREGIDO: usar !== undefined
          priority: updates.priority || project.priority,
          manager: updates.manager || project.manager,
          sponsor: updates.sponsor || project.sponsor,
          irr: updates.irr !== undefined ? updates.irr : project.irr,
          objective: updates.objective || project.objective,
          businessCase: updates.businessCase || project.businessCase,
          team: updates.team || project.team,
          createdAt: project.createdAt,
          updatedAt: new Date().toISOString(),
          version: project.version,
          progress: autoProgress
        }
        : project
    ));
  };

  const deleteProject = async (projectId) => {
    // Eliminar de Supabase si está autenticado
    if (useSupabase && supabaseService.isAuthenticated()) {
      logger.debug(`🗑️ Eliminando proyecto ${projectId} de Supabase...`);
      const success = await supabaseService.deleteProject(projectId);
      if (success) {
        logger.debug(`✅ Proyecto ${projectId} eliminado de Supabase`);
      } else {
        logger.warn(`⚠️ Error eliminando proyecto ${projectId} de Supabase`);
      }
    }

    // Eliminar localmente
    setProjects(prev => prev.filter(project => project.id !== projectId));

    // Work Packages eliminados - ya no se usan

    setTasksByProject(prev => {
      const newData = Object.assign({}, prev);
      delete newData[projectId];
      return newData;
    });

    setRisksByProject(prev => {
      const newData = Object.assign({}, prev);
      delete newData[projectId];
      return newData;
    });
  };

  // ===== FUNCIONES DE WORK PACKAGES =====

  // Work Packages eliminados - ya no se usan

  // ===== MÉTRICAS DEL PORTAFOLIO =====

  const portfolioMetrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0);
    const averageProgress = totalProjects > 0 ? totalProgress / totalProjects : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      averageProgress,
      healthScore: averageProgress > 80 ? 'excellent' : averageProgress > 60 ? 'good' : 'needs_attention'
    };
  }, [projects]);

  // ===== FUNCIONES DE IMPORTACIÓN/EXPORTACIÓN =====

  const importData = (data) => {
    try {
      if (data.projects) setProjects(data.projects);
      if (data.currentProjectId) setCurrentProjectId(data.currentProjectId);
      if (data.tasksByProject) safeSetTasksByProject(data.tasksByProject);
      if (data.includeWeekendsByProject) setIncludeWeekendsByProject(data.includeWeekendsByProject);
      if (data.risksByProject) setRisksByProject(data.risksByProject);
      if (data.purchaseOrdersByProject) {
        setPurchaseOrdersByProject(data.purchaseOrdersByProject);
      }
      if (data.advancesByProject) setAdvancesByProject(data.advancesByProject);
      if (data.invoicesByProject) setInvoicesByProject(data.invoicesByProject);
      if (data.contractsByProject) setContractsByProject(data.contractsByProject);
      if (data.globalResources) setGlobalResources(data.globalResources);
      if (data.resourceAssignmentsByProject) setResourceAssignmentsByProject(data.resourceAssignmentsByProject);
      if (data.auditLogsByProject) setAuditLogsByProject(data.auditLogsByProject);

      // Disparar evento de sincronización
      const syncEvent = new CustomEvent('dataSync', {
        detail: {
          type: 'data_imported',
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(syncEvent);

      return true;
    } catch (error) {
      logger.error('Error al importar datos:', error);
      return false;
    }
  };

  // ===== ESTADOS DE INTERFAZ =====

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportingDate, setReportingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showHelp, setShowHelp] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [organizationId, setOrganizationId] = useState(null);
  // Función para determinar la sección inicial basada en permisos
  const getInitialSection = () => {
    // Usuarios de solo lectura: iniciar en 'executive' (Dashboard Ejecutivo)
    // Usuarios normales: iniciar en 'portfolio' (comportamiento por defecto)
    // La redirección automática se maneja en el useEffect
    return 'portfolio';
  };

  const [activeSection, setActiveSection] = useState('portfolio'); // Se actualizará cuando se carguen los permisos
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Iniciar expandido

  // Función para cambiar sección y colapsar sidebar automáticamente
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setIsSidebarCollapsed(true); // Colapsar sidebar automáticamente
  };

  // Obtener organizationId cuando se autentique
  useEffect(() => {
    const loadOrganizationId = async () => {
      if (useSupabase && supabaseService.isAuthenticated()) {
        const orgId = await supabaseService.getCurrentOrganization();
        if (orgId) {
          setOrganizationId(orgId);
        }
      }
    };
    loadOrganizationId();
  }, [useSupabase, user]);

  // Redirección automática para usuarios de solo lectura
  useEffect(() => {
    // Solo ejecutar cuando los permisos ya se cargaron
    if (!permissionsLoading && userRole) {
      const currentSection = activeSection;
      const isReadOnlyUser = isReadOnly();

      logger.debug(' Verificando redirección automática:', {
        userRole,
        isReadOnlyUser,
        currentSection,
        permissionsLoading
      });

      // Solo redirigir usuarios de solo lectura desde secciones restringidas
      if (isReadOnlyUser && (currentSection === 'portfolio' || currentSection === 'user-management')) {
        logger.debug(' Redirigiendo usuario de solo lectura de', currentSection, 'a Dashboard Ejecutivo');
        setActiveSection('executive');
      }
      // NOTA: Usuarios con permisos completos tienen navegación libre - NO redirigir
    }
  }, [permissionsLoading, userRole, isReadOnly, activeSection]);

  // 🚀 NUEVO: Escuchar eventos de actualización de tareas de minutas
  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      logger.debug(' Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });

      // Forzar recálculo del Dashboard resumen
      logger.debug(' Forzando recálculo del Dashboard resumen...');
      // El Dashboard se actualizará automáticamente cuando cambien los datos
    };

    const handleAutoSaveTrigger = (event) => {
      const { source, data } = event.detail;
      logger.debug(' Evento autoSaveTrigger recibido:', { source, data });

      // Activar el guardado manual
      if (source === 'minutaUpdate') {
        logger.debug(' Activando guardado manual por actualización de minuta...');

        // Ejecutar guardado manual
        handleManualSave();
      }
    };

    // Agregar listeners
    window.addEventListener('minutaStatusChanged', handleMinutaStatusChanged);
    window.addEventListener('autoSaveTrigger', handleAutoSaveTrigger);

    // Cleanup
    return () => {
      window.removeEventListener('minutaStatusChanged', handleMinutaStatusChanged);
      window.removeEventListener('autoSaveTrigger', handleAutoSaveTrigger);
    };
  }, [handleManualSave]);

  // Estados de modales
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // ===== RENDERIZADO =====

  const currentProject = getCurrentProject();

  // Validar que hay un proyecto seleccionado
  if (!currentProject && projects.length > 0) {
    // Hay proyectos pero ninguno seleccionado, seleccionar el primero
    const firstProject = projects[0];
    setCurrentProjectId(firstProject.id);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Seleccionando proyecto...</p>
        </div>
      </div>
    );
  }

  // Si no hay proyectos, mostrar mensaje de bienvenida
  // PERO seguir renderizando la interfaz normal para que el usuario pueda crear proyectos
  // desde el PortfolioStrategic que tiene el flujo completo de creación
  if (!currentProject && projects.length === 0) {
    // No hacer return aquí - dejar que se renderice la interfaz normal
    // El PortfolioStrategic manejará la pantalla vacía con su propio mensaje
    logger.debug('👋 Usuario nuevo sin proyectos - mostrando interfaz de portfolio');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de autenticación */}
      {showAuthModal && (
        <SupabaseAuth
          onAuthSuccess={handleAuthSuccess}
          onAuthCancel={handleAuthCancel}
        />
      )}

      <SyncIndicator
        useSupabase={useSupabase}
        supabaseInitialized={supabaseInitialized}
        isAuthenticated={supabaseService.isAuthenticated()}
      />

      {/* Botón para mostrar modal de Supabase */}
      {!useSupabase && supabaseInitialized && (
        <div className="fixed top-20 right-4 z-40">
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            ☁️ Conectar con la Nube
          </button>
        </div>
      )}
      <FileStatusIndicator />
      <AutoSaveIndicator />

      <div className="flex">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          projects={projects}
          currentProjectId={currentProjectId}
          workPackages={[]}
          risks={getCurrentProjectRisks()}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSave={handleManualSave}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />

        {/* Floating Save Button */}
        <FloatingSaveButton
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onSave={handleManualSave}
        />

        {/* Conflict Resolution Dialog */}
        {showConflictDialog && (
          <Suspense fallback={<div>Cargando...</div>}>
            <ConflictResolutionDialog
              conflicts={conflicts}
              onResolve={handleConflictResolve}
              onCancel={handleConflictCancel}
            />
          </Suspense>
        )}

        <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-80 lg:ml-72'}`}>
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'p-4' : 'p-6'}`}>
            {/* Over Limit Banner (priority - must show first) */}
            {useSupabase && organizationId && (
              <OverLimitBanner
                organizationId={organizationId}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            {/* Trial Status Banner */}
            {useSupabase && organizationId && (
              <TrialStatusBanner
                organizationId={organizationId}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}
            {/* Dashboard Ejecutivo */}
            {activeSection === 'executive' && (
              <ConsolidatedDashboard
                projects={projects}
                portfolioMetrics={portfolioMetrics}
                workPackages={[]}
                risks={Object.values(risksByProject).flat()}
                purchaseOrders={Object.values(purchaseOrdersByProject).flat()}
                advances={Object.values(advancesByProject).flat()}
                invoices={Object.values(invoicesByProject).flat()}
                tasksByProject={tasksByProject}
                purchaseOrdersByProject={purchaseOrdersByProject}
                advancesByProject={advancesByProject}
                invoicesByProject={invoicesByProject}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleManualSave}
              />
            )}

            {/* Gestión de Usuarios */}
            {activeSection === 'user-management' && (
              <UserManagement
                currentProject={currentProject}
                useSupabase={useSupabase}
                projects={projects}
              />
            )}

            {/* Portafolio de Proyectos */}
            {activeSection === 'portfolio' && (
              <PortfolioStrategic
                projects={projects}
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                workPackages={[]}
                risks={getCurrentProjectRisks()}
                globalResources={globalResources}
                setGlobalResources={setGlobalResources}
                createProject={createProject}
                updateProject={updateProject}
                deleteProject={deleteProject}
                tasks={getCurrentProjectTasks()}
                tasksByProject={tasksByProject}
                minutasByProject={minutasByProject}
                purchaseOrders={getCurrentProjectPurchaseOrders()}
                advances={getCurrentProjectAdvances()}
                invoices={getCurrentProjectInvoices()}
                contracts={getCurrentProjectContracts()}
                auditLogs={getCurrentProjectAuditLogs()}
                includeWeekendsByProject={includeWeekendsByProject}
                setIncludeWeekendsByProject={setIncludeWeekendsByProject}
                getCurrentProjectIncludeWeekends={getCurrentProjectIncludeWeekends}
                useSupabase={useSupabase}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleManualSave}
              />
            )}

            {/* Gestión de Proyectos */}
            {activeSection === 'project-management' && (
              <ProjectManagementTabs
                projects={projects}
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                workPackages={[]}
                setWorkPackages={() => { }}
                risks={getCurrentProjectRisks()}
                setRisks={updateCurrentProjectRisks}
                reportingDate={reportingDate}
                setReportingDate={setReportingDate}
                tasks={getCurrentProjectTasks()}
                setTasks={(newTasksOrUpdater) => {
                  // Si es una función (setter de React), ejecutarla para obtener el array
                  if (typeof newTasksOrUpdater === 'function') {
                    const currentTasks = getCurrentProjectTasks();
                    const newTasks = newTasksOrUpdater(currentTasks);
                    updateCurrentProjectTasks(newTasks);
                  } else {
                    // Si es directamente un array, pasarlo
                    updateCurrentProjectTasks(newTasksOrUpdater);
                  }
                }}
                importTasks={importTasksToCurrentProject}
                includeWeekends={getCurrentProjectIncludeWeekends()}
                setIncludeWeekends={updateCurrentProjectIncludeWeekends}
                purchaseOrders={getCurrentProjectPurchaseOrders()}
                setPurchaseOrders={updateCurrentProjectPurchaseOrders}
                advances={getCurrentProjectAdvances()}
                setAdvances={updateCurrentProjectAdvances}
                invoices={getCurrentProjectInvoices()}
                setInvoices={updateCurrentProjectInvoices}
                contracts={getCurrentProjectContracts()}
                setContracts={updateCurrentProjectContracts}
                resourceAssignments={getCurrentProjectResourceAssignments()}
                useSupabase={useSupabase}
                updateProjectMinutas={updateProjectMinutas}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleManualSave}
              />
            )}

            {/* Gestión de Miembros de Organización */}
            {activeSection === 'organization-members' && (
              <OrganizationMembers
                currentProject={currentProject}
                useSupabase={useSupabase}
                onMemberAdded={() => {
                  logger.debug(' Nuevo miembro agregado a la organización');
                  // Aquí podrías agregar lógica adicional si es necesario
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && organizationId && (
        <Suspense fallback={<div>Cargando...</div>}>
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            organizationId={organizationId}
            onUpgradeSuccess={() => {
              setShowUpgradeModal(false);
              // Recargar datos para reflejar el nuevo plan
              window.location.reload();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

// Componente principal de la aplicación
function App() {
  return (
    <Router>
      <ConfigProvider>
        <AuthProvider>
          <ProjectsProvider>
            <FinancialProvider>
              <ConcurrencyProvider>
                <TasksProvider>
                  <ProjectProvider>
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback message="Cargando aplicación..." />}>
                        <Routes>
                          {/* Rutas de Suscripción */}
                          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                          <Route path="/subscription/cancelled" element={<SubscriptionCancelled />} />

                          {/* Rutas de Super-Admin */}
                          <Route
                            path="/admin"
                            element={
                              <SuperAdminRoute>
                                <SuperAdminDashboard />
                              </SuperAdminRoute>
                            }
                          />
                          <Route
                            path="/admin/organizations/:orgId"
                            element={
                              <SuperAdminRoute>
                                <OrganizationDetails />
                              </SuperAdminRoute>
                            }
                          />

                          {/* Ruta principal - App normal */}
                          <Route path="/*" element={<AppContent />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </ProjectProvider>
                </TasksProvider>
              </ConcurrencyProvider>
            </FinancialProvider>
          </ProjectsProvider>
        </AuthProvider>
      </ConfigProvider>
    </Router>
  );
}

// Componente que maneja el splash screen y la autenticación
function AppContent() {
  const { showSplash, completeSplash, isAuthenticated } = useAuth();

  // Si está mostrando splash screen, no verificar autenticación
  if (showSplash) {
    return <SplashScreen onComplete={completeSplash} />;
  }

  // DESACTIVAR AUTENTICACIÓN - Cargar directamente MainApp
  return <MainApp />;
}

export default App;
