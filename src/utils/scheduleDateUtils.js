/**
 * @fileoverview Utilidades de manipulación de fechas para cronogramas
 * @module utils/scheduleDateUtils
 */

import { DAY } from './scheduleConstants';

/**
 * Convierte una fecha a formato ISO (YYYY-MM-DD)
 * @param {Date|string} d - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
export const toISO = (d) => {
  if (!d) return new Date().toISOString().split('T')[0];
  const date = new Date(d);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date in toISO:', d);
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

/**
 * Verifica si un día es laboral (lunes a viernes)
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} true si es día laboral
 */
export const isWorkingDay = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Lunes, 5=Viernes
};

/**
 * Ajusta una fecha al siguiente día laborable
 * @param {Date|string} date - Fecha a ajustar
 * @returns {Date} Fecha ajustada
 */
export const adjustToWorkingDay = (date) => {
  let adjustedDate = new Date(date);
  while (!isWorkingDay(adjustedDate)) {
    adjustedDate.setDate(adjustedDate.getDate() + 1);
  }
  return adjustedDate;
};

/**
 * Encuentra el primer día laboral desde una fecha
 * @param {Date|string} startDate - Fecha de inicio
 * @returns {string} Fecha del primer día laboral en formato ISO
 */
export const findFirstWorkingDay = (startDate) => {
  let current = new Date(startDate);
  while (!isWorkingDay(current)) {
    current.setDate(current.getDate() + 1);
  }
  return toISO(current);
};

/**
 * Añade días laborales (excluye sábados y domingos)
 * @param {Date|string} date - Fecha inicial
 * @param {number} days - Número de días a añadir
 * @returns {string} Fecha resultante en formato ISO
 */
export const addWorkingDays = (date, days) => {
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

/**
 * Añade días (laborales o calendario según configuración)
 * @param {Date|string} date - Fecha inicial
 * @param {number} days - Número de días a añadir
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {string} Fecha resultante en formato ISO
 */
export const addDays = (date, days, includeWeekends = false) => {
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

/**
 * Calcula diferencia de días (exclusivo)
 * @param {Date|string} a - Fecha inicial
 * @param {Date|string} b - Fecha final
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {number} Diferencia en días
 */
export const diffDaysExclusive = (a, b, includeWeekends = false) => {
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

/**
 * Calcula diferencia de columnas visibles (exclusivo)
 * @param {Date|string} a - Fecha inicial
 * @param {Date|string} b - Fecha final
 * @returns {number} Diferencia en columnas
 */
export const diffVisibleColumnsExclusive = (a, b) => {
  const d1 = new Date(toISO(a));
  const d2 = new Date(toISO(b));
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / DAY));
};

/**
 * Encuentra el índice de columna de una fecha
 * @param {Date|string} targetDate - Fecha objetivo
 * @param {Date|string} referenceStartDate - Fecha de referencia
 * @param {boolean} includeWeekends - Si true, incluye fines de semana
 * @returns {number} Índice de columna
 */
export const findColumnIndex = (targetDate, referenceStartDate, includeWeekends) => {
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
    // ✅ CORRECCIÓN: Incluir la fecha de inicio en el conteo para alineación perfecta
    while (current <= target) {
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

/**
 * Calcula duración de columnas visibles (inclusivo)
 * @param {Date|string} start - Fecha inicial
 * @param {Date|string} end - Fecha final
 * @returns {number} Duración en columnas
 */
export const durationVisibleColumnsInclusive = (start, end) => {
  const d1 = new Date(toISO(start));
  const d2 = new Date(toISO(end));
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / DAY) + 1);
};

/**
 * Calcula duración de días (inclusivo)
 * @param {Date|string} start - Fecha inicial
 * @param {Date|string} end - Fecha final
 * @param {boolean} [includeWeekends=false] - Si true, incluye fines de semana
 * @returns {number} Duración en días
 */
export const durationDaysInclusive = (start, end, includeWeekends = false) => {
  if (includeWeekends) {
    // Comportamiento original: días calendario
    return diffDaysExclusive(start, addDays(end, 1, true), true);
  } else {
    // Comportamiento corregido: contar columnas visibles que abarca la tarea
    return durationVisibleColumnsInclusive(start, end);
  }
};

/**
 * Limita un valor entre 0 y 1
 * @param {number} x - Valor a limitar
 * @returns {number} Valor limitado
 */
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Parsea una fecha de Excel (número serial)
 * @param {number|string|Date} v - Valor a parsear
 * @returns {string} Fecha en formato ISO
 */
export const parseExcelDate = (v) => {
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return toISO(new Date(ms));
  }
  if (!v) return toISO(new Date());
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? toISO(new Date()) : toISO(d);
};
