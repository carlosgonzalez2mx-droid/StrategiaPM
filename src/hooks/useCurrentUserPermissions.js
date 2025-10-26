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
 *
 * Busca la membresía del usuario actual en la lista de miembros, mapea su rol
 * a un rol estándar y calcula permisos específicos para gestión de usuarios.
 *
 * Elimina la necesidad de verificaciones duplicadas de isOwnerOrAdmin en componentes.
 * Usa useAuthUser para autenticación y useRoleMapping para normalización de roles.
 *
 * @param {Array<Object>} members - Lista de miembros de la organización
 * @param {string} members[].user_email - Email del miembro
 * @param {string} members[].role - Rol del miembro en la organización
 *
 * @returns {Object} Permisos y metadata del usuario actual
 * @returns {Object|null} return.currentUser - Objeto de usuario de Supabase
 * @returns {Object|null} return.currentUserMembership - Objeto de membresía del usuario
 * @returns {string|null} return.currentUserRole - Rol original del usuario (de DB)
 * @returns {string|null} return.mappedRole - Rol mapeado a estándar (OWNER, ADMIN, MEMBER_WRITE, MEMBER_READ)
 * @returns {boolean} return.isOwnerOrAdmin - Si es owner o admin
 * @returns {boolean} return.isOwner - Si es owner
 * @returns {boolean} return.isAdmin - Si es admin
 * @returns {boolean} return.isMember - Si es miembro (write o read)
 * @returns {boolean} return.canInvite - Puede invitar usuarios
 * @returns {boolean} return.canEditRoles - Puede editar roles de usuarios
 * @returns {boolean} return.canRemoveMembers - Puede eliminar miembros
 * @returns {Function} return.canEditMember - Verifica si puede editar un miembro específico
 * @returns {Function} return.canRemoveMember - Verifica si puede eliminar un miembro específico
 *
 * @example
 * const { isOwnerOrAdmin, canInvite, canEditMember, canRemoveMember } = useCurrentUserPermissions(members);
 *
 * return (
 *   <div>
 *     {canInvite && <InviteButton />}
 *     {members.map(member => (
 *       <MemberRow key={member.id}>
 *         {canEditMember(member) && <EditButton />}
 *         {canRemoveMember(member) && <RemoveButton />}
 *       </MemberRow>
 *     ))}
 *   </div>
 * );
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

