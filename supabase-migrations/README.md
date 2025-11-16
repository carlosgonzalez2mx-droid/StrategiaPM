# 📋 Migraciones de Base de Datos - Sistema de Suscripciones

## 🎯 Propósito

Este directorio contiene las migraciones SQL para implementar el sistema de suscripciones (planes Free y Professional) en StrategiaPM.

## ⚠️ IMPORTANTE - Seguridad de Datos Existentes

**Todas estas migraciones están diseñadas para ser 100% seguras:**
- ✅ NO modifican datos existentes
- ✅ NO eliminan información
- ✅ Solo AGREGAN nuevas columnas y funcionalidades
- ✅ Tu organización actual se marcará como "legacy" (sin límites)

## 📝 Migraciones Disponibles

### 001-add-subscription-fields.sql

**Descripción:** Agrega campos de suscripción a la tabla `organizations`

**Campos agregados:**
- `subscription_plan` - Tipo de plan (legacy, free, professional, enterprise)
- `subscription_status` - Estado (active, trialing, past_due, canceled, expired)
- `subscription_start_date` - Fecha de inicio
- `subscription_end_date` - Fecha de expiración (NULL = sin límite)
- `trial_ends_at` - Fecha fin de periodo de prueba
- `stripe_customer_id` - ID del cliente en Stripe
- `stripe_subscription_id` - ID de suscripción en Stripe
- `max_projects` - Límite de proyectos (NULL = ilimitado)
- `max_users` - Límite de usuarios (NULL = ilimitado)

**Características:**
- Crea índices para mejorar performance
- Agrega constraints de validación
- Crea tabla `subscription_history` para auditoría
- Crea función `check_organization_limits()` para validar límites
- Marca todas las organizaciones existentes como "legacy"

## 🚀 Cómo Ejecutar las Migraciones

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú lateral
3. Haz clic en **New query**
4. Copia y pega el contenido de `001-add-subscription-fields.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que se ejecutó correctamente (debe decir "Success")

### Opción 2: Desde CLI de Supabase

```bash
# Si tienes instalado Supabase CLI
supabase db push
```

## ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica que todo funciona correctamente:

```sql
-- Verificar que se agregaron las columnas
SELECT
  id,
  name,
  subscription_plan,
  subscription_status,
  max_projects,
  max_users,
  subscription_end_date
FROM organizations;

-- Verificar que tu organización está como 'legacy'
SELECT * FROM organizations WHERE subscription_plan = 'legacy';

-- Verificar que la función de límites funciona
SELECT check_organization_limits('TU_ORG_ID', 'projects');
```

**Resultado esperado:**
- Todas tus organizaciones actuales deben tener `subscription_plan = 'legacy'`
- Los campos `max_projects` y `max_users` deben ser NULL (ilimitado)
- El campo `subscription_end_date` debe ser NULL (sin expiración)

## 📊 Planes Definidos

### Plan Legacy (Tu organización actual)
- **Costo:** Gratis para siempre
- **Proyectos:** Ilimitados
- **Usuarios:** Ilimitados
- **Características:** Todas
- **Expiración:** Nunca
- **Visible para nuevos usuarios:** NO

### Plan Free (Para nuevos usuarios)
- **Costo:** $0/mes
- **Proyectos:** 1 proyecto
- **Usuarios:** 3 usuarios
- **Características:** Básicas
- **Trial:** 14 días

### Plan Professional (Para nuevos usuarios)
- **Costo:** $39/mes (por definir)
- **Proyectos:** Ilimitados
- **Usuarios:** Ilimitados
- **Características:** Todas
- **Trial:** 14 días

## 🔄 Rollback (En caso de problemas)

Si necesitas revertir los cambios (aunque es muy poco probable que sea necesario):

```sql
-- SOLO EJECUTAR EN CASO DE EMERGENCIA
-- Esto eliminará todas las columnas de suscripción

ALTER TABLE organizations DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE organizations DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE organizations DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE organizations DROP COLUMN IF EXISTS subscription_end_date;
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS max_projects;
ALTER TABLE organizations DROP COLUMN IF EXISTS max_users;

DROP TABLE IF EXISTS subscription_history;
DROP FUNCTION IF EXISTS check_organization_limits;
```

## 📞 Soporte

Si tienes algún problema con las migraciones:
1. Verifica los logs en Supabase Dashboard
2. Revisa que copiaste el script completo
3. Asegúrate de tener permisos de administrador
4. Contacta al desarrollador si persiste el problema

## 🎯 Próximos Pasos

Después de ejecutar esta migración:
1. ✅ Actualizar `SupabaseService.js` para mapear nuevos campos
2. ✅ Crear componente `SubscriptionBadge` para mostrar plan
3. ✅ Crear servicio `SubscriptionService` para validaciones
4. ✅ Implementar validaciones de límites en frontend
5. ✅ Crear página de Pricing
6. 🔜 Integrar Stripe para pagos (futuro)
