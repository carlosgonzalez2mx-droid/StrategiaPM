// ============================================
// SCRIPT DE PRUEBA PARA ERROR 400 EN ORGANIZATION_MEMBERS
// ============================================
// Este script simula la query exacta que está fallando
// y proporciona información detallada del error

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase desde variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Missing Supabase configuration in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testOrganizationMembersQuery() {
    console.log('🔍 INICIANDO DIAGNÓSTICO DEL ERROR 400...\n');
    
    const emailToTest = 'carlosgonzalez2.mx@gmail.com';
    
    try {
        // PASO 1: Verificar autenticación
        console.log('📋 PASO 1: Verificando autenticación...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.error('❌ Error de autenticación:', authError);
            return;
        }
        
        if (!user) {
            console.error('❌ Usuario no autenticado');
            return;
        }
        
        console.log('✅ Usuario autenticado:', user.email);
        console.log('🆔 User ID:', user.id);
        
        // PASO 2: Probar query simple sin JOIN
        console.log('\n📋 PASO 2: Probando query simple...');
        const { data: simpleData, error: simpleError } = await supabase
            .from('organization_members')
            .select('id, user_email, organization_id, role, status')
            .eq('user_email', emailToTest);
        
        if (simpleError) {
            console.error('❌ Error en query simple:', simpleError);
            console.error('Código:', simpleError.code);
            console.error('Mensaje:', simpleError.message);
            console.error('Detalles:', simpleError.details);
            console.error('Hint:', simpleError.hint);
        } else {
            console.log('✅ Query simple exitosa');
            console.log('📊 Datos encontrados:', simpleData);
        }
        
        // PASO 3: Probar query con filtro de status
        console.log('\n📋 PASO 3: Probando query con filtro status...');
        const { data: statusData, error: statusError } = await supabase
            .from('organization_members')
            .select('id, user_email, organization_id, role, status')
            .eq('user_email', emailToTest)
            .eq('status', 'active');
        
        if (statusError) {
            console.error('❌ Error en query con status:', statusError);
            console.error('Código:', statusError.code);
            console.error('Mensaje:', statusError.message);
        } else {
            console.log('✅ Query con status exitosa');
            console.log('📊 Datos encontrados:', statusData);
        }
        
        // PASO 4: Probar query con .single()
        console.log('\n📋 PASO 4: Probando query con .single()...');
        const { data: singleData, error: singleError } = await supabase
            .from('organization_members')
            .select('id, user_email, organization_id, role, status')
            .eq('user_email', emailToTest)
            .eq('status', 'active')
            .single();
        
        if (singleError) {
            console.error('❌ Error en query con .single():', singleError);
            console.error('Código:', singleError.code);
            console.error('Mensaje:', singleError.message);
            console.error('Detalles:', singleError.details);
            console.error('Hint:', singleError.hint);
        } else {
            console.log('✅ Query con .single() exitosa');
            console.log('📊 Datos encontrados:', singleData);
        }
        
        // PASO 5: Probar query completa con JOIN (la que está fallando)
        console.log('\n📋 PASO 5: Probando query completa con JOIN...');
        const { data: fullData, error: fullError } = await supabase
            .from('organization_members')
            .select(`
                id,
                organization_id,
                role,
                status,
                organizations (
                    id,
                    name,
                    owner_id,
                    created_at
                )
            `)
            .eq('user_email', emailToTest)
            .eq('status', 'active')
            .single();
        
        if (fullError) {
            console.error('❌ Error en query completa:', fullError);
            console.error('Código:', fullError.code);
            console.error('Mensaje:', fullError.message);
            console.error('Detalles:', fullError.details);
            console.error('Hint:', fullError.hint);
            
            // Análisis específico del error
            if (fullError.code === 'PGRST116') {
                console.log('\n💡 ANÁLISIS: No se encontraron registros (PGRST116)');
                console.log('   - El usuario no tiene membresía activa');
                console.log('   - O la organización fue eliminada');
            } else if (fullError.code === '22P02') {
                console.log('\n💡 ANÁLISIS: Error de sintaxis de UUID (22P02)');
                console.log('   - Hay un problema con el formato de los IDs');
            } else if (fullError.code === '42501') {
                console.log('\n💡 ANÁLISIS: Error de permisos (42501)');
                console.log('   - Las políticas RLS están bloqueando el acceso');
            } else if (fullError.code === 'PGRST301') {
                console.log('\n💡 ANÁLISIS: Error de relación (PGRST301)');
                console.log('   - La tabla organizations no existe o no es accesible');
            }
        } else {
            console.log('✅ Query completa exitosa');
            console.log('📊 Datos encontrados:', fullData);
        }
        
        // PASO 6: Verificar si la organización existe
        console.log('\n📋 PASO 6: Verificando organización...');
        if (simpleData && simpleData.length > 0) {
            const orgId = simpleData[0].organization_id;
            console.log('🆔 Organization ID encontrado:', orgId);
            
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id, name, owner_id, created_at')
                .eq('id', orgId)
                .single();
            
            if (orgError) {
                console.error('❌ Error consultando organización:', orgError);
                console.log('💡 La organización fue eliminada o no es accesible');
            } else {
                console.log('✅ Organización encontrada:', orgData);
            }
        }
        
    } catch (error) {
        console.error('❌ Error inesperado:', error);
    }
}

// Ejecutar el diagnóstico
testOrganizationMembersQuery().then(() => {
    console.log('\n🏁 DIAGNÓSTICO COMPLETADO');
}).catch(error => {
    console.error('❌ Error ejecutando diagnóstico:', error);
});
