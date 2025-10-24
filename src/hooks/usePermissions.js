import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';
import useAuthUser from './useAuthUser';

/**
 * Hook para manejar permisos de usuario basado en roles organizacionales
 *
 * Obtiene el rol del usuario desde organization_members y calcula permisos específicos.
 * Usa useAuthUser como base para autenticación y detección de organización.
 *
 * Roles soportados:
 * - owner/admin: Todos los permisos
 * - organization_member_write: Editar y exportar
 * - organization_member_read: Solo exportar (read-only)
 *
 * @returns {Object} Permisos y estado del usuario
 * @returns {Object} return.permissions - Objeto con flags de permisos
 * @returns {boolean} return.permissions.canEdit - Puede editar proyectos/datos
 * @returns {boolean} return.permissions.canDelete - Puede eliminar elementos
 * @returns {boolean} return.permissions.canInvite - Puede invitar usuarios
 * @returns {boolean} return.permissions.canManageUsers - Puede gestionar usuarios
 * @returns {boolean} return.permissions.canArchive - Puede archivar proyectos
 * @returns {boolean} return.permissions.canExport - Puede exportar datos
 * @returns {Function} return.isReadOnly - Retorna true si el usuario es read-only
 * @returns {boolean} return.isLoading - Estado de carga de permisos
 * @returns {string|null} return.userRole - Rol del usuario en la organización
 *
 * @example
 * const { permissions, isReadOnly, isLoading, userRole } = usePermissions();
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <div>
 *     {permissions.canEdit && <EditButton />}
 *     {permissions.canDelete && <DeleteButton />}
 *     {isReadOnly() && <Badge>Solo lectura</Badge>}
 *   </div>
 * );
 */
const usePermissions = () => {
  // Hook base de autenticación
  const {
    currentUser,
    organizationId,
    isLoading: isAuthLoading,
    isAuthenticated,
    userEmail
  } = useAuthUser();

  const [userRole, setUserRole] = useState(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageUsers: false,
    canArchive: false,
    canExport: false
  });

  // Ref para evitar cargas duplicadas
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadUserRole = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isLoadingRef.current) {
        console.log('⏸️ usePermissions ya está cargando, evitando duplicación...');
        return;
      }

      // Esperar a que useAuthUser termine de cargar
      if (isAuthLoading) {
        console.log('⏳ usePermissions - Esperando autenticación...');
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoadingPermissions(true);

        console.log('🔐 usePermissions - Usuario:', userEmail || 'No autenticado');

        // Si no hay usuario autenticado, aplicar permisos restrictivos
        if (!isAuthenticated || !userEmail) {
          console.log('❌ No hay usuario autenticado, aplicando permisos restrictivos');
          setUserRole(null);
          setPermissions({
            canEdit: false,
            canDelete: false,
            canInvite: false,
            canManageUsers: false,
            canArchive: false,
            canExport: false
          });
          return;
        }

        // Si no hay organización, esperar
        if (!organizationId) {
          console.log('⏳ Esperando detección de organización...');
          setUserRole(null);
          setPermissions({
            canEdit: false,
            canDelete: false,
            canInvite: false,
            canManageUsers: false,
            canArchive: false,
            canExport: false
          });
          return;
        }

        console.log('🔍 Buscando rol para:', {
          email: userEmail,
          organizationId: organizationId
        });

        // Usar maybeSingle() en lugar de single() para evitar errores PGRST116
        const { data: membership, error } = await supabaseService.supabase
          .from('organization_members')
          .select('role, status')
          .eq('user_email', userEmail)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .maybeSingle();

        console.log('🔍 Resultado de query membership:', { membership, error });

        if (error) {
          console.error('❌ Error cargando rol:', error.code, error.message);
          setUserRole(null);
          setPermissions({
            canEdit: false,
            canDelete: false,
            canInvite: false,
            canManageUsers: false,
            canArchive: false,
            canExport: false
          });
        } else if (!membership) {
          console.log('❌ No se encontró membership para el usuario');
          setUserRole(null);
          setPermissions({
            canEdit: false,
            canDelete: false,
            canInvite: false,
            canManageUsers: false,
            canArchive: false,
            canExport: false
          });
        } else {
          console.log('✅ Membership encontrado:', membership);
          const role = membership.role || 'organization_member_read';
          setUserRole(role);
          
          const newPermissions = calculatePermissions(role);
          setPermissions(newPermissions);
          
          console.log('🔐 Permisos aplicados:', {
            role: role,
            permissions: newPermissions,
            isReadOnly: role === 'organization_member_read'
          });
        }
      } catch (error) {
        console.error('❌ Error inesperado en usePermissions:', error);
        setUserRole(null);
        setPermissions({
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canManageUsers: false,
          canArchive: false,
          canExport: false
        });
      } finally {
        setIsLoadingPermissions(false);
        isLoadingRef.current = false;
      }
    };

    // Cargar rol cuando cambie el usuario o la organización
    loadUserRole();
  }, [isAuthenticated, userEmail, organizationId, isAuthLoading]);

  /**
   * Calcula los permisos específicos basándose en el rol del usuario
   *
   * @private
   * @param {string} role - Rol del usuario (owner, admin, organization_member_write, organization_member_read)
   * @returns {Object} Objeto con flags de permisos específicos
   */
  const calculatePermissions = (role) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return {
          canEdit: true,
          canDelete: true,
          canInvite: true,
          canManageUsers: true,
          canArchive: true,
          canExport: true
        };
      case 'organization_member_write':
        return {
          canEdit: true,
          canDelete: false,
          canInvite: false,
          canManageUsers: false,
          canArchive: false,
          canExport: true
        };
      case 'organization_member_read':
        return {
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canManageUsers: false,
          canArchive: false,
          canExport: true
        };
      default:
        return {
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canManageUsers: false,
          canArchive: false,
          canExport: false
        };
    }
  };

  const isReadOnly = () => userRole === 'organization_member_read';

  // Combinar estados de loading
  const isLoading = isAuthLoading || isLoadingPermissions;

  return { permissions, isReadOnly, isLoading, userRole };
};

export default usePermissions;