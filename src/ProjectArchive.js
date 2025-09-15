import React, { useState, useMemo } from 'react';
import useFileStorage from '../hooks/useFileStorage';

const ProjectArchive = ({ 
  project, 
  workPackages, 
  risks, 
  tasks, 
  purchaseOrders, 
  advances, 
  invoices, 
  contracts,
  resourceAssignments,
  onArchiveProject 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState(0);

  // Obtener audit log del proyecto
  const getProjectAuditLog = () => {
    if (!project) return [];
    try {
      const savedLog = localStorage.getItem(`audit-log-${project.id}`);
      return savedLog ? JSON.parse(savedLog) : [];
    } catch (error) {
      console.error('Error loading audit log:', error);
      return [];
    }
  };

  const auditLog = getProjectAuditLog();

  // Obtener archivos del proyecto
  const { files: projectFiles, getFileStats } = useFileStorage(project?.id);
  const fileStats = getFileStats();

  // Calcular métricas finales del proyecto
  const finalMetrics = useMemo(() => {
    if (!project) return {};

    const totalWorkPackages = workPackages.length;
    const completedWorkPackages = workPackages.filter(wp => wp.status === 'completed').length;
    const totalBudget = workPackages.reduce((sum, wp) => sum + (wp.budget || 0), 0);
    const totalEarned = workPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0);
    const totalActual = workPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0);

    const completionPercentage = totalWorkPackages > 0 ? (completedWorkPackages / totalWorkPackages) * 100 : 0;
    const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    const cpi = totalActual > 0 ? totalEarned / totalActual : 1;

    return {
      totalWorkPackages,
      completedWorkPackages,
      completionPercentage,
      totalBudget,
      totalEarned,
      totalActual,
      budgetUtilization,
      cpi,
      totalRisks: risks.length,
      activeRisks: risks.filter(r => r.status === 'active').length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalFinancialItems: purchaseOrders.length + advances.length + invoices.length + contracts.length,
      totalResourceAssignments: resourceAssignments.length,
      totalAuditEvents: auditLog.length,
      totalFiles: projectFiles.length,
      totalFileSize: fileStats.totalSizeMB
    };
      }, [project, workPackages, risks, tasks, purchaseOrders, advances, invoices, contracts, resourceAssignments, auditLog, projectFiles, fileStats]);

  // Validar que el proyecto esté listo para archivado
  const canArchive = useMemo(() => {
    if (!project) return false;
    
    // El proyecto debe estar completado
    if (project.status !== 'completed') return false;
    
    // Debe tener al menos 90% de completitud
    if (finalMetrics.completionPercentage < 90) return false;
    
    // Debe tener al menos algunos work packages
    if (finalMetrics.totalWorkPackages === 0) return false;
    
    return true;
  }, [project, finalMetrics]);

  // Generar expediente del proyecto
  const generateProjectArchive = async () => {
    if (!canArchive) return;

    setIsGenerating(true);
    setArchiveProgress(0);

    try {
      // Simular progreso de generación
      const steps = [
        'Validando datos del proyecto...',
        'Generando métricas finales...',
        'Compilando documentación...',
        'Creando expediente...',
        'Finalizando archivado...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setArchiveProgress((i / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Crear objeto del expediente
      const projectArchive = {
        metadata: {
          archiveDate: new Date().toISOString(),
          archiveVersion: '1.0.0',
          projectId: project.id,
          projectName: project.name,
          archiveType: 'project-completion'
        },
        project: {
          ...project,
          archivedAt: new Date().toISOString(),
          finalMetrics: finalMetrics
        },
        workPackages,
        risks,
        tasks,
        financial: {
          purchaseOrders,
          advances,
          invoices,
          contracts
        },
        resources: resourceAssignments,
        auditLog,
        files: projectFiles,
        summary: {
          totalDuration: Math.round((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24)),
          finalBudget: finalMetrics.totalBudget,
          finalCost: finalMetrics.totalActual,
          completionRate: finalMetrics.completionPercentage,
          performanceIndex: finalMetrics.cpi,
          lessonsLearned: generateLessonsLearned()
        }
      };

      // Exportar expediente
      const dataStr = JSON.stringify(projectArchive, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expediente-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setArchiveProgress(100);
      
      // Llamar función de archivado
      if (onArchiveProject) {
        onArchiveProject(project.id, projectArchive);
      }

    } catch (error) {
      console.error('Error generando expediente:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar lecciones aprendidas basadas en métricas
  const generateLessonsLearned = () => {
    const lessons = [];
    
    if (finalMetrics.cpi < 0.9) {
      lessons.push('El proyecto tuvo sobrecostos significativos. Revisar estimaciones de costos para futuros proyectos similares.');
    }
    
    if (finalMetrics.completionPercentage < 95) {
      lessons.push('Algunos entregables no se completaron al 100%. Mejorar el seguimiento de work packages.');
    }
    
    if (finalMetrics.activeRisks > 0) {
      lessons.push('Quedaron riesgos activos al finalizar. Implementar mejor gestión de riesgos desde el inicio.');
    }
    
    if (finalMetrics.totalAuditEvents > 100) {
      lessons.push('El proyecto tuvo muchos cambios. Implementar mejor control de cambios.');
    }
    
    if (lessons.length === 0) {
      lessons.push('El proyecto se ejecutó exitosamente. Replicar buenas prácticas en futuros proyectos.');
    }
    
    return lessons;
  };

  if (!project) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📁</div>
        <div className="text-lg mb-2">Selecciona un proyecto para generar su expediente</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📁 Archivado de Proyecto</h1>
            <p className="text-purple-100 text-lg">
              Generar expediente completo y archivar "{project.name}"
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {finalMetrics.completionPercentage.toFixed(1)}%
            </div>
            <div className="text-purple-100">Completitud</div>
          </div>
        </div>
      </div>

      {/* Estado del Proyecto */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Proyecto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Estado Actual</div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                {getStatusIcon(project.status)} {project.status}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Manager</div>
            <div className="font-medium">{project.manager}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Presupuesto Original</div>
            <div className="font-medium">${(project.budget / 1000).toFixed(0)}K USD</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Período</div>
            <div className="font-medium">{project.startDate} - {project.endDate}</div>
          </div>
        </div>
      </div>

      {/* Métricas Finales */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Métricas Finales</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{finalMetrics.totalWorkPackages}</div>
            <div className="text-sm text-gray-600">Work Packages</div>
            <div className="text-xs text-gray-500">{finalMetrics.completedWorkPackages} completados</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">${(finalMetrics.totalBudget / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-600">Presupuesto Total</div>
            <div className="text-xs text-gray-500">${(finalMetrics.totalActual / 1000).toFixed(0)}K gastado</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{finalMetrics.totalAuditEvents}</div>
            <div className="text-sm text-gray-600">Eventos de Auditoría</div>
            <div className="text-xs text-gray-500">Registros completos</div>
          </div>
        </div>
      </div>

      {/* Información del Audit Log */}
      {auditLog.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Registro de Auditoría</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total de eventos registrados:</span>
              <span className="font-semibold text-purple-600">{auditLog.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Primer evento:</span>
              <span className="text-sm text-gray-500">
                {auditLog.length > 0 ? new Date(auditLog[auditLog.length - 1].timestamp).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Último evento:</span>
              <span className="text-sm text-gray-500">
                {auditLog.length > 0 ? new Date(auditLog[0].timestamp).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm text-purple-800">
                <strong>✅ Audit Log incluido:</strong> El expediente incluirá todos los eventos de auditoría registrados 
                desde la activación del proyecto hasta su completitud.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validación de Archivado */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Validación de Archivado</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${project.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
              {project.status === 'completed' ? '✅' : '❌'}
            </span>
            <span className="text-sm">Proyecto marcado como completado</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${finalMetrics.completionPercentage >= 90 ? 'text-green-500' : 'text-red-500'}`}>
              {finalMetrics.completionPercentage >= 90 ? '✅' : '❌'}
            </span>
            <span className="text-sm">Completitud mínima del 90% ({finalMetrics.completionPercentage.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-xl ${finalMetrics.totalWorkPackages > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {finalMetrics.totalWorkPackages > 0 ? '✅' : '❌'}
            </span>
            <span className="text-sm">Work packages definidos ({finalMetrics.totalWorkPackages})</span>
          </div>
        </div>
        
        {!canArchive && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">
              <strong>No se puede archivar:</strong> El proyecto no cumple con los criterios mínimos de archivado.
            </div>
          </div>
        )}
      </div>

      {/* Contenido del Expediente */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Contenido del Expediente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Información del proyecto</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Work packages completos</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Gestión de riesgos</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Cronograma y tareas</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Documentación financiera</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Asignación de recursos</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Auditoría completa ({auditLog.length} eventos)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Archivos adjuntos ({projectFiles.length} archivos, {fileStats.totalSizeMB}MB)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-sm">Lecciones aprendidas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso de Generación */}
      {isGenerating && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Generando Expediente</h3>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${archiveProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 text-center">
              {archiveProgress.toFixed(0)}% completado
            </div>
          </div>
        </div>
      )}

      {/* Botón de Archivado */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Archivar Proyecto</h3>
            <p className="text-sm text-gray-600 mt-1">
              Generar expediente completo y cambiar estado a "Archivado"
            </p>
          </div>
          <button
            onClick={generateProjectArchive}
            disabled={!canArchive || isGenerating}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${canArchive && !isGenerating
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? 'Generando...' : '📁 Generar Expediente y Archivar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Funciones helper
const getStatusColor = (status) => {
  switch(status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive': return 'bg-gray-100 text-gray-600 border-gray-300';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'archived': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status) => {
  switch(status) {
    case 'active': return '🟢';
    case 'inactive': return '⚫';
    case 'completed': return '✅';
    case 'on-hold': return '⏸️';
    case 'cancelled': return '❌';
    case 'archived': return '📁';
    default: return '⏸️';
  }
};

export default ProjectArchive;
