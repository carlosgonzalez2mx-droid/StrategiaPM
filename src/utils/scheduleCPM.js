/**
 * @fileoverview Algoritmo CPM (Critical Path Method) para análisis de cronogramas
 * @module utils/scheduleCPM
 */

import { DAY } from './scheduleConstants';
import { toISO, addDays, adjustToWorkingDay } from './scheduleDateUtils';

/**
 * Calcula sensibilidad de una tarea
 * @param {Object} task - Tarea a analizar
 * @param {Array<Object>} allTasks - Todas las tareas del proyecto
 * @returns {number} Nivel de sensibilidad (0-10)
 */
export const calculateTaskSensitivity = (task, allTasks) => {
  let sensitivity = 0;

  // Factores de sensibilidad
  if (task.isCritical) sensitivity += 3; // Tarea crítica
  if (task.predecessors.length === 0) sensitivity += 1; // Tarea de inicio
  if (task.successors.length === 0) sensitivity += 1; // Tarea final
  if (task.resources.length > 2) sensitivity += 2; // Muchos recursos
  if (task.duration > 10) sensitivity += 1; // Tarea larga

  // Dependencias complejas
  const complexDeps = task.predecessors.filter(predId => {
    const pred = allTasks.find(t => t.id === predId);
    return pred && pred.successors.length > 1;
  }).length;
  sensitivity += complexDeps;

  return Math.min(10, sensitivity); // Máximo 10
};

/**
 * Encuentra múltiples rutas críticas en el proyecto
 * @param {Array<Object>} tasks - Array de tareas
 * @returns {Array<Array<string>>} Array de rutas críticas
 */
export const findCriticalPaths = (tasks) => {
  const criticalPaths = [];
  const visited = new Set();

  const dfs = (taskId, currentPath) => {
    if (visited.has(taskId)) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    visited.add(taskId);
    currentPath.push(taskId);

    if (task.successors.length === 0) {
      // Tarea final - verificar si es ruta crítica
      const pathDuration = currentPath.reduce((total, id) => {
        const t = tasks.find(task => task.id === id);
        return total + (t ? t.duration : 0);
      }, 0);

      if (pathDuration === Math.max(...tasks.map(t => new Date(t.earlyFinish) - new Date(t.startDate) / DAY))) {
        criticalPaths.push(currentPath.slice());
      }
    } else {
      // Continuar con sucesoras
      for (const succId of task.successors) {
        dfs(succId, currentPath);
      }
    }

    currentPath.pop();
    visited.delete(taskId);
  };

  // Encontrar tareas de inicio
  const startTasks = tasks.filter(t => t.predecessors.length === 0);
  for (const startTask of startTasks) {
    dfs(startTask.id, []);
  }

  return criticalPaths;
};

/**
 * Calcula métricas del proyecto basadas en CPM
 * @param {Array<Object>} tasks - Array de tareas
 * @param {Array<string>} criticalTasks - IDs de tareas críticas
 * @returns {Object} Métricas del proyecto
 */
export const calculateProjectMetrics = (tasks, criticalTasks) => {
  // Calcular duración total del proyecto de manera más robusta
  let totalDuration = 0;
  if (tasks.length > 0) {
    const startDates = tasks.map(t => new Date(t.startDate));
    const endDates = tasks.map(t => new Date(t.endDate));

    const minStart = new Date(Math.min(...startDates));
    const maxEnd = new Date(Math.max(...endDates));

    // Calcular diferencia en días de manera segura
    const timeDiff = maxEnd.getTime() - minStart.getTime();
    totalDuration = Math.max(0, Math.round(timeDiff / (1000 * 60 * 60 * 24)));
  }

  const criticalDuration = criticalTasks.reduce((total, id) => {
    const task = tasks.find(t => t.id === id);
    return total + (task ? task.duration : 0);
  }, 0);

  // Asegurar que la duración total sea al menos igual a la ruta crítica
  const adjustedTotalDuration = Math.max(totalDuration, criticalDuration);

  const totalCost = tasks.reduce((total, t) => total + (t.cost || 0), 0);
  const criticalCost = criticalTasks.reduce((total, id) => {
    const task = tasks.find(t => t.id === id);
    return total + (task ? (task.cost || 0) : 0);
  }, 0);

  return {
    totalDuration: adjustedTotalDuration,
    criticalDuration: Math.round(criticalDuration),
    totalCost,
    criticalCost,
    criticalPercentage: Math.round((criticalCost / totalCost) * 100),
    averageFloat: Math.round(tasks.reduce((sum, t) => sum + t.totalFloat, 0) / tasks.length),
    maxFloat: Math.max(...tasks.map(t => t.totalFloat)),
    criticalTasksCount: criticalTasks.length,
    // Agregar información de debug
    originalDuration: totalDuration,
    criticalPathLength: criticalDuration,
    durationDifference: adjustedTotalDuration - totalDuration
  };
};

/**
 * Calcula CPM (Critical Path Method) para un conjunto de tareas
 * @param {Array<Object>} tasks - Array de tareas
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {{tasks: Array<Object>, error: string|null, criticalPath: Array<string>, criticalPathLength: number, criticalPaths: Array<Array<string>>, projectMetrics: Object}} Resultado del cálculo CPM
 */
export const calculateCPM = (tasks, includeWeekends = false) => {
  // Limpiar tareas duplicadas antes de procesar
  const uniqueTasks = [];
  const seenIds = new Set();
  let duplicatesRemoved = 0;

  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      console.warn(`⚠️ Tarea duplicada detectada en CPM: ${task.id} - ${task.name}`);
      duplicatesRemoved++;
    } else {
      seenIds.add(task.id);
      uniqueTasks.push(task);
    }
  }

  if (duplicatesRemoved > 0) {
    console.warn(`🔧 Se eliminaron ${duplicatesRemoved} tareas duplicadas en CPM`);
  }

  const taskMap = new Map(uniqueTasks.map(t => [t.id, {
    id: t.id,
    wbsCode: t.wbsCode,
    name: t.name,
    duration: t.duration,
    startDate: t.startDate,
    endDate: t.endDate,
    progress: t.progress,
    predecessors: [...(t.predecessors || [])],
    cost: t.cost,
    priority: t.priority,
    assignedTo: t.assignedTo,
    isMilestone: t.isMilestone,
    isCritical: t.isCritical,
    originalDuration: t.originalDuration,
    earlyStart: t.earlyStart,
    earlyFinish: t.earlyFinish,
    lateStart: t.lateStart,
    lateFinish: t.lateFinish,
    totalFloat: t.totalFloat,
    freeFloat: t.freeFloat,
    description: t.description,
    resources: [...(t.resources || [])],
    workPackageId: t.workPackageId,
    status: t.status,
    successors: [...(t.successors || [])]
  }]));
  const updatedTasks = Array.from(taskMap.values());

  // Forward pass - calcular Early Start y Early Finish
  const calculateForwardPass = () => {
    const visited = new Set();
    const calculating = new Set();

    const calculateEarly = (taskId) => {
      if (visited.has(taskId)) return;
      if (calculating.has(taskId)) {
        console.warn(`Dependencia circular detectada en la tarea: ${taskId}. Saltando cálculo.`);
        // NO modificar las dependencias aquí para evitar duplicación
        // Solo marcar como visitada para evitar bucles infinitos
        visited.add(taskId);
        calculating.delete(taskId);
        return; // Saltar sin modificar dependencias
      }

      calculating.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return;

      // CORRECCIÓN: Solo respetar fechas de template si NO tiene predecesoras
      // Las tareas con predecesoras deben recalcularse para respetar dependencias
      if (task.templateCalculated && task.predecessors.length === 0) {
        console.log(`🔒 Respetando fechas calculadas por template para tarea sin predecesoras: ${task.name}`);
        return; // No recalcular fechas ya calculadas por template
      }

      // CORRECCIÓN: Inicializar correctamente según si tiene predecesoras
      let maxEarlyFinish;

      if (task.predecessors.length === 0) {
        // Para tareas sin predecesoras, usar la fecha de inicio original
        maxEarlyFinish = new Date(task.startDate);
      } else {
        // Para tareas con predecesoras, inicializar con fecha muy temprana
        maxEarlyFinish = new Date('1900-01-01');
      }

      for (const predId of task.predecessors) {
        calculateEarly(predId);
        const pred = taskMap.get(predId);
        if (pred) {
          let predFinish = new Date(pred.earlyFinish);
          if (predFinish > maxEarlyFinish) {
            maxEarlyFinish = predFinish;
          }
        }
      }

      // Aplicar regla de dependencias Finish-to-Start como MS Project
      if (task.predecessors.length > 0 && !task.isMilestone) {
        // Para dependencias Finish-to-Start: empezar al día siguiente del predecesor
        maxEarlyFinish.setDate(maxEarlyFinish.getDate() + 1);
      }

      // Ajustar fecha de inicio a día laborable si es necesario
      if (!includeWeekends) {
        maxEarlyFinish = adjustToWorkingDay(maxEarlyFinish);
      }

      task.earlyStart = toISO(maxEarlyFinish);

      // Para hitos: fecha de fin = fecha de inicio (exactamente igual)
      if (task.isMilestone) {
        task.earlyFinish = task.earlyStart;  // MISMO día
        // CORRECCIÓN: Aplicar fechas calculadas por CPM como MS Project
        task.startDate = task.earlyStart;
        task.endDate = task.earlyFinish;
      } else {
        task.earlyFinish = addDays(task.earlyStart, task.duration, includeWeekends);
        // CORRECCIÓN: Aplicar fechas calculadas por CPM como MS Project
        task.startDate = task.earlyStart;
        task.endDate = task.earlyFinish;
      }

      calculating.delete(taskId);
      visited.add(taskId);
    };

    for (const task of updatedTasks) {
      calculateEarly(task.id);
    }
  };

  // Backward pass - calcular Late Start y Late Finish
  const calculateBackwardPass = () => {
    const finalTasks = updatedTasks.filter(t => t.successors.length === 0);

    let projectEnd = new Date('1900-01-01');
    for (const task of finalTasks) {
      const taskEnd = new Date(task.earlyFinish);
      if (taskEnd > projectEnd) {
        projectEnd = taskEnd;
      }
    }

    const visited = new Set();

    const calculateLate = (taskId) => {
      if (visited.has(taskId)) return;

      const task = taskMap.get(taskId);
      if (!task) return;

      if (task.successors.length === 0) {
        task.lateFinish = task.earlyFinish;
      } else {
        let minLateStart = new Date('2100-01-01');
        for (const succId of task.successors) {
          calculateLate(succId);
          const succ = taskMap.get(succId);
          if (succ) {
            let succLateStart = new Date(succ.lateStart);
            // Para tareas normales, la predecesora debe terminar un día antes
            // Para hitos sucesores, pueden compartir el mismo día
            if (!succ.isMilestone) {
              succLateStart.setDate(succLateStart.getDate() - 1);
            }
            if (succLateStart < minLateStart) {
              minLateStart = succLateStart;
            }
          }
        }
        task.lateFinish = toISO(minLateStart);
      }

      // Para hitos: lateStart = lateFinish
      if (task.isMilestone) {
        task.lateStart = task.lateFinish;
      } else {
        const lateFinishDate = new Date(task.lateFinish);
        lateFinishDate.setDate(lateFinishDate.getDate() - task.duration);
        task.lateStart = toISO(lateFinishDate);
      }

      visited.add(taskId);
    };

    // CORRECCIÓN: Calcular primero las tareas finales, luego las demás
    for (const task of finalTasks) {
      calculateLate(task.id);
    }

    // CORRECCIÓN: Calcular el resto de tareas en orden inverso
    for (const task of updatedTasks) {
      if (!visited.has(task.id)) {
        calculateLate(task.id);
      }
    }

    // CORRECCIÓN: Asegurar que las tareas sin predecesoras tengan lateStart = earlyStart
    for (const task of updatedTasks) {
      if (task.predecessors.length === 0) {
        task.lateStart = task.earlyStart;
        // Para hitos: lateFinish = earlyStart
        if (task.isMilestone) {
          task.lateFinish = task.earlyStart;
        } else {
          const lateFinishDate = new Date(task.earlyStart);
          lateFinishDate.setDate(lateFinishDate.getDate() + task.duration);
          task.lateFinish = toISO(lateFinishDate);
        }
      }
    }
  };

  try {
    calculateForwardPass();
    calculateBackwardPass();

    // Calcular slack total y libre, identificar ruta crítica
    let criticalPathLength = 0;
    const criticalTasks = [];

    for (const task of updatedTasks) {
      const earlyStart = new Date(task.earlyStart);
      const lateStart = new Date(task.lateStart);
      const totalFloat = Math.round((lateStart - earlyStart) / DAY);

      task.totalFloat = Math.max(0, totalFloat);
      task.isCritical = task.totalFloat === 0;

      // Calcular slack libre
      let minSuccessorEarlyStart = new Date('2100-01-01');
      if (task.successors.length === 0) {
        task.freeFloat = task.totalFloat;
      } else {
        for (const succId of task.successors) {
          const succ = taskMap.get(succId);
          if (succ) {
            const succEarlyStart = new Date(succ.earlyStart);
            if (succEarlyStart < minSuccessorEarlyStart) {
              minSuccessorEarlyStart = succEarlyStart;
            }
          }
        }
        const earlyFinish = new Date(task.earlyFinish);
        const freeFloat = Math.round((minSuccessorEarlyStart - earlyFinish) / DAY);
        task.freeFloat = Math.max(0, freeFloat);
      }

      // Análisis de ruta crítica
      if (task.isCritical) {
        criticalTasks.push(task.id);

        // Calcular impacto de retrasos en tareas críticas
        task.criticalImpact = {
          delayCost: task.cost * 0.1, // 10% del costo por día de retraso
          resourceImpact: task.resources.length > 0 ? 'Alto' : 'Bajo',
          successorImpact: task.successors.length
        };
      }

      // Calcular slack de seguridad (Safety Float)
      task.safetyFloat = Math.max(0, task.totalFloat - task.freeFloat);

      // Análisis de sensibilidad
      task.sensitivity = calculateTaskSensitivity(task, updatedTasks);
    }

    // Calcular la duración de la ruta crítica correctamente
    if (updatedTasks.length > 0) {
      const startDates = updatedTasks.map(t => new Date(t.startDate));
      const endDates = updatedTasks.map(t => new Date(t.endDate));

      const minStart = new Date(Math.min(...startDates));
      const maxEnd = new Date(Math.max(...endDates));

      // Calcular diferencia en días de manera segura
      const timeDiff = maxEnd.getTime() - minStart.getTime();
      criticalPathLength = Math.max(0, Math.round(timeDiff / (1000 * 60 * 60 * 24)));

      console.log('🔍 CPM DEBUG - Ruta Crítica:', {
        totalTasks: updatedTasks.length,
        criticalTasks: criticalTasks.length,
        minStart: minStart && !isNaN(minStart.getTime()) ? minStart.toISOString().split('T')[0] : 'N/A',
        maxEnd: maxEnd && !isNaN(maxEnd.getTime()) ? maxEnd.toISOString().split('T')[0] : 'N/A',
        criticalPathLength: criticalPathLength
      });
    }

    // Identificar rutas críticas múltiples
    const criticalPaths = findCriticalPaths(updatedTasks);

    // Calcular métricas del proyecto
    const projectMetrics = calculateProjectMetrics(updatedTasks, criticalTasks);

    // DEBUG: Log de fechas de fin de tareas
    console.log('🔍 DEBUG - Tareas y fechas de fin:', updatedTasks.map(t => ({
      name: t.name,
      endDate: t.endDate,
      endDateObj: t.endDate && t.endDate !== null && t.endDate !== undefined
        ? new Date(t.endDate).toISOString().split('T')[0]
        : 'N/A'
    })));

    return {
      tasks: updatedTasks,
      error: null,
      criticalPath: criticalTasks,
      criticalPathLength,
      criticalPaths,
      projectMetrics
    };
  } catch (error) {
    return { tasks: updatedTasks, error: error.message };
  }
};
