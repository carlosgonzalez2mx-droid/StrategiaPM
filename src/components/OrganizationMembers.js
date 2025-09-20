import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';

const OrganizationMembers = ({ 
  currentProject, 
  useSupabase = false,
  onMemberAdded 
}) => {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hook de auditoría
  const { addAuditEvent } = useAuditLog(currentProject?.id, useSupabase);

  // TEMPORAL: Usar organization_id fijo hasta que se resuelva la sincronización
  const organizationId = currentProject?.organization_id || '73bf164f-f3e8-4207-95a6-e3e3d385148d';

  // Cargar miembros de la organización
  const loadOrganizationMembers = async () => {
    if (!useSupabase || !organizationId) return;

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { data: membersData, error: membersError } = await supabaseService.supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .order('joined_at', { ascending: false });

        if (membersError) {
          console.error('Error cargando miembros:', membersError);
          setError('Error cargando miembros de la organización');
        } else {
          // Filtrar solo miembros activos para mostrar
          const activeMembers = (membersData || []).filter(member => member.status === 'active');
          setMembers(activeMembers);
          
          // Separar invitaciones pendientes
          const pendingInvitations = (membersData || []).filter(member => member.status === 'pending');
          setInvitations(pendingInvitations);
        }
      }
    } catch (error) {
      console.error('Error cargando miembros:', error);
      setError('Error cargando miembros de la organización');
    } finally {
      setIsLoading(false);
    }
  };

  // Invitar nuevo miembro
  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !organizationId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        console.log('🔍 DEBUG - Usuario autenticado:', supabaseService.getCurrentUser());
        console.log('🔍 DEBUG - Organization ID:', organizationId);
        
        // Verificar contexto de RLS
        const { data: rlsTest, error: rlsError } = await supabaseService.supabase
          .from('user_organization_roles')
          .select('role, organization_id')
          .eq('user_id', supabaseService.getCurrentUser()?.id);
        console.log('🔍 DEBUG - RLS Context:', { rlsTest, rlsError });
        
        // Verificar si el usuario ya está en la organización
        const { data: existingMember, error: memberError } = await supabaseService.supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('user_email', inviteEmail)
          .single();

        if (existingMember) {
          alert(`⚠️ El usuario ${inviteEmail} ya es miembro de esta organización.`);
          return;
        }

        // Crear invitación usando función personalizada
        console.log('🔍 DEBUG - Datos de inserción:', {
          organization_id: organizationId,
          user_id: null,
          user_email: inviteEmail,
          role: inviteRole,
          status: 'pending'
        });
        
        const { data: inviteResult, error: insertError } = await supabaseService.supabase
          .rpc('invite_member', {
            p_organization_id: organizationId,
            p_user_email: inviteEmail,
            p_role: inviteRole
          });

        if (insertError) {
          throw insertError;
        }

        // Verificar el resultado de la función
        if (inviteResult && !inviteResult.success) {
          throw new Error(inviteResult.error || 'Error al invitar miembro');
        }

        // Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'organization',
            action: 'member-invited',
            description: `Invitación enviada a "${inviteEmail}" con rol "${inviteRole}"`,
              details: {
                userEmail: inviteEmail,
                role: inviteRole,
                organizationId: organizationId
              },
            severity: 'medium',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        const registrationUrl = window.location.hostname === 'localhost' 
          ? 'https://strategiapm.vercel.app' 
          : window.location.origin;

        alert(`✅ Invitación enviada a ${inviteEmail} con rol ${inviteRole}

📧 El usuario recibirá acceso cuando:
1. Se registre en la aplicación con este email
2. O cuando acepte la invitación si ya está registrado

Puedes compartir este enlace para que se registren:
${registrationUrl}`);

        // Recargar miembros
        await loadOrganizationMembers();
        
        // Limpiar formulario
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteModal(false);

        // Notificar al componente padre
        if (onMemberAdded) {
          onMemberAdded();
        }
      }
    } catch (error) {
      console.error('Error invitando miembro:', error);
      setError(`Error invitando miembro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar miembro
  const removeMember = async (memberId, memberEmail) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${memberEmail} de la organización?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { error } = await supabaseService.supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId);

        if (error) {
          throw error;
        }

        // Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'organization',
            action: 'member-removed',
            description: `Miembro "${memberEmail}" eliminado de la organización`,
            details: {
              userEmail: memberEmail,
              organizationId: organizationId
            },
            severity: 'medium',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        alert(`✅ Usuario ${memberEmail} eliminado exitosamente`);
        
        // Recargar miembros
        await loadOrganizationMembers();
      }
    } catch (error) {
      console.error('Error eliminando miembro:', error);
      setError(`Error eliminando miembro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar miembros al montar el componente
  useEffect(() => {
    loadOrganizationMembers();
  }, [organizationId, useSupabase]);

  if (!useSupabase) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-yellow-600 text-xl mr-3">⚠️</span>
          <div>
            <h3 className="text-yellow-800 font-medium">Supabase no habilitado</h3>
            <p className="text-yellow-700 text-sm">Para compartir proyectos con otros usuarios, necesitas habilitar Supabase en la configuración.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!organizationId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 text-xl mr-3">❌</span>
          <div>
            <h3 className="text-red-800 font-medium">Proyecto sin organización</h3>
            <p className="text-red-700 text-sm">Este proyecto no está asociado a una organización. No se puede compartir.</p>
          </div>
        </div>
      </div>
    );
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'member': return 'Miembro';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Miembros de la Organización</h2>
          <p className="text-gray-600">Gestiona quién puede ver y editar los proyectos de tu organización</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Invitar Miembro</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-3">❌</span>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Invitaciones Pendientes */}
      {invitations.length > 0 && (
        <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
          <div className="p-4 border-b border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800">
              Invitaciones Pendientes ({invitations.length})
            </h3>
          </div>
          
          <div className="divide-y divide-yellow-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                    <span className="text-yellow-700 font-medium">⏳</span>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-900">{invitation.user_email}</p>
                    <p className="text-sm text-yellow-600">
                      Invitado como {getRoleLabel(invitation.role)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pendiente
                  </span>
                  
                  <button
                    onClick={() => removeMember(invitation.id, invitation.user_email)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Cancelar invitación"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Miembros */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Miembros Activos ({members.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Cargando miembros...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <span className="text-4xl mb-4 block">👥</span>
              <p>No hay miembros en la organización</p>
              <p className="text-sm">Invita a otros usuarios para compartir tus proyectos</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {member.user_email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.user_email}</p>
                    <p className="text-sm text-gray-500">
                      Se unió el {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                  
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => removeMember(member.id, member.user_email)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Eliminar miembro"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Invitar Miembro</h2>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={inviteMember}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email del Usuario *
                    </label>
                    <input
                      type="email"
                      className="w-full border rounded px-3 py-2"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol
                    </label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="member">Miembro (Ver y editar proyectos)</option>
                      <option value="admin">Administrador (Gestionar organización)</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Invitar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationMembers;
