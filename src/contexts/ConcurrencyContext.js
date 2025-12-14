/**
 * @fileoverview ConcurrencyContext - Control de concurrencia optimista
 * 
 * Proporciona infraestructura para detectar y resolver conflictos cuando
 * múltiples usuarios editan los mismos datos simultáneamente.
 * 
 * Características:
 * - Tracking de timestamps originales
 * - Registro de cambios pendientes
 * - Feature flag para habilitar/deshabilitar
 * - Detección de conflictos antes de guardar
 * 
 * @module contexts/ConcurrencyContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const ConcurrencyContext = createContext(null);

/**
 * Hook para acceder al contexto de concurrencia
 * 
 * @returns {Object} Contexto de concurrencia
 * @throws {Error} Si se usa fuera de ConcurrencyProvider
 */
export const useConcurrency = () => {
    const context = useContext(ConcurrencyContext);
    if (!context) {
        throw new Error('useConcurrency debe usarse dentro de ConcurrencyProvider');
    }
    return context;
};

/**
 * Provider de contexto para control de concurrencia
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos
 */
export const ConcurrencyProvider = ({ children }) => {
    // Timestamps originales de registros (para detectar cambios concurrentes)
    const [timestamps, setTimestamps] = useState(new Map());

    // Cambios pendientes de guardar
    const [pendingChanges, setPendingChanges] = useState(new Map());

    // Feature flag - ACTIVADO para testing
    const [enabled, setEnabled] = useState(true);

    /**
     * Registrar un cambio pendiente
     * 
     * @param {string} table - Nombre de la tabla
     * @param {string} recordId - ID del registro
     * @param {string} field - Campo modificado
     * @param {*} value - Nuevo valor
     * @param {string} originalTimestamp - Timestamp original del registro
     */
    const recordChange = useCallback((table, recordId, field, value, originalTimestamp) => {
        if (!enabled) return; // No hacer nada si está deshabilitado

        const key = `${table}:${recordId}`;
        setPendingChanges(prev => {
            const updated = new Map(prev);
            if (!updated.has(key)) {
                updated.set(key, {
                    table,
                    recordId,
                    fields: {},
                    originalTimestamp
                });
            }
            updated.get(key).fields[field] = value;
            return updated;
        });
    }, [enabled]);

    /**
     * Limpiar todos los cambios pendientes
     */
    const clearChanges = useCallback(() => {
        setPendingChanges(new Map());
    }, []);

    /**
     * Obtener timestamp original de un registro
     * 
     * @param {string} table - Nombre de la tabla
     * @param {string} recordId - ID del registro
     * @returns {string|undefined} Timestamp original
     */
    const getTimestamp = useCallback((table, recordId) => {
        const key = `${table}:${recordId}`;
        return timestamps.get(key);
    }, [timestamps]);

    /**
     * Establecer timestamp original de un registro
     * 
     * @param {string} table - Nombre de la tabla
     * @param {string} recordId - ID del registro
     * @param {string} timestamp - Timestamp a guardar
     */
    const setTimestamp = useCallback((table, recordId, timestamp) => {
        setTimestamps(prev => {
            const updated = new Map(prev);
            const key = `${table}:${recordId}`;
            updated.set(key, timestamp);
            return updated;
        });
    }, []);

    /**
     * Obtener todos los cambios pendientes
     * 
     * @returns {Array} Array de cambios pendientes
     */
    const getPendingChanges = useCallback(() => {
        return Array.from(pendingChanges.values());
    }, [pendingChanges]);

    const value = {
        // Estado
        timestamps,
        pendingChanges,
        enabled,

        // Setters
        setTimestamps,
        setEnabled,

        // Funciones
        recordChange,
        clearChanges,
        getTimestamp,
        setTimestamp,
        getPendingChanges
    };

    return (
        <ConcurrencyContext.Provider value={value}>
            {children}
        </ConcurrencyContext.Provider>
    );
};

export default ConcurrencyContext;
