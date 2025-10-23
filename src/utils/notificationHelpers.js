import supabaseService from '../services/SupabaseService';

/**
 * HELPERS PARA GESTIÓN DE NOTIFICACIONES
 * Funciones para crear, leer y gestionar notificaciones de control de cambios
 */

/**
 * Crea una notificación en la base de datos
 * @param {Object} notificationData - Datos de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export const createNotification = async ({
  userEmail,
  userId,
  changeId,
  changeNumber,
  changeTitle,
  notificationType,
  title,
  message,
  priority = 'normal',
  metadata = {}
}) => {
  try {
    const currentUser = supabaseService.getCurrentUser();
    const orgId = supabaseService.getCurrentOrganization();
    
    if (!orgId) {
      console.warn('No se puede crear notificación: organización no detectada');
      return { success: false, error: 'Organización no detectada' };
    }
    
    const notification = {
      organization_id: orgId,
      user_id: userId,
      user_email: userEmail,
      change_id: changeId,
      change_number: changeNumber,
      change_title: changeTitle,
      notification_type: notificationType,
      title: title,
      message: message,
      priority: priority,
      status: 'unread',
      metadata: metadata,
      action_url: `/change-management?changeId=${changeId}`,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabaseService.supabase
      .from('change_notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) {
      console.error('Error creando notificación:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error inesperado creando notificación:', error);
    return { success: false, error };
  }
};

/**
 * Obtiene notificaciones no leídas de un usuario
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Array>} Lista de notificaciones
 */
export const getUnreadNotifications = async (userEmail) => {
  try {
    const { data, error } = await supabaseService.supabase
      .from('change_notifications')
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'unread')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error inesperado obteniendo notificaciones:', error);
    return [];
  }
};

/**
 * Marca una notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export const markAsRead = async (notificationId) => {
  try {
    const { error } = await supabaseService.supabase
      .from('change_notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
    
    if (error) {
      console.error('Error marcando notificación como leída:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error inesperado marcando notificación:', error);
    return { success: false, error };
  }
};

/**
 * Marca todas las notificaciones de un usuario como leídas
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
export const markAllAsRead = async (userEmail) => {
  try {
    const { error } = await supabaseService.supabase
      .from('change_notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_email', userEmail)
      .eq('status', 'unread');
    
    if (error) {
      console.error('Error marcando todas como leídas:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error inesperado marcando todas como leídas:', error);
    return { success: false, error };
  }
};

/**
 * Obtiene el conteo de notificaciones no leídas
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<number>} Número de notificaciones no leídas
 */
export const getUnreadCount = async (userEmail) => {
  try {
    const { count, error } = await supabaseService.supabase
      .from('change_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .eq('status', 'unread');
    
    if (error) {
      console.error('Error obteniendo conteo:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error inesperado obteniendo conteo:', error);
    return 0;
  }
};

/**
 * Notifica a un usuario sobre asignación de cambio
 * @param {Object} params - Parámetros de la notificación
 */
export const notifyChangeAssigned = async ({ userEmail, userId, change, assignedBy }) => {
  return createNotification({
    userEmail,
    userId,
    changeId: change.id,
    changeNumber: change.changeNumber,
    changeTitle: change.title,
    notificationType: 'assigned',
    title: 'Cambio Asignado',
    message: `${assignedBy} te ha asignado el cambio "${change.title}"`,
    priority: 'high',
    metadata: { assignedBy, changeStatus: change.status }
  });
};

/**
 * Notifica a un usuario que requiere su aprobación
 * @param {Object} params - Parámetros de la notificación
 */
export const notifyApprovalRequired = async ({ userEmail, userId, change }) => {
  return createNotification({
    userEmail,
    userId,
    changeId: change.id,
    changeNumber: change.changeNumber,
    changeTitle: change.title,
    notificationType: 'approval_required',
    title: 'Aprobación Requerida',
    message: `El cambio "${change.title}" requiere tu aprobación`,
    priority: 'urgent',
    metadata: { 
      costImpact: change.impactCost, 
      scheduleImpact: change.impactSchedule 
    }
  });
};

/**
 * Notifica a un usuario que requiere su voto en CCB
 * @param {Object} params - Parámetros de la notificación
 */
export const notifyCCBVoteRequired = async ({ userEmail, userId, change }) => {
  return createNotification({
    userEmail,
    userId,
    changeId: change.id,
    changeNumber: change.changeNumber,
    changeTitle: change.title,
    notificationType: 'ccb_vote_required',
    title: 'Voto CCB Requerido',
    message: `Tu voto es requerido en el CCB para "${change.title}"`,
    priority: 'high',
    metadata: { changeStatus: change.status }
  });
};

/**
 * Notifica cambio de estado
 * @param {Object} params - Parámetros de la notificación
 */
export const notifyStatusChanged = async ({ userEmail, userId, change, oldStatus, newStatus, changedBy }) => {
  return createNotification({
    userEmail,
    userId,
    changeId: change.id,
    changeNumber: change.changeNumber,
    changeTitle: change.title,
    notificationType: 'status_changed',
    title: 'Estado de Cambio Actualizado',
    message: `El cambio "${change.title}" pasó de ${oldStatus} a ${newStatus}`,
    priority: 'normal',
    metadata: { oldStatus, newStatus, changedBy }
  });
};

const notificationHelpers = {
  createNotification,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  notifyChangeAssigned,
  notifyApprovalRequired,
  notifyCCBVoteRequired,
  notifyStatusChanged
};

export default notificationHelpers;
