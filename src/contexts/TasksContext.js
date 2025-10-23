/**
 * TasksContext - Gestión del estado de tareas y minutas
 *
 * Este contexto maneja:
 * - Tareas por proyecto (cronograma)
 * - Minutas por proyecto
 * - Riesgos por proyecto
 * - Días laborables por proyecto
 * - Logs de auditoría por proyecto
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useProjects } from './ProjectsContext';

const TasksContext = createContext(null);

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe usarse dentro de TasksProvider');
  }
  return context;
};

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
