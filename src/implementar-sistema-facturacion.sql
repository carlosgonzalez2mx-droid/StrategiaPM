-- Script para implementar sistema de facturación en StrategiaPM
-- Permite múltiples organizaciones con diferentes planes de suscripción

-- ===== 1. AGREGAR CAMPOS DE FACTURACIÓN A ORGANIZATIONS =====
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 3;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 1;

-- ===== 2. CREAR TABLA DE PLANES DE SUSCRIPCIÓN =====
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL,
  max_users INTEGER NOT NULL,
  max_projects INTEGER NOT NULL,
  storage_limit_gb INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 3. INSERTAR PLANES PREDEFINIDOS =====
INSERT INTO subscription_plans (name, description, monthly_price, max_users, max_projects, storage_limit_gb, features) VALUES
('free', 'Plan Gratuito', 0, 3, 5, 1, '{"support": "email", "api_access": false, "custom_branding": false}'),
('basic', 'Plan Básico', 29, 5, 10, 5, '{"support": "email", "api_access": false, "custom_branding": false}'),
('professional', 'Plan Profesional', 79, 25, -1, 25, '{"support": "priority", "api_access": true, "custom_branding": false}'),
('enterprise', 'Plan Empresarial', 199, -1, -1, -1, '{"support": "24/7", "api_access": true, "custom_branding": true}'),
('owner', 'Plan Propietario', 0, -1, -1, -1, '{"support": "unlimited", "api_access": true, "custom_branding": true, "unlimited_organizations": true}')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  max_users = EXCLUDED.max_users,
  max_projects = EXCLUDED.max_projects,
  storage_limit_gb = EXCLUDED.storage_limit_gb,
  features = EXCLUDED.features,
  updated_at = NOW();

-- ===== 4. CREAR TABLA DE FACTURACIÓN =====
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'cancelled'
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 5. CREAR TABLA DE USO =====
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'users', 'projects', 'storage_gb'
  metric_value INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, metric_name, DATE(recorded_at))
);

-- ===== 6. CREAR FUNCIÓN PARA VERIFICAR LÍMITES =====
CREATE OR REPLACE FUNCTION check_plan_limits(
  org_id UUID,
  resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  org_plan TEXT;
  current_usage INTEGER;
  plan_limit INTEGER;
BEGIN
  -- Obtener plan de la organización
  SELECT subscription_plan INTO org_plan
  FROM organizations
  WHERE id = org_id;
  
  -- Obtener límite del plan
  CASE resource_type
    WHEN 'users' THEN
      SELECT max_users INTO plan_limit
      FROM subscription_plans
      WHERE name = org_plan;
    WHEN 'projects' THEN
      SELECT max_projects INTO plan_limit
      FROM subscription_plans
      WHERE name = org_plan;
    WHEN 'storage' THEN
      SELECT storage_limit_gb INTO plan_limit
      FROM subscription_plans
      WHERE name = org_plan;
    ELSE
      RETURN false;
  END CASE;
  
  -- -1 significa ilimitado
  -- Plan "owner" tiene acceso total sin restricciones
  IF plan_limit = -1 OR org_plan = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Obtener uso actual
  CASE resource_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO current_usage
      FROM organization_members
      WHERE organization_id = org_id;
    WHEN 'projects' THEN
      SELECT COUNT(*) INTO current_usage
      FROM projects
      WHERE organization_id = org_id;
    WHEN 'storage' THEN
      -- Aquí podrías calcular el almacenamiento real
      SELECT 0 INTO current_usage;
    ELSE
      RETURN false;
  END CASE;
  
  -- Verificar si está dentro del límite
  RETURN current_usage < plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 7. CREAR FUNCIÓN PARA ACTUALIZAR USO =====
CREATE OR REPLACE FUNCTION update_usage_tracking(
  org_id UUID,
  metric_name TEXT,
  metric_value INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (organization_id, metric_name, metric_value)
  VALUES (org_id, metric_name, metric_value)
  ON CONFLICT (organization_id, metric_name, DATE(recorded_at))
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 8. CREAR TRIGGER PARA ACTUALIZAR USO AUTOMÁTICAMENTE =====
CREATE OR REPLACE FUNCTION trigger_update_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_usage_tracking(NEW.organization_id, 'users', 
      (SELECT COUNT(*) FROM organization_members WHERE organization_id = NEW.organization_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_usage_tracking(OLD.organization_id, 'users', 
      (SELECT COUNT(*) FROM organization_members WHERE organization_id = OLD.organization_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_count_trigger
  AFTER INSERT OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_user_count();

-- ===== 9. CREAR TRIGGER PARA ACTUALIZAR CONTEO DE PROYECTOS =====
CREATE OR REPLACE FUNCTION trigger_update_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM update_usage_tracking(NEW.organization_id, 'projects', 
      (SELECT COUNT(*) FROM projects WHERE organization_id = NEW.organization_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_usage_tracking(OLD.organization_id, 'projects', 
      (SELECT COUNT(*) FROM projects WHERE organization_id = OLD.organization_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_count_trigger
  AFTER INSERT OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_project_count();

-- ===== 10. CREAR POLÍTICAS RLS PARA NUEVAS TABLAS =====

-- Políticas para subscription_plans (lectura pública)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Políticas para billing_invoices
CREATE POLICY "Organization members can view invoices" ON billing_invoices
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()::text
        )
    );

-- Políticas para usage_tracking
CREATE POLICY "Organization admins can view usage" ON usage_tracking
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()::text 
            AND role IN ('owner', 'admin')
        )
    );

-- ===== 11. CREAR ÍNDICES PARA OPTIMIZACIÓN =====
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_plan ON organizations(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_organization_id ON billing_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_organization_id ON usage_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric_name ON usage_tracking(metric_name);

-- ===== 12. CREAR VISTA PARA DASHBOARD DE FACTURACIÓN =====
CREATE OR REPLACE VIEW billing_dashboard AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_plan,
  o.subscription_status,
  o.monthly_price,
  o.max_users,
  o.max_projects,
  o.storage_limit_gb,
  sp.features,
  COUNT(om.id) as current_users,
  COUNT(p.id) as current_projects,
  CASE 
    WHEN o.max_users = -1 THEN 'Ilimitado'
    ELSE o.max_users::text
  END as users_limit_display,
  CASE 
    WHEN o.max_projects = -1 THEN 'Ilimitado'
    ELSE o.max_projects::text
  END as projects_limit_display,
  CASE 
    WHEN o.storage_limit_gb = -1 THEN 'Ilimitado'
    ELSE o.storage_limit_gb::text || ' GB'
  END as storage_limit_display
FROM organizations o
LEFT JOIN subscription_plans sp ON o.subscription_plan = sp.name
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN projects p ON o.id = p.organization_id
GROUP BY o.id, o.name, o.subscription_plan, o.subscription_status, 
         o.monthly_price, o.max_users, o.max_projects, o.storage_limit_gb, sp.features;

-- ===== 13. CREAR FUNCIÓN PARA CAMBIAR PLAN =====
CREATE OR REPLACE FUNCTION change_subscription_plan(
  org_id UUID,
  new_plan TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  plan_exists BOOLEAN;
  plan_details RECORD;
BEGIN
  -- Verificar que el plan existe
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE name = new_plan AND is_active = true) INTO plan_exists;
  
  IF NOT plan_exists THEN
    RAISE EXCEPTION 'Plan % no existe o no está activo', new_plan;
  END IF;
  
  -- Obtener detalles del plan
  SELECT * INTO plan_details FROM subscription_plans WHERE name = new_plan;
  
  -- Actualizar organización
  UPDATE organizations SET
    subscription_plan = new_plan,
    monthly_price = plan_details.monthly_price,
    max_users = plan_details.max_users,
    max_projects = plan_details.max_projects,
    storage_limit_gb = plan_details.storage_limit_gb,
    updated_at = NOW()
  WHERE id = org_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 14. CREAR FUNCIÓN PARA VERIFICAR ESTADO DE SUSCRIPCIÓN =====
CREATE OR REPLACE FUNCTION check_subscription_status(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  org_status TEXT;
  org_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT subscription_status, subscription_end_date
  INTO org_status, org_end_date
  FROM organizations
  WHERE id = org_id;
  
  -- Si la suscripción ha expirado
  IF org_end_date IS NOT NULL AND org_end_date < NOW() THEN
    UPDATE organizations SET subscription_status = 'expired' WHERE id = org_id;
    RETURN 'expired';
  END IF;
  
  RETURN org_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 15. CREAR TRIGGER PARA VERIFICAR LÍMITES AL INSERTAR =====
CREATE OR REPLACE FUNCTION check_limits_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  resource_type TEXT;
BEGIN
  -- Determinar el tipo de recurso y organización
  IF TG_TABLE_NAME = 'organization_members' THEN
    org_id := NEW.organization_id;
    resource_type := 'users';
  ELSIF TG_TABLE_NAME = 'projects' THEN
    org_id := NEW.organization_id;
    resource_type := 'projects';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Verificar límites
  IF NOT check_plan_limits(org_id, resource_type) THEN
    RAISE EXCEPTION 'Límite del plan excedido para % en organización %', resource_type, org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a organization_members
CREATE TRIGGER check_user_limits_trigger
  BEFORE INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION check_limits_before_insert();

-- Aplicar trigger a projects
CREATE TRIGGER check_project_limits_trigger
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION check_limits_before_insert();

-- ===== 16. COMENTARIOS Y DOCUMENTACIÓN =====
COMMENT ON TABLE subscription_plans IS 'Planes de suscripción disponibles para las organizaciones';
COMMENT ON TABLE billing_invoices IS 'Facturas generadas para cada organización';
COMMENT ON TABLE usage_tracking IS 'Seguimiento del uso de recursos por organización';
COMMENT ON FUNCTION check_plan_limits IS 'Verifica si una organización puede agregar más recursos según su plan';
COMMENT ON FUNCTION update_usage_tracking IS 'Actualiza el seguimiento de uso de una organización';
COMMENT ON FUNCTION change_subscription_plan IS 'Cambia el plan de suscripción de una organización';
COMMENT ON FUNCTION check_subscription_status IS 'Verifica el estado actual de la suscripción de una organización';

-- ===== 17. DATOS DE EJEMPLO =====
-- Actualizar organizaciones existentes para que tengan el plan 'free'
UPDATE organizations SET 
  subscription_plan = 'free',
  monthly_price = 0,
  max_users = 3,
  max_projects = 5,
  storage_limit_gb = 1
WHERE subscription_plan IS NULL;

-- ===== 18. FUNCIÓN PARA ASIGNAR PLAN OWNER =====
-- Función para asignar automáticamente el plan "owner" a la organización del creador
CREATE OR REPLACE FUNCTION assign_owner_plan(owner_email TEXT)
RETURNS VOID AS $$
DECLARE
  owner_org_id UUID;
BEGIN
  -- Buscar la organización del propietario por email
  SELECT o.id INTO owner_org_id
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_email = owner_email
  AND om.role = 'owner'
  LIMIT 1;
  
  -- Si se encuentra la organización, asignar plan owner
  IF owner_org_id IS NOT NULL THEN
    UPDATE organizations SET
      subscription_plan = 'owner',
      monthly_price = 0,
      max_users = -1,
      max_projects = -1,
      storage_limit_gb = -1,
      subscription_status = 'active',
      updated_at = NOW()
    WHERE id = owner_org_id;
    
    RAISE NOTICE 'Plan "owner" asignado a organización % para email %', owner_org_id, owner_email;
  ELSE
    RAISE NOTICE 'No se encontró organización para el email %', owner_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 19. CREAR FUNCIÓN PARA VERIFICAR SI ES OWNER =====
CREATE OR REPLACE FUNCTION is_software_owner(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
BEGIN
  -- Obtener el plan de la organización del usuario
  SELECT o.subscription_plan INTO user_plan
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_email = user_email
  LIMIT 1;
  
  -- Retornar true si es plan owner
  RETURN user_plan = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 20. MENSAJE FINAL =====
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de facturación implementado exitosamente!';
  RAISE NOTICE '📊 Planes disponibles: free, basic, professional, enterprise, owner';
  RAISE NOTICE '🔒 Límites automáticos configurados';
  RAISE NOTICE '📈 Seguimiento de uso habilitado';
  RAISE NOTICE '💳 Listo para integrar con Stripe';
  RAISE NOTICE '';
  RAISE NOTICE '👑 IMPORTANTE: Para asignar plan "owner" a tu organización:';
  RAISE NOTICE '   SELECT assign_owner_plan(''TU_EMAIL@ejemplo.com'');';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Para verificar si eres owner:';
  RAISE NOTICE '   SELECT is_software_owner(''TU_EMAIL@ejemplo.com'');';
END $$;
