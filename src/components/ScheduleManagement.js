import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import MinutaModal from './MinutaModal';
import EditMinutaModal from './EditMinutaModal';
import ScheduleWizard from './ai-scheduler/ScheduleWizard';
import supabaseService from '../services/SupabaseService';
import aiSchedulerService from '../services/AISchedulerService';
import useAuditLog from '../hooks/useAuditLog';

// ===== Utilidades de tiempo =====
const DAY = 1000 * 60 * 60 * 24;
const ROW_H = 50;
const PADDING_TOP = 10;

// ===== Funciones de Validación y Seguridad =====
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers
    .replace(/[<>]/g, '') // Remover < y >
    .trim()
    .substring(0, 1000); // Limitar longitud
};

const validateTaskName = (name) => {
  if (!name || typeof name !== 'string') return { valid: false, error: 'Nombre de tarea requerido' };
  if (name.length < 2) return { valid: false, error: 'Nombre debe tener al menos 2 caracteres' };
  if (name.length > 255) return { valid: false, error: 'Nombre muy largo (máximo 255 caracteres)' };
  return { valid: true, sanitized: sanitizeInput(name) };
};

const validateDuration = (duration) => {
  const num = parseInt(duration);
  if (isNaN(num) || num < 0 || num > 365) {
    return { valid: false, error: 'Duración debe ser un número entre 0 y 365 días' };
  }
  return { valid: true, value: num };
};

const validateDate = (date) => {
  if (!date) return { valid: false, error: 'Fecha requerida' };
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return { valid: false, error: 'Fecha inválida' };
  const currentYear = new Date().getFullYear();
  if (dateObj.getFullYear() < 2020 || dateObj.getFullYear() > currentYear + 10) {
    return { valid: false, error: 'Fecha fuera del rango permitido (2020-' + (currentYear + 10) + ')' };
  }
  return { valid: true, value: toISO(dateObj) };
};

// ===== Función de Ordenamiento de Tareas por wbsCode =====
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

// FUNCIÓN ELIMINADA: reorderTasksForProjectP1
// Esta función causaba restricciones innecesarias en el proyecto P1
// Ahora todos los proyectos se manejan de manera uniforme

// Función para encontrar el primer día laboral desde una fecha
const findFirstWorkingDay = (startDate) => {
  let current = new Date(startDate);
  while (!isWorkingDay(current)) {
    current.setDate(current.getDate() + 1);
  }
  return toISO(current);
};

const toISO = (d) => {
  if (!d) return new Date().toISOString().split('T')[0];
  const date = new Date(d);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date in toISO:', d);
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};
// Función para verificar si un día es laboral (lunes a viernes)
const isWorkingDay = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Lunes, 5=Viernes
};

// Función para ajustar una fecha al siguiente día laborable
const adjustToWorkingDay = (date) => {
  let adjustedDate = new Date(date);
  while (!isWorkingDay(adjustedDate)) {
    adjustedDate.setDate(adjustedDate.getDate() + 1);
  }
  return adjustedDate;
};

// Función para añadir días (laborales o calendario)
const addDays = (date, days, includeWeekends = false) => {
  // Si la duración es 0, devolver la misma fecha
  if (days === 0) {
    return date;
  }
  
  if (includeWeekends) {
    // Comportamiento original: incluye sábados y domingos
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return toISO(d);
  } else {
    // Nuevo comportamiento: solo días laborales
    return addWorkingDays(date, days);
  }
};

// Función para añadir días laborales (excluye sábados y domingos)
const addWorkingDays = (date, days) => {
  
  // Si la duración es 0, devolver la misma fecha
  if (days === 0) {
    return date;
  }
  
  let currentDate = new Date(date + 'T00:00:00');
  let daysAdded = 0;
  
  // CORRECCIÓN: Incluir el día de inicio en el conteo
  // Si el día de inicio es laborable, contarlo como día 1
  if (isWorkingDay(currentDate)) {
    daysAdded = 1;
  }
  
  // Si ya tenemos todos los días necesarios, devolver la fecha actual
  if (daysAdded >= days) {
    return toISO(currentDate);
  }
  
  // Continuar añadiendo días hasta completar la duración
  while (daysAdded < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    const isWorking = isWorkingDay(currentDate);
    
    if (isWorking) {
      daysAdded++;
    }
  }
  
  const result = toISO(currentDate);
  return result;
};

// Función para calcular diferencia de días (exclusivo)
const diffDaysExclusive = (a, b, includeWeekends = false) => {
  if (includeWeekends) {
    // Comportamiento original: días calendario
    const d1 = new Date(toISO(a));
    const d2 = new Date(toISO(b));
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / DAY));
  } else {
    // Comportamiento corregido: contar posiciones de columnas visibles
    return diffVisibleColumnsExclusive(a, b);
  }
};

// Función para encontrar el índice de columna de una fecha
const findColumnIndex = (targetDate, referenceStartDate, includeWeekends) => {
  const target = new Date(toISO(targetDate));
  const start = new Date(referenceStartDate);
  let columnIndex = 0;
  let current = new Date(start);

  // Debug temporal
  const shouldDebug = toISO(targetDate).includes('2025-09-01');
  if (shouldDebug) {
    console.log('🔍 findColumnIndex DEBUG:');
    console.log('   targetDate:', toISO(targetDate));
    console.log('   referenceStartDate:', referenceStartDate);
    console.log('   includeWeekends:', includeWeekends);
    console.log('   isTargetBeforeStart:', target < start);
  }

  // CASO ESPECIAL: Si target es anterior al start, calcular índice negativo
  if (target < start) {
    let tempCurrent = new Date(target);
    while (tempCurrent < start) {
      if (includeWeekends || isWorkingDay(tempCurrent)) {
        columnIndex--;
        if (shouldDebug) {
          console.log('📅 Columna negativa:', toISO(tempCurrent), 'índice:', columnIndex);
        }
      }
      tempCurrent.setDate(tempCurrent.getDate() + 1);
    }
  } else {
    // CASO NORMAL: target igual o posterior al start
    while (current < target) {
      // Solo contar días que se muestran como columnas
      if (includeWeekends || isWorkingDay(current)) {
        columnIndex++;
        if (shouldDebug) {
          console.log('📅 Columna contada:', toISO(current), 'índice:', columnIndex);
        }
      } else if (shouldDebug) {
        console.log('📅 Día saltado (fin de semana):', toISO(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  if (shouldDebug) {
    console.log('🎯 findColumnIndex resultado final:', columnIndex);
  }

  return columnIndex;
};

// Función reemplazada por findColumnIndex en el componente
const diffVisibleColumnsExclusive = (a, b) => {
  const d1 = new Date(toISO(a));
  const d2 = new Date(toISO(b));
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / DAY));
};

// Función para calcular duración de días (inclusivo)
const durationDaysInclusive = (start, end, includeWeekends = false) => {
  if (includeWeekends) {
    // Comportamiento original: días calendario
    return diffDaysExclusive(start, addDays(end, 1, true), true);
  } else {
    // Comportamiento corregido: contar columnas visibles que abarca la tarea
    return durationVisibleColumnsInclusive(start, end);
  }
};

// Función reemplazada por findColumnIndex en el componente
const durationVisibleColumnsInclusive = (start, end) => {
  const d1 = new Date(toISO(start));
  const d2 = new Date(toISO(end));
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / DAY) + 1);
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const parseExcelDate = (v) => {
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return toISO(new Date(ms));
  }
  if (!v) return toISO(new Date());
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? toISO(new Date()) : toISO(d);
};

// ===== Algoritmo CPM (Critical Path Method) =====
const calculateCPM = (tasks, includeWeekends = false) => {
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

// ===== Análisis de recursos =====
const analyzeResources = (tasks, includeWeekends = false) => {
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

const calculateResourceUtilization = (resourceLoad, includeWeekends = false) => {
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

// ===== Funciones auxiliares para análisis de ruta crítica =====

// Calcular sensibilidad de una tarea
const calculateTaskSensitivity = (task, allTasks) => {
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

// Encontrar múltiples rutas críticas
const findCriticalPaths = (tasks) => {
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

// Calcular métricas del proyecto
const calculateProjectMetrics = (tasks, criticalTasks) => {
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

// ===== Funciones de Control de Costos EVM - se definen después de tasksWithCPM =====

const ScheduleManagement = ({ tasks, setTasks, importTasks, projectData, onScheduleDataChange, includeWeekends, setIncludeWeekends, useSupabase = true }) => {

  // Estados principales - INDEPENDIENTES de Work Packages
  // NOTA: tasks y setTasks ahora vienen como props del componente padre
  
  // Función de migración automática para proyectos existentes
  const migrateExistingProject = useCallback((projectTasks) => {
    if (!Array.isArray(projectTasks) || projectTasks.length === 0) {
      return projectTasks;
    }
    
    console.log('🔄 MIGRACIÓN AUTOMÁTICA - Iniciando migración de proyecto existente...');
    console.log(`📊 Tareas a migrar: ${projectTasks.length}`);
    
    // Verificar si ya está migrado (tiene wbsCode secuencial)
    const hasSequentialWbs = projectTasks.every((task, index) => 
      parseInt(task.wbsCode) === index + 1
    );
    
    if (hasSequentialWbs) {
      console.log('✅ MIGRACIÓN AUTOMÁTICA - Proyecto ya migrado, no se requiere migración');
      return projectTasks;
    }
    
    // CORRECCIÓN: Crear mapeo de ID a nuevo wbsCode para referencias correctas
    const idToNewWbsMapping = new Map();
    projectTasks.forEach((task, index) => {
      const newWbsCode = `${index + 1}`;
      idToNewWbsMapping.set(task.id, newWbsCode);
    });
    
    console.log('🔄 MIGRACIÓN AUTOMÁTICA - Mapeo de ID a wbsCode:', Array.from(idToNewWbsMapping.entries()));
    
    // Migrar cada tarea
    const migratedTasks = projectTasks.map((task, index) => {
      const newWbsCode = `${index + 1}`;
      
      // Convertir predecesoras manteniendo las referencias por ID
      let migratedPredecessors = [];
      if (task.predecessors && task.predecessors.length > 0) {
        migratedPredecessors = task.predecessors.map(predId => {
          // Verificar si la predecesora existe en el proyecto
          const predTask = projectTasks.find(t => t.id === predId);
          if (predTask) {
            console.log(`✅ Predecesora válida encontrada: ${predTask.name} (ID: ${predId})`);
            return predId; // Mantener el ID original
          } else {
            console.warn(`⚠️ Predecesora no encontrada: ID ${predId}`);
            return null;
          }
        }).filter(Boolean);
      }
      
      const migratedTask = {
        ...task,
        wbsCode: newWbsCode,
        predecessors: migratedPredecessors
      };
      
      if (migratedPredecessors.length > 0) {
        console.log(`🔄 Tarea "${task.name}": wbsCode ${task.wbsCode} → ${newWbsCode}, predecesoras: [${migratedPredecessors.join(', ')}]`);
      }
      
      return migratedTask;
    });
    
    console.log('✅ MIGRACIÓN AUTOMÁTICA - Migración completada exitosamente');
    return migratedTasks;
  }, []);
  
  // Corregir hitos cuando se cargan las tareas (SIN REORDENAR)
  useEffect(() => {
    console.log('🔧 useEffect EJECUTÁNDOSE - TAREAS:', tasks?.length || 0);
    
    if (tasks && tasks.length > 0) {
      // Verificar si hay hitos con fechas incorrectas
      const milestonesWithWrongDates = tasks.filter(task => 
        task.isMilestone && task.startDate !== task.endDate
      );
      
      console.log('🔧 HITOS CON FECHAS INCORRECTAS DETECTADOS:', milestonesWithWrongDates.length);
      
      if (milestonesWithWrongDates.length > 0) {
        console.log('🔧 EJECUTANDO CORRECCIÓN AUTOMÁTICA DE HITOS');
        
        setTasks(prev => {
          return prev.map(task => {
            if (!task.isMilestone) return task;
            
            // Verificar si la fecha de fin es diferente a la de inicio
            if (task.startDate !== task.endDate) {
              console.log('🔧 CORRIGIENDO HITO AUTOMÁTICAMENTE:', {
                taskId: task.id,
                taskName: task.name,
                startDateOriginal: task.startDate,
                endDateOriginal: task.endDate,
                endDateCorregida: task.startDate
              });
              
              return {
                ...task,
                endDate: task.startDate, // Corregir: fin = inicio
                updatedAt: new Date().toISOString()
              };
            }
            
            return task;
          });
        });
      }
    }
  }, [tasks.length]); // Solo ejecutar cuando cambie el número de tareas

  // ELIMINADO: Sincronización con Work Packages - ya no es necesaria

  // Enviar datos del cronograma a FinancialManagement
  useEffect(() => {
    if (onScheduleDataChange && tasks.length > 0) {
      const scheduleData = {
        tasks: tasks,
        projectStart: projectData?.startDate,
        projectEnd: projectData?.endDate,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
        delayedTasks: tasks.filter(t => t.status === 'delayed').length,
        totalProgress: tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length
      };
      
      onScheduleDataChange(scheduleData);
      console.log('📊 Datos del cronograma enviados a FinancialManagement');
    }
  }, [tasks, onScheduleDataChange, projectData]);

  // Función para manejar actualizaciones directas del WBS
  const handleWBSUpdate = (action, data) => {
    console.log(`🔄 Recibida actualización del WBS: ${action}`, data);
    
    switch (action) {
      case 'create':
        // Crear nueva tarea en cronograma
        const newTask = {
          id: data.id,
          wbsCode: data.wbs || `WP-${data.id}`,
          name: data.name,
          duration: Math.max(1, durationDaysInclusive(data.startDate, data.endDate, includeWeekends)),
          startDate: data.startDate,
          endDate: data.endDate,
          progress: data.progress || 0,
          predecessors: [],
          successors: [],
          resources: [],
          cost: data.cost || 0,
          isMilestone: false,
          isCritical: false,
          originalDuration: data.duration || 1, // Guardar duración original
          earlyStart: data.startDate,
          earlyFinish: data.endDate,
          lateStart: data.startDate,
          lateFinish: data.endDate,
          totalFloat: 0,
          freeFloat: 0,
          status: data.status || 'pending',
          workPackageId: data.workPackageId || data.id,
          plannedValue: data.cost || 0,
          earnedValue: 0,
          actualCost: 0
        };
        
        setTasks(prev => {
          const newTasks = prev.slice();
          newTasks.push(newTask);
          return newTasks;
        });
        console.log('✅ Nueva tarea creada desde WBS');
        break;
        
      case 'delete':
        // Eliminar tarea del cronograma
        setTasks(prev => prev.filter(t => t.id !== data.id));
        console.log('✅ Tarea eliminada desde WBS');
        break;
        
      default:
        // Actualizar tarea existente
        setTasks(prev => {
          console.log('🔍 SETTASKS #1 - ACTUALIZANDO TAREA:', action, data);
          return prev.map(task => {
            if (task.id === action) {
              const updatedTask = {
                id: task.id,
                wbsCode: task.wbsCode,
                name: task.name,
                duration: data.startDate && data.endDate ? 
                  Math.max(1, durationDaysInclusive(data.startDate, data.endDate, includeWeekends)) : task.duration,
                startDate: data.startDate || task.startDate,
                endDate: data.endDate || task.endDate,
                progress: data.progress !== undefined ? data.progress : task.progress,
                predecessors: [...(task.predecessors || [])],
                cost: data.cost !== undefined ? data.cost : task.cost,
                priority: task.priority,
                assignedTo: task.assignedTo,
                isMilestone: task.isMilestone,
                isCritical: task.isCritical,
                originalDuration: task.originalDuration,
                earlyStart: task.earlyStart,
                earlyFinish: task.earlyFinish,
                lateStart: task.lateStart,
                lateFinish: task.lateFinish,
                totalFloat: task.totalFloat,
                freeFloat: task.freeFloat,
                description: task.description,
                resources: [...(task.resources || [])],
                workPackageId: task.workPackageId,
                status: data.status || task.status,
                successors: [...(task.successors || [])]
              };
              return updatedTask;
            }
            return task;
          });
        });
        console.log('✅ Tarea actualizada desde WBS');
    }
  };

  // Usar datos del proyecto principal en lugar de caso de negocio separado
  const businessCase = {
    projectName: projectData.projectName,
    startDate: projectData.startDate,
    plannedEndDate: projectData.endDate,
    totalInvestment: projectData.totalBudget
  };

  // Estados de UI
  const [selectedTask, setSelectedTask] = useState(null);
  const [tempTaskName, setTempTaskName] = useState('');
  const [viewMode, setViewMode] = useState('excel');
  // includeWeekends y setIncludeWeekends ahora vienen como props desde el estado global
  
  // NUEVOS ESTADOS PARA VISTA TABLA
  const [editingCell, setEditingCell] = useState(null); // {taskId, field}
  const [editingValue, setEditingValue] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Estados locales para los selects de dependencias
  const [selectedPredecessor, setSelectedPredecessor] = useState('');
  const [selectedSuccessor, setSelectedSuccessor] = useState('');
  
  // Refs para los selects
  const predecessorSelectRef = useRef(null);
  const successorSelectRef = useRef(null);
  const [ganttScale, setGanttScale] = useState('days');
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  const [showDependencies, setShowDependencies] = useState(true);
  const [baselineTasks, setBaselineTasks] = useState([]);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showBusinessCase, setShowBusinessCase] = useState(false);
  const [showResourceAnalysis, setShowResourceAnalysis] = useState(false);
  const [cmpError, setCmpError] = useState(null);

  // Estado para el modal de minutas
  const [isMinutaModalOpen, setIsMinutaModalOpen] = useState(false);
  const [minutasTasks, setMinutasTasks] = useState([]);
  const [loadingMinutas, setLoadingMinutas] = useState(false);

  // Estados para edición de minutas
  const [editingMinuta, setEditingMinuta] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Estados para el Asistente Inteligente de Cronogramas
  const [showAIWizard, setShowAIWizard] = useState(false);

  // Hook de auditoría para minutas
  const { logMinutaTaskCreated, logMinutaTaskUpdated, addAuditEvent } = useAuditLog(
    projectData?.id,
    useSupabase
  );

  // Estados del diagrama de red (preservados para evitar errores)
  const [networkLayout, setNetworkLayout] = useState('hierarchical');
  const [networkOrientation, setNetworkOrientation] = useState('TB');
  const [showNetworkDependencies, setShowNetworkDependencies] = useState(false);
  const [showNetworkCriticalPath, setShowNetworkCriticalPath] = useState(true);
  const [showOnlyCriticalPath, setShowOnlyCriticalPath] = useState(false);
  const [showSimplifiedView, setShowSimplifiedView] = useState(false);
  const [autoFitNetwork, setAutoFitNetwork] = useState(true);
  
  // Funciones de zoom y pan para el diagrama de red
  const [networkZoom, setNetworkZoom] = useState(1);
  const [networkPan, setNetworkPan] = useState({ x: 0, y: 0 });
  
  // Funciones de arrastrar y soltar para nodos
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Estados para arrastrar el diagrama (pan)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastPan, setLastPan] = useState({ x: 0, y: 0 });

  // Refs
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const fileInputRef = useRef(null);
  const networkSvgRef = useRef(null);

  // Estados calculados
  const baselineById = useMemo(() => new Map(baselineTasks.map((t) => [t.id, t])), [baselineTasks]);
  
  // Recalcular CPM cuando cambian las tareas
  const cmpResult = useMemo(() => {
    console.log('🔄 Recalculando CPM con tareas:', tasks.map(t => ({
      id: t.id,
      name: t.name,
      predecessors: t.predecessors,
      successors: t.successors,
      endDate: t.endDate
    })));
    
    // Calcular CPM normalmente
    console.log('🚀 DEBUG - Tareas ANTES de calculateCPM:', tasks.map(t => ({
      id: t.id,
      name: t.name,
      predecessors: t.predecessors,
      successors: t.successors,
      endDate: t.endDate
    })));
    
    const cpmResult = calculateCPM(tasks, includeWeekends);
    
    console.log('🚀 DEBUG - Tareas DESPUÉS de calculateCPM:', cpmResult.tasks.map(t => ({
      id: t.id,
      name: t.name,
      predecessors: t.predecessors,
      successors: t.successors,
      endDate: t.endDate
    })));
    
    console.log('🚀 DEBUG - Resultado CPM:', {
      criticalPath: cpmResult.criticalPath,
      criticalPathLength: cpmResult.criticalPathLength,
      totalTasks: cpmResult.tasks.length
    });
    
  // CORRECCIÓN: Aplicar fechas calculadas por CPM como MS Project
  console.log('🚀 CORRECCIÓN SCHEDULE - Aplicando fechas calculadas por CPM como MS Project');
  
  // CORRECCIÓN: Preservar el orden original de las tareas basado en wbsCode
  const tasksWithForcedDeps = tasks.map((originalTask) => {
    // Buscar la tarea procesada por CPM que corresponde a la tarea original
    const cpmTask = cpmResult.tasks.find(t => t.id === originalTask.id);
    
    if (!cpmTask) {
      console.warn(`⚠️ Tarea no encontrada en resultado CPM: ${originalTask.name} (${originalTask.id})`);
      return originalTask; // Devolver tarea original si no se encuentra en CPM
    }
    
    // Aplicar las fechas calculadas por CPM a la tabla (como MS Project)
    return {
      id: cpmTask.id,
      wbsCode: cpmTask.wbsCode,
      name: cpmTask.name,
      duration: cpmTask.duration,
      startDate: cpmTask.earlyStart, // Usar fecha calculada por CPM
      endDate: cpmTask.earlyFinish,  // Usar fecha calculada por CPM
      progress: cpmTask.progress,
      predecessors: cpmTask.predecessors || [],
      cost: cpmTask.cost,
      priority: cpmTask.priority,
      assignedTo: cpmTask.assignedTo,
      isMilestone: cpmTask.isMilestone,
      isCritical: cpmTask.isCritical,
      originalDuration: cpmTask.originalDuration,
      earlyStart: cpmTask.earlyStart,
      earlyFinish: cpmTask.earlyFinish,
      lateStart: cpmTask.lateStart,
      lateFinish: cpmTask.lateFinish,
      totalFloat: cpmTask.totalFloat,
      freeFloat: cpmTask.freeFloat,
      description: cpmTask.description,
      resources: [...(cpmTask.resources || [])],
      workPackageId: cpmTask.workPackageId,
      status: cpmTask.status,
      successors: cpmTask.successors || []
    };
  });
    
    console.log('🔄 Tareas con dependencias FORZADAS después de CPM:', tasksWithForcedDeps.map(t => ({
      id: t.id,
      name: t.name,
      predecessors: t.predecessors,
      successors: t.successors,
      endDate: t.endDate
    })));
    
    return {
      criticalPath: cpmResult.criticalPath,
      criticalPathLength: cpmResult.criticalPathLength,
      tasks: tasksWithForcedDeps
    };
  }, [tasks, includeWeekends, tasks.length]);
  // CORRECCIÓN FINAL: Asegurar que todos los hitos tengan fecha inicio = fecha fin
  // Y APLICAR FECHAS CALCULADAS POR CPM COMO MS PROJECT
  const tasksWithCPM = useMemo(() => {
    return cmpResult.tasks.map(task => {
      // CORRECCIÓN: Aplicar fechas calculadas por CPM como MS Project
      const taskWithCPMDates = {
        ...task,
        startDate: task.earlyStart, // Usar fecha calculada por CPM
        endDate: task.earlyFinish   // Usar fecha calculada por CPM
      };
      
      if (task.isMilestone) {
        // DEBUG: Ver qué fechas tiene el hito
        console.log('🔍 HITO DETECTADO:', {
          id: task.id,
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          isMilestone: task.isMilestone
        });

        if (taskWithCPMDates.startDate !== taskWithCPMDates.endDate) {
          console.log('🔧 CORRIGIENDO HITO - FORZANDO endDate = startDate');
          return {
            ...taskWithCPMDates,
            endDate: taskWithCPMDates.startDate // FORZAR: fecha fin = fecha inicio para hitos
          };
        }
      }
      
      return taskWithCPMDates;
    });
  }, [cmpResult.tasks]);

  // CORRECCIÓN: Actualizar automáticamente las tareas con fechas calculadas por CPM
  useEffect(() => {
    if (tasksWithCPM.length > 0 && setTasks) {
      // Verificar si las fechas calculadas por CPM son diferentes a las fechas actuales
      const needsUpdate = tasksWithCPM.some(task => {
        const currentTask = tasks.find(t => t.id === task.id);
        if (!currentTask) return false;
        
        return currentTask.startDate !== task.startDate || 
               currentTask.endDate !== task.endDate;
      });
      
      if (needsUpdate) {
        console.log('🔄 Actualizando tareas con fechas calculadas por CPM...');
        setTasks(tasksWithCPM);
      }
    }
  }, [tasksWithCPM, tasks, setTasks]);

  // ===== Funciones de Control de Costos EVM =====
  
  // Solo mantenemos las funciones básicas necesarias para la compresión del cronograma
  const calculateActualCost = () => {
    return tasksWithCPM.reduce((total, task) => {
      return total + (task.actualCost || 0);
    }, 0);
  };
  
  const calculateEarnedValue = () => {
    return tasksWithCPM.reduce((total, task) => {
      return total + (task.cost * (task.progress / 100));
    }, 0);
  };
  
  // Función para comprimir el cronograma (Crashing)
  const compressSchedule = () => {
    const criticalTasks = tasksWithCPM.filter(t => t.isCritical);
    
    if (criticalTasks.length === 0) {
      alert('No hay tareas críticas para comprimir');
      return;
    }
    
    // Identificar tareas críticas con mayor potencial de compresión
    const compressionCandidates = criticalTasks
      .map(task => ({
        id: task.id,
        wbsCode: task.wbsCode,
        name: task.name,
        duration: task.duration,
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        predecessors: [...(task.predecessors || [])],
        cost: task.cost,
        priority: task.priority,
        assignedTo: task.assignedTo,
        isMilestone: task.isMilestone,
        isCritical: task.isCritical,
        originalDuration: task.originalDuration,
        earlyStart: task.earlyStart,
        earlyFinish: task.earlyFinish,
        lateStart: task.lateStart,
        lateFinish: task.lateFinish,
        totalFloat: task.totalFloat,
        freeFloat: task.freeFloat,
        description: task.description,
        resources: [...(task.resources || [])],
        workPackageId: task.workPackageId,
        status: task.status,
        successors: [...(task.successors || [])],
        compressionPotential: Math.min(task.duration * 0.3, 5), // Máximo 30% o 5 días
        compressionCost: task.cost * 0.2 // 20% del costo por día comprimido
      }))
      .sort((a, b) => b.compressionPotential - a.compressionPotential);
    
    // Mostrar opciones de compresión
    const compressionOptions = compressionCandidates
      .slice(0, 3) // Top 3 opciones
      .map(task => `${task.name}: -${task.compressionPotential} días ($${task.compressionCost.toFixed(2)}/día)`)
      .join('\n');
    
    const daysToCompress = prompt(
      `¿Cuántos días quieres comprimir del cronograma?\n\nOpciones de compresión:\n${compressionOptions}\n\nIngresa el número de días:`,
      '1'
    );
    
    if (daysToCompress && !isNaN(daysToCompress)) {
      const targetCompression = parseInt(daysToCompress);
      let totalCompression = 0;
      let totalCost = 0;
      
      // Aplicar compresión
      const updatedTasks = tasksWithCPM.map(task => {
        if (task.isCritical && totalCompression < targetCompression) {
          const compression = Math.min(
            task.compressionPotential,
            targetCompression - totalCompression
          );
          
          if (compression > 0) {
            totalCompression += compression;
            totalCost += compression * task.compressionCost;
            
            return {
              id: task.id,
              wbsCode: task.wbsCode,
              name: task.name,
              duration: Math.max(1, task.duration - compression),
              startDate: task.startDate,
              endDate: task.endDate,
              progress: task.progress,
              predecessors: [...(task.predecessors || [])],
              cost: task.cost,
              priority: task.priority,
              assignedTo: task.assignedTo,
              isMilestone: task.isMilestone,
              isCritical: task.isCritical,
              originalDuration: task.originalDuration,
              earlyStart: task.earlyStart,
              earlyFinish: task.earlyFinish,
              lateStart: task.lateStart,
              lateFinish: task.lateFinish,
              totalFloat: task.totalFloat,
              freeFloat: task.freeFloat,
              description: task.description,
              resources: [...(task.resources || [])],
              workPackageId: task.workPackageId,
              status: task.status,
              successors: [...(task.successors || [])],
              compressedDays: (task.compressedDays || 0) + compression,
              compressionCost: (task.compressionCost || 0) + (compression * task.compressionCost)
            };
          }
        }
        return task;
      });
      
      if (totalCompression > 0) {
        setTasks(updatedTasks);
        alert(`✅ Cronograma comprimido ${totalCompression} días\n💰 Costo adicional: $${totalCost.toFixed(2)}`);
      } else {
        alert('No se pudo comprimir el cronograma con los parámetros especificados');
      }
    }
  };
  
  // Actualizar error de CPM
  useEffect(() => {
    setCmpError(cmpResult.error);
  }, [cmpResult.error]);

  // Monitoreo de dependencias circulares - SOLO DETECTAR, NO LIMPIAR AUTOMÁTICAMENTE
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      // Solo monitorear y reportar, NO limpiar automáticamente
      const visited = new Set();
      const recursionStack = new Set();
      const circularTasks = [];
      
      const dfs = (currentId, path = []) => {
        if (recursionStack.has(currentId)) {
          // Dependencia circular REAL detectada
          const cycleStart = path.indexOf(currentId);
          const cycle = path.slice(cycleStart).concat([currentId]);
          circularTasks.push({
            taskId: currentId,
            cycle: cycle
          });
          return true;
        }
        if (visited.has(currentId)) {
          return false;
        }
        
        recursionStack.add(currentId);
        visited.add(currentId);
        
        const task = tasks.find(t => t.id === currentId);
        if (task) {
          for (const predId of task.predecessors) {
            if (dfs(predId, [...path, currentId])) {
              return true;
            }
          }
        }
        
        recursionStack.delete(currentId);
        return false;
      };
      
      // Detectar dependencias circulares
      tasks.forEach(task => {
        if (!visited.has(task.id)) {
          dfs(task.id);
        }
      });
      
      if (circularTasks.length > 0) {
        console.warn(`🚨 DEPENDENCIAS CIRCULARES REALES detectadas: ${circularTasks.length}`);
        circularTasks.forEach(circular => {
          console.warn(`  • Tarea ${circular.taskId}: Ciclo ${circular.cycle.join(' → ')}`);
        });
        console.warn('💡 Usa el botón "Limpiar Dependencias Circulares" para corregir manualmente');
      } else {
        console.log('✅ Sin dependencias circulares detectadas');
      }
    }
  }, [tasks]);

  // Análisis de recursos
  const resourceAnalysis = useMemo(() => analyzeResources(tasksWithCPM, includeWeekends), [tasksWithCPM, includeWeekends]);

  // Recalcular tareas cuando cambie la configuración de días laborables
  const prevIncludeWeekends = useRef(includeWeekends);
  
  // Listener para eventos de actualización de tareas
  useEffect(() => {
    const handleTasksUpdated = (event) => {
      console.log('🔄 EVENTO tasksUpdated recibido:', event.detail);
      // Forzar re-renderizado del componente
      setTasks(prevTasks => [...prevTasks]);
    };

    window.addEventListener('tasksUpdated', handleTasksUpdated);
    
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdated);
    };
  }, []);
  
  useEffect(() => {
    console.log('🔄 CHECKBOX CAMBIÓ:', includeWeekends);
    
    // Solo ejecutar si realmente cambió includeWeekends Y hay tareas
    if (prevIncludeWeekends.current !== includeWeekends && tasks && tasks.length > 0) {
      console.log('🔄 RECALCULANDO FECHAS...');
      prevIncludeWeekends.current = includeWeekends;
      
      const updatedTasks = tasks.map((task, index) => {
        // Para hitos: no recalcular fechas, mantener fin = inicio
        if (task.isMilestone) {
          return { ...task, endDate: task.startDate };
        }
        
        if (task.startDate && task.duration) {
          const newEndDate = addDays(task.startDate, task.duration, includeWeekends);
          return { ...task, endDate: newEndDate };
        }
        return task;
      });
      
      // Solo actualizar si hay cambios
      const hasChanges = updatedTasks.some((task, index) => 
        task.endDate !== tasks[index].endDate
      );
      
      console.log('🔄 hasChanges:', hasChanges);
      
      if (hasChanges) {
        console.log('🔄 ACTUALIZANDO TABLA...');
        setTasks(updatedTasks);
      } else {
        console.log('🔄 NO HAY CAMBIOS - las fechas son iguales');
      }
    }
  }, [includeWeekends]);

  // Las fechas del proyecto se recalculan automáticamente a través del useMemo projectDates
  // cuando cambian las tareas, por lo que no necesitamos un useEffect separado

  // ELIMINADO: Segundo useEffect de Work Packages - ya no es necesario

  // Sincronizar panel de detalles
  // useEffect que estaba sobrescribiendo selectedTask
  // useEffect(() => {
  //   if (!selectedTask) return;
  //   const fresh = tasksWithCPM.find((t) => t.id === selectedTask.id);
  //   if (fresh && fresh !== selectedTask) setSelectedTask(fresh);
  // }, [tasksWithCPM, selectedTask]);


  // Generar nodos del diagrama de red
  const generateNetworkNodes = useMemo(() => {
    if (tasksWithCPM.length === 0) return [];
    
    // Aplicar filtros
    let filteredTasks = tasksWithCPM;
    
    // Filtro de solo ruta crítica
    if (showOnlyCriticalPath) {
      filteredTasks = filteredTasks.filter(task => task.isCritical);
    }
    
    // Aplicar dimensiones según vista simplificada
    const nodeWidth = showSimplifiedView ? 100 : 140;
    const nodeHeight = showSimplifiedView ? 60 : 80;
    const horizontalSpacing = showSimplifiedView ? 150 : 200;
    const verticalSpacing = showSimplifiedView ? 100 : 120;
    
    const nodes = [];
    
    // Crear un layout jerárquico basado en dependencias
    const levels = new Map();
    const processed = new Set();
    
    // Función para calcular el nivel de una tarea (con protección contra dependencias circulares)
    const calculateLevel = (taskId, visiting = new Set()) => {
      if (processed.has(taskId)) return levels.get(taskId) || 0;
      
      // Detectar dependencia circular
      if (visiting.has(taskId)) {
        console.warn('Dependencia circular detectada en tarea:', taskId);
        levels.set(taskId, 0);
        processed.add(taskId);
        return 0;
      }
      
      const task = filteredTasks.find(t => t.id === taskId);
      if (!task) return 0;
      
      if (task.predecessors.length === 0) {
        levels.set(taskId, 0);
        processed.add(taskId);
        return 0;
      }
      
      // Marcar como visitando
      visiting.add(taskId);
      
      try {
        const maxPredLevel = task.predecessors && task.predecessors.length > 0 
          ? Math.max(...task.predecessors.map(predId => calculateLevel(predId, visiting)))
          : 0;
        const level = maxPredLevel + 1;
        levels.set(taskId, level);
        processed.add(taskId);
        return level;
      } finally {
        // Limpiar el estado de visitando
        visiting.delete(taskId);
      }
    };
    
    // Calcular niveles para todas las tareas
    filteredTasks.forEach(task => calculateLevel(task.id));
    
    // Agrupar tareas por nivel
    const tasksByLevel = new Map();
    filteredTasks.forEach(task => {
      const level = levels.get(task.id);
      if (!tasksByLevel.has(level)) {
        tasksByLevel.set(level, []);
      }
      tasksByLevel.get(level).push(task);
    });
    
    // Posicionar nodos por niveles
    const maxLevel = Math.max(...Array.from(tasksByLevel.keys()));
    const startX = 100;
    const startY = 100;
    
    tasksByLevel.forEach((tasks, level) => {
      const levelWidth = (tasks.length - 1) * horizontalSpacing;
      const levelStartX = startX + (maxLevel - level) * 50; // Desplazamiento diagonal
      
      tasks.forEach((task, index) => {
        const x = levelStartX + (levelWidth / 2) - (levelWidth / 2) + (index * horizontalSpacing);
        const y = startY + level * verticalSpacing;
      
      nodes.push({
        id: task.id,
        x: x,
        y: y,
        width: nodeWidth,
        height: nodeHeight,
          level: level,
        task: task
        });
      });
    });
    
    console.log('📍 NODOS GENERADOS MEJORADOS:', nodes.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      level: n.level,
      center: `${n.x + n.width/2},${n.y + n.height/2}`
    })));
    
    return nodes;
  }, [tasksWithCPM, showOnlyCriticalPath, showSimplifiedView]);

  const networkNodes = generateNetworkNodes;

  // Función para centrar el diagrama de red
  const centerNetwork = () => {
    // Verificar que networkNodes esté disponible
    if (!networkNodes || !Array.isArray(networkNodes)) {
      console.log('⚠️ networkNodes no disponible aún, usando fallback');
      setNetworkPan({ x: 0, y: 0 });
      setNetworkZoom(1);
      return;
    }

    console.log('🎯 centerNetwork llamado:', {
      hasSvgRef: !!networkSvgRef.current,
      nodesLength: networkNodes.length,
      nodes: networkNodes.slice(0, 3).map(n => ({ id: n.id, x: n.x, y: n.y }))
    });
    
    if (networkSvgRef.current && networkNodes.length > 0) {
      // Calcular el bounding box de todos los nodos
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      networkNodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      
      console.log('📐 Bounding box calculado:', { minX, minY, maxX, maxY });
      
      // Agregar margen
      const margin = 100;
      const contentWidth = maxX - minX + (2 * margin);
      const contentHeight = maxY - minY + (2 * margin);
      
      // Centrar el contenido
      const centerX = minX - margin;
      const centerY = minY - margin;
      
      console.log('🎯 Centrando en:', { centerX, centerY, contentWidth, contentHeight });
      
      setNetworkPan({ x: centerX, y: centerY });
      setNetworkZoom(1);
    } else {
      console.log('⚠️ Fallback: no hay nodos o SVG ref');
      // Fallback si no hay nodos
      setNetworkPan({ x: 0, y: 0 });
      setNetworkZoom(1);
    }
  };

  // Centrar automáticamente el diagrama de red cuando se cargue
  useEffect(() => {
    if (viewMode === 'network' && networkSvgRef.current) {
      setTimeout(() => {
        centerNetwork();
      }, 100);
    }
  }, [viewMode]);

  // Centrar automáticamente cuando se generen los nodos
  useEffect(() => {
    if (viewMode === 'network' && networkNodes.length > 0) {
      setTimeout(() => {
        centerNetwork();
      }, 100);
    }
  }, [networkNodes, viewMode]);

  // Auto-ajustar cuando cambien los filtros
  useEffect(() => {
    if (viewMode === 'network') {
      setTimeout(() => {
        if (autoFitNetwork) {
          autoFitNetworkDiagram();
        } else {
          centerNetwork();
        }
      }, 200);
    }
  }, [showOnlyCriticalPath, showSimplifiedView, viewMode, autoFitNetwork, networkNodes]);

  // Actualizar viewBox cuando cambie el zoom
  useEffect(() => {
    if (viewMode === 'network' && networkSvgRef.current) {
      const svg = networkSvgRef.current;
      svg.setAttribute('viewBox', `${networkPan.x} ${networkPan.y} ${1200 / networkZoom} ${600 / networkZoom}`);
    }
  }, [networkZoom, networkPan, viewMode]);

  // Cargar minutas desde Supabase o portfolioData cuando se carga el proyecto
  useEffect(() => {
    const loadMinutas = async () => {
      if (!projectData?.id) return;

      setLoadingMinutas(true);
      try {
        if (useSupabase) {
          // Cargar desde Supabase si está habilitado
          console.log('🔍 DEBUG: Cargando minutas para proyecto:', projectData.id);
          const { success, minutas } = await supabaseService.loadMinutasByProject(projectData.id);
          if (success) {
            console.log(`🔍 DEBUG: Minutas recibidas de Supabase:`, minutas);
            setMinutasTasks(minutas);
            console.log(`✅ Minutas cargadas desde Supabase: ${minutas.length}`);
          } else {
            console.warn('⚠️ Error cargando minutas desde Supabase');
          }
        } else {
          // Cargar desde portfolioData si está en modo local
          const portfolioData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
          const minutasFromStorage = portfolioData.minutasByProject?.[projectData.id] || [];
          setMinutasTasks(minutasFromStorage);
          console.log(`✅ Minutas cargadas desde localStorage: ${minutasFromStorage.length}`);
        }
      } catch (error) {
        console.error('❌ Error cargando minutas:', error);
      } finally {
        setLoadingMinutas(false);
      }
    };

    loadMinutas();
  }, [projectData?.id, useSupabase]);

  // Scroll sincronizado
  const headerRef = useRef(null);
  const isScrolling = useRef(false);
  
  const onLeftScroll = (e) => {
    if (rightRef.current) rightRef.current.scrollTop = e.currentTarget.scrollTop;
  };
  
  const onRightScroll = (e) => {
    if (leftRef.current) leftRef.current.scrollTop = e.currentTarget.scrollTop;
    
    // Sincronizar scroll horizontal con los headers fijos
    if (headerRef.current && !isScrolling.current) {
      isScrolling.current = true;
      console.log('🔄 SINCRONIZANDO HEADERS - scrollLeft:', e.currentTarget.scrollLeft);
      console.log('📏 ANCHOS CONTENEDORES:', {
        headerContainerWidth: headerRef.current.scrollWidth,
        headerContainerClientWidth: headerRef.current.clientWidth,
        rightContainerWidth: e.currentTarget.scrollWidth,
        rightContainerClientWidth: e.currentTarget.clientWidth,
        chartWidthPx: chartWidthPx
      });
      headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isScrolling.current = false; }, 10);
    }
  };
  
  const onHeaderScroll = (e) => {
    // Sincronizar scroll horizontal del contenido con los headers
    if (rightRef.current && !isScrolling.current) {
      isScrolling.current = true;
      console.log('🔄 SINCRONIZANDO CONTENIDO - scrollLeft:', e.currentTarget.scrollLeft);
      console.log('📏 ANCHOS CONTENEDORES (desde headers):', {
        headerContainerWidth: e.currentTarget.scrollWidth,
        headerContainerClientWidth: e.currentTarget.clientWidth,
        rightContainerWidth: rightRef.current.scrollWidth,
        rightContainerClientWidth: rightRef.current.clientWidth,
        chartWidthPx: chartWidthPx
      });
      rightRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isScrolling.current = false; }, 10);
    }
  };

  // Actualizar tarea y sincronizar con Work Packages del EVM
  const updateTask = useCallback((taskId, field, value) => {
    console.log('🔄 updateTask llamado:', { taskId, field, value, selectedTaskId: selectedTask?.id });
    
    if (!taskId) {
      console.error('❌ taskId es null o undefined');
      return;
    }
    
    setTasks((prev) => {
      const updatedTasks = prev.map((task) => {
        if (task.id !== taskId) return task;
        
        // Clonación segura del objeto task
        const updatedTask = {
          id: task.id,
          wbsCode: task.wbsCode,
          name: task.name,
          duration: task.duration,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress,
          predecessors: [...(task.predecessors || [])],
          cost: task.cost,
          priority: task.priority,
          assignedTo: task.assignedTo,
          isMilestone: task.isMilestone,
          isCritical: task.isCritical,
          originalDuration: task.originalDuration,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          totalFloat: task.totalFloat,
          freeFloat: task.freeFloat,
          description: task.description,
          resources: [...(task.resources || [])],
          workPackageId: task.workPackageId,
          status: task.status,
          successors: [...(task.successors || [])]
        };
        const num = parseFloat(value);
        
        switch (field) {
          case 'duration': {
            const duration = Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
            updatedTask.duration = duration;
            // Para hitos: fecha de fin = fecha de inicio
            if (updatedTask.isMilestone) {
              updatedTask.endDate = updatedTask.startDate;
            } else {
              updatedTask.endDate = addDays(updatedTask.startDate, duration, includeWeekends);
            }
            break;
          }
          case 'startDate': {
            updatedTask.startDate = value;
            // Para hitos: fecha de fin = fecha de inicio
            if (updatedTask.isMilestone) {
              updatedTask.endDate = value;
            } else {
              updatedTask.endDate = addDays(value, updatedTask.duration, includeWeekends);
            }
            break;
          }
          case 'progress': {
            const p = Number.isFinite(num) ? Math.round(num) : 0;
            updatedTask.progress = Math.min(100, Math.max(0, p));
            break;
          }
          case 'cost': {
            updatedTask.cost = Number.isFinite(num) ? num : 0;
            break;
          }
          case 'resources': {
            updatedTask.resources = Array.isArray(value) ? value : [];
            break;
          }
          default: {
            updatedTask[field] = value;
            if (field === 'name') {
              console.log('🔤 CAMPO NOMBRE - Actualizando en tasks array:', {
                taskId,
                valorAnterior: task[field],
                valorNuevo: value,
                taskCompleta: updatedTask
              });
            } else {
              console.log(`🔄 Campo '${field}' actualizado a:`, value);
            }
          }
        }
        
        // ELIMINADO: Sincronización con Work Packages - ya no es necesaria
        
        return updatedTask;
      });
      
      return updatedTasks;
    });
    
    // Actualizar selectedTask de manera separada para evitar problemas de sincronización
    if (selectedTask && selectedTask.id === taskId) {
      console.log('🔄 Actualizando selectedTask para:', taskId);
      setSelectedTask(prev => {
        // Clonación segura del objeto selectedTask
        const updated = {
          id: prev.id,
          wbsCode: prev.wbsCode,
          name: prev.name,
          duration: prev.duration,
          startDate: prev.startDate,
          endDate: prev.endDate,
          progress: prev.progress,
          predecessors: [...(prev.predecessors || [])],
          cost: prev.cost,
          priority: prev.priority,
          assignedTo: prev.assignedTo,
          isMilestone: prev.isMilestone,
          isCritical: prev.isCritical,
          originalDuration: prev.originalDuration,
          earlyStart: prev.earlyStart,
          earlyFinish: prev.earlyFinish,
          lateStart: prev.lateStart,
          lateFinish: prev.lateFinish,
          totalFloat: prev.totalFloat,
          freeFloat: prev.freeFloat,
          description: prev.description,
          resources: [...(prev.resources || [])],
          workPackageId: prev.workPackageId,
          status: prev.status,
          successors: [...(prev.successors || [])]
        };
        const num = parseFloat(value);
        
        switch (field) {
          case 'duration': {
            const duration = Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
            updated.duration = duration;
            // Para hitos: fecha de fin = fecha de inicio
            if (updated.isMilestone) {
              updated.endDate = updated.startDate;
            } else {
              updated.endDate = addDays(updated.startDate, duration, includeWeekends);
            }
            break;
          }
          case 'startDate': {
            updated.startDate = value;
            // Para hitos: fecha de fin = fecha de inicio
            if (updated.isMilestone) {
              updated.endDate = value;
            } else {
              updated.endDate = addDays(value, updated.duration, includeWeekends);
            }
            break;
          }
          case 'progress': {
            const p = Number.isFinite(num) ? Math.round(num) : 0;
            updated.progress = Math.min(100, Math.max(0, p));
            break;
          }
          case 'cost': {
            updated.cost = Number.isFinite(num) ? num : 0;
            break;
          }
          case 'resources': {
            updated.resources = Array.isArray(value) ? value : [];
            break;
          }
          default: {
            updated[field] = value;
            if (field === 'name') {
              console.log('🔤 CAMPO NOMBRE - Actualizando selectedTask:', {
                taskId,
                valorAnterior: prev[field],
                valorNuevo: value,
                selectedTaskCompleta: updated
              });
            } else {
              console.log(`🔄 selectedTask campo '${field}' actualizado a:`, value);
            }
          }
        }
        
        console.log('🔄 selectedTask actualizado:', updated);
        return updated;
      });
    }
  }, [selectedTask]);



  // Tipos de dependencias disponibles
  const DEPENDENCY_TYPES = {
    'FS': { name: 'Finish-to-Start', description: 'La tarea predecesora debe terminar antes de que la sucesora pueda comenzar', color: '#3b82f6' },
    'SS': { name: 'Start-to-Start', description: 'La tarea sucesora puede comenzar cuando la predecesora comience', color: '#10b981' },
    'FF': { name: 'Finish-to-Finish', description: 'La tarea sucesora debe terminar cuando la predecesora termine', color: '#f59e0b' },
    'SF': { name: 'Start-to-Finish', description: 'La tarea sucesora debe terminar cuando la predecesora comience', color: '#8b5cf6' }
  };

  // Función para validar dependencias circulares
  const hasCircularDependency = useCallback((taskId, newPredecessorId) => {
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (currentId) => {
      if (recursionStack.has(currentId)) {
        return true; // Dependencia circular detectada
      }
      if (visited.has(currentId)) {
        return false; // Ya visitado, no hay ciclo
      }
      
      visited.add(currentId);
      recursionStack.add(currentId);
      
      const currentTask = tasksWithCPM.find(t => t.id === currentId);
      if (currentTask) {
        for (const predId of currentTask.predecessors) {
          if (dfs(predId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(currentId);
      return false;
    };
    
    // Simular la nueva dependencia
    const foundTask = tasksWithCPM.find(t => t.id === taskId);
    const tempTask = foundTask ? {
      id: foundTask.id,
      wbsCode: foundTask.wbsCode,
      name: foundTask.name,
      duration: foundTask.duration,
      startDate: foundTask.startDate,
      endDate: foundTask.endDate,
      progress: foundTask.progress,
      predecessors: [...(foundTask.predecessors || [])],
      cost: foundTask.cost,
      priority: foundTask.priority,
      assignedTo: foundTask.assignedTo,
      isMilestone: foundTask.isMilestone,
      isCritical: foundTask.isCritical,
      originalDuration: foundTask.originalDuration,
      earlyStart: foundTask.earlyStart,
      earlyFinish: foundTask.earlyFinish,
      lateStart: foundTask.lateStart,
      lateFinish: foundTask.lateFinish,
      totalFloat: foundTask.totalFloat,
      freeFloat: foundTask.freeFloat,
      description: foundTask.description,
      resources: [...(foundTask.resources || [])],
      workPackageId: foundTask.workPackageId,
      status: foundTask.status,
      successors: [...(foundTask.successors || [])]
    } : null;
    if (tempTask) {
      tempTask.predecessors = [...(tempTask.predecessors || []), newPredecessorId];
      
      // Verificar si la nueva dependencia crea un ciclo
      return dfs(newPredecessorId);
    }
    
    return false;
  }, [tasksWithCPM]);

  // Función para limpiar dependencias circulares de manera segura
  const cleanCircularDependencies = useCallback(() => {
    console.log('🧹 Limpiando dependencias circulares...');
    
    const visited = new Set();
    const recursionStack = new Set();
    const circularTasks = new Set();
    
    const dfs = (currentId) => {
      if (recursionStack.has(currentId)) {
        circularTasks.add(currentId);
        return true; // Dependencia circular detectada
      }
      if (visited.has(currentId)) {
        return false; // Ya visitado, no hay ciclo
      }
      
      recursionStack.add(currentId);
      visited.add(currentId);
      
      const task = tasks.find(t => t.id === currentId);
      if (task) {
        for (const predId of task.predecessors) {
          if (dfs(predId)) {
            circularTasks.add(currentId);
            return true;
          }
        }
      }
      
      recursionStack.delete(currentId);
      return false;
    };
    
    // Detectar todas las tareas con dependencias circulares
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    });
    
    if (circularTasks.size > 0) {
      console.warn(`🚨 Se encontraron ${circularTasks.size} tareas con dependencias circulares:`, Array.from(circularTasks));
      
      // Limpiar dependencias circulares de manera segura
      const cleanedTasks = tasks.map(task => {
        if (circularTasks.has(task.id)) {
          console.warn(`🔧 Limpiando dependencias circulares de tarea: ${task.name} (${task.id})`);
          return {
            ...task,
            predecessors: [], // Limpiar dependencias problemáticas
            successors: []
          };
        }
        return task;
      });
      
      // Actualizar tareas con dependencias limpiadas
      setTasks(cleanedTasks);
      
      return true; // Se limpiaron dependencias
    }
    
    return false; // No había dependencias circulares
  }, [tasks]);

  // Actualizar información del tipo de dependencia seleccionado
  useEffect(() => {
    const updateDependencyTypeInfo = () => {
      const dependencyTypeSelect = document.getElementById('newDependencyType');
      const dependencyTypeInfo = document.getElementById('dependencyTypeInfo');
      
      if (dependencyTypeSelect && dependencyTypeInfo) {
        const selectedType = dependencyTypeSelect.value;
        const typeInfo = DEPENDENCY_TYPES[selectedType];
        if (typeInfo) {
          dependencyTypeInfo.textContent = typeInfo.description;
        }
      }
    };

    // Actualizar cuando cambie el tipo seleccionado
    const dependencyTypeSelect = document.getElementById('newDependencyType');
    if (dependencyTypeSelect) {
      dependencyTypeSelect.addEventListener('change', updateDependencyTypeInfo);
      updateDependencyTypeInfo(); // Actualizar inicialmente
      
      return () => {
        dependencyTypeSelect.removeEventListener('change', updateDependencyTypeInfo);
      };
    }
  }, [selectedTask]);

  // NUEVA FUNCIÓN LIMPIA PARA EDITAR TAREAS
  const handleTaskEdit = useCallback((taskId, updates) => {
    console.log('🆕 NUEVA FUNCIÓN handleTaskEdit - INICIANDO:', { taskId, updates });
    
    setTasks(prev => {
      console.log('🔍 SETTASKS #3 - NUEVA FUNCIÓN handleTaskEdit:', taskId, updates);
      console.log('🔍 SETTASKS #3 - Estado ANTES:', JSON.stringify(prev.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors
      })), null, 2));
      
      const updatedTasks = prev.map(task => {
        if (task.id === taskId) {
          // Clonación segura del objeto task con updates
          const updatedTask = {
            id: task.id,
            wbsCode: task.wbsCode,
            name: task.name,
            duration: task.duration,
            startDate: task.startDate,
            endDate: task.endDate,
            progress: task.progress,
            predecessors: [...(task.predecessors || [])],
            cost: task.cost,
            priority: task.priority,
            assignedTo: task.assignedTo,
            isMilestone: task.isMilestone,
            isCritical: task.isCritical,
            originalDuration: task.originalDuration,
            earlyStart: task.earlyStart,
            earlyFinish: task.earlyFinish,
            lateStart: task.lateStart,
            lateFinish: task.lateFinish,
            totalFloat: task.totalFloat,
            freeFloat: task.freeFloat,
            description: task.description,
            resources: [...(task.resources || [])],
            workPackageId: task.workPackageId,
            status: task.status,
            successors: [...(task.successors || [])],
            // Aplicar updates después de la clonación segura
            ...(updates || {})
          };
          console.log('🆕 NUEVA FUNCIÓN - Tarea actualizada:', {
            id: updatedTask.id,
            name: updatedTask.name,
            predecessors: updatedTask.predecessors,
            successors: updatedTask.successors
          });
          return updatedTask;
        }
        return task;
      });
      
      console.log('🔍 SETTASKS #3 - Estado DESPUÉS:', JSON.stringify(updatedTasks.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors
      })), null, 2));
      
      console.log('🆕 NUEVA FUNCIÓN - Estado actualizado correctamente');
      return updatedTasks;
    });
  }, []);

  // Actualizar predecesoras
  const updateSuccessors = useCallback((taskId, successorsString, dependencyType = 'FS') => {
    console.warn('🚨 updateSuccessors INICIADO:', { taskId, successorsString, dependencyType });
    console.error('🚨 updateSuccessors INICIADO:', { taskId, successorsString, dependencyType });
    
    const newSuccs = successorsString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== taskId);
  
    console.log('🔄 Sucesoras procesadas:', newSuccs);
    
    // Validar dependencias circulares
    for (const succId of newSuccs) {
      if (hasCircularDependency(taskId, succId)) {
        console.error('❌ DEPENDENCIA CIRCULAR DETECTADA:', { taskId, succId });
        alert(`❌ No se puede crear la dependencia: se detectaría una dependencia circular entre ${taskId} y ${succId}`);
        return;
      }
    }
    
    setTasks((prev) => {
      console.log('🔄 Estado anterior de tareas:', prev.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors
      })));
      
      const predMap = new Map(prev.map((t) => [t.id, new Set(t.predecessors)]));
      for (const [, set] of predMap) set.delete(taskId);
      
      for (const succId of newSuccs) {
        predMap.get(succId)?.add(taskId);
      }
      
      const updated = prev.map((t) => ({
        id: t.id,
        wbsCode: t.wbsCode,
        name: t.name,
        duration: t.duration,
        startDate: t.startDate,
        endDate: t.endDate,
        progress: t.progress,
        predecessors: Array.from(predMap.get(t.id) || []),
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
        successors: t.id === taskId ? newSuccs : t.successors
      }));
      
      console.log('🔄 Estado actualizado de tareas:', updated.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors
      })));
      
      return updated;
    });
    
    console.warn('🚨 updateSuccessors COMPLETADO');
    console.error('🚨 updateSuccessors COMPLETADO');
  }, [hasCircularDependency]);

  const updatePredecessors = useCallback((taskId, predecessorsString, dependencyType = 'FS') => {
    console.warn('🚨 updatePredecessors INICIADO:', { taskId, predecessorsString, dependencyType });
    console.error('🚨 updatePredecessors INICIADO:', { taskId, predecessorsString, dependencyType });
    
    const newPreds = predecessorsString
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== taskId);
  
    console.log('🔄 Predecesoras procesadas:', newPreds);
    
    // Validar cada predecesora
    for (const predId of newPreds) {
      const validation = validatePredecessor(taskId, predId);
      if (!validation.valid) {
        console.error('❌ VALIDACIÓN FALLIDA:', { taskId, predId, error: validation.error });
        alert(validation.error);
        return;
      }
    }
    
    setTasks((prev) => {
      console.log('🔄 Estado anterior de tareas:', prev.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors
      })));
      
      // SOLUCIÓN: NO sobrescribir las sucesoras existentes, solo actualizar las predecesoras
      const updatedTasks = prev.map((t) => {
        if (t.id === taskId) {
          // Solo actualizar la tarea actual con las nuevas predecesoras
          return {
            id: t.id,
            wbsCode: t.wbsCode,
            name: t.name,
            duration: t.duration,
            startDate: t.startDate,
            endDate: t.endDate,
            progress: t.progress,
            predecessors: newPreds,
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
            successors: [...(t.successors || [])],
            dependencyType: dependencyType
          };
        } else {
          // Para las otras tareas, solo agregar esta tarea como sucesora si es predecesora
          if (newPreds.includes(t.id) && !t.successors.includes(taskId)) {
            return {
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
              successors: t.successors.slice().concat([taskId])
            };
          }
          return t;
        }
      });
      
      console.log('🔄 Estado actualizado de tareas:', updatedTasks.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        successors: t.successors,
        dependencyType: t.dependencyType
      })));
      
      // Actualizar selectedTask si es la tarea que se está editando
      if (selectedTask && selectedTask.id === taskId) {
        const updatedSelectedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
      }
      
      return updatedTasks;
    });
  }, [hasCircularDependency]); // CORRECCIÓN: Remover selectedTask para evitar bucle infinito

  // Función para manejar cambios en el campo nombre (sin loop infinito)
  const handleNameChange = useCallback((e) => {
    const newValue = e.target.value;
    console.log('🔤 CAMPO NOMBRE - handleNameChange:', {
      valorAnterior: tempTaskName,
      valorNuevo: newValue,
      taskId: selectedTask?.id
    });
    setTempTaskName(newValue);
  }, [tempTaskName, selectedTask?.id]);

  // Función para guardar el nombre cuando se pierde el foco
  const handleNameBlur = useCallback(() => {
    if (selectedTask && tempTaskName !== selectedTask.name) {
      console.log('🔤 CAMPO NOMBRE - handleNameBlur - Guardando:', {
        valorAnterior: selectedTask.name,
        valorNuevo: tempTaskName,
        taskId: selectedTask.id
      });
      updateTask(selectedTask.id, 'name', tempTaskName);
    }
  }, [selectedTask, tempTaskName, updateTask]);

  // Función para restaurar el valor cuando se gana el foco
  const handleNameFocus = useCallback(() => {
    if (selectedTask) {
      console.log('🔤 CAMPO NOMBRE - handleNameFocus - Restaurando:', {
        valor: selectedTask.name,
        taskId: selectedTask.id
      });
      setTempTaskName(selectedTask.name);
    }
  }, [selectedTask]);

  // Función para validar predecesoras de Excel
  const validateExcelPredecessors = useCallback((tasks) => {
    const errors = [];
    const warnings = [];
    
    for (const task of tasks) {
      if (!task.predecessors || task.predecessors.length === 0) continue;
      
      for (const predId of task.predecessors) {
        // 1. Verificar que la predecesora existe
        // PRIMERO: Buscar por ID exacto
        let predecessorTask = tasks.find(t => t.id === predId);
        
        // SEGUNDO: Si no se encuentra, buscar por número de fila (para Excel)
        if (!predecessorTask && !isNaN(predId)) {
          const rowNumber = parseInt(predId);
          if (rowNumber > 0 && rowNumber <= tasks.length) {
            predecessorTask = tasks[rowNumber - 1]; // Las filas empiezan en 1, el array en 0
          }
        }
        
        if (!predecessorTask) {
          errors.push(`❌ Tarea "${task.name}": La predecesora "${predId}" no existe`);
          continue;
        }
        
        // 2. Verificar que no es la misma tarea
        if (task.id === predId || task === predecessorTask) {
          errors.push(`❌ Tarea "${task.name}": No puede ser predecesora de sí misma`);
          continue;
        }
        
        // 3. Verificar dependencia circular
        if (hasCircularDependency(task.id, predecessorTask.id)) {
          errors.push(`❌ Tarea "${task.name}": Dependencia circular con "${predecessorTask.name}"`);
          continue;
        }
        
        // 4. Verificar que la predecesora no está después de la tarea actual
        const currentStart = new Date(task.startDate);
        const predecessorEnd = new Date(predecessorTask.endDate);
        
        if (predecessorEnd > currentStart) {
          warnings.push(`⚠️ Tarea "${task.name}": La predecesora "${predecessorTask.name}" termina después de que inicia la tarea actual`);
        }
      }
    }
    
    return { errors, warnings };
  }, [hasCircularDependency]);

  // Función para validar predecesora
  const validatePredecessor = useCallback((taskId, predecessorId) => {
    // 1. Verificar que la predecesora existe
    const predecessorTask = tasks.find(t => t.id === predecessorId);
    if (!predecessorTask) {
      return { valid: false, error: `❌ La tarea predecesora ${predecessorId} no existe` };
    }
    
    // 2. Verificar que no es la misma tarea
    if (taskId === predecessorId) {
      return { valid: false, error: `❌ Una tarea no puede ser predecesora de sí misma` };
    }
    
    // 3. Verificar que la predecesora no está después de la tarea actual
    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && predecessorTask) {
      const currentStart = new Date(currentTask.startDate);
      const predecessorEnd = new Date(predecessorTask.endDate);
      
      if (predecessorEnd > currentStart) {
        return { valid: false, error: `❌ La tarea predecesora termina después de que inicia la tarea actual` };
      }
    }
    
    // 4. Verificar dependencia circular
    if (hasCircularDependency(taskId, predecessorId)) {
      return { valid: false, error: `❌ Se detectaría una dependencia circular entre ${taskId} y ${predecessorId}` };
    }
    
    return { valid: true, error: null };
  }, [tasks, hasCircularDependency]);

  // Función para manejar cambios en el select de predecesoras
  const handlePredecessorChange = useCallback((e) => {
    console.log('🔗 SELECT PREDECESORA - EVENTO CAPTURADO:', {
      event: e,
      type: e.type,
      target: e.target,
      value: e.target.value,
      selectedTask: selectedTask?.id
    });
    
    const taskId = e.target.value;
    
    // Actualizar el estado local
    setSelectedPredecessor(taskId);
    
    if (taskId && selectedTask && !selectedTask.predecessors.includes(taskId)) {
      // Validar predecesora
      const validation = validatePredecessor(selectedTask.id, taskId);
      if (!validation.valid) {
        alert(validation.error);
        
        // Limpiar el select manualmente
        if (predecessorSelectRef.current) {
          predecessorSelectRef.current.value = '';
        }
        return;
      }
      
      const newPreds = [...(selectedTask.predecessors || []), taskId];
      const dependencyType = document.getElementById('newDependencyType')?.value || 'FS';
      
      console.log('🔄 Agregando predecesora desde select:', {
        tarea: selectedTask.id,
        nuevaPredecesora: taskId,
        predecesorasAntes: selectedTask.predecessors,
        predecesorasDespues: newPreds,
        dependencyType
      });
      
      console.log('🔄 ACTUALIZANDO selectedTask con nuevas predecesoras:', {
        tarea: selectedTask.id,
        predecesorasAntes: selectedTask.predecessors,
        predecesorasDespues: newPreds,
        dependencyType
      });
      
      // Actualizar selectedTask directamente
      const updatedTask = {
        id: selectedTask.id,
        wbsCode: selectedTask.wbsCode,
        name: selectedTask.name,
        duration: selectedTask.duration,
        startDate: selectedTask.startDate,
        endDate: selectedTask.endDate,
        progress: selectedTask.progress,
        predecessors: newPreds,
        cost: selectedTask.cost,
        priority: selectedTask.priority,
        assignedTo: selectedTask.assignedTo,
        isMilestone: selectedTask.isMilestone,
        isCritical: selectedTask.isCritical,
        originalDuration: selectedTask.originalDuration,
        earlyStart: selectedTask.earlyStart,
        earlyFinish: selectedTask.earlyFinish,
        lateStart: selectedTask.lateStart,
        lateFinish: selectedTask.lateFinish,
        totalFloat: selectedTask.totalFloat,
        freeFloat: selectedTask.freeFloat,
        description: selectedTask.description,
        resources: [...(selectedTask.resources || [])],
        workPackageId: selectedTask.workPackageId,
        status: selectedTask.status,
        successors: [...(selectedTask.successors || [])]
      };
      console.warn('🚨 ACTUALIZANDO selectedTask:', {
        antes: selectedTask.predecessors,
        despues: updatedTask.predecessors,
        count: updatedTask.predecessors.length
      });
      // ACTUALIZAR SOLO EL ESTADO GLOBAL - NO setSelectedTask para evitar duplicación
      setTasks(prev => {
        console.log('🔍 SETTASKS #2 - ACTUALIZANDO ESTADO GLOBAL:', selectedTask.id);
        const updated = prev.map(t => {
          if (t.id === selectedTask.id) {
            return updatedTask;
          }
          return t;
        });
        
        // Actualizar selectedTask con la tarea actualizada del estado global
        const updatedSelectedTask = updated.find(t => t.id === selectedTask.id);
        if (updatedSelectedTask) {
          setSelectedTask(updatedSelectedTask);
        }
        
        return updated;
      });
      
      // Limpiar el select manualmente
      if (predecessorSelectRef.current) {
        predecessorSelectRef.current.value = '';
      }
    }
  }, [hasCircularDependency]); // CORRECCIÓN: Remover selectedTask y updatePredecessors para evitar bucle infinito

  // Actualizar tempTaskName cuando cambie selectedTask
  // TEMPORALMENTE DESHABILITADO COMPLETAMENTE PARA DEBUGGING
  // useEffect(() => {
  //   console.warn('🚨 selectedTask CAMBIÓ:', {
  //     id: selectedTask?.id,
  //     predecessors: selectedTask?.predecessors,
  //     count: selectedTask?.predecessors?.length,
  //     stackTrace: new Error().stack
  //   });
  //   
  //   if (selectedTask) {
  //     setTempTaskName(selectedTask.name);
  //   } else {
  //     // Limpiar estados cuando se cierre el modal
  //     setTempTaskName('');
  //     setSelectedPredecessor('');
  //     setSelectedSuccessor('');
  //   }
  // }, [selectedTask]);

  // Event delegation global para los selects
  // Event listener directo para el select de sucesoras
  useEffect(() => {
    const successorSelect = document.getElementById('newSuccessor');
    if (successorSelect) {
      const handleSuccessorChange = (e) => {
        console.log('🎯 EVENT LISTENER DIRECTO - SUCESORA:', e.target.value, 'TIPO:', e.type);
        
        const actualValue = e.target.value;
        if (actualValue && actualValue.trim() !== '' && actualValue !== 'Seleccionar tarea sucesora...') {
          console.log('🎯 PROCESANDO SUCESORA VÁLIDA DIRECTO:', actualValue);
          
          // Obtener selectedTask del estado global
          let currentSelectedTask = selectedTask;
          if (!currentSelectedTask) {
            const modalTaskId = document.querySelector('[data-task-id]')?.getAttribute('data-task-id');
            if (modalTaskId) {
              currentSelectedTask = tasks.find(t => t.id === modalTaskId);
            } else {
              currentSelectedTask = tasks.find(t => t.id && t.id !== actualValue);
            }
          }
          
          if (currentSelectedTask && !currentSelectedTask.successors.includes(actualValue)) {
            const newSuccs = currentSelectedTask.successors.slice().concat([actualValue]);
            console.log('🎯 Agregando sucesora desde event listener directo:', {
              tarea: currentSelectedTask.id,
              nuevaSucesora: actualValue,
              sucesorasAntes: currentSelectedTask.successors,
              sucesorasDespues: newSuccs
            });
            
            // SOLUCIÓN: Solo actualizar selectedTask, NO el estado global hasta guardar
            const updatedTask = {
              id: currentSelectedTask.id,
              wbsCode: currentSelectedTask.wbsCode,
              name: currentSelectedTask.name,
              duration: currentSelectedTask.duration,
              startDate: currentSelectedTask.startDate,
              endDate: currentSelectedTask.endDate,
              progress: currentSelectedTask.progress,
              predecessors: [...(currentSelectedTask.predecessors || [])],
              cost: currentSelectedTask.cost,
              priority: currentSelectedTask.priority,
              assignedTo: currentSelectedTask.assignedTo,
              isMilestone: currentSelectedTask.isMilestone,
              isCritical: currentSelectedTask.isCritical,
              originalDuration: currentSelectedTask.originalDuration,
              earlyStart: currentSelectedTask.earlyStart,
              earlyFinish: currentSelectedTask.earlyFinish,
              lateStart: currentSelectedTask.lateStart,
              lateFinish: currentSelectedTask.lateFinish,
              totalFloat: currentSelectedTask.totalFloat,
              freeFloat: currentSelectedTask.freeFloat,
              description: currentSelectedTask.description,
              resources: [...(currentSelectedTask.resources || [])],
              workPackageId: currentSelectedTask.workPackageId,
              status: currentSelectedTask.status,
              successors: newSuccs
            };
            setSelectedTask(updatedTask);
            console.log('🎯 SUCESORA AGREGADA A selectedTask (NO al estado global aún)');
            
            console.log('🎯 SUCESORA AGREGADA EXITOSAMENTE DESDE EVENT LISTENER DIRECTO');
          }
        }
      };
      
      successorSelect.addEventListener('change', handleSuccessorChange);
      successorSelect.addEventListener('input', handleSuccessorChange);
      
      return () => {
        successorSelect.removeEventListener('change', handleSuccessorChange);
        successorSelect.removeEventListener('input', handleSuccessorChange);
      };
    }
  }, [selectedTask, tasks]);

  // Refs para acceder a valores actuales sin causar re-renders
  const selectedTaskRef = useRef(selectedTask);
  const hasCircularDependencyRef = useRef(hasCircularDependency);
  const updatePredecessorsRef = useRef(updatePredecessors);

  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
    hasCircularDependencyRef.current = hasCircularDependency;
    updatePredecessorsRef.current = updatePredecessors;
  }, [selectedTask, hasCircularDependency]); // CORRECCIÓN: Remover updatePredecessors para evitar bucle infinito

  // TEMPORALMENTE DESHABILITADO PARA EVITAR BUCLE INFINITO
  useEffect(() => {
    console.log('🔧 EVENT DELEGATION GLOBAL DESHABILITADO TEMPORALMENTE');
    return; // Salir inmediatamente sin configurar listeners

    const handleGlobalChange = (e) => {
      // EXCEPCIÓN: No procesar el checkbox includeWeekends aquí
      if (e.target.id === 'includeWeekends') {
        console.log('🔍 CHECKBOX includeWeekends detectado - NO procesando en event listener global');
        return; // Salir sin procesar
      }
      
      // EXCEPCIÓN: No procesar inputs de archivo (causan conflictos con importación)
      if (e.target.type === 'file') {
        console.log('🔍 INPUT FILE detectado - NO procesando en event listener global');
        return; // Salir sin procesar
      }
      
      // Log persistente en localStorage (solo datos serializables)
      const logData = {
        timestamp: new Date().toISOString(),
        type: e.type,
        id: e.target.id,
        value: e.target.value,
        tagName: e.target.tagName
      };
      
      // Log removido por seguridad - no almacenar datos sensibles en localStorage
      
      // Log de todos los eventos para diagnóstico
      console.log('🔍 EVENTO GLOBAL CAPTURADO:', logData);
      
      // Log inmediato para verificar que llegamos aquí
      console.log('🔍 LLEGAMOS A LA FUNCIÓN GLOBAL - ID:', e.target.id);
      
      // Log adicional para facilitar el filtrado
      console.log('🔍 DEPENDENCY_EVENT:', JSON.stringify(logData));
      
      // Log de procesamiento
      console.log('🔍 PROCESANDO EVENTO GLOBAL - ID:', e.target.id, 'TIPO:', e.type, 'VALOR:', e.target.value);
      
      // Verificar si es uno de nuestros selects
      if (e.target.id === 'newPredecessor') {
        console.log('🔍 PREDECESORA SELECCIONADA VIA DELEGATION:', e.target.value);
        
        const taskId = e.target.value;
        
        console.warn('🚨 VERIFICANDO CONDICIONES:', {
          taskId,
          selectedTask: selectedTaskRef.current?.id,
          predecessors: selectedTaskRef.current?.predecessors,
          includes: selectedTaskRef.current?.predecessors?.includes(taskId)
        });
        
        if (taskId && selectedTaskRef.current && !selectedTaskRef.current.predecessors.includes(taskId)) {
          // Validar dependencia circular
          if (hasCircularDependencyRef.current(selectedTaskRef.current.id, taskId)) {
            alert(`❌ No se puede crear la dependencia: se detectaría una dependencia circular entre ${selectedTaskRef.current.id} y ${taskId}`);
            e.target.value = '';
            return;
          }
          
          const newPreds = [...(selectedTaskRef.current.predecessors || []), taskId];
          const dependencyType = document.getElementById('newDependencyType')?.value || 'FS';
          
          console.log('🔄 Agregando predecesora desde delegation:', {
            tarea: selectedTaskRef.current.id,
            nuevaPredecesora: taskId,
            predecesorasAntes: selectedTaskRef.current.predecessors,
            predecesorasDespues: newPreds,
            dependencyType
          });
          
          console.warn('🚨 LLAMANDO updatePredecessors:', {
            taskId: selectedTaskRef.current.id,
            predecessors: newPreds.join(','),
            dependencyType
          });
          
          // SOLUCIÓN: Solo actualizar selectedTask, NO el estado global hasta guardar
          const updatedTask = {
            id: selectedTaskRef.current.id,
            wbsCode: selectedTaskRef.current.wbsCode,
            name: selectedTaskRef.current.name,
            duration: selectedTaskRef.current.duration,
            startDate: selectedTaskRef.current.startDate,
            endDate: selectedTaskRef.current.endDate,
            progress: selectedTaskRef.current.progress,
            predecessors: newPreds,
            cost: selectedTaskRef.current.cost,
            priority: selectedTaskRef.current.priority,
            assignedTo: selectedTaskRef.current.assignedTo,
            isMilestone: selectedTaskRef.current.isMilestone,
            isCritical: selectedTaskRef.current.isCritical,
            originalDuration: selectedTaskRef.current.originalDuration,
            earlyStart: selectedTaskRef.current.earlyStart,
            earlyFinish: selectedTaskRef.current.earlyFinish,
            lateStart: selectedTaskRef.current.lateStart,
            lateFinish: selectedTaskRef.current.lateFinish,
            totalFloat: selectedTaskRef.current.totalFloat,
            freeFloat: selectedTaskRef.current.freeFloat,
            description: selectedTaskRef.current.description,
            resources: [...(selectedTaskRef.current.resources || [])],
            workPackageId: selectedTaskRef.current.workPackageId,
            status: selectedTaskRef.current.status,
            successors: [...(selectedTaskRef.current.successors || [])]
          };
          setSelectedTask(updatedTask);
          console.log('🎯 PREDECESORA AGREGADA A selectedTask (NO al estado global aún)');
          
          console.warn('🚨 updatePredecessors COMPLETADO');
          e.target.value = '';
        }
      } else if (e.target.id === 'newSuccessor') {
        console.warn('🚨 DETECTADO SELECT DE SUCESORA:', e.target.value, 'TIPO EVENTO:', e.type);
        
        // SOLUCIÓN: Procesar evento 'change' solo si tiene valor válido
        if (e.type === 'change' && (!e.target.value || e.target.value.trim() === '')) {
          console.log('🚨 IGNORANDO EVENTO CHANGE VACÍO:', e.type, 'para newSuccessor');
          return;
        }
        
        // SOLUCIÓN: Procesar evento 'input' o 'change' con valor válido
        if (e.type !== 'input' && e.type !== 'change') {
          console.log('🚨 IGNORANDO EVENTO:', e.type, 'para newSuccessor');
          return;
        }
        
        console.log('🔍 SUCESORA SELECCIONADA VIA DELEGATION:', e.target.value);
        console.log('🚨 EVENTO SUCESORA CAPTURADO - timestamp:', new Date().toISOString());
        console.log('🚨 VALOR DEL SELECT:', e.target.value, 'TIPO:', typeof e.target.value, 'LONGITUD:', e.target.value?.length);
        console.log('🚨 OPCIONES DEL SELECT:', Array.from(e.target.options).map(opt => ({ value: opt.value, text: opt.text, selected: opt.selected })));
        
        // SOLUCIÓN: Procesar directamente sin setTimeout
        const actualValue = e.target.value;
        console.log('🚨 VALOR ACTUAL INMEDIATO:', actualValue);
        
        // VERIFICACIÓN: Solo procesar si el valor no está vacío y no es la opción por defecto
        if (actualValue && actualValue.trim() !== '' && actualValue !== 'Seleccionar tarea sucesora...') {
          // VERIFICACIÓN ADICIONAL: Evitar procesamiento duplicado
          if (e.target.dataset.processing === 'true') {
            console.log('🚨 YA SE ESTÁ PROCESANDO ESTA SUCESORA, IGNORANDO');
            return;
          }
          e.target.dataset.processing = 'true';
          console.log('🚨 PROCESANDO SUCESORA VÁLIDA:', actualValue);
          const taskId = actualValue;
            console.warn('🚨 VERIFICANDO CONDICIONES SUCESORA:', {
              taskId,
              selectedTask: selectedTaskRef.current?.id,
              successors: selectedTaskRef.current?.successors,
              includes: selectedTaskRef.current?.successors?.includes(taskId)
            });
            
            // VERIFICACIÓN DE SEGURIDAD: Si selectedTask es undefined, obtenerlo del estado global
            let currentSelectedTask = selectedTaskRef.current;
            if (!currentSelectedTask) {
              console.warn('🚨 selectedTask es undefined, obteniendo del estado global...');
              // Buscar la tarea que tiene el modal abierto (la que está siendo editada)
              // Usar el ID del modal abierto o buscar la primera tarea disponible
              const modalTaskId = document.querySelector('[data-task-id]')?.getAttribute('data-task-id');
              if (modalTaskId) {
                currentSelectedTask = tasks.find(t => t.id === modalTaskId);
                console.warn('🚨 selectedTask recuperado por modal ID:', modalTaskId);
              } else {
                // Fallback: buscar cualquier tarea que no sea la sucesora seleccionada
                currentSelectedTask = tasks.find(t => t.id && t.id !== taskId);
                console.warn('🚨 selectedTask recuperado por fallback:', currentSelectedTask?.id);
              }
            }
            
            // VERIFICACIÓN ADICIONAL: Si aún no tenemos currentSelectedTask, usar la primera tarea disponible
            if (!currentSelectedTask && tasks.length > 0) {
              currentSelectedTask = tasks[0];
              console.warn('🚨 selectedTask recuperado por primera tarea disponible:', currentSelectedTask.id);
            }
            
            // VERIFICACIÓN FINAL: Si aún no tenemos currentSelectedTask, crear uno temporal
            if (!currentSelectedTask) {
              console.warn('🚨 selectedTask no encontrado, creando uno temporal...');
              currentSelectedTask = {
                id: crypto.randomUUID(),
                name: 'Tarea Temporal',
                successors: [],
                predecessors: []
              };
              console.warn('🚨 selectedTask temporal creado:', currentSelectedTask.id);
            }
            
            // VERIFICACIÓN EXTRA: Asegurar que currentSelectedTask tenga las propiedades necesarias
            if (!currentSelectedTask.successors) {
              currentSelectedTask.successors = [];
              console.warn('🚨 currentSelectedTask.successors inicializado como array vacío');
            }
            if (!currentSelectedTask.predecessors) {
              currentSelectedTask.predecessors = [];
              console.warn('🚨 currentSelectedTask.predecessors inicializado como array vacío');
            }
            
            // VERIFICACIÓN FINAL: Asegurar que currentSelectedTask tenga un ID válido
            if (!currentSelectedTask.id) {
              currentSelectedTask.id = crypto.randomUUID();
              console.warn('🚨 currentSelectedTask.id inicializado como:', currentSelectedTask.id);
            }
            
            // VERIFICACIÓN EXTRA: Asegurar que currentSelectedTask tenga un nombre válido
            if (!currentSelectedTask.name) {
              currentSelectedTask.name = 'Tarea Temporal';
              console.warn('🚨 currentSelectedTask.name inicializado como:', currentSelectedTask.name);
            }
            
            if (taskId && currentSelectedTask && !currentSelectedTask.successors.includes(taskId)) {
              const newSuccs = currentSelectedTask.successors.slice().concat([taskId]);
              console.log('🔄 Agregando sucesora desde delegation:', {
                tarea: currentSelectedTask.id,
                nuevaSucesora: taskId,
                sucesorasAntes: currentSelectedTask.successors,
                sucesorasDespues: newSuccs
              });
              
              // Actualizar el estado local
              const updatedTask = {
                id: currentSelectedTask.id,
                wbsCode: currentSelectedTask.wbsCode,
                name: currentSelectedTask.name,
                duration: currentSelectedTask.duration,
                startDate: currentSelectedTask.startDate,
                endDate: currentSelectedTask.endDate,
                progress: currentSelectedTask.progress,
                predecessors: [...(currentSelectedTask.predecessors || [])],
                cost: currentSelectedTask.cost,
                priority: currentSelectedTask.priority,
                assignedTo: currentSelectedTask.assignedTo,
                isMilestone: currentSelectedTask.isMilestone,
                isCritical: currentSelectedTask.isCritical,
                originalDuration: currentSelectedTask.originalDuration,
                earlyStart: currentSelectedTask.earlyStart,
                earlyFinish: currentSelectedTask.earlyFinish,
                lateStart: currentSelectedTask.lateStart,
                lateFinish: currentSelectedTask.lateFinish,
                totalFloat: currentSelectedTask.totalFloat,
                freeFloat: currentSelectedTask.freeFloat,
                description: currentSelectedTask.description,
                resources: [...(currentSelectedTask.resources || [])],
                workPackageId: currentSelectedTask.workPackageId,
                status: currentSelectedTask.status,
                successors: newSuccs
              };
              // ACTUALIZAR SOLO EL ESTADO GLOBAL - NO setSelectedTask para evitar duplicación
              setTasks(prev => {
                const updated = prev.map(t => {
                if (t.id === currentSelectedTask.id) {
                  return updatedTask;
                }
                if (t.id === taskId) {
                  // Agregar esta tarea como predecesora de la sucesora
                  return {
                    id: t.id,
                    wbsCode: t.wbsCode,
                    name: t.name,
                    duration: t.duration,
                    startDate: t.startDate,
                    endDate: t.endDate,
                    progress: t.progress,
                    predecessors: [...(t.predecessors || []), currentSelectedTask.id],
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
                  };
                }
                return t;
                });
                
                // Actualizar selectedTask con la tarea actualizada del estado global
                const updatedSelectedTask = updated.find(t => t.id === currentSelectedTask.id);
                if (updatedSelectedTask) {
                  setSelectedTask(updatedSelectedTask);
                }
                
                return updated;
              });
              
              // NO limpiar el select si ya se procesó correctamente
              // e.target.value = '';
              console.log('🚨 SUCESORA AGREGADA EXITOSAMENTE - timestamp:', new Date().toISOString());
            } else {
              console.warn('🚨 CONDICIONES NO CUMPLIDAS PARA SUCESORA:', {
                taskId: !!taskId,
                currentSelectedTask: !!currentSelectedTask,
                notIncluded: !currentSelectedTask?.successors?.includes(taskId)
              });
            }
            
          // Limpiar el flag de procesamiento
          e.target.dataset.processing = 'false';
        } else {
          console.warn('🚨 VALOR VACÍO O INVÁLIDO:', actualValue);
        }
      }
    };

    // Agregar event listener al documento
    document.addEventListener('change', handleGlobalChange);
    document.addEventListener('input', handleGlobalChange);
    document.addEventListener('click', handleGlobalChange);
    
    // Log de confirmación
    console.log('🔧 EVENT LISTENERS AGREGADOS AL DOCUMENTO');
    
    // Función de logs removida por seguridad

    return () => {
      document.removeEventListener('change', handleGlobalChange);
      document.removeEventListener('input', handleGlobalChange);
      document.removeEventListener('click', handleGlobalChange);
    };
  }, []); // CORRECCIÓN: Remover dependencias que causan bucle infinito

  // Función para actualizar datos del proyecto (ya no se usa)
  const updateBusinessCase = useCallback((field, value) => {
    // Esta función ya no se usa, pero se mantiene por compatibilidad
    console.log('updateBusinessCase called:', field, value);
  }, []);

  // Importar desde Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const normalizeKey = (k) => String(k).trim().toLowerCase();

      const imported = rows.map((r, idx) => {
        const obj = {};
        for (const k in r) obj[normalizeKey(k)] = r[k];

        const id = obj['id'] || `T${String(idx + 1).padStart(3, '0')}`;
        const wbs = obj['wbs'] || `1.${idx + 1}`;
        const name = obj['name'] || obj['tarea'] || `Tarea ${idx + 1}`;
        const duration = Number.isFinite(Number(obj['duration'])) ? Math.max(0, Math.round(Number(obj['duration']))) : 0;
        const start = obj['startdate'] ? parseExcelDate(obj['startdate']) : toISO(new Date());
        const end = obj['enddate'] ? parseExcelDate(obj['enddate']) : addDays(start, duration, includeWeekends);
        const progress = Number.isFinite(Number(obj['progress'])) ? Math.min(100, Math.max(0, Math.round(Number(obj['progress'])))) : 0;
        const predecessors = String(obj['predecessors'] || obj['predecesoras'] || '').split(',').map((s) => s.trim()).filter(Boolean);
        const resources = String(obj['resources'] || '').split(',').map((s) => s.trim()).filter(Boolean);
        const cost = Number.isFinite(Number(obj['cost'])) ? Number(obj['cost']) : 0;
        const isMilestone = String(obj['ismilestone']).toLowerCase() === 'true' || duration === 0;
        const status = obj['status'] || 'pending';

        return {
          id,
          wbsCode: wbs,
          name,
          duration,
          startDate: start,
          endDate: end,
          progress,
          predecessors,
          successors: [],
          resources,
          cost,
          isMilestone,
          isCritical: false,
          earlyStart: start,
          earlyFinish: end,
          lateStart: start,
          lateFinish: end,
          totalFloat: 0,
          freeFloat: 0,
          status,
        };
      });

      const mapById = new Map(imported.map((t) => [t.id, t]));
      for (const t of imported) {
        for (const pred of t.predecessors) {
          const predTask = mapById.get(pred);
          if (predTask && !predTask.successors.includes(t.id)) predTask.successors.push(t.id);
        }
      }

      // Aplicar ordenamiento por wbsCode antes de importar
      const sortedImported = sortTasksByWbsCode(imported);
      console.log('📊 IMPORTACIÓN - Tareas ordenadas por wbsCode:', sortedImported.map(t => ({ name: t.name, wbsCode: t.wbsCode })));
      
      if (typeof importTasks === 'function') {
        importTasks(sortedImported);
        console.log('📊 IMPORTACIÓN ANTIGUA - importTasks llamado exitosamente');
      } else {
        setTasks(sortedImported);
        console.log('📊 IMPORTACIÓN ANTIGUA - setTasks llamado como fallback');
      }
      setBaselineTasks([]);
      setShowBaseline(false);
      alert('Tareas importadas desde Excel con éxito');
    } catch (err) {
      console.error(err);
      alert('No se pudo importar el archivo. Verifica el formato.');
    }
  };

  // Exportar a Excel
  const exportToExcel = useCallback(() => {
    const exportData = tasksWithCPM.map(task => ({
      ID: task.id,
      WBS: task.wbsCode,
      Name: task.name,
      Duration: task.duration,
      StartDate: task.startDate,
      EndDate: task.endDate,
      Progress: task.progress,
      Predecessors: task.predecessors?.join(', ') || '',
      Resources: task.resources.join(', '),
      Cost: task.cost,
      IsMilestone: task.isMilestone,
      IsCritical: task.isCritical,
      Status: task.status,
      EarlyStart: task.earlyStart,
      EarlyFinish: task.earlyFinish,
      LateStart: task.lateStart,
      LateFinish: task.lateFinish,
      TotalFloat: task.totalFloat,
      FreeFloat: task.freeFloat
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');

    const businessData = [
      ['Campo', 'Valor'],
      ['Nombre del Proyecto', businessCase.projectName],
      ['Objetivo', businessCase.objective],
      ['Patrocinador', businessCase.sponsor],
      ['Gerente del Proyecto', businessCase.manager],
      ['Inversión Total', businessCase.totalInvestment],
      ['Beneficios Esperados', businessCase.expectedBenefits],
      ['TIR (%)', businessCase.irr],
      ['ROI (%)', businessCase.roi],
      ['Tiempo de Retorno (años)', businessCase.paybackPeriod],
      ['VPN', businessCase.npv]
    ];
    const wsBC = XLSX.utils.aoa_to_sheet(businessData);
    XLSX.utils.book_append_sheet(wb, wsBC, 'Caso de Negocio');

    XLSX.writeFile(wb, `${projectData.projectName}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [tasksWithCPM, projectData]);

  // Exportar cronograma a Excel
  const exportScheduleToExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    
    // Preparar datos del cronograma
    const scheduleData = [
      ['#', 'Tarea', 'Duración', 'Inicio', 'Fin', 'Progreso (%)', 'Prioridad', 'Asignado', 'Costo', 'Predecesoras', 'Hito', 'Crítica', 'Ruta Crítica']
    ];
    
    tasksWithCPM.forEach((task, index) => {
      scheduleData.push([
        index + 1,
        task.name,
        `${task.duration}d`,
        task.startDate,
        task.endDate,
        task.progress || 0,
        task.priority || 'Media',
        task.assignedTo || 'Sin asignar',
        task.cost || 0,
        task.predecessors?.join(', ') || 'Sin',
        task.isMilestone ? 'Sí' : 'No',
        task.isCritical ? 'Sí' : 'No',
        task.isCritical ? 'Sí' : 'No'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(scheduleData);
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 5 },   // #
      { wch: 40 },  // Tarea
      { wch: 10 },  // Duración
      { wch: 12 },  // Inicio
      { wch: 12 },  // Fin
      { wch: 12 },  // Progreso
      { wch: 12 },  // Prioridad
      { wch: 20 },  // Asignado
      { wch: 12 },  // Costo
      { wch: 30 },  // Predecesoras
      { wch: 8 },   // Hito
      { wch: 8 },   // Crítica
      { wch: 12 }   // Ruta Crítica
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');
    
    // Agregar hoja de resumen del proyecto
    const summaryData = [
      ['INFORMACIÓN DEL PROYECTO'],
      ['Nombre del Proyecto', projectData.projectName],
      ['Fecha de Inicio', projectData.startDate],
      ['Fecha de Fin', projectData.endDate],
      ['Presupuesto Total', projectData.totalBudget],
      [''],
      ['ESTADÍSTICAS DEL CRONOGRAMA'],
      ['Total de Tareas', tasksWithCPM.length],
      ['Tareas Críticas', tasksWithCPM.filter(t => t.isCritical).length],
      ['Hitos', tasksWithCPM.filter(t => t.isMilestone).length],
      ['Duración Total (días)', Math.max(...tasksWithCPM.map(t => new Date(t.endDate).getTime())) - Math.min(...tasksWithCPM.map(t => new Date(t.startDate).getTime())) / (1000 * 60 * 60 * 24)],
      [''],
      ['FECHA DE EXPORTACIÓN'],
      ['Exportado el', new Date().toLocaleString('es-ES')]
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    
    XLSX.writeFile(wb, `Cronograma-${projectData.projectName}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [tasksWithCPM, projectData]);


  // Cargar proyecto
  const loadProject = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedProjectData = JSON.parse(event.target.result);
        
        if (loadedProjectData.tasks) setTasks(loadedProjectData.tasks);
        if (loadedProjectData.baseline) setBaselineTasks(loadedProjectData.baseline);
        if (loadedProjectData.settings) {
          setViewMode(loadedProjectData.settings.viewMode || 'excel');
          setGanttScale(loadedProjectData.settings.ganttScale || 'days');
          setShowCriticalPath(loadedProjectData.settings.showCriticalPath ?? true);
          setShowDependencies(loadedProjectData.settings.showDependencies ?? true);
          setShowBaseline(loadedProjectData.settings.showBaseline ?? false);
        }

        alert('Proyecto cargado exitosamente');
      } catch (error) {
        alert('Error al cargar el proyecto. Verifica el formato del archivo.');
      }
    };
    reader.readAsText(file);
  }, []);

  // Fechas del proyecto - USAR FECHAS ORIGINALES DE LA TABLA
  const projectDates = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() };
    // USAR tasks (fechas originales) en lugar de tasksWithCPM (fechas procesadas por CPM)
    const dates = tasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)]);
    const result = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };

    // Debug temporal para verificar el rango del proyecto
    console.log('📅 PROJECT DATES CALCULADO (FECHAS ORIGINALES):', {
      start: toISO(result.start),
      end: toISO(result.end),
      totalTasks: tasks.length,
      firstTaskDate: tasks[0]?.startDate,
      lastTaskDate: tasks[tasks.length - 1]?.endDate,
      allStartDates: tasks.map(t => t.startDate),
      minStartDate: Math.min(...tasks.map(t => new Date(t.startDate).getTime())),
      minStartDateISO: toISO(new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime()))))
    });

    return result;
  }, [tasks]); // Cambiar dependencia de tasksWithCPM a tasks

  const totalDays = useMemo(() => {
    const pStart = toISO(projectDates.start);
    const pEnd = toISO(projectDates.end);
    return Math.max(1, diffDaysExclusive(pStart, addDays(pEnd, 1, includeWeekends), includeWeekends));
  }, [projectDates]);

  // Escalado por días/semanas/meses
  const pxPerDay = useMemo(() => {
    switch (ganttScale) {
      case 'days':
        return 28; // Restaurado para mantener funcionalidad
      case 'weeks':
        return 10; // Restaurado
      case 'months':
        return 4;  // Restaurado
      default:
        return 20; // Restaurado
    }
  }, [ganttScale]);

  const chartWidthPx = useMemo(() => totalDays * pxPerDay, [totalDays, pxPerDay]);

  // Métricas del proyecto
  const projectMetrics = useMemo(() => {
    const criticalTasks = tasksWithCPM.filter((t) => t.isCritical).length;
    const completedTasks = tasksWithCPM.filter((t) => t.progress === 100).length;
    const totalCost = tasksWithCPM.reduce((sum, t) => sum + t.cost, 0);

    const todayISO = toISO(new Date());
    const PV = tasksWithCPM.reduce((s, t) => {
      const dur = Math.max(1, durationDaysInclusive(t.startDate, t.endDate, includeWeekends));
      const elapsed = clamp01(diffDaysExclusive(t.startDate, todayISO, includeWeekends) / dur);
      return s + t.cost * elapsed;
    }, 0);

    const EV = tasksWithCPM.reduce((s, t) => s + t.cost * (t.progress / 100), 0);
    const AC = EV;

    const spi = PV > 0 ? EV / PV : 1;
    const cpi = AC > 0 ? EV / AC : 1;

    const progressPercentage = tasksWithCPM.length > 0 ? (completedTasks / tasksWithCPM.length) * 100 : 0;
    const investmentToDate = totalCost;
    const projectedROI = projectData.totalBudget > 0 ? 
      ((totalCost / projectData.totalBudget) * 100) : 0;

    return {
      totalTasks: tasksWithCPM.length,
      criticalTasks,
      completedTasks,
      totalCost,
      earnedValue: Math.round(EV),
      plannedValue: Math.round(PV),
      spi: spi.toFixed(2),
      cpi: cpi.toFixed(2),
      progressPercentage: progressPercentage.toFixed(1),
      investmentToDate,
      projectedROI: projectedROI.toFixed(1)
    };
  }, [tasksWithCPM, projectData]);

  // SISTEMA COMPLETAMENTE NUEVO PARA AGREGAR TAREAS
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    duration: 5,
    startDate: toISO(new Date()),
    endDate: addDays(toISO(new Date()), 5),
    description: '',
    priority: 'medium',
    assignedTo: '',
    cost: 0,
    selectedPredecessors: []
  });

  // Función para sincronizar dependencias bidireccionalmente (SOLO PREDECESORAS)
  const syncDependencies = (taskId, predecessors, successors) => {
    setTasks(prev => {
      return prev.map(task => {
        // Si es la tarea que estamos editando, actualizar sus dependencias
        if (task.id === taskId) {
          return {
            id: task.id,
            wbsCode: task.wbsCode,
            name: task.name,
            duration: task.duration,
            startDate: task.startDate,
            endDate: task.endDate,
            progress: task.progress,
            predecessors: [...(predecessors || [])],
            cost: task.cost,
            priority: task.priority,
            assignedTo: task.assignedTo,
            isMilestone: task.isMilestone,
            isCritical: task.isCritical,
            originalDuration: task.originalDuration,
            earlyStart: task.earlyStart,
            earlyFinish: task.earlyFinish,
            lateStart: task.lateStart,
            lateFinish: task.lateFinish,
            totalFloat: task.totalFloat,
            freeFloat: task.freeFloat,
            description: task.description,
            resources: [...(task.resources || [])],
            workPackageId: task.workPackageId,
            status: task.status,
            successors: [] // Limpiar sucesoras
          };
        }
        
        // Para todas las demás tareas, actualizar sus dependencias inversas
        let updatedTask = {
          id: task.id,
          wbsCode: task.wbsCode,
          name: task.name,
          duration: task.duration,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress,
          predecessors: [...(task.predecessors || [])],
          cost: task.cost,
          priority: task.priority,
          assignedTo: task.assignedTo,
          isMilestone: task.isMilestone,
          isCritical: task.isCritical,
          originalDuration: task.originalDuration,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          totalFloat: task.totalFloat,
          freeFloat: task.freeFloat,
          description: task.description,
          resources: [...(task.resources || [])],
          workPackageId: task.workPackageId,
          status: task.status,
          successors: [...(task.successors || [])]
        };
        
        // Si esta tarea está en las predecesoras de la tarea editada,
        // agregar la tarea editada a sus sucesoras
        if (predecessors.includes(task.id)) {
          if (!updatedTask.successors.includes(taskId)) {
            updatedTask.successors = updatedTask.successors.slice().concat([taskId]);
          }
        } else {
          // Si no está en las predecesoras, remover de sucesoras
          updatedTask.successors = updatedTask.successors.filter(id => id !== taskId);
        }
        
        return updatedTask;
      });
    });
  };

  // Función principal para agregar tarea - COMPLETAMENTE REDISEÑADA
  const addTask = () => {
    console.log('🚀 NUEVO SISTEMA - Abriendo modal para agregar tarea');
    console.log('🚀 NUEVO SISTEMA - Tareas disponibles:', tasks.map(t => ({ id: t.id, wbsCode: t.wbsCode, name: t.name })));
    setNewTaskData({
      name: '',
      duration: 5,
      startDate: toISO(new Date()),
      endDate: addDays(toISO(new Date()), 5),
      description: '',
      priority: 'medium',
      assignedTo: '',
      cost: 0,
      selectedPredecessors: [],
      selectedSuccessors: []
    });
    setShowAddTaskModal(true);
  };

  // NUEVA FUNCIÓN: Generar archivo Excel de ejemplo
  const generateExampleExcel = () => {
    console.log('📊 GENERANDO ARCHIVO EXCEL DE EJEMPLO');
    
    // Datos de ejemplo con hitos
    const exampleData = [
      // Encabezados
      ['#', 'Nombre', 'Duración', 'Inicio', 'Fin', 'Progreso', 'Prioridad', 'Asignado', 'Costo', 'Predecesoras', 'Hitos'],
      // Tareas normales
      [1, 'Inicio del Proyecto', 0, '2024-01-01', '2024-01-01', 100, 'Alta', 'PM', 0, '', 'Sí'],
      [2, 'Análisis de Requisitos', 5, '2024-01-02', '2024-01-08', 80, 'Alta', 'Analista', 5000, '1', 'No'],
      [3, 'Diseño del Sistema', 7, '2024-01-09', '2024-01-17', 60, 'Alta', 'Arquitecto', 8000, '2', 'No'],
      [4, 'Aprobación del Diseño', 0, '2024-01-18', '2024-01-18', 0, 'Alta', 'Cliente', 0, '3', 'Sí'],
      [5, 'Desarrollo Frontend', 10, '2024-01-19', '2024-01-30', 40, 'Media', 'Dev Frontend', 12000, '4', 'No'],
      [6, 'Desarrollo Backend', 12, '2024-01-22', '2024-02-06', 30, 'Media', 'Dev Backend', 15000, '4', 'No'],
      [7, 'Integración', 3, '2024-02-07', '2024-02-11', 0, 'Alta', 'Dev Lead', 3000, '5,6', 'No'],
      [8, 'Pruebas Unitarias', 4, '2024-02-12', '2024-02-17', 0, 'Media', 'QA', 2000, '7', 'No'],
      [9, 'Pruebas de Integración', 0, '2024-02-18', '2024-02-18', 0, 'Alta', 'QA Lead', 0, '8', 'Sí'],
      [10, 'Despliegue en Producción', 2, '2024-02-19', '2024-02-22', 0, 'Alta', 'DevOps', 1000, '9', 'No'],
      [11, 'Cierre del Proyecto', 0, '2024-02-23', '2024-02-23', 0, 'Alta', 'PM', 0, '10', 'Sí']
    ];
    
    // Crear workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(exampleData);
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 5 },   // #
      { wch: 25 },  // Nombre
      { wch: 10 },  // Duración
      { wch: 12 },  // Inicio
      { wch: 12 },  // Fin
      { wch: 10 },  // Progreso
      { wch: 12 },  // Prioridad
      { wch: 15 },  // Asignado
      { wch: 10 },  // Costo
      { wch: 15 },  // Predecesoras
      { wch: 8 }    // Hitos
    ];
    worksheet['!cols'] = colWidths;
    
    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma');
    
    // Generar archivo y descargar
    const fileName = `Cronograma_Ejemplo_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    console.log('📊 Archivo Excel de ejemplo generado:', fileName);
  };

  // NUEVA FUNCIÓN: Importar cronograma completo desde Excel
  const importScheduleFromExcel = (file) => {
    console.log('📊 IMPORTANDO CRONOGRAMA COMPLETO desde:', file.name);
    console.log('📊 Tamaño del archivo:', file.size, 'bytes');
    console.log('📊 Tipo de archivo:', file.type);
    
    // Validar que el archivo existe y es válido
    if (!file) {
      alert('❌ No se seleccionó ningún archivo');
      return;
    }
    
    // Validar tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ El archivo es demasiado grande. El tamaño máximo es 10MB');
      return;
    }
    
    // Validar que el archivo no esté vacío
    if (file.size === 0) {
      alert('❌ El archivo está vacío');
      return;
    }
    
    // Validar tipo de archivo
    if (!file.type.includes('sheet') && !file.type.includes('excel') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('❌ Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
      return;
    }
    
    console.log('✅ Validaciones de archivo pasadas, iniciando lectura...');
    
    // NUEVO ENFOQUE: Usar fetch con URL.createObjectURL
    try {
      const fileUrl = URL.createObjectURL(file);
      console.log('📊 URL del archivo creada:', fileUrl);
      
      fetch(fileUrl)
        .then(response => {
          console.log('📊 Fetch response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          console.log('📊 ArrayBuffer recibido, tamaño:', arrayBuffer.byteLength);
          
          try {
            const data = new Uint8Array(arrayBuffer);
            console.log('📊 Datos convertidos a Uint8Array, tamaño:', data.length);
            
            if (data.length === 0) {
              throw new Error('El archivo está vacío');
            }
            
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('📊 Workbook creado exitosamente, hojas disponibles:', workbook.SheetNames);
            
            // Usar la función auxiliar para procesar el workbook
            processWorkbook(workbook);
            
            // Limpiar la URL del objeto
            URL.revokeObjectURL(fileUrl);
            
          } catch (processingError) {
            console.error('❌ Error procesando datos:', processingError);
            URL.revokeObjectURL(fileUrl);
            alert('❌ No se pudo procesar el archivo Excel. Verifica que el archivo no esté corrupto y que sea un formato válido (.xlsx o .xls).');
          }
        })
        .catch(fetchError => {
          console.error('❌ Error en fetch:', fetchError);
          URL.revokeObjectURL(fileUrl);
          
          // FALLBACK: Intentar con FileReader como último recurso
          console.log('📊 Intentando fallback con FileReader...');
          tryFileReaderFallback(file);
        });
        
    } catch (urlError) {
      console.error('❌ Error creando URL del objeto:', urlError);
      // FALLBACK: Intentar con FileReader como último recurso
      console.log('📊 Intentando fallback con FileReader...');
      tryFileReaderFallback(file);
    }
  };

  // Función fallback con FileReader
  const tryFileReaderFallback = (file) => {
    console.log('📊 FALLBACK: Intentando con FileReader...');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('📊 FileReader fallback: datos recibidos');
        const data = new Uint8Array(e.target.result);
        console.log('📊 Datos convertidos a Uint8Array, tamaño:', data.length);
        
        if (data.length === 0) {
          throw new Error('El archivo está vacío');
        }
        
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('📊 Workbook creado exitosamente en fallback');
        processWorkbook(workbook);
        
      } catch (processingError) {
        console.error('❌ Error procesando en fallback:', processingError);
        alert('❌ No se pudo procesar el archivo Excel. Verifica que el archivo no esté corrupto y que sea un formato válido (.xlsx o .xls).');
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error en FileReader fallback:', error);
      console.error('❌ Detalles del error fallback:', error.target?.error);
      alert('❌ No se pudo leer el archivo con ningún método. Por favor intenta con otro archivo o verifica que no esté corrupto.');
    };
    
    // Intentar leer como DataURL (más compatible)
    reader.readAsDataURL(file);
  };

  // Función auxiliar para procesar el workbook
  const processWorkbook = (workbook) => {
    try {
      console.log('📊 Procesando workbook, hojas disponibles:', workbook.SheetNames);
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('📊 Datos convertidos a JSON, filas:', jsonData.length);
      
      console.log('📊 Datos Excel importados:', jsonData);
      
      if (jsonData.length < 2) {
        alert('El archivo Excel debe tener al menos una fila de encabezados y una fila de datos');
        return;
      }
      
      // Obtener encabezados (primera fila)
      const headers = jsonData[0];
      console.log('📊 Encabezados encontrados:', headers);
      
      // Mapear columnas a índices
      const columnMap = {
        nombre: headers.findIndex(h => h && h.toString().toLowerCase().includes('nombre')),
        duracion: headers.findIndex(h => h && h.toString().toLowerCase().includes('duraci')),
        inicio: headers.findIndex(h => h && h.toString().toLowerCase().includes('inicio')),
        fin: headers.findIndex(h => h && h.toString().toLowerCase().includes('fin')),
        progreso: headers.findIndex(h => h && h.toString().toLowerCase().includes('progreso')),
        prioridad: headers.findIndex(h => h && h.toString().toLowerCase().includes('prioridad')),
        asignado: headers.findIndex(h => h && h.toString().toLowerCase().includes('asignado')),
        costo: headers.findIndex(h => h && h.toString().toLowerCase().includes('costo')),
        predecesoras: headers.findIndex(h => h && h.toString().toLowerCase().includes('predecesor')),
        hitos: headers.findIndex(h => h && h.toString().toLowerCase().includes('hito'))
      };
      
      console.log('📊 Mapeo de columnas:', columnMap);
      
      // Procesar datos (saltar encabezados)
      const newTasks = [];
      const fileTimestamp = new Date().toISOString(); // Timestamp fijo para todas las tareas del archivo
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(cell => !cell)) continue; // Saltar filas vacías
        
        const duration = parseInt(row[columnMap.duracion]) || 5;
        
        // Determinar si es hito: por duración = 0 O por campo explícito "Hitos"
        let isMilestone = duration === 0;
        if (columnMap.hitos !== -1 && row[columnMap.hitos]) {
          const hitoValue = row[columnMap.hitos].toString().toLowerCase().trim();
          isMilestone = hitoValue === 'sí' || hitoValue === 'si' || hitoValue === 'yes' || hitoValue === '1' || hitoValue === 'true';
        }
        
        // Función helper para procesar fechas de forma segura
        const parseDate = (dateValue) => {
          if (!dateValue) return new Date().toISOString().split('T')[0];
          
          if (typeof dateValue === 'number') {
            try {
              return XLSX.SSF.parse_date_code(dateValue);
            } catch (error) {
              console.warn('Error parsing date code:', dateValue, error);
              return new Date().toISOString().split('T')[0];
            }
          }
          
          try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
              console.warn('Invalid date value:', dateValue);
              return new Date().toISOString().split('T')[0];
            }
            return date.toISOString().split('T')[0];
          } catch (error) {
            console.warn('Error parsing date:', dateValue, error);
            return new Date().toISOString().split('T')[0];
          }
        };
        
        const startDate = parseDate(row[columnMap.inicio]);
        const endDate = isMilestone ? startDate : parseDate(row[columnMap.fin]);
        
        // Validar y sanitizar datos de entrada
        const rawName = row[columnMap.nombre] || `Tarea ${i}`;
        const nameValidation = validateTaskName(rawName);
        if (!nameValidation.valid) {
          console.error(`❌ Error en fila ${i + 1}: ${nameValidation.error}`);
          continue; // Saltar esta fila si el nombre es inválido
        }

        const durationValidation = validateDuration(duration);
        if (!durationValidation.valid) {
          console.error(`❌ Error en fila ${i + 1}: ${durationValidation.error}`);
          continue; // Saltar esta fila si la duración es inválida
        }

        const startValidation = validateDate(startDate);
        if (!startValidation.valid) {
          console.error(`❌ Error en fila ${i + 1}: ${startValidation.error}`);
          continue; // Saltar esta fila si la fecha es inválida
        }

        const task = {
          id: crypto.randomUUID(), // Ya corregido anteriormente
          wbsCode: `${i}`,
          name: nameValidation.sanitized,
          duration: isMilestone ? 0 : Math.max(1, durationDaysInclusive(startDate, endDate, includeWeekends)),
          startDate: startValidation.value,
          endDate: endDate,
          progress: Math.max(0, Math.min(100, parseInt(row[columnMap.progreso]) || 0)), // Limitar 0-100
          priority: sanitizeInput(row[columnMap.prioridad] || 'medium'),
          assignedTo: sanitizeInput(row[columnMap.asignado] || ''),
          cost: Math.max(0, parseFloat(row[columnMap.costo]) || 0), // Solo valores positivos
          predecessors: [],
          successors: [],
          isMilestone: isMilestone,
          originalDuration: isMilestone ? 1 : duration, // Para hitos, guardar 1 como original
          description: '',
          resources: [], // Agregar propiedad resources vacía
          status: 'pending' // Agregar status por defecto
        };
        
        // Procesar predecesoras si existen - USAR wbsCode COMO REFERENCIA
        if (row[columnMap.predecesoras]) {
          const predStr = row[columnMap.predecesoras].toString();
          console.log(`🔍 Procesando predecesoras para tarea ${i}: "${predStr}"`);
          
          // Dividir por comas y procesar números de wbsCode
          const predValues = predStr.split(',').map(s => s.trim()).filter(Boolean);
          console.log(`🔍 Valores de predecesoras procesados: [${predValues.join(', ')}]`);
          
          // Guardar temporalmente los números de wbsCode para procesar después
          task.predecessors = predValues;
          console.log(`🔍 Predecesoras temporales (wbsCode): [${task.predecessors.join(', ')}]`);
        }
        
        newTasks.push(task);
      }
      
      console.log('📊 Tareas procesadas:', newTasks);
      
      if (newTasks.length === 0) {
        alert('No se encontraron tareas válidas en el archivo Excel');
        return;
      }
      
      // PROCESAR PREDECESORAS: Convertir números de wbsCode a IDs
      console.log('🔄 Procesando predecesoras con wbsCode como referencia...');
      newTasks.forEach(task => {
        if (task.predecessors && task.predecessors.length > 0) {
          const predecessorIds = task.predecessors.map(predWbsCode => {
            const predTask = newTasks.find(t => t.wbsCode === predWbsCode);
            if (predTask) {
              console.log(`✅ Predecesora encontrada: wbsCode ${predWbsCode} → ID ${predTask.id}`);
              return predTask.id;
            } else {
              console.warn(`⚠️ Predecesora no encontrada: wbsCode ${predWbsCode}`);
              return null;
            }
          }).filter(Boolean);
          
          task.predecessors = predecessorIds;
          console.log(`🔗 Tarea "${task.name}": predecesoras convertidas a IDs: [${predecessorIds.join(', ')}]`);
        }
      });
      
      // VALIDAR PREDECESORAS DEL EXCEL
      console.log('🔍 Validando predecesoras del Excel...');
      const validation = validateExcelPredecessors(newTasks);
      
      if (validation.errors.length > 0) {
        const errorMessage = `❌ ERRORES ENCONTRADOS EN EL ARCHIVO EXCEL:\n\n${validation.errors.join('\n')}`;
        alert(errorMessage);
        return;
      }
      
      if (validation.warnings.length > 0) {
        const warningMessage = `⚠️ ADVERTENCIAS ENCONTRADAS:\n\n${validation.warnings.join('\n')}\n\n¿Deseas continuar con la importación?`;
        if (!window.confirm(warningMessage)) {
          return;
        }
      }
      
      console.log('✅ Validación de predecesoras completada exitosamente');
      
      // REEMPLAZAR COMPLETAMENTE TODAS LAS TAREAS EXISTENTES
      console.log('📊 IMPORTACIÓN - REEMPLAZANDO CRONOGRAMA COMPLETO');
      console.log('📊 IMPORTACIÓN - Tareas anteriores:', tasks?.length || 0);
      console.log('📊 IMPORTACIÓN - Nuevas tareas:', newTasks.length);
      console.log('📊 IMPORTACIÓN - Primeras 3 tareas nuevas:', newTasks.slice(0, 3));
      console.log('📊 IMPORTACIÓN - importTasks es función?', typeof importTasks);
      
      // CONFIRMACIÓN: ¿Reemplazar cronograma completo?
      const confirmMessage = `⚠️ IMPORTACIÓN DE CRONOGRAMA COMPLETO\n\n` +
        `Tareas actuales: ${tasks?.length || 0}\n` +
        `Nuevas tareas: ${newTasks.length}\n\n` +
        `Esto REEMPLAZARÁ COMPLETAMENTE el cronograma actual.\n` +
        `Las tareas de minuta existentes podrían quedar sin hito asignado.\n\n` +
        `¿Continuar con la importación?`;
      
      if (!window.confirm(confirmMessage)) {
        console.log('📊 IMPORTACIÓN - Cancelada por el usuario');
        return;
      }
      
      // Aplicar ordenamiento por wbsCode antes de importar
      const sortedNewTasks = sortTasksByWbsCode(newTasks);
      console.log('📊 IMPORTACIÓN - Tareas ordenadas por wbsCode:', sortedNewTasks.map(t => ({ name: t.name, wbsCode: t.wbsCode })));
      
      if (typeof importTasks === 'function') {
        importTasks(sortedNewTasks);
        console.log('📊 IMPORTACIÓN - importTasks llamado exitosamente - CRONOGRAMA REEMPLAZADO');
      } else {
        console.error('❌ IMPORTACIÓN - importTasks no está disponible, usando setTasks como fallback');
        if (typeof setTasks === 'function') {
          setTasks(sortedNewTasks);
          console.log('📊 IMPORTACIÓN - setTasks llamado como fallback - CRONOGRAMA REEMPLAZADO');
        } else {
          console.error('❌ IMPORTACIÓN - Ni importTasks ni setTasks están disponibles');
          alert('Error: No se puede completar la importación. Las funciones de actualización no están disponibles.');
          return;
        }
      }
      
      // Disparar evento de cambio de datos
      const dataChangeEvent = new CustomEvent('dataChange', {
        detail: { type: 'schedule_imported', taskCount: newTasks.length, timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(dataChangeEvent);
      
      // Actualizar fechas del proyecto
      const startDates = newTasks.map(t => new Date(t.startDate));
      const endDates = newTasks.map(t => new Date(t.endDate));
      const projectStart = new Date(Math.min(...startDates));
      const projectEnd = new Date(Math.max(...endDates));
      
      // Notificar al componente padre sobre los cambios en el cronograma
      if (onScheduleDataChange) {
        onScheduleDataChange({
          tasks: newTasks,
          projectStart: projectStart.toISOString().split('T')[0],
          projectEnd: projectEnd.toISOString().split('T')[0],
          totalTasks: newTasks.length,
          completedTasks: newTasks.filter(t => t.status === 'completed').length,
          totalCost: newTasks.reduce((sum, t) => sum + (t.cost || 0), 0)
        });
      }
      
      alert(`✅ CRONOGRAMA REEMPLAZADO EXITOSAMENTE!\n\n📊 ${newTasks.length} tareas cargadas (cronograma anterior eliminado)\n📅 Proyecto: ${projectStart.toLocaleDateString('es')} - ${projectEnd.toLocaleDateString('es')}\n\n⚠️ Las tareas de minuta existentes podrían necesitar reasignación de hitos.`);
      
    } catch (error) {
      console.error('❌ Error al procesar workbook:', error);
      alert('Error al procesar el archivo Excel. Verifica que tenga el formato correcto.');
    }
  };

  // FUNCIÓN CORREGIDA: Insertar tarea inmediatamente después de la fila seleccionada
  const insertTaskAtPosition = (insertAfterTaskId, visualIndex = null) => {
    console.log('🚀 AGREGANDO TAREA - Insertando después de:', insertAfterTaskId, 'en índice visual:', visualIndex);
    
    // Encontrar la tarea de referencia
    const referenceTask = tasks.find(task => task.id === insertAfterTaskId);
    if (!referenceTask) {
      console.error('❌ No se encontró la tarea de referencia');
      return;
    }
    
    // Calcular fechas basadas en la tarea de referencia
    const newStartDate = addDays(referenceTask.endDate, 1, includeWeekends);
    const newEndDate = addDays(newStartDate, 5, includeWeekends);
    
    // Generar ID único
    const generateUniqueId = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Generar código WBS único basado en la posición
    const generateWbsForPosition = (insertIndex) => {
      // Si es la primera tarea, usar 1
      if (insertIndex === 0) {
        return 1;
      }
      
      // Buscar el wbsCode de la tarea anterior
      const prevTask = tasks[insertIndex - 1];
      if (prevTask && prevTask.wbsCode) {
        // Si el wbsCode es numérico, incrementar
        if (typeof prevTask.wbsCode === 'number') {
          return prevTask.wbsCode + 1;
        }
        // Si es string con formato "1.1", "1.2", etc., incrementar la parte decimal
        const wbsStr = String(prevTask.wbsCode);
        const parts = wbsStr.split('.');
        if (parts.length === 2) {
          const major = parseInt(parts[0]);
          const minor = parseInt(parts[1]) + 1;
          return `${major}.${minor}`;
        }
        // Fallback: usar el índice + 1
        return insertIndex + 1;
      }
      
      // Fallback: usar el índice + 1
      return insertIndex + 1;
    };
    
    const newTaskId = generateUniqueId();
    const newWbsCode = generateWbsForPosition(visualIndex !== null ? visualIndex + 1 : tasks.length);
    
    // Crear nueva tarea
    const newTask = {
      id: newTaskId,
      wbsCode: newWbsCode,
      name: `Nueva Tarea ${newWbsCode}`,
      duration: 5,
      startDate: newStartDate,
      endDate: newEndDate,
      progress: 0,
      predecessors: [insertAfterTaskId],
      successors: [],
      resources: [],
      cost: 0,
      isMilestone: false,
      isCritical: false,
      originalDuration: 5,
      earlyStart: newStartDate,
      earlyFinish: newEndDate,
      lateStart: newStartDate,
      lateFinish: newEndDate,
      totalFloat: 0,
      freeFloat: 0,
      status: 'pending',
      workPackageId: newTaskId,
      plannedValue: 0,
      earnedValue: 0,
      actualCost: 0,
      description: '',
      priority: 'medium',
      assignedTo: '',
      createdDate: toISO(new Date()),
      lastModified: toISO(new Date())
    };
    
    console.log('🚀 NUEVA TAREA CREADA:', newTask);
    
    // CORRECCIÓN: Insertar la tarea en la posición exacta después de la fila seleccionada
    setTasks(prev => {
      console.log('🔍 DEBUG - Array antes de inserción:', prev.map((t, i) => ({ index: i, id: t.id, name: t.name, wbsCode: t.wbsCode })));
      
      // 1. Encontrar el índice de la tarea de referencia
      const referenceIndex = prev.findIndex(task => task.id === insertAfterTaskId);
      if (referenceIndex === -1) {
        console.error('❌ No se encontró la tarea de referencia en el array');
        return prev;
      }
      
      // 2. Insertar la nueva tarea inmediatamente después de la tarea de referencia
      const insertPosition = referenceIndex + 1;
      const newTasks = [
        ...prev.slice(0, insertPosition),
        newTask,
        ...prev.slice(insertPosition)
      ];
      
      console.log('🔍 DEBUG - Tarea insertada en posición:', insertPosition);
      console.log('🔍 DEBUG - Array después de inserción:', newTasks.map((t, i) => ({ index: i, id: t.id, name: t.name, wbsCode: t.wbsCode })));
      
      // 3. Actualizar dependencias de la tarea anterior
      const updatedTasks = newTasks.map(task => {
        if (task.id === insertAfterTaskId) {
          return {
            ...task,
            successors: [...(task.successors || []), newTaskId]
          };
        }
        return task;
      });
      
      // 4. Actualizar wbsCode de todas las tareas para mantener secuencia correcta
      const finalTasks = updatedTasks.map((task, index) => ({
        ...task,
        wbsCode: index + 1
      }));
      
      console.log('🔍 DEBUG - Array final con wbsCode actualizado:', finalTasks.map((t, i) => ({ index: i, id: t.id, name: t.name, wbsCode: t.wbsCode })));
      console.log('✅ Tarea agregada exitosamente en posición correcta');
      return finalTasks;
    });
  };

  // NUEVAS FUNCIONES PARA VISTA TABLA
  const startEditing = (taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    
    // Para fechas, asegurar que esté en formato ISO para el input
    if (field === 'startDate' || field === 'endDate') {
      if (currentValue) {
        // Si ya está en formato ISO, usarlo directamente
        if (currentValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          setEditingValue(currentValue);
        } else {
          // Si está en formato español (DD/MM/YYYY), convertir a ISO
          const dateParts = currentValue.split('/');
          if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            setEditingValue(`${year}-${month}-${day}`);
          } else {
            setEditingValue(currentValue);
          }
        }
      } else {
        setEditingValue('');
      }
    } else {
      setEditingValue(currentValue);
    }
  };


  // Funciones para el manejo de minutas
  const handleOpenMinutaModal = () => {
    setIsMinutaModalOpen(true);
  };

  const handleCloseMinutaModal = () => {
    setIsMinutaModalOpen(false);
  };

  const handleSaveMinuta = async (minutaTasks) => {
    console.log('💾 Guardando tareas de minuta:', minutaTasks);

    try {
      // Si está usando Supabase, guardar en la base de datos
      if (useSupabase && projectData?.id) {
        const result = await supabaseService.saveMinutas(projectData.id, minutaTasks);

        if (result.success) {
          // Actualizar el estado local con los datos de Supabase
          setMinutasTasks(prev => [...prev, ...minutaTasks]);

          // Registrar eventos de auditoría para cada minuta guardada
          minutaTasks.forEach(minuta => {
            logMinutaTaskCreated(minuta, projectData);
          });

          alert(`✅ Se han guardado ${minutaTasks.length} tareas de la minuta en Supabase.`);
        } else {
          console.error('❌ Error guardando en Supabase:', result.error);
          alert(`❌ Error guardando las minutas: ${result.error.message || 'Error desconocido'}`);
          return;
        }
      } else {
        // Modo local: solo agregar al estado
        setMinutasTasks(prev => [...prev, ...minutaTasks]);
        alert(`📝 Se han guardado ${minutaTasks.length} tareas de la minuta localmente.`);
      }

      // Sincronizar con el data change event para backups automáticos
      if (typeof window !== 'undefined') {
        const dataChangeEvent = new CustomEvent('dataChange', {
          detail: {
            type: 'minutasUpdated',
            projectId: projectData?.id,
            minutasCount: minutaTasks.length
          }
        });
        window.dispatchEvent(dataChangeEvent);
      }

    } catch (error) {
      console.error('❌ Error guardando minutas:', error);
      alert(`❌ Error guardando las minutas: ${error.message}`);
    }
  };

  // Funciones para edición de minutas
  const handleEditMinuta = (minuta) => {
    setEditingMinuta(minuta);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingMinuta(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateMinuta = async (updatedMinuta) => {
    try {
      if (useSupabase) {
        // Actualizar en Supabase
        const updateResult = await supabaseService.updateMinuta(updatedMinuta.id, {
          task_description: updatedMinuta.tarea,
          responsible_person: updatedMinuta.responsable,
          due_date: updatedMinuta.fecha,
          milestone_id: updatedMinuta.hitoId,
          status: updatedMinuta.estatus
        });

        if (updateResult.success) {
          // Actualizar estado local
          setMinutasTasks(prev =>
            prev.map(m => m.id === updatedMinuta.id ? updatedMinuta : m)
          );

          // Registrar evento de auditoría para la actualización
          const changes = {
            task_description: updatedMinuta.tarea,
            responsible_person: updatedMinuta.responsable,
            due_date: updatedMinuta.fecha,
            milestone_id: updatedMinuta.hitoId,
            status: updatedMinuta.estatus
          };
          logMinutaTaskUpdated(updatedMinuta, changes, projectData);

          alert('✅ Minuta actualizada correctamente');
        } else {
          console.error('❌ Error actualizando minuta:', updateResult.error);
          alert(`❌ Error actualizando minuta: ${updateResult.error.message || 'Error desconocido'}`);
        }
      } else {
        // Actualizar solo en estado local
        setMinutasTasks(prev =>
          prev.map(m => m.id === updatedMinuta.id ? updatedMinuta : m)
        );
        alert('✅ Minuta actualizada localmente');
      }
    } catch (error) {
      console.error('❌ Error actualizando minuta:', error);
      alert(`❌ Error actualizando minuta: ${error.message}`);
    }
  };

  // ===== FUNCIONES PARA ASISTENTE INTELIGENTE DE CRONOGRAMAS =====
  
  // Inicializar el servicio de IA
  useEffect(() => {
    const initializeAIService = async () => {
      if (useSupabase && projectData?.id) {
        try {
          console.log('🔍 DEBUG - Inicializando servicio de IA:', {
            projectId: projectData.id,
            organizationId: projectData.organizationId,
            organizationIdType: typeof projectData.organizationId,
            hasOrganizationId: !!projectData.organizationId,
            currentUser: supabaseService.currentUser?.email
          });
          
          await aiSchedulerService.initialize(
            supabaseService.supabase,
            projectData.organizationId,
            supabaseService.currentUser
          );
          console.log('🤖 Servicio de IA inicializado para proyecto:', projectData.id);
        } catch (error) {
          console.error('❌ Error inicializando servicio de IA:', error);
        }
      } else {
        console.log('⚠️ No se puede inicializar servicio de IA:', {
          useSupabase,
          hasProjectId: !!projectData?.id,
          projectData: projectData
        });
      }
    };

    initializeAIService();
  }, [useSupabase, projectData?.id, projectData?.organizationId]);

  // Manejar cronograma generado por IA
  const handleAIScheduleGenerated = async (generatedSchedule) => {
    try {
      console.log('🤖 Aplicando cronograma generado por IA:', generatedSchedule);
      
      // CORRECCIÓN: Combinar actividades e hitos en el orden correcto
      // CORRECCIÓN: Calcular fechas iniciales antes de CPM para evitar errores
      const today = new Date();
      const projectStartDate = toISO(today);

      // 1. Procesar actividades con fechas iniciales
      const aiActivities = generatedSchedule.activities.map((item, index) => {
        const startDate = addDays(projectStartDate, index, includeWeekends);
        const endDate = addDays(startDate, (item.duration || 1) - 1, includeWeekends);
        
        return {
          id: item.id,
          name: item.name,
          description: item.description || '',
          duration: item.duration || 1,
          startDate: startDate,
          endDate: endDate,
          progress: 0,
          status: 'pending',
          priority: item.priority || 'medium',
          assignedTo: item.assignedTo || 'Pendiente',
          dependencies: item.dependencies || [],
          predecessors: item.dependencies || [],
          successors: [],
          isMilestone: false,
          estimatedCost: item.estimatedCost || 0,
          category: item.category || 'execution',
          phase: item.phase || 'General',
          generatedBy: 'ai',
          confidence: item.confidence || 0.8,
          criteria: item.criteria || ''
        };
      });

      // 2. Procesar hitos con fechas iniciales
      const aiMilestones = (generatedSchedule.milestones || []).map((item, index) => {
        const milestoneDate = addDays(projectStartDate, aiActivities.length + index, includeWeekends);
        
        return {
          id: item.id,
          name: item.name,
          description: item.description || '',
          duration: 0, // Los hitos no tienen duración
          startDate: milestoneDate,
          endDate: milestoneDate, // Para hitos, startDate = endDate
          progress: 0,
          status: 'pending',
          priority: item.priority || 'high',
          assignedTo: item.assignedTo || 'Pendiente',
          dependencies: item.dependencies || [],
          predecessors: item.dependencies || [],
          successors: [],
          isMilestone: true,
          estimatedCost: item.estimatedCost || 0,
          category: item.category || 'milestone',
          phase: item.phase || 'General',
          generatedBy: 'ai',
          confidence: item.confidence || 0.9,
          criteria: item.criteria || ''
        };
      });

      // 3. Intercalar hitos con sus actividades relacionadas
      const allAITasks = [];
      const processedMilestones = new Set();

      // Agrupar actividades por fase
      const activitiesByPhase = {};
      aiActivities.forEach(activity => {
        const phase = activity.phase || 'General';
        if (!activitiesByPhase[phase]) {
          activitiesByPhase[phase] = [];
        }
        activitiesByPhase[phase].push(activity);
      });

      // Procesar cada fase
      Object.entries(activitiesByPhase).forEach(([phaseName, phaseActivities]) => {
        // Agregar actividades de la fase
        allAITasks.push(...phaseActivities);

        // Buscar hitos de esta fase
        const phaseMilestones = aiMilestones.filter(milestone => 
          milestone.phase === phaseName && !processedMilestones.has(milestone.id)
        );

        // Agregar hitos de la fase después de sus actividades
        allAITasks.push(...phaseMilestones);
        phaseMilestones.forEach(m => processedMilestones.add(m.id));
      });

      // Agregar hitos sin fase específica al final
      const unassignedMilestones = aiMilestones.filter(milestone => 
        !milestone.phase || milestone.phase === 'General'
      );
      allAITasks.push(...unassignedMilestones);

      console.log('🔄 Cronograma IA procesado:', {
        totalItems: allAITasks.length,
        activities: allAITasks.filter(item => !item.isMilestone).length,
        milestones: allAITasks.filter(item => item.isMilestone).length,
        phases: [...new Set(allAITasks.map(item => item.phase))]
      });

      console.log('🔍 DEBUG - Orden de tareas antes de CPM:', {
        activitiesByPhase: Object.keys(activitiesByPhase),
        allAITasksOrder: allAITasks.map((task, index) => ({
          index,
          id: task.id,
          name: task.name,
          isMilestone: task.isMilestone,
          phase: task.phase
        }))
      });

      // Confirmar reemplazo del cronograma actual
      const activitiesCount = allAITasks.filter(item => !item.isMilestone).length;
      const milestonesCount = allAITasks.filter(item => item.isMilestone).length;
      
      const confirmMessage = `🤖 CRONOGRAMA GENERADO POR IA\n\n` +
        `Actividades: ${activitiesCount}\n` +
        `Hitos: ${milestonesCount}\n` +
        `Duración estimada: ${Math.round(generatedSchedule.metadata?.estimatedDuration || 0)} días\n\n` +
        `Esto REEMPLAZARÁ COMPLETAMENTE el cronograma actual.\n` +
        `¿Continuar con la aplicación del cronograma generado por IA?`;

      if (!window.confirm(confirmMessage)) {
        console.log('🤖 Aplicación de cronograma IA cancelada por el usuario');
        return;
      }

      // Aplicar CPM a las nuevas tareas manteniendo el orden original
      const cpmResult = calculateCPM(allAITasks, includeWeekends);
      const tasksWithCPM = cpmResult.tasks || cpmResult;

      // CORRECCIÓN: Mantener el orden original de la IA después del CPM
      // El CPM puede reordenar las tareas, pero queremos preservar el orden lógico de la IA
      const orderedTasksWithCPM = [];
      const tasksMap = new Map(tasksWithCPM.map(task => [task.id, task]));
      
      // Reconstruir el orden usando el array original allAITasks
      allAITasks.forEach(originalTask => {
        const cpmTask = tasksMap.get(originalTask.id);
        if (cpmTask) {
          orderedTasksWithCPM.push(cpmTask);
        }
      });
      
      // Agregar cualquier tarea que no esté en el orden original (por seguridad)
      tasksWithCPM.forEach(task => {
        if (!tasksMap.has(task.id) || !allAITasks.find(t => t.id === task.id)) {
          orderedTasksWithCPM.push(task);
        }
      });

      console.log('🔍 DEBUG - Resultado CPM:', {
        cpmResultType: typeof cpmResult,
        cpmResultKeys: Object.keys(cpmResult),
        tasksType: typeof tasksWithCPM,
        tasksIsArray: Array.isArray(tasksWithCPM),
        tasksLength: Array.isArray(tasksWithCPM) ? tasksWithCPM.length : 'N/A',
        orderedTasksLength: orderedTasksWithCPM.length,
        orderPreserved: allAITasks.length === orderedTasksWithCPM.length
      });

      console.log('🔄 Orden preservado después de CPM:', {
        originalOrder: allAITasks.map(t => ({ id: t.id, name: t.name, isMilestone: t.isMilestone })),
        finalOrder: orderedTasksWithCPM.map(t => ({ id: t.id, name: t.name, isMilestone: t.isMilestone }))
      });

      console.log('🔍 DEBUG - Verificación de intercalado:', {
        milestonesPositions: orderedTasksWithCPM.map((task, index) => 
          task.isMilestone ? { index, name: task.name, phase: task.phase } : null
        ).filter(Boolean),
        activitiesBeforeMilestones: orderedTasksWithCPM.map((task, index) => {
          if (task.isMilestone) {
            const activitiesBefore = orderedTasksWithCPM.slice(0, index).filter(t => !t.isMilestone);
            return { milestone: task.name, activitiesBefore: activitiesBefore.length };
          }
          return null;
        }).filter(Boolean),
        sampleTasksWithDates: orderedTasksWithCPM.slice(0, 5).map(task => ({
          id: task.id,
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
          isMilestone: task.isMilestone
        }))
      });

      // Actualizar el estado de tareas con el orden preservado
      setTasks(orderedTasksWithCPM);

      // Registrar evento de auditoría
      addAuditEvent({
        category: 'ai-scheduler',
        action: 'schedule-applied',
        description: 'Cronograma generado por IA aplicado al proyecto',
        details: {
          activitiesCount: activitiesCount,
          milestonesCount: milestonesCount,
          templateUsed: generatedSchedule.metadata?.templateUsed,
          estimatedDuration: generatedSchedule.metadata?.estimatedDuration,
          complexity: generatedSchedule.metadata?.complexity
        }
      });

      // Mostrar recomendaciones si las hay
      if (generatedSchedule.recommendations && generatedSchedule.recommendations.length > 0) {
        const recommendationsText = generatedSchedule.recommendations
          .map(rec => `• ${rec.title}: ${rec.description}`)
          .join('\n');
        
        alert(`✅ CRONOGRAMA DE IA APLICADO EXITOSAMENTE!\n\n` +
          `📊 ${allAITasks.length} elementos generados\n` +
          `🎯 ${milestonesCount} hitos creados\n` +
          `⏱️ Duración estimada: ${Math.round(generatedSchedule.metadata?.estimatedDuration || 0)} días\n\n` +
          `💡 RECOMENDACIONES:\n${recommendationsText}`);
      } else {
        alert(`✅ CRONOGRAMA DE IA APLICADO EXITOSAMENTE!\n\n` +
          `📊 ${allAITasks.length} elementos generados\n` +
          `🎯 ${milestonesCount} hitos creados\n` +
          `⏱️ Duración estimada: ${Math.round(generatedSchedule.metadata?.estimatedDuration || 0)} días`);
      }

      console.log('✅ Cronograma de IA aplicado exitosamente');

    } catch (error) {
      console.error('❌ Error aplicando cronograma de IA:', error);
      alert(`❌ Error aplicando cronograma de IA: ${error.message}`);
    }
  };

  // Función para alternar hito
  const toggleMilestone = (taskId) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const isBecomingMilestone = !task.isMilestone;
      
      if (isBecomingMilestone) {
        // Al marcar como hito: duración = 0, fin = inicio
        console.log('🔍 DEBUG - Creando hito:', {
          taskId,
          taskName: task.name,
          startDate: task.startDate,
          endDate: task.startDate,
          duration: 0
        });
        
        return {
          id: task.id,
          wbsCode: task.wbsCode,
          name: task.name,
          duration: 0,
          startDate: task.startDate,
          endDate: task.startDate,
          progress: task.progress,
          predecessors: [...(task.predecessors || [])],
          cost: task.cost,
          priority: task.priority,
          assignedTo: task.assignedTo,
          isMilestone: true,
          isCritical: task.isCritical,
          originalDuration: task.originalDuration,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          totalFloat: task.totalFloat,
          freeFloat: task.freeFloat,
          description: task.description,
          resources: [...(task.resources || [])],
          workPackageId: task.workPackageId,
          status: task.status,
          successors: [...(task.successors || [])],
          updatedAt: new Date().toISOString()
        };
      } else {
        // Al quitar hito: restaurar duración original (mínimo 1 día)
        const originalDuration = task.originalDuration || 1;
        const newEndDate = addDays(task.startDate, originalDuration, includeWeekends);
        return {
          id: task.id,
          wbsCode: task.wbsCode,
          name: task.name,
          duration: originalDuration,
          startDate: task.startDate,
          endDate: newEndDate,
          progress: task.progress,
          predecessors: [...(task.predecessors || [])],
          cost: task.cost,
          priority: task.priority,
          assignedTo: task.assignedTo,
          isMilestone: false,
          isCritical: task.isCritical,
          originalDuration: task.originalDuration,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          totalFloat: task.totalFloat,
          freeFloat: task.freeFloat,
          description: task.description,
          resources: [...(task.resources || [])],
          workPackageId: task.workPackageId,
          status: task.status,
          successors: [...(task.successors || [])],
          updatedAt: new Date().toISOString()
        };
      }
    }));
    
    // Disparar evento de cambio de datos
    const dataChangeEvent = new CustomEvent('dataChange', {
      detail: { type: 'milestone_toggled', taskId, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(dataChangeEvent);
  };

  // FUNCIÓN SIMPLIFICADA: Agregar tarea al final del cronograma
  const addTaskAtEnd = () => {
    console.log('🚀 AGREGANDO TAREA AL FINAL');
    
    // Calcular fechas basadas en la última tarea
    let newStartDate = toISO(new Date());
    let newEndDate = addDays(newStartDate, 5, includeWeekends);
    
    if (tasks.length > 0) {
      const lastTask = tasks[tasks.length - 1];
      newStartDate = addDays(lastTask.endDate, 1, includeWeekends);
      newEndDate = addDays(newStartDate, 5, includeWeekends);
    }
    
    // Generar ID único
    const generateUniqueId = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Generar código WBS único
    const generateUniqueWbs = () => {
      let counter = 1;
      let newWbs;
      do {
        newWbs = counter;
        counter++;
      } while (tasks.some(task => task.wbsCode === newWbs));
      return newWbs;
    };
    
    const newTaskId = generateUniqueId();
    const newWbsCode = generateUniqueWbs();
    
    // Crear nueva tarea
    const newTask = {
      id: newTaskId,
      wbsCode: newWbsCode,
      name: `Nueva Tarea ${newWbsCode}`,
      duration: 5,
      startDate: newStartDate,
      endDate: newEndDate,
      progress: 0,
      predecessors: tasks.length > 0 ? [tasks[tasks.length - 1].id] : [], // Depende de la última tarea
      successors: [],
      resources: [],
      cost: 0,
      isMilestone: false,
      isCritical: false,
      originalDuration: 5,
      earlyStart: newStartDate,
      earlyFinish: newEndDate,
      lateStart: newStartDate,
      lateFinish: newEndDate,
      totalFloat: 0,
      freeFloat: 0,
      status: 'pending',
      workPackageId: newTaskId,
      plannedValue: 0,
      earnedValue: 0,
      actualCost: 0,
      description: '',
      priority: 'medium',
      assignedTo: '',
      createdDate: toISO(new Date()),
      lastModified: toISO(new Date())
    };
    
    console.log('🚀 NUEVA TAREA AL FINAL CREADA:', newTask);
    
    // Agregar la tarea al final
    setTasks(prev => {
      const newTasks = [...prev, newTask];
      
      // Si hay una tarea anterior, actualizar sus dependencias
      if (prev.length > 0) {
        const lastTaskId = prev[prev.length - 1].id;
        const updatedTasks = newTasks.map(task => {
          if (task.id === lastTaskId) {
            return {
              ...task,
              successors: [...(task.successors || []), newTaskId]
            };
          }
          return task;
        });
        
        console.log('✅ Tarea agregada al final exitosamente');
        return updatedTasks;
      }
      
      console.log('✅ Primera tarea agregada exitosamente');
      return newTasks;
    });
  };

  // FUNCIÓN SIMPLIFICADA: Eliminar tarea directamente (como MS Project)
  const deleteTask = (taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      console.error('❌ Tarea no encontrada para eliminar');
      return;
    }

    // Verificar dependencias antes de eliminar
    const dependentTasks = tasks.filter(task => 
      task.predecessors?.includes(taskId) || task.successors?.includes(taskId)
    );

    let confirmMessage = `¿Estás seguro de que quieres eliminar la tarea "${taskToDelete.name}"?`;
    
    if (dependentTasks.length > 0) {
      confirmMessage += `\n\n⚠️ ADVERTENCIA: Esta tarea tiene dependencias:\n`;
      dependentTasks.forEach(task => {
        if (task.predecessors?.includes(taskId)) {
          confirmMessage += `• "${task.name}" depende de esta tarea\n`;
        }
        if (task.successors?.includes(taskId)) {
          confirmMessage += `• Esta tarea depende de "${task.name}"\n`;
        }
      });
      confirmMessage += `\nLas dependencias se limpiarán automáticamente.`;
    }
    
    confirmMessage += `\n\nEsta acción no se puede deshacer.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    console.log('🗑️ ELIMINANDO TAREA:', taskToDelete.name, 'ID:', taskId);
    console.log('🔗 Tareas dependientes encontradas:', dependentTasks.length);
    
    // Eliminar la tarea y limpiar dependencias
    setTasks(prev => {
      const updatedTasks = prev.filter(task => task.id !== taskId);
      
      // Limpiar referencias a la tarea eliminada en todas las demás tareas
      const cleanedTasks = updatedTasks.map(task => ({
        ...task,
        predecessors: task.predecessors?.filter(predId => predId !== taskId) || [],
        successors: task.successors?.filter(succId => succId !== taskId) || []
      }));
      
      console.log('✅ Tarea eliminada exitosamente');
      return cleanedTasks;
    });
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const { taskId, field } = editingCell;
    const newValue = editingValue;
    
    console.log('💾 SAVEEDIT - INICIANDO:', {
      taskId,
      field,
      newValue,
      tasksLength: tasks ? tasks.length : 'UNDEFINED'
    });
    
    if (field === 'dependencies') {
      saveDependenciesEdit();
      return;
    }
    
    setTasks(prev => {
      console.log('💾 SAVEEDIT - Estado ANTES de actualizar:', {
        prevLength: prev ? prev.length : 'UNDEFINED',
        prevTasks: prev ? prev.map(t => ({ id: t.id, name: t.name })) : 'UNDEFINED'
      });
      
      return prev.map(task => {
      if (task.id === taskId) {
        // Clonación segura del objeto task
        const updatedTask = {
          id: task.id,
          wbsCode: task.wbsCode,
          name: task.name,
          duration: task.duration,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress,
          predecessors: [...(task.predecessors || [])],
          cost: task.cost,
          priority: task.priority,
          assignedTo: task.assignedTo,
          isMilestone: task.isMilestone,
          isCritical: task.isCritical,
          originalDuration: task.originalDuration,
          earlyStart: task.earlyStart,
          earlyFinish: task.earlyFinish,
          lateStart: task.lateStart,
          lateFinish: task.lateFinish,
          totalFloat: task.totalFloat,
          freeFloat: task.freeFloat,
          description: task.description,
          resources: [...(task.resources || [])],
          workPackageId: task.workPackageId,
          status: task.status,
          successors: [...(task.successors || [])]
        };
        
        switch (field) {
          case 'name':
            updatedTask.name = newValue;
            break;
          case 'duration':
            const duration = parseInt(newValue) || 1;
            updatedTask.duration = duration;
            // Para hitos: fecha de fin = fecha de inicio
            if (updatedTask.isMilestone) {
              updatedTask.endDate = updatedTask.startDate;
            } else {
              // Calcular fecha fin basándose en la duración
              if (includeWeekends) {
                // Incluir fines de semana
                const startDate = new Date(updatedTask.startDate);
                startDate.setDate(startDate.getDate() + duration - 1);
                updatedTask.endDate = toISO(startDate);
              } else {
                // Solo días laborales
                updatedTask.endDate = addDays(updatedTask.startDate, duration, includeWeekends);
              }
            }
            break;
          case 'startDate':
            updatedTask.startDate = newValue;
            // Para hitos: fecha de fin = fecha de inicio
            if (updatedTask.isMilestone) {
              updatedTask.endDate = newValue;
            } else {
              // Calcular fecha fin basándose en la duración
              if (includeWeekends) {
                // Incluir fines de semana
                const startDate = new Date(newValue);
                startDate.setDate(startDate.getDate() + updatedTask.duration - 1);
                updatedTask.endDate = toISO(startDate);
              } else {
                // Solo días laborales
                updatedTask.endDate = addDays(newValue, updatedTask.duration, includeWeekends);
              }
            }
            break;
          case 'endDate':
            updatedTask.endDate = newValue;
            // NO recalcular duración automáticamente - mantener la duración original
            // La duración se puede ajustar manualmente si es necesario
            break;
          case 'progress':
            updatedTask.progress = Math.max(0, Math.min(100, parseInt(newValue) || 0));
            break;
          case 'priority':
            updatedTask.priority = newValue;
            break;
          case 'assignedTo':
            updatedTask.assignedTo = newValue;
            break;
          case 'cost':
            updatedTask.cost = parseFloat(newValue) || 0;
            break;
        }
        
        return updatedTask;
      }
      return task;
    });
    });
    
    // Disparar evento de cambio de datos para sincronizar con otros componentes
    const dataChangeEvent = new CustomEvent('dataChange', {
      detail: { 
        type: 'taskUpdated', 
        taskId, 
        field, 
        newValue,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(dataChangeEvent);
    
    console.log('💾 SAVEEDIT - COMPLETADO');
    setEditingCell(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleKeyDown = (e) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    }
  };

  const insertRowAfter = (taskId) => {
    const insertIndex = tasks.findIndex(task => task.id === taskId);
    if (insertIndex === -1) return;
    
    const previousTask = tasks[insertIndex];
    const newStartDate = addDays(previousTask.endDate, 1, includeWeekends);
    const newEndDate = addDays(newStartDate, 5, includeWeekends);
    
    const newTask = {
      id: crypto.randomUUID(),
      name: 'Nueva Tarea',
      duration: 5,
      startDate: newStartDate,
      endDate: newEndDate,
      progress: 0,
      priority: 'medium',
      status: 'in-progress', // Estatus por defecto para nuevas tareas
      assignedTo: '',
      cost: 0,
      predecessors: [taskId],
      successors: [],
      resources: [],
      isMilestone: false,
      originalDuration: 5, // Guardar duración original
      description: ''
    };
    
    setTasks(prev => {
      const newTasks = prev.slice();
      newTasks.splice(insertIndex + 1, 0, newTask);
      return newTasks;
    });
  };

  // NUEVAS FUNCIONES PARA EDITAR DEPENDENCIAS (SOLO PREDECESORAS)
  const startEditingDependencies = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Convertir IDs a números de wbsCode para mostrar números correctos
    const predecessorNumbers = task.predecessors.map(predId => {
      const predTask = tasks.find(t => t.id === predId);
      return predTask ? parseInt(predTask.wbsCode) : null;
    }).filter(Boolean);
    
    setEditingCell({ taskId, field: 'dependencies' });
    setEditingValue(predecessorNumbers.join(', ')); // Mostrar números de wbsCode
    console.log(`🔍 Editando dependencias de tarea ${task.wbsCode}: mostrando números wbsCode [${predecessorNumbers.join(', ')}]`);
  };

  const saveDependenciesEdit = () => {
    if (!editingCell || editingCell.field !== 'dependencies') return;
    
    const { taskId } = editingCell;
    try {
      // Procesar números separados por comas (números de wbsCode)
      const predecessorNumbers = editingValue
        .split(',')
        .map(num => parseInt(num.trim()))
        .filter(num => !isNaN(num) && num > 0);
      
      console.log(`💾 Guardando dependencias para tarea ${taskId}: números wbsCode [${predecessorNumbers.join(', ')}]`);
      
      // Convertir números de wbsCode a IDs
      const predecessorIds = predecessorNumbers.map(wbsCode => {
        const predTask = tasks.find(t => parseInt(t.wbsCode) === wbsCode);
        if (predTask) {
          console.log(`✅ Predecesora encontrada: wbsCode ${wbsCode} → ID ${predTask.id}`);
          return predTask.id;
        } else {
          console.warn(`⚠️ Predecesora no encontrada: wbsCode ${wbsCode}`);
          return null;
        }
      }).filter(id => id); // Filtrar IDs válidos
      
      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          // Clonación segura del objeto task
          const updatedTask = {
            id: task.id,
            wbsCode: task.wbsCode,
            name: task.name,
            duration: task.duration,
            startDate: task.startDate,
            endDate: task.endDate,
            progress: task.progress,
            predecessors: [...(task.predecessors || [])],
            cost: task.cost,
            priority: task.priority,
            assignedTo: task.assignedTo,
            isMilestone: task.isMilestone,
            isCritical: task.isCritical,
            originalDuration: task.originalDuration,
            earlyStart: task.earlyStart,
            earlyFinish: task.earlyFinish,
            lateStart: task.lateStart,
            lateFinish: task.lateFinish,
            totalFloat: task.totalFloat,
            freeFloat: task.freeFloat,
            description: task.description,
            resources: [...(task.resources || [])],
            workPackageId: task.workPackageId,
            status: task.status,
            successors: [...(task.successors || [])]
          };
          updatedTask.predecessors = predecessorIds;
          updatedTask.successors = []; // Limpiar sucesoras
          
          // Sincronizar dependencias bidireccionalmente (solo predecesoras)
          syncDependencies(taskId, predecessorIds, []);
          
          return updatedTask;
        }
        return task;
      }));
      
      setEditingCell(null);
      setEditingValue('');
    } catch (error) {
      console.error('Error al guardar dependencias:', error);
      setEditingCell(null);
      setEditingValue('');
    }
  };

  // Función para crear la tarea desde el modal
  const createTaskFromModal = (insertIndexOverride = null) => {
    try {
      console.log('🚀 NUEVO SISTEMA - Creando tarea desde modal');
      console.log('🚀 NUEVO SISTEMA - Datos completos del modal:', newTaskData);
      console.log('🚀 NUEVO SISTEMA - Predecesoras seleccionadas:', newTaskData.selectedPredecessors);
      console.log('🚀 NUEVO SISTEMA - Sucesoras seleccionadas:', newTaskData.selectedSuccessors);
      // Usar insertIndexOverride si está disponible, sino usar el del estado
      const finalInsertIndex = insertIndexOverride !== null ? insertIndexOverride : newTaskData.insertIndex;
      const finalInsertAfterTaskId = newTaskData.insertAfterTaskId;
      
      console.log('🚀 DEBUG - Valores de inserción:', {
        insertIndex: newTaskData.insertIndex,
        insertAfterTaskId: newTaskData.insertAfterTaskId,
        insertIndexType: typeof newTaskData.insertIndex,
        insertAfterTaskIdType: typeof newTaskData.insertAfterTaskId,
        insertIndexOverride: insertIndexOverride,
        finalInsertIndex: finalInsertIndex
      });
      
      // Validaciones
      if (!newTaskData.name.trim()) {
        alert('Por favor ingresa un nombre para la tarea');
        return;
      }
      
      if (newTaskData.duration <= 0) {
        alert('La duración debe ser mayor a 0');
        return;
      }
      
      // Generar ID único usando UUID para evitar conflictos
      const generateUniqueId = () => {
        // Generar un UUID válido directamente
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      // Generar código WBS único
      const generateUniqueWbs = () => {
        let counter = 1;
        let newWbs;
        do {
          newWbs = `1.${counter}`;
          counter++;
        } while (tasks.some(task => task.wbsCode === newWbs));
        return newWbs;
      };
      
      const newTaskId = generateUniqueId();
      const newWbsCode = generateUniqueWbs();
      
      console.log('🚀 DEBUG - IDs generados:', {
        newTaskId,
        newWbsCode,
        insertIndex: newTaskData.insertIndex,
        insertAfterTaskId: newTaskData.insertAfterTaskId
      });
      
      // Crear nueva tarea
      console.log('🚀 DEBUG - Creando tarea con dependencias:', {
        selectedPredecessors: newTaskData.selectedPredecessors,
        selectedSuccessors: newTaskData.selectedSuccessors,
        predecessorsLength: newTaskData.selectedPredecessors.length,
        successorsLength: newTaskData.selectedSuccessors.length
      });
      
      const newTask = {
        id: newTaskId,
        wbsCode: newWbsCode,
        name: newTaskData.name.trim(),
        duration: newTaskData.duration,
        startDate: newTaskData.startDate,
        endDate: newTaskData.endDate,
        progress: 0,
        predecessors: newTaskData.selectedPredecessors.slice(),
        successors: newTaskData.selectedSuccessors.slice(),
        resources: [],
        cost: newTaskData.cost,
      isMilestone: false,
      isCritical: false,
        originalDuration: newTaskData.duration, // Guardar duración original
        earlyStart: newTaskData.startDate,
        earlyFinish: newTaskData.endDate,
        lateStart: newTaskData.startDate,
        lateFinish: newTaskData.endDate,
      totalFloat: 0,
      freeFloat: 0,
      status: 'pending',
      // Conexión con EVM
      workPackageId: newTaskId,
      plannedValue: 0,
      earnedValue: 0,
        actualCost: 0,
        // Campos adicionales
        description: newTaskData.description,
        priority: newTaskData.priority,
        assignedTo: newTaskData.assignedTo,
        createdDate: toISO(new Date()),
        lastModified: toISO(new Date())
      };
      
      console.log('🚀 NUEVO SISTEMA - Tarea creada:', newTask);
      console.log('🚀 DEBUG - Dependencias en la tarea creada:', {
        predecessors: newTask.predecessors,
        successors: newTask.successors,
        predecessorsLength: newTask.predecessors.length,
        successorsLength: newTask.successors.length
      });
      console.log('🚀 NUEVO SISTEMA - Dependencias seleccionadas:', {
        predecessors: newTaskData.selectedPredecessors,
        successors: newTaskData.selectedSuccessors
      });
      
      // Agregar la tarea al estado y sincronizar dependencias en una sola operación
      console.log('🚀 NUEVO SISTEMA - Llamando a setTasks con nueva tarea');
      console.log('🚀 NUEVO SISTEMA - Tareas actuales antes de agregar:', tasks.length);
      
      setTasks(prev => {
        console.log('🚀 NUEVO SISTEMA - setTasks ejecutándose, tareas previas:', prev.length);
        console.log('🚀 DEBUG - Tarea a insertar:', {
          id: newTask.id,
          name: newTask.name,
          wbsCode: newTask.wbsCode
        });
        let updatedTasks;
        
        // Si hay una posición específica de inserción, insertar ahí
        console.log('🚀 DEBUG - Verificando insertIndex:', {
          insertIndex: newTaskData.insertIndex,
          insertIndexUndefined: newTaskData.insertIndex === undefined,
          insertAfterTaskId: newTaskData.insertAfterTaskId,
          finalInsertIndex: finalInsertIndex,
          finalInsertIndexUndefined: finalInsertIndex === undefined
        });
        
        if (finalInsertIndex !== undefined && finalInsertIndex !== null) {
          // Usar el índice calculado previamente
          const newTasks = prev.slice();
          newTasks.splice(finalInsertIndex, 0, newTask);
          updatedTasks = newTasks;
          console.log('🚀 NUEVA FUNCIÓN - Tarea insertada en posición:', finalInsertIndex);
        } else if (newTaskData.insertAfterTaskId) {
          // Fallback: buscar por ID de tarea
          const insertIndex = prev.findIndex(task => task.id === newTaskData.insertAfterTaskId);
          if (insertIndex !== -1) {
            // Insertar después de la tarea especificada
            const newTasks = prev.slice();
            newTasks.splice(insertIndex + 1, 0, newTask);
            updatedTasks = newTasks;
            console.log('🚀 NUEVA FUNCIÓN - Tarea insertada después de:', insertIndex + 1);
          } else {
            // Si no se encuentra la tarea, agregar al final
            const newTasks = prev.slice();
            newTasks.push(newTask);
            updatedTasks = newTasks;
            console.log('🚀 NUEVA FUNCIÓN - Tarea agregada al final (posición no encontrada)');
          }
        } else {
          // Inserción normal al final
          const newTasks = prev.slice();
          newTasks.push(newTask);
          updatedTasks = newTasks;
          console.log('🚀 NUEVO SISTEMA - Tarea agregada al final. Total tareas:', updatedTasks.length);
        }
        
        // Aplicar ordenamiento por wbsCode para todos los proyectos
        updatedTasks = sortTasksByWbsCode(updatedTasks);
        
        // Actualizar wbsCode de todas las tareas para mantener secuencia correcta
        updatedTasks = updatedTasks.map((task, index) => ({
          ...task,
          wbsCode: index + 1
        }));
        
        console.log('🚀 NUEVA FUNCIÓN - wbsCode actualizados para mantener secuencia:', 
          updatedTasks.map(t => ({ name: t.name, wbsCode: t.wbsCode }))
        );
        
        // Verificar que la tarea agregada mantenga sus dependencias y posición
        const addedTask = updatedTasks.find(t => t.id === newTaskId);
        const addedTaskIndex = updatedTasks.findIndex(t => t.id === newTaskId);
        console.log('🚀 DEBUG - Tarea en el estado después de agregar:', {
          id: addedTask?.id,
          name: addedTask?.name,
          position: addedTaskIndex,
          wbsCode: addedTask?.wbsCode,
          predecessors: addedTask?.predecessors,
          successors: addedTask?.successors,
          predecessorsLength: addedTask?.predecessors?.length,
          successorsLength: addedTask?.successors?.length
        });
        
        // Log de las primeras 15 tareas para verificar el orden
        console.log('🚀 DEBUG - Primeras 15 tareas después de inserción:', 
          updatedTasks.slice(0, 15).map((t, i) => ({ 
            position: i, 
            wbsCode: t.wbsCode, 
            name: t.name, 
            id: t.id 
          }))
        );
        
        // Sincronizar dependencias bidireccionalmente inmediatamente
        if (newTaskData.selectedPredecessors.length > 0 || newTaskData.selectedSuccessors.length > 0) {
          console.log('🚀 NUEVO SISTEMA - Sincronizando dependencias...');
          
          return updatedTasks.map(task => {
            // Si es la tarea que acabamos de crear, mantener sus dependencias
            if (task.id === newTaskId) {
              return task;
            }
            
            // Para todas las demás tareas, actualizar sus dependencias inversas
            let updatedTask = {
              id: task.id,
              wbsCode: task.wbsCode,
              name: task.name,
              duration: task.duration,
              startDate: task.startDate,
              endDate: task.endDate,
              progress: task.progress,
              predecessors: [...(task.predecessors || [])],
              cost: task.cost,
              priority: task.priority,
              assignedTo: task.assignedTo,
              isMilestone: task.isMilestone,
              isCritical: task.isCritical,
              originalDuration: task.originalDuration,
              earlyStart: task.earlyStart,
              earlyFinish: task.earlyFinish,
              lateStart: task.lateStart,
              lateFinish: task.lateFinish,
              totalFloat: task.totalFloat,
              freeFloat: task.freeFloat,
              description: task.description,
              resources: [...(task.resources || [])],
              workPackageId: task.workPackageId,
              status: task.status,
              successors: [...(task.successors || [])]
            };
            
            // Si esta tarea está en las predecesoras de la nueva tarea,
            // agregar la nueva tarea a sus sucesoras
            if (newTaskData.selectedPredecessors.includes(task.id)) {
              if (!updatedTask.successors.includes(newTaskId)) {
                updatedTask.successors = updatedTask.successors.slice().concat([newTaskId]);
                console.log(`🚀 NUEVO SISTEMA - Agregando ${newTaskId} como sucesora de ${task.id}`);
              }
            }
            
            // Si esta tarea está en las sucesoras de la nueva tarea,
            // agregar la nueva tarea a sus predecesoras
            if (newTaskData.selectedSuccessors.includes(task.id)) {
              if (!updatedTask.predecessors.includes(newTaskId)) {
                updatedTask.predecessors = [...(updatedTask.predecessors || []), newTaskId];
                console.log(`🚀 NUEVO SISTEMA - Agregando ${newTaskId} como predecesora de ${task.id}`);
              }
            }
            
            return updatedTask;
          });
        }
        
        console.log('🚀 DEBUG - setTasks retornando:', {
          totalTasks: updatedTasks.length,
          newTaskIncluded: updatedTasks.some(t => t.id === newTaskId),
          newTaskPosition: updatedTasks.findIndex(t => t.id === newTaskId)
        });
        return updatedTasks;
      });
      
      // Verificar que el estado se actualizó correctamente
      setTimeout(() => {
        console.log('🚀 DEBUG - Estado después de setTasks:', {
          tasksLength: tasks.length,
          newTaskExists: tasks.some(t => t.id === newTaskId)
        });
      }, 100);
      
      // ELIMINADO: Creación de Work Package - ya no es necesaria
      
      // Cerrar modal y limpiar datos
      setShowAddTaskModal(false);
      setNewTaskData({
        name: '',
        duration: 5,
        startDate: toISO(new Date()),
        endDate: addDays(toISO(new Date()), 5),
        description: '',
        priority: 'medium',
        assignedTo: '',
        cost: 0,
              selectedPredecessors: [],
        insertAfterTaskId: null // Limpiar la posición de inserción
      });
      
      console.log('🚀 NUEVO SISTEMA - Proceso completado exitosamente');
      
      // Verificar el estado final de las tareas
      setTimeout(() => {
        console.log('🚀 DEBUG - Estado final de todas las tareas:');
        setTasks(currentTasks => {
          console.log('🚀 DEBUG - Total de tareas después de crear:', currentTasks.length);
          console.log('🚀 DEBUG - Últimas 3 tareas:', currentTasks.slice(-3).map(t => ({ name: t.name, wbsCode: t.wbsCode, id: t.id })));
          currentTasks.forEach(task => {
            console.log(`🚀 DEBUG - Tarea ${task.name} (${task.id}):`, {
              predecessors: task.predecessors,
              successors: task.successors,
              predecessorsLength: task.predecessors?.length || 0,
              successorsLength: task.successors?.length || 0
            });
          });
          return currentTasks; // No modificar, solo para logging
        });
      }, 100);
      
    } catch (error) {
      console.error('❌ NUEVO SISTEMA - Error al crear tarea:', error);
      alert('Error al crear la tarea. Por favor intenta de nuevo.');
    }
  };

  // Guardar baseline
  const saveBaseline = () => {
    try {
      // Clonación segura de las tareas para el baseline
      const baselineData = tasksWithCPM.map(task => ({
        id: task.id,
        wbsCode: task.wbsCode,
        name: task.name,
        duration: task.duration,
        startDate: task.startDate,
        endDate: task.endDate,
        progress: task.progress,
        priority: task.priority,
        assignedTo: task.assignedTo,
        cost: task.cost,
        predecessors: [...(task.predecessors || [])],
        successors: [...(task.successors || [])],
        isMilestone: task.isMilestone,
        originalDuration: task.originalDuration,
        description: task.description,
        resources: [...(task.resources || [])],
        earlyStart: task.earlyStart,
        earlyFinish: task.earlyFinish,
        lateStart: task.lateStart,
        lateFinish: task.lateFinish,
        isCritical: task.isCritical,
        slack: task.slack
      }));
      
      setBaselineTasks(baselineData);
    setShowBaseline(true);
    alert('Baseline guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar baseline:', error);
      alert('Error al guardar el baseline. Por favor intenta de nuevo.');
    }
  };

  // Funciones auxiliares de UI
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'delayed': return '⚠️';
      default: return '⏸️';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Función centralizada para obtener la fecha de referencia del timeline
  const getTimelineReferenceDate = useMemo(() => {
    const originalStart = toISO(projectDates.start);
    
    // CORRECCIÓN: Usar siempre la fecha original del proyecto, sin aplicar findFirstWorkingDay
    // Esto asegura que las barras del Gantt se alineen exactamente con las fechas de la tabla
    const referenceDate = originalStart;
    
    // Debug para verificar el desplazamiento de fechas
    console.log('🎯 TIMELINE REFERENCE DATE CALCULADO (CORREGIDO):', {
      originalProjectStart: originalStart,
      includeWeekends: includeWeekends,
      referenceDate: referenceDate,
      isShifted: originalStart !== referenceDate,
      shiftDays: originalStart !== referenceDate ? 
        Math.round((new Date(referenceDate) - new Date(originalStart)) / (1000 * 60 * 60 * 24)) : 0,
      note: 'Usando fecha original sin aplicar findFirstWorkingDay para alineación perfecta con tabla'
    });
    
    return referenceDate;
  }, [projectDates.start, includeWeekends]);

  // Línea "Hoy"
  const todayLeftPx = useMemo(() => {
    // Usar la función centralizada para obtener la fecha de referencia
    const todayISO = toISO(new Date());
    // Para la línea "HOY" usar la misma configuración que las barras
    // NUEVO ALGORITMO: Usar índice de columnas
    const days = findColumnIndex(todayISO, getTimelineReferenceDate, includeWeekends);
    
    
    return Math.min(Math.max(0, days * pxPerDay), chartWidthPx);
  }, [getTimelineReferenceDate, pxPerDay, chartWidthPx, includeWeekends]);

  // Barras Gantt
  const generateGanttBars = () => {
    // Usar la función centralizada para obtener la fecha de referencia
    const pStart = getTimelineReferenceDate;

    // Debug temporal para verificar la referencia de barras
    console.log('🎯 GANTT BARS REFERENCIA:', {
      pStart: pStart,
      projectDatesStart: toISO(projectDates.start),
      includeWeekends: includeWeekends,
      pxPerDay: pxPerDay
    });

    return tasksWithCPM.map((task) => {
      // CORRECCIÓN: Usar siempre las fechas originales de la tabla, NO las calculadas por CPM
      // Las fechas que rigen son las de la vista tabla (startDate y endDate)
      const tableStartDate = task.startDate; // Fecha original de la tabla
      const tableEndDate = task.endDate;     // Fecha original de la tabla
      
      // CORRECCIÓN: Usar siempre días calendario para fechas de tareas, independientemente de includeWeekends
      // Las fechas de las tareas en la tabla son días calendario, no días laborales
      const leftDays = findColumnIndex(tableStartDate, pStart, true); // Siempre true para días calendario
      const durDays = findColumnIndex(tableEndDate, tableStartDate, true) + 1; // +1 para incluir el día final

      // Debug temporal para verificar que el nuevo algoritmo funciona
      if (task.name.includes('Aprobación') || task.name.includes('Generación') || task.name.includes('Envío') || task.name.includes('Solución')) {
        console.log('🆕 GANTT USANDO FECHAS DE TABLA (CORREGIDO):');
        console.log('   taskName:', task.name);
        console.log('   📋 FECHAS DE TABLA (las que rigen):');
        console.log('   - tableStartDate:', tableStartDate);
        console.log('   - tableEndDate:', tableEndDate);
        console.log('   🧮 FECHAS CALCULADAS POR CPM (solo informativas):');
        console.log('   - earlyStart:', task.earlyStart);
        console.log('   - earlyFinish:', task.earlyFinish);
        console.log('   📊 CÁLCULOS GANTT (usando días calendario):');
        console.log('   - projectStart:', pStart);
        console.log('   - leftDays (días calendario):', leftDays);
        console.log('   - durDays (días calendario):', durDays);
        console.log('   - leftPx calculado:', leftDays * pxPerDay);
        console.log('   - includeWeekends config:', includeWeekends, '(pero usando días calendario para fechas de tareas)');
        
        // Debug específico para la primera tarea
        if (task.name.includes('Aprobación')) {
          console.log('🔍 DEBUG ESPECÍFICO TAREA 1:');
          console.log('   - Fecha inicio tabla:', tableStartDate);
          console.log('   - Fecha referencia proyecto:', pStart);
          console.log('   - Diferencia en días:', Math.round((new Date(tableStartDate) - new Date(pStart)) / (1000 * 60 * 60 * 24)));
          console.log('   - leftDays calculado:', leftDays);
          console.log('   - leftPx calculado:', leftDays * pxPerDay);
          console.log('   - ¿Debería ser 0?', tableStartDate === pStart ? 'SÍ' : 'NO');
        }

        // Debug para comparar con lo que muestra la tabla
        const tableDisplayStart = new Date(tableStartDate).toLocaleDateString('es-ES');
        const tableDisplayEnd = new Date(tableEndDate).toLocaleDateString('es-ES');
        console.log('   📋 FORMATO TABLA:');
        console.log('   - Inicio formateado:', tableDisplayStart);
        console.log('   - Fin formateado:', tableDisplayEnd);
        
        // Debug para verificar si hay diferencia entre fechas de tabla y CPM
        if (tableStartDate !== task.earlyStart || tableEndDate !== task.earlyFinish) {
          console.log('   ⚠️ DIFERENCIA ENTRE TABLA Y CPM:');
          console.log('   - Tabla inicio:', tableStartDate, 'vs CPM inicio:', task.earlyStart);
          console.log('   - Tabla fin:', tableEndDate, 'vs CPM fin:', task.earlyFinish);
          console.log('   ✅ GANTT USARÁ FECHAS DE TABLA (correcto)');
        }
      }


      return {
        id: task.id,
        wbsCode: task.wbsCode,
        name: task.name,
        duration: task.duration,
        startDate: tableStartDate,  // CORRECCIÓN: Usar fecha de tabla
        endDate: tableEndDate,      // CORRECCIÓN: Usar fecha de tabla
        progress: task.progress,
        predecessors: [...(task.predecessors || [])],
        cost: task.cost,
        priority: task.priority,
        assignedTo: task.assignedTo,
        isMilestone: task.isMilestone,
        isCritical: task.isCritical,
        originalDuration: task.originalDuration,
        earlyStart: task.earlyStart,
        earlyFinish: task.earlyFinish,
        lateStart: task.lateStart,
        lateFinish: task.lateFinish,
        totalFloat: task.totalFloat,
        freeFloat: task.freeFloat,
        description: task.description,
        resources: [...(task.resources || [])],
        workPackageId: task.workPackageId,
        status: task.status,
        successors: [...(task.successors || [])],
        leftPx: leftDays * pxPerDay,
        widthPx: task.isMilestone ? 12 : Math.max(1, durDays * pxPerDay), // Hitos = 12px de ancho
      };
    });
  };


  // Generar conexiones del diagrama de red basadas en dependencias
  const generateNetworkEdges = useMemo(() => {
    if (tasksWithCPM.length === 0) return [];
    
    const edges = [];
    
    tasksWithCPM.forEach(task => {
      // Crear conexiones desde predecesoras hacia esta tarea
      task.predecessors.forEach(predId => {
        const predTask = tasksWithCPM.find(t => t.id === predId);
        if (predTask) {
          edges.push({
            id: `${predId}-${task.id}`,
            source: predId,
            target: task.id,
            type: 'predecessor',
            isCritical: task.isCritical && predTask.isCritical
          });
        }
      });
    });
    
    return edges;
  }, [tasksWithCPM]);

  const networkEdges = generateNetworkEdges;

  const generateTimelineMarkers = () => {
    const markers = [];
    
    // Usar fechas del proyecto si están disponibles, sino usar fechas por defecto
    try {
      const start = new Date(projectDates?.start || new Date());
      const end = new Date(projectDates?.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= Math.min(10, totalDays); i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + Math.floor((totalDays * i) / 10));
        
        markers.push({
          x: 50 + (i / 10) * 1100,
          label: date.toLocaleDateString('es', { month: 'short', day: 'numeric' })
        });
      }
    } catch (error) {
      // Si hay error, crear marcadores por defecto
      for (let i = 0; i <= 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        markers.push({
          x: 50 + (i / 10) * 1100,
          label: date.toLocaleDateString('es', { month: 'short', day: 'numeric' })
        });
      }
    }
    
    return markers;
  };


  const autoFitNetworkDiagram = () => {
    if (!networkSvgRef.current || networkNodes.length === 0) return;
    
    // Calcular el bounding box de todos los nodos
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    networkNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth === 0 || contentHeight === 0) return;
    
    // Calcular zoom para que el contenido quepa en el viewport
    const viewportWidth = 1200;
    const viewportHeight = 600;
    
    const scaleX = viewportWidth / contentWidth;
    const scaleY = viewportHeight / contentHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 2); // Máximo 2x zoom
    
    const newZoom = Math.max(0.3, optimalZoom);
    setNetworkZoom(newZoom);
    
    // Centrar el contenido
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newPanX = centerX - viewportWidth / (2 * newZoom);
    const newPanY = centerY - viewportHeight / (2 * newZoom);
    
    setNetworkPan({ x: newPanX, y: newPanY });
  };

  // Funciones de zoom y pan para el diagrama de red
  const zoomIn = () => {
    setNetworkZoom(prev => Math.min(prev * 1.2, 3));
  };

  const zoomOut = () => {
    setNetworkZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const resetZoom = () => {
    setNetworkZoom(1);
    setNetworkPan({ x: 0, y: 0 });
  };

  // Funciones para arrastrar el diagrama (pan)
  const handleDiagramMouseDown = (e) => {
    // Solo si no se está arrastrando un nodo
    if (draggedNode) return;
    
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setLastPan({ x: networkPan.x, y: networkPan.y });
  };

  const handleDiagramMouseMove = (e) => {
    if (!isPanning) return;
    
    e.preventDefault();
    const deltaX = e.clientX - panStart.x;
    const deltaY = e.clientY - panStart.y;
    
    // Invertir el movimiento para que sea intuitivo
    setNetworkPan({
      x: lastPan.x - deltaX,
      y: lastPan.y - deltaY
    });
  };

  const handleDiagramMouseUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleDiagramMouseLeave = (e) => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Funciones de arrastrar y soltar para nodos
  const handleNodeMouseDown = (e, nodeId) => {
    e.preventDefault();
    const node = networkNodes.find(n => n.id === nodeId);
    if (node) {
      setDraggedNode(nodeId);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleNodeMouseMove = (e) => {
    if (draggedNode && networkSvgRef.current) {
      const svg = networkSvgRef.current;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / networkZoom - dragOffset.x;
      const y = (e.clientY - rect.top) / networkZoom - dragOffset.y;
      
      // Actualizar posición del nodo
      const updatedNodes = networkNodes.map(n => 
        n.id === draggedNode ? {
          id: n.id,
          taskId: n.taskId,
          x: x,
          y: y,
          width: n.width,
          height: n.height,
          name: n.name,
          duration: n.duration,
          startDate: n.startDate,
          endDate: n.endDate,
          isCritical: n.isCritical,
          isMilestone: n.isMilestone,
          progress: n.progress,
          predecessors: [...(n.predecessors || [])],
          successors: [...(n.successors || [])]
        } : n
      );
      // Aquí podrías actualizar el estado de los nodos si quisieras persistir los cambios
    }
  };

  const handleNodeMouseUp = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Función para exportar el diagrama de red como imagen
  const exportNetworkAsImage = () => {
    if (networkSvgRef.current) {
      const svg = networkSvgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      canvas.width = 1200;
      canvas.height = 600;
      
      img.onload = () => {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `diagrama-red-${projectData.projectName}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  // Métricas del diagrama de red
  const networkMetrics = useMemo(() => {
    const totalNodes = tasksWithCPM.length;
    const totalEdges = tasksWithCPM.reduce((sum, t) => sum + t.predecessors.length, 0);
    const criticalPathLength = tasksWithCPM.filter(t => t.isCritical).length;
    
    // Log de debug para métricas
    console.log('📊 MÉTRICAS DEL DIAGRAMA:', {
      totalNodes,
      totalEdges,
      criticalPathLength,
      tareasConDeps: tasksWithCPM.filter(t => t.predecessors.length > 0).length,
      detalleDeps: tasksWithCPM.map(t => ({
        id: t.id,
        name: t.name,
        predecessors: t.predecessors,
        count: t.predecessors.length
      }))
    });
    
    // Calcular nivel máximo
    const levels = new Map();
    const visited = new Set();
    
    const calculateLevel = (taskId, currentLevel = 0, visiting = new Set()) => {
      if (visited.has(taskId)) return levels.get(taskId) || 0;
      
      // Detectar dependencia circular
      if (visiting.has(taskId)) {
        console.warn('Dependencia circular detectada en tarea (análisis):', taskId);
        levels.set(taskId, currentLevel);
        visited.add(taskId);
        return currentLevel;
      }
      
      visiting.add(taskId);
      visited.add(taskId);
      
      const task = tasksWithCPM.find(t => t.id === taskId);
      if (!task) {
        visiting.delete(taskId);
        return currentLevel;
      }
      
      let maxPredLevel = currentLevel;
      for (const predId of task.predecessors) {
        const predLevel = calculateLevel(predId, currentLevel + 1, visiting);
        maxPredLevel = Math.max(maxPredLevel, predLevel);
      }
      
      levels.set(taskId, maxPredLevel);
      visiting.delete(taskId);
      return maxPredLevel;
    };
    
    for (const task of tasksWithCPM) {
      calculateLevel(task.id);
    }
    
    const maxDepth = Math.max(...levels.values(), 0);
    
    return {
      totalNodes,
      totalEdges,
      criticalPathLength,
      maxDepth
    };
  }, [tasksWithCPM]);

  // Encabezados de timeline
  const generateTimelineHeaders = () => {
    const headers = [];
    // Usar la función centralizada para obtener la fecha de referencia
    const startReference = getTimelineReferenceDate;
    const start = new Date(startReference);
    const end = new Date(toISO(projectDates.end));

    // Debug temporal para verificar el rango de headers
    console.log('🏁 TIMELINE HEADERS RANGO:', {
      startDate: toISO(start),
      endDate: toISO(end),
      ganttScale: ganttScale,
      projectDatesStart: toISO(projectDates.start),
      projectDatesEnd: toISO(projectDates.end),
      includeWeekends: includeWeekends,
      startReference: toISO(startReference),
      pxPerDay: pxPerDay,
      chartWidthPx: chartWidthPx
    });

    if (ganttScale === 'days') {
      const cur = new Date(start);
      while (cur <= end) {
        // Solo mostrar días que deben ser incluidos según la configuración
        if (includeWeekends || isWorkingDay(cur)) {
          headers.push({
            label: cur.getDate(),
            sub: cur.toLocaleDateString('es', { month: 'short' }),
            width: pxPerDay
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else if (ganttScale === 'weeks') {
      const cur = new Date(start);
      while (cur <= end) {
        const labelStart = new Date(cur);
        const labelEnd = new Date(cur);
        labelEnd.setDate(labelEnd.getDate() + 6);
        const remaining = Math.min(7, diffDaysExclusive(labelStart, addDays(end, 1, includeWeekends), includeWeekends));
        headers.push({ 
          label: `S ${labelStart.getDate()}—${labelEnd.getDate()}`, 
          sub: labelStart.toLocaleDateString('es', { month: 'short' }), 
          width: remaining * pxPerDay 
        });
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        const spanDays = diffDaysExclusive(toISO(cur), toISO(next), includeWeekends);
        headers.push({ 
          label: cur.toLocaleDateString('es', { month: 'short' }), 
          sub: cur.getFullYear(), 
          width: spanDays * pxPerDay 
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    
    // Debug: verificar cuántos headers se generaron
    console.log('🏁 TIMELINE HEADERS GENERADOS:', {
      totalHeaders: headers.length,
      totalWidth: headers.reduce((sum, h) => sum + h.width, 0),
      firstHeader: headers[0],
      lastHeader: headers[headers.length - 1]
    });
    
    return headers;
  };

  // Componente simplificado - sin caso de negocio redundante

  return (
    <div className="space-y-6">
        {/* BARRA UNIFICADA - DISEÑO CON COLOR AZUL CLARO */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 mb-8 border border-blue-200 relative overflow-hidden">
          {/* Elementos decorativos de fondo */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100/30 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            {/* Header Principal */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-2xl p-3 mr-4">
                  <span className="text-2xl">📅</span>
                </div>
            <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Cronograma del Proyecto</h1>
                  <p className="text-gray-600 text-lg">Gestión de tiempo, dependencias y recursos integrada con EVM</p>
                </div>
                </div>
              
              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportToExcel}
                  className="bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-blue-50 flex items-center space-x-2 transition-all duration-300 border border-gray-300 hover:border-blue-300 text-sm shadow-sm"
                >
                  <span>📥</span>
                  <span>Exportar</span>
                </button>
                
                <button
                  onClick={() => compressSchedule()}
                  className="bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-blue-50 flex items-center space-x-2 transition-all duration-300 border border-gray-300 hover:border-blue-300 text-sm shadow-sm"
                  title="Comprimir cronograma (en desarrollo)"
                >
                  <span>🚀</span>
                  <span>Comprimir</span>
                </button>
                

                </div>
                </div>

            {/* Métricas del Proyecto */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              {/* ELIMINADO: Work Packages - ya no se usan */}
            
              <div className="bg-white rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">📅</span>
                  <span className="text-sm font-medium text-blue-600">Inicio</span>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {tasksWithCPM.length > 0 
                    ? (() => {
                        // CORRECCIÓN: Usar fechas originales de la tabla, no las calculadas por CPM
                        const originalStartDates = tasksWithCPM.map(t => new Date(t.startDate));
                        const minStartDate = new Date(Math.min(...originalStartDates));
                        return minStartDate.toLocaleDateString('es');
                      })()
                    : projectData?.startDate ? new Date(projectData.startDate).toLocaleDateString('es') : 'N/A'
                  }
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">📅</span>
                  <span className="text-sm font-medium text-blue-600">Fin</span>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {(() => {
                    if (tasksWithCPM.length > 0) {
                      // CORRECCIÓN: Usar fechas originales de la tabla, no las calculadas por CPM
                      const originalEndDates = tasksWithCPM
                        .filter(t => t.endDate && t.endDate !== null && t.endDate !== undefined)
                        .map(t => {
                          const [year, month, day] = t.endDate.split('-');
                          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        })
                        .filter(date => !isNaN(date.getTime())); // Filtrar fechas inválidas
                      
                      const maxEndDate = new Date(Math.max(...originalEndDates));
                      
                      // Formatear fecha de manera más precisa para evitar problemas de zona horaria
                      const year = maxEndDate.getFullYear();
                      const month = String(maxEndDate.getMonth() + 1).padStart(2, '0');
                      const day = String(maxEndDate.getDate()).padStart(2, '0');
                      const formattedDate = `${day}/${month}/${year}`;
                      
                      console.log('🔍 DEBUG - Fecha de fin del cronograma (usando fechas de tabla):', {
                        totalTasks: tasksWithCPM.length,
                        originalEndDates: originalEndDates.map(d => d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'N/A'),
                        maxEndDate: maxEndDate && !isNaN(maxEndDate.getTime()) ? maxEndDate.toISOString().split('T')[0] : 'N/A',
                        year, month, day,
                        formattedDate: formattedDate
                      });
                      
                      return formattedDate;
                    }
                    return projectData?.endDate ? new Date(projectData.endDate).toLocaleDateString('es') : 'N/A';
                  })()}
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">💰</span>
                  <span className="text-sm font-medium text-blue-600">Presupuesto</span>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  ${tasksWithCPM.reduce((sum, task) => sum + (task.cost || 0), 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-red-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-medium text-red-600">Ruta Crítica</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{cmpResult?.criticalPathLength || 0}</div>
                <div className="text-sm text-red-600">días</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-red-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-medium text-red-600">Tareas Críticas</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">{cmpResult?.criticalPath?.length || 0}</div>
                <div className="text-sm text-red-600">tareas</div>
              </div>
            </div>

            {/* Controles de Vista Integrados */}
            <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-blue-200 mb-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-center lg:text-left">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center justify-center lg:justify-start">
                    <span className="mr-2 text-xl">📊</span>
                    Selecciona la Vista
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Elige la visualización que mejor se adapte a tu análisis
                  </p>
                </div>
                
                {/* Botones de vista organizados profesionalmente */}
                <div className="flex flex-wrap justify-center lg:justify-end gap-2">
              <button
                    onClick={() => setViewMode('gantt')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center space-x-2 ${
                      viewMode === 'gantt' 
                        ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg' 
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <span>📊</span>
                    <span>Gantt</span>
              </button>

              <button
                    onClick={() => setViewMode('excel')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center space-x-2 ${
                      viewMode === 'excel' 
                        ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg' 
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <span>📋</span>
                    <span>Tabla</span>
              </button>
              

              <button
                    onClick={() => setViewMode('minutas')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center space-x-2 ${
                      viewMode === 'minutas'
                        ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <span>📋</span>
                    <span>Tareas de minutas</span>
              </button>
                </div>
            </div>
          </div>
          
            {/* Alertas básicas */}
            <div className="space-y-3">
          {cmpError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center">
                    <span className="mr-2 text-red-500">⚠️</span>
                    <span className="text-sm text-red-700">Error CPM: {cmpError}</span>
              </div>
            </div>
          )}
          
          {resourceAnalysis.conflicts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <div className="flex items-center">
                    <span className="mr-2 text-yellow-500">⚠️</span>
                    <span className="text-sm text-yellow-700">
                  {resourceAnalysis.conflicts.length} conflicto(s) de recursos detectado(s)
                </span>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>






        {/* Vista Tabla */}
        {viewMode === 'excel' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📋 Vista Tabla - Cronograma</h2>
            
            {/* Controles de configuración */}
            <div className="flex items-center space-x-4">
              {/* Casilla de selección para fines de semana */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  id="includeWeekends"
                  checked={includeWeekends}
                  onChange={(e) => {
                    e.stopPropagation();
                    console.log('🔄 CHECKBOX CLICK:', e.target.checked);
                    setIncludeWeekends(e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="includeWeekends" className="text-sm font-medium text-gray-700">
                  Sábados y domingos son laborables
                </label>
              </div>
              
              {/* Indicador de configuración actual */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-blue-600">📅 Configuración actual:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    includeWeekends 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {includeWeekends ? 'Lunes a Domingo' : 'Lunes a Viernes'}
                  </span>
                </div>
              </div>
              
              {/* Indicador de validación de predecesoras */}
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-green-600">🔗 Validación:</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Predecesoras validadas
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                  onClick={generateExampleExcel}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                  title="Descargar archivo Excel de ejemplo con hitos"
              >
                  <span>📋</span>
                  <span>Descargar Ejemplo</span>
              </button>
              <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  title="Importar cronograma desde Excel (reemplaza datos existentes)"
              >
                  <span>📊</span>
                  <span>Importar Cronograma</span>
              </button>
              <button
                  onClick={() => setShowAIWizard(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 flex items-center space-x-2 transition-all transform hover:scale-105"
                  title="Generar cronograma automáticamente con Asistente de IA"
              >
                  <span>🤖</span>
                  <span>Asistente de IA</span>
              </button>
              
              {/* Input de archivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importScheduleFromExcel(file);
                  }
                }}
                style={{ display: 'none' }}
              />
              <button
                  onClick={exportScheduleToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                  <span>📊</span>
                  <span>Descargar Excel</span>
              </button>
            </div>
          </div>
          
            {/* Tabla tipo Excel */}
            <div className="overflow-x-auto overflow-y-auto max-h-[85vh] border border-gray-200 rounded-lg">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-8">#</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-12">Acción</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-48">Tarea</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-12">🏹</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-16">Duración</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-24">Inicio</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-24">Fin</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-16">Progreso</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-16">Prioridad</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-24">Asignado</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-16">Costo</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium text-gray-700 w-20">Predecesoras</th>
                  </tr>
                </thead>
                <tbody onKeyDown={handleKeyDown}>
                  {(() => {
                    // DEBUG: Mostrar valores de wbsCode antes del ordenamiento
                    console.log('🔍 DEBUG - Valores de wbsCode antes del ordenamiento:', 
                      tasksWithCPM.map(t => ({ 
                        name: t.name, 
                        wbsCode: t.wbsCode, 
                        wbsCodeType: typeof t.wbsCode 
                      }))
                    );
                    
                    // Aplicar ordenamiento por wbsCode para todos los proyectos
                    const sortedTasks = sortTasksByWbsCode(tasksWithCPM);
                    
                    // DEBUG: Mostrar valores después del ordenamiento
                    console.log('🔍 DEBUG - Valores de wbsCode después del ordenamiento:', 
                      sortedTasks.map(t => ({ 
                        name: t.name, 
                        wbsCode: t.wbsCode, 
                        wbsCodeType: typeof t.wbsCode 
                      }))
                    );
                    
                    return sortedTasks;
                  })()
                    .concat([{ id: 'add-new-task', isAddButton: true }]) // Agregar botón de nueva tarea al final
                    .map((task, index) => {
                      // Si es el botón de agregar nueva tarea
                      if (task.isAddButton) {
                        return (
                          <tr key="add-new-task" className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1 text-sm text-gray-400 text-center">
                              +
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addTaskAtEnd();
                                  }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-md shadow-sm transition-colors duration-200 flex items-center space-x-2"
                                  title="Agregar nueva tarea al final"
                                >
                                  <span>➕</span>
                                  <span>Nueva Tarea</span>
                                </button>
                              </div>
                            </td>
                            <td colSpan="10" className="border border-gray-300 px-2 py-1 text-sm text-gray-400 text-center">
                              Agregar nueva tarea al final del cronograma
                            </td>
                          </tr>
                        );
                      }
                      
                      // Tarea normal
                      return (
                        <tr 
                          key={task.id} 
                          className={`hover:bg-gray-50 ${selectedRow === task.id ? 'bg-blue-50' : ''}`}
                          onClick={() => setSelectedRow(task.id)}
                        >
                      {/* Número de fila */}
                      <td className="border border-gray-300 px-2 py-1 text-sm text-gray-600 text-center">
                        {index + 1}
                      </td>
                      
                      {/* Acciones */}
                      <td className="border border-gray-300 px-2 py-1">
                        <div className="flex space-x-1 justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              insertTaskAtPosition(task.id, index);
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm px-2 py-1 rounded-md shadow-sm transition-colors duration-200 flex items-center justify-center min-w-[32px]"
                            title="Insertar fila después (como MS Project)"
                          >
                            ➕
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded-md shadow-sm transition-colors duration-200 flex items-center justify-center min-w-[32px]"
                            title="Eliminar tarea (como MS Project)"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                      
                      {/* Nombre de la tarea */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'name' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'name', task.name)}
                            title="Click para editar nombre (como MS Project)"
                          >
                            {task.name}
                        </div>
                        )}
                      </td>

                      {/* Hito */}
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        <button
                          onClick={() => toggleMilestone(task.id)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                            task.isMilestone 
                              ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg' 
                              : 'bg-white border-gray-300 text-gray-400 hover:border-indigo-300 hover:text-indigo-400'
                          }`}
                          title={task.isMilestone ? 'Quitar hito' : 'Marcar como hito'}
                        >
                          🏹
                        </button>
                      </td>
                      
                      {/* Duración */}
                      <td className="border border-gray-300 px-2 py-1">
                        {task.isMilestone ? (
                          <div className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-center font-medium">
                            0d
            </div>
                        ) : editingCell?.taskId === task.id && editingCell?.field === 'duration' ? (
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'duration', task.duration)}
                            title="Click para editar duración (como MS Project)"
                          >
                            {task.duration}d
                          </div>
                        )}
                      </td>
                      
                      {/* Fecha de inicio */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'startDate' ? (
                          <input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center text-sm"
                            onClick={() => startEditing(task.id, 'startDate', task.startDate)}
                            title="Click para editar fecha de inicio (como MS Project)"
                          >
                            {task.startDate && task.startDate !== null && task.startDate !== undefined ? task.startDate.split('-').reverse().join('/') : ''}
                          </div>
                        )}
                      </td>
                      
                      {/* Fecha de fin */}
                      <td className="border border-gray-300 px-2 py-1">
                        {task.isMilestone ? (
                          <div className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-center font-medium text-sm">
                            {(() => {
                              if (!task.startDate || task.startDate === null || task.startDate === undefined) return '';
                              const [year, month, day] = task.startDate.split('-');
                              return new Date(year, month - 1, day).toLocaleDateString('es');
                            })()}
                    </div>
                        ) : editingCell?.taskId === task.id && editingCell?.field === 'endDate' ? (
                          <input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center text-sm"
                            onClick={() => startEditing(task.id, 'endDate', task.endDate)}
                            title="Click para editar fecha de fin (como MS Project)"
                          >
                            {task.isMilestone 
                              ? (task.startDate && task.startDate !== null && task.startDate !== undefined ? task.startDate.split('-').reverse().join('/') : '')
                              : (task.endDate && task.endDate !== null && task.endDate !== undefined ? task.endDate.split('-').reverse().join('/') : '')
                            }
                          </div>
                        )}
                      </td>
                      
                      {/* Progreso */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'progress' ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'progress', task.progress)}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                    </div>
                              <span className="text-xs">{task.progress}%</span>
                  </div>
                    </div>
                  )}
                      </td>
                      
                      {/* Prioridad */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'priority' ? (
                          <select
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                          </select>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'priority', task.priority)}
                          >
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority === 'critical' ? 'Crítica' :
                               task.priority === 'high' ? 'Alta' :
                               task.priority === 'medium' ? 'Media' : 'Baja'}
                            </span>
                </div>
              )}
                      </td>
                      
                      {/* Asignado */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'assignedTo' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'assignedTo', task.assignedTo)}
                          >
                            {task.assignedTo || 'Sin asignar'}
            </div>
          )}
                      </td>
                      
                      {/* Costo */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'cost' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditing(task.id, 'cost', task.cost)}
                          >
                            ${task.cost.toLocaleString()}
        </div>
                        )}
                      </td>
                      
                      {/* Predecesoras */}
                      <td className="border border-gray-300 px-2 py-1">
                        {editingCell?.taskId === task.id && editingCell?.field === 'dependencies' ? (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 mb-1">Escribe los números de fila separados por comas (ej: 1, 2, 3)</div>
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={handleKeyDown}
                              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="1, 2, 3"
                              autoFocus
                            />
                            <div className="flex space-x-1">
                              <button
                                onClick={saveEdit}
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                              >
                                Cancelar
                              </button>
              </div>
            </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px] flex items-center"
                            onClick={() => startEditingDependencies(task.id)}
                            title="Click para editar predecesoras"
                          >
                            <div className="flex items-center space-x-2 text-xs">
                              {task.predecessors.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {task.predecessors.map(predId => {
                                    // Buscar la tarea predecesora por ID
                                    const predTask = tasks.find(t => t.id === predId);
                                    
                                    // Mostrar el número de wbsCode de la predecesora
                                    const predNumber = predTask ? parseInt(predTask.wbsCode) : predId;
                                    
                                    return (
                                      <span
                                        key={predId}
                                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium"
                                      >
                                        {predNumber}
                                      </span>
                                    );
                                  })}
          </div>
                              ) : (
                                <span className="text-gray-400">Sin predecesoras</span>
                              )}
              </div>
            </div>
                        )}
                      </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
          </div>

            {/* Resumen de la tabla */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                  <span className="font-medium text-gray-700">Total Tareas:</span>
                  <span className="ml-2 text-gray-600">{tasksWithCPM.length}</span>
              </div>
                <div>
                  <span className="font-medium text-gray-700">Duración Total:</span>
                  <span className="ml-2 text-gray-600">{tasksWithCPM.reduce((sum, task) => sum + task.duration, 0)} días</span>
            </div>
              <div>
                  <span className="font-medium text-gray-700">Progreso Promedio:</span>
                  <span className="ml-2 text-gray-600">
                    {Math.round(tasksWithCPM.reduce((sum, task) => sum + task.progress, 0) / tasksWithCPM.length)}%
                  </span>
              </div>
              <div>
                  <span className="font-medium text-gray-700">Costo Total:</span>
                  <span className="ml-2 text-gray-600">
                    ${tasksWithCPM.reduce((sum, task) => sum + task.cost, 0).toLocaleString()}
                  </span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Vista de Gantt */}
        {viewMode === 'gantt' && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Diagrama Gantt</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <span>👁️</span>
                      <span>Solo lectura - Edita desde la Vista Tabla</span>
            </div>
          </div>
        </div>
                
                {/* Controles del Gantt */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex space-x-2">
                    <select value={ganttScale} onChange={(e) => setGanttScale(e.target.value)} className="px-3 py-2 border rounded-lg">
                      <option value="days">Días</option>
                      <option value="weeks">Semanas</option>
                      <option value="months">Meses</option>
                    </select>

                    <button 
                      onClick={() => setShowBaseline(!showBaseline)} 
                      className={`px-3 py-2 rounded-lg transition-colors duration-200 ${
                        showBaseline 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`} 
                      disabled={baselineTasks.length === 0}
                    >
                      Baseline
                    </button>

                    <button
                      onClick={saveBaseline}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
                    >
                      <span>💾</span>
                      <span>Guardar Baseline</span>
                    </button>
                  </div>
                  
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={cleanCircularDependencies} 
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                      title="Limpiar dependencias circulares que causan duplicación de tareas"
                    >
                      <span>🧹</span>
                      <span>Limpiar Dependencias Circulares</span>
                    </button>
                  </div>
                </div>

            {/* Diagrama Gantt SVG */}
            <div className="bg-white border rounded-lg overflow-hidden max-w-full">
              {/* Indicador de scroll horizontal */}
              <div className="bg-blue-50 border-b border-blue-200 p-2">
                <div className="flex items-center justify-center text-sm text-blue-700">
                  <span className="mr-2">↔️</span>
                  <span>Usa el scroll horizontal para navegar por el cronograma completo</span>
                </div>
              </div>
              <div className="flex">
                {/* Panel izquierdo - Lista de tareas optimizada */}
                <div 
                  ref={leftRef}
                  onScroll={onLeftScroll}
                  className="w-80 bg-gray-50 border-r overflow-y-auto"
                  style={{ height: '600px' }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700">TAREAS DEL PROYECTO</div>
                      <div className="text-xs text-gray-500">{tasksWithCPM.length} tareas</div>
                    </div>
                    
                    {generateGanttBars().map((task, index) => (
                      <div key={task.id} className="mb-2">
                        {/* Tarea principal - SOLO LECTURA */}
                      <div
                          className={`group flex items-center p-3 rounded-lg transition-all duration-200 border ${
                          selectedTask?.id === task.id 
                            ? 'bg-indigo-100 border-indigo-300 shadow-md' 
                            : 'hover:bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => {
                            console.log('🔤 SELECCIÓN TAREA - Tarea seleccionada para ver:', {
                            taskId: task.id,
                            nombre: task.name,
                            tareaCompleta: task
                          });
                          setSelectedTask(task);
                        }}
                        style={{ height: ROW_H }}
                      >
                        <div className="flex-1 min-w-0">
                          {/* Nombre de la tarea */}
                          <div className="font-medium text-sm text-gray-900 truncate mb-1">
                            {task.name}
                            {task.isMilestone && <span className="ml-2 text-indigo-600 text-lg">🏹</span>}
                          </div>
                          
                            {/* Solo indicador de crítica */}
                            {task.isCritical && (
                              <div className="text-xs text-red-600 font-medium">
                                🔥 Tarea Crítica
                              </div>
                            )}
                        </div>
                        
                          {/* Solo indicador de crítica en el lado derecho */}
                          {task.isCritical && (
                            <div className="ml-3">
                              <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              🔥 Crítica
                            </span>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                    
                    {/* Resumen del proyecto */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="text-xs font-medium text-gray-700 mb-2">RESUMEN</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Progreso Total:</span>
                          <span className="font-medium">{projectMetrics.progressPercentage}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tareas Críticas:</span>
                          <span className="font-medium text-red-600">{projectMetrics.criticalTasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completadas:</span>
                          <span className="font-medium text-green-600">{projectMetrics.completedTasks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel derecho - Diagrama Gantt */}
                <div className="flex-1 flex flex-col max-w-full" style={{ height: '600px', maxWidth: 'calc(100vw - 400px)' }}>
                  {/* Headers de timeline - FIJOS (fuera del scroll) */}
                  <div 
                    className="bg-gray-100 border-b p-2 flex-shrink-0"
                    style={{ 
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <div 
                      ref={headerRef}
                      onScroll={onHeaderScroll}
                      className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                      style={{ 
                        width: '100%',
                        maxWidth: '100%'
                      }}
                    >
                      <div 
                        className="flex"
                        style={{ 
                          width: Math.max(chartWidthPx + 100, 800),
                          minWidth: Math.max(chartWidthPx + 100, 800)
                        }}
                      >
                        {generateTimelineHeaders().map((header, index) => (
                          <div
                            key={index}
                            className="text-xs text-gray-600 text-center border-r border-gray-200 flex-shrink-0"
                            style={{ width: header.width, minWidth: header.width }}
                          >
                            <div className="font-medium">{header.label}</div>
                            <div className="text-gray-400">{header.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contenido scrolleable del Gantt */}
                  <div 
                    ref={rightRef}
                    onScroll={onRightScroll}
                    className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
                  >
                    <div style={{ width: Math.max(chartWidthPx + 100, 800) }}>

                    {/* Barras del Gantt */}
                    <div className="relative">
                      {/* Línea "Hoy" - Movida dentro del contenedor relative */}
                      {todayLeftPx > 0 && todayLeftPx < chartWidthPx && (
                        <div
                          className="absolute z-10 w-0.5 bg-red-500"
                          style={{
                            left: todayLeftPx,
                            top: 0,
                            height: '600px'
                          }}
                        >
                          <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded -mt-2 -ml-6">
                            HOY
                          </div>
                        </div>
                      )}
                      {generateGanttBars().map((task, index) => (
                        <div
                          key={task.id}
                          className="absolute"
                          style={{
                            left: task.leftPx, // CORRECCIÓN: Eliminar offset fijo de 320px
                            top: index * (ROW_H + 8) + PADDING_TOP + 5, // +8 por el mb-2 (0.5rem = 8px)
                            width: task.widthPx,
                            height: ROW_H - 10
                          }}
                        >
                          {/* Barra principal */}
                          <div
                            className={`h-8 transition-all duration-200 cursor-default hover:opacity-80 ${
                              task.isMilestone ? 'rounded-full' : 'rounded-lg'
                            }`}
                            title="Solo lectura - Edita desde la Vista Tabla"
                            style={{
                              width: task.isMilestone ? '12px' : '100%',
                              height: '100%',
                              background: task.isMilestone
                                ? 'linear-gradient(45deg, #8b5cf6, #7c3aed)' // Púrpura para hitos
                                : task.isCritical && showCriticalPath
                                ? 'linear-gradient(45deg, #ef4444, #dc2626)'
                                : task.isCritical
                                ? 'linear-gradient(45deg, #f97316, #ea580c)'
                                : 'linear-gradient(45deg, #6366f1, #4f46e5)',
                              border: task.isCritical && showCriticalPath ? '2px solid #dc2626' : 'none',
                              boxShadow: task.isCritical && showCriticalPath ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none'
                            }}
                          >
                            {/* Barra de progreso */}
                            <div
                              className="h-full bg-green-400 rounded-l transition-all duration-200"
                              style={{
                                width: `${task.progress}%`,
                                background: 'linear-gradient(45deg, #4ade80, #22c55e)'
                              }}
                            />
                            
                            {/* Texto de la tarea */}
                            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium px-2">
                              <span className="truncate">{task.name}</span>
                            </div>
                          </div>

                          {/* Baseline si está habilitado */}
                          {showBaseline && baselineById.has(task.id) && (
                            <div
                              className="absolute top-0 h-full border-2 border-dashed border-gray-700 opacity-90"
                              style={{
                                left: `${(diffDaysExclusive(toISO(projectDates.start), baselineById.get(task.id).startDate, includeWeekends) * pxPerDay)}px`,
                                width: `${Math.max(1, durationDaysInclusive(baselineById.get(task.id).startDate, baselineById.get(task.id).endDate, includeWeekends) * pxPerDay)}px`,
                                boxShadow: '0 0 4px rgba(55, 65, 81, 0.4)'
                              }}
                            />
                          )}

                          {/* Dependencias si están habilitadas */}
                          {showDependencies && task.predecessors.length > 0 && (
                            <div className="absolute -top-2 left-0 w-full">
                              {task.predecessors.map((predId, predIndex) => {
                                const pred = tasksWithCPM.find(t => t.id === predId);
                                if (!pred) return null;
                                
                                const predBar = generateGanttBars().find(t => t.id === predId);
                                if (!predBar) return null;
                                
                                const startX = predBar.leftPx + predBar.widthPx; // CORRECCIÓN: Eliminar offset fijo
                                const startY = tasksWithCPM.findIndex(t => t.id === predId) * (ROW_H + 8) + PADDING_TOP + 5 + (ROW_H - 10) / 2;
                                const endX = task.leftPx; // CORRECCIÓN: Eliminar offset fijo
                                const endY = index * (ROW_H + 8) + PADDING_TOP + 5 + (ROW_H - 10) / 2;
                                
                                return (
                                  <svg
                                    key={predIndex}
                                    className="absolute pointer-events-none"
                                    style={{
                                      left: 0,
                                      top: 0,
                                      width: '100%',
                                      height: '100%'
                                    }}
                                  >
                                    <defs>
                                      <marker
                                        id={`arrow-${task.id}-${predId}`}
                                        markerWidth="10"
                                        markerHeight="10"
                                        refX="9"
                                        refY="3"
                                        orient="auto"
                                        markerUnits="strokeWidth"
                                      >
                                        <polygon
                                          points="0,0 0,6 9,3"
                                          fill={task.isCritical ? '#ef4444' : '#6366f1'}
                                        />
                                      </marker>
                                    </defs>
                                    <line
                                      x1={startX}
                                      y1={startY}
                                      x2={endX}
                                      y2={endY}
                                      stroke={task.isCritical ? '#ef4444' : '#6366f1'}
                                      strokeWidth="2"
                                      markerEnd={`url(#arrow-${task.id}-${predId})`}
                                      strokeDasharray={task.isCritical ? 'none' : '5,5'}
                                    />
                                  </svg>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vista de Red - DESHABILITADA */}
        {false && viewMode === 'network' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Diagrama de Red</h2>
            
            {/* Controles principales del diagrama - DISEÑO MEJORADO */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                
                {/* Sección izquierda: Navegación */}
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-700 mr-2">Navegación:</div>
                  <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button 
                      onClick={zoomOut} 
                      className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200" 
                      title="Alejar"
                    >
                      <span className="text-lg font-bold">−</span>
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button 
                      onClick={zoomIn} 
                      className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200" 
                      title="Acercar"
                    >
                  <span className="text-lg font-bold">+</span>
                </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button 
                      onClick={resetZoom} 
                      className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200" 
                      title="Zoom Original"
                    >
                      <span className="text-sm">🔄</span>
                </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button 
                      onClick={centerNetwork} 
                      className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200" 
                      title="Centrar Vista"
                    >
                      <span className="text-sm">🎯</span>
                </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button 
                      onClick={autoFitNetworkDiagram} 
                      className="px-3 py-2 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-200" 
                      title="Auto Ajustar"
                    >
                      <span className="text-sm">📐</span>
                </button>
                  </div>
              </div>
              
                {/* Sección derecha: Acciones */}
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-700 mr-2">Acciones:</div>
                  <button 
                    onClick={exportNetworkAsImage} 
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2.5 rounded-lg hover:from-indigo-700 hover:to-indigo-800 flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <span className="text-lg">📤</span>
                    <span className="font-medium">Exportar Imagen</span>
                </button>
                </div>
              </div>
            </div>

            {/* Controles de Layout y Filtros - NUEVOS */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filtros de Vista */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Filtros:</label>
                    <button
                      onClick={() => setShowOnlyCriticalPath(!showOnlyCriticalPath)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        showOnlyCriticalPath 
                          ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🔥 Solo Ruta Crítica
                    </button>
                    <button
                      onClick={() => setShowSimplifiedView(!showSimplifiedView)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        showSimplifiedView 
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      👁️ Vista Simplificada
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Layout:</label>
                    <select
                      value={networkLayout}
                      onChange={(e) => setNetworkLayout(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="hierarchical">Jerárquico</option>
                      <option value="compact">Compacto</option>
                      <option value="grid">Cuadrícula</option>
                      <option value="radial">Radial</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={autoFitNetwork}
                        onChange={(e) => setAutoFitNetwork(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Auto Ajustar</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón principal de Dependencias - DISEÑO MEJORADO */}
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-2 border border-gray-200 shadow-sm">
              <button
                onClick={() => {
                  const newValue = !showNetworkDependencies;
                  setShowNetworkDependencies(newValue);
                  console.log('🔗 Botón dependencias RED:', newValue ? 'ACTIVADO' : 'DESACTIVADO');
                }}
                  className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center space-x-3 ${
                  showNetworkDependencies 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-2xl">🔗</span>
                  <span>Dependencias</span>
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    showNetworkDependencies 
                      ? 'bg-green-400 shadow-lg shadow-green-400/50' 
                      : 'bg-gray-400'
                  }`}></div>
              </button>
            </div>
              </div>
              

            {/* Métricas del diagrama simplificadas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">📊 Métricas del Diagrama</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Total Nodos</div>
                  <div className="text-2xl font-bold text-blue-800">{networkMetrics.totalNodes}</div>
                  <div className="text-xs text-blue-600">Tareas del proyecto</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Total Relaciones</div>
                  <div className="text-2xl font-bold text-blue-800">{networkMetrics.totalEdges}</div>
                  <div className="text-xs text-blue-600">Dependencias activas</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-sm text-blue-600 mb-1">Ruta Crítica</div>
                  <div className="text-2xl font-bold text-blue-800">{networkMetrics.criticalPathLength}</div>
                  <div className="text-xs text-blue-600">Tareas críticas</div>
                </div>
              </div>
            </div>

            {/* Instrucciones de navegación */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-4 text-sm text-blue-700">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🖱️</span>
                  <span><strong>Arrastrar:</strong> Haz clic y arrastra en el diagrama para moverlo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎯</span>
                  <span><strong>Centrar:</strong> Usa "Centrar Vista" para volver al centro</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔍</span>
                  <span><strong>Zoom:</strong> Usa + y - para acercar/alejar</span>
                </div>
              </div>
            </div>

            {/* Diagrama SVG */}
            <div className="border rounded-lg overflow-hidden bg-gray-50" style={{ height: '600px' }}>
              <svg
                ref={networkSvgRef}
                className="w-full h-full"
                viewBox={`${networkPan.x} ${networkPan.y} ${1200 / networkZoom} ${600 / networkZoom}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  transform: `scale(${networkZoom})`,
                  cursor: isPanning ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleDiagramMouseDown}
                onMouseMove={(e) => {
                  handleDiagramMouseMove(e);
                  handleNodeMouseMove(e);
                }}
                onMouseUp={(e) => {
                  handleDiagramMouseUp(e);
                  handleNodeMouseUp(e);
                }}
                onMouseLeave={(e) => {
                  handleDiagramMouseLeave(e);
                  handleNodeMouseUp(e);
                }}
              >
                {/* Log del viewBox para debugging */}
                {(() => {
                  console.log('🔍 VIEWBOX DEL SVG:', {
                    x: networkPan.x,
                    y: networkPan.y,
                    width: 1200 / networkZoom,
                    height: 600 / networkZoom,
                    zoom: networkZoom
                  });
                  return null;
                })()}
                
                {/* Definiciones SVG */}
                <defs>
                  {/* Marcadores de flecha */}
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                  </marker>
                  
                  {/* Marcador para ruta crítica */}
                  <marker
                    id="critical-arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                  
                  {/* Filtros y efectos */}
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#00000020" />
                  </filter>
                  
                  {/* Gradientes */}
                  <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  
                  <linearGradient id="criticalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                  
                  <linearGradient id="milestoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>

                {/* Líneas de dependencias */}
                {showNetworkDependencies && (() => {
                  console.log('🚀 INICIANDO RENDERIZADO DE LÍNEAS DE DEPENDENCIAS');
                  
                  const tasksWithDeps = tasksWithCPM.filter(t => t.predecessors.length > 0);
                  
                  console.log('🔗 DEPENDENCIAS:', {
                    activado: showNetworkDependencies,
                    totalTareas: tasksWithCPM.length,
                    tareasConDeps: tasksWithDeps.length,
                    dependencias: tasksWithDeps.map(t => `${t.id}(${t.predecessors.length} pred)`)
                  });
                  
                  // Log detallado de todas las tareas para debug
                  console.log('🔍 TODAS LAS TAREAS:', tasksWithCPM.map(t => ({
                    id: t.id,
                    name: t.name,
                    predecessors: t.predecessors,
                    successors: t.successors
                  })));
                  
                  if (tasksWithDeps.length === 0) {
                    console.log('⚠️ No hay tareas con dependencias definidas');
                    return null;
                  }
                  
                  // LIMPIAR Y GENERAR SOLO LAS LÍNEAS CORRECTAS
                  const allLines = [];
                  
                  // SOLO usar las dependencias que están en tasksWithCPM
                  tasksWithDeps.forEach((task) => {
                    task.predecessors.forEach((predId) => {
                      // Verificar que la predecesora existe en tasksWithCPM
                      const pred = tasksWithCPM.find(t => t.id === predId);
                      if (!pred) {
                        console.log(`⚠️ Predecesora no encontrada en tasksWithCPM: ${predId}`);
                        return;
                      }
                      
                      // Verificar que ambos nodos existen en networkNodes
                      const predNode = networkNodes.find(n => n.id === predId);
                      const taskNode = networkNodes.find(n => n.id === task.id);
                      
                      if (!predNode || !taskNode) {
                        console.log(`⚠️ Nodo no encontrado en networkNodes: pred=${predId} (${predNode ? 'OK' : 'NO'}), task=${task.id} (${taskNode ? 'OK' : 'NO'})`);
                        return;
                      }
                      
                      // Verificar que las coordenadas son válidas
                      if (typeof predNode.x !== 'number' || typeof predNode.y !== 'number' || 
                          typeof taskNode.x !== 'number' || typeof taskNode.y !== 'number') {
                        console.log(`⚠️ Coordenadas inválidas: pred=(${predNode.x},${predNode.y}), task=(${taskNode.x},${taskNode.y})`);
                        return;
                      }
                      
                      const isCritical = task.isCritical || pred.isCritical;
                      const strokeColor = isCritical ? '#ef4444' : '#6366f1';
                      const strokeWidth = isCritical ? 3 : 2;
                      const markerId = isCritical ? 'critical-arrowhead' : 'arrowhead';
                      
                      console.log(`✅ Línea válida generada: ${predId} → ${task.id} (${predNode.x},${predNode.y}) → (${taskNode.x},${taskNode.y})`);
                      
                      allLines.push({
                        key: `${predId}-${task.id}`,
                        x1: predNode.x + predNode.width / 2,
                        y1: predNode.y + predNode.height / 2,
                        x2: taskNode.x + taskNode.width / 2,
                        y2: taskNode.y + taskNode.height / 2,
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        markerId: markerId,
                        isCritical: isCritical
                      });
                    });
                  });
                  
                  console.log(`🎯 Total líneas válidas generadas: ${allLines.length}`);
                  console.log(`📍 Coordenadas de líneas:`, allLines.map(l => ({
                    key: l.key,
                    from: `(${l.x1},${l.y1})`,
                    to: `(${l.x2},${l.y2})`
                  })));
                  
                  // Renderizar SOLO las líneas válidas - DISEÑO MEJORADO
                  const renderedLines = allLines.map((line, index) => {
                    const isCritical = line.isCritical;
                    const strokeColor = isCritical ? '#ef4444' : '#6366f1';
                    const strokeWidth = isCritical ? 4 : 2;
                    const markerId = isCritical ? 'critical-arrowhead' : 'arrowhead';
                    
                    console.log(`🎨 Renderizando línea ${index + 1}: ${line.key} - Crítica: ${isCritical}`);
                    
                    return (
                      <g key={line.key}>
                        {/* Sombra de la línea */}
                        <line
                          x1={line.x1 + 2}
                          y1={line.y1 + 2}
                          x2={line.x2 + 2}
                          y2={line.y2 + 2}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={strokeWidth + 2}
                          markerEnd={`url(#${markerId})`}
                          className="pointer-events-none"
                        />
                        
                        {/* Línea principal */}
                        <line
                          x1={line.x1}
                          y1={line.y1}
                          x2={line.x2}
                          y2={line.y2}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd={`url(#${markerId})`}
                          className="transition-all duration-200"
                          style={{
                            strokeDasharray: isCritical ? 'none' : '8,4',
                            filter: isCritical ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' : 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.4))',
                            opacity: 1,
                            zIndex: 1000 + index,
                            pointerEvents: 'none'
                          }}
                        />
                      </g>
                    );
                  });
                  
                  console.log(`🎯 Total líneas renderizadas en DOM: ${renderedLines.length}`);
                  
                  return renderedLines;
                })()}

                {/* Nodos - DISEÑO MEJORADO */}
                {networkNodes.map((node) => {
                  const isCritical = node.task.isCritical;
                  const isMilestone = node.task.isMilestone;
                  const progress = node.task.progress || 0;
                  
                  // Colores y estilos mejorados
                  const nodeFill = isMilestone ? 'url(#milestoneGradient)' : 
                              isCritical ? 'url(#criticalGradient)' : 
                              'url(#nodeGradient)';
                  const nodeStroke = isCritical ? '#dc2626' : '#4f46e5';
                  const strokeWidth = isCritical ? 4 : 2;
                  
                  return (
                    <g key={node.id}>
                      {/* Sombra del nodo */}
                      <rect
                        x={node.x + 3}
                        y={node.y + 3}
                        width={node.width}
                        height={node.height}
                        rx="12"
                        ry="12"
                        fill="rgba(0,0,0,0.2)"
                        className="pointer-events-none"
                      />
                      
                      {/* Nodo principal */}
                      <rect
                        x={node.x}
                        y={node.y}
                        width={node.width}
                        height={node.height}
                        rx="12"
                        ry="12"
                        fill={nodeFill}
                        stroke={nodeStroke}
                        strokeWidth={strokeWidth}
                        className="cursor-grab hover:opacity-90 transition-all duration-200"
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      />
                      
                      {/* Barra de progreso interna */}
                      <rect
                        x={node.x + 4}
                        y={node.y + node.height - 8}
                        width={(node.width - 8) * (progress / 100)}
                        height="4"
                        rx="2"
                        ry="2"
                        fill="rgba(255,255,255,0.8)"
                        className="pointer-events-none"
                      />
                      
                      {/* Fondo de la barra de progreso */}
                      <rect
                        x={node.x + 4}
                        y={node.y + node.height - 8}
                        width={node.width - 8}
                        height="4"
                        rx="2"
                        ry="2"
                        fill="rgba(255,255,255,0.3)"
                        className="pointer-events-none"
                      />
                      
                      {/* Texto del nodo - mejorado */}
                      <text
                        x={node.x + node.width / 2}
                        y={node.y + node.height / 2 - (showSimplifiedView ? 8 : 12)}
                        textAnchor="middle"
                        className="text-white font-bold pointer-events-none"
                        style={{ 
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                          fontSize: showSimplifiedView ? '10px' : '12px'
                        }}
                      >
                        {showSimplifiedView ? 
                          (node.task.name.length > 12 ? 
                            node.task.name.substring(0, 12) + '...' : 
                            node.task.name) :
                          (node.task.name.length > 18 ? 
                            node.task.name.substring(0, 18) + '...' : 
                            node.task.name)
                        }
                      </text>
                      
                      {/* Información adicional - mejorada */}
                      {!showSimplifiedView && (
                        <text
                          x={node.x + node.width / 2}
                          y={node.y + node.height / 2 + 8}
                          textAnchor="middle"
                          className="text-white text-xs font-medium pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                        >
                          {node.task.duration}d • {progress}%
                        </text>
                      )}
                      
                      {/* Icono de milestone - mejorado */}
                      {isMilestone && (
                        <g>
                          <circle
                            cx={node.x + node.width - 20}
                            cy={node.y + 25}
                            r="12"
                            fill="rgba(255,255,255,0.9)"
                            className="pointer-events-none"
                          />
                        <text
                            x={node.x + node.width - 20}
                            y={node.y + 30}
                            textAnchor="middle"
                            className="text-indigo-600 text-sm pointer-events-none"
                        >
                          🏹
                        </text>
                        </g>
                      )}
                      
                      {/* Indicador de ruta crítica - mejorado */}
                      {isCritical && (
                        <g>
                          <circle
                            cx={node.x + node.width / 2}
                            cy={node.y - 15}
                            r="15"
                            fill="rgba(220, 38, 38, 0.9)"
                            stroke="#dc2626"
                            strokeWidth="2"
                            className="pointer-events-none"
                          />
                        <text
                          x={node.x + node.width / 2}
                            y={node.y - 10}
                          textAnchor="middle"
                            className="text-white text-sm font-bold pointer-events-none"
                        >
                          🔥
                        </text>
                        </g>
                      )}
                      
                      {/* Indicador de nivel */}
                      <text
                        x={node.x - 5}
                        y={node.y + 15}
                        textAnchor="middle"
                        className="text-gray-500 text-xs font-bold pointer-events-none"
                      >
                        L{node.level}
                      </text>
                    </g>
                  );
                })}

                {/* Timeline markers */}
                <g className="timeline-markers">
                  {generateTimelineMarkers().map((marker, index) => (
                    <g key={index}>
                      <line
                        x1={marker.x}
                        y1={550}
                        x2={marker.x}
                        y2={570}
                        stroke="#9ca3af"
                        strokeWidth="2"
                      />
                      <text
                        x={marker.x}
                        y={590}
                        textAnchor="middle"
                        className="text-gray-600 text-xs"
                      >
                        {marker.label}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Vista de Tareas de Minutas */}
        {viewMode === 'minutas' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 pb-32">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Tareas de Minutas</h2>
              <button
                onClick={handleOpenMinutaModal}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2 transition-all duration-300"
              >
                <span>➕</span>
                <span>Nueva Minuta</span>
              </button>
            </div>

            {loadingMinutas ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-xl p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">Cargando minutas...</h3>
                  <p className="text-gray-500">Obteniendo datos desde {useSupabase ? 'Supabase' : 'localStorage'}</p>
                </div>
              </div>
            ) : minutasTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-xl p-8">
                  <span className="text-6xl mb-4 block">📝</span>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay tareas de minutas</h3>
                  <p className="text-gray-500 mb-4">Crea tu primera minuta haciendo clic en "Nueva Minuta"</p>
                  <button
                    onClick={handleOpenMinutaModal}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ➕ Crear Primera Minuta
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Organizar por hitos */}
                {tasks.filter(task => task.isMilestone).map(hito => {
                  const tareasDelHito = minutasTasks.filter(tarea => tarea.hitoId === hito.id);

                  if (tareasDelHito.length === 0) return null;

                  return (
                    <div key={hito.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-800">
                          🎯 {hito.wbsCode} - {hito.name}
                        </h3>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">Tarea</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/6">Responsable</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Fecha</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Estatus</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Creada</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {tareasDelHito
                              .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                              .map((tarea, index) => (
                                <tr key={tarea.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900">{tarea.tarea}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">{tarea.responsable}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    {(() => {
                                      try {
                                        const fecha = new Date(tarea.fecha);
                                        return isNaN(fecha.getTime()) ? 'Fecha inválida' : fecha.toLocaleDateString('es-ES');
                                      } catch (error) {
                                        return 'Fecha inválida';
                                      }
                                    })()}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <select
                                      value={tarea.estatus}
                                      onChange={async (e) => {
                                        const newStatus = e.target.value;

                                        // Actualizar inmediatamente en el estado local
                                        setMinutasTasks(prev =>
                                          prev.map(t => t.id === tarea.id ? { ...t, estatus: newStatus } : t)
                                        );

                                        // Si usa Supabase, actualizar en la base de datos
                                        if (useSupabase) {
                                          try {
                                            const result = await supabaseService.updateMinutaStatus(tarea.id, newStatus);
                                            if (!result.success) {
                                              console.error('❌ Error actualizando estatus en Supabase:', result.error);
                                              // Revertir el cambio local en caso de error
                                              setMinutasTasks(prev =>
                                                prev.map(t => t.id === tarea.id ? { ...t, estatus: tarea.estatus } : t)
                                              );
                                            }
                                          } catch (error) {
                                            console.error('❌ Error actualizando estatus:', error);
                                          }
                                        }
                                      }}
                                      className={`px-3 py-1 rounded-full text-xs font-medium border-none ${
                                        tarea.estatus === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                        tarea.estatus === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                                        'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      <option value="Pendiente">Pendiente</option>
                                      <option value="En Proceso">En Proceso</option>
                                      <option value="Completado">Completado</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {(() => {
                                      try {
                                        const fecha = new Date(tarea.fechaCreacion);
                                        return isNaN(fecha.getTime()) ? 'Fecha inválida' : fecha.toLocaleDateString('es-ES');
                                      } catch (error) {
                                        return 'Fecha inválida';
                                      }
                                    })()}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <button
                                      onClick={() => handleEditMinuta(tarea)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="Editar minuta"
                                    >
                                      ✏️ Editar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Mostrar tareas sin hito asignado */}
                {(() => {
                  const tareasSinHito = minutasTasks.filter(tarea => {
                    if (!tarea.hitoId) return true;
                    const hitoEncontrado = tasks.find(t => t.id === tarea.hitoId && t.isMilestone);
                    if (!hitoEncontrado) {
                      console.log(`🔍 DEBUG: Tarea ${tarea.id} busca hito ${tarea.hitoId} pero no se encuentra`);
                      console.log(`🔍 DEBUG: Hitos disponibles:`, tasks.filter(t => t.isMilestone).map(h => ({id: h.id, name: h.name})));
                    }
                    return !hitoEncontrado;
                  });
                  return tareasSinHito.length > 0;
                })() && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">📋 Sin hito asignado</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/3">Tarea</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/6">Responsable</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Fecha</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Estatus</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Creada</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-1/8">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {minutasTasks
                            .filter(tarea => {
                              if (!tarea.hitoId) return true;
                              const hitoEncontrado = tasks.find(t => t.id === tarea.hitoId && t.isMilestone);
                              return !hitoEncontrado;
                            })
                            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                            .map((tarea) => (
                              <tr key={tarea.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{tarea.tarea}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{tarea.responsable}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {(() => {
                                    try {
                                      const fecha = new Date(tarea.fecha);
                                      return isNaN(fecha.getTime()) ? 'Fecha inválida' : fecha.toLocaleDateString('es-ES');
                                    } catch (error) {
                                      return 'Fecha inválida';
                                    }
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <select
                                    value={tarea.estatus}
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;

                                      // Actualizar inmediatamente en el estado local
                                      setMinutasTasks(prev =>
                                        prev.map(t => t.id === tarea.id ? { ...t, estatus: newStatus } : t)
                                      );

                                      // Si usa Supabase, actualizar en la base de datos
                                      if (useSupabase) {
                                        try {
                                          const result = await supabaseService.updateMinutaStatus(tarea.id, newStatus);
                                          if (!result.success) {
                                            console.error('❌ Error actualizando estatus en Supabase:', result.error);
                                            // Revertir el cambio local en caso de error
                                            setMinutasTasks(prev =>
                                              prev.map(t => t.id === tarea.id ? { ...t, estatus: tarea.estatus } : t)
                                            );
                                          }
                                        } catch (error) {
                                          console.error('❌ Error actualizando estatus:', error);
                                        }
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border-none ${
                                      tarea.estatus === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                      tarea.estatus === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                                      'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="En Proceso">En Proceso</option>
                                    <option value="Completado">Completado</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {(() => {
                                    try {
                                      const fecha = new Date(tarea.fechaCreacion);
                                      return isNaN(fecha.getTime()) ? 'Fecha inválida' : fecha.toLocaleDateString('es-ES');
                                    } catch (error) {
                                      return 'Fecha inválida';
                                    }
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => handleEditMinuta(tarea)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Editar minuta"
                                  >
                                    ✏️ Editar
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL INFORMATIVO PARA VISTA GANTT */}
        {selectedTask && viewMode === 'gantt' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">📊 Vista Solo Lectura</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">👁️</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {selectedTask.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  Esta es la vista de solo lectura del diagrama Gantt.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Para editar esta tarea, cambia a la <strong>Vista Tabla</strong>.
                </p>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setViewMode('excel')}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    📋 Ir a Vista Tabla
                  </button>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NUEVO Y LIMPIO DE EDICIÓN DE TAREA - SOLO EN VISTA TABLA */}
        {selectedTask && viewMode !== 'gantt' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedTask.name}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Tarea
                      </label>
                      <input
                        type="text"
                        value={selectedTask.name}
                        onChange={(e) => setSelectedTask(prev => ({
                          id: prev.id,
                          wbsCode: prev.wbsCode,
                          name: e.target.value,
                          duration: prev.duration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          progress: prev.progress,
                          predecessors: [...(prev.predecessors || [])],
                          cost: prev.cost,
                          priority: prev.priority,
                          assignedTo: prev.assignedTo,
                          isMilestone: prev.isMilestone,
                          isCritical: prev.isCritical,
                          originalDuration: prev.originalDuration,
                          earlyStart: prev.earlyStart,
                          earlyFinish: prev.earlyFinish,
                          lateStart: prev.lateStart,
                          lateFinish: prev.lateFinish,
                          totalFloat: prev.totalFloat,
                          freeFloat: prev.freeFloat,
                          description: prev.description,
                          resources: [...(prev.resources || [])],
                          workPackageId: prev.workPackageId,
                          status: prev.status,
                          successors: [...(prev.successors || [])]
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duración (días)
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedTask(prev => ({
                            id: prev.id,
                            wbsCode: prev.wbsCode,
                            name: prev.name,
                            duration: Math.max(1, prev.duration - 1),
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            progress: prev.progress,
                            predecessors: [...(prev.predecessors || [])],
                            cost: prev.cost,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            isMilestone: prev.isMilestone,
                            isCritical: prev.isCritical,
                            originalDuration: prev.originalDuration,
                            earlyStart: prev.earlyStart,
                            earlyFinish: prev.earlyFinish,
                            lateStart: prev.lateStart,
                            lateFinish: prev.lateFinish,
                            totalFloat: prev.totalFloat,
                            freeFloat: prev.freeFloat,
                            description: prev.description,
                            resources: [...(prev.resources || [])],
                            workPackageId: prev.workPackageId,
                            status: prev.status,
                            successors: [...(prev.successors || [])]
                          }))}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={selectedTask.duration}
                          onChange={(e) => setSelectedTask(prev => ({
                            id: prev.id,
                            wbsCode: prev.wbsCode,
                            name: prev.name,
                            duration: parseInt(e.target.value) || 1,
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            progress: prev.progress,
                            predecessors: [...(prev.predecessors || [])],
                            cost: prev.cost,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            isMilestone: prev.isMilestone,
                            isCritical: prev.isCritical,
                            originalDuration: prev.originalDuration,
                            earlyStart: prev.earlyStart,
                            earlyFinish: prev.earlyFinish,
                            lateStart: prev.lateStart,
                            lateFinish: prev.lateFinish,
                            totalFloat: prev.totalFloat,
                            freeFloat: prev.freeFloat,
                            description: prev.description,
                            resources: [...(prev.resources || [])],
                            workPackageId: prev.workPackageId,
                            status: prev.status,
                            successors: [...(prev.successors || [])]
                          }))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          min="1"
                        />
                        <button
                          onClick={() => setSelectedTask(prev => ({
                            id: prev.id,
                            wbsCode: prev.wbsCode,
                            name: prev.name,
                            duration: prev.duration + 1,
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            progress: prev.progress,
                            predecessors: [...(prev.predecessors || [])],
                            cost: prev.cost,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            isMilestone: prev.isMilestone,
                            isCritical: prev.isCritical,
                            originalDuration: prev.originalDuration,
                            earlyStart: prev.earlyStart,
                            earlyFinish: prev.earlyFinish,
                            lateStart: prev.lateStart,
                            lateFinish: prev.lateFinish,
                            totalFloat: prev.totalFloat,
                            freeFloat: prev.freeFloat,
                            description: prev.description,
                            resources: [...(prev.resources || [])],
                            workPackageId: prev.workPackageId,
                            status: prev.status,
                            successors: [...(prev.successors || [])]
                          }))}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Dependencias - SISTEMA NUEVO Y SIMPLIFICADO */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Dependencias</h3>
                  
                  {/* Predecesoras */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Predecesoras ({selectedTask.predecessors?.length || 0})
                    </label>
                    
                    {/* Lista de tareas disponibles para predecesoras */}
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {tasks.filter(task => task.id !== selectedTask.id).map(task => (
                        <label key={task.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedTask.predecessors?.includes(task.id) || false}
                            onChange={(e) => {
                              const currentPreds = selectedTask.predecessors || [];
                              if (e.target.checked) {
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: [...(currentPreds || []), task.id],
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: [...(prev.successors || [])]
                                }));
                              } else {
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: currentPreds.filter(id => id !== task.id),
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: [...(prev.successors || [])]
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">
                            {task.wbsCode} - {task.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sucesoras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sucesoras ({selectedTask.successors?.length || 0})
                    </label>
                    
                    {/* Lista de tareas disponibles para sucesoras */}
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {tasks.filter(task => task.id !== selectedTask.id).map(task => (
                        <label key={task.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedTask.successors?.includes(task.id) || false}
                            onChange={(e) => {
                              const currentSuccs = selectedTask.successors || [];
                              if (e.target.checked) {
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: [...(prev.predecessors || [])],
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: currentSuccs.slice().concat([task.id])
                                }));
                              } else {
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: [...(prev.predecessors || [])],
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: currentSuccs.filter(id => id !== task.id)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm">
                            {task.wbsCode} - {task.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    console.log('🆕 MODAL NUEVO - Guardando tarea:', selectedTask);
                    
                    // Actualizar directamente el estado global
                    setTasks(prev => {
                      return prev.map(task => {
                        if (task.id === selectedTask.id) {
                          return {
                            id: task.id,
                            wbsCode: task.wbsCode,
                            name: selectedTask.name,
                            duration: selectedTask.duration,
                            startDate: task.startDate,
                            endDate: task.endDate,
                            progress: task.progress,
                            predecessors: [...(task.predecessors || [])],
                            cost: task.cost,
                            priority: task.priority,
                            assignedTo: task.assignedTo,
                            isMilestone: task.isMilestone,
                            isCritical: task.isCritical,
                            originalDuration: task.originalDuration,
                            earlyStart: task.earlyStart,
                            earlyFinish: task.earlyFinish,
                            lateStart: task.lateStart,
                            lateFinish: task.lateFinish,
                            totalFloat: task.totalFloat,
                            freeFloat: task.freeFloat,
                            description: task.description,
                            resources: [...(task.resources || [])],
                            workPackageId: task.workPackageId,
                            status: task.status,
                            successors: [...(task.successors || [])],
                            predecessors: selectedTask.predecessors || [],
                            successors: selectedTask.successors || []
                          };
                        }
                        return task;
                      });
                    });
                    
                    setSelectedTask(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL VIEJO ELIMINADO PARA EVITAR CONFLICTOS */}
        {false && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-task-id={selectedTask.id}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedTask.name}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Información Básica</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Tarea
                    </label>
                    <input
                      type="text"
                      value={selectedTask.name || ''}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setSelectedTask(prev => ({
                          id: prev.id,
                          wbsCode: prev.wbsCode,
                          name: newName,
                          duration: prev.duration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          progress: prev.progress,
                          predecessors: [...(prev.predecessors || [])],
                          cost: prev.cost,
                          priority: prev.priority,
                          assignedTo: prev.assignedTo,
                          isMilestone: prev.isMilestone,
                          isCritical: prev.isCritical,
                          originalDuration: prev.originalDuration,
                          earlyStart: prev.earlyStart,
                          earlyFinish: prev.earlyFinish,
                          lateStart: prev.lateStart,
                          lateFinish: prev.lateFinish,
                          totalFloat: prev.totalFloat,
                          freeFloat: prev.freeFloat,
                          description: prev.description,
                          resources: [...(prev.resources || [])],
                          workPackageId: prev.workPackageId,
                          status: prev.status,
                          successors: [...(prev.successors || [])]
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duración (días)
                    </label>
                    <input
                      type="number"
                      value={selectedTask.duration || 0}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 0;
                        setSelectedTask(prev => ({
                          id: prev.id,
                          wbsCode: prev.wbsCode,
                          name: prev.name,
                          duration: newDuration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          progress: prev.progress,
                          predecessors: [...(prev.predecessors || [])],
                          cost: prev.cost,
                          priority: prev.priority,
                          assignedTo: prev.assignedTo,
                          isMilestone: prev.isMilestone,
                          isCritical: prev.isCritical,
                          originalDuration: prev.originalDuration,
                          earlyStart: prev.earlyStart,
                          earlyFinish: prev.earlyFinish,
                          lateStart: prev.lateStart,
                          lateFinish: prev.lateFinish,
                          totalFloat: prev.totalFloat,
                          freeFloat: prev.freeFloat,
                          description: prev.description,
                          resources: [...(prev.resources || [])],
                          workPackageId: prev.workPackageId,
                          status: prev.status,
                          successors: [...(prev.successors || [])]
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                {/* Dependencias */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Dependencias</h3>
                  
                  {/* Predecesoras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Predecesoras ({(tasks.find(t => t.id === selectedTask.id)?.predecessors || []).length})
                    </label>
                    <div className="space-y-2">
                      {(tasks.find(t => t.id === selectedTask.id)?.predecessors || [])?.map((predId, index) => {
                        const predTask = tasks.find(t => t.id === predId);
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded" data-predecessor-id={predId}>
                            <span className="text-sm">
                              {predTask ? `${predTask.wbsCode} - ${predTask.name}` : predId}
                            </span>
                            <button
                              onClick={() => {
                                const newPredecessors = selectedTask.predecessors.filter(id => id !== predId);
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: newPredecessors,
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: [...(prev.successors || [])]
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <select
                      onChange={(e) => {
                        const newPredId = e.target.value;
                        if (newPredId && !selectedTask.predecessors?.includes(newPredId)) {
                          const newPredecessors = [...(selectedTask.predecessors || []), newPredId];
                          setSelectedTask(prev => ({
                            id: prev.id,
                            wbsCode: prev.wbsCode,
                            name: prev.name,
                            duration: prev.duration,
                            startDate: prev.startDate,
                            endDate: prev.endDate,
                            progress: prev.progress,
                            predecessors: newPredecessors,
                            cost: prev.cost,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            isMilestone: prev.isMilestone,
                            isCritical: prev.isCritical,
                            originalDuration: prev.originalDuration,
                            earlyStart: prev.earlyStart,
                            earlyFinish: prev.earlyFinish,
                            lateStart: prev.lateStart,
                            lateFinish: prev.lateFinish,
                            totalFloat: prev.totalFloat,
                            freeFloat: prev.freeFloat,
                            description: prev.description,
                            resources: [...(prev.resources || [])],
                            workPackageId: prev.workPackageId,
                            status: prev.status,
                            successors: [...(prev.successors || [])]
                          }));
                          e.target.value = '';
                        }
                      }}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Agregar predecesora...</option>
                      {tasks
                        .filter(t => t.id !== selectedTask.id && !selectedTask.predecessors?.includes(t.id))
                        .map(task => (
                          <option key={task.id} value={task.id}>
                            {task.wbsCode} - {task.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {/* Sucesoras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sucesoras ({(tasks.find(t => t.id === selectedTask.id)?.successors || []).length})
                    </label>
                    <div className="space-y-2">
                      {(tasks.find(t => t.id === selectedTask.id)?.successors || [])?.map((succId, index) => {
                        const succTask = tasks.find(t => t.id === succId);
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded" data-successor-id={succId}>
                            <span className="text-sm">
                              {succTask ? `${succTask.wbsCode} - ${succTask.name}` : succId}
                            </span>
                            <button
                              onClick={() => {
                                const newSuccessors = selectedTask.successors.filter(id => id !== succId);
                                setSelectedTask(prev => ({
                                  id: prev.id,
                                  wbsCode: prev.wbsCode,
                                  name: prev.name,
                                  duration: prev.duration,
                                  startDate: prev.startDate,
                                  endDate: prev.endDate,
                                  progress: prev.progress,
                                  predecessors: [...(prev.predecessors || [])],
                                  cost: prev.cost,
                                  priority: prev.priority,
                                  assignedTo: prev.assignedTo,
                                  isMilestone: prev.isMilestone,
                                  isCritical: prev.isCritical,
                                  originalDuration: prev.originalDuration,
                                  earlyStart: prev.earlyStart,
                                  earlyFinish: prev.earlyFinish,
                                  lateStart: prev.lateStart,
                                  lateFinish: prev.lateFinish,
                                  totalFloat: prev.totalFloat,
                                  freeFloat: prev.freeFloat,
                                  description: prev.description,
                                  resources: [...(prev.resources || [])],
                                  workPackageId: prev.workPackageId,
                                  status: prev.status,
                                  successors: newSuccessors
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <select
                      onChange={(e) => {
                        const newSuccId = e.target.value;
                        console.log('🆕 NUEVO MODAL - Agregando sucesora:', newSuccId);
                        console.log('🆕 NUEVO MODAL - selectedTask.successors ANTES:', selectedTask.successors);
                        
                        if (newSuccId && !selectedTask.successors?.includes(newSuccId)) {
                          const newSuccessors = [...(selectedTask.successors || []), newSuccId];
                          console.log('🆕 NUEVO MODAL - newSuccessors:', newSuccessors);
                          
                          setSelectedTask(prev => {
                            const updated = {
                              id: prev.id,
                              wbsCode: prev.wbsCode,
                              name: prev.name,
                              duration: prev.duration,
                              startDate: prev.startDate,
                              endDate: prev.endDate,
                              progress: prev.progress,
                              predecessors: [...(prev.predecessors || [])],
                              cost: prev.cost,
                              priority: prev.priority,
                              assignedTo: prev.assignedTo,
                              isMilestone: prev.isMilestone,
                              isCritical: prev.isCritical,
                              originalDuration: prev.originalDuration,
                              earlyStart: prev.earlyStart,
                              earlyFinish: prev.earlyFinish,
                              lateStart: prev.lateStart,
                              lateFinish: prev.lateFinish,
                              totalFloat: prev.totalFloat,
                              freeFloat: prev.freeFloat,
                              description: prev.description,
                              resources: [...(prev.resources || [])],
                              workPackageId: prev.workPackageId,
                              status: prev.status,
                              successors: newSuccessors
                            };
                            console.log('🆕 NUEVO MODAL - selectedTask DESPUÉS de setSelectedTask:', updated);
                            return updated;
                          });
                          e.target.value = '';
                        }
                      }}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Agregar sucesora...</option>
                      {tasks
                        .filter(t => t.id !== selectedTask.id && !selectedTask.successors?.includes(t.id))
                        .map(task => (
                          <option key={task.id} value={task.id}>
                            {task.wbsCode} - {task.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Botones de Acción */}
              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    console.log('🆕 NUEVO MODAL - selectedTask COMPLETO al hacer clic en Guardar:', selectedTask);
                    
                    // SOLUCIÓN RADICAL: Guardar directamente sin usar selectedTask
                    const taskId = selectedTask.id;
                    const taskName = selectedTask.name;
                    const taskDuration = selectedTask.duration;
                    
                    // Obtener predecesoras y sucesoras directamente del DOM
                    const predecessorsList = document.querySelectorAll('[data-predecessor-id]');
                    const successorsList = document.querySelectorAll('[data-successor-id]');
                    
                    console.log('🆕 NUEVO MODAL - Elementos encontrados en DOM:', {
                      predecessorsList: predecessorsList.length,
                      successorsList: successorsList.length,
                      predecessorsElements: Array.from(predecessorsList).map(el => ({
                        id: el.getAttribute('data-predecessor-id'),
                        text: el.textContent,
                        outerHTML: el.outerHTML
                      })),
                      successorsElements: Array.from(successorsList).map(el => ({
                        id: el.getAttribute('data-successor-id'),
                        text: el.textContent,
                        outerHTML: el.outerHTML
                      }))
                    });
                    
                    // Verificar si hay elementos de dependencias en el modal (SEGUNDA DECLARACIÓN ELIMINADA)
                    // const allDependencyElements = document.querySelectorAll('[data-predecessor-id], [data-successor-id]');
                    // console.log('🆕 NUEVO MODAL - Todos los elementos de dependencias en el DOM:', {
                    //   total: allDependencyElements.length,
                    //   elements: Array.from(allDependencyElements).map(el => ({
                    //     tagName: el.tagName,
                    //     className: el.className,
                    //     outerHTML: el.outerHTML
                    //   }))
                    // });
                    
                    // Verificar el HTML del modal completo
                    const modalElement = document.querySelector('[data-task-id]');
                    console.log('🆕 NUEVO MODAL - HTML del modal completo:', {
                      modalExists: !!modalElement,
                      modalHTML: modalElement?.outerHTML,
                      modalInnerHTML: modalElement?.innerHTML
                    });
                    
                    // Verificar si hay elementos de dependencias en el modal (SEGUNDA DECLARACIÓN ELIMINADA)
                    // const allDependencyElements = document.querySelectorAll('[data-predecessor-id], [data-successor-id]');
                    // console.log('🆕 NUEVO MODAL - Todos los elementos de dependencias en el DOM:', {
                    //   total: allDependencyElements.length,
                    //   elements: Array.from(allDependencyElements).map(el => ({
                    //     tagName: el.tagName,
                    //     className: el.className,
                    //     outerHTML: el.outerHTML
                    //   }))
                    // });
                    
                    const predecessors = Array.from(predecessorsList).map(el => el.getAttribute('data-predecessor-id'));
                    const successors = Array.from(successorsList).map(el => el.getAttribute('data-successor-id'));
                    
                    console.log('🆕 NUEVO MODAL - Datos obtenidos del DOM:', {
                      taskId,
                      taskName,
                      taskDuration,
                      predecessors,
                      successors
                    });
                    
                    console.log('🆕 NUEVO MODAL - Arrays separados:', {
                      predecessors: predecessors,
                      successors: successors,
                      predecessorsLength: predecessors.length,
                      successorsLength: successors.length
                    });
                    
                    // Actualizar directamente el estado global SIN sincronización bidireccional
                    setTasks(prev => {
                      console.log('🆕 NUEVO MODAL - Actualizando estado global directamente');
                      const updatedTasks = prev.map(task => {
                        if (task.id === taskId) {
                          console.log('🆕 NUEVO MODAL - Dependencias a guardar en la tarea:', {
                            predecessors: predecessors,
                            successors: successors,
                            predecessorsLength: predecessors.length,
                            successorsLength: successors.length
                          });
                          
                          const updatedTask = {
                            id: task.id,
                            wbsCode: task.wbsCode,
                            name: taskName,
                            duration: taskDuration,
                            startDate: task.startDate,
                            endDate: task.endDate,
                            progress: task.progress,
                            predecessors: [...(task.predecessors || [])],
                            cost: task.cost,
                            priority: task.priority,
                            assignedTo: task.assignedTo,
                            isMilestone: task.isMilestone,
                            isCritical: task.isCritical,
                            originalDuration: task.originalDuration,
                            earlyStart: task.earlyStart,
                            earlyFinish: task.earlyFinish,
                            lateStart: task.lateStart,
                            lateFinish: task.lateFinish,
                            totalFloat: task.totalFloat,
                            freeFloat: task.freeFloat,
                            description: task.description,
                            resources: [...(task.resources || [])],
                            workPackageId: task.workPackageId,
                            status: task.status,
                            successors: [...(task.successors || [])],
                            predecessors: predecessors,
                            successors: successors
                          };
                          console.log('🆕 NUEVO MODAL - Tarea actualizada:', updatedTask);
                          console.log('🆕 NUEVO MODAL - Dependencias guardadas:', {
                            predecessors: updatedTask.predecessors,
                            successors: updatedTask.successors,
                            predecessorsLength: updatedTask.predecessors?.length,
                            successorsLength: updatedTask.successors?.length
                          });
                          return updatedTask;
                        }
                        return task;
                      });
                      
                      const finalTask = updatedTasks.find(t => t.id === taskId);
                      console.log('🆕 NUEVO MODAL - Estado global actualizado:', finalTask);
                      console.log('🆕 NUEVO MODAL - Dependencias finales:', {
                        predecessors: finalTask?.predecessors,
                        successors: finalTask?.successors,
                        predecessorsLength: finalTask?.predecessors?.length,
                        successorsLength: finalTask?.successors?.length
                      });
                      return updatedTasks;
                    });
                    
                    setSelectedTask(null);
                    
                    // Verificar el estado después de cerrar el modal
                    setTimeout(() => {
                      const taskAfterClose = tasks.find(t => t.id === taskId);
                      console.log('🆕 NUEVO MODAL - Estado después de cerrar modal:', taskAfterClose);
                      console.log('🆕 NUEVO MODAL - Dependencias después de cerrar:', {
                        predecessors: taskAfterClose?.predecessors,
                        successors: taskAfterClose?.successors,
                        predecessorsLength: taskAfterClose?.predecessors?.length,
                        successorsLength: taskAfterClose?.successors?.length
                      });
                    }, 100);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Edición de Tarea ORIGINAL (MANTENER PARA COMPATIBILIDAD) */}
        {console.log('🔍 RENDERIZADO - selectedTask existe?', !!selectedTask, selectedTask)}
        {false && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-task-id={selectedTask.id}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Detalles de la Tarea</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log('❌ BOTÓN X - Cerrando modal desde X');
                    console.log('❌ BOTÓN X - selectedTask ANTES:', selectedTask);
                    console.log('❌ BOTÓN X - tasks.length ANTES:', tasks.length);
                    setSelectedTask(null);
                    console.log('❌ BOTÓN X - selectedTask establecido a null');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  title="Cerrar"
                >
                  ×
                </button>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTask.status)}`}>
                  {getStatusIcon(selectedTask.status)} {selectedTask.status}
                </span>
                {selectedTask.isCritical && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                    🔥 Tarea Crítica
                  </span>
                )}
                {selectedTask.isMilestone && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                    🏹 Milestone
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Información Básica */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 Información Básica</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{selectedTask.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">WBS:</span>
                    <span className="font-medium">{selectedTask.wbsCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nombre:</span>
                    <span className="font-medium">{selectedTask.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duración:</span>
                    <span className="font-medium">{selectedTask.duration} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inicio:</span>
                    <span className="font-medium">{new Date(selectedTask.startDate).toLocaleDateString('es')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fin:</span>
                    <span className="font-medium">{new Date(selectedTask.endDate).toLocaleDateString('es')}</span>
                  </div>
                </div>
              </div>

              {/* Progreso y Costos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">📊 Progreso y Costos</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">{selectedTask.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedTask.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Costo:</span>
                    <span className="font-medium">${selectedTask.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Float Total:</span>
                    <span className="font-medium">{selectedTask.totalFloat} días</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Float Libre:</span>
                    <span className="font-medium">{selectedTask.freeFloat} días</span>
                  </div>
                </div>
              </div>

              {/* Recursos y Dependencias */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">🔗 Recursos y Dependencias</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Recursos:</span>
                    <div className="mt-1">
                      {selectedTask.resources.length > 0 ? (
                        selectedTask.resources.map((resource, index) => (
                          <span key={index} className="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full mr-1 mb-1">
                            {resource}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">Sin recursos asignados</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Predecesoras:</span>
                    <span className="font-medium">{selectedTask.predecessors.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sucesoras:</span>
                    <span className="font-medium">{selectedTask.successors.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Análisis de Ruta Crítica */}
            {selectedTask.isCritical && (
              <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 rounded-2xl p-6 mb-8 border border-red-200 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-full p-3 mr-4 shadow-lg">
                    <span className="text-white text-2xl">🔥</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-800 mb-1">
                      Análisis de Ruta Crítica
                </h3>
                    <p className="text-red-600 text-sm">
                      Esta tarea es crítica - cualquier retraso afecta la fecha de finalización del proyecto
                    </p>
                    </div>
                  </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center mb-3">
                      <div className="bg-red-100 rounded-lg p-2 mr-3">
                        <span className="text-red-600 text-lg">💰</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-600 mb-1">Impacto de Retraso</div>
                        <div className="text-xs text-gray-500">Costo por día de retraso</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-800">
                      ${selectedTask.criticalImpact?.delayCost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">por día</div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center mb-3">
                      <div className="bg-red-100 rounded-lg p-2 mr-3">
                        <span className="text-red-600 text-lg">👥</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-600 mb-1">Impacto en Recursos</div>
                        <div className="text-xs text-gray-500">Nivel de impacto</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-800">
                      {selectedTask.criticalImpact?.resourceImpact || 'Bajo'}
                    </div>
                    <div className={`text-sm px-2 py-1 rounded-full mt-2 inline-block ${
                      selectedTask.criticalImpact?.resourceImpact === 'Alto' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedTask.criticalImpact?.resourceImpact === 'Alto' ? '⚠️ Alto Riesgo' : '✅ Bajo Riesgo'}
                  </div>
                  </div>
                  
                  <div className="bg-white rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center mb-3">
                      <div className="bg-red-100 rounded-lg p-2 mr-3">
                        <span className="text-red-600 text-lg">🔗</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-600 mb-1">Tareas Afectadas</div>
                        <div className="text-xs text-gray-500">Sucesoras directas</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-800">
                      {selectedTask.criticalImpact?.successorImpact || 0}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedTask.criticalImpact?.successorImpact > 0 ? 'tareas dependientes' : 'sin dependientes'}
                    </div>
                  </div>
                </div>
                
                {/* Alerta adicional */}
                <div className="mt-6 bg-red-100 border border-red-300 rounded-xl p-4">
                  <div className="flex items-center">
                    <span className="text-red-600 text-xl mr-3">⚠️</span>
                    <div className="text-sm text-red-800">
                      <strong>Recomendación:</strong> Monitorea esta tarea de cerca y considera tener un plan de contingencia para evitar retrasos.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel de Análisis de Sensibilidad */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center">
                  📊 Análisis de Sensibilidad
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1">Nivel de Sensibilidad</div>
                    <div className="text-lg font-bold text-blue-800">
                      {selectedTask.sensitivity || 0}/10
                    </div>
                    <div className="text-xs text-blue-600">Factor de riesgo</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1">Float de Seguridad</div>
                    <div className="text-lg font-bold text-blue-800">
                      {selectedTask.safetyFloat || 0} días
                    </div>
                    <div className="text-xs text-blue-600">Margen de seguridad</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="text-sm text-blue-600 mb-1">Estado de Float</div>
                    <div className={`text-lg font-bold ${selectedTask.totalFloat === 0 ? 'text-red-600' : selectedTask.totalFloat <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {selectedTask.totalFloat === 0 ? 'Crítico' : selectedTask.totalFloat <= 2 ? 'Alto Riesgo' : 'Seguro'}
                    </div>
                    <div className="text-xs text-blue-600">Clasificación de riesgo</div>
                  </div>
                </div>
              </div>

            <h3 className="text-xl font-bold mb-4">✏️ Editar Tarea</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tarea:</label>
                <input
                  type="text"
                  id="name"
                  value={tempTaskName}
                  onChange={handleNameChange}
                  onFocus={handleNameFocus}
                  onBlur={handleNameBlur}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duración (días):</label>
                <input
                  type="number"
                  id="duration"
                  value={selectedTask?.duration || 0}
                  onChange={(e) => updateTask(selectedTask?.id, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio:</label>
                <input
                  type="date"
                  id="startDate"
                  value={selectedTask?.startDate || ''}
                  onChange={(e) => updateTask(selectedTask?.id, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin:</label>
                <input
                  type="date"
                  id="endDate"
                  value={selectedTask?.endDate || ''}
                  onChange={(e) => updateTask(selectedTask?.id, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-1">Progreso (%):</label>
                <input
                  type="number"
                  id="progress"
                  value={selectedTask?.progress || 0}
                  onChange={(e) => updateTask(selectedTask?.id, 'progress', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">Costo:</label>
                <input
                  type="number"
                  id="cost"
                  value={selectedTask?.cost || 0}
                  onChange={(e) => updateTask(selectedTask?.id, 'cost', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="resources" className="block text-sm font-medium text-gray-700 mb-1">Recursos:</label>
                <input
                  type="text"
                  id="resources"
                  value={selectedTask?.resources?.join(', ') || ''}
                  onChange={(e) => updateTask(selectedTask?.id, 'resources', e.target.value.split(',').map(r => r.trim()))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado:</label>
                <select
                  id="status"
                  value={selectedTask?.status || 'pending'}
                  onChange={(e) => updateTask(selectedTask?.id, 'status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in-progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="delayed">Retrasado</option>
                </select>
              </div>
              <div>
                <label htmlFor="isMilestone" className="block text-sm font-medium text-gray-700 mb-1">Milestone:</label>
                <input
                  type="checkbox"
                  id="isMilestone"
                  checked={selectedTask.isMilestone}
                  onChange={(e) => updateTask(selectedTask.id, 'isMilestone', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4">🔗 Gestión de Dependencias</h3>
            
            {/* Predecesoras */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-lg font-medium text-gray-700">Predecesoras (Tareas que deben completarse antes)</label>
                <span className="text-sm text-gray-500 bg-blue-50 px-2 py-1 rounded">
                  {selectedTask.predecessors.length} tarea(s)
                </span>
              </div>
              
              {/* Lista de predecesoras actuales */}
              <div className="mb-3">
                {selectedTask.predecessors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTask.predecessors.map(predId => {
                      const predTask = tasksWithCPM.find(t => t.id === predId);
                      return predTask ? (
                        <div key={predId} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-blue-600">📋</span>
                            <div>
                              <div className="font-medium text-sm">{predTask.name}</div>
                              <div className="text-xs text-gray-600">WBS: {predTask.wbsCode} | Duración: {predTask.duration}d</div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newPreds = selectedTask.predecessors.filter(id => id !== predId);
                              updatePredecessors(selectedTask.id, newPreds.join(','));
                            }}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            title="Eliminar dependencia"
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        <div key={predId} className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-600 text-sm">
                          ⚠️ Tarea no encontrada: {predId}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <span className="text-lg">📝</span>
                    <div className="mt-2">No hay predecesoras definidas</div>
                    <div className="text-sm">Esta tarea puede comenzar inmediatamente</div>
                  </div>
                )}
              </div>
              
              {/* Agregar nueva predecesora */}
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <select
                    ref={predecessorSelectRef}
                    id="newPredecessor"
                    defaultValue=""
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Seleccionar tarea predecesora...</option>
                    {tasksWithCPM
                      .filter(t => t.id !== selectedTask.id && !selectedTask.predecessors.includes(t.id))
                      .map(task => (
                        <option key={task.id} value={task.id}>
                          {task.wbsCode} - {task.name} ({task.duration}d)
                        </option>
                      ))}
                  </select>
                  
                  <select
                    id="newDependencyType"
                    defaultValue="FS"
                    className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
                    title="Tipo de dependencia"
                  >
                    {Object.entries(DEPENDENCY_TYPES).map(([key, type]) => (
                      <option key={key} value={key} title={type.description}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => {
                      console.log('🔗 BOTÓN AGREGAR PREDECESORA - onClick disparado');
                      const select = document.getElementById('newPredecessor');
                      const dependencyTypeSelect = document.getElementById('newDependencyType');
                      console.log('🔗 BOTÓN AGREGAR PREDECESORA - select.value:', select?.value);
                      console.log('🔗 BOTÓN AGREGAR PREDECESORA - selectedTask:', selectedTask);
                      
                      if (select && select.value) {
                        const taskId = select.value;
                        console.log('🔗 BOTÓN AGREGAR PREDECESORA - taskId seleccionado:', taskId);
                        console.log('🔗 BOTÓN AGREGAR PREDECESORA - selectedTask.predecessors:', selectedTask.predecessors);
                        console.log('🔗 BOTÓN AGREGAR PREDECESORA - ¿Ya existe?', selectedTask.predecessors.includes(taskId));
                        
                        if (!selectedTask.predecessors.includes(taskId)) {
                          // Validar dependencia circular
                          if (hasCircularDependency(selectedTask.id, taskId)) {
                            alert(`❌ No se puede crear la dependencia: se detectaría una dependencia circular entre ${selectedTask.id} y ${taskId}`);
                            return;
                          }
                          
                          const newPreds = [...(selectedTask.predecessors || []), taskId];
                          const dependencyType = dependencyTypeSelect ? dependencyTypeSelect.value : 'FS';
                          
                          console.log('🔄 Agregando predecesora desde botón:', {
                            tarea: selectedTask.id,
                            nuevaPredecesora: taskId,
                            predecesorasAntes: selectedTask.predecessors,
                            predecesorasDespues: newPreds,
                            dependencyType
                          });
                          
                          updatePredecessors(selectedTask.id, newPreds.join(','), dependencyType);
                          select.value = '';
                        } else {
                          console.log('🔗 BOTÓN AGREGAR PREDECESORA - La predecesora ya existe');
                        }
                      } else {
                        console.log('🔗 BOTÓN AGREGAR PREDECESORA - No hay tarea seleccionada');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Agregar
                  </button>
                </div>
                
                {/* Información del tipo de dependencia seleccionado */}
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Tipo de dependencia:</strong> 
                  <span id="dependencyTypeInfo">
                    {DEPENDENCY_TYPES.FS.description}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Sucesoras */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-lg font-medium text-gray-700">Sucesoras (Tareas que dependen de esta)</label>
                <span className="text-sm text-gray-500 bg-green-50 px-2 py-1 rounded">
                  {selectedTask.successors.length} tarea(s)
                </span>
              </div>
              
              {/* Lista de sucesoras actuales */}
              <div className="mb-3">
                {selectedTask.successors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTask.successors.map(succId => {
                      const succTask = tasksWithCPM.find(t => t.id === succId);
                      return succTask ? (
                        <div key={succId} className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-green-600">📋</span>
                            <div>
                              <div className="font-medium text-sm">{succTask.name}</div>
                              <div className="text-xs text-gray-600">WBS: {succTask.wbsCode} | Duración: {succTask.duration}d</div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newSuccs = selectedTask.successors.filter(id => id !== succId);
                              // Actualizar la tarea sucesora para remover esta tarea de sus predecesoras
                              const updatedSucc = {
                                id: succTask.id,
                                wbsCode: succTask.wbsCode,
                                name: succTask.name,
                                duration: succTask.duration,
                                startDate: succTask.startDate,
                                endDate: succTask.endDate,
                                progress: succTask.progress,
                                predecessors: succTask.predecessors.filter(id => id !== selectedTask.id),
                                cost: succTask.cost,
                                priority: succTask.priority,
                                assignedTo: succTask.assignedTo,
                                isMilestone: succTask.isMilestone,
                                isCritical: succTask.isCritical,
                                originalDuration: succTask.originalDuration,
                                earlyStart: succTask.earlyStart,
                                earlyFinish: succTask.earlyFinish,
                                lateStart: succTask.lateStart,
                                lateFinish: succTask.lateFinish,
                                totalFloat: succTask.totalFloat,
                                freeFloat: succTask.freeFloat,
                                description: succTask.description,
                                resources: [...(succTask.resources || [])],
                                workPackageId: succTask.workPackageId,
                                status: succTask.status,
                                successors: [...(succTask.successors || [])]
                              };
                              setTasks(prev => prev.map(t => t.id === succId ? updatedSucc : t));
                              // Actualizar esta tarea
                              setSelectedTask(prev => ({
                                id: prev.id,
                                wbsCode: prev.wbsCode,
                                name: prev.name,
                                duration: prev.duration,
                                startDate: prev.startDate,
                                endDate: prev.endDate,
                                progress: prev.progress,
                                predecessors: [...(prev.predecessors || [])],
                                cost: prev.cost,
                                priority: prev.priority,
                                assignedTo: prev.assignedTo,
                                isMilestone: prev.isMilestone,
                                isCritical: prev.isCritical,
                                originalDuration: prev.originalDuration,
                                earlyStart: prev.earlyStart,
                                earlyFinish: prev.earlyFinish,
                                lateStart: prev.lateStart,
                                lateFinish: prev.lateFinish,
                                totalFloat: prev.totalFloat,
                                freeFloat: prev.freeFloat,
                                description: prev.description,
                                resources: [...(prev.resources || [])],
                                workPackageId: prev.workPackageId,
                                status: prev.status,
                                successors: newSuccs
                              }));
                            }}
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50"
                            title="Eliminar dependencia"
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        <div key={succId} className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-600 text-sm">
                          ⚠️ Tarea no encontrada: {succId}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <span className="text-lg">📝</span>
                    <div className="mt-2">No hay sucesoras definidas</div>
                    <div className="text-sm">Esta tarea no bloquea ninguna otra tarea</div>
                  </div>
                )}
              </div>
              
              {/* Agregar nueva sucesora */}
              <div className="flex space-x-2">
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask:', selectedTask?.id)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors:', selectedTask?.successors)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO SECCIÓN SUCESORAS - selectedTask.successors.length:', selectedTask?.successors?.length)}
                <select
                  ref={successorSelectRef}
                  id="newSuccessor"
                  defaultValue=""
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Seleccionar tarea sucesora...</option>
                  {tasksWithCPM
                    .filter(t => t.id !== selectedTask.id && !selectedTask.successors.includes(t.id))
                    .map(task => (
                      <option key={task.id} value={task.id}>
                        {task.wbsCode} - {task.name} ({task.duration}d)
                      </option>
                    ))}
                </select>
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask:', selectedTask?.id)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors:', selectedTask?.successors)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors.length:', selectedTask?.successors?.length)}
                {console.log('🟢 RENDERIZANDO BOTÓN AGREGAR SUCESORA - selectedTask.successors.length:', selectedTask?.successors?.length)}
                <button
                  onClick={() => {
                    console.log('🟢 BOTÓN AGREGAR SUCESORA - onClick ejecutado');
                    console.log('🟢 BOTÓN AGREGAR SUCESORA - selectedTask:', selectedTask?.id);
                    const select = document.getElementById('newSuccessor');
                    console.log('🟢 BOTÓN AGREGAR SUCESORA - select encontrado:', !!select);
                    console.log('🟢 BOTÓN AGREGAR SUCESORA - select.value:', select?.value);
                    if (select && select.value.trim()) {
                      const newSuccs = selectedTask.successors.slice().concat([select.value.trim()]);
                      console.log('🔄 Agregando sucesora desde select:', {
                        tarea: selectedTask.id,
                        nuevaSucesora: select.value.trim(),
                        sucesorasAntes: selectedTask.successors,
                        sucesorasDespues: newSuccs
                      });
                      
                      // Actualizar el estado local
                      const updatedTask = {
                        id: selectedTask.id,
                        wbsCode: selectedTask.wbsCode,
                        name: selectedTask.name,
                        duration: selectedTask.duration,
                        startDate: selectedTask.startDate,
                        endDate: selectedTask.endDate,
                        progress: selectedTask.progress,
                        predecessors: [...(selectedTask.predecessors || [])],
                        cost: selectedTask.cost,
                        priority: selectedTask.priority,
                        assignedTo: selectedTask.assignedTo,
                        isMilestone: selectedTask.isMilestone,
                        isCritical: selectedTask.isCritical,
                        originalDuration: selectedTask.originalDuration,
                        earlyStart: selectedTask.earlyStart,
                        earlyFinish: selectedTask.earlyFinish,
                        lateStart: selectedTask.lateStart,
                        lateFinish: selectedTask.lateFinish,
                        totalFloat: selectedTask.totalFloat,
                        freeFloat: selectedTask.freeFloat,
                        description: selectedTask.description,
                        resources: [...(selectedTask.resources || [])],
                        workPackageId: selectedTask.workPackageId,
                        status: selectedTask.status,
                        successors: newSuccs
                      };
                      // ACTUALIZAR SOLO EL ESTADO GLOBAL - NO setSelectedTask para evitar duplicación
                      setTasks(prev => {
                        const updated = prev.map(t => {
                        if (t.id === selectedTask.id) {
                          return updatedTask;
                        }
                        if (t.id === select.value.trim()) {
                          // Agregar esta tarea como predecesora de la sucesora
                          return {
                            id: t.id,
                            wbsCode: t.wbsCode,
                            name: t.name,
                            duration: t.duration,
                            startDate: t.startDate,
                            endDate: t.endDate,
                            progress: t.progress,
                            predecessors: [...(t.predecessors || []), selectedTask.id],
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
                          };
                        }
                        return t;
                        });
                        
                        // Actualizar selectedTask con la tarea actualizada del estado global
                        const updatedSelectedTask = updated.find(t => t.id === selectedTask.id);
                        if (updatedSelectedTask) {
                          setSelectedTask(updatedSelectedTask);
                        }
                        
                        return updated;
                      });
                      
                      select.value = '';
                    } else {
                      console.log('🟢 BOTÓN AGREGAR SUCESORA - Condición no cumplida:', {
                        select: !!select,
                        value: select?.value,
                        trimmed: select?.value?.trim()
                      });
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Agregar
                </button>
              </div>
              
              {/* Input manual para ID de tarea */}
              <div className="mt-2">
                <input
                  id="manualSuccessor"
                  type="text"
                  placeholder="O escribir ID de tarea manualmente..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      if (e.target.value.trim()) {
                        const newSuccs = selectedTask.successors.slice().concat([e.target.value.trim()]);
                        console.log('🔄 Agregando sucesora con Enter:', {
                          tarea: selectedTask.id,
                          nuevaSucesora: e.target.value.trim(),
                          sucesorasAntes: selectedTask.successors,
                          sucesorasDespues: newSuccs
                        });
                        
                        // Actualizar el estado local
                        const updatedTask = {
                          id: selectedTask.id,
                          wbsCode: selectedTask.wbsCode,
                          name: selectedTask.name,
                          duration: selectedTask.duration,
                          startDate: selectedTask.startDate,
                          endDate: selectedTask.endDate,
                          progress: selectedTask.progress,
                          predecessors: [...(selectedTask.predecessors || [])],
                          cost: selectedTask.cost,
                          priority: selectedTask.priority,
                          assignedTo: selectedTask.assignedTo,
                          isMilestone: selectedTask.isMilestone,
                          isCritical: selectedTask.isCritical,
                          originalDuration: selectedTask.originalDuration,
                          earlyStart: selectedTask.earlyStart,
                          earlyFinish: selectedTask.earlyFinish,
                          lateStart: selectedTask.lateStart,
                          lateFinish: selectedTask.lateFinish,
                          totalFloat: selectedTask.totalFloat,
                          freeFloat: selectedTask.freeFloat,
                          description: selectedTask.description,
                          resources: [...(selectedTask.resources || [])],
                          workPackageId: selectedTask.workPackageId,
                          status: selectedTask.status,
                          successors: newSuccs
                        };
                        // ACTUALIZAR SOLO EL ESTADO GLOBAL - NO setSelectedTask para evitar duplicación
                        setTasks(prev => {
                          const updated = prev.map(t => {
                          if (t.id === selectedTask.id) {
                            return updatedTask;
                          }
                          if (t.id === e.target.value.trim()) {
                            // Agregar esta tarea como predecesora de la sucesora
                            return {
                              id: t.id,
                              wbsCode: t.wbsCode,
                              name: t.name,
                              duration: t.duration,
                              startDate: t.startDate,
                              endDate: t.endDate,
                              progress: t.progress,
                              predecessors: [...(t.predecessors || []), selectedTask.id],
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
                            };
                          }
                          return t;
                          });
                          
                          // Actualizar selectedTask con la tarea actualizada del estado global
                          const updatedSelectedTask = updated.find(t => t.id === selectedTask.id);
                          if (updatedSelectedTask) {
                            setSelectedTask(updatedSelectedTask);
                          }
                          
                          return updated;
                        });
                        
                        e.target.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4">Recursos Asignados</h3>
            <div className="mb-4">
              <label htmlFor="assignedResources" className="block text-sm font-medium text-gray-700 mb-1">Recursos (separados por coma):</label>
              <input
                type="text"
                id="assignedResources"
                value={resourceAnalysis.resourceLoad[selectedTask.id]?.map(r => r.taskName).join(', ')}
                onChange={(e) => {
                  const resources = e.target.value.split(',').map(r => r.trim());
                  const currentAssignments = resourceAnalysis.resourceLoad[selectedTask.id] || [];
                  const newAssignments = resources.map(r => {
                    const existing = currentAssignments.find(a => a.taskName === r);
                    if (existing) {
                      return {
                        taskName: existing.taskName,
                        taskId: existing.taskId,
                        startDate: existing.startDate,
                        endDate: existing.endDate,
                        allocation: 100
                      }; // Reset allocation if resource already exists
                    } else {
                      return { taskName: r, taskId: selectedTask.id, startDate: selectedTask.startDate, endDate: selectedTask.endDate, allocation: 100 };
                    }
                  });
                  // Update resourceLoad state
                  setTasks(prev => {
                    const updatedTasks = prev.map(t => {
                      if (t.id === selectedTask.id) {
                        return {
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
                          resources: newAssignments.map(a => a.taskName),
                          workPackageId: t.workPackageId,
                          status: t.status,
                          successors: [...(t.successors || [])]
                        };
                      }
                      return t;
                    });
                    return updatedTasks;
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <h3 className="text-xl font-bold mb-4">Conflictos de Recursos</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Los conflictos de recursos se muestran en la vista de lista de tareas.
                Para ver los conflictos de recursos en el diagrama de red,
                necesitarías implementar un algoritmo de detección de conflictos
                en el diagrama de red mismo, lo cual es más complejo.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  console.log('❌ BOTÓN CANCELAR - Cerrando modal');
                  console.log('❌ BOTÓN CANCELAR - selectedTask ANTES:', selectedTask);
                  console.log('❌ BOTÓN CANCELAR - tasks.length ANTES:', tasks.length);
                  setSelectedTask(null);
                  console.log('❌ BOTÓN CANCELAR - selectedTask establecido a null');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - INICIANDO GUARDADO');
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - selectedTask:', selectedTask);
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - predecesoras ANTES:', selectedTask.predecessors);
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - sucesoras ANTES:', selectedTask.successors);
                  
                  // SOLUCIÓN: Usar selectedTask directamente (ya tiene los datos actualizados)
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - Usando selectedTask directamente:', {
                    id: selectedTask.id,
                    predecessors: selectedTask.predecessors,
                    successors: selectedTask.successors
                  });
                  
                  // Actualizar el estado global con currentTask y sincronizar dependencias bidireccionales
                  setTasks(prev => {
                    console.log('💾 BOTÓN GUARDAR CAMBIOS - tasks ANTES:', prev.map(t => ({
                      id: t.id,
                      name: t.name,
                      predecessors: t.predecessors,
                      successors: t.successors
                    })));
                    
                    // SOLUCIÓN RADICAL: Solo actualizar la tarea actual, NO sincronización bidireccional
                    const updatedTasks = prev.map(t => {
                      if (t.id === selectedTask.id) {
                        console.log('💾 BOTÓN GUARDAR CAMBIOS - Actualizando tarea:', t.id, 'con:', {
                          predecessors: selectedTask.predecessors,
                          successors: selectedTask.successors
                        });
                        return selectedTask;
                      }
                      
                      // NO hacer sincronización bidireccional por ahora
                      return t;
                    });
                    
                    console.log('💾 BOTÓN GUARDAR CAMBIOS - tasks DESPUÉS:', updatedTasks.map(t => ({
                      id: t.id,
                      name: t.name,
                      predecessors: t.predecessors,
                      successors: t.successors
                    })));
                    
                    return updatedTasks;
                  });
                  
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - predecesoras guardadas:', selectedTask.predecessors);
                  console.log('💾 BOTÓN GUARDAR CAMBIOS - sucesoras guardadas:', selectedTask.successors);
                  
                  setSelectedTask(null);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Guardar Cambios
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Vista de Caso de Negocio */}
        {showBusinessCase && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Caso de Negocio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Información del Proyecto</h3>
                <p><strong>Nombre:</strong> {businessCase.projectName}</p>
                <p><strong>Fecha de Inicio:</strong> {new Date(businessCase.startDate).toLocaleDateString('es')}</p>
                <p><strong>Fecha de Fin Planificada:</strong> {new Date(businessCase.plannedEndDate).toLocaleDateString('es')}</p>
                <p><strong>Inversión Total:</strong> ${businessCase.totalInvestment.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Beneficios Esperados</h3>
                <p><strong>Objetivo:</strong> {businessCase.objective}</p>
                <p><strong>Patrocinador:</strong> {businessCase.sponsor}</p>
                <p><strong>Gerente del Proyecto:</strong> {businessCase.manager}</p>
                <p><strong>Beneficios:</strong> {businessCase.expectedBenefits}</p>
                <p><strong>TIR (%):</strong> {businessCase.irr}</p>
                <p><strong>ROI (%):</strong> {businessCase.roi}</p>
                <p><strong>Tiempo de Retorno (años):</strong> {businessCase.paybackPeriod}</p>
                <p><strong>VPN:</strong> ${businessCase.npv.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowBusinessCase(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Vista de Análisis de Recursos */}
        {showResourceAnalysis && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Análisis de Recursos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Carga de Recursos</h3>
                {Object.entries(resourceAnalysis.resourceLoad).map(([resource, assignments]) => (
                  <div key={resource}>
                    <p><strong>{resource}:</strong> {assignments.length} tareas</p>
                    <ul>
                      {assignments.map(a => (
                        <li key={a.taskId}>{a.taskName} (Días: {diffDaysExclusive(a.startDate, addDays(a.endDate, 1, includeWeekends), includeWeekends)})</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Conflictos de Recursos</h3>
                {resourceAnalysis.conflicts.map(conflict => (
                  <p key={conflict.resource} className="text-red-600 text-sm">
                    Conflicto entre {conflict.task1} y {conflict.task2} por el recurso "{conflict.resource}" por {conflict.overlapDays} días.
                  </p>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Utilización de Recursos</h3>
                {Object.entries(resourceAnalysis.utilization).map(([resource, days]) => (
                  <p key={resource}><strong>{resource}:</strong> {days} días</p>
                ))}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Métricas de Recursos</h3>
                <p><strong>Total de Recursos:</strong> {Object.keys(resourceAnalysis.utilization).length}</p>
                <p><strong>Total de Días Asignados:</strong> {Object.values(resourceAnalysis.utilization).reduce((sum, d) => sum + d, 0)} días</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowResourceAnalysis(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Vista de Baseline - ELIMINADA (duplicada) */}
        {false && showBaseline && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Baseline</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-100 border border-gray-200">
                <thead>
                  <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Tarea</th>
                    <th className="py-3 px-6 text-left">Duración</th>
                    <th className="py-3 px-6 text-left">Inicio</th>
                    <th className="py-3 px-6 text-left">Fin</th>
                    <th className="py-3 px-6 text-left">Progreso</th>
                    <th className="py-3 px-6 text-left">Recursos</th>
                    <th className="py-3 px-6 text-left">Costo</th>
                    <th className="py-3 px-6 text-left">Estado</th>
                    <th className="py-3 px-6 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {baselineTasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium">{task.name}</span>
                          {task.isMilestone && <span className="ml-2 text-indigo-600 text-xs">🏹</span>}
                        </div>
                        <small className="text-gray-400">WBS: {task.wbsCode}</small>
                      </td>
                      <td className="py-3 px-6 text-left">
                        {task.duration} {ganttScale === 'days' ? 'días' : ganttScale === 'weeks' ? 'semanas' : 'meses'}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {(() => {
                          // Usar formato consistente para evitar problemas de zona horaria
                          if (!task.startDate || task.startDate === null || task.startDate === undefined) return '';
                          const [year, month, day] = task.startDate.split('-');
                          return new Date(year, month - 1, day).toLocaleDateString('es');
                        })()}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {(() => {
                          // Para hitos, usar la fecha de inicio como fecha de fin
                          if (task.isMilestone) {
                            // Usar formato consistente para evitar problemas de zona horaria
                            if (!task.startDate || task.startDate === null || task.startDate === undefined) return '';
                            const [year, month, day] = task.startDate.split('-');
                            return new Date(year, month - 1, day).toLocaleDateString('es');
                          }
                          
                          // Para tareas normales, usar la fecha de fin con formato consistente
                          if (!task.endDate || task.endDate === null || task.endDate === undefined) return '';
                          const [year, month, day] = task.endDate.split('-');
                          return new Date(year, month - 1, day).toLocaleDateString('es');
                        })()}
                      </td>
                      <td className="py-3 px-6 text-left">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{task.progress}%</span>
                      </td>
                      <td className="py-3 px-6 text-left">
                        {task.resources.map((r, index) => (
                          <span key={index} className="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-1">
                            {r}
                          </span>
                        ))}
                      </td>
                      <td className="py-3 px-6 text-left">
                        ${task.cost.toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-left">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)} {task.status}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-left">
                        <button
                          onClick={() => {
                            console.log('🔍 ABRIENDO TAREA PARA EDITAR:', {
                              id: task.id,
                              name: task.name,
                              predecessors: task.predecessors,
                              successors: task.successors
                            });
                            setSelectedTask(task);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => updateTask(task.id, 'progress', task.progress + 10)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Incrementar progreso"
                        >
                          ⬆️
                        </button>
                        <button
                          onClick={() => updateTask(task.id, 'progress', task.progress - 10)}
                          className="text-red-600 hover:text-red-900"
                          title="Disminuir progreso"
                        >
                          ⬇️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowBaseline(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      {/* MODAL COMPLETAMENTE NUEVO PARA AGREGAR TAREAS */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {newTaskData.insertAfterTaskId ? '🚀 Insertar Nueva Tarea' : '🚀 Agregar Nueva Tarea'}
                  </h2>
                  {newTaskData.insertAfterTaskId && (
                    <p className="text-sm text-gray-600 mt-1">
                      La tarea se insertará después de: <span className="font-medium text-indigo-600">
                        {tasksWithCPM.find(t => t.id === newTaskData.insertAfterTaskId)?.name || 'Tarea anterior'}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">📋 Información Básica</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Tarea *
                    </label>
                    <input
                      type="text"
                      value={newTaskData.name}
                      onChange={(e) => setNewTaskData(prev => ({
                        name: e.target.value,
                        duration: prev.duration,
                        startDate: prev.startDate,
                        endDate: prev.endDate,
                        description: prev.description,
                        priority: prev.priority,
                        assignedTo: prev.assignedTo,
                        cost: prev.cost,
                        selectedPredecessors: [...(prev.selectedPredecessors || [])],
                        selectedSuccessors: [...(prev.selectedSuccessors || [])]
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ingresa el nombre de la tarea"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData(prev => ({
                        name: prev.name,
                        duration: prev.duration,
                        startDate: prev.startDate,
                        endDate: prev.endDate,
                        description: e.target.value,
                        priority: prev.priority,
                        assignedTo: prev.assignedTo,
                        cost: prev.cost,
                        selectedPredecessors: [...(prev.selectedPredecessors || [])],
                        selectedSuccessors: [...(prev.selectedSuccessors || [])]
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Describe la tarea..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duración (días) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newTaskData.duration}
                        onChange={(e) => {
                          const duration = parseInt(e.target.value) || 1;
                          const newEndDate = addDays(newTaskData.startDate, duration, includeWeekends);
                          setNewTaskData(prev => ({ 
                            name: prev.name,
                            duration: duration,
                            startDate: prev.startDate,
                            endDate: newEndDate,
                            description: prev.description,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            cost: prev.cost,
                            selectedPredecessors: [...(prev.selectedPredecessors || [])],
                            selectedSuccessors: [...(prev.selectedSuccessors || [])]
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Costo ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newTaskData.cost}
                        onChange={(e) => setNewTaskData(prev => ({
                          name: prev.name,
                          duration: prev.duration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          description: prev.description,
                          priority: prev.priority,
                          assignedTo: prev.assignedTo,
                          cost: parseFloat(e.target.value) || 0,
                          selectedPredecessors: [...(prev.selectedPredecessors || [])],
                          selectedSuccessors: [...(prev.selectedSuccessors || [])]
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        value={newTaskData.startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          const newEndDate = addDays(newStartDate, newTaskData.duration, includeWeekends);
                          setNewTaskData(prev => ({ 
                            name: prev.name,
                            duration: prev.duration,
                            startDate: newStartDate,
                            endDate: newEndDate,
                            description: prev.description,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            cost: prev.cost,
                            selectedPredecessors: [...(prev.selectedPredecessors || [])],
                            selectedSuccessors: [...(prev.selectedSuccessors || [])]
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Fin
                      </label>
                      <input
                        type="date"
                        value={newTaskData.endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value;
                          const newDuration = Math.ceil((new Date(newEndDate) - new Date(newTaskData.startDate)) / (1000 * 60 * 60 * 24));
                          setNewTaskData(prev => ({ 
                            name: prev.name,
                            duration: newDuration > 0 ? newDuration : 1,
                            startDate: prev.startDate,
                            endDate: newEndDate,
                            description: prev.description,
                            priority: prev.priority,
                            assignedTo: prev.assignedTo,
                            cost: prev.cost,
                            selectedPredecessors: [...(prev.selectedPredecessors || [])],
                            selectedSuccessors: [...(prev.selectedSuccessors || [])]
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData(prev => ({
                          name: prev.name,
                          duration: prev.duration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          description: prev.description,
                          priority: e.target.value,
                          assignedTo: prev.assignedTo,
                          cost: prev.cost,
                          selectedPredecessors: [...(prev.selectedPredecessors || [])],
                          selectedSuccessors: [...(prev.selectedSuccessors || [])]
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">🟢 Baja</option>
                        <option value="medium">🟡 Media</option>
                        <option value="high">🔴 Alta</option>
                        <option value="critical">🚨 Crítica</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asignado a
                      </label>
                      <input
                        type="text"
                        value={newTaskData.assignedTo}
                        onChange={(e) => setNewTaskData(prev => ({
                          name: prev.name,
                          duration: prev.duration,
                          startDate: prev.startDate,
                          endDate: prev.endDate,
                          description: prev.description,
                          priority: prev.priority,
                          assignedTo: e.target.value,
                          cost: prev.cost,
                          selectedPredecessors: [...(prev.selectedPredecessors || [])],
                          selectedSuccessors: [...(prev.selectedSuccessors || [])]
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre del responsable"
                      />
                    </div>
                  </div>
                </div>

                {/* Dependencias */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">🔗 Dependencias</h3>
                  
                  {/* Predecesoras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Predecesoras ({newTaskData.selectedPredecessors.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No hay tareas existentes</p>
                      ) : (
                        tasks.map(task => (
                          <label key={task.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded">
                            <input
                              type="checkbox"
                              checked={newTaskData.selectedPredecessors.includes(task.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  console.log('🚀 NUEVO SISTEMA - Agregando predecesora:', task.id, task.wbsCode, task.name);
                                  setNewTaskData(prev => {
                                    const newPreds = prev.selectedPredecessors.slice().concat([task.id]);
                                    console.log('🚀 NUEVO SISTEMA - Predecesoras actualizadas:', newPreds);
                                    return {
                                      name: prev.name,
                                      duration: prev.duration,
                                      startDate: prev.startDate,
                                      endDate: prev.endDate,
                                      description: prev.description,
                                      priority: prev.priority,
                                      assignedTo: prev.assignedTo,
                                      cost: prev.cost,
                                      selectedPredecessors: newPreds,
                                      selectedSuccessors: [...(prev.selectedSuccessors || [])]
                                    };
                                  });
                                } else {
                                  console.log('🚀 NUEVO SISTEMA - Removiendo predecesora:', task.id, task.wbsCode, task.name);
                                  setNewTaskData(prev => {
                                    const newPreds = prev.selectedPredecessors.filter(id => id !== task.id);
                                    console.log('🚀 NUEVO SISTEMA - Predecesoras actualizadas:', newPreds);
                                    return {
                                      name: prev.name,
                                      duration: prev.duration,
                                      startDate: prev.startDate,
                                      endDate: prev.endDate,
                                      description: prev.description,
                                      priority: prev.priority,
                                      assignedTo: prev.assignedTo,
                                      cost: prev.cost,
                                      selectedPredecessors: newPreds,
                                      selectedSuccessors: [...(prev.selectedSuccessors || [])]
                                    };
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">
                              <span className="font-medium">{task.wbsCode}</span> - {task.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sucesoras */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sucesoras ({newTaskData.selectedSuccessors.length})
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No hay tareas existentes</p>
                      ) : (
                        tasks.map(task => (
                          <label key={task.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded">
                            <input
                              type="checkbox"
                              checked={newTaskData.selectedSuccessors.includes(task.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  console.log('🚀 NUEVO SISTEMA - Agregando sucesora:', task.id, task.wbsCode, task.name);
                                  setNewTaskData(prev => {
                                    const newSuccs = prev.selectedSuccessors.slice().concat([task.id]);
                                    console.log('🚀 NUEVO SISTEMA - Sucesoras actualizadas:', newSuccs);
                                    return {
                                      name: prev.name,
                                      duration: prev.duration,
                                      startDate: prev.startDate,
                                      endDate: prev.endDate,
                                      description: prev.description,
                                      priority: prev.priority,
                                      assignedTo: prev.assignedTo,
                                      cost: prev.cost,
                                      selectedPredecessors: [...(prev.selectedPredecessors || [])],
                                      selectedSuccessors: newSuccs
                                    };
                                  });
                                } else {
                                  console.log('🚀 NUEVO SISTEMA - Removiendo sucesora:', task.id, task.wbsCode, task.name);
                                  setNewTaskData(prev => {
                                    const newSuccs = prev.selectedSuccessors.filter(id => id !== task.id);
                                    console.log('🚀 NUEVO SISTEMA - Sucesoras actualizadas:', newSuccs);
                                    return {
                                      name: prev.name,
                                      duration: prev.duration,
                                      startDate: prev.startDate,
                                      endDate: prev.endDate,
                                      description: prev.description,
                                      priority: prev.priority,
                                      assignedTo: prev.assignedTo,
                                      cost: prev.cost,
                                      selectedPredecessors: [...(prev.selectedPredecessors || [])],
                                      selectedSuccessors: newSuccs
                                    };
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">
                              <span className="font-medium">{task.wbsCode}</span> - {task.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Información de dependencias */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Información sobre Dependencias</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <strong>Predecesoras:</strong> Tareas que deben completarse antes de esta</li>
                      <li>• <strong>Sucesoras:</strong> Tareas que dependen de esta tarea</li>
                      <li>• Las dependencias se sincronizan automáticamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Calcular insertIndex en el momento del clic
                    const currentTasks = tasks || [];
                    const insertAfterTaskId = newTaskData.insertAfterTaskId;
                    let calculatedInsertIndex = null;
                    
                    if (insertAfterTaskId) {
                      const insertAfterIndex = currentTasks.findIndex(task => task.id === insertAfterTaskId);
                      if (insertAfterIndex !== -1) {
                        calculatedInsertIndex = insertAfterIndex + 1;
                        console.log('🚀 DEBUG - Calculando insertIndex en el momento del clic:', {
                          insertAfterTaskId,
                          insertAfterIndex,
                          calculatedInsertIndex,
                          totalTasks: currentTasks.length
                        });
                      }
                    }
                    
                    createTaskFromModal(calculatedInsertIndex);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>✅</span>
                  <span>Crear Tarea</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Minuta */}
      <MinutaModal
        isOpen={isMinutaModalOpen}
        onClose={handleCloseMinutaModal}
        hitos={tasks.filter(task => task.isMilestone)}
        onSave={handleSaveMinuta}
      />

      {/* Modal de Edición de Minuta */}
      <EditMinutaModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        minuta={editingMinuta}
        hitos={tasks.filter(task => task.isMilestone)}
        onUpdate={handleUpdateMinuta}
      />

      {/* Asistente Inteligente de Cronogramas */}
      {showAIWizard && console.log('🔍 DEBUG - ScheduleWizard props:', {
        projectId: projectData?.id,
        organizationId: projectData?.organizationId,
        userId: supabaseService.currentUser?.id,
        projectDataKeys: projectData ? Object.keys(projectData) : 'null',
        projectData: projectData
      })}
      <ScheduleWizard
        isOpen={showAIWizard}
        onClose={() => setShowAIWizard(false)}
        onComplete={handleAIScheduleGenerated}
        projectId={projectData?.id}
        currentProject={projectData}
        organizationId={projectData?.organizationId}
        userId={supabaseService.currentUser?.id}
      />
    </div>
  );
};

export default ScheduleManagement;
