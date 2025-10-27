import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook para sincronizar datos a Supabase con debounce y batch updates
 *
 * @param {Function} syncFunction - Función que ejecuta la sincronización
 * @param {number} delay - Tiempo de espera en ms (default: 3000)
 * @returns {Object} { sync, isSyncing, lastSync, error, cancelSync }
 */
const useDebouncedSync = (syncFunction, delay = 3000) => {
  const timeoutRef = useRef(null);
  const isSyncingRef = useRef(false);
  const lastSyncRef = useRef(null);
  const errorRef = useRef(null);
  const pendingDataRef = useRef(null);

  /**
   * Cancela la sincronización pendiente
   */
  const cancelSync = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log('🚫 Sincronización cancelada');
    }
  }, []);

  /**
   * Ejecuta la sincronización inmediatamente
   */
  const executeSync = useCallback(async (data) => {
    if (isSyncingRef.current) {
      console.log('⏳ Sincronización ya en progreso, esperando...');
      return;
    }

    try {
      isSyncingRef.current = true;
      errorRef.current = null;

      // Disparar evento de inicio
      window.dispatchEvent(new CustomEvent('autoSaveStart', {
        detail: { timestamp: new Date().toISOString() }
      }));

      console.log('🔄 Ejecutando sincronización...');
      await syncFunction(data);

      lastSyncRef.current = new Date();
      console.log('✅ Sincronización completada:', lastSyncRef.current.toLocaleTimeString());

      // Disparar evento de éxito
      window.dispatchEvent(new CustomEvent('autoSaveComplete', {
        detail: {
          timestamp: new Date().toISOString(),
          lastSync: lastSyncRef.current
        }
      }));

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      errorRef.current = error;

      // Disparar evento de error
      window.dispatchEvent(new CustomEvent('autoSaveError', {
        detail: {
          timestamp: new Date().toISOString(),
          error: error.message
        }
      }));

      // Guardar en localStorage para reintentar después
      try {
        const retryData = {
          data: pendingDataRef.current,
          timestamp: new Date().toISOString(),
          error: error.message
        };
        localStorage.setItem('pendingSyncData', JSON.stringify(retryData));
        console.log('💾 Datos guardados en localStorage para reintentar');
      } catch (storageError) {
        console.error('❌ Error guardando para reintento:', storageError);
      }

    } finally {
      isSyncingRef.current = false;
      pendingDataRef.current = null;
    }
  }, [syncFunction]);

  /**
   * Programa una sincronización con debounce
   */
  const sync = useCallback((data) => {
    // Guardar los datos pendientes
    pendingDataRef.current = data;

    // Cancelar timeout anterior
    cancelSync();

    // Programar nueva sincronización
    console.log(`⏱️  Sincronización programada en ${delay}ms`);
    timeoutRef.current = setTimeout(() => {
      executeSync(data);
    }, delay);

  }, [delay, cancelSync, executeSync]);

  /**
   * Sincronización inmediata (sin debounce)
   */
  const syncNow = useCallback((data) => {
    cancelSync();
    executeSync(data);
  }, [cancelSync, executeSync]);

  /**
   * Limpiar timeouts al desmontar
   */
  useEffect(() => {
    return () => {
      cancelSync();
    };
  }, [cancelSync]);

  /**
   * Intentar sincronizar datos pendientes al montar
   */
  useEffect(() => {
    const retryPendingSync = async () => {
      try {
        const pendingDataStr = localStorage.getItem('pendingSyncData');
        if (pendingDataStr) {
          const retryData = JSON.parse(pendingDataStr);
          console.log('🔄 Reintentando sincronización pendiente desde:', retryData.timestamp);

          await executeSync(retryData.data);

          // Si tuvo éxito, limpiar
          localStorage.removeItem('pendingSyncData');
          console.log('✅ Sincronización pendiente completada');
        }
      } catch (error) {
        console.error('❌ Error en reintento de sincronización:', error);
      }
    };

    // Esperar 2 segundos antes de reintentar (dar tiempo a que la app se inicialice)
    const retryTimeout = setTimeout(retryPendingSync, 2000);

    return () => clearTimeout(retryTimeout);
  }, [executeSync]);

  return {
    sync,           // Sincronizar con debounce
    syncNow,        // Sincronizar inmediatamente
    isSyncing: isSyncingRef.current,
    lastSync: lastSyncRef.current,
    error: errorRef.current,
    cancelSync
  };
};

export default useDebouncedSync;
