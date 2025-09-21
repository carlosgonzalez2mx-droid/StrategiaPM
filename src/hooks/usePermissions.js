import { useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para manejar permisos de usuario basado en roles
 */
const usePermissions = () => {
  console.log('🔥 usePermissions hook inicializado');
  
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

  // Cargar rol del usuario
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        console.log('🚀 INICIANDO usePermissions hook...');
        setIsLoading(true);
        const currentUser = supabaseService.getCurrentUser();
        console.log('👤 Current user en hook:', currentUser);
        
        if (!currentUser) {
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

        // Buscar el rol del usuario en organization_members
        const currentOrganizationId = supabaseService.getCurrentOrganization();
        
        if (!currentOrganizationId) {
          console.warn('No hay organización actual detectada');
          setUserRole(null);
          setIsLoading(false);
          return;
        }

        console.log('🔍 Buscando permisos para:', {
          email: currentUser.email,
          organizationId: currentOrganizationId
        });

        const { data: membership, error } = await supabaseService.supabase
          .from('organization_members')
          .select('role, status')
          .eq('user_email', currentUser.email)
          .eq('organization_id', currentOrganizationId)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('❌ Error cargando rol del usuario:', error);
          console.error('❌ Detalles del error:', error.code, error.message);
          setUserRole(null);
        } else {
          console.log('✅ Membership encontrado:', membership);
          const role = membership?.role || 'organization_member_read';
          setUserRole(role);
          
          // Configurar permisos basado en el rol
          const newPermissions = calculatePermissions(role);
          setPermissions(newPermissions);
          
          console.log('🔐 Permisos del usuario:', {
            role: role,
            permissions: newPermissions,
            isReadOnly: role === 'organization_member_read'
          });
        }
      } catch (error) {
        console.error('Error en usePermissions:', error);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserRole();
    
    // Guardar el email del usuario actual para detectar cambios
    let lastUserEmail = null;
    
    // Re-ejecutar cada 2 segundos para detectar cambios de usuario
    const interval = setInterval(() => {
      const user = supabaseService.getCurrentUser();
      const currentEmail = user?.email;
      
      // Si hay usuario pero no tenemos rol, o si cambió el usuario
      if (user && (!userRole || (lastUserEmail && lastUserEmail !== currentEmail))) {
        console.log('🔄 Usuario detectado o cambió, re-ejecutando hook...', {
          lastEmail: lastUserEmail,
          currentEmail,
          hasRole: !!userRole
        });
        lastUserEmail = currentEmail;
        loadUserRole();
      } else if (user && !lastUserEmail) {
        lastUserEmail = currentEmail;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [userRole]);

  // Función para calcular permisos basado en el rol
  const calculatePermissions = (role) => {
    switch (role) {
      case 'owner':
        return {
          canEdit: true,
          canDelete: true,
          canInvite: true,
          canManageUsers: true,
          canArchive: true,
          canExport: true
        };
        
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

  // Función para verificar un permiso específico
  const hasPermission = (permission) => {
    return permissions[permission] || false;
  };

  // Función para verificar si es solo lectura
  const isReadOnly = () => {
    return userRole === 'organization_member_read';
  };

  // Función para verificar si es admin o owner
  const isAdminOrOwner = () => {
    return userRole === 'owner' || userRole === 'admin';
  };

  return {
    userRole,
    permissions,
    isLoading,
    hasPermission,
    isReadOnly,
    isAdminOrOwner
  };
};

export default usePermissions;
