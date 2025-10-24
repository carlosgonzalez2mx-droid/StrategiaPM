import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';
import { getUserChangePermissions } from '../constants/unifiedRoles';
import useAuthUser from './useAuthUser';

/**
 * Hook para obtener permisos de control de cambios del usuario actual
 * Refactorizado para usar useAuthUser como base
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
   * Verifica si el usuario puede aprobar un cambio específico
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
