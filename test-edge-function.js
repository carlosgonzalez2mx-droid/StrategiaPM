// Test directo de la Edge Function
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCheckoutSession() {
  console.log('🧪 Probando create-checkout-session...');
  console.log('Supabase URL:', supabaseUrl);

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        organizationId: '2e2e8ef3-4790-48bc-9a99-802b9bf87c2b',
        organizationName: 'Organization',
        userEmail: 'prueba9@prueba.com',
        priceId: 'price_1SPALq48wwYDYLlkLRP4SFG6',
        plan: 'professional'
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Éxito!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
    console.error('Stack:', err.stack);
  }
}

testCheckoutSession();
