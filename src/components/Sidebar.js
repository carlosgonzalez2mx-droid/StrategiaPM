import React from 'react';

const Sidebar = ({ 
  activeSection, 
  onSectionChange,
  projects,
  currentProjectId,
  setCurrentProjectId,
  workPackages = [], // Nuevo prop para work packages
  risks = [], // Nuevo prop para riesgos
  evmMetrics = {}, // Nuevo prop para métricas EVM
  isCollapsed = false, // Nuevo prop para estado colapsado
  onToggleCollapse, // Función para alternar el estado
  onSaveAndClose // Función para guardar y cerrar
}) => {
  
  const navigation = [
    { id: 'portfolio', name: 'Portafolio de Proyectos', icon: '🏢' },
    { id: 'project-management', name: 'Gestión de Proyectos', icon: '📊' },
    { id: 'organization-members', name: 'Miembros de Organización', icon: '👥' },
    { id: 'executive', name: 'Dashboard Ejecutivo', icon: '📈' }
  ];

  const getSectionDescription = (sectionId) => {
    switch(sectionId) {
      case 'portfolio': return 'Gestión estratégica de proyectos con Business Case, TIR y presupuestos';
      case 'project-management': return 'Control operativo con módulos de riesgos, cronograma y finanzas';
      case 'organization-members': return 'Gestiona quién puede ver y editar tus proyectos colaborativamente';
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
    <>
      {/* Botón flotante para expandir cuando está colapsado */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
          title="Expandir menú"
        >
          <span className="text-lg font-bold">☰</span>
        </button>
      )}
      
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-40 
        ${isCollapsed ? 'w-16' : 'w-80 lg:w-72'} 
        border-r border-gray-200
        transition-all duration-300
      `}>
      {/* Header */}
      <div className={`border-b border-gray-200 ${isCollapsed ? 'p-2' : 'p-6'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              StrategiaPM
            </h1>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 z-10 relative"
            title={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            style={{ minWidth: '40px', minHeight: '40px' }}
          >
            <span className="text-xl font-bold">
              {isCollapsed ? '→' : '←'}
            </span>
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="text-sm text-gray-600">
            <p className="font-medium">Gestión de Proyectos</p>
          </div>
        )}
      </div>




      {/* Navigation */}
      {!isCollapsed && (
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
      )}

      {/* Botón Guardar y Cerrar */}
      {!isCollapsed && (
        <div className="mt-auto p-4 border-t border-gray-200">
          <button
            onClick={onSaveAndClose}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            title="Guardar todos los datos y cerrar la aplicación"
          >
            <span className="text-lg">💾</span>
            <span className="font-medium">Guardar y Cerrar</span>
          </button>
        </div>
      )}

      {/* Botón colapsado para Guardar y Cerrar */}
      {isCollapsed && (
        <div className="mt-auto p-2 border-t border-gray-200">
          <button
            onClick={onSaveAndClose}
            className="w-full bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            title="Guardar todos los datos y cerrar la aplicación"
          >
            <span className="text-lg">💾</span>
          </button>
        </div>
      )}

    </div>
    </>
  );
};

export default Sidebar;
