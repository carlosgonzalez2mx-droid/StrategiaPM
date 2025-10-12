import { useState, useCallback } from 'react';
import useChangePermissions from './useChangePermissions';
import { createUserInfo } from '../utils/changeHelpers';
import { 
  notifyChangeAssigned, 
  notifyApprovalRequired,
  notifyCCBVoteRequired,
  notifyStatusChanged 
} from '../utils/notificationHelpers';

/**
 * Hook para gestionar cambios con usuarios y permisos
 * Extiende la funcionalidad de ChangeManagement sin romperla
 */
const useChangeManagement = (currentProjectId) => {
  const { permissions, loading: permissionsLoading } = useChangePermissions();
  const [processing, setProcessing] = useState(false);

  /**
   * Crea objeto de usuario actual para el cambio
   */
  const getCurrentUserInfo = useCallback(() => {
    if (!permissions.userId) return null;
    return createUserInfo(permissions);
  }, [permissions]);

  /**
   * Valida si el usuario puede crear un cambio
   */
  const canCreate = useCallback(() => {
    return permissions.canCreate && !permissionsLoading;
  }, [permissions.canCreate, permissionsLoading]);

  /**
   * Valida si el usuario puede aprobar un cambio específico
   */
  const canApprove = useCallback((change) => {
    if (!permissions.canApprove) return false;
    
    const costImpact = parseFloat(change.impactCost) || 0;
    const scheduleImpact = parseFloat(change.impactSchedule) || 0;
    
    const withinCostLimit = costImpact <= permissions.approvalLimit.cost;
    const withinScheduleLimit = scheduleImpact <= permissions.approvalLimit.schedule;
    
    return withinCostLimit && withinScheduleLimit;
  }, [permissions]);

  /**
   * Valida si el usuario puede rechazar un cambio
   */
  const canReject = useCallback(() => {
    return permissions.canReject && !permissionsLoading;
  }, [permissions.canReject, permissionsLoading]);

  /**
   * Valida si el usuario puede implementar un cambio
   */
  const canImplement = useCallback(() => {
    return permissions.canImplement && !permissionsLoading;
  }, [permissions.canImplement, permissionsLoading]);

  /**
   * Valida si el usuario puede votar en CCB
   */
  const canVoteInCCB = useCallback(() => {
    return permissions.canVoteInCCB && !permissionsLoading;
  }, [permissions.canVoteInCCB, permissionsLoading]);

  /**
   * Valida si el usuario puede asignar cambios
   */
  const canAssign = useCallback(() => {
    return permissions.canAssign && !permissionsLoading;
  }, [permissions.canAssign, permissionsLoading]);

  /**
   * Enriquece un cambio con información del usuario actual
   */
  const enrichChangeWithUser = useCallback((changeData) => {
    const userInfo = getCurrentUserInfo();
    if (!userInfo) return changeData;

    return {
      ...changeData,
      createdBy: userInfo,
      createdByUser: userInfo.userName, // Para compatibilidad con código existente
      createdByEmail: userInfo.userEmail
    };
  }, [getCurrentUserInfo]);

  /**
   * Notifica cuando se asigna un cambio
   */
  const notifyAssignment = useCallback(async (change, assignedToEmail, assignedToId) => {
    if (!change || !assignedToEmail) return;
    
    setProcessing(true);
    try {
      const userInfo = getCurrentUserInfo();
      if (!userInfo) return;

      await notifyChangeAssigned({
        userEmail: assignedToEmail,
        userId: assignedToId,
        change: change,
        assignedBy: userInfo.userName
      });
    } catch (error) {
      console.error('Error notificando asignación:', error);
    } finally {
      setProcessing(false);
    }
  }, [getCurrentUserInfo]);

  /**
   * Notifica cuando se requiere aprobación
   */
  const notifyApproval = useCallback(async (change, approverEmail, approverId) => {
    if (!change || !approverEmail) return;
    
    setProcessing(true);
    try {
      await notifyApprovalRequired({
        userEmail: approverEmail,
        userId: approverId,
        change: change
      });
    } catch (error) {
      console.error('Error notificando aprobación:', error);
    } finally {
      setProcessing(false);
    }
  }, []);

  /**
   * Notifica a miembros del CCB
   */
  const notifyCCBMembers = useCallback(async (change, ccbMembers) => {
    if (!change || !ccbMembers || ccbMembers.length === 0) return;
    
    setProcessing(true);
    try {
      for (const member of ccbMembers) {
        if (member.userEmail) {
          await notifyCCBVoteRequired({
            userEmail: member.userEmail,
            userId: member.userId,
            change: change
          });
        }
      }
    } catch (error) {
      console.error('Error notificando CCB:', error);
    } finally {
      setProcessing(false);
    }
  }, []);

  /**
   * Notifica cambio de estado
   */
  const notifyStatusChange = useCallback(async (change, oldStatus, newStatus, interestedUsers = []) => {
    if (!change) return;
    
    setProcessing(true);
    try {
      const userInfo = getCurrentUserInfo();
      if (!userInfo) return;

      // Notificar al creador del cambio
      if (change.createdByEmail && change.createdByEmail !== userInfo.userEmail) {
        await notifyStatusChanged({
          userEmail: change.createdByEmail,
          userId: change.createdBy?.userId,
          change: change,
          oldStatus: oldStatus,
          newStatus: newStatus,
          changedBy: userInfo.userName
        });
      }

      // Notificar a otros usuarios interesados
      for (const user of interestedUsers) {
        if (user.email && user.email !== userInfo.userEmail) {
          await notifyStatusChanged({
            userEmail: user.email,
            userId: user.id,
            change: change,
            oldStatus: oldStatus,
            newStatus: newStatus,
            changedBy: userInfo.userName
          });
        }
      }
    } catch (error) {
      console.error('Error notificando cambio de estado:', error);
    } finally {
      setProcessing(false);
    }
  }, [getCurrentUserInfo]);

  return {
    // Permisos
    permissions,
    permissionsLoading,
    
    // Validaciones
    canCreate,
    canApprove,
    canReject,
    canImplement,
    canVoteInCCB,
    canAssign,
    
    // Utilidades
    getCurrentUserInfo,
    enrichChangeWithUser,
    
    // Notificaciones
    notifyAssignment,
    notifyApproval,
    notifyCCBMembers,
    notifyStatusChange,
    
    // Estado
    processing
  };
};

export default useChangeManagement;
