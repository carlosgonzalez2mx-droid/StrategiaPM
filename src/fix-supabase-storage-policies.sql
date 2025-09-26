-- =====================================================
-- SCRIPT PARA CONFIGURAR POLÍTICAS RLS DE SUPABASE STORAGE
-- =====================================================
-- 
-- PROBLEMA: "new row violates row-level security policy"
-- CAUSA: Las políticas RLS están bloqueando la creación del bucket project-files
-- SOLUCIÓN: Configurar políticas que permitan a usuarios autenticados crear y usar buckets
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Ve a "SQL Editor"
-- 3. Ejecuta este script completo
-- 4. Reinicia tu aplicación
-- =====================================================

-- 1. HABILITAR RLS EN LA TABLA storage.buckets (si no está habilitado)
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- 2. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS CREAR BUCKETS
CREATE POLICY "Allow authenticated users to create buckets" ON storage.buckets
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS LEER BUCKETS
CREATE POLICY "Allow authenticated users to read buckets" ON storage.buckets
FOR SELECT 
TO authenticated 
USING (true);

-- 4. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS ACTUALIZAR BUCKETS
CREATE POLICY "Allow authenticated users to update buckets" ON storage.buckets
FOR UPDATE 
TO authenticated 
USING (true);

-- 5. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS ELIMINAR BUCKETS
CREATE POLICY "Allow authenticated users to delete buckets" ON storage.buckets
FOR DELETE 
TO authenticated 
USING (true);

-- 6. HABILITAR RLS EN LA TABLA storage.objects (si no está habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 7. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS SUBIR ARCHIVOS
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 8. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS LEER ARCHIVOS
CREATE POLICY "Allow authenticated users to read files" ON storage.objects
FOR SELECT 
TO authenticated 
USING (true);

-- 9. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS ACTUALIZAR ARCHIVOS
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE 
TO authenticated 
USING (true);

-- 10. CREAR POLÍTICA PARA PERMITIR A USUARIOS AUTENTICADOS ELIMINAR ARCHIVOS
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE 
TO authenticated 
USING (true);

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
-- 1. Estas políticas permiten a CUALQUIER usuario autenticado:
--    - Crear, leer, actualizar y eliminar buckets
--    - Subir, leer, actualizar y eliminar archivos
-- 
-- 2. Para mayor seguridad, podrías restringir por organización:
--    - Agregar condiciones como: auth.uid() IN (SELECT user_id FROM organization_members WHERE organization_id = ...)
-- 
-- 3. Después de ejecutar este script:
--    - Reinicia tu aplicación
--    - Los archivos deberían subirse correctamente a Supabase
-- 
-- 4. Si sigues teniendo problemas:
--    - Verifica que tu usuario esté autenticado
--    - Revisa los logs de la consola
--    - Ejecuta debugFileStorage() nuevamente
-- =====================================================
