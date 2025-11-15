# Guía de Deployment - StrategiaPM

Esta guía explica cómo desplegar StrategiaPM en Vercel con todas las configuraciones necesarias.

## Pre-requisitos

Antes de desplegar, asegúrate de tener:

- ✅ Cuenta de Vercel (https://vercel.com)
- ✅ Cuenta de Supabase (https://supabase.com)
- ✅ Cuenta de Stripe (opcional, solo para suscripciones)
- ✅ Repositorio Git (GitHub, GitLab, o Bitbucket)

## Paso 1: Preparar Supabase

### 1.1 Crear proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Click en "New Project"
3. Completa:
   - **Name**: StrategiaPM Production (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura
   - **Region**: Elige la más cercana a tus usuarios
4. Click "Create new project" y espera 2-3 minutos

### 1.2 Obtener credenciales

1. Ve a Settings → API
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGci...` (clave larga)

### 1.3 Configurar base de datos

1. Ve a SQL Editor
2. Ejecuta los scripts de migración en orden:
   ```sql
   -- Ver /supabase/migrations/ en tu repositorio
   ```

### 1.4 Verificar RLS (Row Level Security)

1. Ve a Database → Tables
2. Para cada tabla, verifica que RLS esté habilitado
3. Revisa las políticas en la pestaña "Policies"

## Paso 2: Preparar Stripe (Opcional)

⚠️ **Solo si vas a usar suscripciones**

### 2.1 Crear producto

1. Ve a https://dashboard.stripe.com/products
2. Click "Add product"
3. Completa:
   - **Name**: StrategiaPM Professional
   - **Description**: Plan profesional con proyectos y usuarios ilimitados
   - **Pricing**: Recurring, Monthly, $39 USD
4. Click "Save product"
5. **Copia el Price ID** (empieza con `price_`)

### 2.2 Obtener claves de API

1. Ve a Developers → API keys
2. **IMPORTANTE**: Usa claves de TEST primero
3. Copia:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (guárdala en lugar seguro)

### 2.3 Configurar Webhook

1. Ve a Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://[tu-proyecto].supabase.co/functions/v1/stripe-webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. **Copia el Signing secret** (empieza con `whsec_`)

### 2.4 Configurar Edge Functions en Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref [tu-project-ref]

# Desplegar functions
cd supabase/functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook

# Configurar secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Paso 3: Deployment en Vercel

### Opción A: Deployment desde Vercel Dashboard (Recomendado)

#### 3.1 Conectar repositorio

1. Ve a https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Importa tu repositorio de Git
4. Selecciona el repositorio de StrategiaPM

#### 3.2 Configurar proyecto

1. **Framework Preset**: Vercel detectará automáticamente "Create React App"
2. **Root Directory**: `.` (raíz del proyecto)
3. **Build Command**: `npm run vercel-build` (ya configurado en package.json)
4. **Output Directory**: `build`

#### 3.3 Configurar variables de entorno

En la sección "Environment Variables", agrega:

**REQUERIDAS:**
```
REACT_APP_SUPABASE_URL = https://[tu-proyecto].supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGci... (tu anon key)
```

**OPCIONALES (solo si usas Stripe):**
```
REACT_APP_STRIPE_PRICE_ID = price_xxxxx
REACT_APP_STRIPE_PUBLISHABLE_KEY = pk_test_xxxxx
```

**IMPORTANTE**:
- Aplica a **Production**, **Preview**, y **Development**
- NO incluyas la Secret Key de Stripe aquí (va en Supabase)

#### 3.4 Desplegar

1. Click "Deploy"
2. Espera 2-3 minutos
3. Vercel te dará una URL: `https://strategiapm.vercel.app`

### Opción B: Deployment con Vercel CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Primer deploy (configuración interactiva)
vercel

# Durante la configuración:
# - Setup and deploy? Yes
# - Which scope? [Tu cuenta]
# - Link to existing project? No
# - Project name? strategiapm
# - Directory? ./
# - Override build settings? No

# Configurar variables de entorno
vercel env add REACT_APP_SUPABASE_URL
# Pega el valor: https://[tu-proyecto].supabase.co
# Para: Production, Preview, Development

vercel env add REACT_APP_SUPABASE_ANON_KEY
# Pega tu anon key
# Para: Production, Preview, Development

# (Opcional) Stripe
vercel env add REACT_APP_STRIPE_PRICE_ID
vercel env add REACT_APP_STRIPE_PUBLISHABLE_KEY

# Deploy a producción
vercel --prod
```

## Paso 4: Verificación Post-Deployment

### 4.1 Verificar que la app carga

1. Abre la URL de Vercel
2. Deberías ver la pantalla de login/registro
3. Verifica que no hay errores en la consola del navegador

### 4.2 Probar autenticación

1. Click en "Registrarse"
2. Crea una cuenta con email y contraseña
3. Verifica que recibes el email de confirmación de Supabase
4. Confirma el email y haz login

### 4.3 Verificar conexión a Supabase

1. Una vez logueado, crea un proyecto de prueba
2. Ve a Supabase Dashboard → Table Editor → `projects`
3. Deberías ver tu proyecto creado

### 4.4 Probar Stripe (si aplica)

1. Ve a Configuración → Suscripción
2. Click en "Actualizar a Professional"
3. Usa tarjeta de prueba: `4242 4242 4242 4242`
4. Verifica que la suscripción se crea en Stripe Dashboard

## Paso 5: Configuración de Dominio Personalizado (Opcional)

### 5.1 En Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Domains
3. Add domain: `app.tudominio.com`
4. Vercel te dará instrucciones para configurar DNS

### 5.2 En tu proveedor de DNS

Agrega un registro CNAME:
```
Tipo: CNAME
Nombre: app
Valor: cname.vercel-dns.com
```

### 5.3 Actualizar URLs en Stripe

Si usas dominio personalizado:
1. Stripe Webhook endpoint → Editar
2. Cambiar a: `https://app.tudominio.com/api/webhooks/stripe`

## Paso 6: Configuración de Producción

### 6.1 Cambiar a claves de producción de Stripe

Una vez que estés listo para producción:

1. En Stripe Dashboard, activa tu cuenta
2. Ve a Developers → API keys (modo LIVE)
3. Copia las claves de producción:
   - `pk_live_...`
   - `sk_live_...`
   - Webhook secret de producción

4. Actualiza en Vercel:
```bash
vercel env rm REACT_APP_STRIPE_PUBLISHABLE_KEY production
vercel env add REACT_APP_STRIPE_PUBLISHABLE_KEY production
# Pega pk_live_...
```

5. Actualiza en Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx_live
```

### 6.2 Configurar Supabase para producción

1. Supabase Dashboard → Settings → API
2. Deshabilita "Email confirmation" si quieres (solo para testing)
3. Configura Email Templates personalizados
4. Habilita Email rate limiting

## Troubleshooting

### Error: "Missing Supabase configuration"

**Causa**: Variables de entorno no configuradas en Vercel

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY` existen
3. Verifica que están aplicadas a "Production"
4. Redeploy: `vercel --prod`

### Error: RLS policy violation

**Causa**: Políticas RLS mal configuradas en Supabase

**Solución**:
1. Ve a Supabase → Database → Tables
2. Para la tabla con error, revisa "Policies"
3. Asegúrate de que hay políticas para SELECT, INSERT, UPDATE, DELETE
4. Ejemplo de política:
```sql
CREATE POLICY "Users can view their own organizations"
ON organizations FOR SELECT
USING (auth.uid() = owner_id);
```

### Stripe checkout no redirige

**Causa**: Edge Function no está desplegada o configurada

**Solución**:
1. Verifica que la function está desplegada:
```bash
supabase functions list
```
2. Prueba la function directamente:
```bash
curl -X POST https://[proyecto].supabase.co/functions/v1/create-checkout-session \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"test","priceId":"price_xxx"}'
```

### Builds fallan en Vercel

**Causa**: Errores de ESLint o TypeScript

**Solución**:
El proyecto ya está configurado para ignorar warnings:
```json
// package.json
"build": "CI=false ESLINT_NO_DEV_ERRORS=true react-scripts build"
```

Si sigue fallando, revisa los logs en Vercel Dashboard.

## Monitoreo y Mantenimiento

### Logs

- **Vercel**: Deployment logs en Dashboard → Deployments → [deployment] → Logs
- **Supabase**: Database logs en Dashboard → Logs
- **Stripe**: Events en Dashboard → Developers → Events

### Performance

- Usa Vercel Analytics (gratis)
- Configura Sentry para error tracking
- Monitorea uso de Supabase para evitar límites

### Backups

- **Supabase**: Backups automáticos diarios (plan Pro)
- **Código**: Git repository
- **Configuración**: Exporta variables de entorno regularmente

## Checklist de Deployment

Antes de lanzar a producción:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Supabase RLS policies configuradas
- [ ] Edge Functions desplegadas (si usas Stripe)
- [ ] Stripe webhooks configurados
- [ ] Dominio personalizado configurado
- [ ] Emails de Supabase personalizados
- [ ] Claves de producción de Stripe (no TEST)
- [ ] Analytics configurado
- [ ] Error tracking configurado
- [ ] Backups verificados
- [ ] Prueba end-to-end completa

## Recursos

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **React Docs**: https://react.dev

## Soporte

Si encuentras problemas durante el deployment:

1. Revisa esta guía de troubleshooting
2. Consulta los logs en Vercel/Supabase
3. Abre un issue en GitHub
4. Contacta soporte en soporte@strategiapm.com
