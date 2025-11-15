# Configuración de Stripe - StrategiaPM

Esta guía te ayudará a configurar Stripe para el sistema de suscripciones de StrategiaPM.

---

## Pre-requisitos

- [ ] Cuenta de Stripe creada (https://dashboard.stripe.com/register)
- [ ] Supabase configurado con Edge Functions
- [ ] Variables de Vercel configuradas (ver vercel-env-setup.md)

---

## FASE 1: Configuración en Stripe Dashboard

### Paso 1: Crear Cuenta de Stripe

1. Ve a https://dashboard.stripe.com/register
2. Completa el registro con:
   - Email
   - Nombre completo
   - País
   - Tipo de negocio
3. Verifica tu email

### Paso 2: Activar Modo de Prueba (Test Mode)

**IMPORTANTE**: Trabaja en **Test Mode** primero.

1. En Stripe Dashboard, verifica que diga **"Test mode"** arriba a la derecha
2. Si dice "Live mode", haz click y cambia a "Test mode"

### Paso 3: Crear Producto "StrategiaPM Professional"

1. Ve a **Products** (menú lateral)
2. Click en **+ Add product**

#### Información del Producto

```
Name: StrategiaPM Professional
Description: Plan profesional con proyectos y usuarios ilimitados. Incluye todas las características avanzadas de gestión de portafolio.
```

#### Pricing

```
Pricing model: Standard pricing
Price: $39.00 USD
Billing period: Monthly (Recurring)
```

#### Features (Opcional)

Agrega características como:
- Proyectos ilimitados
- Usuarios ilimitados
- Gestión de valor de negocio (PMBOK 7)
- Análisis CPM y EVM
- Soporte prioritario

3. Click **Save product**

#### Copiar Price ID

**MUY IMPORTANTE**:

1. Después de guardar, verás la página del producto
2. En la sección "Pricing", verás algo como:
   ```
   Monthly • $39.00
   price_1SPALq48wwYDYLlkLRP4SFG6
   ```
3. **Copia el Price ID** (empieza con `price_`)
4. Guárdalo en un lugar seguro

---

### Paso 4: Obtener API Keys

1. Ve a **Developers** → **API keys**
2. Verás dos secciones:

#### Publishable Key (Pública)

```
Publishable key
pk_test_51SPAKz48wwYDYLlkjX...
```

- Esta clave es **segura para el frontend**
- Click en "Reveal test key" si no es visible
- **Copia** esta clave

#### Secret Key (Secreta)

```
Secret key
sk_test_51SPAKz48wwYDYLlk...
```

- Esta clave **NUNCA** debe estar en el frontend
- Click en "Reveal test key"
- **Copia** esta clave
- ⚠️ Guárdala en lugar seguro (la necesitarás para Supabase)

---

### Paso 5: Configurar Webhook

Los webhooks permiten que Stripe notifique a tu app sobre eventos (suscripción creada, cancelada, etc.)

#### 5.1 Crear Endpoint

1. Ve a **Developers** → **Webhooks**
2. Click **+ Add endpoint**

#### 5.2 Configurar Endpoint

```
Endpoint URL: https://ogqpsrsssrrytrqoyyph.supabase.co/functions/v1/stripe-webhook
Description: StrategiaPM Subscription Events
```

**IMPORTANTE**: Reemplaza `ogqpsrsssrrytrqoyyph` con tu project ref de Supabase.

#### 5.3 Seleccionar Eventos

En "Select events to listen to", busca y selecciona:

- [x] `checkout.session.completed`
- [x] `customer.subscription.created`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`
- [x] `invoice.payment_succeeded`
- [x] `invoice.payment_failed`

Click **Add events**

#### 5.4 Crear Endpoint

Click **Add endpoint**

#### 5.5 Copiar Webhook Secret

Después de crear el endpoint:

1. Verás la página del webhook
2. En la sección "Signing secret", click **Reveal**
3. Copia el valor (empieza con `whsec_`)
4. Guárdalo en lugar seguro

---

## FASE 2: Configurar Supabase Edge Functions

### Paso 1: Verificar Edge Functions

Verifica que las Edge Functions estén desplegadas:

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref ogqpsrsssrrytrqoyyph

# Verificar functions desplegadas
supabase functions list
```

Deberías ver:
```
create-checkout-session
stripe-webhook
```

### Paso 2: Desplegar Edge Functions (si no están)

```bash
cd supabase/functions

# Deploy create-checkout-session
supabase functions deploy create-checkout-session

# Deploy stripe-webhook
supabase functions deploy stripe-webhook
```

### Paso 3: Configurar Secrets en Supabase

Agrega las claves de Stripe a Supabase:

```bash
# Secret Key de Stripe (sk_test_...)
supabase secrets set STRIPE_SECRET_KEY=sk_test_51SPAKz48wwYDYLlk...

# Publishable Key de Stripe (pk_test_...)
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_51SPAKz48wwYDYLlkjX...

# Webhook Secret (whsec_...)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Reemplaza con tus claves reales.

### Paso 4: Verificar Secrets

```bash
supabase secrets list
```

Deberías ver:
```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

---

## FASE 3: Configurar Variables en Vercel

### Agregar Variables de Stripe

En Vercel Dashboard o CLI:

#### Via Dashboard

1. Ve a Settings → Environment Variables
2. Agrega:

```
Key: REACT_APP_STRIPE_PRICE_ID
Value: price_1SPALq48wwYDYLlkLRP4SFG6
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Key: REACT_APP_STRIPE_PUBLISHABLE_KEY
Value: pk_test_51SPAKz48wwYDYLlkjX...
Environments: ✓ Production ✓ Preview ✓ Development
```

#### Via CLI

```bash
vercel env add REACT_APP_STRIPE_PRICE_ID production
# Pega: price_1SPALq48wwYDYLlkLRP4SFG6

vercel env add REACT_APP_STRIPE_PUBLISHABLE_KEY production
# Pega: pk_test_51SPAKz48wwYDYLlkjX...

# Repetir para preview y development
```

### Redeploy

```bash
vercel --prod
```

---

## FASE 4: Actualizar .env Local

Para desarrollo local, actualiza tu archivo `.env`:

```bash
# Stripe Configuration (TEST MODE)
REACT_APP_STRIPE_PRICE_ID=price_1SPALq48wwYDYLlkLRP4SFG6
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51SPAKz48wwYDYLlkjX...
```

---

## FASE 5: Pruebas

### Prueba 1: Verificar Edge Function

```bash
# Probar create-checkout-session
curl -X POST https://ogqpsrsssrrytrqoyyph.supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org-id",
    "organizationName": "Test Org",
    "userEmail": "test@example.com",
    "priceId": "price_1SPALq48wwYDYLlkLRP4SFG6",
    "plan": "professional"
  }'
```

Deberías recibir:
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### Prueba 2: Flujo Completo en la App

1. Abre tu app: https://tu-proyecto.vercel.app
2. Registra una cuenta o haz login
3. Intenta crear un segundo proyecto (debería bloquear por límite)
4. Ve a **Configuración** → **Suscripción**
5. Click en **Actualizar a Professional**
6. Deberías ser redirigido a Stripe Checkout

### Prueba 3: Checkout con Tarjeta de Prueba

En Stripe Checkout:

```
Card number: 4242 4242 4242 4242
Expiry: 12/34 (cualquier fecha futura)
CVC: 123
ZIP: 12345
Email: test@example.com
Name: Test User
```

### Prueba 4: Verificar Webhook

Después del pago exitoso:

1. Ve a Stripe Dashboard → Developers → Webhooks
2. Click en tu endpoint
3. Ve a "Events sent"
4. Deberías ver eventos:
   - `checkout.session.completed` ✓
   - `customer.subscription.created` ✓

### Prueba 5: Verificar en Supabase

1. Ve a Supabase Dashboard → Table Editor
2. Abre la tabla `organizations`
3. Busca tu organización
4. Verifica que:
   - `subscription_plan` = `professional`
   - `subscription_status` = `active`
   - `stripe_customer_id` tiene valor
   - `stripe_subscription_id` tiene valor

---

## Tarjetas de Prueba de Stripe

Para testing, usa estas tarjetas:

| Tarjeta | Número | Resultado |
|---------|--------|-----------|
| **Éxito** | 4242 4242 4242 4242 | Pago exitoso |
| **Requiere autenticación** | 4000 0025 0000 3155 | 3D Secure |
| **Pago declinado** | 4000 0000 0000 0002 | Tarjeta declinada |
| **Fondos insuficientes** | 4000 0000 0000 9995 | Fondos insuficientes |

Más tarjetas de prueba: https://stripe.com/docs/testing#cards

---

## Modo Producción (LIVE Mode)

⚠️ **SOLO cuando estés listo para producción**:

### 1. Activar Cuenta de Stripe

1. Stripe Dashboard → Settings → Account details
2. Completa toda la información requerida
3. Verifica tu identidad
4. Agrega cuenta bancaria

### 2. Cambiar a Live Mode

1. En Stripe Dashboard, cambia a **"Live mode"** (arriba a la derecha)

### 3. Crear Producto en Live Mode

Repite el Paso 3 de FASE 1, pero en Live mode:
- El Price ID será diferente (empezará con `price_live_`)

### 4. Obtener Live Keys

1. Developers → API keys (en Live mode)
2. Copia las claves de producción:
   - `pk_live_...`
   - `sk_live_...`

### 5. Configurar Webhook en Live Mode

Repite Paso 5 de FASE 1 en Live mode:
- El Webhook Secret será diferente (empezará con `whsec_...` pero será otro valor)

### 6. Actualizar Secrets en Supabase

```bash
# Actualizar con claves LIVE
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_..._live
```

### 7. Actualizar Variables en Vercel

Solo en **Production**:

```bash
vercel env rm REACT_APP_STRIPE_PRICE_ID production
vercel env add REACT_APP_STRIPE_PRICE_ID production
# Pega el price_live_... nuevo

vercel env rm REACT_APP_STRIPE_PUBLISHABLE_KEY production
vercel env add REACT_APP_STRIPE_PUBLISHABLE_KEY production
# Pega pk_live_...

vercel --prod
```

---

## Troubleshooting

### Error: "Stripe is not configured"

**Causa**: Variables de entorno faltantes.

**Solución**:
- Verifica que `REACT_APP_STRIPE_PRICE_ID` y `REACT_APP_STRIPE_PUBLISHABLE_KEY` están en Vercel
- Redeploy

### Error: "No such price"

**Causa**: Price ID incorrecto.

**Solución**:
- Verifica que el Price ID es correcto
- Verifica que estás en el mismo modo (Test/Live) que cuando creaste el precio

### Webhook no recibe eventos

**Causa**: URL incorrecta o eventos no seleccionados.

**Solución**:
1. Verifica la URL del webhook: `https://TU-PROJECT.supabase.co/functions/v1/stripe-webhook`
2. Verifica que los eventos están seleccionados
3. Prueba manualmente: Stripe Dashboard → Webhooks → Send test webhook

### Suscripción no se actualiza en Supabase

**Causa**: Webhook secret incorrecto o Edge Function no desplegada.

**Solución**:
1. Verifica que `STRIPE_WEBHOOK_SECRET` está configurado en Supabase
2. Redeploy Edge Function: `supabase functions deploy stripe-webhook`
3. Revisa logs: Stripe Dashboard → Webhooks → Events sent → Ver detalles

---

## Checklist de Stripe

- [ ] Cuenta de Stripe creada
- [ ] Producto "StrategiaPM Professional" creado en Test mode
- [ ] Price ID copiado
- [ ] Publishable Key copiada
- [ ] Secret Key copiada
- [ ] Webhook configurado
- [ ] Webhook Secret copiado
- [ ] Edge Functions desplegadas en Supabase
- [ ] Secrets configurados en Supabase (3 secrets)
- [ ] Variables configuradas en Vercel (2 variables)
- [ ] .env local actualizado
- [ ] Prueba de checkout exitosa con tarjeta 4242
- [ ] Webhook recibiendo eventos
- [ ] Suscripción actualizada en Supabase

---

## Recursos

- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Stripe Dashboard**: https://dashboard.stripe.com

---

## Próximo Paso

Una vez completado esto, continúa con: **Crear Pull Request** (ver pull-request-guide.md)
