import React from 'react';

/**
 * Componente para mostrar un item individual de notificación
 */
const NotificationItem = ({ notification, onMarkAsRead, onClose }) => {
  const handleClick = async () => {
    // Marcar como leída
    await onMarkAsRead(notification.id);
    
    // Si tiene URL de acción, navegar
    if (notification.action_url) {
      // Cerrar panel
      onClose && onClose();
      
      // Navegar (usar router si está disponible, sino window.location)
      window.location.href = notification.action_url;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'assigned':
        return '📋';
      case 'approval_required':
        return '✅';
      case 'ccb_vote_required':
        return '🗳️';
      case 'status_changed':
        return '🔄';
      case 'comment_added':
        return '💬';
      case 'implemented':
        return '🚀';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'normal':
        return 'bg-blue-50 border-blue-200';
      case 'low':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${getPriorityColor(notification.priority)}`}
    >
      <div className="flex items-start space-x-3">
        <div className="text-2xl flex-shrink-0">
          {getNotificationIcon(notification.notification_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-semibold text-gray-800 text-sm truncate">
              {notification.title}
            </h4>
            {notification.priority === 'urgent' && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full flex-shrink-0">
                Urgente
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{getTimeAgo(notification.created_at)}</span>
            {notification.change_number && (
              <span className="font-mono bg-white px-2 py-0.5 rounded">
                {notification.change_number}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
