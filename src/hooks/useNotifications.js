import { useState, useEffect, useCallback, useRef } from 'react';
import supabaseService from '../services/SupabaseService';
import { getUnreadNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../utils/notificationHelpers';

/**
 * Hook para gestionar notificaciones del usuario actual
 * Hace polling cada 30 segundos para no sobrecargar el servidor
 */
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Evitar múltiples cargas simultáneas
  const isLoadingRef = useRef(false);
  const lastFetchTime = useRef(null);

  /**
   * Carga notificaciones del usuario actual
   */
  const loadNotifications = useCallback(async (force = false) => {
    // Evitar cargas duplicadas
    if (isLoadingRef.current && !force) {
      return;
    }

    // Throttle: No cargar más de una vez cada 5 segundos
    const now = Date.now();
    if (!force && lastFetchTime.current && (now - lastFetchTime.current) < 5000) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      const currentUser = supabaseService.getCurrentUser();
      
      if (!currentUser || !currentUser.email) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const userEmail = currentUser.email;

      // Obtener notificaciones no leídas
      const unreadNotifications = await getUnreadNotifications(userEmail);
      
      // Obtener conteo total
      const count = await getUnreadCount(userEmail);
      
      setNotifications(unreadNotifications);
      setUnreadCount(count);
      setError(null);
      
      lastFetchTime.current = now;
      
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      setError('Error cargando notificaciones');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  /**
   * Marca una notificación como leída
   */
  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      const result = await markAsRead(notificationId);
      
      if (result.success) {
        // Actualizar estado local
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return result;
    } catch (error) {
      console.error('Error marcando notificación:', error);
      return { success: false, error };
    }
  }, []);

  /**
   * Marca todas las notificaciones como leídas
   */
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const currentUser = supabaseService.getCurrentUser();
      if (!currentUser || !currentUser.email) return { success: false };
      
      const result = await markAllAsRead(currentUser.email);
      
      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
      
      return result;
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      return { success: false, error };
    }
  }, []);

  /**
   * Recarga notificaciones manualmente
   */
  const refreshNotifications = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  // Cargar inicialmente
  useEffect(() => {
    loadNotifications();
  }, []); // Solo ejecutar una vez al montar

  // Polling cada 30 segundos (no agresivo)
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []); // Solo configurar el interval una vez

  // Recargar cuando el usuario cambie (login/logout)
  useEffect(() => {
    const checkUserChange = setInterval(() => {
      const currentUser = supabaseService.getCurrentUser();
      const currentEmail = currentUser?.email;
      
      // Si cambió el usuario, recargar
      if (currentEmail !== lastFetchTime.current?.email) {
        lastFetchTime.current = { ...lastFetchTime.current, email: currentEmail };
        loadNotifications(true);
      }
    }, 5000); // Cada 5 segundos verificar cambio de usuario

    return () => clearInterval(checkUserChange);
  }, []); // Solo configurar el interval una vez

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refresh: refreshNotifications
  };
};

export default useNotifications;
