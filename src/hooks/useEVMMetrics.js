import { useMemo } from 'react';

export const useEVMMetrics = (tasksByProject) => {
  return useMemo(() => {
    const allTasks = Object.values(tasksByProject || {}).flat();
    
    // Presupuesto total: suma de costos de todas las tareas
    const totalWorkPackageBudget = allTasks.reduce((sum, task) => sum + (task.cost || 0), 0);
    
    // Valor ganado: suma de costos * progreso de tareas
    const totalWorkPackageEarned = allTasks.reduce((sum, task) => {
      const progress = (task.progress || 0) / 100;
      return sum + ((task.cost || 0) * progress);
    }, 0);
    
    // Costo actual: estimación basada en progreso
    // En un sistema real, esto vendría de órdenes de compra, facturas, etc.
    const totalWorkPackageActual = allTasks.reduce((sum, task) => {
      const progress = (task.progress || 0) / 100;
      // Asumir que el costo actual es proporcional al progreso
      return sum + ((task.cost || 0) * progress * 0.8); // Factor de 0.8 para simular eficiencia
    }, 0);

    const consolidatedCPI = totalWorkPackageActual > 0 ? totalWorkPackageEarned / totalWorkPackageActual : 1;
    const consolidatedSPI = totalWorkPackageBudget > 0 ? totalWorkPackageEarned / totalWorkPackageBudget : 1;
    const consolidatedCV = totalWorkPackageEarned - totalWorkPackageActual;
    const consolidatedSV = totalWorkPackageEarned - totalWorkPackageBudget;
    const consolidatedVAC = totalWorkPackageBudget - (totalWorkPackageActual + (totalWorkPackageBudget - totalWorkPackageEarned));
    const consolidatedEAC = totalWorkPackageBudget / consolidatedCPI;

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 MÉTRICAS EVM CALCULADAS:', {
        dataSource: 'tasks',
        tasksCount: allTasks.length,
        totalWorkPackageBudget,
        totalWorkPackageEarned,
        totalWorkPackageActual,
        consolidatedCPI,
        consolidatedSPI,
        consolidatedVAC,
        consolidatedEAC
      });
    }

    return {
      totalWorkPackageBudget,
      totalWorkPackageEarned,
      totalWorkPackageActual,
      consolidatedCPI,
      consolidatedSPI,
      consolidatedCV,
      consolidatedSV,
      consolidatedVAC,
      consolidatedEAC
    };
  }, [tasksByProject]);
};
