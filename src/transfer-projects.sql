-- Script para transferir proyectos del usuario de prueba al usuario actual
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar qué proyectos existen y a qué usuario pertenecen
SELECT 
    p.id,
    p.name,
    p.organization_id,
    p.owner_id,
    u.email as owner_email
FROM projects p
LEFT JOIN auth.users u ON u.id = p.owner_id
ORDER BY p.created_at;

-- 2. Verificar tu usuario actual
SELECT 
    id,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'carlosgonzalez2.mx@gmail.com';

-- 3. Verificar tu organización
SELECT 
    id,
    name,
    owner_id
FROM organizations 
WHERE owner_id = '7b40ce74-b881-4594-aa9d-5e136740eeff';

-- 4. Transferir TODOS los proyectos a tu usuario y organización
UPDATE projects 
SET 
    owner_id = '7b40ce74-b881-4594-aa9d-5e136740eeff',
    organization_id = '73bf164f-f3e8-4207-95a6-e3e3d385148d',
    updated_at = NOW()
WHERE owner_id != '7b40ce74-b881-4594-aa9d-5e136740eeff';

-- 5. Verificar que la transferencia fue exitosa
SELECT 
    p.id,
    p.name,
    p.organization_id,
    p.owner_id,
    u.email as owner_email
FROM projects p
LEFT JOIN auth.users u ON u.id = p.owner_id
ORDER BY p.created_at;

-- 6. También transferir las tareas asociadas
UPDATE tasks 
SET 
    owner_id = '7b40ce74-b881-4594-aa9d-5e136740eeff',
    updated_at = NOW()
WHERE project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = '7b40ce74-b881-4594-aa9d-5e136740eeff'
);

-- 7. Verificar tareas transferidas
SELECT 
    t.id,
    t.title,
    t.project_id,
    p.name as project_name,
    t.owner_id
FROM tasks t
JOIN projects p ON p.id = t.project_id
WHERE t.owner_id = '7b40ce74-b881-4594-aa9d-5e136740eeff'
ORDER BY p.name, t.title;
