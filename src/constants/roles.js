/**
 * Sistema de constantes de roles para StrategiaPM
 * Centraliza la definición de roles y sus etiquetas
 * 
 * @version 1.0.0
 * @created 2025-01-27
 */

// ==========================================
// ROLES PRINCIPALES
// ==========================================
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER_WRITE: 'member_write',
  MEMBER_READ: 'member_read'
};

// ==========================================
// ETIQUETAS DE ROLES (Para UI)
// ==========================================
export const ROLE_LABELS = {
  [ROLES.OWNER]: '👑 Propietario',
  [ROLES.ADMIN]: '👑 Administrador',
  [ROLES.MEMBER_WRITE]: '✏️ Miembro (Editar)',
  [ROLES.MEMBER_READ]: '👀 Miembro (Solo lectura)'
};

// ==========================================
// DESCRIPCIONES DE ROLES
// ==========================================
export const ROLE_DESCRIPTIONS = {
  [ROLES.OWNER]: 'Control total de la organización, puede gestionar miembros y proyectos',
  [ROLES.ADMIN]: 'Puede gestionar usuarios y proyectos de la organización',
  [ROLES.MEMBER_WRITE]: 'Puede crear, editar y eliminar proyectos de la organización',
  [ROLES.MEMBER_READ]: 'Solo puede ver proyectos de la organización'
};

// ==========================================
// PERMISOS POR ROL
// ==========================================
export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: {
    canInvite: true,
    canEditRoles: true,
    canRemoveMembers: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canViewAll: true
  },
  [ROLES.ADMIN]: {
    canInvite: true,
    canEditRoles: true,
    canRemoveMembers: false, // No puede eliminar owners
    canEditProjects: true,
    canDeleteProjects: true,
    canViewAll: true
  },
  [ROLES.MEMBER_WRITE]: {
    canInvite: false,
    canEditRoles: false,
    canRemoveMembers: false,
    canEditProjects: true,
    canDeleteProjects: false,
    canViewAll: true
  },
  [ROLES.MEMBER_READ]: {
    canInvite: false,
    canEditRoles: false,
    canRemoveMembers: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewAll: true
  }
};

// ==========================================
// MAPEO DE ROLES LEGACY (Para migración)
// ==========================================
export const LEGACY_ROLE_MAPPING = {
  'organization_owner': ROLES.OWNER,
  'organization_member_write': ROLES.MEMBER_WRITE,
  'organization_member_read': ROLES.MEMBER_READ,
  'admin': ROLES.ADMIN,
  'owner': ROLES.OWNER,
  'member': ROLES.MEMBER_WRITE
};

// ==========================================
// OPCIONES PARA FORMULARIOS
// ==========================================
export const ROLE_OPTIONS = [
  { 
    value: ROLES.OWNER, 
    label: ROLE_LABELS[ROLES.OWNER],
    description: ROLE_DESCRIPTIONS[ROLES.OWNER]
  },
  { 
    value: ROLES.ADMIN, 
    label: ROLE_LABELS[ROLES.ADMIN],
    description: ROLE_DESCRIPTIONS[ROLES.ADMIN]
  },
  { 
    value: ROLES.MEMBER_WRITE, 
    label: ROLE_LABELS[ROLES.MEMBER_WRITE],
    description: ROLE_DESCRIPTIONS[ROLES.MEMBER_WRITE]
  },
  { 
    value: ROLES.MEMBER_READ, 
    label: ROLE_LABELS[ROLES.MEMBER_READ],
    description: ROLE_DESCRIPTIONS[ROLES.MEMBER_READ]
  }
];

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Mapea un rol legacy a un rol estándar
 * @param {string} legacyRole - Rol legacy de la BD
 * @returns {string} Rol estándar
 */
export const mapLegacyRole = (legacyRole) => {
  return LEGACY_ROLE_MAPPING[legacyRole] || ROLES.MEMBER_READ;
};

/**
 * Verifica si un rol es válido
 * @param {string} role - Rol a verificar
 * @returns {boolean} True si es válido
 */
export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

/**
 * Obtiene los permisos de un rol
 * @param {string} role - Rol
 * @returns {object} Permisos del rol
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.MEMBER_READ];
};

/**
 * Verifica si un rol tiene un permiso específico
 * @param {string} role - Rol
 * @param {string} permission - Permiso a verificar
 * @returns {boolean} True si tiene el permiso
 */
export const hasPermission = (role, permission) => {
  const permissions = getRolePermissions(role);
  return permissions[permission] === true;
};
