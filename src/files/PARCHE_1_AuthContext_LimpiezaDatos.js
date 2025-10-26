// ============================================
// PARCHE PARA AuthContext.js
// Agregar al final del archivo syncUserFromSupabase
// ============================================

// 🔄 Sincronizar usuario desde Supabase
const syncUserFromSupabase = async (supabaseUser) => {
  try {
    console.log('🔄 Sincronizando usuario desde Supabase...');

    // Detectar organización
    const orgId = await supabaseService.detectUserOrganization();
    
    // 🆕 NUEVO: Verificar si cambió la organización
    const previousOrgId = organizationId;
    const hasOrganizationChanged = previousOrgId && previousOrgId !== orgId;
    const isNewUserWithoutOrg = !orgId && previousOrgId;
    
    // 🆕 NUEVO: Si cambió la organización o el nuevo usuario no tiene org, limpiar datos
    if (hasOrganizationChanged || isNewUserWithoutOrg) {
      console.log('🧹 Organización cambió o usuario sin org - Limpiando datos locales...');
      console.log('   Org anterior:', previousOrgId);
      console.log('   Org nueva:', orgId);
      
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
        
        deleteRequest.onerror = () => {
          console.warn('   ⚠️ Error limpiando IndexedDB');
        };
      } catch (error) {
        console.warn('   ⚠️ Error limpiando IndexedDB:', error);
      }
      
      console.log('✅ Datos locales limpiados - Usuario verá datos limpios');
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
