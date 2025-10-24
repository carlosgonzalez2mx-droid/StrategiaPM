/**
 * @fileoverview Utilidades para análisis de recursos en cronogramas
 * @module utils/scheduleResourceAnalysis
 */

import { diffDaysExclusive, addDays } from './scheduleDateUtils';

/**
 * Calcula la utilización de recursos
 * @param {Map<string, Array<Object>>} resourceLoad - Mapa de recursos a asignaciones
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {Object} Utilización por recurso
 */
export const calculateResourceUtilization = (resourceLoad, includeWeekends = false) => {
  const utilization = new Map();

  for (const [resource, assignments] of resourceLoad.entries()) {
    let totalDays = 0;
    for (const assignment of assignments) {
      totalDays += diffDaysExclusive(assignment.startDate, addDays(assignment.endDate, 1, includeWeekends), includeWeekends);
    }
    utilization.set(resource, totalDays);
  }

  return Object.fromEntries(utilization);
};

/**
 * Analiza recursos y detecta conflictos de asignación
 * @param {Array<Object>} tasks - Array de tareas
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {{resourceLoad: Object, conflicts: Array<Object>, utilization: Object}} Análisis de recursos
 */
export const analyzeResources = (tasks, includeWeekends = false) => {
  const resourceLoad = new Map();
  const resourceConflicts = [];

  for (const task of tasks) {
    // Validar que la tarea existe y tiene recursos
    if (!task || !task.resources || !Array.isArray(task.resources)) {
      continue;
    }

    for (const resource of task.resources) {
      if (!resourceLoad.has(resource)) {
        resourceLoad.set(resource, []);
      }

      resourceLoad.get(resource).push({
        taskId: task.id,
        taskName: task.name,
        startDate: task.startDate,
        endDate: task.endDate,
        allocation: 100
      });
    }
  }

  for (const [resource, assignments] of resourceLoad.entries()) {
    const sortedAssignments = assignments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    for (let i = 0; i < sortedAssignments.length - 1; i++) {
      const current = sortedAssignments[i];
      const next = sortedAssignments[i + 1];

      if (new Date(current.endDate) > new Date(next.startDate)) {
        resourceConflicts.push({
          resource,
          task1: current.taskId,
          task2: next.taskId,
          overlapDays: diffDaysExclusive(next.startDate, current.endDate, includeWeekends)
        });
      }
    }
  }

  return {
    resourceLoad: Object.fromEntries(resourceLoad),
    conflicts: resourceConflicts,
    utilization: calculateResourceUtilization(resourceLoad, includeWeekends)
  };
};
