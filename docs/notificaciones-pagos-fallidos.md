# Guía: Notificaciones de Pagos Fallidos

## ¿Qué son los Pagos Fallidos?

Un pago falla cuando:
- 💳 La tarjeta expiró
- 🚫 Fondos insuficientes
- 🔒 El banco rechazó la transacción
- ❌ La tarjeta fue reportada como robada

## ¿Qué hace Stripe automáticamente?

Stripe tiene un sistema inteligente de reintentos:

### Cronología de Reintentos de Stripe:

1. **Día 0**: Primer intento fallido
   - ✉️ Stripe envía email automático al cliente
   - 🔄 Stripe reintenta inmediatamente

2. **Día 3**: Segundo intento
   - 🔄 Stripe reintenta automáticamente
   - ✉️ Stripe envía segundo email

3. **Día 5**: Tercer intento
   - 🔄 Stripe reintenta automáticamente
   - ✉️ Stripe envía tercer email

4. **Día 7**: Cuarto intento (último)
   - 🔄 Último reintento automático
   - ✉️ Stripe envía email final

5. **Día 8**: Si todos fallan
   - ❌ Stripe cancela la suscripción
   - 📧 Stripe envía email de cancelación
   - 🔔 Tu webhook recibe `customer.subscription.deleted`

## Estados de la Suscripción

| Estado | Significado | Acceso del Usuario |
|--------|-------------|-------------------|
| `active` | Todo bien, último pago exitoso | ✅ Acceso completo |
| `past_due` | Pago falló, esperando reintento | ⚠️ Acceso limitado (tú decides) |
| `unpaid` | Varios pagos fallidos | ❌ Modo solo lectura |
| `canceled` | Cancelada por falta de pago | ❌ Downgrade a Free |

## Lo que YA tienes implementado:

### ✅ Webhook básico
```typescript
case "invoice.payment_failed": {
  const invoice = event.data.object;
  console.log(`[Webhook] Pago fallido: ${invoice.id}`);
  // Solo logea, no notifica
}
```

## Lo que DEBERÍAS implementar:

### Opción 1: Emails Automáticos (Fácil - Usar Stripe)

**¿Sabías que Stripe YA envía emails automáticamente?**

Solo necesitas activarlo:

1. Ve a: https://dashboard.stripe.com/settings/billing/automatic
2. Activa:
   - ✅ "Invoices past due" (Facturas vencidas)
   - ✅ "Payment failed" (Pago fallido)
   - ✅ "Payment action required" (Se requiere acción)
3. Personaliza los emails con tu logo

**Ventaja**: Cero código, Stripe maneja todo.

**Desventaja**: Los emails vienen de Stripe, no de tu dominio.

---

### Opción 2: Notificaciones en tu App (Recomendado)

Crear un sistema de notificaciones dentro de tu aplicación:

#### Paso 1: Actualizar el Webhook

Modifica `supabase/functions/stripe-webhook/index.ts`:

```typescript
case "invoice.payment_failed": {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  console.log(`[Webhook] Pago fallido: ${invoice.id} para customer: ${customerId}`);

  // 1. Buscar la organización por stripe_customer_id
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (org) {
    // 2. Crear notificación en la base de datos
    await supabase.from("notifications").insert({
      organization_id: org.id,
      type: "payment_failed",
      severity: "high",
      title: "Pago rechazado",
      message: `Tu último pago de $${(invoice.amount_due / 100).toFixed(2)} fue rechazado. Por favor actualiza tu método de pago para evitar la interrupción del servicio.`,
      metadata: {
        invoice_id: invoice.id,
        amount: invoice.amount_due,
        attempt_count: invoice.attempt_count,
        next_payment_attempt: invoice.next_payment_attempt
      },
      action_url: "/subscription/update-payment",
      action_label: "Actualizar método de pago",
      read: false,
      created_at: new Date().toISOString()
    });

    // 3. Actualizar estado de la organización
    await supabase
      .from("organizations")
      .update({
        subscription_status: "past_due",
        payment_issue_count: org.payment_issue_count + 1,
        last_payment_attempt: new Date().toISOString()
      })
      .eq("id", org.id);
  }

  break;
}
```

#### Paso 2: Crear tabla de notificaciones

```sql
-- Ejecutar en Supabase SQL Editor
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'payment_failed', 'payment_succeeded', 'subscription_cancelled', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  action_url TEXT,
  action_label TEXT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas rápidas
CREATE INDEX idx_notifications_org_unread ON notifications(organization_id, read) WHERE read = FALSE;

-- Agregar campos a organizations
ALTER TABLE organizations
ADD COLUMN payment_issue_count INTEGER DEFAULT 0,
ADD COLUMN last_payment_attempt TIMESTAMP WITH TIME ZONE;
```

#### Paso 3: Componente de Notificaciones

Crea: `src/components/notifications/NotificationBell.js`

```javascript
import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/SupabaseService';

const NotificationBell = ({ organizationId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadNotifications();

    // Suscribirse a cambios en tiempo real
    const subscription = supabaseService.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [organizationId]);

  const loadNotifications = async () => {
    const { data, error } = await supabaseService.supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId) => {
    await supabaseService.supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    loadNotifications();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'payment_failed': return '💳';
      case 'payment_succeeded': return '✅';
      case 'subscription_cancelled': return '❌';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Botón de campana */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notif.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">{getIcon(notif.type)}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-900">
                        {notif.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notif.message}
                      </p>
                      {notif.action_url && (
                        <a
                          href={notif.action_url}
                          className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {notif.action_label || 'Ver más'} →
                        </a>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t text-center">
            <button
              onClick={loadNotifications}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Marcar todas como leídas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

#### Paso 4: Agregar el componente al Header

En tu componente de navegación principal:

```javascript
import NotificationBell from './notifications/NotificationBell';

// Dentro del header:
<NotificationBell organizationId={currentOrganizationId} />
```

---

### Opción 3: Emails desde tu App (Avanzado)

Si quieres enviar emails desde tu propio dominio:

#### Usar Resend (Recomendado - Gratis hasta 3000 emails/mes)

```typescript
// En el webhook, después de crear la notificación:
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

await resend.emails.send({
  from: 'StrategiaPM <noreply@strategiapm.com>',
  to: [org.owner_email],
  subject: '⚠️ Problema con tu pago - StrategiaPM',
  html: `
    <h2>Hola ${org.name},</h2>
    <p>Tuvimos un problema al procesar tu pago de <strong>$${(invoice.amount_due / 100).toFixed(2)}</strong>.</p>
    <p>No te preocupes, Stripe reintentará automáticamente en los próximos días.</p>
    <p>Si el problema persiste, por favor actualiza tu método de pago:</p>
    <a href="https://app.strategiapm.com/subscription/manage">Actualizar método de pago</a>
    <hr />
    <p><small>Intento ${invoice.attempt_count} de 4</small></p>
  `
});
```

---

## Mejores Prácticas

### 1. Gracia Period (Periodo de Gracia)
No canceles inmediatamente el acceso:

```javascript
if (subscription.status === 'past_due') {
  // Permitir acceso de solo lectura
  return { allowed: true, readOnly: true };
}
```

### 2. Banner de Advertencia

Mostrar un banner en toda la app cuando hay problema de pago:

```javascript
{subscription.status === 'past_due' && (
  <div className="bg-red-50 border-l-4 border-red-500 p-4">
    <div className="flex items-center">
      <span className="text-2xl mr-3">⚠️</span>
      <div>
        <h3 className="font-bold text-red-900">Problema con tu pago</h3>
        <p className="text-red-700">
          Tuvimos un problema al procesar tu último pago.
          <a href="/subscription/manage" className="underline ml-2">
            Actualizar método de pago
          </a>
        </p>
      </div>
    </div>
  </div>
)}
```

### 3. Historial de Intentos

Guardar todos los intentos de pago:

```sql
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  invoice_id TEXT,
  amount INTEGER,
  status TEXT, -- 'succeeded', 'failed', 'pending'
  error_code TEXT,
  error_message TEXT,
  attempt_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Resumen de Estrategia Recomendada

1. ✅ **Activar emails automáticos de Stripe** (5 minutos)
2. ✅ **Crear tabla de notificaciones** (10 minutos)
3. ✅ **Actualizar webhook para crear notificaciones** (15 minutos)
4. ✅ **Agregar NotificationBell component** (20 minutos)
5. ✅ **Agregar banner de advertencia** (10 minutos)

Total: ~1 hora de implementación para un sistema completo de notificaciones.

## Testing

Para probar pagos fallidos en Stripe Test Mode:

```
Tarjeta que siempre falla:
Número: 4000 0000 0000 0341
Fecha: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

Stripe enviará el webhook `invoice.payment_failed` inmediatamente.
