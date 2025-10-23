// ==========================================
// 🆕 NUEVO ARCHIVO: utils/debugLog.js
// ==========================================
// Sistema de logging condicional
// Solo muestra logs en desarrollo, no en producción

/**
 * Log condicional que solo aparece en desarrollo
 * @param {string} context - Contexto del log (ej: 'OrganizationMembers', 'loadMembers')
 * @param {string} message - Mensaje a mostrar
 * @param {any} data - Datos opcionales a mostrar
 */
export const debugLog = (context, message, data = null) => {
  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toLocaleTimeString('es-MX', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const logMessage = `🔍 [${timestamp}] ${context}: ${message}`;
    
    if (data !== null) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

/**
 * Log de error condicional
 * @param {string} context - Contexto del error
 * @param {string} message - Mensaje de error
 * @param {Error|any} error - Objeto de error
 */
export const debugError = (context, message, error = null) => {
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toLocaleTimeString('es-MX', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const logMessage = `❌ [${timestamp}] ${context}: ${message}`;
    
    if (error) {
      console.error(logMessage, error);
    } else {
      console.error(logMessage);
    }
  }
};

/**
 * Log de éxito condicional
 * @param {string} context - Contexto del éxito
 * @param {string} message - Mensaje de éxito
 * @param {any} data - Datos opcionales
 */
export const debugSuccess = (context, message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toLocaleTimeString('es-MX', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const logMessage = `✅ [${timestamp}] ${context}: ${message}`;
    
    if (data !== null) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
};

/**
 * Log de advertencia condicional
 * @param {string} context - Contexto de la advertencia
 * @param {string} message - Mensaje de advertencia
 * @param {any} data - Datos opcionales
 */
export const debugWarn = (context, message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toLocaleTimeString('es-MX', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const logMessage = `⚠️ [${timestamp}] ${context}: ${message}`;
    
    if (data !== null) {
      console.warn(logMessage, data);
    } else {
      console.warn(logMessage);
    }
  }
};

/**
 * Agrupa logs bajo un título colapsable
 * @param {string} groupName - Nombre del grupo
 * @param {Function} callback - Función que contiene los logs a agrupar
 */
export const debugGroup = (groupName, callback) => {
  if (process.env.NODE_ENV !== 'production') {
    console.group(groupName);
    callback();
    console.groupEnd();
  }
};

/**
 * Agrupa logs bajo un título colapsado por defecto
 * @param {string} groupName - Nombre del grupo
 * @param {Function} callback - Función que contiene los logs a agrupar
 */
export const debugGroupCollapsed = (groupName, callback) => {
  if (process.env.NODE_ENV !== 'production') {
    console.groupCollapsed(groupName);
    callback();
    console.groupEnd();
  }
};

// Exportar todo como objeto por si se prefiere usar debugLog.log() en lugar de debugLog()
const debugLogUtils = {
  log: debugLog,
  error: debugError,
  success: debugSuccess,
  warn: debugWarn,
  group: debugGroup,
  groupCollapsed: debugGroupCollapsed
};

export default debugLogUtils;

