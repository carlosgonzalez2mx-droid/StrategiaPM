// ==========================================
// 🆕 NUEVO ARCHIVO: hooks/useCurrentUserPermissions.js
// ==========================================
// Hook para obtener permisos del usuario actual
// Elimina verificaciones duplicadas de isOwnerOrAdmin
// V3: Refactorizado para usar useAuthUser como base

import { useMemo } from 'react';
import useAuthUser from './useAuthUser';
import { useRoleMapping } from './useRoleMapping';
import { ROLES } from '../constants/roles';

/**
 * Hook para verificar permisos del usuario actual en la organización
 * Refactorizado para usar useAuthUser como base
 *
 * @param {Array} members - Lista de miembros de la organización
 * @returns {Object} { currentUser, currentUserMembership, currentUserRole, isOwnerOrAdmin, isOwner, isAdmin, isMember, canInvite, canEditRoles, canRemoveMembers }
 */
const useCurrentUserPermissions = (members = []) => {
  // Hook base de autenticación
  const { currentUser, userEmail, isAuthenticated } = useAuthUser();
  const { mapRole, hasPermission } = useRoleMapping();

  return useMemo(() => {
    // Verificar si hay usuario autenticado
    if (!isAuthenticated || !userEmail) {
      return {
        currentUser: null,
        currentUserMembership: null,
        currentUserRole: null,
        mappedRole: null,
        isOwnerOrAdmin: false,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        canInvite: false,
        canEditRoles: false,
        canRemoveMembers: false
      };
    }

    // Buscar membresía del usuario actual
    const currentUserMembership = members.find(
      m => m.user_email === userEmail
    );

    if (!currentUserMembership) {
      return {
        currentUser,
        currentUserMembership: null,
        currentUserRole: null,
        mappedRole: null,
        isOwnerOrAdmin: false,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        canInvite: false,
        canEditRoles: false,
        canRemoveMembers: false
      };
    }

    const originalRole = currentUserMembership.role;
    const mappedRole = mapRole(originalRole);
    
    // Calcular permisos basados en el rol mapeado
    const isOwner = mappedRole === ROLES.OWNER;
    const isAdmin = mappedRole === ROLES.ADMIN;
    const isOwnerOrAdmin = isOwner || isAdmin;
    const isMember = mappedRole === ROLES.MEMBER_WRITE || mappedRole === ROLES.MEMBER_READ;

    return {
      currentUser,
      currentUserMembership,
      currentUserRole: originalRole,
      mappedRole,
      
      // Permisos básicos
      isOwnerOrAdmin,
      isOwner,
      isAdmin,
      isMember,
      
      // Permisos específicos usando el sistema de permisos
      canInvite: hasPermission(mappedRole, 'canInvite'),
      canEditRoles: hasPermission(mappedRole, 'canEditRoles'),
      canRemoveMembers: hasPermission(mappedRole, 'canRemoveMembers'),
      
      // Función helper para verificar si puede editar un miembro específico
      canEditMember: (targetMember) => {
        if (!hasPermission(mappedRole, 'canEditRoles')) return false;
        // Owner puede editar a todos
        if (isOwner) return true;
        // Admin no puede editar a owner
        const targetMappedRole = mapRole(targetMember?.role);
        if (targetMappedRole === ROLES.OWNER) return false;
        return true;
      },
      
      // Función helper para verificar si puede eliminar un miembro específico
      canRemoveMember: (targetMember) => {
        if (!hasPermission(mappedRole, 'canRemoveMembers')) return false;
        // No puede eliminarse a sí mismo
        if (targetMember?.user_email === userEmail) return false;
        // Owner puede eliminar a todos (excepto a sí mismo)
        if (isOwner) return true;
        // Admin no puede eliminar a owner ni a otros admins
        const targetMappedRole = mapRole(targetMember?.role);
        if (targetMappedRole === ROLES.OWNER || targetMappedRole === ROLES.ADMIN) return false;
        return true;
      }
    };
  }, [members, currentUser, userEmail, isAuthenticated, mapRole, hasPermission]);
};

export default useCurrentUserPermissions;

