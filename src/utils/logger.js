/**
 * Sistema de logging condicional para StrategiaPM
 * 
 * En desarrollo: Muestra todos los logs
 * En producción: Solo muestra errores críticos
 * 
 * Uso:
 * import { logger } from './utils/logger';
 * logger.debug('Mensaje de debug');
 * logger.info('Información general');
 * logger.warn('Advertencia');
 * logger.error('Error crítico');
 * 
 * @module logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Formatea el timestamp para los logs
 * @returns {string} Timestamp formateado
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
};

/**
 * Formatea el mensaje con timestamp y nivel
 * @param {string} level - Nivel del log
 * @param {Array} args - Argumentos del log
 * @returns {Array} Argumentos formateados
 */
const formatMessage = (level, args) => {
  if (!isDevelopment) return args;

  const timestamp = getTimestamp();
  const levelColors = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';

  return [`${levelColors[level]}[${timestamp}] ${level}${reset}`, ...args];
};

/**
 * Logger principal con métodos para diferentes niveles
 */
export const logger = {
  /**
   * Log de debug - Solo en desarrollo
   * @param {...any} args - Argumentos a loguear
   */
  debug: (...args) => {
    if (isDevelopment && !isTest) {
      console.log(...formatMessage('DEBUG', args));
    }
  },

  /**
   * Log de información - Solo en desarrollo
   * @param {...any} args - Argumentos a loguear
   */
  info: (...args) => {
    if (isDevelopment && !isTest) {
      console.info(...formatMessage('INFO', args));
    }
  },

  /**
   * Log de advertencia - En desarrollo y producción
   * @param {...any} args - Argumentos a loguear
   */
  warn: (...args) => {
    if (!isTest) {
      console.warn(...formatMessage('WARN', args));
    }
  },

  /**
   * Log de error - Siempre activo (crítico para debugging en producción)
   * @param {...any} args - Argumentos a loguear
   */
  error: (...args) => {
    console.error(...formatMessage('ERROR', args));
  },

  /**
   * Log de tabla - Solo en desarrollo
   * @param {Object|Array} data - Datos a mostrar en tabla
   */
  table: (data) => {
    if (isDevelopment && !isTest) {
      console.table(data);
    }
  },

  /**
   * Agrupa logs relacionados - Solo en desarrollo
   * @param {string} label - Etiqueta del grupo
   * @param {Function} callback - Función con logs a agrupar
   */
  group: (label, callback) => {
    if (isDevelopment && !isTest) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Mide el tiempo de ejecución - Solo en desarrollo
   * @param {string} label - Etiqueta del timer
   */
  time: (label) => {
    if (isDevelopment && !isTest) {
      console.time(label);
    }
  },

  /**
   * Finaliza la medición de tiempo - Solo en desarrollo
   * @param {string} label - Etiqueta del timer
   */
  timeEnd: (label) => {
    if (isDevelopment && !isTest) {
      console.timeEnd(label);
    }
  },
};

/**
 * Logger especializado para Supabase con emojis consistentes
 */
export const supabaseLogger = {
  init: (...args) => logger.debug('🚀', ...args),
  success: (...args) => logger.debug('✅', ...args),
  error: (...args) => logger.error('❌', ...args),
  warning: (...args) => logger.warn('⚠️', ...args),
  loading: (...args) => logger.debug('🔍', ...args),
  save: (...args) => logger.debug('💾', ...args),
  delete: (...args) => logger.debug('🗑️', ...args),
  update: (...args) => logger.debug('🔄', ...args),
  auth: (...args) => logger.debug('🔐', ...args),
  data: (...args) => logger.debug('📊', ...args),
};

/**
 * Logger especializado para operaciones de archivos
 */
export const fileLogger = {
  debug: (...args) => logger.debug('📁', ...args),
  load: (...args) => logger.debug('📂', ...args),
  save: (...args) => logger.debug('💾', ...args),
  upload: (...args) => logger.debug('📤', ...args),
  download: (...args) => logger.debug('📥', ...args),
  delete: (...args) => logger.debug('🗑️', ...args),
  warn: (...args) => logger.warn('⚠️', ...args),
  error: (...args) => logger.error('❌', ...args),
  success: (...args) => logger.debug('✅', ...args),
};

/**
 * Logger especializado para operaciones de tareas/cronograma
 */
export const scheduleLogger = {
  calculate: (...args) => logger.debug('🧮', ...args),
  update: (...args) => logger.debug('📝', ...args),
  import: (...args) => logger.debug('📂', ...args),
  export: (...args) => logger.debug('📤', ...args),
  error: (...args) => logger.error('❌', ...args),
  warning: (...args) => logger.warn('⚠️', ...args),
};

// Export por defecto
export default logger;
