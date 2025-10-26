// ==========================================
// 🆕 NUEVO ARCHIVO: hooks/useOrganizationId.js
// ==========================================
// Hook personalizado para detectar organization_id
// sin hardcodeo y con manejo de errores

import { useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para obtener el organization_id actual del usuario
 * Reemplaza el hardcodeo '73bf164f-f3e8-4207-95a6-e3e3d385148d'
 * 
 * @param {Object} options - Opciones de configuración
 * @param {string} options.fallbackFromProject - Organization ID del proyecto actual
 * @param {boolean} options.required - Si es requerido (muestra error si no se encuentra)
 * @returns {Object} { organizationId, loading, error }
 */
const useOrganizationId = (options = {}) => {
  const {
    fallbackFromProject = null,
    required = true
  } = options;

  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const detectOrganization = async () => {
      try {
        setLoading(true);
        setError(null);

        // PRIORIDAD 1: Organization ID del proyecto actual
        if (fallbackFromProject) {
          console.log('✅ Organization ID detectado desde proyecto:', fallbackFromProject);
          setOrganizationId(fallbackFromProject);
          setLoading(false);
          return;
        }

        // PRIORIDAD 2: Organization ID del servicio Supabase
        const detectedOrgId = supabaseService.getCurrentOrganization();
        
        if (detectedOrgId) {
          console.log('✅ Organization ID detectado desde servicio:', detectedOrgId);
          setOrganizationId(detectedOrgId);
          setLoading(false);
          return;
        }

        // PRIORIDAD 3: Forzar detección automática
        console.log('🔍 Intentando detectar organización automáticamente...');
        const autoDetectedOrgId = await supabaseService.detectUserOrganization();
        
        if (autoDetectedOrgId) {
          console.log('✅ Organization ID auto-detectado:', autoDetectedOrgId);
          setOrganizationId(autoDetectedOrgId);
          setLoading(false);
          return;
        }

        // NO SE ENCONTRÓ ORGANIZACIÓN
        const errorMsg = 'No se pudo detectar organization_id. El usuario no pertenece a ninguna organización.';
        console.error('❌', errorMsg);
        
        if (required) {
          setError(errorMsg);
        }
        
        setOrganizationId(null);
        setLoading(false);

      } catch (err) {
        console.error('❌ Error detectando organización:', err);
        setError(err.message);
        setOrganizationId(null);
        setLoading(false);
      }
    };

    detectOrganization();
  }, [fallbackFromProject, required]);

  return {
    organizationId,
    loading,
    error,
    // Funciones auxiliares
    isValid: !!organizationId,
    hasError: !!error
  };
};

export default useOrganizationId;
