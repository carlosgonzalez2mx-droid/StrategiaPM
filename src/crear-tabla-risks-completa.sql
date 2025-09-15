-- Script para crear la tabla risks completa en Supabase
-- Copia y pega este script en el SQL Editor de Supabase

-- Primero, eliminar la tabla si existe (CUIDADO: esto borrará todos los datos)
-- DROP TABLE IF EXISTS risks;

-- Crear la tabla risks con todas las columnas necesarias
CREATE TABLE IF NOT EXISTS risks (
    -- Columnas básicas
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Información básica del riesgo
    name TEXT NOT NULL,
    description TEXT,
    code TEXT,
    
    -- Clasificación
    category TEXT DEFAULT 'technical',
    phase TEXT DEFAULT 'planning',
    
    -- Evaluación del riesgo
    probability NUMERIC(3,2) DEFAULT 0.5,
    impact NUMERIC(3,2) DEFAULT 0.5,
    risk_score NUMERIC(3,2) DEFAULT 0.25,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    
    -- Responsabilidad
    owner TEXT,
    
    -- Fechas
    identified_date DATE,
    review_date DATE,
    
    -- Respuesta al riesgo
    response TEXT DEFAULT 'mitigate',
    response_plan TEXT,
    contingency_plan TEXT,
    trigger_conditions TEXT,
    
    -- Impactos
    cost_impact NUMERIC(12,2) DEFAULT 0,
    schedule_impact INTEGER DEFAULT 0,
    residual_probability NUMERIC(3,2) DEFAULT 0,
    residual_impact NUMERIC(3,2) DEFAULT 0,
    
    -- Monitoreo
    monitoring_frequency TEXT DEFAULT 'weekly',
    early_warnings JSONB DEFAULT '[]'::jsonb,
    actual_occurred BOOLEAN DEFAULT false,
    
    -- Stakeholders y contexto
    stakeholders JSONB DEFAULT '[]'::jsonb,
    assumptions JSONB DEFAULT '[]'::jsonb,
    constraints JSONB DEFAULT '[]'::jsonb
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_priority ON risks(priority);
CREATE INDEX IF NOT EXISTS idx_risks_created_at ON risks(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

-- Crear política para que los usuarios solo vean sus propios riesgos
CREATE POLICY "Users can view their own risks" ON risks
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own risks" ON risks
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own risks" ON risks
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own risks" ON risks
    FOR DELETE USING (auth.uid() = owner_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_risks_updated_at 
    BEFORE UPDATE ON risks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar que la tabla se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'risks' 
ORDER BY ordinal_position;
