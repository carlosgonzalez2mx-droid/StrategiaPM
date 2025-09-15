// Script para ejecutar en la consola del navegador
// Copia y pega este código en la consola de tu aplicación

console.log('🔧 Iniciando corrección de rol...');

// 1. Obtener el cliente de Supabase desde tu aplicación
const supabase = window.supabase || window.supabaseClient;

if (!supabase) {
    console.error('❌ No se encontró el cliente de Supabase');
} else {
    console.log('✅ Cliente de Supabase encontrado');
    
    // 2. Verificar usuario actual
    supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error) {
            console.error('❌ Error obteniendo usuario:', error);
            return;
        }
        
        if (!user) {
            console.error('❌ No hay usuario autenticado');
            return;
        }
        
        console.log('📋 Usuario actual:', user.email);
        console.log('📋 Rol actual:', user.user_metadata?.role);
        
        // 3. Actualizar rol a "owner"
        supabase.auth.updateUser({
            data: {
                role: 'owner'
            }
        }).then(({ data, error }) => {
            if (error) {
                console.error('❌ Error actualizando rol:', error);
                return;
            }
            
            console.log('✅ Rol actualizado a:', data.user.user_metadata?.role);
            console.log('🎉 ¡Cambio completado! Recarga la página para ver los cambios.');
        });
    });
}
