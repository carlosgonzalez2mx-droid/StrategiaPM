-- ================================================================
-- FIX: Políticas RLS para organization_members
-- ================================================================
--
-- Este script corrige el error 400 al contar usuarios en organization_members
-- El problema es que las políticas RLS están bloqueando las consultas COUNT
--
-- ================================================================

-- 1. Ver las políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'organization_members';

-- 2. Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Users can view members of their organization" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view their organization" ON organization_members;
DROP POLICY IF EXISTS "Enable read access for organization members" ON organization_members;

-- 3. Crear política correcta para SELECT (incluyendo COUNT)
-- Esta política permite a los miembros autenticados ver miembros de su organización
CREATE POLICY "Enable read access for authenticated users"
ON organization_members
FOR SELECT
TO authenticated
USING (
  -- El usuario puede ver miembros de organizaciones donde él es miembro
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
);

-- 4. Habilitar RLS si no está habilitado
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 5. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'organization_members';

-- ================================================================
-- TESTING
-- ================================================================
-- Después de ejecutar este script, probar en el SQL Editor:
--
-- SELECT COUNT(*) FROM organization_members
-- WHERE organization_id = '73bf164f-f3e8-4207-95a6-e3e3d385148d'
-- AND status = 'active';
--
-- Debería retornar el conteo correcto sin error 400
-- ================================================================
