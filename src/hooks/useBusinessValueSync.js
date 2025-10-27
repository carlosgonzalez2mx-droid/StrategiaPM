import { useEffect, useCallback, useMemo } from 'react';
import { calculateAllTasksBusinessValue } from '../utils/businessValueCalculator';
import useDebouncedSync from './useDebouncedSync';

/**
 * Hook para calcular y sincronizar automáticamente businessValue de tareas
 *
 * @param {Array} tasks - Array de tareas
 * @param {Object} projectData - Datos del proyecto (con plannedValue)
 * @param {Function} supabaseService - Servicio de Supabase para sincronización
 * @param {boolean} useSupabase - Si está habilitado Supabase
 * @returns {Object} { tasksWithValue, isSyncing, lastSync, recalculate }
 */
const useBusinessValueSync = (tasks, projectData, supabaseService, useSupabase = false) => {

  /**
   * Calcular businessValue automáticamente en memoria
   */
  const tasksWithValue = useMemo(() => {
    // Si no hay proyecto o plannedValue, retornar tareas sin modificar
    if (!projectData?.plannedValue) {
      console.log('⚠️ No se puede calcular businessValue: falta plannedValue del proyecto');
      return tasks;
    }

    // Verificar si hay tareas con businessValue = 0 o undefined
    const hasTasksWithoutValue = tasks.some(task =>
      task.businessValue === undefined || task.businessValue === null || task.businessValue === 0
    );

    if (!hasTasksWithoutValue) {
      console.log('✅ Todas las tareas ya tienen businessValue calculado');
      return tasks;
    }

    console.log('🔄 Calculando businessValue automáticamente...');
    console.log('📊 Datos del proyecto:', {
      plannedValue: projectData.plannedValue,
      totalTasks: tasks.length
    });

    // Calcular valores de negocio para todas las tareas
    const calculatedTasksArray = calculateAllTasksBusinessValue(
      tasks,
      projectData.plannedValue
    );

    // Crear un mapa de ID -> businessValue
    const calculatedValuesMap = new Map();
    calculatedTasksArray.forEach(task => {
      calculatedValuesMap.set(task.id, task.businessValue);
    });

    // Aplicar valores calculados solo a tareas con businessValue = 0
    const tasksWithCalculatedValues = tasks.map(task => {
      if (task.businessValue === undefined || task.businessValue === null || task.businessValue === 0) {
        const calculatedValue = calculatedValuesMap.get(task.id) || 0;
        console.log(`💰 Tarea "${task.name}": businessValue calculado = $${calculatedValue.toFixed(2)}`);
        return {
          ...task,
          businessValue: calculatedValue
        };
      }
      return task;
    });

    return tasksWithCalculatedValues;
  }, [tasks, projectData?.plannedValue]);

  /**
   * Función para sincronizar a Supabase (batch update)
   */
  const syncToSupabase = useCallback(async (tasksToSync) => {
    if (!useSupabase || !supabaseService || !projectData?.id) {
      console.log('⏭️ Sincronización a Supabase deshabilitada');
      return;
    }

    console.log('💾 Sincronizando businessValue a Supabase...');
    console.log(`   Tareas a sincronizar: ${tasksToSync.length}`);

    try {
      console.log('💾 Iniciando sincronización de businessValue a Supabase...');
      console.log(`   Total de tareas a sincronizar: ${tasksToSync.length}`);

      // Actualizar cada tarea individualmente para evitar problemas con RLS
      // RLS (Row-Level Security) puede bloquear UPSERT pero permitir UPDATE
      let successCount = 0;
      let errorCount = 0;

      for (const task of tasksToSync) {
        try {
          const { error } = await supabaseService.supabase
            .from('tasks')
            .update({
              business_value: task.businessValue || 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)
            .eq('project_id', projectData.id);

          if (error) {
            console.error(`❌ Error actualizando tarea ${task.id}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (taskError) {
          console.error(`❌ Error inesperado en tarea ${task.id}:`, taskError);
          errorCount++;
        }
      }

      console.log(`✅ Sincronización completada: ${successCount} exitosas, ${errorCount} errores`);

      if (errorCount > 0) {
        throw new Error(`${errorCount} tareas no se pudieron sincronizar`);
      }

    } catch (error) {
      console.error('❌ Error sincronizando businessValue a Supabase:', error);
      throw error; // Re-lanzar para que useDebouncedSync lo maneje
    }
  }, [useSupabase, supabaseService, projectData?.id]);

  /**
   * Hook de sincronización con debounce
   */
  const { sync, syncNow, isSyncing, lastSync, error } = useDebouncedSync(syncToSupabase, 3000);

  /**
   * Sincronizar automáticamente cuando cambian los valores calculados
   */
  useEffect(() => {
    // Solo sincronizar si:
    // 1. Supabase está habilitado
    // 2. Hay tareas con valores calculados
    // 3. Los valores son diferentes a los originales
    if (useSupabase && tasksWithValue.length > 0) {
      // Verificar si hay cambios
      const hasChanges = tasksWithValue.some((task, index) => {
        const originalTask = tasks[index];
        return originalTask && task.businessValue !== originalTask.businessValue;
      });

      if (hasChanges) {
        console.log('🔄 Valores de negocio cambiaron, programando sincronización...');
        sync(tasksWithValue);
      }
    }
  }, [tasksWithValue, useSupabase, sync, tasks]);

  /**
   * Función para forzar recálculo y sincronización inmediata
   */
  const recalculate = useCallback(() => {
    console.log('🔄 Recalculando y sincronizando inmediatamente...');

    // Forzar recálculo poniendo todos los businessValue en 0
    const tasksToRecalc = tasks.map(task => ({
      ...task,
      businessValue: 0
    }));

    // Recalcular
    const recalculatedTasks = calculateAllTasksBusinessValue(
      tasksToRecalc,
      projectData?.plannedValue
    );

    // Sincronizar inmediatamente (sin debounce)
    if (useSupabase) {
      syncNow(recalculatedTasks);
    }

    return recalculatedTasks;
  }, [tasks, projectData?.plannedValue, useSupabase, syncNow]);

  return {
    tasksWithValue,      // Tareas con businessValue calculado
    isSyncing,           // Estado de sincronización
    lastSync,            // Última sincronización exitosa
    error,               // Error si lo hay
    recalculate,         // Función para forzar recálculo
    syncNow: () => syncNow(tasksWithValue)  // Sincronizar ahora
  };
};

export default useBusinessValueSync;
