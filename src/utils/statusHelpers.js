export const getIndicatorColor = (value, type) => {
  if (type === 'cpi' || type === 'spi') {
    return value >= 1 ? 'text-green-600' : value >= 0.9 ? 'text-yellow-600' : 'text-red-600';
  }
  if (type === 'variance') {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }
  return 'text-gray-600';
};

export const getStatusIcon = (status) => {
  switch(status) {
    case 'active': return '🔄';
    case 'completed': return '✅';
    case 'on-hold': return '⏸️';
    case 'cancelled': return '❌';
    default: return '⏸️';
  }
};

export const getStatusLabel = (status) => {
  switch(status) {
    case 'active': return 'Activo';
    case 'completed': return 'Completado';
    case 'on-hold': return 'En Pausa';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

export const getStatusBadgeClasses = (status) => {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
  
  switch(status) {
    case 'active': return `${baseClasses} bg-green-100 text-green-800`;
    case 'completed': return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'on-hold': return `${baseClasses} bg-yellow-100 text-yellow-800`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};
