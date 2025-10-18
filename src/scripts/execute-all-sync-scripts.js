#!/usr/bin/env node
// =====================================================
// EJECUTOR DE SCRIPTS DE SINCRONIZACIÓN
// =====================================================
// Este script ejecuta todos los scripts SQL de sincronización
// en el orden correcto

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuración de Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('   REACT_APP_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function readSqlFile(filename) {
  const filePath = path.join(__dirname, filename);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error leyendo archivo ${filename}:`, error.message);
    return null;
  }
}

async function executeSqlScript(scriptName, sqlContent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Ejecutando: ${scriptName}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Nota: Supabase no permite ejecutar múltiples statements en una query
    // Necesitamos dividir el SQL en statements individuales
    
    // Para scripts complejos, usaremos la API de PostgreSQL directamente
    // o ejecutarlos manualmente en el SQL Editor de Supabase
    
    console.log(`⚠️  Este script debe ejecutarse en el SQL Editor de Supabase:`);
    console.log(`   https://supabase.com/dashboard/project/_/sql/new`);
    console.log(`\n📋 Contenido del script:`);
    console.log(`${'─'.repeat(60)}`);
    console.log(sqlContent.substring(0, 500) + '...\n');
    console.log(`${'─'.repeat(60)}`);
    
    return { success: true, manual: true };
  } catch (error) {
    console.error(`❌ Error ejecutando ${scriptName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testSupabaseConnection() {
  console.log('🔍 Verificando conexión con Supabase...');
  
  try {
    // Intentar una query simple
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Error conectando con Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Conexión con Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

async function main() {
  console.log('🚀 EJECUTOR DE SCRIPTS DE SINCRONIZACIÓN DE USUARIOS');
  console.log('=====================================================\n');
  
  // Verificar conexión
  const connected = await testSupabaseConnection();
  if (!connected) {
    console.error('\n❌ No se pudo conectar con Supabase. Verifica tus credenciales.');
    process.exit(1);
  }
  
  console.log('\n📋 Scripts a ejecutar:');
  console.log('  1. diagnose-user-sync-issues.sql');
  console.log('  2. fix-user-sync-issues.sql');
  console.log('  3. create-sync-triggers.sql');
  console.log('  4. health-check-user-sync.sql\n');
  
  const scripts = [
    'diagnose-user-sync-issues.sql',
    'fix-user-sync-issues.sql',
    'create-sync-triggers.sql',
    'health-check-user-sync.sql'
  ];
  
  console.log('⚠️  IMPORTANTE: Debido a las limitaciones de la API de Supabase,');
  console.log('   estos scripts deben ejecutarse manualmente en el SQL Editor.');
  console.log('\n📖 INSTRUCCIONES:\n');
  console.log('1. Ve a: https://supabase.com/dashboard/project/_/sql/new');
  console.log('2. Ejecuta cada script en el siguiente orden:\n');
  
  for (let i = 0; i < scripts.length; i++) {
    const scriptName = scripts[i];
    const sqlContent = readSqlFile(scriptName);
    
    if (!sqlContent) {
      console.error(`❌ No se pudo leer el script ${scriptName}`);
      continue;
    }
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`   ${i + 1}. ${scriptName}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`   Ubicación: scripts/${scriptName}`);
    console.log(`   Tamaño: ${sqlContent.length} caracteres`);
    console.log(`   Descripción: ${getScriptDescription(scriptName)}`);
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ ALTERNATIVA: Copiar y pegar scripts');
  console.log(`${'═'.repeat(60)}\n`);
  
  // Mostrar contenido de cada script para facilitar copia
  for (const scriptName of scripts) {
    const sqlContent = readSqlFile(scriptName);
    if (sqlContent) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📄 ${scriptName}`);
      console.log(`${'─'.repeat(60)}`);
      
      // Guardar script individual para fácil acceso
      const outputPath = path.join(__dirname, `output-${scriptName}`);
      fs.writeFileSync(outputPath, sqlContent);
      console.log(`✅ Script guardado en: scripts/output-${scriptName}`);
    }
  }
  
  console.log('\n\n🎯 RESUMEN DE EJECUCIÓN:\n');
  console.log('Para ejecutar estos scripts en Supabase:');
  console.log('1. Abre el SQL Editor en tu proyecto de Supabase');
  console.log('2. Copia el contenido de cada script (en orden)');
  console.log('3. Pégalo en el SQL Editor');
  console.log('4. Haz clic en "Run"');
  console.log('5. Verifica los resultados\n');
  
  console.log('📁 Archivos preparados en: scripts/output-*.sql');
  console.log('✅ Listo para ejecutar en Supabase\n');
}

function getScriptDescription(scriptName) {
  const descriptions = {
    'diagnose-user-sync-issues.sql': 'Diagnóstico de inconsistencias entre auth.users y public.users',
    'fix-user-sync-issues.sql': 'Reparación y sincronización de usuarios existentes',
    'create-sync-triggers.sql': 'Creación de triggers automáticos de sincronización',
    'health-check-user-sync.sql': 'Verificación de salud del sistema de sincronización'
  };
  return descriptions[scriptName] || 'Sin descripción';
}

// Ejecutar script
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

