// ================================================================
// Edge Function: stripe-webhook
// Propósito: Procesar webhooks de Stripe (pagos, cancelaciones, etc.)
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");

  // Validar que existe la firma
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No se encontró firma de Stripe" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Inicializar Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Inicializar Supabase client (service role para operaciones admin)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener el webhook signing secret
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("[Webhook] STRIPE_WEBHOOK_SECRET no configurado");
      return new Response(
        JSON.stringify({ error: "Configuración de webhook incompleta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Leer el body como texto
    const body = await req.text();

    // Verificar la firma del webhook
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("[Webhook] Error verificando firma:", err.message);
      return new Response(
        JSON.stringify({ error: `Firma inválida: ${err.message}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Webhook] Evento recibido: ${event.type}`);

    // Procesar diferentes tipos de eventos
    switch (event.type) {
      // ============================================================
      // EVENTO: Checkout Session Completado
      // ============================================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { organizationId, plan } = session.metadata || {};

        if (!organizationId) {
          console.error("[Webhook] No se encontró organizationId en metadata");
          break;
        }

        console.log(`[Webhook] Checkout completado para org: ${organizationId}, plan: ${plan}`);

        // Actualizar organización a plan Professional
        const { error: updateError } = await supabase
          .from("organizations")
          .update({
            subscription_plan: plan || "professional",
            subscription_status: "active",
            max_projects: null, // Ilimitado
            max_users: null,    // Ilimitado
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq("id", organizationId);

        if (updateError) {
          console.error("[Webhook] Error actualizando organización:", updateError);
        } else {
          console.log(`[Webhook] Organización ${organizationId} actualizada a ${plan}`);

          // Registrar en historial
          await supabase.from("subscription_history").insert({
            organization_id: organizationId,
            event_type: "upgraded",
            from_plan: "free", // Asumimos que venía de free
            to_plan: plan || "professional",
            change_reason: "Pago exitoso vía Stripe Checkout",
            metadata: {
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              stripe_session_id: session.id,
            },
          });
        }

        break;
      }

      // ============================================================
      // EVENTO: Suscripción creada
      // ============================================================
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const { organizationId, plan } = subscription.metadata || {};

        console.log(`[Webhook] Suscripción creada: ${subscription.id} para org: ${organizationId}`);
        break;
      }

      // ============================================================
      // EVENTO: Suscripción actualizada
      // ============================================================
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { organizationId } = subscription.metadata || {};

        if (!organizationId) break;

        console.log(`[Webhook] Suscripción actualizada: ${subscription.id}`);

        // Actualizar estado de la suscripción
        await supabase
          .from("organizations")
          .update({
            subscription_status: subscription.status === "active" ? "active" : "cancelled",
          })
          .eq("id", organizationId);

        break;
      }

      // ============================================================
      // EVENTO: Suscripción cancelada
      // ============================================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { organizationId } = subscription.metadata || {};

        if (!organizationId) break;

        console.log(`[Webhook] Suscripción cancelada: ${subscription.id} para org: ${organizationId}`);

        // Downgrade a plan Free
        const { error: downgradeError } = await supabase
          .from("organizations")
          .update({
            subscription_plan: "free",
            subscription_status: "cancelled",
            max_projects: 1,
            max_users: 3,
          })
          .eq("id", organizationId);

        if (!downgradeError) {
          // Registrar en historial
          await supabase.from("subscription_history").insert({
            organization_id: organizationId,
            event_type: "downgraded",
            from_plan: "professional",
            to_plan: "free",
            change_reason: "Suscripción cancelada en Stripe",
            metadata: {
              stripe_subscription_id: subscription.id,
            },
          });
        }

        break;
      }

      // ============================================================
      // EVENTO: Pago exitoso
      // ============================================================
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Pago exitoso: ${invoice.id}`);
        // Aquí podrías enviar un email de confirmación o actualizar datos
        break;
      }

      // ============================================================
      // EVENTO: Pago fallido
      // ============================================================
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Webhook] Pago fallido: ${invoice.id}`);

        // Aquí podrías:
        // 1. Enviar email de notificación
        // 2. Actualizar estado a "past_due"
        // 3. Después de varios intentos fallidos, hacer downgrade

        break;
      }

      // ============================================================
      // Otros eventos
      // ============================================================
      default:
        console.log(`[Webhook] Evento no manejado: ${event.type}`);
    }

    // Responder OK a Stripe
    return new Response(
      JSON.stringify({ received: true, event: event.type }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[Webhook] Error general:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Error procesando webhook",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

/*
CONFIGURACIÓN DEL WEBHOOK EN STRIPE:

1. Ir a Stripe Dashboard > Developers > Webhooks
2. Crear nuevo endpoint con la URL de la Edge Function:
   https://ogqpsrsssrrytrqoyyph.supabase.co/functions/v1/stripe-webhook

3. Seleccionar los eventos a escuchar:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed

4. Copiar el "Signing secret" (empieza con whsec_...)

5. Configurar el secret en Supabase:
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

TESTING LOCAL:

1. Instalar Stripe CLI:
   brew install stripe/stripe-cli/stripe

2. Login en Stripe CLI:
   stripe login

3. Redirigir webhooks locales:
   stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook

4. Simular eventos:
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.deleted

DEPLOYMENT:

1. Deploy la función:
   supabase functions deploy stripe-webhook

2. Ver logs en tiempo real:
   supabase functions logs stripe-webhook --tail
*/
