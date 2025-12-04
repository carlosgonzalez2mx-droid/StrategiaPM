import { logger } from '../utils/logger';

import React from 'react';
import supabaseService from '../services/SupabaseService';
import usePermissions from '../hooks/usePermissions';
import SaveButton from './SaveButton';

const Sidebar = ({
  activeSection,
  onSectionChange,
  projects,
  currentProjectId,
  setCurrentProjectId,
  workPackages = [], // Nuevo prop para work packages
  risks = [], // Nuevo prop para riesgos
  evmMetrics = {}, // Nuevo prop para métricas EVM
  isCollapsed = false, // Prop para estado colapsado
  onToggleCollapse, // Función para alternar el estado
  // Props para SaveButton
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSaved = null
}) => {

  // Hook de permisos
  const { permissions, isReadOnly } = usePermissions();


  const allNavigation = [
    { id: 'portfolio', name: 'Portafolio de Proyectos', icon: '🏢', requiresEdit: true },
    { id: 'project-management', name: 'Gestión de Proyectos', icon: '📊', requiresEdit: false },
    { id: 'executive', name: 'Dashboard Ejecutivo', icon: '📈', requiresEdit: false },
    { id: 'user-management', name: 'Gestión de Usuarios', icon: '👥', requiresEdit: true }
  ];

  // Filtrar navegación basado en permisos del usuario
  const navigation = allNavigation.filter(section => {
    if (section.requiresEdit && isReadOnly()) {
      return false; // Ocultar secciones que requieren edición para usuarios de solo lectura
    }
    return true;
  });

  const getSectionDescription = (sectionId) => {
    switch (sectionId) {
      case 'portfolio': return 'Gestión estratégica de proyectos con Business Case, TIR y presupuestos';
      case 'project-management': return 'Control operativo con módulos de riesgos, cronograma y finanzas';
      case 'executive': return 'KPIs consolidados y métricas ejecutivas de todos los proyectos activos';
      case 'user-management': return 'Gestionar usuarios, roles y permisos de la organización';
      default: return '';
    }
  };

  const currentProject = projects?.find(p => p.id === currentProjectId);

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
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">Gestión de Proyectos</p>
              {/* Usuario activo */}
              <div className="flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-blue-600">👤</span>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-blue-800">
                    {supabaseService.getCurrentUser()?.email || 'Usuario no autenticado'}
                  </span>
                  <span className="text-xs text-blue-600">
                    {supabaseService.getCurrentUser() ? '🟢 Conectado' : '🔴 Desconectado'}
                  </span>
                </div>
              </div>

              {/* Indicador de modo solo lectura */}
              {isReadOnly() && (
                <div className="flex items-center space-x-2 px-2 py-1 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-orange-600">👀</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-orange-800">
                      Modo Solo Lectura
                    </span>
                    <span className="text-xs text-orange-600">
                      Acceso limitado a visualización
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de Conexión */}
              <div className="space-y-2">
                {/* Botón Desconectar Usuario - Solo si hay usuario conectado */}
                {supabaseService.getCurrentUser() && (
                  <button
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de que quieres desconectarte?\n\nEsto cerrará completamente tu sesión por seguridad.')) {
                        logger.debug('🚪 Cerrando sesión de Supabase...');

                        try {
                          // LOGOUT REAL DE SUPABASE para seguridad
                          const result = await supabaseService.signOut();

                          if (result.success) {
                            logger.debug('✅ Logout completo exitoso');

                            // Verificar que realmente no hay usuario
                            const stillLoggedIn = supabaseService.getCurrentUser();
                            if (stillLoggedIn) {
                              logger.warn('⚠️ Usuario aún detectado después del logout, forzando recarga...');
                            }

                            // Pequeña pausa para asegurar que el logout se procesó
                            setTimeout(() => {
                              logger.debug('🔄 Recargando página para limpiar estado...');
                              window.location.reload();
                            }, 500);
                          } else {
                            logger.error('❌ Error cerrando sesión:', result.error);
                            alert('❌ Error al cerrar sesión. Inténtalo de nuevo.');
                          }
                        } catch (error) {
                          logger.error('❌ Error inesperado:', error);
                          alert('❌ Error inesperado al cerrar sesión.');
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-2 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-red-600">🚪</span>
                    <span className="text-xs font-medium text-red-800">
                      Desconectar Usuario
                    </span>
                  </button>
                )}

                {/* Botón Conectar Usuario - Solo si NO hay usuario conectado */}
                {!supabaseService.getCurrentUser() && (
                  <button
                    onClick={() => {
                      logger.debug('🔑 Abriendo modal de autenticación...');
                      // Disparar evento para abrir modal de autenticación
                      window.dispatchEvent(new CustomEvent('requestSupabaseAuth', {
                        detail: { action: 'login' }
                      }));
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-2 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-green-600">🔑</span>
                    <span className="text-xs font-medium text-green-800">
                      Conectar Usuario
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!isCollapsed && (
          <nav className="p-3">
            <ul className="space-y-1">
              {navigation.map(section => (
                <li key={section.id}>
                  <button
                    onClick={() => onSectionChange(section.id)}
                    className={`
                      w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors
                      ${activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="text-lg mr-2">{section.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{section.name}</div>
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

        {/* Footer con botón de guardado */}
        {!isReadOnly() && onSave && (
          <div className={`border-t border-gray-200 mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {!isCollapsed ? (
              <SaveButton
                onSave={onSave}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                lastSaved={lastSaved}
              />
            ) : (
              /* Botón colapsado */
              <button
                onClick={onSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`w-full p-3 rounded-lg transition-colors duration-200 flex items-center justify-center ${hasUnsavedChanges && !isSaving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                  }`}
                title={isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar (Ctrl+S)' : 'No hay cambios'}
              >
                <span className="text-lg">{isSaving ? '⏳' : '💾'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;