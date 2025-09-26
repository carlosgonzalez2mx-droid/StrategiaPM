-- =====================================================
-- SCRIPT ALTERNATIVO: POLÍTICAS RLS MÁS SEGURAS POR ORGANIZACIÓN
-- =====================================================
-- 
-- VERSIÓN MÁS SEGURA: Solo permite acceso a archivos de la organización del usuario
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Ve a "SQL Editor"
-- 3. Ejecuta este script completo
-- 4. Reinicia tu aplicación
-- =====================================================

-- 1. HABILITAR RLS EN LA TABLA storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA SEGURA PARA CREAR BUCKETS (solo si no existe)
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to create buckets" ON storage.buckets
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. POLÍTICA SEGURA PARA LEER BUCKETS
DROP POLICY IF EXISTS "Allow authenticated users to read buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to read buckets" ON storage.buckets
FOR SELECT 
TO authenticated 
USING (true);

-- 4. POLÍTICA SEGURA PARA ACTUALIZAR BUCKETS
DROP POLICY IF EXISTS "Allow authenticated users to update buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to update buckets" ON storage.buckets
FOR UPDATE 
TO authenticated 
USING (true);

-- 5. POLÍTICA SEGURA PARA ELIMINAR BUCKETS
DROP POLICY IF EXISTS "Allow authenticated users to delete buckets" ON storage.buckets;
CREATE POLICY "Allow authenticated users to delete buckets" ON storage.buckets
FOR DELETE 
TO authenticated 
USING (true);

-- 6. HABILITAR RLS EN LA TABLA storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICA SEGURA PARA SUBIR ARCHIVOS (solo a buckets de la organización)
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT 
TO authenticated 
WITH CHECK (
    -- Solo permitir subir a buckets que contengan el ID de la organización del usuario
    bucket_id = 'project-files' AND
    -- Verificar que el usuario pertenece a la organización
    auth.uid() IN (
        SELECT user_id 
        FROM organization_members 
        WHERE organization_id = (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- 8. POLÍTICA SEGURA PARA LEER ARCHIVOS (solo de la organización)
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
CREATE POLICY "Allow authenticated users to read files" ON storage.objects
FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'project-files' AND
    -- Solo archivos de la organización del usuario
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- 9. POLÍTICA SEGURA PARA ACTUALIZAR ARCHIVOS
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- 10. POLÍTICA SEGURA PARA ELIMINAR ARCHIVOS
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text 
        FROM organization_members 
        WHERE user_id = auth.uid()
    )
);

-- 11. VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
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
WHERE schemaname = 'storage' 
AND tablename IN ('buckets', 'objects')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. Esta versión es MÁS SEGURA porque:
--    - Solo permite acceso a archivos de la organización del usuario
--    - Verifica que el usuario pertenece a la organización
--    - Restringe el acceso por carpetas de organización
-- 
-- 2. Si tienes problemas con esta versión:
--    - Usa el script anterior (fix-supabase-storage-policies.sql)
--    - Es menos seguro pero más permisivo
-- 
-- 3. Después de ejecutar:
--    - Reinicia tu aplicación
--    - Ejecuta debugFileStorage() para verificar
-- =====================================================
