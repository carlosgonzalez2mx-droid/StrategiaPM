/**
 * @fileoverview TasksContext - Gestión centralizada de tareas y elementos relacionados
 *
 * Este contexto proporciona gestión completa de:
 * - Tareas/cronograma por proyecto (gantt, hitos, dependencias)
 * - Minutas de reuniones por proyecto
 * - Riesgos identificados por proyecto
 * - Configuración de días laborables por proyecto
 * - Logs de auditoría por proyecto
 *
 * Características:
 * - Datos organizados por projectId para acceso eficiente
 * - Validación automática de integridad de datos
 * - Protección contra datos corruptos con fallbacks seguros
 * - Funciones helper para proyecto actual
 * - Integración automática con ProjectsContext
 *
 * @module contexts/TasksContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useProjects } from './ProjectsContext';

const TasksContext = createContext(null);

/**
 * Hook para acceder al contexto de tareas y elementos relacionados
 *
 * Proporciona acceso al estado global de tareas, minutas, riesgos y auditoría.
 * Debe usarse dentro de un TasksProvider.
 *
 * @returns {Object} Contexto de tareas
 * @returns {Object} return.tasksByProject - Tareas indexadas por projectId
 * @returns {Object} return.minutasByProject - Minutas indexadas por projectId
 * @returns {Object} return.risksByProject - Riesgos indexados por projectId
 * @returns {Object} return.includeWeekendsByProject - Config días laborables por projectId
 * @returns {Object} return.auditLogsByProject - Logs de auditoría por projectId
 * @returns {Function} return.getCurrentProjectTasks - Obtiene tareas del proyecto actual
 * @returns {Function} return.getCurrentProjectMinutas - Obtiene minutas del proyecto actual
 * @returns {Function} return.getCurrentProjectRisks - Obtiene riesgos del proyecto actual
 * @returns {Function} return.getCurrentProjectIncludeWeekends - Obtiene config días laborables
 * @returns {Function} return.getCurrentProjectAuditLogs - Obtiene logs de auditoría
 * @returns {Function} return.updateCurrentProjectTasks - Actualiza tareas del proyecto actual
 * @returns {Function} return.updateCurrentProjectMinutas - Actualiza minutas del proyecto actual
 * @returns {Function} return.updateCurrentProjectRisks - Actualiza riesgos del proyecto actual
 * @returns {Function} return.updateCurrentProjectIncludeWeekends - Actualiza config días laborables
 * @returns {Function} return.updateCurrentProjectAuditLogs - Actualiza logs de auditoría
 * @returns {Function} return.importTasksToCurrentProject - Importa tareas masivamente
 *
 * @throws {Error} Si se usa fuera de TasksProvider
 *
 * @example
 * const {
 *   getCurrentProjectTasks,
 *   getCurrentProjectRisks,
 *   updateCurrentProjectTasks
 * } = useTasks();
 *
 * // Obtener tareas del proyecto actual
 * const tasks = getCurrentProjectTasks();
 *
 * // Actualizar tareas (validación automática)
 * updateCurrentProjectTasks([...tasks, newTask]);
 */
export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe usarse dentro de TasksProvider');
  }
  return context;
};

/**
 * Provider de contexto para gestión de tareas y elementos relacionados
 *
 * Envuelve la aplicación o parte de ella para proporcionar acceso global
 * al estado de tareas, minutas, riesgos y auditoría.
 *
 * Debe estar envuelto por ProjectsProvider para funcionar correctamente.
 *
 * Características de seguridad:
 * - Validación automática de tipos (previene datos corruptos)
 * - Fallbacks seguros en caso de datos inválidos
 * - Logs de advertencia para debugging
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 *
 * @example
 * <ProjectsProvider>
 *   <TasksProvider>
 *     <App />
 *   </TasksProvider>
 * </ProjectsProvider>
 */
export const TasksProvider = ({ children }) => {
  // ===== ESTADO =====
  const [tasksByProject, setTasksByProject] = useState({});
  const [minutasByProject, setMinutasByProject] = useState({});
  const [risksByProject, setRisksByProject] = useState({});
  const [includeWeekendsByProject, setIncludeWeekendsByProject] = useState({});
  const [auditLogsByProject, setAuditLogsByProject] = useState({});

  // Obtener currentProjectId del contexto de proyectos
  const { currentProjectId } = useProjects();

  // ===== FUNCIONES HELPERS PARA PROYECTO ACTUAL =====

  /**
   * Obtener tareas del proyecto actual
   */
  const getCurrentProjectTasks = useCallback(() => {
    const tasks = tasksByProject[currentProjectId] || [];

    // Validación de tipo
    if (!Array.isArray(tasks)) {
      console.warn('⚠️ Datos corruptos detectados en getCurrentProjectTasks:', {
        currentProjectId,
        tasksType: typeof tasks,
        tasksValue: tasks
      });
      return [];
    }

    return tasks;
  }, [tasksByProject, currentProjectId]);

  /**
   * Obtener minutas del proyecto actual
   */
  const getCurrentProjectMinutas = useCallback(() => {
    return minutasByProject[currentProjectId] || [];
  }, [minutasByProject, currentProjectId]);

  /**
   * Obtener riesgos del proyecto actual
   */
  const getCurrentProjectRisks = useCallback(() => {
    return risksByProject[currentProjectId] || [];
  }, [risksByProject, currentProjectId]);

  /**
   * Obtener configuración de fines de semana del proyecto actual
   */
  const getCurrentProjectIncludeWeekends = useCallback(() => {
    return includeWeekendsByProject[currentProjectId] || false;
  }, [includeWeekendsByProject, currentProjectId]);

  /**
   * Obtener logs de auditoría del proyecto actual
   */
  const getCurrentProjectAuditLogs = useCallback(() => {
    return auditLogsByProject[currentProjectId] || [];
  }, [auditLogsByProject, currentProjectId]);

  // ===== FUNCIONES DE ACTUALIZACIÓN PARA PROYECTO ACTUAL =====

  /**
   * Actualizar tareas del proyecto actual
   */
  const updateCurrentProjectTasks = useCallback((newTasks) => {
    if (!currentProjectId) return;

    const safeTasks = Array.isArray(newTasks) ? newTasks : [];

    setTasksByProject(prev => ({
      ...prev,
      [currentProjectId]: safeTasks
    }));
  }, [currentProjectId]);

  /**
   * Actualizar minutas del proyecto actual
   */
  const updateCurrentProjectMinutas = useCallback((newMinutas) => {
    if (!currentProjectId) return;

    setMinutasByProject(prev => ({
      ...prev,
      [currentProjectId]: newMinutas
    }));
  }, [currentProjectId]);

  /**
   * Actualizar riesgos del proyecto actual
   */
  const updateCurrentProjectRisks = useCallback((newRisks) => {
    if (!currentProjectId) return;

    setRisksByProject(prev => ({
      ...prev,
      [currentProjectId]: newRisks
    }));
  }, [currentProjectId]);

  /**
   * Actualizar configuración de fines de semana del proyecto actual
   */
  const updateCurrentProjectIncludeWeekends = useCallback((includeWeekends) => {
    if (!currentProjectId) return;

    setIncludeWeekendsByProject(prev => ({
      ...prev,
      [currentProjectId]: includeWeekends
    }));
  }, [currentProjectId]);

  /**
   * Actualizar logs de auditoría del proyecto actual
   */
  const updateCurrentProjectAuditLogs = useCallback((newLogs) => {
    if (!currentProjectId) return;

    setAuditLogsByProject(prev => ({
      ...prev,
      [currentProjectId]: newLogs
    }));
  }, [currentProjectId]);

  // ===== FUNCIÓN DE IMPORTACIÓN =====

  /**
   * Importar tareas al proyecto actual (sobrescribe las existentes)
   */
  const importTasksToCurrentProject = useCallback((importedTasks) => {
    if (!currentProjectId) return;

    console.log('📥 Importando tareas al proyecto:', {
      projectId: currentProjectId,
      tasksCount: importedTasks?.length
    });

    updateCurrentProjectTasks(importedTasks);
  }, [currentProjectId, updateCurrentProjectTasks]);

  // ===== FUNCIÓN SAFE SETTER =====

  /**
   * Setter seguro para tareas (con validación de corrupción)
   */
  const safeSetTasksByProject = useCallback((newTasksByProject) => {
    if (!newTasksByProject || typeof newTasksByProject !== 'object') {
      console.warn('⚠️ safeSetTasksByProject: datos inválidos', typeof newTasksByProject);
      return;
    }

    // Validar que cada proyecto tenga un array
    const cleaned = {};
    let hasCorruption = false;

    Object.keys(newTasksByProject).forEach(projectId => {
      const tasks = newTasksByProject[projectId];

      if (Array.isArray(tasks)) {
        cleaned[projectId] = tasks;
      } else {
        console.warn(`⚠️ Corrupción detectada en proyecto ${projectId}:`, typeof tasks);
        cleaned[projectId] = [];
        hasCorruption = true;
      }
    });

    if (hasCorruption) {
      console.log('🧹 Datos limpiados automáticamente');
    }

    setTasksByProject(cleaned);
  }, []);

  // ===== VALOR DEL CONTEXTO =====
  const value = {
    // Estado completo (por proyecto)
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

    // Helpers para proyecto actual (getters)
    getCurrentProjectTasks,
    getCurrentProjectMinutas,
    getCurrentProjectRisks,
    getCurrentProjectIncludeWeekends,
    getCurrentProjectAuditLogs,

    // Helpers para proyecto actual (setters)
    updateCurrentProjectTasks,
    updateCurrentProjectMinutas,
    updateCurrentProjectRisks,
    updateCurrentProjectIncludeWeekends,
    updateCurrentProjectAuditLogs,

    // Funciones especiales
    importTasksToCurrentProject,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};

export default TasksContext;
