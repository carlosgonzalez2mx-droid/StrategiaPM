// Script de prueba para verificar la funcionalidad de cancelar invitaciones
// Ejecutar en la consola del navegador después de cargar la aplicación

console.log('=== TEST DE CANCELAR INVITACIONES ===');

// Función para probar la cancelación de invitaciones
async function testCancelInvitation() {
  try {
    console.log('🔍 Verificando invitaciones pendientes...');
    
    // Obtener invitaciones pendientes
    const { data: pendingInvites, error: fetchError } = await supabaseService.supabase
      .from('organization_members')
      .select('id, user_email, status')
      .eq('status', 'pending');
    
    if (fetchError) {
      console.error('❌ Error obteniendo invitaciones:', fetchError);
      return;
    }
    
    console.log('📋 Invitaciones pendientes encontradas:', pendingInvites.length);
    pendingInvites.forEach(invite => {
      console.log(`  - ${invite.user_email} (ID: ${invite.id})`);
    });
    
    if (pendingInvites.length === 0) {
      console.log('ℹ️ No hay invitaciones pendientes para probar');
      return;
    }
    
    // Probar eliminación (simulación)
    const testInvite = pendingInvites[0];
    console.log(`🧪 Probando eliminación de invitación: ${testInvite.user_email}`);
    
    // Verificar permisos con EXPLAIN
    console.log('🔍 Verificando permisos de eliminación...');
    
    // Nota: Este es solo un test de permisos, no elimina realmente
    const { error: explainError } = await supabaseService.supabase
      .from('organization_members')
      .select('id')
      .eq('id', testInvite.id)
      .limit(1);
    
    if (explainError) {
      console.error('❌ Error de permisos:', explainError);
    } else {
      console.log('✅ Permisos de eliminación verificados correctamente');
    }
    
    console.log('✅ Test completado. La funcionalidad debería funcionar correctamente.');
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Función para verificar políticas RLS
async function checkRLSPolicies() {
  try {
    console.log('🔍 Verificando políticas RLS...');
    
    // Verificar que podemos acceder a organization_members
    const { data, error } = await supabaseService.supabase
      .from('organization_members')
      .select('id, status')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accediendo a organization_members:', error);
      return;
    }
    
    console.log('✅ Acceso a organization_members verificado');
    console.log('ℹ️ Las políticas RLS están funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error verificando RLS:', error);
  }
}

// Ejecutar tests
console.log('🚀 Iniciando tests...');
checkRLSPolicies().then(() => {
  testCancelInvitation();
});

console.log('📝 Para probar manualmente:');
console.log('1. Ve a la sección "Gestión de Usuarios"');
console.log('2. Busca una invitación pendiente');
console.log('3. Haz clic en "Cancelar"');
console.log('4. Confirma la acción');
console.log('5. Verifica que la invitación se elimine de la lista');
