import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook base para autenticación y usuario actual
 *
 * Centraliza la lógica común de todos los hooks de permisos:
 * - Obtención del usuario actual
 * - Estado de loading
 * - Verificación de autenticación
 * - Detección de organización
 * - Prevención de loops infinitos
 *
 * @returns {Object} Estado de autenticación y usuario
 */
const useAuthUser = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Refs para prevenir loops infinitos
  const isLoadingRef = useRef(false);
  const lastUserEmail = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isLoadingRef.current) {
        console.log('⏸️ useAuthUser ya está cargando, evitando duplicación...');
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoading(true);

        // Obtener usuario actual
        const user = supabaseService.getCurrentUser();

        // Si no hay cambio de usuario, no actualizar
        if (user?.email === lastUserEmail.current) {
          return;
        }

        lastUserEmail.current = user?.email || null;

        if (!user || !user.email) {
          console.log('❌ No hay usuario autenticado');
          setCurrentUser(null);
          setOrganizationId(null);
          setIsAuthenticated(false);
          return;
        }

        console.log('🔐 Usuario autenticado:', user.email);

        // Obtener organización actual
        const orgId = supabaseService.getCurrentOrganization();

        if (!orgId) {
          console.log('⏳ Esperando detección de organización...');

          // Verificar si el usuario tiene membresías activas
          try {
            const { data: userMemberships, error: membershipError } = await supabaseService.supabase
              .from('organization_members')
              .select('id, organization_id, status')
              .eq('user_email', user.email)
              .eq('status', 'active');

            if (membershipError) {
              console.error('❌ Error verificando membresía:', membershipError);
            } else if (!userMemberships || userMemberships.length === 0) {
              console.log('🚨 USUARIO SIN MEMBRESÍAS ACTIVAS');
              console.log('🚨 Forzando cierre de sesión para:', user.email);

              // Forzar cierre de sesión
              await supabaseService.supabase.auth.signOut();

              // Limpiar caché local
              localStorage.clear();
              sessionStorage.clear();

              // Recargar página
              window.location.reload();
              return;
            }
          } catch (error) {
            console.error('❌ Error verificando membresías:', error);
          }
        }

        setCurrentUser(user);
        setOrganizationId(orgId);
        setIsAuthenticated(true);

        console.log('✅ useAuthUser - Usuario cargado:', {
          email: user.email,
          organizationId: orgId
        });

      } catch (error) {
        console.error('❌ Error en useAuthUser:', error);
        setCurrentUser(null);
        setOrganizationId(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadUser();

    // Suscribirse a cambios de autenticación
    const { data: authListener } = supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 useAuthUser - Cambio de autenticación:', event);

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setOrganizationId(null);
        setIsAuthenticated(false);
        lastUserEmail.current = null;
      } else if (event === 'SIGNED_IN' && session) {
        loadUser();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /**
   * Recarga el usuario y organización
   */
  const reloadUser = async () => {
    isLoadingRef.current = false;
    lastUserEmail.current = null;

    const user = supabaseService.getCurrentUser();
    const orgId = supabaseService.getCurrentOrganization();

    setCurrentUser(user);
    setOrganizationId(orgId);
    setIsAuthenticated(!!user && !!user.email);
  };

  return {
    // Estado
    currentUser,
    organizationId,
    isLoading,
    isAuthenticated,

    // Funciones
    reloadUser,

    // Helpers
    userEmail: currentUser?.email || null,
    userId: currentUser?.id || null,
  };
};

export default useAuthUser;
