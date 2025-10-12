import { useMemo } from 'react';

export const useRiskMetrics = (risks) => {
  return useMemo(() => {
    const activeRisks = risks?.filter(r => r.status === 'active') || [];
    const highPriorityRisks = activeRisks.filter(r => r.priority === 'high');
    const mediumPriorityRisks = activeRisks.filter(r => r.priority === 'medium');
    const lowPriorityRisks = activeRisks.filter(r => r.priority === 'low');

    return {
      activeRisks,
      highPriorityRisks,
      mediumPriorityRisks,
      lowPriorityRisks
    };
  }, [risks]);
};
