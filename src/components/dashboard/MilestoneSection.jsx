import React from 'react';
import { classifyMilestones } from '../../utils/milestoneUtils';
import { formatPercentage } from '../../utils/formatters';

const MilestoneSection = ({ 
  projects, 
  tasksByProject, 
  completedMilestones, 
  inProgressMilestones, 
  delayedMilestones,
  milestones 
}) => {
  const activeProjects = projects?.filter(project => project.status === 'active') || [];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="text-3xl mr-3">🎯</span>
        Hitos del Portafolio
      </h2>
      
      {/* Mostrar hitos por proyecto individual */}
      <div className="space-y-6">
        {activeProjects.length > 0 ? (
          activeProjects.map(project => {
            const projectTasks = tasksByProject?.[project.id] || [];
            const projectMilestones = projectTasks.filter(task => task.isMilestone);
            const currentDate = new Date();
            
            const { 
              completedMilestones: projectCompleted, 
              inProgressMilestones: projectInProgress, 
              delayedMilestones: projectDelayed 
            } = classifyMilestones(projectMilestones, currentDate);
            
            const projectProgress = projectMilestones.length > 0 
              ? Math.round((projectCompleted.length / projectMilestones.length) * 100) 
              : 0;
            
            return (
              <div key={project.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-xl mr-2">📋</span>
                  {project.name}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({projectMilestones.length} hitos)
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">✅</span>
                      <span className="text-xs font-medium text-green-600">Completados</span>
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      {projectCompleted.length}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Hitos realizados
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">🔄</span>
                      <span className="text-xs font-medium text-yellow-600">En Proceso</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-800">
                      {projectInProgress.length}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      Hitos en ejecución
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">⚠️</span>
                      <span className="text-xs font-medium text-red-600">Atrasados</span>
                    </div>
                    <div className="text-2xl font-bold text-red-800">
                      {projectDelayed.length}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Hitos retrasados
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">📈</span>
                      <span className="text-xs font-medium text-blue-600">Progreso</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      {formatPercentage(projectProgress)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Completitud
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-4 block">📋</span>
            <p>No hay proyectos activos con hitos</p>
          </div>
        )}
      </div>
      
      {/* Resumen consolidado */}
      {activeProjects.length > 1 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-xl mr-2">📊</span>
            Resumen Consolidado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">✅</span>
                <span className="text-xs font-medium text-green-600">Total Completados</span>
              </div>
              <div className="text-2xl font-bold text-green-800">
                {completedMilestones.length}
              </div>
              <div className="text-xs text-green-600 mt-1">
                Hitos realizados
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🔄</span>
                <span className="text-xs font-medium text-yellow-600">Total En Proceso</span>
              </div>
              <div className="text-2xl font-bold text-yellow-800">
                {inProgressMilestones.length}
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                Hitos en ejecución
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">⚠️</span>
                <span className="text-xs font-medium text-red-600">Total Atrasados</span>
              </div>
              <div className="text-2xl font-bold text-red-800">
                {delayedMilestones.length}
              </div>
              <div className="text-xs text-red-600 mt-1">
                Hitos retrasados
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">📈</span>
                <span className="text-xs font-medium text-blue-600">Progreso General</span>
              </div>
              <div className="text-2xl font-bold text-blue-800">
                {milestones.length > 0 ? formatPercentage((completedMilestones.length / milestones.length) * 100) : '0%'}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Completitud general
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneSection;
