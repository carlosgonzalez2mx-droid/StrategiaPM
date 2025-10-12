// ============================================
// PARCHE PARA AuthContext.js - FUNCIÓN LOGOUT
// Reemplazar la función logout completa
// ============================================

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

    // 3. Limpiar localStorage - TODOS los datos
    console.log('🧹 Limpiando localStorage completo...');
    const keysToClean = [
      'strategiapm_user',
      'mi-dashboard-portfolio',
      'portfolio-data',
      'lastSelectedProjectId',
      'portfolioData',
      'currentProjectId',
      'useSupabase'
    ];
    
    keysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`   🗑️ Limpiado: ${key}`);
      }
    });

    // 4. Limpiar IndexedDB
    console.log('🧹 Limpiando IndexedDB...');
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

    console.log('✅ Sesión cerrada y datos limpiados exitosamente');
    return { success: true };

  } catch (error) {
    console.error('❌ Error en logout:', error);
    return { success: false, error: error.message };
  } finally {
    setLoading(false);
  }
};
