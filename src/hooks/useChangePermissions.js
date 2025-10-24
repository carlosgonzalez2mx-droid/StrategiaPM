import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';
import { getUserChangePermissions } from '../constants/unifiedRoles';
import useAuthUser from './useAuthUser';

/**
 * Hook para obtener permisos de control de cambios del usuario actual
 *
 * Calcula permisos específicos para el módulo de Control de Cambios basándose en:
 * - Rol organizacional (owner, admin, organization_member_write/read)
 * - Rol funcional (change_manager, change_analyst, ccb_member, developer, etc.)
 *
 * Permisos disponibles:
 * - canCreate: Crear solicitudes de cambio
 * - canApprove: Aprobar cambios (con límites de costo/tiempo)
 * - canReject: Rechazar cambios
 * - canImplement: Marcar cambios como implementados
 * - canVoteInCCB: Votar en Change Control Board
 * - canAssign: Asignar cambios a otros usuarios
 * - canComment: Comentar en cambios
 * - canViewAll: Ver todos los cambios (no solo asignados)
 *
 * @returns {Object} Permisos de control de cambios
 * @returns {Object} return.permissions - Objeto con permisos y metadata
 * @returns {boolean} return.permissions.canCreate - Puede crear cambios
 * @returns {boolean} return.permissions.canApprove - Puede aprobar cambios
 * @returns {boolean} return.permissions.canReject - Puede rechazar cambios
 * @returns {boolean} return.permissions.canImplement - Puede implementar cambios
 * @returns {boolean} return.permissions.canVoteInCCB - Puede votar en CCB
 * @returns {boolean} return.permissions.canAssign - Puede asignar cambios
 * @returns {boolean} return.permissions.canComment - Puede comentar
 * @returns {boolean} return.permissions.canViewAll - Puede ver todos los cambios
 * @returns {Object} return.permissions.approvalLimit - Límites de aprobación {cost, schedule}
 * @returns {string|null} return.permissions.changeRole - Rol específico de cambios
 * @returns {string} return.permissions.level - Nivel de permisos (none, basic, intermediate, advanced, full)
 * @returns {string|null} return.permissions.userId - ID del usuario
 * @returns {string|null} return.permissions.userName - Nombre del usuario
 * @returns {string|null} return.permissions.userEmail - Email del usuario
 * @returns {string|null} return.permissions.orgRole - Rol organizacional
 * @returns {string|null} return.permissions.functionalRole - Rol funcional
 * @returns {boolean} return.loading - Estado de carga
 * @returns {string|null} return.error - Mensaje de error si existe
 * @returns {Function} return.canApproveSpecificChange - Verifica si puede aprobar cambio específico
 *
 * @example
 * const { permissions, loading, canApproveSpecificChange } = useChangePermissions();
 *
 * if (loading) return <Spinner />;
 *
 * // Verificar permisos
 * if (permissions.canCreate) {
 *   return <CreateChangeButton />;
 * }
 *
 * // Verificar aprobación específica
 * const canApprove = canApproveSpecificChange(5000, 10); // $5000, 10 días
 * if (canApprove) {
 *   return <ApproveButton />;
 * }
 */
const useChangePermissions = () => {
  // Hook base de autenticación
  const {
    currentUser,
    organizationId,
    isLoading: isAuthLoading,
    isAuthenticated,
    userEmail,
    userId
  } = useAuthUser();

  const [permissions, setPermissions] = useState({
    canCreate: false,
    canApprove: false,
    canReject: false,
    canImplement: false,
    canVoteInCCB: false,
    canAssign: false,
    canComment: false,
    canViewAll: false,
    approvalLimit: { cost: 0, schedule: 0 },
    changeRole: null,
    level: 'none',
    // Info del usuario
    userId: null,
    userName: null,
    userEmail: null,
    orgRole: null,
    functionalRole: null
  });

  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState(null);

  // Ref para evitar cargas duplicadas
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadPermissions = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isLoadingRef.current) {
        return;
      }

      // Esperar a que useAuthUser termine de cargar
      if (isAuthLoading) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoadingPermissions(true);
        setError(null);

        // Si no hay usuario autenticado, permisos restrictivos
        if (!isAuthenticated || !userEmail) {
          setPermissions({
            canCreate: false,
            canApprove: false,
            canReject: false,
            canImplement: false,
            canVoteInCCB: false,
            canAssign: false,
            canComment: false,
            canViewAll: false,
            approvalLimit: { cost: 0, schedule: 0 },
            changeRole: null,
            level: 'none',
            userId: null,
            userName: null,
            userEmail: null,
            orgRole: null,
            functionalRole: null
          });
          return;
        }

        // Si no hay organización, esperar
        if (!organizationId) {
          setPermissions({
            canCreate: false,
            canApprove: false,
            canReject: false,
            canImplement: false,
            canVoteInCCB: false,
            canAssign: false,
            canComment: false,
            canViewAll: false,
            approvalLimit: { cost: 0, schedule: 0 },
            changeRole: null,
            level: 'none',
            userId: userId,
            userName: currentUser?.user_metadata?.name || userEmail,
            userEmail: userEmail,
            orgRole: null,
            functionalRole: null
          });
          return;
        }

        // Obtener membership del usuario
        const { data: membership, error: membershipError } = await supabaseService.supabase
          .from('organization_members')
          .select('role, functional_role, user_id, status')
          .eq('user_email', userEmail)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError) {
          console.error('Error obteniendo membership:', membershipError);
          setError('Error cargando permisos');
          return;
        }

        if (!membership) {
          console.warn('No se encontró membership activo para el usuario');
          setPermissions({
            canCreate: false,
            canApprove: false,
            canReject: false,
            canImplement: false,
            canVoteInCCB: false,
            canAssign: false,
            canComment: false,
            canViewAll: false,
            approvalLimit: { cost: 0, schedule: 0 },
            changeRole: null,
            level: 'none',
            userId: currentUser.id,
            userName: currentUser.user_metadata?.name || currentUser.email,
            userEmail: currentUser.email,
            orgRole: null,
            functionalRole: null
          });
          return;
        }

        // Calcular permisos basados en role + functional_role
        const orgRole = membership.role;
        const functionalRole = membership.functional_role;
        
        const calculatedPermissions = getUserChangePermissions(orgRole, functionalRole);

        // Combinar con información del usuario
        setPermissions({
          ...calculatedPermissions,
          userId: membership.user_id || currentUser.id,
          userName: currentUser.user_metadata?.name || currentUser.email,
          userEmail: currentUser.email,
          orgRole: orgRole,
          functionalRole: functionalRole
        });

      } catch (error) {
        console.error('Error inesperado en useChangePermissions:', error);
        setError('Error inesperado cargando permisos');
      } finally {
        setLoadingPermissions(false);
        isLoadingRef.current = false;
      }
    };

    // Cargar permisos cuando cambie el usuario o la organización
    loadPermissions();
  }, [isAuthenticated, userEmail, organizationId, isAuthLoading, currentUser, userId]);

  /**
   * Verifica si el usuario puede aprobar un cambio específico basándose en límites
   *
   * Compara el impacto en costo y tiempo del cambio contra los límites de aprobación
   * del usuario. Ambos límites deben cumplirse para aprobar.
   *
   * @param {number|string} costImpact - Impacto en costo (USD)
   * @param {number|string} scheduleImpact - Impacto en cronograma (días)
   * @returns {boolean} True si el usuario puede aprobar este cambio específico
   *
   * @example
   * const { canApproveSpecificChange } = useChangePermissions();
   *
   * // Cambio pequeño: $1000, 5 días
   * canApproveSpecificChange(1000, 5); // true para analyst
   *
   * // Cambio grande: $50000, 30 días
   * canApproveSpecificChange(50000, 30); // false para analyst, true para manager
   */
  const canApproveSpecificChange = (costImpact, scheduleImpact) => {
    if (!permissions.canApprove) return false;

    const cost = parseFloat(costImpact) || 0;
    const schedule = parseFloat(scheduleImpact) || 0;

    const withinCostLimit = cost <= permissions.approvalLimit.cost;
    const withinScheduleLimit = schedule <= permissions.approvalLimit.schedule;

    return withinCostLimit && withinScheduleLimit;
  };

  // Combinar estados de loading
  const loading = isAuthLoading || loadingPermissions;

  return {
    permissions,
    loading,
    error,
    canApproveSpecificChange
  };
};

export default useChangePermissions;
