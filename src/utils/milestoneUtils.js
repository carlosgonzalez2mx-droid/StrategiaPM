export const classifyMilestones = (milestones, currentDate = new Date()) => {
  const completedMilestones = milestones.filter(m => (m.progress || 0) >= 100);
  const inProgressMilestones = milestones.filter(m => (m.progress || 0) > 0);
  
  const delayedMilestones = milestones.filter(m => {
    const progress = m.progress || 0;
    if (progress >= 100) return false;
    
    if (m.endDate) {
      const endDate = new Date(m.endDate);
      return endDate < currentDate && progress < 100;
    }
    
    return false;
  });
  
  const pendingMilestones = milestones.filter(m => {
    const progress = m.progress || 0;
    return progress === 0 && !delayedMilestones.includes(m);
  });

  return {
    completedMilestones,
    inProgressMilestones,
    delayedMilestones,
    pendingMilestones
  };
};
