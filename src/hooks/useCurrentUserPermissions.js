// ==========================================
// 🆕 NUEVO ARCHIVO: hooks/useCurrentUserPermissions.js
// ==========================================
// Hook para obtener permisos del usuario actual
// Elimina verificaciones duplicadas de isOwnerOrAdmin

import { useMemo } from 'react';
import supabaseService from '../services/SupabaseService';

/**
 * Hook para verificar permisos del usuario actual en la organización
 * Reemplaza las 6 verificaciones duplicadas de isOwnerOrAdmin
 * 
 * @param {Array} members - Lista de miembros de la organización
 * @returns {Object} { currentUser, currentUserMembership, currentUserRole, isOwnerOrAdmin, isOwner, isAdmin, isMember, canInvite, canEditRoles, canRemoveMembers }
 */
const useCurrentUserPermissions = (members = []) => {
  return useMemo(() => {
    // Obtener usuario actual de Supabase
    const currentUser = supabaseService.getCurrentUser();
    
    if (!currentUser || !currentUser.email) {
      return {
        currentUser: null,
        currentUserMembership: null,
        currentUserRole: null,
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
      m => m.user_email === currentUser.email
    );

    if (!currentUserMembership) {
      return {
        currentUser,
        currentUserMembership: null,
        currentUserRole: null,
        isOwnerOrAdmin: false,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        canInvite: false,
        canEditRoles: false,
        canRemoveMembers: false
      };
    }

    const role = currentUserMembership.role;
    
    // Calcular permisos basados en el rol
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin';
    const isOwnerOrAdmin = isOwner || isAdmin;
    const isMember = role === 'organization_member_write' || role === 'organization_member_read';

    return {
      currentUser,
      currentUserMembership,
      currentUserRole: role,
      
      // Permisos básicos
      isOwnerOrAdmin,
      isOwner,
      isAdmin,
      isMember,
      
      // Permisos específicos
      canInvite: isOwnerOrAdmin,
      canEditRoles: isOwnerOrAdmin,
      canRemoveMembers: isOwnerOrAdmin,
      
      // Función helper para verificar si puede editar un miembro específico
      canEditMember: (targetMember) => {
        if (!isOwnerOrAdmin) return false;
        // Owner puede editar a todos
        if (isOwner) return true;
        // Admin no puede editar a owner
        if (targetMember.role === 'owner') return false;
        return true;
      },
      
      // Función helper para verificar si puede eliminar un miembro específico
      canRemoveMember: (targetMember) => {
        if (!isOwnerOrAdmin) return false;
        // No puede eliminarse a sí mismo
        if (targetMember.user_email === currentUser.email) return false;
        // Owner puede eliminar a todos (excepto a sí mismo)
        if (isOwner) return true;
        // Admin no puede eliminar a owner ni a otros admins
        if (targetMember.role === 'owner' || targetMember.role === 'admin') return false;
        return true;
      }
    };
  }, [members]);
};

export default useCurrentUserPermissions;

