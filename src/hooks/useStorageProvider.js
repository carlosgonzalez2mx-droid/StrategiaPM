import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para gestionar el proveedor de almacenamiento (local/Supabase)
 *
 * Responsabilidades:
 * - Verificar disponibilidad de Supabase
 * - Gestionar el proveedor activo (local/supabase)
 * - Permitir cambio de proveedor
 *
 * @returns {Object} Estado y funciones del proveedor de almacenamiento
 */
const useStorageProvider = () => {
  const [storageProvider, setStorageProvider] = useState('local'); // 'local' o 'supabase'
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(true);

  // Verificar disponibilidad de Supabase al inicializar
  useEffect(() => {
    checkSupabaseAvailability();
  }, []);

  /**
   * Verifica si Supabase está disponible y configura el proveedor
   */
  const checkSupabaseAvailability = useCallback(async () => {
    setIsCheckingSupabase(true);

    try {
      if (supabaseService.isAuthenticated()) {
        console.log('🔍 Verificando disponibilidad de Supabase Storage...');
        const isAvailable = await supabaseService.initializeStorage();
        setIsSupabaseAvailable(isAvailable);
        setStorageProvider(isAvailable ? 'supabase' : 'local');
        console.log(`✅ Storage provider configurado: ${isAvailable ? 'Supabase' : 'Local'}`);
      } else {
        console.log('⚠️ Usuario no autenticado, usando almacenamiento local');
        setIsSupabaseAvailable(false);
        setStorageProvider('local');
      }
    } catch (error) {
      console.error('❌ Error verificando Supabase:', error);
      console.log('🔄 Fallback a localStorage debido a error de Supabase');
      setIsSupabaseAvailable(false);
      setStorageProvider('local');
    } finally {
      setIsCheckingSupabase(false);
    }
  }, []);

  /**
   * Cambia el proveedor de almacenamiento
   * @param {string} provider - 'local' o 'supabase'
   * @returns {boolean} true si el cambio fue exitoso
   */
  const switchStorageProvider = useCallback(async (provider) => {
    if (provider === 'supabase' && !isSupabaseAvailable) {
      console.warn('⚠️ No se puede cambiar a Supabase: no está disponible');
      return false;
    }

    console.log(`🔄 Cambiando proveedor de almacenamiento a: ${provider}`);
    setStorageProvider(provider);
    return true;
  }, [isSupabaseAvailable]);

  /**
   * Determina si debe usar Supabase basado en disponibilidad y configuración
   * @returns {boolean}
   */
  const shouldUseSupabase = useCallback(() => {
    return isSupabaseAvailable && storageProvider === 'supabase';
  }, [isSupabaseAvailable, storageProvider]);

  return {
    // Estado
    storageProvider,
    isSupabaseAvailable,
    isCheckingSupabase,

    // Funciones
    checkSupabaseAvailability,
    switchStorageProvider,
    shouldUseSupabase,
  };
};

export default useStorageProvider;
