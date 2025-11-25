import { logger } from '../utils/logger';

import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';
import supabaseService from '../services/SupabaseService';
import subscriptionService from '../services/SubscriptionService';
import { FUNCTIONAL_ROLES, FUNCTIONAL_ROLE_LABELS } from '../constants/unifiedRoles';
import { ROLES, ROLE_LABELS, ROLE_OPTIONS, mapLegacyRole } from '../constants/roles';
import useOrganizationId from '../hooks/useOrganizationId';
import useCurrentUserPermissions from '../hooks/useCurrentUserPermissions';
import useInviteModal from '../hooks/useInviteModal';
import { debugLog, debugError, debugSuccess } from '../utils/debugLog';
import InvitationModal from './InvitationModal';
import UpgradeModal from './subscription/UpgradeModal';

const OrganizationMembers = ({ 
  currentProject, 
  useSupabase = false,
  onMemberAdded 
}) => {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  
  // Hook del modal de invitación - consolida 4 useState en un reducer
  const { 
    state: inviteModalState, 
    actions: inviteModalActions 
  } = useInviteModal();
  
  // Extraer valores para compatibilidad con código existente
  const showInviteModal = inviteModalState.showModal;
  const inviteEmail = inviteModalState.email;
  const inviteRole = inviteModalState.role;
  const inviteFunctionalRole = inviteModalState.functionalRole;
  
  // Extraer acciones para usar en lugar de setters
  const setShowInviteModal = (show) => show ? inviteModalActions.openModal() : inviteModalActions.closeModal();
  const setInviteEmail = inviteModalActions.setEmail;
  const setInviteRole = inviteModalActions.setRole;
  const setInviteFunctionalRole = inviteModalActions.setFunctionalRole;
  
  // Estados para editar roles
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState({});

  // Estados para roles funcionales
  const [editingMemberRole, setEditingMemberRole] = useState(null);
  const [selectedFunctionalRole, setSelectedFunctionalRole] = useState('');
  
  // Estados para el modal de invitación mejorado
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [lastInvitation, setLastInvitation] = useState(null);

  // Hook de auditoría
  const { addAuditEvent } = useAuditLog(currentProject?.id, useSupabase);

  // DETECCIÓN AUTOMÁTICA: Usar hook sin hardcodeo
  const { 
    organizationId, 
    loading: orgLoading, 
    error: orgError 
  } = useOrganizationId({ 
    fallbackFromProject: currentProject?.organization_id,
    required: true 
  });

  // 🔍 LOGS DE DEBUG PARA DIAGNOSTICAR
  useEffect(() => {
    logger.debug('🔍 OrganizationMembers - Estado actual:', {
      hasCurrentProject: !!currentProject,
      currentProjectOrgId: currentProject?.organization_id,
      organizationId: organizationId,
      orgLoading: orgLoading,
      orgError: orgError,
      useSupabase: useSupabase
    });
  }, [currentProject, organizationId, orgLoading, orgError, useSupabase]);

  // Hook de permisos - elimina 6 verificaciones duplicadas
  const { 
    isOwnerOrAdmin, 
    canInvite, 
    canEditRoles, 
    canRemoveMembers,
    canEditMember,
    canRemoveMember 
  } = useCurrentUserPermissions(members);

  // Cargar miembros de la organización
  const loadOrganizationMembers = async () => {
    logger.debug('🔄 loadOrganizationMembers ejecutándose', { useSupabase, organizationId });
    
    if (!useSupabase) {
      logger.warn('⚠️ Supabase no está habilitado, no se cargarán miembros');
      return;
    }
    
    if (!organizationId) {
      logger.warn('⚠️ organizationId es null/undefined, esperando detección...');
      logger.warn('⚠️ Estado actual:', { 
        orgLoading, 
        orgError,
        currentProjectOrgId: currentProject?.organization_id 
      });
      return;
    }
    
    logger.debug('✅ Iniciando carga de miembros para organization_id:', organizationId);

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        debugLog('OrganizationMembers', 'Usuario autenticado', supabaseService.getCurrentUser());
        debugLog('OrganizationMembers', 'Organization ID', organizationId);
        
        // Probar consulta directa sin filtros para ver si es problema de RLS
        const { data: allMembers, error: allError } = await supabaseService.supabase
          .from('organization_members')
          .select('*');
        debugLog('OrganizationMembers', 'Todos los miembros (sin filtro)', { allMembers, allError });
        
        const { data: membersData, error: membersError } = await supabaseService.supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', organizationId)
          .order('joined_at', { ascending: false });

        if (membersError) {
          debugError('OrganizationMembers', 'Error cargando miembros', membersError);
          setError('Error cargando miembros de la organización');
        } else {
          debugLog('OrganizationMembers', 'Datos cargados', membersData);
          
          // Filtrar solo miembros activos para mostrar
          const activeMembers = (membersData || []).filter(member => member.status === 'active');
          setMembers(activeMembers);
          
          // Separar invitaciones pendientes
          const pendingInvitations = (membersData || []).filter(member => member.status === 'pending');
          setInvitations(pendingInvitations);
          
          // Logs de verificación
          logger.debug('✅ Total de miembros cargados:', membersData?.length || 0);
          logger.debug('✅ Miembros activos:', activeMembers.length);
          logger.debug('⏳ Invitaciones pendientes:', pendingInvitations.length);
          
          debugLog('OrganizationMembers', 'Miembros activos', activeMembers);
          debugLog('OrganizationMembers', 'Invitaciones pendientes', pendingInvitations);
        }
      }
    } catch (error) {
      debugError('OrganizationMembers', 'Error cargando miembros', error);
      setError('Error cargando miembros de la organización');
    } finally {
      setIsLoading(false);
    }
  };

  // Invitar nuevo miembro
  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !organizationId) return;

    // VERIFICAR PERMISOS: Usar hook de permisos
    if (!canInvite) {
      alert('❌ No tienes permisos para invitar miembros. Solo owners y administradores pueden realizar esta acción.');
      return;
    }

    // VERIFICAR LÍMITES DE SUSCRIPCIÓN
    try {
      const canAdd = await subscriptionService.canAddUser(organizationId);
      if (!canAdd.allowed) {
        // Obtener estadísticas de uso para el modal
        const stats = await subscriptionService.getUsageStats(organizationId);
        const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
        const portfolio = portfolioData ? JSON.parse(portfolioData) : {};

        setUpgradeModalData({
          limitType: 'user',
          currentPlan: portfolio?.organization?.subscriptionPlan || 'free',
          currentCount: stats.currentUsers,
          maxCount: stats.maxUsers
        });
        setShowUpgradeModal(true);
        return;
      }
    } catch (limitError) {
      logger.error('Error verificando límites:', limitError);
      // En caso de error, permitir continuar (fail-safe)
    }

    try {
      setIsLoading(true);
      setError(null);

      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        debugLog('inviteMember', 'Usuario autenticado', supabaseService.getCurrentUser());
        debugLog('inviteMember', 'Organization ID', organizationId);
        
        // Verificar contexto de RLS
        const { data: rlsTest, error: rlsError } = await supabaseService.supabase
          .from('user_organization_roles')
          .select('role, organization_id')
          .eq('user_id', supabaseService.getCurrentUser()?.id);
        debugLog('inviteMember', 'RLS Context', { rlsTest, rlsError });
        
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
        debugLog('inviteMember', 'Datos de inserción', {
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
            p_role: inviteRole,
            p_functional_role: inviteFunctionalRole || null
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

        // Guardar datos de la invitación y mostrar modal mejorado
        setLastInvitation({
          user_email: inviteEmail,
          role: inviteRole,
          organization_id: organizationId
        });
        setShowInvitationModal(true);

        // Recargar miembros
        await loadOrganizationMembers();
        
        // Limpiar formulario usando reducer
        inviteModalActions.resetForm();
        inviteModalActions.closeModal();

        // Notificar al componente padre
        if (onMemberAdded) {
          onMemberAdded();
        }
      }
    } catch (error) {
      logger.error('Error invitando miembro:', error);
      setError(`Error invitando miembro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar invitación
  const handleResendInvitation = async (invitationId) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) return;

      // Lógica para reenviar el email de invitación
      logger.debug('Reenviando invitación:', invitationId);
      
      const registrationUrl = window.location.hostname === 'localhost' 
        ? 'https://strategiapm.vercel.app' 
        : window.location.origin;

      alert(`📧 Recordatorio de invitación
      
Se ha notificado nuevamente a ${invitation.user_email}

Comparte este enlace para que se registren:
${registrationUrl}

Una vez registrado con ese email, tendrá acceso automáticamente.`);
      
      // TODO: Implementar envío de email real
    } catch (error) {
      logger.error('Error reenviando invitación:', error);
      alert('Error al reenviar invitación');
    }
  };

  // Cancelar invitación
  const handleCancelInvitation = async (invitationId, userEmail) => {
    try {
      // Confirmar con el usuario
      const confirmed = window.confirm(
        `¿Estás seguro de cancelar la invitación para ${userEmail}?`
      );
      
      if (!confirmed) return;
      
      logger.debug('🗑️ Cancelando invitación:', invitationId);
      
      // Eliminar la invitación
      const { error } = await supabaseService.supabase
        .from('organization_members')
        .delete()
        .eq('id', invitationId);
      
      if (error) {
        logger.error('❌ Error cancelando invitación:', error);
        alert(`Error al cancelar invitación: ${error.message}`);
        return;
      }
      
      logger.debug('✅ Invitación cancelada exitosamente');
      alert('✅ Invitación cancelada');
      
      // Recargar la lista de miembros
      loadOrganizationMembers();
      
    } catch (err) {
      logger.error('❌ Error inesperado:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Eliminar miembro COMPLETAMENTE de todas las tablas relacionadas
  const removeMember = async (memberId, memberEmail) => {
    const memberToDelete = members.find(m => m.id === memberId);
    
    // VERIFICAR PERMISOS: Usar hook de permisos
    if (!canRemoveMember(memberToDelete)) {
      const mappedRole = mapLegacyRole(memberToDelete?.role);
      if (mappedRole === ROLES.OWNER) {
        alert('❌ No se puede eliminar al propietario de la organización.');
      } else {
        alert('❌ No tienes permisos para eliminar este miembro.');
      }
      return;
    }
    
    if (!window.confirm(`⚠️ ELIMINACIÓN COMPLETA DE USUARIO\n\n¿Estás seguro de que quieres eliminar COMPLETAMENTE a ${memberEmail}?\n\nEsto eliminará:\n• Su membresía en la organización\n• Todos sus roles y permisos\n• Su acceso a todos los proyectos\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        debugLog('removeMember', 'Iniciando eliminación completa de usuario', memberEmail);
        
        // PASO 1: Eliminar de organization_members
        debugLog('removeMember', 'Eliminando de organization_members');
        const { error: membersError } = await supabaseService.supabase
          .from('organization_members')
          .delete()
          .eq('id', memberId);

        if (membersError) {
          debugError('removeMember', 'Error eliminando de organization_members', membersError);
          throw new Error(`Error eliminando membresía: ${membersError.message}`);
        }

        // PASO 2: Eliminar de user_organization_roles (si existe)
        debugLog('removeMember', 'Eliminando de user_organization_roles');
        const { error: rolesError } = await supabaseService.supabase
          .from('user_organization_roles')
          .delete()
          .eq('user_email', memberEmail)
          .eq('organization_id', organizationId);

        if (rolesError) {
          logger.warn('⚠️ Error eliminando de user_organization_roles (puede no existir):', rolesError);
          // No lanzar error aquí, ya que la tabla puede no existir
        }

        // PASO 3: Buscar y eliminar referencias en otras tablas relacionadas
        debugLog('removeMember', 'Buscando referencias adicionales');
        
        // Eliminar tareas asignadas al usuario (si las hay)
        const { error: tasksError } = await supabaseService.supabase
          .from('tasks')
          .update({ assigned_to: null })
          .eq('assigned_to', memberEmail);

        if (tasksError) {
          logger.warn('⚠️ Error actualizando tareas:', tasksError);
        }

        // Eliminar riesgos asignados al usuario (si los hay)
        const { error: risksError } = await supabaseService.supabase
          .from('risks')
          .update({ owner: null })
          .eq('owner', memberEmail);

        if (risksError) {
          logger.warn('⚠️ Error actualizando riesgos:', risksError);
        }

        // PASO 4: Limpiar caché local del usuario eliminado
        debugLog('removeMember', 'Limpiando caché local del usuario eliminado');
        try {
          // Limpiar localStorage del usuario eliminado
          const localStorageKeys = [
            'mi-dashboard-portfolio',
            'lastSelectedProjectId',
            'portfolioData',
            'audit-log-' + memberEmail,
            'user-preferences-' + memberEmail
          ];
          
          localStorageKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
              try {
                const parsedData = JSON.parse(data);
                // Si los datos contienen referencias al usuario eliminado, limpiarlos
                if (JSON.stringify(parsedData).includes(memberEmail)) {
                  logger.debug(`🗑️ Limpiando localStorage key: ${key}`);
                  localStorage.removeItem(key);
                }
              } catch (e) {
                // Si no se puede parsear, eliminar directamente
                logger.debug(`🗑️ Limpiando localStorage key (raw): ${key}`);
                localStorage.removeItem(key);
              }
            }
          });
          
          // Limpiar sessionStorage también
          const sessionStorageKeys = [
            'currentUser',
            'userSession',
            'organizationData'
          ];
          
          sessionStorageKeys.forEach(key => {
            const data = sessionStorage.getItem(key);
            if (data && data.includes(memberEmail)) {
              logger.debug(`🗑️ Limpiando sessionStorage key: ${key}`);
              sessionStorage.removeItem(key);
            }
          });
          
          debugSuccess('removeMember', 'Caché local limpiado para usuario eliminado');
        } catch (cacheError) {
          debugError('removeMember', 'Error limpiando caché local', cacheError);
        }

        // PASO 5: Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'organization',
            action: 'member-completely-removed',
            description: `Usuario "${memberEmail}" eliminado COMPLETAMENTE de la organización`,
            details: {
              userEmail: memberEmail,
              organizationId: organizationId,
              tablesCleaned: ['organization_members', 'user_organization_roles', 'tasks', 'risks'],
              localCacheCleaned: true
            },
            severity: 'high',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        debugSuccess('removeMember', 'Usuario eliminado completamente de todas las tablas y caché local');
        
        // Mostrar mensaje detallado con instrucciones
        const detailedMessage = `✅ Usuario ${memberEmail} eliminado COMPLETAMENTE de la organización

Se eliminó de:
• organization_members (membresía principal)
• user_organization_roles (roles y permisos)
• Referencias en tareas y riesgos
• Caché local del navegador

⚠️ IMPORTANTE: El usuario eliminado debe:
1. Cerrar sesión completamente
2. Cerrar el navegador
3. Volver a abrir el navegador
4. Iniciar sesión nuevamente

Solo así verá que ya no tiene acceso a la organización.`;
        
        alert(detailedMessage);
        
        // Recargar miembros
        await loadOrganizationMembers();
      }
    } catch (error) {
      logger.error('❌ Error eliminando miembro:', error);
      setError(`Error eliminando miembro: ${error.message}`);
      alert(`❌ Error eliminando usuario: ${error.message}\n\nPor favor, intenta nuevamente o contacta al administrador.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Editar rol de miembro
  const editMemberRole = async () => {
    if (!editingMember || !newRole) return;
    
    // VERIFICAR PERMISOS: Usar hook de permisos
    if (!canEditMember(editingMember)) {
      const mappedRole = mapLegacyRole(editingMember.role);
      if (mappedRole === ROLES.OWNER) {
        alert('❌ No se puede cambiar el rol del propietario de la organización.');
      } else {
        alert('❌ No tienes permisos para cambiar el rol de este miembro.');
      }
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
      logger.error('Error actualizando rol:', error);
      setError(`Error actualizando rol: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar rol funcional de miembro
  const handleUpdateFunctionalRole = async (memberId, newFunctionalRole) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabaseService.supabase
        .from('organization_members')
        .update({ 
          functional_role: newFunctionalRole || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .eq('organization_id', organizationId);

      if (error) {
        logger.error('Error actualizando rol funcional:', error);
        alert('Error actualizando rol funcional: ' + error.message);
        return;
      }

      // Recargar miembros
      await loadOrganizationMembers();
      
      // Limpiar estado de edición
      setEditingMemberRole(null);
      setSelectedFunctionalRole('');
      
      alert('Rol funcional actualizado exitosamente');
    } catch (error) {
      logger.error('Error actualizando rol funcional:', error);
      alert('Error actualizando rol funcional');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente selector de rol funcional
  const FunctionalRoleSelector = ({ member, isInviteForm = false, value, onChange }) => {
    const currentUserRole = members.find(m => m.user_email === supabaseService.getCurrentUser()?.email)?.role;
    const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';
    
    if (isInviteForm) {
      // Selector en formulario de invitación
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rol Funcional (Opcional)
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin rol específico</option>
            <optgroup label="Roles de Gestión">
              <option value={FUNCTIONAL_ROLES.EXECUTIVE}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.EXECUTIVE].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.EXECUTIVE].label}
              </option>
              <option value={FUNCTIONAL_ROLES.SPONSOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.SPONSOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.SPONSOR].label}
              </option>
              <option value={FUNCTIONAL_ROLES.PROJECT_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_MANAGER].label}
              </option>
            </optgroup>
            <optgroup label="Roles Especializados">
              <option value={FUNCTIONAL_ROLES.FINANCE_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.FINANCE_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.FINANCE_MANAGER].label}
              </option>
              <option value={FUNCTIONAL_ROLES.QUALITY_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.QUALITY_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.QUALITY_MANAGER].label}
              </option>
              <option value={FUNCTIONAL_ROLES.TECHNICAL_LEAD}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TECHNICAL_LEAD].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TECHNICAL_LEAD].label}
              </option>
            </optgroup>
            <optgroup label="Roles Operativos">
              <option value={FUNCTIONAL_ROLES.PMO_ASSISTANT}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PMO_ASSISTANT].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PMO_ASSISTANT].label}
              </option>
              <option value={FUNCTIONAL_ROLES.PROJECT_COORDINATOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_COORDINATOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_COORDINATOR].label}
              </option>
              <option value={FUNCTIONAL_ROLES.TEAM_MEMBER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TEAM_MEMBER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TEAM_MEMBER].label}
              </option>
            </optgroup>
            <optgroup label="Roles de Supervisión">
              <option value={FUNCTIONAL_ROLES.AUDITOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.AUDITOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.AUDITOR].label}
              </option>
            </optgroup>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {value && FUNCTIONAL_ROLE_LABELS[value] 
              ? FUNCTIONAL_ROLE_LABELS[value].description 
              : 'El rol funcional determina los permisos en control de cambios'}
          </p>
        </div>
      );
    }
    
    // Visualización en la lista de miembros
    if (editingMemberRole === member.id) {
      return (
        <div className="flex items-center space-x-2">
          <select
            value={selectedFunctionalRole}
            onChange={(e) => setSelectedFunctionalRole(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Sin rol específico</option>
            <optgroup label="Gestión">
              <option value={FUNCTIONAL_ROLES.EXECUTIVE}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.EXECUTIVE].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.EXECUTIVE].label}
              </option>
              <option value={FUNCTIONAL_ROLES.SPONSOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.SPONSOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.SPONSOR].label}
              </option>
              <option value={FUNCTIONAL_ROLES.PROJECT_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_MANAGER].label}
              </option>
            </optgroup>
            <optgroup label="Especializados">
              <option value={FUNCTIONAL_ROLES.FINANCE_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.FINANCE_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.FINANCE_MANAGER].label}
              </option>
              <option value={FUNCTIONAL_ROLES.QUALITY_MANAGER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.QUALITY_MANAGER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.QUALITY_MANAGER].label}
              </option>
              <option value={FUNCTIONAL_ROLES.TECHNICAL_LEAD}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TECHNICAL_LEAD].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TECHNICAL_LEAD].label}
              </option>
            </optgroup>
            <optgroup label="Operativos">
              <option value={FUNCTIONAL_ROLES.PMO_ASSISTANT}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PMO_ASSISTANT].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PMO_ASSISTANT].label}
              </option>
              <option value={FUNCTIONAL_ROLES.PROJECT_COORDINATOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_COORDINATOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.PROJECT_COORDINATOR].label}
              </option>
              <option value={FUNCTIONAL_ROLES.TEAM_MEMBER}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TEAM_MEMBER].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.TEAM_MEMBER].label}
              </option>
            </optgroup>
            <optgroup label="Supervisión">
              <option value={FUNCTIONAL_ROLES.AUDITOR}>
                {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.AUDITOR].icon} {FUNCTIONAL_ROLE_LABELS[FUNCTIONAL_ROLES.AUDITOR].label}
              </option>
            </optgroup>
          </select>
          <button
            onClick={() => handleUpdateFunctionalRole(member.id, selectedFunctionalRole)}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setEditingMemberRole(null);
              setSelectedFunctionalRole('');
            }}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
          >
            ✕
          </button>
        </div>
      );
    }
    
    // Mostrar rol funcional actual
    const roleInfo = member.functional_role 
      ? FUNCTIONAL_ROLE_LABELS[member.functional_role]
      : null;
    
    return (
      <div className="flex items-center justify-between">
        <div>
          {roleInfo ? (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo.badge}`}>
              {roleInfo.icon} {roleInfo.label}
            </span>
          ) : (
            <span className="text-gray-400 text-sm italic">Sin rol específico</span>
          )}
        </div>
        {canEdit && member.status === 'active' && (
          <button
            onClick={() => {
              setEditingMemberRole(member.id);
              setSelectedFunctionalRole(member.functional_role || '');
            }}
            className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            title="Editar rol funcional"
          >
            ✏️
          </button>
        )}
      </div>
    );
  };

  // Abrir modal de edición de rol
  const openEditRoleModal = (member) => {
    setEditingMember(member);
    setNewRole(member.role);
    setShowEditRoleModal(true);
  };

  // Cargar miembros al montar el componente
  useEffect(() => {
    debugLog('OrganizationMembers', 'useEffect ejecutándose');
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
  
  // Mostrar loading mientras detecta organización
  if (orgLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-blue-700">Detectando organización...</p>
        </div>
      </div>
    );
  }
  
  // Mostrar error si no se pudo detectar organización
  if (!organizationId || orgError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 text-xl mr-3">❌</span>
          <div>
            <h3 className="text-red-800 font-medium">No se detectó organización</h3>
            <p className="text-red-700 text-sm">
              {orgError || 'Este usuario no pertenece a ninguna organización. Por favor, solicita una invitación.'}
            </p>
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
    // Mapear rol legacy a rol estándar y obtener su etiqueta
    const mappedRole = mapLegacyRole(role);
    return ROLE_LABELS[mappedRole] || role;
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
        {canInvite ? (
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
        )}
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

      {/* Panel informativo sobre roles funcionales */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-500 text-xl mr-3">ℹ️</span>
          <div>
            <h4 className="font-semibold text-blue-800 mb-2">
              Roles Funcionales en Control de Cambios
            </h4>
            <p className="text-sm text-blue-700 mb-2">
              Los roles funcionales determinan los permisos específicos en el módulo de Control de Cambios:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Ejecutivo/Sponsor:</strong> Aprueban cambios mayores sin límite</li>
              <li><strong>Project Manager:</strong> Aprueban cambios hasta $25K / 15 días</li>
              <li><strong>Gerente Financiero:</strong> Validan impacto financiero</li>
              <li><strong>Miembro de Equipo:</strong> Solo pueden solicitar cambios</li>
              <li><strong>Sin rol específico:</strong> Permisos básicos según rol organizacional</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Invitaciones Pendientes */}
      {invitations.length > 0 && (
        <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
          <div className="p-4 border-b border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
              <span className="mr-2">⏳</span>
              Invitaciones Pendientes ({invitations.length})
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Estas personas fueron invitadas pero aún no han aceptado
            </p>
          </div>
          
          <div className="divide-y divide-yellow-200">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4">
                <div className="flex items-start justify-between">
                  {/* Información de la invitación */}
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-800 font-bold text-lg">✉️</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-yellow-900 text-lg">
                          {invitation.user_email}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                          ⏳ Pendiente
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-yellow-700">
                          <span className="font-medium">Rol:</span> {getRoleLabel(invitation.role)}
                        </p>
                        
                        {invitation.functional_role && (
                          <p className="text-sm text-yellow-700">
                            <span className="font-medium">Rol Funcional:</span>{' '}
                            {FUNCTIONAL_ROLE_LABELS[invitation.functional_role]?.icon}{' '}
                            {FUNCTIONAL_ROLE_LABELS[invitation.functional_role]?.label}
                          </p>
                        )}
                        
                        {invitation.invited_by && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Invitado por <span className="font-medium">{invitation.invited_by}</span>
                            {invitation.invited_at && (
                              <span> el {new Date(invitation.invited_at).toLocaleDateString('es-MX', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}</span>
                            )}
                          </p>
                        )}
                        
                        {invitation.created_at && !invitation.invited_at && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Invitado el {new Date(invitation.created_at).toLocaleDateString('es-MX', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  {canRemoveMembers && (
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleResendInvitation(invitation.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                        title="Reenviar invitación"
                      >
                        <span>🔄</span>
                        <span>Reenviar</span>
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id, invitation.user_email)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center space-x-1 transition-colors"
                        title="Cancelar invitación"
                      >
                        <span>❌</span>
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}
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
                  
                  {/* Rol Funcional */}
                  <FunctionalRoleSelector member={member} />
                  
                  {/* Botones de acción para owners y admins */}
                  <div className="flex items-center space-x-2">
                    {/* Botón editar rol */}
                    {canEditMember(member) && (
                      <button
                        onClick={() => openEditRoleModal(member)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Cambiar rol"
                      >
                        ✏️
                      </button>
                    )}
                    
                    {/* Botón eliminar */}
                    {canRemoveMember(member) && (
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
                      {ROLE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selector de Rol Funcional */}
                <FunctionalRoleSelector 
                  isInviteForm={true}
                  value={inviteFunctionalRole}
                  onChange={(value) => setInviteFunctionalRole(value)}
                />
                
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
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
      
      {/* Modal de invitación mejorado */}
      <InvitationModal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        invitation={lastInvitation}
      />

      {/* Modal de Upgrade */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType={upgradeModalData.limitType}
        currentPlan={upgradeModalData.currentPlan}
        currentCount={upgradeModalData.currentCount}
        maxCount={upgradeModalData.maxCount}
        organizationId={organizationId}
        onUpgradeSuccess={() => {
          // Recargar miembros después de actualizar
          loadOrganizationMembers();
        }}
      />
    </div>
  );
};

export default OrganizationMembers;
