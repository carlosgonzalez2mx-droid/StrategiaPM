import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';
import supabaseService from '../services/SupabaseService';

const OrganizationMembers = ({ 
  currentProject, 
  useSupabase = false,
  onMemberAdded 
}) => {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('organization_member_write');
  
  // Estados para editar roles
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hook de auditoría
  const { addAuditEvent } = useAuditLog(currentProject?.id, useSupabase);

  // DETECCIÓN AUTOMÁTICA: Usar organization_id del servicio o fallback
  const [organizationId, setOrganizationId] = useState(
    currentProject?.organization_id || '73bf164f-f3e8-4207-95a6-e3e3d385148d'
  );

  // Detectar organización automáticamente cuando se use Supabase
  useEffect(() => {
    if (useSupabase && supabaseService?.getCurrentOrganization()) {
      const detectedOrgId = supabaseService.getCurrentOrganization();
      if (detectedOrgId && detectedOrgId !== organizationId) {
        console.log('🔄 Actualizando organization ID detectado:', detectedOrgId);
        setOrganizationId(detectedOrgId);
      }
    }
  }, [useSupabase, organizationId]);

  // Cargar miembros de la organización
  const loadOrganizationMembers = async () => {
    console.log('🔍 DEBUG - loadOrganizationMembers ejecutándose', { useSupabase, organizationId });
    if (!useSupabase || !organizationId) return;

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        console.log('🔍 DEBUG - Usuario autenticado:', supabaseService.getCurrentUser());
        console.log('🔍 DEBUG - Organization ID:', organizationId);
        
        // Probar consulta directa sin filtros para ver si es problema de RLS
        const { data: allMembers, error: allError } = await supabaseService.supabase
          .from('organization_members')
          .select('*');
        console.log('🔍 DEBUG - Todos los miembros (sin filtro):', { allMembers, allError });
        
        const { data: membersData, error: membersError } = await supabaseService.supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .order('joined_at', { ascending: false });

        if (membersError) {
          console.error('❌ Error cargando miembros:', membersError);
          setError('Error cargando miembros de la organización');
        } else {
          console.log('🔍 DEBUG - Datos cargados:', membersData);
          
          // Filtrar solo miembros activos para mostrar
          const activeMembers = (membersData || []).filter(member => member.status === 'active');
          setMembers(activeMembers);
          
          // Separar invitaciones pendientes
          const pendingInvitations = (membersData || []).filter(member => member.status === 'pending');
          setInvitations(pendingInvitations);
          
          console.log('🔍 DEBUG - Miembros activos:', activeMembers);
          console.log('🔍 DEBUG - Invitaciones pendientes:', pendingInvitations);
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
    
    // VERIFICAR PERMISOS: Solo owners y admins pueden invitar miembros
    const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
    const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
    
    if (!isOwnerOrAdmin) {
      alert('❌ No tienes permisos para invitar miembros. Solo owners y administradores pueden realizar esta acción.');
      return;
    }

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
        setInviteRole('organization_member_write');
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

  // Eliminar miembro COMPLETAMENTE de todas las tablas relacionadas
  const removeMember = async (memberId, memberEmail) => {
    // VERIFICAR PERMISOS: Solo owners y admins pueden eliminar miembros
    const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
    const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
    
    if (!isOwnerOrAdmin) {
      alert('❌ No tienes permisos para eliminar miembros. Solo owners y administradores pueden realizar esta acción.');
      return;
    }
    
    // No permitir eliminar al owner de la organización
    const memberToDelete = members.find(m => m.id === memberId);
    if (memberToDelete?.role === 'owner') {
      alert('❌ No se puede eliminar al propietario de la organización.');
      return;
    }
    
    if (!window.confirm(`⚠️ ELIMINACIÓN COMPLETA DE USUARIO\n\n¿Estás seguro de que quieres eliminar COMPLETAMENTE a ${memberEmail}?\n\nEsto eliminará:\n• Su membresía en la organización\n• Todos sus roles y permisos\n• Su acceso a todos los proyectos\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        console.log('🗑️ Iniciando eliminación completa de usuario:', memberEmail);
        
        // PASO 1: Eliminar de organization_members
        console.log('🗑️ Eliminando de organization_members...');
        const { error: membersError } = await supabaseService.supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId);

        if (membersError) {
          console.error('❌ Error eliminando de organization_members:', membersError);
          throw new Error(`Error eliminando membresía: ${membersError.message}`);
        }

        // PASO 2: Eliminar de user_organization_roles (si existe)
        console.log('🗑️ Eliminando de user_organization_roles...');
        const { error: rolesError } = await supabaseService.supabase
          .from('user_organization_roles')
          .delete()
          .eq('user_email', memberEmail)
          .eq('organization_id', organizationId);

        if (rolesError) {
          console.warn('⚠️ Error eliminando de user_organization_roles (puede no existir):', rolesError);
          // No lanzar error aquí, ya que la tabla puede no existir
        }

        // PASO 3: Buscar y eliminar referencias en otras tablas relacionadas
        console.log('🗑️ Buscando referencias adicionales...');
        
        // Eliminar tareas asignadas al usuario (si las hay)
        const { error: tasksError } = await supabaseService.supabase
          .from('tasks')
          .update({ assigned_to: null })
          .eq('assigned_to', memberEmail);

        if (tasksError) {
          console.warn('⚠️ Error actualizando tareas:', tasksError);
        }

        // Eliminar riesgos asignados al usuario (si los hay)
        const { error: risksError } = await supabaseService.supabase
          .from('risks')
          .update({ owner: null })
          .eq('owner', memberEmail);

        if (risksError) {
          console.warn('⚠️ Error actualizando riesgos:', risksError);
        }

        // PASO 4: Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'organization',
            action: 'member-completely-removed',
            description: `Usuario "${memberEmail}" eliminado COMPLETAMENTE de la organización`,
            details: {
              userEmail: memberEmail,
              organizationId: organizationId,
              tablesCleaned: ['organization_members', 'user_organization_roles', 'tasks', 'risks']
            },
            severity: 'high',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        console.log('✅ Usuario eliminado completamente de todas las tablas');
        alert(`✅ Usuario ${memberEmail} eliminado COMPLETAMENTE de la organización\n\nSe eliminó de:\n• organization_members\n• user_organization_roles\n• Referencias en tareas y riesgos\n\nEl usuario ya no tiene acceso a la organización.`);
        
        // Recargar miembros
        await loadOrganizationMembers();
      }
    } catch (error) {
      console.error('❌ Error eliminando miembro:', error);
      setError(`Error eliminando miembro: ${error.message}`);
      alert(`❌ Error eliminando usuario: ${error.message}\n\nPor favor, intenta nuevamente o contacta al administrador.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Editar rol de miembro
  const editMemberRole = async () => {
    if (!editingMember || !newRole) return;
    
    // VERIFICAR PERMISOS: Solo owners y admins pueden cambiar roles
    const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
    const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
    
    if (!isOwnerOrAdmin) {
      alert('❌ No tienes permisos para cambiar roles. Solo owners y administradores pueden realizar esta acción.');
      return;
    }
    
    // No permitir cambiar el rol del owner
    if (editingMember.role === 'owner') {
      alert('❌ No se puede cambiar el rol del propietario de la organización.');
      return;
    }

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { error } = await supabaseService.supabase
          .from('organization_members')
          .update({ role: newRole })
          .eq('id', editingMember.id);

        if (error) {
          throw error;
        }

        // Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'organization',
            action: 'member-role-updated',
            description: `Rol de "${editingMember.user_email}" cambiado a "${getRoleLabel(newRole)}"`,
            details: {
              userEmail: editingMember.user_email,
              oldRole: editingMember.role,
              newRole: newRole,
              organizationId: organizationId
            },
            severity: 'medium',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        alert(`✅ Rol de ${editingMember.user_email} actualizado exitosamente`);
        
        // Recargar miembros
        await loadOrganizationMembers();
        
        // Cerrar modal
        setShowEditRoleModal(false);
        setEditingMember(null);
        setNewRole('');
      }
    } catch (error) {
      console.error('Error actualizando rol:', error);
      setError(`Error actualizando rol: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Abrir modal de edición de rol
  const openEditRoleModal = (member) => {
    setEditingMember(member);
    setNewRole(member.role);
    setShowEditRoleModal(true);
  };

  // Cargar miembros al montar el componente
  useEffect(() => {
    console.log('🔍 DEBUG - OrganizationMembers useEffect ejecutándose');
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
      case 'organization_owner': return '👑 Administrador';
      case 'organization_member_write': return '✏️ Miembro (Editar)';
      case 'organization_member_read': return '👀 Miembro (Solo lectura)';
      case 'owner': return '👑 Propietario';
      case 'admin': return '👑 Administrador';
      case 'member': return '✏️ Miembro';
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
        {/* Solo mostrar botón invitar si es owner o admin */}
        {(() => {
          const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
          const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
          
          return isOwnerOrAdmin ? (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Invitar Miembro</span>
            </button>
          ) : (
            <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg border">
              <span>🔒</span> Solo administradores pueden invitar miembros
            </div>
          );
        })()}
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
                  
                  {/* Solo mostrar botón eliminar si es owner o admin */}
                  {(() => {
                    const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
                    const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
                    
                    return isOwnerOrAdmin ? (
                      <button
                        onClick={() => removeMember(invitation.id, invitation.user_email)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        title="Cancelar invitación"
                      >
                        🗑️
                      </button>
                    ) : null;
                  })()}
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
                  
                  {/* Botones de acción para owners y admins */}
                  {(() => {
                    const currentUserMembership = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email);
                    const isOwnerOrAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
                    
                    return isOwnerOrAdmin ? (
                      <div className="flex items-center space-x-2">
                        {/* Botón editar rol (no para owners) */}
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => openEditRoleModal(member)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Cambiar rol"
                          >
                            ✏️
                          </button>
                        )}
                        
                        {/* Botón eliminar (no para owners) */}
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
                    ) : null;
                  })()}
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
                      <option value="organization_owner">👑 Administrador (Gestionar organización)</option>
                      <option value="organization_member_write">✏️ Miembro (Ver y editar proyectos)</option>
                      <option value="organization_member_read">👀 Miembro (Solo lectura)</option>
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

      {/* Modal para editar rol */}
      {showEditRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Cambiar Rol de Usuario</h2>
                <button 
                  onClick={() => {
                    setShowEditRoleModal(false);
                    setEditingMember(null);
                    setNewRole('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Cambiando rol de: <strong>{editingMember?.user_email}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Rol actual: <span className="font-medium">{editingMember ? getRoleLabel(editingMember.role) : ''}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Rol
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="organization_member_write">✏️ Miembro (Ver y editar proyectos)</option>
                  <option value="organization_member_read">👀 Miembro (Solo lectura)</option>
                  <option value="admin">👑 Administrador</option>
                </select>
                
                <div className="mt-2 text-xs text-gray-500">
                  <p><strong>Solo lectura:</strong> Puede ver proyectos pero no editarlos</p>
                  <p><strong>Editar:</strong> Puede ver y modificar proyectos</p>
                  <p><strong>Administrador:</strong> Puede gestionar usuarios y proyectos</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditRoleModal(false);
                    setEditingMember(null);
                    setNewRole('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={editMemberRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoading || !newRole || newRole === editingMember?.role}
                >
                  {isLoading ? 'Actualizando...' : 'Cambiar Rol'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationMembers;
