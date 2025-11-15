// Script de prueba para verificar que las variables de entorno se cargan correctamente
// Ejecutar con: node -r dotenv/config test-env-config.js

console.log('🔍 VERIFICANDO CONFIGURACIÓN DE VARIABLES DE ENTORNO\n');
console.log('='.repeat(80));

// Simular process.env.REACT_APP_* como lo hace Create React App
require('dotenv').config();

const config = {
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  STRIPE_PRICE_ID: process.env.REACT_APP_STRIPE_PRICE_ID,
  STRIPE_PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
  BASE_URL: process.env.REACT_APP_BASE_URL
};

console.log('\n📋 Variables encontradas:\n');

Object.entries(config).forEach(([key, value]) => {
  if (value) {
    // Ocultar parcialmente las claves sensibles
    const displayValue = key.includes('KEY') || key.includes('ID')
      ? value.substring(0, 20) + '...' + value.substring(value.length - 10)
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: NO CONFIGURADA`);
  }
});

console.log('\n' + '='.repeat(80));

// Verificar configuraciones requeridas
const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredVars.filter(key => !config[key]);

if (missingVars.length > 0) {
  console.log('\n❌ ERROR: Variables requeridas faltantes:');
  missingVars.forEach(key => console.log(`   - REACT_APP_${key}`));
  console.log('\n💡 Solución: Verifica que el archivo .env existe y contiene estas variables.');
  process.exit(1);
} else {
  console.log('\n✅ ÉXITO: Todas las variables requeridas están configuradas correctamente.');
  console.log('\n📝 Notas:');
  console.log('   - Las variables opcionales de Stripe pueden configurarse después');
  console.log('   - Asegúrate de configurar estas mismas variables en Vercel para producción');
  process.exit(0);
}
