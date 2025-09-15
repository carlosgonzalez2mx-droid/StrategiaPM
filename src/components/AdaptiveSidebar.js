import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdaptiveSidebar = ({ currentProject, currentProjectKPIs, onViewChange }) => {
  const { hasModuleAccess, getUserRoleInfo } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const roleInfo = getUserRoleInfo();

  // Función para obtener el color del estado del proyecto
  const getProjectStatusColor = () => {
    if (!currentProjectKPIs) return 'text-gray-500';
    const percentComplete = Number(currentProjectKPIs.percentComplete || 0);
    if (percentComplete >= 80) return 'text-green-600';
    if (percentComplete >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Menú principal adaptativo según permisos
  const getMainMenu = () => {
    const menu = [];

    // Portafolio de Proyectos
    if (hasModuleAccess('portfolio')) {
      menu.push({
        id: 'portfolio',
        name: 'Portafolio de Proyectos',
        icon: '📊',
        path: '/portfolio',
        description: 'Gestión estratégica de proyectos'
      });
    }

    // Gestión de Proyectos
    if (hasModuleAccess('projects')) {
      menu.push({
        id: 'projects',
        name: 'Gestión de Proyectos',
        icon: '🚀',
        path: '/projects',
        description: 'Dashboard y módulos operativos'
      });
    }

    // Dashboard Ejecutivo
    if (hasModuleAccess('dashboard')) {
      menu.push({
        id: 'dashboard',
        name: 'Dashboard Ejecutivo',
        icon: '📈',
        path: '/executive',
        description: 'KPIs consolidados y métricas'
      });
    }

    // Reportes
    if (hasModuleAccess('reports')) {
      menu.push({
        id: 'reports',
        name: 'Reportes',
        icon: '📋',
        path: '/reports',
        description: 'Generación y gestión de reportes'
      });
    }

    // Auditoría
    if (hasModuleAccess('audit')) {
      menu.push({
        id: 'audit',
        name: 'Auditoría',
        icon: '🔍',
        path: '/audit',
        description: 'Trazabilidad y auditoría documental'
      });
    }

    // Gestión de Usuarios (solo para Project Managers)
    if (hasModuleAccess('users')) {
      menu.push({
        id: 'users',
        name: 'Gestión de Usuarios',
        icon: '👥',
        path: '/users',
        description: 'Administración de usuarios y roles'
      });
    }

    return menu;
  };

  const mainMenu = getMainMenu();

  // Función para manejar la navegación
  const handleNavigation = (viewId, path) => {
    // Actualizar la vista en el componente padre
    if (onViewChange) {
      onViewChange(viewId);
    }
    
    // Navegar a la ruta
    navigate(path);
  };

  // Determinar la vista activa basada en la ruta actual
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/portfolio' || path === '/') return 'portfolio';
    if (path === '/projects') return 'projects';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/executive') return 'executive';
    if (path === '/users') return 'users';
    return 'portfolio';
  };

  const activeView = getActiveView();

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header del Sidebar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🚀</div>
              <div className="text-lg font-bold text-gray-800">StrategiaPM</div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Información del Usuario */}
      {!isCollapsed && roleInfo && (
        <div className="p-4 border-b border-gray-200">
          <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${roleInfo.color} text-white w-full justify-center`}>
            <span className="mr-2">👑</span>
            {roleInfo.name}
          </div>
        </div>
      )}

      {/* Menú Principal */}
      <nav className="p-4">
        <div className="space-y-2">
          {mainMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id, item.path)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group w-full text-left ${
                isCollapsed ? 'justify-center' : ''
              } ${activeView === item.id ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Información del Proyecto Actual */}
      {currentProject && !isCollapsed && (
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-800 mb-2">
              📋 Proyecto Actual
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {currentProject.name}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {currentProject.manager}
            </div>
            
            {/* KPIs del Proyecto */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Progreso:</span>
                <span className={`font-medium ${getProjectStatusColor()}`}>
                  {Number(currentProjectKPIs?.percentComplete || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">CPI:</span>
                <span className="font-medium text-gray-700">
                  {Number(currentProjectKPIs?.cpi || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer del Sidebar */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="text-center text-xs text-gray-400">
            <div>StrategiaPM v2.0</div>
            <div>© 2025</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveSidebar;
