import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { debounce } from 'lodash';
import './App.css';
import './index.css';

// Componentes
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import ConsolidatedDashboard from './components/ConsolidatedDashboard';
import IntegratedPMODashboard from './components/IntegratedPMODashboard';
import PortfolioStrategic from './components/PortfolioStrategic';
import ProjectManagementTabs from './components/ProjectManagementTabs';
import ScheduleManagement from './components/ScheduleManagement';
import FinancialManagement from './components/FinancialManagement';
import ResourceManagement from './components/ResourceManagement';
import RiskManagement from './components/RiskManagement';
import ChangeManagement from './components/ChangeManagement';
import CashFlowProjection from './components/CashFlowProjection';
import FileManager from './components/FileManager';
import ReportsManagement from './components/ReportsManagement';
import ProjectAudit from './components/ProjectAudit';
import ProjectArchive from './components/ProjectArchive';
import SyncIndicator from './components/SyncIndicator';
import BackupManager from './components/BackupManager';
import FileStatusIndicator from './components/FileStatusIndicator';
import AutoSaveIndicator from './components/AutoSaveIndicator';
import SupabaseAuth from './components/SupabaseAuth';
import OrganizationMembers from './components/OrganizationMembers';
import UserManagement from './components/UserManagement';
import SplashScreen from './components/SplashScreen';

// Super Admin Components
import SuperAdminRoute from './components/admin/SuperAdminRoute';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import OrganizationDetails from './components/admin/OrganizationDetails';

import filePersistenceService from './services/FilePersistenceService';
import supabaseService from './services/SupabaseService';

// Contextos
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ProjectsProvider, useProjects } from './contexts/ProjectsContext';
import { FinancialProvider, useFinancial } from './contexts/FinancialContext';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { ConfigProvider, useConfig } from './contexts/ConfigContext';

// Hooks
import usePermissions from './hooks/usePermissions';

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
  const { user, showSplash, completeSplash } = useAuth();

  // Hook de permisos para detectar usuarios de solo lectura
  const { isReadOnly, userRole, isLoading: permissionsLoading } = usePermissions();

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

  // NOTA: Script de diagnóstico deshabilitado temporalmente
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development') {
  //     import('./debug-file-storage').catch(err => {
  //       console.warn('No se pudo cargar el script de diagnóstico:', err);
  //     });
  //   }
  // }, []);

  // Work Packages eliminados - ya no se usan
  // Tareas, minutas, riesgos - MIGRADO A TasksContext

  // cleanTasksByProject, getCurrentProjectTasks, cleanCorruptDataOnce
  // MIGRADO A TasksContext - ahora vienen del hook useTasks()

  // Sistema de auto-guardado con debouncing
  const debouncedSave = useCallback(
    debounce(async (dataToSave) => {
      if (!useSupabase || !supabaseService.isAuthenticated()) {
        console.log('⏭️ Saltando guardado - No autenticado o Supabase deshabilitado');
        return;
      }
      
      console.log('💾 Auto-guardando cambios...');
      const saveStartTime = Date.now();
      
      try {
        const success = await supabaseService.savePortfolioData(dataToSave);
        
        if (success) {
          const duration = Date.now() - saveStartTime;
          console.log(`✅ Auto-guardado exitoso en ${duration}ms`);
          
          // Disparar evento para actualizar UI
          const event = new CustomEvent('autoSaveComplete', { 
            detail: { duration, timestamp: new Date().toISOString() } 
          });
          window.dispatchEvent(event);
        } else {
          console.warn('⚠️ Auto-guardado falló');
        }
      } catch (error) {
        console.error('❌ Error en auto-guardado:', error);
      }
    }, 2000), // Esperar 2 segundos después del último cambio
    [useSupabase]
  );

  // Cancelar guardado pendiente al desmontar
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // NOTA: safeSetTasksByProject, updateCurrentProjectTasks, importTasksToCurrentProject
  // ahora vienen de TasksContext (via useTasks hook)

  // Función para limpiar duplicados en Supabase
  const cleanDuplicatesInSupabase = async () => {
    if (useSupabase && supabaseService.isAuthenticated()) {
      console.log('🧹 Iniciando limpieza de duplicados en Supabase...');
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
      console.log('✅ No hay tareas para verificar duplicados');
      return;
    }

    console.log(`🔍 Verificando duplicados en proyecto ${currentProjectId}...`);
    console.log(`📊 Total de tareas: ${currentTasks.length}`);

    // Detectar duplicados REALES (mismo ID)
    const taskIds = new Set();
    const duplicateIds = [];
    const duplicateDetails = [];

    for (const task of currentTasks) {
      if (taskIds.has(task.id)) {
        duplicateIds.push(task.id);
        duplicateDetails.push(`ID: ${task.id}, Nombre: ${task.name}`);
        console.warn(`🚨 DUPLICADO REAL detectado: ${task.id} - ${task.name}`);
      } else {
        taskIds.add(task.id);
      }
    }

    if (duplicateIds.length > 0) {
      console.warn(`🚨 DUPLICADOS REALES detectados: ${duplicateIds.length}`);
      console.warn('📋 Detalles:', duplicateDetails);
      
      // Crear backup antes de limpiar
      const backup = JSON.stringify(currentTasks);
      localStorage.setItem(`duplicates-backup-${currentProjectId}-${Date.now()}`, backup);
      console.log('💾 Backup de tareas duplicadas creado');
      
      // Limpiar solo duplicados reales (mantener la primera ocurrencia)
      const uniqueTasks = [];
      const seenIds = new Set();
      
      for (const task of currentTasks) {
        if (!seenIds.has(task.id)) {
          uniqueTasks.push(task);
          seenIds.add(task.id);
        }
      }
      
      console.log(`🧹 Limpiados ${duplicateIds.length} duplicados reales`);
      updateCurrentProjectTasks(uniqueTasks);
    } else {
      console.log('✅ Sin duplicados reales detectados');
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
    console.log('✅ Usuario autenticado:', user);
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
    console.log('❌ Usuario canceló autenticación, usando modo local');
    setShowAuthModal(false);
    setUseSupabase(false);
  };

  const handleSaveAndClose = async () => {
    try {
      console.log('💾 Guardando datos antes de cerrar...');
      
      // Crear objeto con todos los datos actuales
      const dataToSave = {
        projects,
        currentProjectId,
        tasksByProject,
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

      // Guardar usando Supabase si está disponible, sino usar localStorage
      if (useSupabase && supabaseService.isAuthenticated()) {
        console.log('💾 Guardando en Supabase...');
        const success = await supabaseService.savePortfolioData(dataToSave);
        if (success) {
          console.log('✅ Datos guardados exitosamente en Supabase');
          alert('✅ Datos guardados exitosamente en la nube. Puedes cerrar la aplicación manualmente.');
        } else {
          throw new Error('Error guardando en Supabase');
        }
      } else {
        console.log('💾 Guardando en localStorage...');
        await filePersistenceService.saveData(dataToSave);
        console.log('✅ Datos guardados exitosamente en localStorage');
        alert('✅ Datos guardados exitosamente en archivo local. Puedes cerrar la aplicación manualmente.');
      }
      
    } catch (error) {
      console.error('❌ Error guardando datos:', error);
      alert('❌ Error al guardar los datos. Por favor, inténtalo de nuevo.');
    }
  };
  
  // Cargar datos del localStorage o Supabase al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🚀 Iniciando carga de datos...');
        
        // Inicializar Supabase primero
        console.log('🔧 Inicializando Supabase...');
        const supabaseReady = await supabaseService.initialize();
        setSupabaseInitialized(supabaseReady);
        
        if (supabaseReady) {
          if (supabaseService.getCurrentUser()) {
            console.log('✅ Supabase inicializado con usuario autenticado');
            setUseSupabase(true);
            
            // Cargar datos desde Supabase
            console.log('🔍 Cargando datos desde Supabase...');
            const savedData = await supabaseService.loadPortfolioData();
            console.log('🔍 Resultado de loadPortfolioData():', savedData);
            
            if (!savedData || !savedData.organization) {
              console.warn('⚠️ No se pudieron cargar datos desde Supabase');
              console.warn('⚠️ Continuando con datos locales...');
              // Usar fallback a IndexedDB/localStorage
              setUseSupabase(false);
            } else {
              console.log('📂 Datos encontrados en Supabase, cargando...');
              
              // Usar datos de Supabase
              if (savedData.organization) {
                console.log('✅ Datos sincronizados desde Supabase');
              }
              if (savedData.projects && Array.isArray(savedData.projects) && savedData.projects.length > 0) {
                console.log('📂 Cargando proyectos desde Supabase:', savedData.projects.length);
                setProjects(savedData.projects);
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
          console.log('⚠️ Supabase disponible pero sin usuario autenticado');
          // Mostrar modal de autenticación inmediatamente
          setShowAuthModal(true);
        }
        }
        
        // Fallback: usar localStorage si Supabase no está disponible
        console.log('⚠️ Supabase no disponible, usando localStorage...');
        setUseSupabase(false);
        
        // Inicializar servicio de persistencia local
        console.log('🔧 Inicializando filePersistenceService...');
        await filePersistenceService.initialize();
        console.log('✅ filePersistenceService inicializado');
        
        // Cargar datos desde el servicio local
        console.log('🔍 Llamando a filePersistenceService.loadData()...');
        const savedData = await filePersistenceService.loadData();
        console.log('🔍 Resultado de loadData():', savedData);
        
        if (savedData) {
          console.log('📂 Datos encontrados, cargando...');
          console.log('📂 globalResources en datos guardados:', savedData.globalResources);
          
          if (savedData.projects && Array.isArray(savedData.projects) && savedData.projects.length > 0) {
            console.log('📂 Cargando proyectos guardados:', savedData.projects.length);
            setProjects(savedData.projects);
          } else {
            console.log('📂 No hay proyectos guardados válidos, manteniendo proyectos iniciales');
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
            console.log('📂 Estableciendo globalResources:', savedData.globalResources);
            setGlobalResources(savedData.globalResources);
          }
          if (savedData.resourceAssignmentsByProject) {
            setResourceAssignmentsByProject(savedData.resourceAssignmentsByProject);
          }
          if (savedData.auditLogsByProject) {
            setAuditLogsByProject(savedData.auditLogsByProject);
          }
        } else {
          console.log('📂 No se encontraron datos guardados');
          console.log('📂 savedData es:', savedData);
        }

        // NOTA: La limpieza de datos corruptos ahora se hace automáticamente
        // en TasksContext via safeSetTasksByProject

        // Marcar que los datos iniciales se han cargado
        console.log('✅ Marcando dataLoaded como true');
        setDataLoaded(true);
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        console.error('❌ Stack trace:', error.stack);
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
        console.log('🔄 Recargando datos para el proyecto actual:', currentProjectId);
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
        console.error('❌ Error recargando datos del proyecto:', error);
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
      console.log('🔄 Toggle Supabase desde ProjectManagementTabs:', newUseSupabase);
      setUseSupabase(newUseSupabase);
    };

    const handleRequestSupabaseAuth = (event) => {
      const { action } = event.detail;
      console.log('🔐 Solicitud de autenticación Supabase:', action);
      
      if (action === 'activate') {
        // Verificar si ya está autenticado
        if (supabaseService.isAuthenticated()) {
          console.log('✅ Ya está autenticado, activando Supabase...');
          setUseSupabase(true);
          alert('✅ Supabase activado\n\nLos datos se sincronizarán automáticamente con la base de datos en la nube.');
        } else {
          console.log('🔐 No está autenticado, mostrando modal...');
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
          console.log(`📊 Cambio detectado en tareas: ${oldTaskCount} → ${newTaskCount}`);
          return true;
        }
        
        // Verificar cambios en tareas específicas por proyecto
        for (const projectId in newValue) {
          const newTasks = newValue[projectId] || [];
          const oldTasks = oldValue[projectId] || [];
          
          if (newTasks.length !== oldTasks.length) {
            console.log(`📊 Cambio en número de tareas del proyecto ${projectId}: ${oldTasks.length} → ${newTasks.length}`);
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
            console.log(`📊 Cambio detectado en contenido de tareas del proyecto ${projectId}`);
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
      console.log('⏭️ Datos sin cambios, omitiendo guardado');
      return;
    }

    // Verificar que no esté guardando ya
    if (isSavingRef.current) {
      console.log('⏳ Ya hay un guardado en progreso, omitiendo');
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
      console.error(`🚨 ALERTA: Posible duplicación masiva detectada:`);
      console.error(`  • Total tareas: ${totalTasks}`);
      console.error(`  • Proyectos: ${projectCount}`);
      console.error(`  • Promedio por proyecto: ${avgTasksPerProject.toFixed(1)}`);
      console.error(`  • Cancelando guardado por seguridad`);
      return;
    }
    
    // Log informativo para proyectos grandes legítimos
    if (totalTasks > 500) {
      console.log(`📊 Proyecto grande detectado: ${totalTasks} tareas en ${projectCount} proyectos (promedio: ${avgTasksPerProject.toFixed(1)} tareas/proyecto)`);
    }

    // Guardar con throttling de 1 segundo y cola de guardado
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true;
        
        console.log('💾 Guardando datos con throttling...');
        
        // Guardar usando Supabase si está disponible, sino usar localStorage
        if (useSupabase && supabaseService.isAuthenticated()) {
          console.log('💾 Guardando en Supabase...');
          const success = await supabaseService.savePortfolioData(dataToSave);
          if (!success) {
            throw new Error('Error guardando en Supabase');
          }
          console.log('✅ Datos guardados en Supabase');
        } else {
          // Fallback: usar localStorage y archivo local
          try {
            localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(dataToSave));
            console.log('✅ Datos guardados en localStorage');
          } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
            // Si localStorage falla, intentar limpiar datos antiguos
            if (error.name === 'QuotaExceededError') {
              console.log('🧹 Espacio insuficiente, limpiando datos antiguos...');
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
              console.log(`🔄 Reintentando guardado... (${retries} intentos restantes)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // Actualizar referencia de último guardado
        lastSaveDataRef.current = dataToSave;
        
        console.log('✅ Datos guardados exitosamente');
        
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
        console.error('❌ Error guardando datos:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000); // Throttling de 1 segundo
  }, [dataLoaded]);

  // Guardar datos cuando cambien (solo después de cargar datos iniciales)
  useEffect(() => {
    // No guardar hasta que se hayan cargado los datos iniciales
    if (!dataLoaded) {
      console.log('⏳ Esperando a que se carguen los datos iniciales...');
      return;
    }

    console.log('🔄 useEffect GUARDADO - EJECUTÁNDOSE:', {
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
    
    console.log('🔄 ACTUALIZANDO PROGRESO AUTOMÁTICO DE PROYECTOS');
    
    // Actualizar progreso de todos los proyectos activos
    let hasUpdates = false;
    const updates = [];
    
    projects.forEach(project => {
      if (project.status === 'active') {
        const newProgress = calculateProjectProgress(project.id);
        
        // Solo actualizar si el progreso ha cambiado
        if (newProgress !== project.progress) {
          console.log(`📊 Actualizando progreso del proyecto ${project.name}: ${project.progress}% → ${newProgress}%`);
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
    
    console.log('🔄 CÁLCULO PROGRESO AUTOMÁTICO:', {
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
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
    
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? { 
            id: project.id,
            name: updates.name || project.name,
            description: updates.description || project.description,
            startDate: updates.startDate || project.startDate,
            endDate: updates.endDate || project.endDate,
            budget: updates.budget || project.budget,
            status: updates.status || project.status,
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
      console.log(`🗑️ Eliminando proyecto ${projectId} de Supabase...`);
      const success = await supabaseService.deleteProject(projectId);
      if (success) {
        console.log(`✅ Proyecto ${projectId} eliminado de Supabase`);
      } else {
        console.warn(`⚠️ Error eliminando proyecto ${projectId} de Supabase`);
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
      console.error('Error al importar datos:', error);
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

  // Redirección automática para usuarios de solo lectura
  useEffect(() => {
    // Solo ejecutar cuando los permisos ya se cargaron
    if (!permissionsLoading && userRole) {
      const currentSection = activeSection;
      const isReadOnlyUser = isReadOnly();
      
      console.log('🔍 Verificando redirección automática:', {
        userRole,
        isReadOnlyUser,
        currentSection,
        permissionsLoading
      });
      
      // Solo redirigir usuarios de solo lectura desde secciones restringidas
      if (isReadOnlyUser && (currentSection === 'portfolio' || currentSection === 'user-management')) {
        console.log('🔄 Redirigiendo usuario de solo lectura de', currentSection, 'a Dashboard Ejecutivo');
        setActiveSection('executive');
      }
      // NOTA: Usuarios con permisos completos tienen navegación libre - NO redirigir
    }
  }, [permissionsLoading, userRole, isReadOnly, activeSection]);

  // 🚀 NUEVO: Escuchar eventos de actualización de tareas de minutas
  useEffect(() => {
    const handleMinutaStatusChanged = (event) => {
      const { tareaId, newStatus, projectId, timestamp } = event.detail;
      console.log('🔄 Evento minutaStatusChanged recibido:', { tareaId, newStatus, projectId, timestamp });
      
      // Forzar recálculo del Dashboard resumen
      console.log('🔄 Forzando recálculo del Dashboard resumen...');
      // El Dashboard se actualizará automáticamente cuando cambien los datos
    };

    const handleAutoSaveTrigger = (event) => {
      const { source, data } = event.detail;
      console.log('🔄 Evento autoSaveTrigger recibido:', { source, data });
      
      // Activar el auto-save existente
      if (source === 'minutaUpdate') {
        console.log('🔄 Activando auto-save por actualización de minuta...');
        
        // 🚀 NUEVO: Activar el auto-save manualmente
        const dataToSave = {
          projects,
          tasksByProject,
          risksByProject,
          purchaseOrdersByProject,
          advancesByProject,
          invoicesByProject,
          contractsByProject,
          minutasByProject: data?.minutasTasks || minutasByProject
        };
        
        console.log('🔄 Ejecutando auto-save manual para minutas...');
        debouncedSave(dataToSave);
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
  }, [debouncedSave]);

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
  if (!currentProject && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">📁</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            ¡Bienvenido al Sistema de Gestión de Proyectos!
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Comienza creando tu primer proyecto para gestionar cronogramas, riesgos, presupuestos y más.
          </p>
          <button
            onClick={() => {
              // Crear un proyecto básico
              const newProject = {
                id: `proj-${Date.now()}`,
                name: 'Mi Primer Proyecto',
                description: 'Proyecto inicial para familiarizarse con el sistema',
                status: 'active',
                priority: 'medium',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                budget: 100000,
                contingencyReserve: 10000,
                managementReserve: 5000,
                manager: user?.email || 'Usuario',
                sponsor: 'Organización',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: '1.0.0',
                progress: 0
              };
              setProjects([newProject]);
              setCurrentProjectId(newProject.id);
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg transition-colors"
          >
            ➕ Crear Mi Primer Proyecto
          </button>
        </div>
      </div>
    );
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
      <BackupManager onRestoreData={importData} />
      
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
        />
        
        <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-80 lg:ml-72'}`}>
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'p-4' : 'p-6'}`}>
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
              />
            )}

            {/* Gestión de Proyectos */}
        {activeSection === 'project-management' && (
          <ProjectManagementTabs
            projects={projects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            workPackages={[]}
            setWorkPackages={() => {}}
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
              />
            )}

            {/* Gestión de Miembros de Organización */}
            {activeSection === 'organization-members' && (
              <OrganizationMembers
                currentProject={currentProject}
                useSupabase={useSupabase}
                onMemberAdded={() => {
                  console.log('✅ Nuevo miembro agregado a la organización');
                  // Aquí podrías agregar lógica adicional si es necesario
                }}
              />
            )}
          </div>
        </main>
        </div>
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
              <TasksProvider>
                <ProjectProvider>
                  <Routes>
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
                </ProjectProvider>
              </TasksProvider>
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
