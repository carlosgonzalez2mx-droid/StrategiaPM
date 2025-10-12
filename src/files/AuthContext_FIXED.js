import React, { createContext, useContext, useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

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

// Mapeo de roles de Supabase a roles del sistema
const SUPABASE_ROLE_MAPPING = {
  'owner': 'project_manager',
  'admin': 'project_manager',
  'manager': 'pmo_assistant',
  'coordinator': 'project_coordinator',
  'analyst': 'financial_analyst',
  'viewer': 'auditor',
  'member': 'pmo_assistant',
  'user': 'pmo_assistant'
};

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
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);

  // 🔄 INICIALIZACIÓN: Verificar autenticación al cargar
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setLoading(true);
    try {
      console.log('🔐 Inicializando autenticación...');

      // 1. Inicializar SupabaseService
      await supabaseService.initialize();

      // 2. Verificar si hay usuario autenticado en Supabase
      const supabaseUser = supabaseService.getCurrentUser();
      
      if (supabaseUser) {
        console.log('✅ Usuario autenticado encontrado:', supabaseUser.email);
        
        // 3. Cargar datos del usuario y configurar contexto
        await syncUserFromSupabase(supabaseUser);
      } else {
        // 4. Si no hay usuario en Supabase, verificar localStorage (para retrocompatibilidad)
        const savedUser = localStorage.getItem('strategiapm_user');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            console.log('📦 Usuario recuperado de localStorage:', userData.email);
            setUser(userData);
            setIsAuthenticated(true);
            setPermissions(ROLE_PERMISSIONS[userData.role]?.permissions || []);
            setOrganizationId(userData.organizationId || null);
          } catch (error) {
            console.error('❌ Error parseando usuario de localStorage:', error);
            localStorage.removeItem('strategiapm_user');
          }
        } else {
          console.log('ℹ️ No hay sesión activa');
        }
      }
    } catch (error) {
      console.error('❌ Error inicializando autenticación:', error);
    } finally {
      setLoading(false);
      setShowSplash(false);
    }
  };

  // 🧹 NUEVA FUNCIÓN: Limpiar datos locales
  const clearLocalData = () => {
    console.log('🧹 Limpiando datos locales...');
    
    // Limpiar localStorage de datos de portfolio
    const keysToClean = [
      'mi-dashboard-portfolio',
      'portfolio-data',
      'lastSelectedProjectId',
      'portfolioData',
      'currentProjectId'
    ];
    
    keysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`   🗑️ Limpiado: ${key}`);
      }
    });
    
    // Limpiar IndexedDB
    try {
      const dbName = 'mi-dashboard-portfolio';
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      deleteRequest.onsuccess = () => {
        console.log('   ✅ IndexedDB limpiado exitosamente');
      };
      
      deleteRequest.onerror = (event) => {
        console.warn('   ⚠️ Error limpiando IndexedDB:', event);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('   ⚠️ Limpieza de IndexedDB bloqueada (pestañas abiertas)');
      };
    } catch (error) {
      console.warn('   ⚠️ Error al intentar limpiar IndexedDB:', error);
    }
    
    console.log('✅ Datos locales limpiados');
  };

  // 🔄 Sincronizar usuario desde Supabase (CON LIMPIEZA AUTOMÁTICA)
  const syncUserFromSupabase = async (supabaseUser) => {
    try {
      console.log('🔄 Sincronizando usuario desde Supabase...');

      // Detectar organización
      const orgId = await supabaseService.detectUserOrganization();
      
      // 🆕 VERIFICAR SI CAMBIÓ LA ORGANIZACIÓN
      const previousOrgId = organizationId;
      const hasOrganizationChanged = previousOrgId && previousOrgId !== orgId;
      const isNewUserWithoutOrg = !orgId && previousOrgId;
      
      // 🆕 SI CAMBIÓ LA ORGANIZACIÓN O EL NUEVO USUARIO NO TIENE ORG, LIMPIAR DATOS
      if (hasOrganizationChanged || isNewUserWithoutOrg) {
        console.log('🔄 Organización cambió o usuario sin org - Limpiando datos...');
        console.log('   📍 Org anterior:', previousOrgId);
        console.log('   📍 Org nueva:', orgId || 'ninguna');
        
        clearLocalData();
        
        console.log('✅ Datos limpiados - Usuario verá datos limpios');
      }
      
      // Obtener rol del usuario desde organization_members
      let userRole = 'pmo_assistant'; // Rol por defecto
      
      if (orgId) {
        try {
          const { data: membership } = await supabaseService.supabase
            .from('organization_members')
            .select('role')
            .eq('user_email', supabaseUser.email)
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .single();

          if (membership && membership.role) {
            // Mapear rol de Supabase a rol del sistema
            userRole = SUPABASE_ROLE_MAPPING[membership.role] || 'pmo_assistant';
            console.log(`✅ Rol detectado: ${membership.role} → ${userRole}`);
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener rol, usando default:', error);
        }
      } else {
        console.log('⚠️ Usuario sin organización - usando rol por defecto');
      }

      // Construir objeto de usuario
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
        role: userRole,
        organizationId: orgId,
        supabaseUser: true,
        lastLogin: new Date().toISOString()
      };

      // Actualizar estado
      setUser(userData);
      setIsAuthenticated(true);
      setPermissions(ROLE_PERMISSIONS[userRole]?.permissions || []);
      setOrganizationId(orgId);

      // Guardar en localStorage para persistencia
      localStorage.setItem('strategiapm_user', JSON.stringify(userData));

      console.log('✅ Usuario sincronizado exitosamente');
      return userData;

    } catch (error) {
      console.error('❌ Error sincronizando usuario:', error);
      throw error;
    }
  };

  // 🔐 LOGIN MEJORADO: Integración completa con Supabase
  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log('🔐 Iniciando sesión...');

      // 1. Autenticar con Supabase
      const result = await supabaseService.signIn(email, password);

      if (!result.success) {
        throw new Error(result.error || 'Error al iniciar sesión');
      }

      console.log('✅ Autenticación exitosa en Supabase');

      // 2. Sincronizar usuario con contexto (limpiará datos si cambió org)
      const userData = await syncUserFromSupabase(result.user);

      // 3. Verificar invitaciones activadas
      if (result.invitationActivation && result.invitationActivation.activated > 0) {
        console.log('🎉 Invitaciones activadas:', result.invitationActivation.activated);
      }

      console.log('✅ Login completado exitosamente');
      return { success: true, user: userData };

    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🚪 LOGOUT MEJORADO: Limpieza completa
  const logout = async () => {
    setLoading(true);
    try {
      console.log('🚪 Cerrando sesión...');

      // 1. Logout de Supabase
      const result = await supabaseService.signOut();
      
      if (!result.success) {
        console.warn('⚠️ Error en logout de Supabase:', result.error);
      }

      // 2. Limpiar estado local
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      setOrganizationId(null);

      // 3. Limpiar localStorage - Usuario
      localStorage.removeItem('strategiapm_user');

      // 4. Limpiar datos de proyectos
      clearLocalData();

      console.log('✅ Sesión cerrada y datos limpiados exitosamente');
      return { success: true };

    } catch (error) {
      console.error('❌ Error en logout:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 🔄 REGISTRO MEJORADO: Integración con Supabase
  const register = async (email, password, name) => {
    setLoading(true);
    try {
      console.log('📝 Registrando nuevo usuario...');

      // 1. Crear cuenta en Supabase
      const result = await supabaseService.signUp(email, password, name);

      if (!result.success) {
        throw new Error(result.error || 'Error al crear la cuenta');
      }

      console.log('✅ Cuenta creada exitosamente');

      // 2. Sincronizar usuario con contexto (limpiará datos si es necesario)
      const userData = await syncUserFromSupabase(result.user);

      // 3. Verificar invitaciones activadas
      if (result.invitationActivation && result.invitationActivation.activated > 0) {
        console.log('🎉 Invitaciones activadas:', result.invitationActivation.activated);
      }

      return { success: true, user: userData, invitationActivation: result.invitationActivation };

    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Verificar si el usuario tiene un permiso específico
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

  // 🔍 Verificar si el usuario tiene acceso a un módulo
  const hasModuleAccess = (module) => {
    if (!permissions || permissions.length === 0) return false;
    
    if (permissions.includes("*:*")) return true;
    
    return permissions.some(permission => 
      permission.startsWith(`${module}:`) || permission === `${module}:*`
    );
  };

  // 📊 Obtener permisos del usuario actual
  const getUserPermissions = () => {
    if (!user) return [];
    return ROLE_PERMISSIONS[user.role]?.permissions || [];
  };

  // 📊 Obtener información del rol del usuario
  const getUserRoleInfo = () => {
    if (!user) return null;
    return ROLE_PERMISSIONS[user.role] || null;
  };

  // 🧹 Función para limpiar completamente el estado (útil para debugging)
  const clearAuthState = async () => {
    console.log('🧹 Limpiando estado de autenticación...');
    await logout();
  };

  // ⏱️ Función para completar el splash screen
  const completeSplash = () => {
    setShowSplash(false);
  };

  // 🔄 Función para recargar sesión (útil después de cambios en Supabase)
  const reloadSession = async () => {
    console.log('🔄 Recargando sesión...');
    await initializeAuth();
  };

  const value = {
    // Estado
    user,
    isAuthenticated,
    permissions,
    loading,
    showSplash,
    organizationId,
    
    // Funciones de autenticación
    login,
    logout,
    register,
    
    // Funciones de utilidad
    hasPermission,
    hasModuleAccess,
    getUserPermissions,
    getUserRoleInfo,
    clearAuthState,
    completeSplash,
    reloadSession,
    clearLocalData, // 🆕 NUEVA: Exportar función de limpieza
    
    // Función para actualizar usuario manualmente (si es necesario)
    syncUserFromSupabase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
