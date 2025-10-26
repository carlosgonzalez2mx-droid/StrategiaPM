export const calculateDetailedImpact = (change, project) => {
  const costImpact = parseFloat(change.impactCost) || 0;
  const scheduleImpact = parseFloat(change.impactSchedule) || 0;
  
  // Calcular porcentajes
  const costPercentage = project?.budget ? (costImpact / project.budget) * 100 : 0;
  const remainingBudget = project?.budget ? project.budget - costImpact : 0;
  
  // Calcular nueva fecha de fin
  let newEndDate = null;
  let delayPercentage = 0;
  
  if (project?.endDate && scheduleImpact > 0) {
    const currentEndDate = new Date(project.endDate);
    newEndDate = new Date(currentEndDate.getTime() + (scheduleImpact * 24 * 60 * 60 * 1000));
    
    const totalDays = Math.ceil((currentEndDate - new Date(project.startDate)) / (24 * 60 * 60 * 1000));
    delayPercentage = (scheduleImpact / totalDays) * 100;
  }
  
  // Calcular impacto general
  const totalImpactScore = 
    (costPercentage * 0.4) + 
    (delayPercentage * 0.3) + 
    (change.impactScope ? 15 : 0) + 
    (change.impactQuality ? 10 : 0) + 
    (change.impactResources ? 5 : 0);
  
  // Recomendación
  let recommendation = 'approve';
  let recommendationReason = 'El impacto es aceptable para los beneficios esperados';
  
  if (totalImpactScore > 50) {
    recommendation = 'reject';
    recommendationReason = 'El impacto es demasiado alto. Considere alternativas.';
  } else if (totalImpactScore > 30) {
    recommendation = 'review';
    recommendationReason = 'Requiere análisis detallado de alternativas y beneficios.';
  }
  
  return {
    cost: costImpact,
    costPercentage: costPercentage.toFixed(1),
    remainingBudget: remainingBudget.toFixed(0),
    schedule: scheduleImpact,
    newEndDate: newEndDate ? newEndDate.toISOString().split('T')[0] : null,
    delayPercentage: delayPercentage.toFixed(1),
    scope: change.impactScope || 'Sin impacto especificado',
    affectedDeliverables: change.affectedDeliverables || 0,
    newRequirements: change.newRequirements || 0,
    complexity: change.complexity || 'Media',
    risks: change.impactRisks || 'A evaluar',
    stakeholders: change.impactStakeholders || 'Todos los stakeholders',
    totalImpactScore: totalImpactScore.toFixed(1),
    recommendation,
    recommendationReason
  };
};

export const calculateAvgProcessingTime = (changes) => {
  const completedChanges = changes.filter(c => 
    ['approved', 'rejected', 'implemented'].includes(c.status)
  );
  
  if (completedChanges.length === 0) return 0;
  
  const totalDays = completedChanges.reduce((sum, change) => {
    const created = new Date(change.createdAt);
    const updated = new Date(change.updatedAt);
    const days = Math.ceil((updated - created) / (24 * 60 * 60 * 1000));
    return sum + days;
  }, 0);
  
  return (totalDays / completedChanges.length).toFixed(1);
};

export const getTopCategories = (changes) => {
  const categoryCounts = changes.reduce((acc, change) => {
    acc[change.category] = (acc[change.category] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
};

export const calculateProcessEfficiency = (changes) => {
  const implementedOnTime = changes.filter(c => {
    if (c.status !== 'implemented' || !c.expectedImplementationDate) return false;
    
    const expected = new Date(c.expectedImplementationDate);
    const actual = c.statusHistory?.find(s => s.status === 'implemented')?.date;
    
    if (!actual) return false;
    
    return new Date(actual) <= expected;
  }).length;
  
  const totalImplemented = changes.filter(c => c.status === 'implemented').length;
  
  return totalImplemented > 0 ? ((implementedOnTime / totalImplemented) * 100).toFixed(0) : 0;
};

// ============================================================================
// FUNCIONES PARA MANEJO DE USUARIOS EN CAMBIOS
// Agregar al final de changeHelpers.js existente
// ============================================================================

/**
 * Crea objeto de información de usuario para cambios
 * @param {Object} userInfo - Info del usuario (de useChangePermissions)
 * @returns {Object} Objeto usuario para cambios
 */
export const createUserInfo = (userInfo) => {
  if (!userInfo || !userInfo.userId) {
    return null;
  }
  
  return {
    userId: userInfo.userId,
    userName: userInfo.userName || userInfo.userEmail,
    userEmail: userInfo.userEmail,
    userRole: userInfo.orgRole,
    changeRole: userInfo.changeRole,
    functionalRole: userInfo.functionalRole,
    timestamp: new Date().toISOString()
  };
};

/**
 * Determina el aprobador requerido para un cambio
 * @param {number} costImpact - Impacto en costo
 * @param {number} scheduleImpact - Impacto en cronograma
 * @returns {Object} Info del nivel de aprobador requerido
 */
export const getRequiredApproverLevel = (costImpact, scheduleImpact) => {
  const cost = parseFloat(costImpact) || 0;
  const schedule = parseFloat(scheduleImpact) || 0;
  
  // Niveles de aprobación según PMBOK
  if (cost > 100000 || schedule > 30) {
    return {
      level: 'executive',
      title: 'Executive Board',
      reason: 'Cambio crítico que requiere aprobación ejecutiva',
      requiredRoles: ['executive', 'sponsor']
    };
  } else if (cost > 25000 || schedule > 15) {
    return {
      level: 'high',
      title: 'Sponsor',
      reason: 'Cambio mayor que requiere aprobación del patrocinador',
      requiredRoles: ['sponsor', 'project_manager']
    };
  } else if (cost > 0 || schedule > 0) {
    return {
      level: 'medium',
      title: 'Project Manager',
      reason: 'Cambio estándar que requiere aprobación del PM',
      requiredRoles: ['project_manager']
    };
  } else {
    return {
      level: 'low',
      title: 'Team Member',
      reason: 'Cambio menor sin impacto significativo',
      requiredRoles: ['project_manager', 'pmo_assistant']
    };
  }
};

/**
 * Verifica si un usuario puede realizar una acción en un cambio
 * @param {Object} permissions - Permisos del usuario
 * @param {string} action - Acción a verificar ('approve', 'reject', 'implement', etc.)
 * @param {Object} change - Objeto del cambio (opcional, para validaciones adicionales)
 * @returns {boolean} true si puede realizar la acción
 */
export const canUserPerformAction = (permissions, action, change = null) => {
  if (!permissions) return false;
  
  switch (action) {
    case 'create':
      return permissions.canCreate;
    case 'approve':
      if (!permissions.canApprove) return false;
      if (change) {
        const cost = parseFloat(change.impactCost) || 0;
        const schedule = parseFloat(change.impactSchedule) || 0;
        return cost <= permissions.approvalLimit.cost && 
               schedule <= permissions.approvalLimit.schedule;
      }
      return true;
    case 'reject':
      return permissions.canReject;
    case 'implement':
      return permissions.canImplement;
    case 'vote_ccb':
      return permissions.canVoteInCCB;
    case 'assign':
      return permissions.canAssign;
    case 'comment':
      return permissions.canComment;
    default:
      return false;
  }
};

/**
 * Formatea información de usuario para mostrar
 * @param {Object} userInfo - Info del usuario
 * @returns {string} Texto formateado
 */
export const formatUserDisplay = (userInfo) => {
  if (!userInfo) return 'Usuario desconocido';
  
  const name = userInfo.userName || userInfo.userEmail;
  const role = userInfo.functionalRole || userInfo.changeRole;
  
  if (role) {
    return `${name} (${role})`;
  }
  
  return name;
};
