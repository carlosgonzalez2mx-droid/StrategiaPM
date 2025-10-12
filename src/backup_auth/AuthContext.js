import React, { createContext, useContext, useState, useEffect } from 'react';

// Definición de roles y permisos del sistema
export const ROLE_PERMISSIONS = {
  project_manager: {
    name: "Project Manager",
    description: "Acceso completo al sistema PMO",
    permissions: ["*:*"], // Todos los permisos
    color: "from-purple-600 to-indigo-600"
  },
  executive_manager: {
    name: "Gestor Ejecutivo",
    description: "Solo dashboards y reportes ejecutivos",
    permissions: [
      "portfolio:read",
      "dashboard:read",
      "reports:read",
      "audit:read"
    ],
    color: "from-blue-600 to-cyan-600"
  },
  pmo_assistant: {
    name: "Asistente de PMO",
    description: "Gestión de proyectos y operaciones",
    permissions: [
      "portfolio:write",
      "projects:full",
      "workpackages:full",
      "schedule:full",
      "risks:full",
      "resources:read",
      "files:full",
      "reports:read"
    ],
    color: "from-green-600 to-emerald-600"
  },
  financial_analyst: {
    name: "Analista Financiero",
    description: "Módulos financieros y EVM",
    permissions: [
      "portfolio:read",
      "financial:full",
      "evm:full",
      "cashflow:full",
      "changes:full",
      "reports:read",
      "audit:read"
    ],
    color: "from-orange-600 to-red-600"
  },
  project_coordinator: {
    name: "Coordinador de Proyectos",
    description: "Gestión de tareas y cronogramas",
    permissions: [
      "portfolio:read",
      "projects:read",
      "workpackages:write",
      "schedule:full",
      "resources:read",
      "files:read",
      "reports:read"
    ],
    color: "from-teal-600 to-blue-600"
  },
  auditor: {
    name: "Auditor/Consultor",
    description: "Solo lectura en todos los módulos",
    permissions: [
      "portfolio:read",
      "projects:read",
      "financial:read",
      "risks:read",
      "schedule:read",
      "resources:read",
      "files:read",
      "reports:read",
      "audit:read"
    ],
    color: "from-gray-600 to-slate-600"
  }
};

// Sistema de autenticación local eliminado - Solo Supabase

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay usuario en localStorage
        const savedUser = localStorage.getItem('strategiapm_user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          setPermissions(ROLE_PERMISSIONS[userData.role]?.permissions || []);
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
      } finally {
        // Completar el splash screen después de verificar autenticación
        setShowSplash(false);
      }
    };

    checkAuth();
  }, []);

  // Código problemático eliminado - no es necesario limpiar localStorage automáticamente
  // Esto causaba problemas de sincronización con la carga de datos del portfolio

  // Función de login - Solo Supabase
  const login = async (email, password) => {
    setLoading(true);
    try {
      // La lógica de login se maneja completamente en SupabaseService
      console.log('🔐 Login manejado por SupabaseService');
      return null;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setPermissions([]);
    localStorage.removeItem('strategiapm_user');
  };

  // Función para completar el splash screen
  const completeSplash = () => {
    setShowSplash(false);
  };

  // Función para limpiar completamente el estado (útil para debugging)
  const clearAuthState = () => {
    setUser(null);
    setIsAuthenticated(false);
    setPermissions([]);
    localStorage.removeItem('strategiapm_user');
    console.log('🔒 Estado de autenticación limpiado completamente');
  };

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = (requiredPermission) => {
    if (!permissions || permissions.length === 0) return false;
    
    // Si tiene permisos de administrador, puede todo
    if (permissions.includes("*:*")) return true;
    
    // Verificar permiso específico
    if (permissions.includes(requiredPermission)) return true;
    
    // Verificar permiso de módulo completo (ej: "portfolio:*")
    const [module, action] = requiredPermission.split(':');
    if (permissions.includes(`${module}:*`)) return true;
    
    return false;
  };

  // Verificar si el usuario tiene acceso a un módulo
  const hasModuleAccess = (module) => {
    if (!permissions || permissions.length === 0) return false;
    
    if (permissions.includes("*:*")) return true;
    
    return permissions.some(permission => 
      permission.startsWith(`${module}:`) || permission === `${module}:*`
    );
  };

  // Obtener permisos del usuario actual
  const getUserPermissions = () => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role]?.permissions || [];
  };

  // Obtener información del rol del usuario
  const getUserRoleInfo = () => {
    if (!user) return null;
    return ROLE_PERMISSIONS[user.role] || null;
  };

  // Funciones de gestión de usuarios eliminadas - Solo Supabase
  const createUser = () => {
    throw new Error('Gestión de usuarios manejada por Supabase');
  };

  const updateUser = () => {
    throw new Error('Gestión de usuarios manejada por Supabase');
  };

  const deleteUser = () => {
    throw new Error('Gestión de usuarios manejada por Supabase');
  };

  const value = {
    user,
    isAuthenticated,
    permissions,
    loading,
    showSplash,
    hasPermission,
    hasModuleAccess,
    getUserPermissions,
    getUserRoleInfo,
    login,
    logout,
    clearAuthState,
    completeSplash
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
