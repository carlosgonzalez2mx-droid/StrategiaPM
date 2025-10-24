/**
 * @fileoverview Utilidades para precargar componentes lazy de forma estratégica
 * @module utils/preloadComponents
 */

/**
 * Precarga un componente lazy para mejorar la UX
 * @param {Function} lazyComponent - Componente cargado con React.lazy()
 * @returns {Promise} Promise de la carga del componente
 */
export const preloadComponent = (lazyComponent) => {
  // React.lazy retorna un objeto con un método _init que es una Promise
  // Llamar al método preload() si existe, o forzar la carga
  const componentPromise = lazyComponent._result;

  if (componentPromise) {
    return componentPromise;
  }

  // Si no hay resultado cacheado, forzar la carga
  return lazyComponent._ctor ? lazyComponent._ctor() : Promise.resolve();
};

/**
 * Precarga múltiples componentes en paralelo
 * @param {Array<Function>} components - Array de componentes lazy
 * @returns {Promise<Array>} Promise que se resuelve cuando todos los componentes están cargados
 */
export const preloadComponents = (components) => {
  return Promise.all(components.map(component => preloadComponent(component)));
};

/**
 * Precarga componentes con delay para no bloquear la carga inicial
 * @param {Array<Function>} components - Array de componentes lazy
 * @param {number} [delay=1000] - Delay en milisegundos antes de iniciar la precarga
 * @returns {Promise<Array>} Promise que se resuelve cuando todos los componentes están cargados
 */
export const preloadComponentsDelayed = (components, delay = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(preloadComponents(components));
    }, delay);
  });
};

/**
 * Precarga componentes cuando el navegador esté idle
 * @param {Array<Function>} components - Array de componentes lazy
 * @returns {void}
 */
export const preloadComponentsOnIdle = (components) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadComponents(components).catch(err => {
        console.warn('Error precargando componentes en idle:', err);
      });
    });
  } else {
    // Fallback para navegadores que no soportan requestIdleCallback
    setTimeout(() => {
      preloadComponents(components).catch(err => {
        console.warn('Error precargando componentes:', err);
      });
    }, 2000);
  }
};

/**
 * Precarga componentes al hacer hover sobre un elemento
 * @param {Function} lazyComponent - Componente lazy a precargar
 * @returns {Function} Handler de onMouseEnter
 */
export const createPreloadHandler = (lazyComponent) => {
  let preloaded = false;

  return () => {
    if (!preloaded) {
      preloaded = true;
      preloadComponent(lazyComponent).catch(err => {
        console.warn('Error precargando componente en hover:', err);
        preloaded = false; // Permitir reintentar en caso de error
      });
    }
  };
};

export default {
  preloadComponent,
  preloadComponents,
  preloadComponentsDelayed,
  preloadComponentsOnIdle,
  createPreloadHandler
};
