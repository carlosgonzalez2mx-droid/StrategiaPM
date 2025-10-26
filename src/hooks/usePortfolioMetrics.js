import { useMemo } from 'react';

export const usePortfolioMetrics = (projects) => {
  return useMemo(() => {
    const activeProjects = projects?.filter(p => p.status === 'active') || [];
    const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalReserves = activeProjects.reduce((sum, p) => sum + ((p.budget || 0) * 0.15), 0);
    
    const projectDates = activeProjects.map(p => ({
      start: p.startDate ? new Date(p.startDate) : null,
      end: p.endDate ? new Date(p.endDate) : null
    })).filter(d => d.start && d.end);
    
    const earliestStart = projectDates.length > 0 ? 
      new Date(Math.min(...projectDates.map(d => d.start.getTime()))) : null;
    const latestEnd = projectDates.length > 0 ? 
      new Date(Math.max(...projectDates.map(d => d.end.getTime()))) : null;

    return {
      activeProjects,
      totalBudget,
      totalReserves,
      earliestStart,
      latestEnd
    };
  }, [projects]);
};
