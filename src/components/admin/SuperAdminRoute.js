// src/components/admin/SuperAdminRoute.js
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SuperAdminService from '../../services/SuperAdminService';

const SuperAdminRoute = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, [isAuthenticated]);

  const checkAuthorization = async () => {
    if (!isAuthenticated) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    try {
      const isSuperAdmin = await SuperAdminService.isSuperAdmin();
      setIsAuthorized(isSuperAdmin);
    } catch (error) {
      console.error('Error verificando autorización:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 mb-6">
            No tienes permisos de super-administrador para acceder a esta sección.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default SuperAdminRoute;

