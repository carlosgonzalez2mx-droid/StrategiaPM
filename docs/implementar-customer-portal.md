# Guía: Implementar Stripe Customer Portal

## ¿Qué es el Customer Portal?

El Stripe Customer Portal es una página hosteada por Stripe donde tus clientes pueden:
- ✅ Cancelar su suscripción
- ✅ Actualizar su método de pago (tarjeta)
- ✅ Ver historial de pagos
- ✅ Descargar facturas
- ✅ Actualizar información de facturación

## Ventajas

1. **Cero UI que construir** - Stripe proporciona todo
2. **Cumple con regulaciones** - GDPR, PSD2, etc.
3. **Siempre actualizado** - Stripe mantiene la UI
4. **Multi-idioma** - Soporta español automáticamente
5. **Responsive** - Funciona en móviles

## Pasos para Implementar

### Paso 1: Crear Edge Function para el Portal

Crea el archivo: `supabase/functions/create-portal-session/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Obtener la URL de retorno
    const baseUrl = req.headers.get('origin') ||
                    req.headers.get('referer')?.split('?')[0].replace(/\/$/, '') ||
                    'http://localhost:3000';

    // Crear sesión del Customer Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/subscription/manage`,
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[Portal] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Paso 2: Configurar el Customer Portal en Stripe Dashboard

1. Ve a: https://dashboard.stripe.com/test/settings/billing/portal
2. Activa el Customer Portal
3. Configura las opciones:
   - ✅ Permitir cancelar suscripciones
   - ✅ Permitir actualizar métodos de pago
   - ✅ Mostrar historial de facturas
4. Personaliza los colores (opcional) para que coincidan con tu marca

### Paso 3: Desplegar la Edge Function

```bash
supabase functions deploy create-portal-session
```

### Paso 4: Crear componente React para abrir el Portal

Crea: `src/components/subscription/ManageSubscriptionButton.js`

```javascript
import React, { useState } from 'react';
import supabaseService from '../../services/SupabaseService';

const ManageSubscriptionButton = ({ stripeCustomerId }) => {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      alert('No tienes una suscripción activa');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseService.supabase.functions.invoke(
        'create-portal-session',
        {
          body: { customerId: stripeCustomerId }
        }
      );

      if (error) throw error;

      if (data?.url) {
        // Redirigir al Customer Portal
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error abriendo portal:', error);
      alert('Error abriendo el portal de gestión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleManageSubscription}
      disabled={loading}
      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
    >
      {loading ? 'Abriendo...' : '⚙️ Gestionar Suscripción'}
    </button>
  );
};

export default ManageSubscriptionButton;
```

### Paso 5: Agregar el botón al Panel de Suscripciones

En `src/components/subscription/SubscriptionTestPanel.js`, agrega:

```javascript
import ManageSubscriptionButton from './ManageSubscriptionButton';

// Dentro del render, después del botón "Recargar":
{currentSubscription?.stripe_customer_id && (
  <ManageSubscriptionButton
    stripeCustomerId={currentSubscription.stripe_customer_id}
  />
)}
```

## Flujo Completo del Usuario

1. Usuario hace clic en "Gestionar Suscripción"
2. Se crea una sesión temporal del portal
3. Usuario es redirigido a Stripe (ejemplo: `billing.stripe.com/session/xxx`)
4. Usuario cancela su suscripción
5. Stripe envía webhook `customer.subscription.deleted`
6. Tu Edge Function hace downgrade automático a Free
7. Usuario es redirigido de vuelta a tu app

## Eventos del Webhook que se Activan

Cuando el usuario cancela desde el portal:

- `customer.subscription.updated` - Si pone cancelación al final del periodo
- `customer.subscription.deleted` - Cuando la suscripción termina

Tu webhook YA maneja estos eventos correctamente.

## Personalización Avanzada (Opcional)

En el dashboard del Customer Portal puedes configurar:

- **Proration behavior**: ¿Reembolsar el tiempo no usado?
- **Cancellation reasons**: Pedir feedback cuando cancelan
- **Invoice history**: Cuántas facturas mostrar
- **Payment methods**: Qué métodos permitir

## Testing

En modo test, usa este Customer ID de prueba:
```
cus_test_xxxxx
```

Para probarlo:
1. Completa un checkout de prueba
2. Guarda el `stripe_customer_id` que se almacena
3. Haz clic en "Gestionar Suscripción"
4. Prueba cancelar la suscripción
5. Verifica que el webhook hace downgrade a Free

## Costos

El Customer Portal es **GRATIS** - incluido en Stripe sin costo adicional.

## Soporte

Stripe Customer Portal incluye soporte automático para:
- 25+ idiomas (incluyendo español)
- Todos los métodos de pago de Stripe
- Cumplimiento SCA (Strong Customer Authentication)
- GDPR compliance
