import React from 'react';
import NotificationItem from './NotificationItem';

/**
 * Panel desplegable de notificaciones
 */
const NotificationPanel = ({ 
  isOpen, 
  onClose, 
  notifications, 
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={handleBackdropClick}
      />
      
      {/* Panel */}
      <div className="fixed right-4 top-20 w-96 max-w-full bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🔔</span>
            <h3 className="font-bold text-gray-800">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-4"></div>
              <p className="text-gray-500 text-sm">Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium mb-1">No hay notificaciones</p>
              <p className="text-gray-500 text-sm">Estás al día con todo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas las notificaciones
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPanel;
