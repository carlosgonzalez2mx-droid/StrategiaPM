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

// Usuarios de ejemplo para testing
export const SAMPLE_USERS = [
  {
    id: "1",
    email: "pm@strategiapm.com",
    password: "pm123", // En producción esto sería un hash
    firstName: "Ana",
    lastName: "García",
    role: "project_manager",
    isActive: true,
    avatar: "👩‍💼"
  },
  {
    id: "2",
    email: "ejecutivo@strategiapm.com",
    password: "ejec123",
    firstName: "Carlos",
    lastName: "Rodríguez",
    role: "executive_manager",
    isActive: true,
    avatar: "👨‍💼"
  },
  {
    id: "3",
    email: "asistente@strategiapm.com",
    password: "asis123",
    firstName: "María",
    lastName: "López",
    role: "pmo_assistant",
    isActive: true,
    avatar: "👩‍💻"
  },
  {
    id: "4",
    email: "financiero@strategiapm.com",
    password: "fin123",
    firstName: "Roberto",
    lastName: "Martínez",
    role: "financial_analyst",
    isActive: true,
    avatar: "👨‍💻"
  },
  {
    id: "5",
    email: "coordinador@strategiapm.com",
    password: "coord123",
    firstName: "Laura",
    lastName: "Fernández",
    role: "project_coordinator",
    isActive: true,
    avatar: "👩‍🎯"
  },
  {
    id: "6",
    email: "auditor@strategiapm.com",
    password: "audit123",
    firstName: "Miguel",
    lastName: "Sánchez",
    role: "auditor",
    isActive: true,
    avatar: "👨‍🔍"
  }
];

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
  const [users, setUsers] = useState(SAMPLE_USERS);
  const [loading, setLoading] = useState(false);

  // Código problemático eliminado - no es necesario limpiar localStorage automáticamente
  // Esto causaba problemas de sincronización con la carga de datos del portfolio

  // Función de login
  const login = async (email, password) => {
    setLoading(true);
    
    try {
      console.log('🔐 Intentando login con:', { email, password });
      console.log('👥 Usuarios disponibles:', users);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const foundUser = users.find(u => 
        u.email === email && u.password === password && u.isActive
      );
      
      console.log('🔍 Usuario encontrado:', foundUser);
      
      if (!foundUser) {
        throw new Error('Credenciales inválidas o usuario inactivo');
      }
      
      const userData = {
        ...foundUser,
        roleInfo: ROLE_PERMISSIONS[foundUser.role]
      };
      
      console.log('✅ Login exitoso:', userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      setPermissions(ROLE_PERMISSIONS[foundUser.role]?.permissions || []);
      
      // Guardar en localStorage
      localStorage.setItem('strategiapm_user', JSON.stringify(userData));
      
      return userData;
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

  // Crear nuevo usuario (solo para Project Managers)
  const createUser = (userData) => {
    if (!hasPermission("users:create")) {
      throw new Error('No tienes permisos para crear usuarios');
    }
    
    const newUser = {
      ...userData,
      id: Date.now().toString(),
      isActive: true
    };
    
    setUsers(prev => {
      const newUsers = prev.slice();
      newUsers.push(newUser);
      return newUsers;
    });
    return newUser;
  };

  // Actualizar usuario
  const updateUser = (userId, updates) => {
    if (!hasPermission("users:update")) {
      throw new Error('No tienes permisos para actualizar usuarios');
    }
    
    setUsers(prev => prev.map(u => 
      u.id === userId ? Object.assign({}, u, updates) : u
    ));
  };

  // Eliminar usuario
  const deleteUser = (userId) => {
    if (!hasPermission("users:delete")) {
      throw new Error('No tienes permisos para eliminar usuarios');
    }
    
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const value = {
    user,
    isAuthenticated,
    permissions,
    users,
    loading,
    hasPermission,
    hasModuleAccess,
    getUserPermissions,
    getUserRoleInfo,
    login,
    logout,
    clearAuthState,
    createUser,
    updateUser,
    deleteUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
