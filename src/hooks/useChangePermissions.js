import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';
import { getUserChangePermissions } from '../constants/unifiedRoles';

/**
 * Hook para obtener permisos de control de cambios del usuario actual
 * Lee de Supabase y calcula permisos basados en role + functional_role
 */
const useChangePermissions = () => {
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Evitar loops infinitos
  const isLoadingRef = useRef(false);
  const lastUserEmail = useRef(null);

  useEffect(() => {
    const loadPermissions = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        setError(null);
        
        // Obtener usuario actual
        const currentUser = supabaseService.getCurrentUser();
        
        if (!currentUser || !currentUser.email) {
          // No hay usuario, permisos restrictivos
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

        // Obtener organización actual
        const orgId = supabaseService.getCurrentOrganization();
        
        if (!orgId) {
          // No hay organización detectada, esperar
          setTimeout(() => {
            if (!isLoadingRef.current) {
              loadPermissions();
            }
          }, 1000);
          return;
        }

        // Obtener membership del usuario
        const { data: membership, error: membershipError } = await supabaseService.supabase
          .from('organization_members')
          .select('role, functional_role, user_id, status')
          .eq('user_email', currentUser.email)
          .eq('organization_id', orgId)
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
        setLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Ejecutar inmediatamente
    loadPermissions();

    // Configurar intervalo para detectar cambios de usuario
    const interval = setInterval(() => {
      const user = supabaseService.getCurrentUser();
      const currentEmail = user?.email;
      
      // Solo re-ejecutar si el email cambió
      if (currentEmail !== lastUserEmail.current) {
        lastUserEmail.current = currentEmail;
        loadPermissions();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      isLoadingRef.current = false;
    };
  }, []);

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

  return { 
    permissions, 
    loading, 
    error,
    canApproveSpecificChange
  };
};

export default useChangePermissions;
