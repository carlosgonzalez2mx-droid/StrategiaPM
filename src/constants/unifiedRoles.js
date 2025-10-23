/**
 * SISTEMA UNIFICADO DE ROLES
 * Define roles organizacionales, funcionales y permisos para control de cambios
 * NO hardcodea datos, solo define la estructura de permisos
 */

// Roles organizacionales (en organization_members.role)
export const ORG_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER_WRITE: 'organization_member_write',
  MEMBER_READ: 'organization_member_read'
};

// Roles funcionales (en organization_members.functional_role)
export const FUNCTIONAL_ROLES = {
  // Roles de gestión
  EXECUTIVE: 'executive',
  SPONSOR: 'sponsor',
  PROJECT_MANAGER: 'project_manager',
  
  // Roles especializados
  FINANCE_MANAGER: 'finance_manager',
  QUALITY_MANAGER: 'quality_manager',
  TECHNICAL_LEAD: 'technical_lead',
  
  // Roles operativos
  PMO_ASSISTANT: 'pmo_assistant',
  PROJECT_COORDINATOR: 'project_coordinator',
  TEAM_MEMBER: 'team_member',
  
  // Roles de supervisión
  AUDITOR: 'auditor'
};

// Labels y metadata de roles funcionales
export const FUNCTIONAL_ROLE_LABELS = {
  [FUNCTIONAL_ROLES.EXECUTIVE]: {
    label: 'Ejecutivo',
    description: 'Toma decisiones estratégicas y aprueba cambios críticos',
    icon: '👔',
    color: 'purple',
    badge: 'bg-purple-100 text-purple-800'
  },
  [FUNCTIONAL_ROLES.SPONSOR]: {
    label: 'Patrocinador',
    description: 'Aprueba cambios mayores del proyecto',
    icon: '🎯',
    color: 'blue',
    badge: 'bg-blue-100 text-blue-800'
  },
  [FUNCTIONAL_ROLES.PROJECT_MANAGER]: {
    label: 'Project Manager',
    description: 'Gestiona proyectos y aprueba cambios menores',
    icon: '📊',
    color: 'indigo',
    badge: 'bg-indigo-100 text-indigo-800'
  },
  [FUNCTIONAL_ROLES.FINANCE_MANAGER]: {
    label: 'Gerente Financiero',
    description: 'Aprueba impacto financiero de cambios',
    icon: '💰',
    color: 'green',
    badge: 'bg-green-100 text-green-800'
  },
  [FUNCTIONAL_ROLES.QUALITY_MANAGER]: {
    label: 'Gerente de Calidad',
    description: 'Valida impacto en calidad',
    icon: '⭐',
    color: 'yellow',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  [FUNCTIONAL_ROLES.TECHNICAL_LEAD]: {
    label: 'Líder Técnico',
    description: 'Realiza análisis técnico de cambios',
    icon: '🔧',
    color: 'cyan',
    badge: 'bg-cyan-100 text-cyan-800'
  },
  [FUNCTIONAL_ROLES.PMO_ASSISTANT]: {
    label: 'Asistente PMO',
    description: 'Soporte operativo y seguimiento',
    icon: '📋',
    color: 'teal',
    badge: 'bg-teal-100 text-teal-800'
  },
  [FUNCTIONAL_ROLES.PROJECT_COORDINATOR]: {
    label: 'Coordinador de Proyectos',
    description: 'Coordina tareas y actividades',
    icon: '📅',
    color: 'orange',
    badge: 'bg-orange-100 text-orange-800'
  },
  [FUNCTIONAL_ROLES.TEAM_MEMBER]: {
    label: 'Miembro de Equipo',
    description: 'Participa en el proyecto y solicita cambios',
    icon: '👤',
    color: 'gray',
    badge: 'bg-gray-100 text-gray-800'
  },
  [FUNCTIONAL_ROLES.AUDITOR]: {
    label: 'Auditor',
    description: 'Solo lectura para auditoría',
    icon: '🔍',
    color: 'slate',
    badge: 'bg-slate-100 text-slate-800'
  }
};

// Matriz de permisos para control de cambios
// Define QUÉ puede hacer cada rol, NO asigna roles a usuarios
export const CHANGE_PERMISSIONS_MATRIX = {
  // OWNER tiene acceso completo
  [ORG_ROLES.OWNER]: {
    canCreate: true,
    canApprove: true,
    canReject: true,
    canImplement: true,
    canVoteInCCB: true,
    canAssign: true,
    canComment: true,
    canViewAll: true,
    approvalLimit: { cost: Infinity, schedule: Infinity },
    changeRole: 'executive_board',
    level: 'unlimited'
  },
  
  // ADMIN tiene acceso completo
  [ORG_ROLES.ADMIN]: {
    canCreate: true,
    canApprove: true,
    canReject: true,
    canImplement: true,
    canVoteInCCB: true,
    canAssign: true,
    canComment: true,
    canViewAll: true,
    approvalLimit: { cost: Infinity, schedule: Infinity },
    changeRole: 'executive_board',
    level: 'unlimited'
  },
  
  // MEMBER_WRITE depende de functional_role
  [ORG_ROLES.MEMBER_WRITE]: {
    // Default (sin functional_role específico)
    default: {
      canCreate: true,
      canApprove: false,
      canReject: false,
      canImplement: true,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'team_member',
      level: 'basic'
    },
    
    // Permisos específicos por functional_role
    [FUNCTIONAL_ROLES.EXECUTIVE]: {
      canCreate: true,
      canApprove: true,
      canReject: true,
      canImplement: false,
      canVoteInCCB: true,
      canAssign: true,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: Infinity, schedule: Infinity },
      changeRole: 'executive_board',
      level: 'executive'
    },
    
    [FUNCTIONAL_ROLES.SPONSOR]: {
      canCreate: true,
      canApprove: true,
      canReject: true,
      canImplement: false,
      canVoteInCCB: true,
      canAssign: true,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: 100000, schedule: 30 },
      changeRole: 'sponsor',
      level: 'high'
    },
    
    [FUNCTIONAL_ROLES.PROJECT_MANAGER]: {
      canCreate: true,
      canApprove: true,
      canReject: true,
      canImplement: true,
      canVoteInCCB: true,
      canAssign: true,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: 25000, schedule: 15 },
      changeRole: 'project_manager',
      level: 'medium'
    },
    
    [FUNCTIONAL_ROLES.FINANCE_MANAGER]: {
      canCreate: true,
      canApprove: true,
      canReject: true,
      canImplement: false,
      canVoteInCCB: true,
      canAssign: false,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: 100000, schedule: 0 },
      changeRole: 'finance_manager',
      level: 'specialized'
    },
    
    [FUNCTIONAL_ROLES.QUALITY_MANAGER]: {
      canCreate: true,
      canApprove: true,
      canReject: true,
      canImplement: false,
      canVoteInCCB: true,
      canAssign: false,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'quality_manager',
      level: 'specialized'
    },
    
    [FUNCTIONAL_ROLES.TECHNICAL_LEAD]: {
      canCreate: true,
      canApprove: false,
      canReject: false,
      canImplement: true,
      canVoteInCCB: true,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'technical_lead',
      level: 'technical'
    },
    
    [FUNCTIONAL_ROLES.PMO_ASSISTANT]: {
      canCreate: true,
      canApprove: false,
      canReject: false,
      canImplement: true,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'pmo_assistant',
      level: 'operational'
    },
    
    [FUNCTIONAL_ROLES.PROJECT_COORDINATOR]: {
      canCreate: true,
      canApprove: false,
      canReject: false,
      canImplement: true,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'project_coordinator',
      level: 'operational'
    },
    
    [FUNCTIONAL_ROLES.TEAM_MEMBER]: {
      canCreate: true,
      canApprove: false,
      canReject: false,
      canImplement: false,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'team_member',
      level: 'basic'
    }
  },
  
  // MEMBER_READ tiene permisos limitados
  [ORG_ROLES.MEMBER_READ]: {
    default: {
      canCreate: true, // Puede solicitar cambios
      canApprove: false,
      canReject: false,
      canImplement: false,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'observer',
      level: 'readonly'
    },
    
    [FUNCTIONAL_ROLES.AUDITOR]: {
      canCreate: false,
      canApprove: false,
      canReject: false,
      canImplement: false,
      canVoteInCCB: false,
      canAssign: false,
      canComment: true,
      canViewAll: true,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'auditor',
      level: 'audit'
    }
  }
};

/**
 * Obtiene los permisos de control de cambios para un usuario
 * @param {string} orgRole - Rol organizacional (owner, admin, organization_member_write, organization_member_read)
 * @param {string|null} functionalRole - Rol funcional opcional
 * @returns {Object} Objeto con permisos
 */
export const getUserChangePermissions = (orgRole, functionalRole = null) => {
  // Si no hay rol organizacional, denegar todo
  if (!orgRole) {
    return {
      canCreate: false,
      canApprove: false,
      canReject: false,
      canImplement: false,
      canVoteInCCB: false,
      canAssign: false,
      canComment: false,
      canViewAll: false,
      approvalLimit: { cost: 0, schedule: 0 },
      changeRole: 'none',
      level: 'none'
    };
  }
  
  const basePermissions = CHANGE_PERMISSIONS_MATRIX[orgRole];
  
  if (!basePermissions) {
    return CHANGE_PERMISSIONS_MATRIX[ORG_ROLES.MEMBER_READ].default;
  }
  
  // Si es OWNER o ADMIN, retornar permisos directos
  if (orgRole === ORG_ROLES.OWNER || orgRole === ORG_ROLES.ADMIN) {
    return basePermissions;
  }
  
  // Si tiene functional_role, buscar permisos específicos
  if (functionalRole && basePermissions[functionalRole]) {
    return basePermissions[functionalRole];
  }
  
  // Si no tiene functional_role, usar default
  return basePermissions.default || basePermissions;
};

/**
 * Verifica si un usuario puede aprobar un cambio específico
 * @param {Object} permissions - Permisos del usuario
 * @param {number} costImpact - Impacto en costo del cambio
 * @param {number} scheduleImpact - Impacto en cronograma del cambio
 * @returns {boolean} true si puede aprobar
 */
export const canApproveChange = (permissions, costImpact, scheduleImpact) => {
  if (!permissions.canApprove) return false;
  
  const cost = parseFloat(costImpact) || 0;
  const schedule = parseFloat(scheduleImpact) || 0;
  
  const withinCostLimit = cost <= permissions.approvalLimit.cost;
  const withinScheduleLimit = schedule <= permissions.approvalLimit.schedule;
  
  return withinCostLimit && withinScheduleLimit;
};

/**
 * Obtiene el label de un rol funcional
 * @param {string} functionalRole - Rol funcional
 * @returns {string} Label amigable
 */
export const getFunctionalRoleLabel = (functionalRole) => {
  if (!functionalRole) return 'Sin rol específico';
  return FUNCTIONAL_ROLE_LABELS[functionalRole]?.label || functionalRole;
};

/**
 * Obtiene metadata completa de un rol funcional
 * @param {string} functionalRole - Rol funcional
 * @returns {Object|null} Metadata del rol
 */
export const getFunctionalRoleMetadata = (functionalRole) => {
  if (!functionalRole) return null;
  return FUNCTIONAL_ROLE_LABELS[functionalRole] || null;
};

const unifiedRoles = {
  ORG_ROLES,
  FUNCTIONAL_ROLES,
  FUNCTIONAL_ROLE_LABELS,
  CHANGE_PERMISSIONS_MATRIX,
  getUserChangePermissions,
  canApproveChange,
  getFunctionalRoleLabel,
  getFunctionalRoleMetadata
};

export default unifiedRoles;
