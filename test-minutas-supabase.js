/**
 * Script de prueba para verificar la integración de minutas con Supabase
 * Ejecutar desde la consola del navegador en la aplicación
 */

// Función para probar la conexión a Supabase y las minutas
async function testMinutasSupabase() {
    console.log('🧪 Iniciando pruebas de minutas con Supabase...');

    try {
        // Importar el servicio de Supabase
        const supabaseService = window.supabaseService || (await import('./src/services/SupabaseService.js')).default;

        console.log('✅ SupabaseService cargado');

        // Verificar si el usuario está autenticado
        const isAuthenticated = supabaseService.isAuthenticated();
        console.log(`🔐 Usuario autenticado: ${isAuthenticated}`);

        if (!isAuthenticated) {
            console.warn('⚠️ Usuario no autenticado. Algunas pruebas no funcionarán.');
            return;
        }

        // Obtener organización actual
        const organizationId = supabaseService.getCurrentOrganization();
        console.log(`🏢 Organización actual: ${organizationId}`);

        // Datos de prueba para minuta
        const testProjectId = 'test-project-' + Date.now();
        const testMinutaTasks = [
            {
                id: 'minuta-test-' + Date.now() + '-1',
                tarea: 'Tarea de prueba 1',
                responsable: 'Usuario de Prueba',
                fecha: '2025-01-15',
                hitoId: 'hito-test-1',
                estatus: 'Pendiente',
                fechaCreacion: new Date().toISOString()
            },
            {
                id: 'minuta-test-' + Date.now() + '-2',
                tarea: 'Tarea de prueba 2',
                responsable: 'Otro Usuario',
                fecha: '2025-01-20',
                hitoId: 'hito-test-2',
                estatus: 'En Proceso',
                fechaCreacion: new Date().toISOString()
            }
        ];

        console.log('📝 Datos de prueba preparados:', testMinutaTasks);

        // Prueba 1: Guardar minutas
        console.log('\n🧪 Prueba 1: Guardando minutas...');
        const saveResult = await supabaseService.saveMinutas(testProjectId, testMinutaTasks);

        if (saveResult.success) {
            console.log('✅ Minutas guardadas exitosamente:', saveResult.data);
        } else {
            console.error('❌ Error guardando minutas:', saveResult.error);
            return;
        }

        // Prueba 2: Cargar minutas
        console.log('\n🧪 Prueba 2: Cargando minutas...');
        const loadResult = await supabaseService.loadMinutasByProject(testProjectId);

        if (loadResult.success) {
            console.log('✅ Minutas cargadas exitosamente:', loadResult.minutas);
            console.log(`📊 Total minutas cargadas: ${loadResult.minutas.length}`);
        } else {
            console.error('❌ Error cargando minutas:', loadResult.error);
            return;
        }

        // Prueba 3: Actualizar estatus de una minuta
        if (loadResult.minutas.length > 0) {
            const firstMinuta = loadResult.minutas[0];
            console.log('\n🧪 Prueba 3: Actualizando estatus...');

            const updateResult = await supabaseService.updateMinutaStatus(firstMinuta.id, 'Completado');

            if (updateResult.success) {
                console.log('✅ Estatus actualizado exitosamente:', updateResult.data);
            } else {
                console.error('❌ Error actualizando estatus:', updateResult.error);
            }
        }

        // Prueba 4: Verificar carga después de actualización
        console.log('\n🧪 Prueba 4: Verificando cambios...');
        const verifyResult = await supabaseService.loadMinutasByProject(testProjectId);

        if (verifyResult.success) {
            console.log('✅ Verificación exitosa. Minutas actuales:', verifyResult.minutas);
        } else {
            console.error('❌ Error en verificación:', verifyResult.error);
        }

        // Prueba 5: Limpiar datos de prueba
        console.log('\n🧪 Prueba 5: Limpiando datos de prueba...');
        for (const minuta of loadResult.minutas) {
            const deleteResult = await supabaseService.deleteMinuta(minuta.id);

            if (deleteResult.success) {
                console.log(`✅ Minuta ${minuta.id} eliminada`);
            } else {
                console.warn(`⚠️ Error eliminando minuta ${minuta.id}:`, deleteResult.error);
            }
        }

        console.log('\n🎉 ¡Todas las pruebas completadas!');

        return {
            success: true,
            tests: {
                save: saveResult.success,
                load: loadResult.success,
                update: updateResult?.success || false,
                verify: verifyResult.success,
                cleanup: true
            }
        };

    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función para probar solo la conectividad básica
async function testBasicConnection() {
    console.log('🔗 Probando conexión básica a Supabase...');

    try {
        const supabaseService = window.supabaseService || (await import('./src/services/SupabaseService.js')).default;

        console.log('✅ Servicio importado');
        console.log('🔐 Autenticado:', supabaseService.isAuthenticated());
        console.log('🏢 Organización:', supabaseService.getCurrentOrganization());
        console.log('👤 Usuario:', supabaseService.getCurrentUser()?.email || 'No disponible');

        return true;
    } catch (error) {
        console.error('❌ Error en conexión básica:', error);
        return false;
    }
}

// Hacer las funciones disponibles globalmente
window.testMinutasSupabase = testMinutasSupabase;
window.testBasicConnection = testBasicConnection;

console.log(`
🧪 Scripts de prueba cargados. Ejecutar en la consola:

1. Prueba básica: testBasicConnection()
2. Prueba completa: testMinutasSupabase()

Asegúrate de estar en la pestaña "Tareas de minutas" para ver los resultados.
`);