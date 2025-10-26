/**
 * Utilidades para calcular valor de negocio basado en TIR y prioridad
 * Sistema híbrido: cálculo automático + ajuste manual
 */

/**
 * Calcula el valor planificado total del proyecto basado en TIR
 * @param {number} budget - Presupuesto/inversión del proyecto
 * @param {number} irr - TIR del proyecto (en formato 0-100, ej: 25.5 = 25.5%)
 * @param {number} period - Periodo en años (default: 3)
 * @returns {number} Valor planificado total del proyecto
 */
export const calculatePlannedValueFromIRR = (budget, irr, period = 3) => {
  if (!budget || budget <= 0) return 0;
  if (!irr || irr <= 0) return budget; // Si no hay TIR, valor = presupuesto

  // Convertir TIR de porcentaje (25.5) a decimal (0.255)
  const irrDecimal = irr / 100;

  // Fórmula: Valor Futuro = Inversión × (1 + TIR)^período
  const valorFuturo = budget * Math.pow(1 + irrDecimal, period);

  return Math.round(valorFuturo);
};

/**
 * Mapea prioridad de texto/código a peso numérico
 * @param {string} priority - "critical"/"Crítica", "high"/"Alta", "medium"/"Media", "low"/"Baja"
 * @returns {number} Peso de criticidad
 */
export const getPriorityWeight = (priority) => {
  // Normalizar a lowercase para comparación
  const normalizedPriority = (priority || '').toLowerCase();

  const weights = {
    'critical': 2.0,  // Crítica
    'crítica': 2.0,
    'high': 1.5,      // Alta
    'alta': 1.5,
    'medium': 1.0,    // Media
    'media': 1.0,
    'low': 0.5,       // Baja
    'baja': 0.5
  };

  return weights[normalizedPriority] || 1.0; // Default: Media
};

/**
 * Calcula el valor de negocio de UNA tarea de forma proporcional
 * Esta función requiere conocer TODAS las tareas del proyecto para distribuir correctamente
 *
 * @param {number} taskCost - Costo de la tarea actual
 * @param {string} taskPriority - Prioridad de la tarea actual
 * @param {number} projectPlannedValue - Valor planificado total del proyecto
 * @param {Array} allTasks - Array de TODAS las tareas del proyecto
 * @returns {number} Valor de negocio sugerido para esta tarea
 */
export const calculateTaskBusinessValue = (
  taskCost,
  taskPriority,
  projectPlannedValue,
  allTasks = []
) => {
  if (!taskCost || taskCost <= 0) return 0;
  if (!projectPlannedValue || projectPlannedValue <= 0) return taskCost; // Fallback: valor = costo

  // Calcular peso de esta tarea
  const taskWeight = getPriorityWeight(taskPriority);
  const taskWeightedCost = taskCost * taskWeight;

  // Calcular peso total de TODAS las tareas
  const totalWeightedCost = allTasks.reduce((sum, task) => {
    const cost = task.cost || 0;
    const weight = getPriorityWeight(task.priority);
    return sum + (cost * weight);
  }, 0);

  // Si no hay tareas o peso total es 0, usar proporción simple por costo
  if (totalWeightedCost === 0) {
    const totalCost = allTasks.reduce((sum, task) => sum + (task.cost || 0), 0);
    if (totalCost === 0) return projectPlannedValue; // Una sola tarea sin costo
    return Math.round(projectPlannedValue * (taskCost / totalCost));
  }

  // Calcular proporción de esta tarea
  const proportion = taskWeightedCost / totalWeightedCost;

  // Calcular valor de negocio
  const businessValue = projectPlannedValue * proportion;

  return Math.round(businessValue);
};

/**
 * Calcula el valor de negocio de TODAS las tareas de un proyecto
 * Asegura que la suma de todos los businessValue = plannedValue del proyecto
 *
 * @param {Array} tasks - Array de tareas con {cost, priority}
 * @param {number} projectPlannedValue - Valor planificado del proyecto
 * @returns {Array} Array de tareas con businessValue calculado
 */
export const calculateAllTasksBusinessValue = (tasks, projectPlannedValue) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];
  if (!projectPlannedValue || projectPlannedValue <= 0) {
    // Si no hay valor planificado, asignar valor = costo
    return tasks.map(task => ({
      ...task,
      businessValue: task.cost || 0
    }));
  }

  // Calcular peso total
  const totalWeightedCost = tasks.reduce((sum, task) => {
    const cost = task.cost || 0;
    const weight = getPriorityWeight(task.priority);
    return sum + (cost * weight);
  }, 0);

  if (totalWeightedCost === 0) {
    // Si todas las tareas tienen costo 0, distribuir equitativamente
    const valuePerTask = Math.round(projectPlannedValue / tasks.length);
    return tasks.map(task => ({
      ...task,
      businessValue: valuePerTask
    }));
  }

  // Calcular businessValue para cada tarea
  let remainingValue = projectPlannedValue;
  const tasksWithValue = tasks.map((task, index) => {
    const cost = task.cost || 0;
    const weight = getPriorityWeight(task.priority);
    const weightedCost = cost * weight;
    const proportion = weightedCost / totalWeightedCost;

    let businessValue;

    // Para la última tarea, asignar el valor restante para evitar errores de redondeo
    if (index === tasks.length - 1) {
      businessValue = remainingValue;
    } else {
      businessValue = Math.round(projectPlannedValue * proportion);
      remainingValue -= businessValue;
    }

    return {
      ...task,
      businessValue: Math.max(0, businessValue) // Asegurar que no sea negativo
    };
  });

  return tasksWithValue;
};

/**
 * Calcula el valor de negocio entregado por una tarea
 * @param {number} businessValue - Valor de negocio total de la tarea
 * @param {number} progress - Progreso de la tarea (0-100)
 * @returns {number} Valor de negocio entregado
 */
export const calculateDeliveredValue = (businessValue, progress) => {
  if (!businessValue || businessValue <= 0) return 0;
  if (!progress || progress <= 0) return 0;
  if (progress >= 100) return businessValue;

  return Math.round((businessValue * progress) / 100);
};

/**
 * Valida si el valor planificado del proyecto cuadra con la suma de valores de tareas
 * @param {number} plannedValue - Valor planificado del proyecto
 * @param {Array} tasks - Array de tareas con businessValue
 * @returns {object} { isValid, difference, percentageDiff, totalTasksValue, plannedValue }
 */
export const validatePlannedValue = (plannedValue, tasks) => {
  const totalTasksValue = tasks.reduce((sum, task) => sum + (task.businessValue || 0), 0);
  const difference = totalTasksValue - plannedValue;
  const percentageDiff = plannedValue > 0 ? (difference / plannedValue) * 100 : 0;

  // Se considera válido si la diferencia es menor al 5%
  const isValid = Math.abs(percentageDiff) <= 5;

  return {
    isValid,
    difference,
    percentageDiff: Math.round(percentageDiff * 100) / 100,
    totalTasksValue,
    plannedValue
  };
};

/**
 * Recalcula automáticamente el businessValue de todas las tareas
 * basado en cambios en costos, prioridades o plannedValue del proyecto
 *
 * @param {Array} tasks - Array de tareas actuales
 * @param {number} projectPlannedValue - Valor planificado del proyecto
 * @param {Array} tasksToRecalculate - IDs de tareas que NO deben recalcularse (fueron editadas manualmente)
 * @returns {Array} Array de tareas con businessValue actualizado
 */
export const smartRecalculateBusinessValue = (
  tasks,
  projectPlannedValue,
  tasksToKeep = []
) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];

  // Separar tareas que mantienen su valor manual vs tareas a recalcular
  const tasksToKeepManual = tasks.filter(t => tasksToKeep.includes(t.id));
  const tasksToRecalculate = tasks.filter(t => !tasksToKeep.includes(t.id));

  if (tasksToRecalculate.length === 0) {
    // Todas las tareas son manuales, no recalcular nada
    return tasks;
  }

  // Valor ya asignado manualmente
  const manualValue = tasksToKeepManual.reduce((sum, t) => sum + (t.businessValue || 0), 0);

  // Valor disponible para distribuir entre tareas a recalcular
  const remainingValue = Math.max(0, projectPlannedValue - manualValue);

  // Recalcular solo las tareas no-manuales
  const recalculatedTasks = calculateAllTasksBusinessValue(tasksToRecalculate, remainingValue);

  // Combinar tareas manuales + recalculadas
  const allTasks = [...tasksToKeepManual, ...recalculatedTasks];

  // Ordenar por ID original para mantener orden
  allTasks.sort((a, b) => {
    const indexA = tasks.findIndex(t => t.id === a.id);
    const indexB = tasks.findIndex(t => t.id === b.id);
    return indexA - indexB;
  });

  return allTasks;
};

/**
 * Obtiene información descriptiva de una prioridad
 * @param {string} priority - Código de prioridad
 * @returns {object} { label, weight, color }
 */
export const getPriorityInfo = (priority) => {
  const normalized = (priority || '').toLowerCase();

  const info = {
    'critical': { label: 'Crítica', weight: 2.0, color: 'red' },
    'crítica': { label: 'Crítica', weight: 2.0, color: 'red' },
    'high': { label: 'Alta', weight: 1.5, color: 'orange' },
    'alta': { label: 'Alta', weight: 1.5, color: 'orange' },
    'medium': { label: 'Media', weight: 1.0, color: 'yellow' },
    'media': { label: 'Media', weight: 1.0, color: 'yellow' },
    'low': { label: 'Baja', weight: 0.5, color: 'green' },
    'baja': { label: 'Baja', weight: 0.5, color: 'green' }
  };

  return info[normalized] || { label: 'Media', weight: 1.0, color: 'yellow' };
};
