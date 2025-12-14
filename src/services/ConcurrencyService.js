/**
 * @fileoverview ConcurrencyService - Servicio para control de concurrencia optimista
 * 
 * Maneja la detección y resolución de conflictos cuando múltiples usuarios
 * modifican los mismos datos simultáneamente.
 * 
 * @module services/ConcurrencyService
 */

/**
 * Servicio para manejar control de concurrencia optimista
 */
class ConcurrencyService {
    constructor(supabaseService) {
        this.supabase = supabaseService;
    }

    /**
     * Guardar con control de concurrencia optimista
     * 
     * @param {string} tableName - Nombre de la tabla
     * @param {object} record - Registro a guardar
     * @param {string} originalUpdatedAt - Timestamp original del registro
     * @returns {Promise<{success: boolean, conflict?: boolean, data?: any}>}
     */
    async saveWithOptimisticLocking(tableName, record, originalUpdatedAt) {
        try {
            // 1. Obtener versión actual de la base de datos
            const { data: currentRecord, error: fetchError } = await this.supabase.supabase
                .from(tableName)
                .select('updated_at, *')
                .eq('id', record.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching current record:', fetchError);
                return { success: false, error: fetchError };
            }

            // 2. Si el registro no existe, es una inserción
            if (!currentRecord) {
                const { data, error } = await this.supabase.supabase
                    .from(tableName)
                    .insert({
                        ...record,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                return { success: !error, data, error };
            }

            // 3. Detectar conflicto de versión
            const currentTimestamp = new Date(currentRecord.updated_at).getTime();
            const originalTimestamp = new Date(originalUpdatedAt).getTime();

            if (currentTimestamp > originalTimestamp) {
                console.warn('🔴 CONFLICTO DETECTADO:', {
                    table: tableName,
                    recordId: record.id,
                    currentUpdatedAt: currentRecord.updated_at,
                    originalUpdatedAt: originalUpdatedAt
                });

                return {
                    success: false,
                    conflict: true,
                    message: 'Otro usuario modificó este registro',
                    currentData: currentRecord,
                    yourData: record
                };
            }

            // 4. Guardar con nueva versión (usando condición de versión)
            const newUpdatedAt = new Date().toISOString();
            const { data, error } = await this.supabase.supabase
                .from(tableName)
                .update({
                    ...record,
                    updated_at: newUpdatedAt
                })
                .eq('id', record.id)
                .eq('updated_at', originalUpdatedAt) // Condición crítica
                .select()
                .single();

            // 5. Si no se actualizó ningún registro, hubo un conflicto de carrera
            if (!data && !error) {
                return {
                    success: false,
                    conflict: true,
                    message: 'Conflicto de carrera: otro usuario guardó primero'
                };
            }

            return { success: !error, data, error };

        } catch (error) {
            console.error('Error in saveWithOptimisticLocking:', error);
            return { success: false, error };
        }
    }

    /**
     * Guardar múltiples registros con control de concurrencia
     * 
     * @param {Array<{table: string, record: object, originalUpdatedAt: string}>} changes
     * @returns {Promise<{success: boolean, conflicts: Array, results: Array}>}
     */
    async saveBatchWithOptimisticLocking(changes) {
        const results = [];
        const conflicts = [];

        for (const change of changes) {
            const result = await this.saveWithOptimisticLocking(
                change.table,
                change.record,
                change.originalUpdatedAt
            );

            results.push({
                table: change.table,
                recordId: change.record.id,
                result
            });

            if (result.conflict) {
                conflicts.push({
                    table: change.table,
                    recordId: change.record.id,
                    currentData: result.currentData,
                    yourData: result.yourData
                });
            }
        }

        return {
            success: conflicts.length === 0,
            conflicts,
            results
        };
    }

    /**
     * Detectar cambios entre dos versiones de un objeto
     * 
     * @param {object} original - Versión original
     * @param {object} modified - Versión modificada
     * @returns {object} Objeto con solo los campos que cambiaron
     */
    detectChanges(original, modified) {
        const changes = {};

        for (const key in modified) {
            if (JSON.stringify(original[key]) !== JSON.stringify(modified[key])) {
                changes[key] = modified[key];
            }
        }

        return changes;
    }

    /**
     * Intentar merge automático de cambios no conflictivos
     * 
     * @param {object} base - Versión base
     * @param {object} yours - Tus cambios
     * @param {object} theirs - Cambios del otro usuario
     * @returns {{merged: object, conflicts: Array}}
     */
    autoMerge(base, yours, theirs) {
        const merged = { ...base };
        const conflicts = [];

        const yourChanges = this.detectChanges(base, yours);
        const theirChanges = this.detectChanges(base, theirs);

        // Aplicar cambios que no conflictúan
        for (const key in yourChanges) {
            if (!(key in theirChanges)) {
                // Solo tú modificaste este campo
                merged[key] = yourChanges[key];
            } else if (JSON.stringify(yourChanges[key]) === JSON.stringify(theirChanges[key])) {
                // Ambos hicieron el mismo cambio
                merged[key] = yourChanges[key];
            } else {
                // Conflicto: ambos modificaron el mismo campo de manera diferente
                conflicts.push({
                    field: key,
                    baseValue: base[key],
                    yourValue: yourChanges[key],
                    theirValue: theirChanges[key]
                });
            }
        }

        // Aplicar cambios que solo hizo el otro usuario
        for (const key in theirChanges) {
            if (!(key in yourChanges)) {
                merged[key] = theirChanges[key];
            }
        }

        return { merged, conflicts };
    }
}

export default ConcurrencyService;
