/**
 * @fileoverview useTaskMutations - Hook para mutaciones de tareas con tracking de cambios
 * 
 * Intercepta todas las llamadas a setTasks() para detectar qué cambió exactamente
 * y registrar los cambios en el sistema de concurrencia.
 * 
 * @module hooks/useTaskMutations
 */

import { useCallback } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useConcurrency } from '../contexts/ConcurrencyContext';

/**
 * Hook para mutaciones de tareas con tracking de cambios
 * 
 * Proporciona una función setTasks que:
 * - Detecta qué campos cambiaron exactamente
 * - Registra cambios en el sistema de concurrencia
 * - Mantiene timestamps originales
 * 
 * @returns {Object} Objeto con función setTasks
 */
export const useTaskMutations = () => {
    const { getCurrentProjectTasks, updateCurrentProjectTasks, getTaskTimestamp } = useTasks();
    const { recordChange, enabled } = useConcurrency();

    /**
     * Detectar cambios entre dos arrays de tareas
     * 
     * @param {Array} oldTasks - Tareas originales
     * @param {Array} newTasks - Tareas modificadas
     * @returns {Array} Lista de cambios detectados
     */
    const detectChanges = useCallback((oldTasks, newTasks) => {
        const changes = [];

        newTasks.forEach(newTask => {
            const oldTask = oldTasks.find(t => t.id === newTask.id);

            if (!oldTask) {
                // Nueva tarea
                changes.push({
                    type: 'create',
                    id: newTask.id,
                    data: newTask
                });
            } else {
                // Detectar campos modificados
                Object.keys(newTask).forEach(field => {
                    if (JSON.stringify(oldTask[field]) !== JSON.stringify(newTask[field])) {
                        changes.push({
                            type: 'update',
                            id: newTask.id,
                            field,
                            oldValue: oldTask[field],
                            newValue: newTask[field],
                            originalTimestamp: getTaskTimestamp(newTask.id)
                        });
                    }
                });
            }
        });

        // Detectar tareas eliminadas
        oldTasks.forEach(oldTask => {
            if (!newTasks.find(t => t.id === oldTask.id)) {
                changes.push({
                    type: 'delete',
                    id: oldTask.id
                });
            }
        });

        return changes;
    }, [getTaskTimestamp]);

    /**
     * Función setTasks con tracking de cambios
     * 
     * Acepta tanto un valor directo como una función updater (como useState)
     * 
     * @param {Array|Function} updaterOrValue - Nuevas tareas o función updater
     */
    const setTasks = useCallback((updaterOrValue) => {
        const currentTasks = getCurrentProjectTasks();
        const newTasks = typeof updaterOrValue === 'function'
            ? updaterOrValue(currentTasks)
            : updaterOrValue;

        // Detectar cambios
        const changes = detectChanges(currentTasks, newTasks);

        // Registrar en sistema de concurrencia (solo si está habilitado)
        if (enabled) {
            changes.forEach(change => {
                if (change.type === 'update') {
                    recordChange('tasks', change.id, change.field, change.newValue, change.originalTimestamp);
                }
            });
        }

        // Actualizar estado
        updateCurrentProjectTasks(newTasks);
    }, [getCurrentProjectTasks, updateCurrentProjectTasks, detectChanges, recordChange, enabled]);

    return { setTasks };
};

export default useTaskMutations;
