import { useCallback } from 'react';

export const useChangeIntegration = (currentProjectId, onUpdateProject) => {
  const applyChangeToProject = useCallback((change, project) => {
    if (!onUpdateProject || !project) {
      console.warn('No se puede aplicar el cambio: onUpdateProject o project no disponible');
      return null;
    }
    
    const updates = { ...project };
    
    // Actualizar presupuesto
    if (change.impactCost) {
      const costImpact = parseFloat(change.impactCost);
      updates.budget = (updates.budget || 0) + costImpact;
      updates.budgetHistory = [
        ...(updates.budgetHistory || []),
        {
          date: new Date().toISOString(),
          amount: costImpact,
          reason: `Cambio ${change.changeNumber}: ${change.title}`,
          type: 'change_request',
          changeId: change.id
        }
      ];
    }
    
    // Actualizar cronograma
    if (change.impactSchedule && updates.endDate) {
      const scheduleImpact = parseFloat(change.impactSchedule);
      const currentEndDate = new Date(updates.endDate);
      const newEndDate = new Date(currentEndDate.getTime() + (scheduleImpact * 24 * 60 * 60 * 1000));
      
      updates.scheduleHistory = [
        ...(updates.scheduleHistory || []),
        {
          date: new Date().toISOString(),
          days: scheduleImpact,
          reason: `Cambio ${change.changeNumber}: ${change.title}`,
          oldEndDate: updates.endDate,
          newEndDate: newEndDate.toISOString().split('T')[0],
          changeId: change.id
        }
      ];
      
      updates.endDate = newEndDate.toISOString().split('T')[0];
    }
    
    // Actualizar alcance si aplica
    if (change.category === 'scope' && change.impactScope) {
      updates.scopeChanges = [
        ...(updates.scopeChanges || []),
        {
          date: new Date().toISOString(),
          changeId: change.id,
          changeNumber: change.changeNumber,
          description: change.impactScope,
          status: 'implemented'
        }
      ];
    }
    
    // Registrar el cambio aplicado
    updates.appliedChanges = [
      ...(updates.appliedChanges || []),
      {
        changeId: change.id,
        changeNumber: change.changeNumber,
        title: change.title,
        appliedDate: new Date().toISOString(),
        impactSummary: {
          cost: change.impactCost,
          schedule: change.impactSchedule,
          scope: change.impactScope,
          category: change.category
        }
      }
    ];
    
    // Llamar a la función de actualización
    onUpdateProject(updates);
    
    return updates;
  }, [onUpdateProject]);
  
  return { applyChangeToProject };
};

export default useChangeIntegration;
