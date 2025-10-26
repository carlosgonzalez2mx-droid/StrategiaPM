import React, { useState } from 'react';
import useNotifications from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

/**
 * Badge de notificaciones con contador
 * Se puede colocar en cualquier parte del navbar/header
 */
const NotificationBadge = ({ className = '' }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  const handleTogglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
    
    // Si se abre el panel, refrescar notificaciones
    if (!isPanelOpen) {
      refresh();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Badge Button */}
      <button
        onClick={handleTogglePanel}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificaciones"
      >
        <span className="text-2xl">🔔</span>
        
        {/* Contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Indicador de carga */}
        {loading && (
          <span className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-2 h-2 animate-pulse"></span>
        )}
      </button>

      {/* Panel de Notificaciones */}
      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Error toast (opcional) */}
      {error && (
        <div className="absolute top-full right-0 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
