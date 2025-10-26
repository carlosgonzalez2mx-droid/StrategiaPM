import React, { useMemo, useState } from 'react';
import PortfolioCharts from './PortfolioCharts';
import CorporateAlerts from './CorporateAlerts';
import FileManager from './FileManager';

const PortfolioDashboard = ({ 
  projects, 
  currentProjectId, 
  setCurrentProjectId,
  portfolioMetrics, // Nuevo prop para métricas actualizadas
  workPackages, // Nuevo prop para work packages
  risks, // Nuevo prop para riesgos
  createProject,
  updateProject,
  deleteProject,
  duplicateProject
}) => {
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] = useState(null);
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  // Calcular métricas del portfolio con datos actualizados
  const calculatedMetrics = useMemo(() => {
    if (!projects || projects.length === 0) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
        averageProgress: 0,
        totalWorkPackages: 0,
        totalRisks: 0,
        activeRisks: 0
      };
    }

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const activeProjectsList = projects.filter(p => p.status === 'active');
    const totalBudget = activeProjectsList.reduce((sum, p) => sum + (p.budget || 0), 0);
    const averageProgress = activeProjectsList.length > 0 
      ? activeProjectsList.reduce((sum, p) => sum + (p.progress || 0), 0) / activeProjectsList.length 
      : 0;

    // Métricas adicionales de work packages y riesgos
    const totalWorkPackages = workPackages ? workPackages.length : 0;
    const totalRisks = risks ? risks.length : 0;
    const activeRisks = risks ? risks.filter(r => r.status === 'active').length : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      averageProgress: Math.round(averageProgress),
      totalWorkPackages,
      totalRisks,
      activeRisks
    };
  }, [projects, workPackages, risks]);

  // Usar métricas del portfolio si están disponibles, sino usar las calculadas
  const metrics = portfolioMetrics || calculatedMetrics;

  return (
    <div className="space-y-6">
      {/* Header del Portfolio */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏢 Portfolio Corporativo</h1>
            <p className="text-blue-100 text-lg">
              Gestión consolidada de {metrics.totalProjects} proyectos
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              ${(metrics.totalBudget / 1000).toFixed(0)}K
            </div>
            <div className="text-blue-100">Presupuesto Total (Solo Activos)</div>
          </div>
        </div>
      </div>

      {/* Nota Informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-blue-600 text-xl mr-3">ℹ️</div>
          <div className="text-blue-800">
            <strong>Nota:</strong> Las métricas financieras y KPIs solo consideran proyectos con estado "Activo". 
            Los proyectos "Inactivos" o "Completados" no influyen en los indicadores financieros.
          </div>
        </div>
      </div>

      {/* KPIs del Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Proyectos</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.totalProjects}
              </div>
            </div>
            <div className="text-blue-500 text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Proyectos Activos</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.activeProjects}
              </div>
            </div>
            <div className="text-green-500 text-2xl">🔄</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Completados</div>
              <div className="text-2xl font-bold text-gray-800">
                {metrics.completedProjects}
              </div>
            </div>
            <div className="text-purple-500 text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">Reservas</div>
              <div className="text-2xl font-bold text-gray-800">
                ${((portfolioMetrics?.totalContingency + portfolioMetrics?.totalManagement) / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-indigo-500 text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Acciones del Portfolio */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Acciones del Portfolio</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => console.log("createProject - función no implementada")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Nuevo Proyecto</span>
            </button>
            <button
              onClick={() => console.log("setViewMode - función no implementada")('project')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>📊</span>
              <span>Ver Proyecto Actual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Proyectos */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Proyectos del Portfolio</h2>
        
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📁</div>
            <div>No hay proyectos en el portfolio</div>
            <button
              onClick={() => console.log("createProject - función no implementada")}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Crear Primer Proyecto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  currentProjectId === project.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentProjectId(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)} {project.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {project.description}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📅 {project.startDate} - {project.endDate}</span>
                      <span>💰 ${(project.budget / 1000).toFixed(0)}K</span>
                      <span>👤 {project.manager}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectForFiles(project);
                        setShowFileManager(true);
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Ver archivos del proyecto"
                    >
                      📎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("duplicateProject - función no implementada")(project.id);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Duplicar proyecto"
                    >
                      📋
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Editar proyecto "${project.name}"?`)) {
                          // Aquí se abriría un modal de edición
                          console.log('Editar proyecto:', project.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Editar proyecto"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("deleteProject - función no implementada")(project.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar proyecto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Métricas del Proyecto Actual */}
      {currentProjectId && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Métricas del Proyecto Actual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {portfolioMetrics?.currentProjectCPI?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">CPI</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {portfolioMetrics?.currentProjectSPI?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-xs text-gray-600">SPI</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                ${(portfolioMetrics?.currentProjectCV / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">CV</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                ${(portfolioMetrics?.currentProjectSV / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">SV</div>
            </div>
          </div>
        </div>
      )}

      {/* Alertas Corporativas */}
      <CorporateAlerts projects={projects} portfolioMetrics={portfolioMetrics} />

      {/* Gráficos y Análisis */}
      <PortfolioCharts projects={projects} portfolioMetrics={portfolioMetrics} workPackages={workPackages} risks={risks} />

      {/* Gestor de Archivos del Proyecto Seleccionado */}
      {showFileManager && selectedProjectForFiles && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                <span className="text-2xl">📎</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Archivos del Proyecto: {selectedProjectForFiles.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Gestión completa de documentos y archivos adjuntos
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowFileManager(false);
                setSelectedProjectForFiles(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              ✕ Cerrar
            </button>
          </div>
          
          <FileManager 
            projectId={selectedProjectForFiles.id}
            category="general"
            isContextual={true}
            title={`📎 Archivos de ${selectedProjectForFiles.name}`}
            onFileUploaded={() => {
              console.log('✅ Archivo subido desde portfolio de proyectos');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default PortfolioDashboard;
