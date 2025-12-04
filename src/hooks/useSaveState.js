import { useState, useEffect, useRef } from 'react';

/**
 * Hook para detectar cambios sin guardar
 * Compara el estado actual con el último estado guardado
 * 
 * @param {Object} data - Datos actuales del portafolio
 * @returns {Object} - { hasUnsavedChanges, markAsSaved, getChangedFields }
 */
export function useUnsavedChanges(data) {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const savedDataRef = useRef(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Ignorar el primer render (carga inicial)
        if (isInitialMount.current) {
            isInitialMount.current = false;
            savedDataRef.current = JSON.stringify(data);
            return;
        }

        // Comparar datos actuales con datos guardados
        const currentData = JSON.stringify(data);
        const hasChanges = currentData !== savedDataRef.current;

        if (hasChanges !== hasUnsavedChanges) {
            setHasUnsavedChanges(hasChanges);
        }
    }, [data]);

    /**
     * Marcar los datos actuales como guardados
     */
    const markAsSaved = () => {
        savedDataRef.current = JSON.stringify(data);
        setHasUnsavedChanges(false);
    };

    /**
     * Obtener campos que han cambiado (útil para debugging)
     */
    const getChangedFields = () => {
        if (!savedDataRef.current) return [];

        try {
            const saved = JSON.parse(savedDataRef.current);
            const current = data;
            const changed = [];

            // Comparar campos principales
            const fields = [
                'projects',
                'currentProjectId',
                'tasksByProject',
                'risksByProject',
                'purchaseOrdersByProject',
                'advancesByProject',
                'invoicesByProject',
                'contractsByProject',
                'globalResources',
                'resourceAssignmentsByProject'
            ];

            fields.forEach(field => {
                if (JSON.stringify(saved[field]) !== JSON.stringify(current[field])) {
                    changed.push(field);
                }
            });

            return changed;
        } catch (error) {
            console.error('Error comparing data:', error);
            return [];
        }
    };

    return {
        hasUnsavedChanges,
        markAsSaved,
        getChangedFields
    };
}

/**
 * Hook para prevenir cierre de ventana con cambios sin guardar
 * 
 * @param {boolean} hasUnsavedChanges - Si hay cambios sin guardar
 * @param {string} message - Mensaje a mostrar (opcional)
 */
export function useBeforeUnload(hasUnsavedChanges, message = '') {
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                // Chrome requiere returnValue
                e.returnValue = message || '¿Seguro que quieres salir? Hay cambios sin guardar.';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, message]);
}

/**
 * Hook para atajo de teclado Ctrl+S / Cmd+S
 * 
 * @param {Function} onSave - Función a ejecutar al presionar Ctrl+S
 * @param {boolean} enabled - Si el atajo está habilitado
 */
export function useSaveShortcut(onSave, enabled = true) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+S (Windows/Linux) o Cmd+S (Mac)
            if (enabled && (e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onSave, enabled]);
}
