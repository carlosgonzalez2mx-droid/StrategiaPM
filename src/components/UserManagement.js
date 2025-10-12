import React, { useState, useEffect } from 'react';
import OrganizationMembers from './OrganizationMembers';
import ChangeFlowDiagram from './change-management/ChangeFlowDiagram';

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
      case 'super_admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'organization_owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'organization_member_write': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'organization_member_read': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">
              Administra usuarios, roles y permisos de tu organización
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {organizationStats.activeProjects}
            </div>
            <div className="text-sm text-gray-500">Proyectos Activos</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <div>
                    <div className="font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-400">{tab.description}</div>
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
                  <div key={role} className={`border rounded-lg p-4 ${getRoleColor(role)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">
                        {getRoleLabel(role)}
                      </h4>
                      <span className="text-sm font-medium">
                        {role}
                      </span>
                    </div>
                    <p className="text-sm mb-3 opacity-80">
                      {getRoleDescription(role)}
                    </p>
                    <div>
                      <h5 className="font-medium mb-2">Permisos:</h5>
                      <ul className="text-sm space-y-1">
                        {permissions.map((permission, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            {permission}
                          </li>
                        ))}
                      </ul>
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <span className="text-blue-500 text-xl mr-3">ℹ️</span>
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Cómo Funciona el Sistema de Invitaciones
                    </h4>
                    <ol className="text-sm text-blue-700 space-y-2">
                      <li>
                        <strong>1. Invitar Usuario:</strong> Envías una invitación con el email y rol deseado
                      </li>
                      <li>
                        <strong>2. Estado Pendiente:</strong> La invitación queda en estado "pendiente" hasta que el usuario se registre
                      </li>
                      <li>
                        <strong>3. Registro del Usuario:</strong> Cuando el usuario se registra con ese email, automáticamente se une a la organización
                      </li>
                      <li>
                        <strong>4. Acceso Inmediato:</strong> El usuario obtiene acceso según el rol asignado
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">📧 Enviar Invitación</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Para invitar un nuevo usuario, ve a la pestaña "Miembros" y haz clic en "Invitar Miembro".
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>• Ingresa el email del usuario</p>
                    <p>• Selecciona el rol apropiado</p>
                    <p>• El usuario recibirá acceso al registrarse</p>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">🔗 Compartir Enlace</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Puedes compartir este enlace para que los usuarios se registren:
                  </p>
                  <div className="bg-gray-100 rounded p-2 text-sm font-mono break-all">
                    {window.location.hostname === 'localhost' 
                      ? 'https://strategiapm.vercel.app' 
                      : window.location.origin
                    }
                  </div>
                  {window.location.hostname === 'localhost' && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ En desarrollo local - Usa el enlace de producción para compartir
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
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <div className="flex items-start">
                  <span className="text-yellow-600 text-xl mr-3">💡</span>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Tip: Asigna Roles Estratégicamente
                    </h4>
                    <p className="text-sm text-yellow-700">
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