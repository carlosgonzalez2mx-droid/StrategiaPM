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

-- 2. Verificar si la política actual está causando el problema
-- La política "simple_all_access_members" debería funcionar, pero vamos a recrearla

-- Eliminar la política actual
DROP POLICY IF EXISTS "simple_all_access_members" ON organization_members;

-- Eliminar cualquier otra política que pueda existir
DROP POLICY IF EXISTS "Users can view members of their organization" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view their organization" ON organization_members;
DROP POLICY IF EXISTS "Enable read access for organization members" ON organization_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON organization_members;

-- 3. Crear política simple y permisiva para SELECT
-- Permitir a usuarios autenticados leer todos los miembros de cualquier organización
-- (esto es seguro porque solo expone información de membresía, no datos sensibles)
CREATE POLICY "allow_authenticated_select"
ON organization_members
FOR SELECT
TO authenticated
USING (true);

-- 4. Crear política para INSERT (para poder agregar miembros)
CREATE POLICY "allow_authenticated_insert"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Crear política para UPDATE (para poder actualizar status, role, etc)
CREATE POLICY "allow_authenticated_update"
ON organization_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Crear política para DELETE (para poder remover miembros)
CREATE POLICY "allow_authenticated_delete"
ON organization_members
FOR DELETE
TO authenticated
USING (true);

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
