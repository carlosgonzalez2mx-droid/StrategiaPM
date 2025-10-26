/**
 * Hook para mapeo de roles legacy a roles estándar
 * Proporciona funciones para manejar la transición de roles
 * 
 * @version 1.0.0
 * @created 2025-01-27
 */

import { useMemo } from 'react';
import { mapLegacyRole, isValidRole, getRolePermissions, hasPermission } from '../constants/roles';

/**
 * Hook para mapeo y validación de roles
 * @returns {object} Funciones de mapeo y validación
 */
export const useRoleMapping = () => {
  return useMemo(() => ({
    /**
     * Mapea un rol legacy a un rol estándar
     * @param {string} dbRole - Rol de la base de datos
     * @returns {string} Rol estándar mapeado
     */
    mapRole: (dbRole) => {
      if (!dbRole) return 'member_read';
      return mapLegacyRole(dbRole);
    },

    /**
     * Verifica si un rol es válido
     * @param {string} role - Rol a verificar
     * @returns {boolean} True si es válido
     */
    isValidRole,

    /**
     * Obtiene los permisos de un rol
     * @param {string} role - Rol
     * @returns {object} Permisos del rol
     */
    getRolePermissions,

    /**
     * Verifica si un rol tiene un permiso específico
     * @param {string} role - Rol
     * @param {string} permission - Permiso a verificar
     * @returns {boolean} True si tiene el permiso
     */
    hasPermission,

    /**
     * Valida la consistencia de roles en una lista de miembros
     * @param {Array} members - Lista de miembros
     * @returns {object} Resultado de la validación
     */
    validateRoleConsistency: (members) => {
      const issues = [];
      const stats = {
        total: members.length,
        valid: 0,
        invalid: 0,
        legacy: 0
      };

      members.forEach(member => {
        const originalRole = member.role;
        const mappedRole = mapLegacyRole(originalRole);
        
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
        isConsistent: issues.length === 0
      };
    }
  }), []);
};

export default useRoleMapping;
