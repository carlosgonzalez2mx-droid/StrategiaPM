import { useMemo } from 'react';
import { classifyMilestones } from '../utils/milestoneUtils';

export const useMilestoneMetrics = (tasksByProject) => {
  return useMemo(() => {
    const allTasks = Object.values(tasksByProject || {}).flat();
    const milestones = allTasks.filter(task => task.isMilestone);
    const currentDate = new Date();
    
    const { 
      completedMilestones, 
      inProgressMilestones, 
      delayedMilestones, 
      pendingMilestones 
    } = classifyMilestones(milestones, currentDate);

    // Debug logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 DEBUG HITOS PORTFOLIO MEJORADO:', {
        totalTasks: allTasks.length,
        totalMilestones: milestones.length,
        completed: completedMilestones.length,
        inProgress: inProgressMilestones.length,
        delayed: delayedMilestones.length,
        pending: pendingMilestones.length,
        currentDate: currentDate.toISOString().split('T')[0]
      });
    }

    return {
      allTasks,
      milestones,
      completedMilestones,
      inProgressMilestones,
      delayedMilestones,
      pendingMilestones,
      currentDate
    };
  }, [tasksByProject]);
};
