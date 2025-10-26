// Matriz de autoridad basada en PMBOK v7
export const CHANGE_AUTHORITY_MATRIX = {
  cost: {
    low: { threshold: 5000, approver: 'project_manager', label: 'Project Manager' },
    medium: { threshold: 25000, approver: 'sponsor', label: 'Sponsor' },
    high: { threshold: 100000, approver: 'ccb', label: 'CCB' },
    critical: { threshold: Infinity, approver: 'executive_board', label: 'Executive Board' }
  },
  schedule: {
    low: { threshold: 5, approver: 'project_manager', label: 'Project Manager' },
    medium: { threshold: 15, approver: 'sponsor', label: 'Sponsor' },
    high: { threshold: 30, approver: 'ccb', label: 'CCB' },
    critical: { threshold: Infinity, approver: 'executive_board', label: 'Executive Board' }
  }
};

export const getRequiredApprover = (costImpact, scheduleImpact) => {
  let approver = 'project_manager';
  let level = 'low';
  
  // Determinar por costo
  if (costImpact >= CHANGE_AUTHORITY_MATRIX.cost.critical.threshold) {
    approver = CHANGE_AUTHORITY_MATRIX.cost.critical.approver;
    level = 'critical';
  } else if (costImpact >= CHANGE_AUTHORITY_MATRIX.cost.high.threshold) {
    approver = CHANGE_AUTHORITY_MATRIX.cost.high.approver;
    level = 'high';
  } else if (costImpact >= CHANGE_AUTHORITY_MATRIX.cost.medium.threshold) {
    approver = CHANGE_AUTHORITY_MATRIX.cost.medium.approver;
    level = 'medium';
  }
  
  // Verificar si el cronograma requiere mayor autoridad
  if (scheduleImpact >= CHANGE_AUTHORITY_MATRIX.schedule.critical.threshold) {
    approver = CHANGE_AUTHORITY_MATRIX.schedule.critical.approver;
    level = 'critical';
  } else if (scheduleImpact >= CHANGE_AUTHORITY_MATRIX.schedule.high.threshold && level !== 'critical') {
    approver = CHANGE_AUTHORITY_MATRIX.schedule.high.approver;
    level = 'high';
  } else if (scheduleImpact >= CHANGE_AUTHORITY_MATRIX.schedule.medium.threshold && level === 'low') {
    approver = CHANGE_AUTHORITY_MATRIX.schedule.medium.approver;
    level = 'medium';
  }
  
  return { approver, level };
};

export const CCB_MEMBERS = [
  { id: 'pm', name: 'Project Manager', role: 'pm', required: true },
  { id: 'tech', name: 'Technical Lead', role: 'tech', required: true },
  { id: 'finance', name: 'Finance Manager', role: 'finance', required: false },
  { id: 'quality', name: 'Quality Manager', role: 'quality', required: false },
  { id: 'sponsor', name: 'Sponsor', role: 'sponsor', required: true }
];
