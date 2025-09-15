-- Script para sincronizar las columnas de proyecto en purchase_orders
-- Asegurar que project_id, projectId y projectid tengan los mismos datos

-- Paso 1: Actualizar project_id con los valores de projectId
UPDATE purchase_orders 
SET project_id = projectId 
WHERE projectId IS NOT NULL AND project_id IS NULL;

-- Paso 2: Actualizar projectId con los valores de project_id
UPDATE purchase_orders 
SET projectId = project_id 
WHERE project_id IS NOT NULL AND projectId IS NULL;

-- Paso 3: Actualizar projectid con los valores de project_id
UPDATE purchase_orders 
SET projectid = project_id 
WHERE project_id IS NOT NULL AND projectid IS NULL;

-- Paso 4: Verificar que todas las columnas tienen los mismos datos
SELECT 
    COUNT(*) as total_records,
    COUNT(project_id) as project_id_count,
    COUNT(projectId) as projectId_count,
    COUNT(projectid) as projectid_count
FROM purchase_orders;
