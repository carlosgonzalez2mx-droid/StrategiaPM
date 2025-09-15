-- Script para crear la tabla purchase_orders completa desde cero
-- Basado en la experiencia con la tabla risks

-- Paso 1: Eliminar la tabla si existe (CUIDADO: esto borra todos los datos)
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Paso 2: Crear la tabla purchase_orders con todas las columnas necesarias
CREATE TABLE purchase_orders (
    id TEXT PRIMARY KEY,
    number TEXT,
    supplier TEXT,
    description TEXT,
    totalAmount DECIMAL(15,2),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    requestDate DATE,
    approvalDate DATE,
    expectedDate DATE,
    projectId TEXT,
    project_id TEXT,
    owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paso 3: Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner_id ON purchase_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at);

-- Paso 4: Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_purchase_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_orders_updated_at();

-- Paso 5: Habilitar Row Level Security (RLS)
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Paso 6: Crear políticas de seguridad
CREATE POLICY "Users can view their own purchase orders" ON purchase_orders
    FOR SELECT USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can insert their own purchase orders" ON purchase_orders
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update their own purchase orders" ON purchase_orders
    FOR UPDATE USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can delete their own purchase orders" ON purchase_orders
    FOR DELETE USING (auth.uid()::text = owner_id);

-- Paso 7: Verificar que la tabla se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND table_schema = 'public'
ORDER BY column_name;
