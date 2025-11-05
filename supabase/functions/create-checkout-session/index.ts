// ================================================================
// Edge Function: create-checkout-session
// Propósito: Crear sesión de checkout de Stripe para upgrade de plan
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

// Configuración CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar que existe la secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      console.error('[Checkout] ❌ STRIPE_SECRET_KEY no está configurado');
      return new Response(
        JSON.stringify({
          error: 'Configuración de Stripe incompleta',
          details: 'STRIPE_SECRET_KEY no está configurado en Supabase Secrets'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[Checkout] ✓ STRIPE_SECRET_KEY encontrado');

    // Inicializar Stripe con la secret key
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parsear el body de la petición
    const {
      organizationId,
      organizationName,
      userEmail,
      priceId,
      plan = 'professional'
    } = await req.json();

    // Validaciones
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'priceId es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[Checkout] Creando sesión para org: ${organizationId}, plan: ${plan}`);

    // Obtener el origin del request, o usar la URL de referer como fallback
    const baseUrl = req.headers.get('origin') || req.headers.get('referer')?.split('?')[0].replace(/\/$/, '') || 'http://localhost:3000';
    console.log(`[Checkout] Base URL detectada: ${baseUrl}`);

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',

      // URLs de redirección
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancelled`,

      // Metadata para identificar la organización en el webhook
      metadata: {
        organizationId,
        organizationName: organizationName || '',
        plan,
      },

      // Información del cliente
      customer_email: userEmail,

      // Permitir códigos de promoción
      allow_promotion_codes: true,

      // Configuración de la suscripción
      subscription_data: {
        metadata: {
          organizationId,
          plan,
        },
      },
    });

    console.log(`[Checkout] Sesión creada exitosamente: ${session.id}`);

    // Retornar la URL de checkout
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Checkout] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Error al crear sesión de checkout',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/*
TESTING LOCAL:

1. Iniciar Supabase local:
   supabase start

2. Ejecutar función localmente:
   supabase functions serve create-checkout-session

3. Hacer petición de prueba:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-checkout-session' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{
       "organizationId": "test-org-id",
       "organizationName": "Test Org",
       "userEmail": "test@example.com",
       "priceId": "price_xxxxx",
       "plan": "professional"
     }'

DEPLOYMENT:

1. Configurar secrets:
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_...

2. Deploy:
   supabase functions deploy create-checkout-session

3. Ver logs:
   supabase functions logs create-checkout-session
*/
