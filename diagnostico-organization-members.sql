-- ================================================================
-- DIAGNÓSTICO: organization_members
-- ================================================================
-- Este script ayuda a identificar por qué falla la consulta
-- ================================================================

-- 1. Verificar que la tabla existe y tiene datos
SELECT
    COUNT(*) as total_members,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members
FROM organization_members;

-- 2. Ver estructura de la tabla
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members'
ORDER BY ordinal_position;

-- 3. Ver si RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'organization_members';

-- 4. Ver todas las políticas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organization_members';

-- 5. Probar la consulta exacta que falla en el código
SELECT COUNT(*)
FROM organization_members
WHERE organization_id = '73bf164f-f3e8-4207-95a6-e3e3d385148d'
AND status = 'active';

-- 6. Ver los primeros registros para verificar datos
SELECT
    id,
    organization_id,
    user_id,
    role,
    status,
    created_at
FROM organization_members
WHERE organization_id = '73bf164f-f3e8-4207-95a6-e3e3d385148d'
LIMIT 10;

-- 7. Verificar el usuario actual
SELECT
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- 8. Verificar si el usuario actual es miembro
SELECT
    om.*
FROM organization_members om
WHERE om.user_id = auth.uid()
AND om.status = 'active';

-- ================================================================
-- INSTRUCCIONES:
-- 1. Copia y pega TODO este script en Supabase SQL Editor
-- 2. Ejecuta (Run)
-- 3. Revisa TODOS los resultados
-- 4. Comparte los resultados conmigo para diagnosticar
-- ================================================================
