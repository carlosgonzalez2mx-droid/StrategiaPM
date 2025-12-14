import React from 'react';
import { logger } from '../utils/logger';
import supabaseService from '../services/SupabaseService';
import usePermissions from '../hooks/usePermissions';
import SaveButton from './SaveButton';
import { cn } from '../lib/utils'; // Import helper

const Sidebar = ({
  activeSection,
  onSectionChange,
  projects,
  currentProjectId,
  workPackages = [],
  risks = [],
  evmMetrics = {},
  isCollapsed = false,
  onToggleCollapse,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSaved = null
}) => {

  const { isReadOnly } = usePermissions();

  const allNavigation = [
    { id: 'portfolio', name: 'Portafolio de Proyectos', icon: '🏢', requiresEdit: true },
    { id: 'project-management', name: 'Gestión de Proyectos', icon: '📊', requiresEdit: false },
    { id: 'executive', name: 'Dashboard Ejecutivo', icon: '📈', requiresEdit: false },
    { id: 'user-management', name: 'Gestión de Usuarios', icon: '👥', requiresEdit: true },
    { id: 'help', name: 'Ayuda', icon: '📖', requiresEdit: false, isHelp: true }
  ];

  const navigation = allNavigation.filter(section => {
    if (section.requiresEdit && isReadOnly()) return false;
    return true;
  });

  const getSectionDescription = (sectionId) => {
    switch (sectionId) {
      case 'portfolio': return 'Gestión estratégica y presupuestos';
      case 'project-management': return 'Control operativo de proyectos';
      case 'executive': return 'KPIs y métricas consolidadas';
      case 'user-management': return 'Gestión de usuarios y roles';
      case 'help': return 'Ayuda y documentación';
      default: return '';
    }
  };

  const handleDownloadManual = () => {
    window.open('/Manual_StrategiaPM_v1.0.pdf', '_blank');
  };

  const currentUser = supabaseService.getCurrentUser();

  return (
    <>
      {/* Mobile / Collapsed Trigger */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-soft hover:shadow-soft-md transition-all duration-200 border border-slate-100"
          title="Expandir menú"
        >
          <img src="/logo_icon_only.svg" alt="StrategiaPM" className="h-8 w-8" />
        </button>
      )}

      <div className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300 ease-in-out flex flex-col shadow-soft-lg",
        isCollapsed ? "w-0 -translate-x-full opacity-0 overflow-hidden" : "w-72 translate-x-0 opacity-100"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <img
            src="/logo_strategiapm.svg"
            alt="StrategiaPM"
            className="h-8 w-auto object-contain"
          />
          <button
            onClick={onToggleCollapse}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        </div>

        {/* User Info (Compact) */}
        {!isCollapsed && (
          <div className="px-4 py-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
                {currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {currentUser?.email || 'Usuario'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", currentUser ? "bg-emerald-500" : "bg-red-500")} />
                  <span className="text-xs text-slate-500">
                    {currentUser ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {navigation.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => section.isHelp ? handleDownloadManual() : onSectionChange(section.id)}
                className={cn(
                  "w-full flex items-start p-3 rounded-xl transition-all duration-200 group text-left",
                  isActive
                    ? "bg-slate-900 text-white shadow-soft-md"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className={cn(
                  "text-xl mr-3 transition-colors",
                  isActive ? "text-brand-400" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  {section.icon}
                </span>
                <div>
                  <div className={cn("font-medium text-sm", isActive ? "text-white" : "")}>
                    {section.name}
                  </div>
                  <div className={cn("text-xs mt-0.5", isActive ? "text-slate-400" : "text-slate-400")}>
                    {getSectionDescription(section.id)}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/30">
          {currentUser ? (
            <button
              onClick={async () => {
                if (window.confirm('¿Deseas cerrar sesión?')) {
                  await supabaseService.signOut();
                  window.location.reload();
                }
              }}
              className="w-full flex items-center justify-center space-x-2 p-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('requestSupabaseAuth', { detail: { action: 'login' } }))}
              className="w-full flex items-center justify-center space-x-2 p-2 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200"
            >
              <span>Conectar</span>
            </button>
          )}

          {!isReadOnly() && onSave && (
            <div className="pt-2">
              <SaveButton
                onSave={onSave}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                lastSaved={lastSaved}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;