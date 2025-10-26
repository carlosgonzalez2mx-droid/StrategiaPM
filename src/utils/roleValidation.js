/**
 * Utilidades para validación y verificación de roles
 * Proporciona funciones para validar consistencia de roles
 * 
 * @version 1.0.0
 * @created 2025-01-27
 */

import { ROLES, mapLegacyRole, isValidRole, getRolePermissions, hasPermission } from '../constants/roles';

/**
 * Valida la consistencia de roles en una lista de miembros
 * @param {Array} members - Lista de miembros
 * @returns {object} Resultado de la validación
 */
export const validateRoleConsistency = (members) => {
  const issues = [];
  const stats = {
    total: members.length,
    valid: 0,
    invalid: 0,
    legacy: 0,
    roleDistribution: {}
  };

  members.forEach(member => {
    const originalRole = member.role;
    const mappedRole = mapLegacyRole(originalRole);
    
    // Contar distribución de roles
    stats.roleDistribution[originalRole] = (stats.roleDistribution[originalRole] || 0) + 1;
    
    // Contar roles legacy
    if (originalRole !== mappedRole) {
      stats.legacy++;
    }

    // Verificar si el rol mapeado es válido
    if (isValidRole(mappedRole)) {
      stats.valid++;
    } else {
      stats.invalid++;
      issues.push({
        user: member.user_email || member.email,
        originalRole,
        mappedRole,
        issue: 'Mapped role is not valid'
      });
    }
  });

  return {
    issues,
    stats,
    isConsistent: issues.length === 0,
    needsMigration: stats.legacy > 0
  };
};

/**
 * Crea un verificador de roles para un miembro específico
 * @param {string} memberRole - Rol del miembro
 * @returns {object} Funciones de verificación
 */
export const createRoleChecker = (memberRole) => {
  const mappedRole = mapLegacyRole(memberRole);
  const permissions = getRolePermissions(mappedRole);

  return {
    // Verificaciones básicas
    isOwner: () => mappedRole === ROLES.OWNER,
    isAdmin: () => mappedRole === ROLES.ADMIN,
    isMemberWrite: () => mappedRole === ROLES.MEMBER_WRITE,
    isMemberRead: () => mappedRole === ROLES.MEMBER_READ,
    
    // Verificaciones de permisos
    canInvite: () => hasPermission(mappedRole, 'canInvite'),
    canEditRoles: () => hasPermission(mappedRole, 'canEditRoles'),
    canRemoveMembers: () => hasPermission(mappedRole, 'canRemoveMembers'),
    canEditProjects: () => hasPermission(mappedRole, 'canEditProjects'),
    canDeleteProjects: () => hasPermission(mappedRole, 'canDeleteProjects'),
    canViewAll: () => hasPermission(mappedRole, 'canViewAll'),
    
    // Verificaciones específicas
    canEditMember: (targetMember) => {
      if (!hasPermission(mappedRole, 'canEditRoles')) return false;
      
      // Owner puede editar a todos
      if (mappedRole === ROLES.OWNER) return true;
      
      // Admin no puede editar a owner
      const targetMappedRole = mapLegacyRole(targetMember?.role);
      if (targetMappedRole === ROLES.OWNER) return false;
      
      return true;
    },
    
    canRemoveMember: (targetMember) => {
      if (!hasPermission(mappedRole, 'canRemoveMembers')) return false;
      
      // No puede eliminarse a sí mismo
      if (targetMember?.user_email === memberRole?.user_email) return false;
      
      // Owner puede eliminar a todos (excepto a sí mismo)
      if (mappedRole === ROLES.OWNER) return true;
      
      // Admin no puede eliminar a owner ni a otros admins
      const targetMappedRole = mapLegacyRole(targetMember?.role);
      if (targetMappedRole === ROLES.OWNER || targetMappedRole === ROLES.ADMIN) return false;
      
      return true;
    },
    
    // Información del rol
    getMappedRole: () => mappedRole,
    getOriginalRole: () => memberRole,
    getPermissions: () => permissions,
    isLegacyRole: () => memberRole !== mappedRole
  };
};

/**
 * Genera un reporte de roles para debugging
 * @param {Array} members - Lista de miembros
 * @returns {object} Reporte detallado
 */
export const generateRoleReport = (members) => {
  const validation = validateRoleConsistency(members);
  const roleCheckers = members.map(member => ({
    user: member.user_email || member.email,
    checker: createRoleChecker(member.role)
  }));

  return {
    validation,
    roleCheckers,
    summary: {
      totalMembers: members.length,
      needsMigration: validation.needsMigration,
      inconsistentRoles: validation.issues.length,
      legacyRoles: validation.stats.legacy,
      roleDistribution: validation.stats.roleDistribution
    }
  };
};

/**
 * Valida que un usuario tenga permisos para una acción específica
 * @param {string} userRole - Rol del usuario
 * @param {string} action - Acción a verificar
 * @param {object} context - Contexto adicional (opcional)
 * @returns {boolean} True si tiene permisos
 */
export const validateUserPermission = (userRole, action, context = {}) => {
  const checker = createRoleChecker(userRole);
  
  switch (action) {
    case 'invite_member':
      return checker.canInvite();
    case 'edit_member_role':
      return checker.canEditMember(context.targetMember);
    case 'remove_member':
      return checker.canRemoveMember(context.targetMember);
    case 'edit_project':
      return checker.canEditProjects();
    case 'delete_project':
      return checker.canDeleteProjects();
    case 'view_all':
      return checker.canViewAll();
    default:
      return false;
  }
};
