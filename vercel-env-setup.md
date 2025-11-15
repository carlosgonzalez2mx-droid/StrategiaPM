# Configuración de Variables de Entorno en Vercel

## Método 1: Vercel Dashboard (Recomendado)

### Paso 1: Acceder a Configuración

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto **StrategiaPM**
3. Click en **Settings** (arriba)
4. En el menú lateral, click en **Environment Variables**

### Paso 2: Agregar Variables

Agrega las siguientes variables una por una:

#### Variable 1: REACT_APP_SUPABASE_URL

```
Key: REACT_APP_SUPABASE_URL
Value: https://ogqpsrsssrrytrqoyyph.supabase.co
Environments: ✓ Production ✓ Preview ✓ Development
```

Click **Save**

#### Variable 2: REACT_APP_SUPABASE_ANON_KEY

```
Key: REACT_APP_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg
Environments: ✓ Production ✓ Preview ✓ Development
```

Click **Save**

#### Variable 3: REACT_APP_BASE_URL (Opcional)

```
Key: REACT_APP_BASE_URL
Value: https://tu-proyecto.vercel.app
Environments: ✓ Production
```

Para Preview y Development, usa valores diferentes si es necesario.

Click **Save**

### Paso 3: Redeploy

**IMPORTANTE**: Las variables de entorno solo se aplican en nuevos deployments.

1. Ve a **Deployments**
2. Click en el deployment más reciente
3. Click en los **⋯** (tres puntos)
4. Selecciona **Redeploy**
5. Confirma con **Redeploy**

---

## Método 2: Vercel CLI

Si prefieres usar la terminal:

### Instalación de Vercel CLI

```bash
npm install -g vercel
```

### Login

```bash
vercel login
```

### Agregar Variables

```bash
# Supabase URL
vercel env add REACT_APP_SUPABASE_URL production
# Cuando pregunte, pega: https://ogqpsrsssrrytrqoyyph.supabase.co

vercel env add REACT_APP_SUPABASE_URL preview
# Pega el mismo valor

vercel env add REACT_APP_SUPABASE_URL development
# Pega el mismo valor

# Supabase Anon Key
vercel env add REACT_APP_SUPABASE_ANON_KEY production
# Pega: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg

vercel env add REACT_APP_SUPABASE_ANON_KEY preview
# Mismo valor

vercel env add REACT_APP_SUPABASE_ANON_KEY development
# Mismo valor
```

### Verificar Variables

```bash
vercel env ls
```

Deberías ver:

```
Environment Variables
┌──────────────────────────────────┬──────────────┬─────────────┬─────────┬───────────┐
│ Name                             │ Value        │ Environments│ Created │ Updated   │
├──────────────────────────────────┼──────────────┼─────────────┼─────────┼───────────┤
│ REACT_APP_SUPABASE_URL          │ https://...  │ prod,prev.. │ ...     │ ...       │
│ REACT_APP_SUPABASE_ANON_KEY     │ eyJhbGc...   │ prod,prev.. │ ...     │ ...       │
└──────────────────────────────────┴──────────────┴─────────────┴─────────┴───────────┘
```

### Redeploy

```bash
vercel --prod
```

---

## Verificación

### 1. Verificar que las variables están configuradas

En Vercel Dashboard:
- Settings → Environment Variables
- Deberías ver 2 variables (Supabase URL y Key)

### 2. Verificar en el build log

Después del redeploy:
1. Ve a Deployments
2. Click en el deployment más reciente
3. Ve a **Build Logs**
4. Busca mensajes como:
   ```
   Creating an optimized production build...
   ```

   **NO deberías ver:**
   ```
   ❌ Missing Supabase configuration
   ```

### 3. Verificar en runtime

1. Abre tu app en producción: https://tu-proyecto.vercel.app
2. Abre DevTools (F12)
3. Ve a Console
4. **NO deberías ver** errores de configuración de Supabase

### 4. Probar autenticación

1. En tu app, haz click en "Registrarse" o "Conectar con la Nube"
2. Si funciona correctamente, las variables están bien configuradas

---

## Troubleshooting

### Error: "Missing Supabase configuration"

**Causa**: Variables no configuradas o mal configuradas.

**Solución**:
1. Verifica que las variables estén en **Production**
2. Verifica que los nombres sean **exactamente** `REACT_APP_SUPABASE_URL` y `REACT_APP_SUPABASE_ANON_KEY`
3. Redeploy después de configurarlas

### Variables no se aplican

**Causa**: No se hizo redeploy después de agregar variables.

**Solución**:
Siempre redeploy después de modificar variables de entorno.

### Build falla

**Causa**: Typo en el nombre de la variable.

**Solución**:
Los nombres de variables deben empezar con `REACT_APP_` para Create React App.

---

## Checklist

- [ ] Variables agregadas en Vercel Dashboard
- [ ] REACT_APP_SUPABASE_URL configurada para Production, Preview, Development
- [ ] REACT_APP_SUPABASE_ANON_KEY configurada para Production, Preview, Development
- [ ] Redeploy ejecutado
- [ ] Build exitoso (sin errores en logs)
- [ ] App abre correctamente en producción
- [ ] Autenticación funciona

---

## Próximo Paso

Una vez completado esto, continúa con: **Configurar Stripe** (ver stripe-setup.md)
