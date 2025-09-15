import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission, requiredModule, fallback = null }) => {
  const { isAuthenticated, hasPermission, hasModuleAccess, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      // Verificar permiso específico si se requiere
      if (requiredPermission && !hasPermission(requiredPermission)) {
        navigate('/unauthorized');
        return;
      }

      // Verificar acceso al módulo si se requiere
      if (requiredModule && !hasModuleAccess(requiredModule)) {
        navigate('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, hasPermission, hasModuleAccess, loading, navigate, requiredPermission, requiredModule]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (se redirigirá)
  if (!isAuthenticated) {
    return null;
  }

  // Si no tiene los permisos requeridos, no mostrar nada (se redirigirá)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  if (requiredModule && !hasModuleAccess(requiredModule)) {
    return null;
  }

  // Si tiene acceso, mostrar el contenido
  return children;
};

export default ProtectedRoute;
