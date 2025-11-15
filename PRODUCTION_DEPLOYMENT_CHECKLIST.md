# ✅ Checklist de Deployment a Producción - StrategiaPM

Esta guía te llevará paso a paso desde el merge del PR hasta tener tu aplicación funcionando en producción.

---

## 📋 Pre-Requisitos

Antes de comenzar, asegúrate de tener:

- [ ] PR mergeado a `main`
- [ ] Cuenta de Vercel activa
- [ ] Cuenta de Supabase activa (proyecto creado)
- [ ] (Opcional) Cuenta de Stripe activa

---

## FASE 1: Merge del Pull Request

### ✅ Paso 1.1: Crear el PR

Ver instrucciones en: `CREATE_PR_INSTRUCTIONS.md`

```bash
# URL directa para crear PR
https://github.com/carlosgonzalez2mx-droid/StrategiaPM/pull/new/claude/review-application-01PJXeDFUBVADBqr8QW3Y8de
```

### ✅ Paso 1.2: Revisar el PR

- [ ] Todos los archivos están incluidos (14 archivos)
- [ ] Descripción completa visible
- [ ] No hay conflictos
- [ ] Builds de CI/CD pasan (si están configurados)

### ✅ Paso 1.3: Merge

- [ ] Click en **"Merge pull request"**
- [ ] Tipo de merge: **"Create a merge commit"** (recomendado)
- [ ] Click en **"Confirm merge"**

### ✅ Paso 1.4: Pull Cambios Localmente

```bash
git checkout main
git pull origin main
```

---

## FASE 2: Configuración de Vercel

### ✅ Paso 2.1: Conectar Proyecto (Si no está conectado)

#### Opción A: Desde Vercel Dashboard

1. Ve a https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Importa tu repositorio: **carlosgonzalez2mx-droid/StrategiaPM**
4. Configuración:
   ```
   Framework Preset: Create React App
   Root Directory: ./
   Build Command: npm run vercel-build
   Output Directory: build
   ```

#### Opción B: Desde CLI

```bash
vercel link
# Sigue las instrucciones en pantalla
```

### ✅ Paso 2.2: Configurar Variables de Entorno

**CRÍTICO**: Sin estas variables, la app fallará.

#### En Vercel Dashboard:

1. Ve a tu proyecto → **Settings** → **Environment Variables**

2. Agrega **variables requeridas**:

```
Name: REACT_APP_SUPABASE_URL
Value: https://ogqpsrsssrrytrqoyyph.supabase.co
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Name: REACT_APP_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg
Environments: ✓ Production ✓ Preview ✓ Development
```

3. **(Opcional)** Agrega **variables de Stripe** si vas a usar suscripciones:

```
Name: REACT_APP_STRIPE_PRICE_ID
Value: [Tu Price ID de Stripe]
Environments: ✓ Production ✓ Preview ✓ Development
```

```
Name: REACT_APP_STRIPE_PUBLISHABLE_KEY
Value: [Tu Publishable Key de Stripe]
Environments: ✓ Production ✓ Preview ✓ Development
```

#### Verificar variables configuradas:

```bash
vercel env ls
```

Deberías ver al menos 2 variables (Supabase).

**Guía detallada**: Ver `vercel-env-setup.md`

### ✅ Paso 2.3: Primer Deployment

#### Opción A: Automático (Recomendado)

Vercel detecta automáticamente el push a `main` y deploya.

1. Ve a **Deployments** en Vercel Dashboard
2. Espera a que complete (2-3 minutos)
3. Verifica que el status sea **"Ready"**

#### Opción B: Manual

```bash
vercel --prod
```

### ✅ Paso 2.4: Verificar Build

1. En Vercel Dashboard → **Deployments**
2. Click en el deployment más reciente
3. Ve a **"Build Logs"**
4. Verifica que NO haya errores:
   - ❌ NO debe decir: "Missing Supabase configuration"
   - ✅ Debe decir: "Build completed"

**Si hay errores**, ver sección de Troubleshooting abajo.

---

## FASE 3: Verificación Post-Deployment

### ✅ Paso 3.1: Verificar que la App Carga

1. Abre la URL de producción (ej: `https://strategiapm.vercel.app`)
2. La app debe cargar sin errores
3. Abre DevTools (F12) → Console
4. NO debe haber errores de "Missing configuration"

### ✅ Paso 3.2: Probar Autenticación

#### Registro

1. Click en **"Registrarse"** o **"Conectar con la Nube"**
2. Ingresa email y contraseña
3. Deberías recibir email de confirmación de Supabase
4. Confirma el email

#### Login

1. Haz login con tus credenciales
2. Deberías entrar al dashboard

### ✅ Paso 3.3: Verificar Conexión a Supabase

1. Crea un proyecto de prueba
2. Ve a Supabase Dashboard → **Table Editor** → `projects`
3. Deberías ver tu proyecto creado

**Si no aparece**: Hay problema con RLS o conexión.

### ✅ Paso 3.4: Probar Funcionalidad Básica

- [ ] Crear proyecto
- [ ] Crear tarea
- [ ] Ver dashboard ejecutivo
- [ ] Navegar entre módulos (Cronograma, Financiero, Riesgos)

### ✅ Paso 3.5: Verificar Sincronización

1. Crea datos en la app
2. Cierra sesión
3. Haz login de nuevo
4. Los datos deben persistir (gracias a Supabase)

---

## FASE 4: Configuración de Stripe (Opcional)

**Solo si vas a usar suscripciones**

### ✅ Paso 4.1: Configurar Stripe

Sigue la guía completa en: `stripe-setup.md`

Resumen:
1. Crear producto en Stripe
2. Configurar webhook
3. Desplegar Edge Functions en Supabase
4. Configurar secrets en Supabase
5. Agregar variables en Vercel

### ✅ Paso 4.2: Probar Stripe

1. Ve a **Configuración** → **Suscripción**
2. Click **"Actualizar a Professional"**
3. Usa tarjeta de prueba: `4242 4242 4242 4242`
4. Verifica que suscripción se crea en Stripe Dashboard

---

## FASE 5: Dominio Personalizado (Opcional)

### ✅ Paso 5.1: Agregar Dominio

1. En Vercel → **Settings** → **Domains**
2. Click **"Add"**
3. Ingresa tu dominio: `app.tudominio.com`

### ✅ Paso 5.2: Configurar DNS

En tu proveedor de DNS (GoDaddy, Namecheap, etc.):

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: Automático
```

### ✅ Paso 5.3: Esperar Propagación

- DNS puede tardar 1-24 horas en propagarse
- Vercel muestra status en Domains

### ✅ Paso 5.4: Configurar SSL

Vercel configura SSL automáticamente (Let's Encrypt).

---

## FASE 6: Monitoreo y Mantenimiento

### ✅ Paso 6.1: Configurar Vercel Analytics (Gratis)

1. En Vercel → **Analytics**
2. Click **"Enable"**
3. Configura:
   - [ ] Web Vitals
   - [ ] Audience insights

### ✅ Paso 6.2: Configurar Alertas

1. En Vercel → **Settings** → **Notifications**
2. Habilita alertas para:
   - [ ] Deployment failed
   - [ ] Build failed
   - [ ] Performance issues

### ✅ Paso 6.3: Monitorear Logs

#### Vercel Logs:
```bash
vercel logs [deployment-url]
```

#### Supabase Logs:
- Dashboard → Logs → API / Database / Auth

#### Stripe Logs:
- Dashboard → Developers → Events

---

## Troubleshooting

### ❌ Error: "Missing Supabase configuration"

**Causa**: Variables de entorno no configuradas en Vercel.

**Solución**:
1. Verifica en Vercel → Settings → Environment Variables
2. Agrega `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY`
3. Redeploy: `vercel --prod`

### ❌ Build falla con ESLint errors

**Causa**: Código con warnings.

**Solución**:
El `package.json` ya tiene configuración para ignorar:
```json
"build": "CI=false ESLINT_NO_DEV_ERRORS=true ..."
```

Si sigue fallando, revisa logs para ver error específico.

### ❌ App carga pero no autentica

**Causa**: RLS policies no configuradas en Supabase.

**Solución**:
1. Ve a Supabase → Database → Tables
2. Para cada tabla, verifica que RLS esté habilitado
3. Agrega políticas necesarias

### ❌ Stripe checkout no funciona

**Causa**: Edge Functions no desplegadas o secrets incorrectos.

**Solución**:
1. Verifica Edge Functions: `supabase functions list`
2. Verifica secrets: `supabase secrets list`
3. Ver guía completa en `stripe-setup.md`

### ❌ Datos no persisten

**Causa**: Problema con Supabase o RLS.

**Solución**:
1. Abre DevTools → Network
2. Busca errores 403 (forbidden) o 401 (unauthorized)
3. Revisa políticas RLS en Supabase

---

## Checklist Final de Producción

### Pre-Deployment
- [ ] PR mergeado
- [ ] Tests pasan localmente
- [ ] Código revisado

### Vercel
- [ ] Proyecto conectado a Vercel
- [ ] Variables de entorno configuradas (mínimo 2)
- [ ] Build exitoso
- [ ] Deployment en "Ready"
- [ ] URL de producción funciona

### Supabase
- [ ] Proyecto creado
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS configuradas
- [ ] (Opcional) Edge Functions desplegadas

### Stripe (Opcional)
- [ ] Producto creado
- [ ] Webhook configurado
- [ ] Secrets configurados en Supabase
- [ ] Variables configuradas en Vercel
- [ ] Flujo de pago probado

### Testing
- [ ] App carga sin errores
- [ ] Autenticación funciona
- [ ] Crear proyecto funciona
- [ ] Datos persisten
- [ ] (Opcional) Suscripción funciona

### Monitoreo
- [ ] Analytics habilitado
- [ ] Alertas configuradas
- [ ] Logs monitoreados

### Opcional
- [ ] Dominio personalizado configurado
- [ ] SSL configurado
- [ ] Error tracking (Sentry) configurado

---

## Próximos Pasos

### Inmediato (Hoy)
1. ✅ Merge PR
2. ⚙️ Configurar variables en Vercel
3. 🚀 Deployment a producción
4. ✅ Verificar que funciona

### Corto Plazo (Esta Semana)
- [ ] Configurar Stripe (si aplica)
- [ ] Configurar dominio personalizado
- [ ] Configurar monitoreo avanzado
- [ ] Hacer backup de datos

### Mediano Plazo (Este Mes)
- [ ] Cambiar a claves LIVE de Stripe (si aplica)
- [ ] Configurar email personalizado (Supabase)
- [ ] Implementar error tracking (Sentry)
- [ ] Optimizar performance

---

## Recursos de Ayuda

### Documentación
- `README.md` - Guía general
- `DEPLOYMENT.md` - Deployment detallado
- `vercel-env-setup.md` - Variables de entorno
- `stripe-setup.md` - Configuración de Stripe

### Links
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Tu Repositorio**: https://github.com/carlosgonzalez2mx-droid/StrategiaPM

### Comandos Útiles

```bash
# Ver logs de deployment
vercel logs [deployment-url]

# Redeploy
vercel --prod

# Ver variables de entorno
vercel env ls

# Ver Edge Functions
supabase functions list

# Ver secrets de Supabase
supabase secrets list
```

---

## 🎉 ¡Felicidades!

Si completaste todos los pasos del checklist, tu aplicación **StrategiaPM** está ahora:

- ✅ Desplegada en producción
- ✅ Segura (claves en variables de entorno)
- ✅ Documentada
- ✅ Lista para usuarios reales

**¡Excelente trabajo!** 🚀

---

## Soporte

Si encuentras problemas:

1. Revisa las guías en este repositorio
2. Consulta los logs (Vercel/Supabase/Stripe)
3. Abre un issue en GitHub
4. Contacta soporte: soporte@strategiapm.com

**¿Preguntas?** Revisa el archivo `DEPLOYMENT.md` para más detalles.
