import React from 'react';

const Sidebar = ({ 
  activeSection, 
  onSectionChange,
  projects,
  currentProjectId,
  setCurrentProjectId,
  workPackages = [], // Nuevo prop para work packages
  risks = [], // Nuevo prop para riesgos
  evmMetrics = {} // Nuevo prop para métricas EVM
}) => {
  
  const navigation = [
    { id: 'portfolio', name: 'Portafolio de Proyectos', icon: '🏢' },
    { id: 'project-management', name: 'Gestión de Proyectos', icon: '📊' },
    { id: 'executive', name: 'Dashboard Ejecutivo', icon: '📈' }
  ];

  const getSectionDescription = (sectionId) => {
    switch(sectionId) {
      case 'portfolio': return 'Gestión estratégica de proyectos con Business Case, TIR y presupuestos';
      case 'project-management': return 'Control operativo con módulos de riesgos, cronograma y finanzas';
      case 'executive': return 'KPIs consolidados y métricas ejecutivas de todos los proyectos activos';
      default: return '';
    }
  };

  const currentProject = projects?.find(p => p.id === currentProjectId);

  // Calcular KPIs del proyecto actual
  const currentProjectKPIs = React.useMemo(() => {
    if (!currentProject) return {};

    const activeWorkPackages = workPackages.filter(wp => wp.status === 'active' || wp.status === 'in-progress');
    const completedWorkPackages = workPackages.filter(wp => wp.status === 'completed');
    const activeRisks = risks.filter(r => r.status === 'active');
    const highPriorityRisks = risks.filter(r => r.priority === 'high' && r.status === 'active');

    return {
      totalWorkPackages: workPackages.length,
      activeWorkPackages: activeWorkPackages.length,
      completedWorkPackages: completedWorkPackages.length,
      progressPercentage: workPackages.length > 0 ? 
        (completedWorkPackages.length / workPackages.length) * 100 : 0,
      totalRisks: risks.length,
      activeRisks: activeRisks.length,
      highPriorityRisks: highPriorityRisks.length,
      cpi: evmMetrics.CPI || 1,
      spi: evmMetrics.SPI || 1,
      percentComplete: evmMetrics.percentComplete || 0
    };
  }, [currentProject, workPackages, risks, evmMetrics]);

  // Función para obtener el color de estado del proyecto
  const getProjectStatusColor = () => {
    if (!currentProject) return 'text-gray-500';
    
    const cpi = Number(currentProjectKPIs.cpi || 1);
    const spi = Number(currentProjectKPIs.spi || 1);
    
    if (cpi < 0.9 || spi < 0.9) return 'text-red-500';
    if (cpi < 1.0 || spi < 1.0) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="
      fixed top-0 left-0 h-full bg-white shadow-xl z-50 
      w-80 lg:w-72 lg:static lg:z-auto
      border-r border-gray-200
    ">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          StrategiaPM
        </h1>
        {currentProject && (
          <div className="text-sm text-gray-600">
            <p className="font-medium">{currentProject.name}</p>
            <p className="text-xs text-gray-500">{currentProject.manager}</p>
            {/* KPI de estado del proyecto */}
            <div className="mt-2 flex items-center space-x-2">
              <span className={`text-xs font-medium ${getProjectStatusColor()}`}>
                {Number(currentProjectKPIs.percentComplete || 0).toFixed(1)}% completado
              </span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">
                CPI: {Number(currentProjectKPIs.cpi || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>



      {/* KPIs Rápidos del Proyecto Actual */}
      {currentProject && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">KPIs del Proyecto</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Work Packages:</span>
              <span className="font-medium">
                {currentProjectKPIs.activeWorkPackages}/{currentProjectKPIs.totalWorkPackages}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Riesgos Activos:</span>
              <span className={`font-medium ${currentProjectKPIs.highPriorityRisks > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {currentProjectKPIs.activeRisks} ({currentProjectKPIs.highPriorityRisks} alta)
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">SPI:</span>
              <span className={`font-medium ${Number(currentProjectKPIs.spi || 1) < 1 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(currentProjectKPIs.spi || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map(section => (
            <li key={section.id}>
              <button
                onClick={() => onSectionChange(section.id)}
                className={`
                  w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors
                  ${activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-xl mr-3">{section.icon}</span>
                <div>
                  <div className="font-medium">{section.name}</div>
                  <div className="text-xs text-gray-500">
                    {getSectionDescription(section.id)}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

    </div>
  );
};

export default Sidebar;
