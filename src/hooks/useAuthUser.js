import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook base para autenticación y usuario actual
 *
 * Centraliza la lógica común de todos los hooks de permisos:
 * - Obtención del usuario actual desde Supabase
 * - Estado de loading con prevención de loops infinitos
 * - Verificación de autenticación y membresías activas
 * - Detección automática de organización
 * - Auto sign-out para usuarios sin membresías
 * - Suscripción a cambios de autenticación (SIGNED_IN, SIGNED_OUT)
 *
 * @returns {Object} Estado de autenticación y funciones de usuario
 * @returns {Object|null} return.currentUser - Objeto de usuario de Supabase (user_metadata, email, id)
 * @returns {string|null} return.organizationId - ID de la organización actual del usuario
 * @returns {boolean} return.isLoading - Estado de carga del usuario y organización
 * @returns {boolean} return.isAuthenticated - Si el usuario está autenticado (tiene email)
 * @returns {string|null} return.userEmail - Email del usuario actual (helper de currentUser.email)
 * @returns {string|null} return.userId - ID del usuario actual (helper de currentUser.id)
 * @returns {Function} return.reloadUser - Función para recargar usuario y organización manualmente
 *
 * @example
 * const { currentUser, isAuthenticated, userEmail, organizationId, isLoading } = useAuthUser();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPrompt />;
 *
 * return <div>Bienvenido {userEmail}</div>;
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
   * Recarga manualmente el usuario y organización desde Supabase
   *
   * Útil cuando se necesita forzar una actualización del estado de autenticación,
   * por ejemplo después de cambiar de organización o actualizar el perfil.
   *
   * @async
   * @function reloadUser
   * @returns {Promise<void>}
   *
   * @example
   * const { reloadUser } = useAuthUser();
   *
   * // Después de cambiar organización
   * await switchOrganization(newOrgId);
   * await reloadUser(); // Actualizar estado
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
