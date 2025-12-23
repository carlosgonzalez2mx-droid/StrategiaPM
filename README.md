# StrategiaPM

Aplicación web de gestión de portafolio de proyectos empresariales con metodología PMBOK 7ª edición.

## Características Principales

- **Gestión de Cronogramas**: Gantt interactivo, dependencias, hitos, análisis CPM
- **Gestión Financiera**: EVM (Earned Value Management), órdenes de compra, flujo de caja
- **Gestión de Riesgos**: Matriz de riesgos, análisis de sensibilidad
- **Gestión de Recursos**: Asignación, utilización, conflictos
- **Gestión de Cambios**: Workflow CCB completo con análisis de impacto
- **Reportes**: Dashboard ejecutivo, exportación PDF/Excel
- **Sistema de Suscripciones**: Planes Free y Professional con Stripe
- **Autenticación**: Supabase Auth con roles granulares (Owner, Admin, Member)

> **Nota:** Algunas funcionalidades están temporalmente deshabilitadas. Ver [DISABLED_FEATURES.md](./DISABLED_FEATURES.md) para detalles.

## Stack Tecnológico

- **Frontend**: React 19, Tailwind CSS, Chart.js, Recharts
- **Backend**: Supabase (PostgreSQL + Auth)
- **Pagos**: Stripe
- **Hosting**: Vercel

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/StrategiaPM.git
cd StrategiaPM
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus claves:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```bash
# Supabase
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Stripe (opcional para suscripciones)
REACT_APP_STRIPE_PRICE_ID=price_xxxxx
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

**Dónde obtener las claves:**
- **Supabase**: https://supabase.com/dashboard/project/_/settings/api
- **Stripe**: https://dashboard.stripe.com/test/apikeys

### 4. Ejecutar en desarrollo

```bash
npm start
```

La aplicación se abrirá en http://localhost:3000

## Deployment en Vercel

### Deployment Automático

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel Dashboard:
   - Settings → Environment Variables
   - Agrega todas las variables de `.env.example`

### Variables de Entorno Requeridas

```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_STRIPE_PRICE_ID (opcional)
REACT_APP_STRIPE_PUBLISHABLE_KEY (opcional)
```

### Deployment Manual con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

## Configuración de Supabase

### 1. Crear proyecto en Supabase

1. Ve a https://supabase.com y crea un nuevo proyecto
2. Espera a que se inicialice (2-3 minutos)

### 2. Configurar base de datos

Ejecuta las migraciones SQL en el SQL Editor de Supabase:

```sql
-- Crear tablas principales
-- (Ver carpeta /supabase/migrations/)
```

### 3. Configurar Row Level Security (RLS)

Las políticas RLS protegen tus datos:

- Los usuarios solo pueden ver/editar sus propias organizaciones
- Los miembros tienen permisos según su rol
- Super-admins tienen acceso completo

### 4. Configurar Edge Functions (para Stripe)

Si usas suscripciones:

```bash
# Instalar Supabase CLI
npm i -g supabase

# Login
supabase login

# Desplegar functions
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook

# Configurar secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Configuración de Stripe (Opcional)

### 1. Crear cuenta en Stripe

https://dashboard.stripe.com/register

### 2. Crear producto y precio

1. Products → Create product
2. Nombre: "StrategiaPM Professional"
3. Precio: $39 USD/mes (recurrente)
4. Copia el **Price ID** (empieza con `price_`)

### 3. Configurar webhook

1. Developers → Webhooks → Add endpoint
2. URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copia el **Webhook Secret** (empieza con `whsec_`)

## Estructura del Proyecto

```
StrategiaPM/
├── src/
│   ├── components/         # Componentes React
│   │   ├── admin/          # Panel super-admin
│   │   ├── subscription/   # Sistema de suscripciones
│   │   └── ...
│   ├── contexts/           # Context API (state management)
│   ├── services/           # Servicios (Supabase, Stripe, AI)
│   ├── hooks/              # Hooks personalizados
│   ├── utils/              # Utilidades y helpers
│   └── constants/          # Constantes y configuraciones
├── public/                 # Assets estáticos
├── supabase/               # Configuración Supabase
│   ├── functions/          # Edge Functions
│   └── migrations/         # Migraciones SQL
├── .env.example            # Ejemplo de variables de entorno
└── vercel.json             # Configuración de Vercel
```

## Scripts Disponibles

```bash
# Desarrollo
npm start                   # Inicia servidor de desarrollo

# Build
npm run build               # Build para producción
npm run vercel-build        # Build optimizado para Vercel

# Testing
npm test                    # Ejecuta tests
npm run test:coverage       # Tests con cobertura

# Análisis
npm run build:analyze       # Analiza tamaño del bundle
```

## Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **OWNER** | Control total de la organización |
| **ADMIN** | Gestión de proyectos y miembros |
| **MEMBER_WRITE** | Crear y editar proyectos |
| **MEMBER_READ** | Solo lectura |

## Planes de Suscripción

| Plan | Proyectos | Usuarios | Precio |
|------|-----------|----------|--------|
| **Free** | 1 | 3 | Gratis |
| **Professional** | Ilimitado | Ilimitado | $39 USD/mes |
| **Legacy** | Ilimitado | Ilimitado | Gratis (solo usuarios existentes) |

## Seguridad

### Variables de Entorno

- **NUNCA** incluyas el archivo `.env` en Git
- Las claves están protegidas por `.gitignore`
- Usa diferentes claves para desarrollo y producción

### Supabase

- Todas las tablas tienen Row Level Security (RLS) habilitado
- La `ANON_KEY` es segura para el frontend
- La `SERVICE_ROLE_KEY` nunca debe exponerse en el cliente

### Stripe

- Usa claves de **TEST** en desarrollo (`pk_test_`, `sk_test_`)
- Usa claves de **LIVE** en producción (`pk_live_`, `sk_live_`)
- La `Publishable Key` es segura para el frontend
- La `Secret Key` solo debe estar en Supabase Secrets

## Troubleshooting

### Error: "Missing Supabase configuration"

**Solución**: Verifica que el archivo `.env` existe y contiene las claves correctas.

```bash
# Verificar que existe
ls -la .env

# Verificar contenido
cat .env
```

### Error de autenticación en Supabase

**Solución**: Verifica las políticas RLS en Supabase Dashboard.

### Stripe checkout no funciona

**Solución**:
1. Verifica que las Edge Functions están desplegadas
2. Verifica los secrets en Supabase
3. Revisa los logs en Stripe Dashboard

## Soporte

- **Issues**: https://github.com/tu-usuario/StrategiaPM/issues
- **Email**: soporte@strategiapm.com

## Licencia

Propietaria - Todos los derechos reservados

## Créditos

Desarrollado con ❤️ por el equipo de StrategiaPM
