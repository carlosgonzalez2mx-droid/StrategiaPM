import React, { useState, useEffect } from 'react';
import OrganizationMembers from './OrganizationMembers';
import ChangeFlowDiagram from './change-management/ChangeFlowDiagram';
import { cn } from '../lib/utils';

const UserManagement = ({
  currentProject,
  useSupabase = false,
  projects = []
}) => {
  const [activeTab, setActiveTab] = useState('members');
  const [organizationStats, setOrganizationStats] = useState({
    totalMembers: 0,
    pendingInvitations: 0,
    activeProjects: 0
  });

  // Calcular estadísticas de la organización
  useEffect(() => {
    if (projects && projects.length > 0) {
      const activeProjects = projects.filter(p => p.status === 'active').length;
      setOrganizationStats(prev => ({
        ...prev,
        activeProjects
      }));
    }
  }, [projects]);

  const tabs = [
    { id: 'members', name: 'Miembros', icon: '👥', description: 'Gestionar usuarios y roles' },
    { id: 'roles', name: 'Roles', icon: '🔐', description: 'Configurar permisos y accesos' },
    { id: 'invitations', name: 'Invitaciones', icon: '📧', description: 'Ver invitaciones pendientes' },
    { id: 'process', name: 'Proceso de Cambios', icon: '🔄', description: 'Flujo del control de cambios' }
  ];

  const getRoleDescription = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Acceso total al sistema, puede gestionar todas las organizaciones';
      case 'organization_owner':
        return 'Control total de la organización, puede gestionar miembros y proyectos';
      case 'organization_member_write':
        return 'Puede crear, editar y eliminar proyectos de la organización';
      case 'organization_member_read':
        return 'Solo puede ver proyectos de la organización';
      default:
        return 'Rol no definido';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-gradient-to-br from-red-500 to-pink-600 text-white border-red-300';
      case 'organization_owner': return 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-300';
      case 'organization_member_write': return 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-300';
      case 'organization_member_read': return 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Administrador';
      case 'organization_owner': return 'Propietario de Organización';
      case 'organization_member_write': return 'Miembro con Escritura';
      case 'organization_member_read': return 'Miembro de Solo Lectura';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Premium */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="text-5xl">👥</span>
                Gestión de Usuarios
              </h1>
              <p className="text-indigo-100 text-lg">
                Administra usuarios, roles y permisos de tu organización
              </p>
            </div>
            <div className="text-right bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="text-4xl font-bold">
                {organizationStats.activeProjects}
              </div>
              <div className="text-sm text-indigo-100 mt-1">Proyectos Activos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Premium */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200">
        <div className="border-b-2 border-slate-200">
          <nav className="flex space-x-2 px-4 py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-3 px-5 rounded-xl font-bold text-sm transition-all",
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 scale-105'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-bold">{tab.name}</div>
                    <div className={cn(
                      "text-xs",
                      activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'
                    )}>{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Miembros */}
          {activeTab === 'members' && (
            <OrganizationMembers
              currentProject={currentProject}
              useSupabase={useSupabase}
              onMemberAdded={() => {
                // Recargar estadísticas cuando se agregue un miembro
                console.log('Miembro agregado, actualizando estadísticas...');
              }}
            />
          )}

          {/* Tab: Roles */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Roles Disponibles en el Sistema
                </h3>
                <p className="text-gray-600 mb-6">
                  Los roles determinan qué acciones puede realizar cada usuario en la organización.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  {
                    role: 'super_admin',
                    permissions: [
                      'Acceso total a todas las organizaciones',
                      'Puede gestionar usuarios y roles globalmente',
                      'Puede ver, crear, editar y eliminar cualquier dato',
                      'Acceso a configuraciones del sistema'
                    ]
                  },
                  {
                    role: 'organization_owner',
                    permissions: [
                      'Control total de su organización',
                      'Puede gestionar miembros de la organización',
                      'Puede crear, editar y eliminar proyectos',
                      'Puede asignar roles a otros miembros'
                    ]
                  },
                  {
                    role: 'organization_member_write',
                    permissions: [
                      'Puede crear, editar y eliminar proyectos',
                      'Puede gestionar tareas y cronogramas',
                      'Puede gestionar riesgos y finanzas',
                      'No puede gestionar otros miembros'
                    ]
                  },
                  {
                    role: 'organization_member_read',
                    permissions: [
                      'Solo puede ver proyectos y datos',
                      'No puede crear, editar o eliminar',
                      'Acceso de solo lectura a la organización',
                      'Ideal para consultores o revisores'
                    ]
                  }
                ].map(({ role, permissions }) => (
                  <div key={role} className={cn(
                    "border-2 rounded-2xl p-6 shadow-xl relative overflow-hidden",
                    getRoleColor(role)
                  )}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-xl">
                          {getRoleLabel(role)}
                        </h4>
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full border border-white/30">
                          {role}
                        </span>
                      </div>
                      <p className="text-sm mb-4 opacity-90 font-medium">
                        {getRoleDescription(role)}
                      </p>
                      <div>
                        <h5 className="font-bold mb-3 text-sm uppercase tracking-wide">Permisos:</h5>
                        <ul className="text-sm space-y-2">
                          {permissions.map((permission, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-white mr-2 font-bold">✓</span>
                              <span className="font-medium">{permission}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Invitaciones */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Sistema de Invitaciones
                </h3>
                <p className="text-gray-600 mb-6">
                  Las invitaciones permiten agregar nuevos usuarios a tu organización de forma segura.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-start">
                  <span className="text-blue-500 text-3xl mr-4">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-blue-900 mb-3 text-lg">
                      Cómo Funciona el Sistema de Invitaciones
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-3 font-medium">
                      <li>
                        <strong className="text-blue-900">1. Invitar Usuario:</strong> Envías una invitación con el email y rol deseado
                      </li>
                      <li>
                        <strong className="text-blue-900">2. Estado Pendiente:</strong> La invitación queda en estado "pendiente" hasta que el usuario se registre
                      </li>
                      <li>
                        <strong className="text-blue-900">3. Registro del Usuario:</strong> Cuando el usuario se registra con ese email, automáticamente se une a la organización
                      </li>
                      <li>
                        <strong className="text-blue-900">4. Acceso Inmediato:</strong> El usuario obtiene acceso según el rol asignado
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-emerald-900 mb-3 text-lg flex items-center gap-2">
                    <span className="text-2xl">📧</span>
                    Enviar Invitación
                  </h4>
                  <p className="text-sm text-emerald-800 mb-4 font-medium">
                    Para invitar un nuevo usuario, ve a la pestaña "Miembros" y haz clic en "Invitar Miembro".
                  </p>
                  <div className="text-sm text-emerald-700 space-y-2 font-medium">
                    <p className="flex items-center"><span className="text-emerald-600 mr-2">•</span> Ingresa el email del usuario</p>
                    <p className="flex items-center"><span className="text-emerald-600 mr-2">•</span> Selecciona el rol apropiado</p>
                    <p className="flex items-center"><span className="text-emerald-600 mr-2">•</span> El usuario recibirá acceso al registrarse</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                    <span className="text-2xl">🔗</span>
                    Compartir Enlace
                  </h4>
                  <p className="text-sm text-purple-800 mb-4 font-medium">
                    Puedes compartir este enlace para que los usuarios se registren:
                  </p>
                  <div className="bg-white rounded-lg p-3 text-sm font-mono break-all border-2 border-purple-200 shadow-inner">
                    {window.location.hostname === 'localhost'
                      ? 'https://strategiapm.vercel.app'
                      : window.location.origin
                    }
                  </div>
                  {window.location.hostname === 'localhost' && (
                    <p className="text-xs text-amber-700 mt-3 font-bold flex items-center">
                      <span className="mr-1">⚠️</span>
                      En desarrollo local - Usa el enlace de producción para compartir
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Proceso de Cambios */}
          {activeTab === 'process' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🔄 Proceso de Control de Cambios
                </h3>
                <p className="text-gray-600 mb-6">
                  Este diagrama muestra cómo participan los roles funcionales en el proceso de gestión de cambios.
                  Úsalo como referencia al asignar roles a los miembros de tu organización.
                </p>
              </div>

              <ChangeFlowDiagram />

              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 mt-6 shadow-lg">
                <div className="flex items-start">
                  <span className="text-amber-500 text-3xl mr-4">💡</span>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-3 text-lg">
                      Tip: Asigna Roles Estratégicamente
                    </h4>
                    <p className="text-sm text-amber-800 font-medium">
                      Al asignar roles funcionales a tus miembros, considera el nivel de autoridad que necesitan en el control de cambios.
                      Por ejemplo, un Project Manager puede aprobar cambios hasta $25K, mientras que un Sponsor puede aprobar hasta $100K.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UserManagement;