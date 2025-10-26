/**
 * @fileoverview Funciones de validación y seguridad para el módulo de cronogramas
 * @module utils/scheduleValidation
 */

/**
 * Sanitiza input de usuario para prevenir ataques XSS
 * @param {string|any} input - Input a sanitizar
 * @returns {string|any} Input sanitizado o el valor original si no es string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers
    .replace(/[<>]/g, '') // Remover < y >
    .trim()
    .substring(0, 1000); // Limitar longitud
};

/**
 * Valida el nombre de una tarea
 * @param {string} name - Nombre de la tarea
 * @returns {{valid: boolean, error?: string, sanitized?: string}} Resultado de la validación
 */
export const validateTaskName = (name) => {
  if (!name || typeof name !== 'string') return { valid: false, error: 'Nombre de tarea requerido' };
  if (name.length < 2) return { valid: false, error: 'Nombre debe tener al menos 2 caracteres' };
  if (name.length > 255) return { valid: false, error: 'Nombre muy largo (máximo 255 caracteres)' };
  return { valid: true, sanitized: sanitizeInput(name) };
};

/**
 * Valida la duración de una tarea
 * @param {number|string} duration - Duración en días
 * @returns {{valid: boolean, error?: string, value?: number}} Resultado de la validación
 */
export const validateDuration = (duration) => {
  const num = parseInt(duration);
  if (isNaN(num) || num < 0 || num > 365) {
    return { valid: false, error: 'Duración debe ser un número entre 0 y 365 días' };
  }
  return { valid: true, value: num };
};

/**
 * Valida una fecha
 * @param {string|Date} date - Fecha a validar
 * @returns {{valid: boolean, error?: string, value?: string}} Resultado de la validación
 */
export const validateDate = (date) => {
  // Importar toISO de forma lazy para evitar dependencias circulares
  const toISO = (d) => {
    if (!d) return new Date().toISOString().split('T')[0];
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date in toISO:', d);
      return new Date().toISOString().split('T')[0];
    }
    return dateObj.toISOString().split('T')[0];
  };

  if (!date) return { valid: false, error: 'Fecha requerida' };
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return { valid: false, error: 'Fecha inválida' };
  const currentYear = new Date().getFullYear();
  if (dateObj.getFullYear() < 2020 || dateObj.getFullYear() > currentYear + 10) {
    return { valid: false, error: 'Fecha fuera del rango permitido (2020-' + (currentYear + 10) + ')' };
  }
  return { valid: true, value: toISO(dateObj) };
};

/**
 * Ordena tareas por su código WBS
 * @param {Array<Object>} tasks - Array de tareas
 * @returns {Array<Object>} Tareas ordenadas
 */
export const sortTasksByWbsCode = (tasks) => {
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
