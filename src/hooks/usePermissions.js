import { useState, useEffect, useRef } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para manejar permisos de usuario basado en roles
 * Versión mejorada con mejor manejo de timing y prevención de loops
 */
const usePermissions = () => {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canManageUsers: false,
    canArchive: false,
    canExport: false
  });

  // Usar useRef para evitar loops infinitos
  const lastUserEmail = useRef(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadUserRole = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isLoadingRef.current) {
        console.log('⏸️ usePermissions ya está cargando, evitando duplicación...');
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoading(true);
        
        const currentUser = supabaseService.getCurrentUser();
        console.log('🔐 usePermissions - Usuario actual:', currentUser?.email || 'No autenticado');
        
        if (!currentUser || !currentUser.email) {
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

        const currentOrganizationId = supabaseService.getCurrentOrganization();
        
        if (!currentOrganizationId) {
          console.log('⏳ Esperando detección de organización...');
          // En lugar de aplicar permisos restrictivos, esperar un poco más
          setTimeout(() => {
            if (!isLoadingRef.current) {
              loadUserRole();
            }
          }, 1000);
          return;
        }

        console.log('🔍 Buscando rol para:', {
          email: currentUser.email,
          organizationId: currentOrganizationId
        });

        // DIAGNÓSTICO: Verificar estado de autenticación antes de query
        const authUser = await supabaseService.supabase.auth.getUser();
        console.log('🔍 Estado de autenticación antes de query:', {
          authUser: authUser.data.user?.email || 'No autenticado',
          currentUserEmail: currentUser.email,
          organizationId: currentOrganizationId
        });

        // Usar maybeSingle() en lugar de single() para evitar errores PGRST116
        const { data: membership, error } = await supabaseService.supabase
          .from('organization_members')
          .select('role, status')
          .eq('user_email', currentUser.email)
          .eq('organization_id', currentOrganizationId)
          .eq('status', 'active')
          .maybeSingle(); // Cambiado de .single() a .maybeSingle()

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
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    // Ejecutar inmediatamente
    loadUserRole();

    // Configurar intervalo SOLO para detectar cambios de usuario
    const interval = setInterval(() => {
      const user = supabaseService.getCurrentUser();
      const currentEmail = user?.email;
      
      // SOLO re-ejecutar si el email cambió (cambio de usuario)
      if (currentEmail !== lastUserEmail.current) {
        console.log('🔄 Usuario cambió, recargando permisos...', {
          anterior: lastUserEmail.current,
          actual: currentEmail
        });
        lastUserEmail.current = currentEmail;
        loadUserRole();
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      isLoadingRef.current = false;
    };
  }, []); // Sin dependencias para evitar loops

  // Función para calcular permisos basado en el rol
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

  return { permissions, isReadOnly, isLoading, userRole };
};

export default usePermissions;