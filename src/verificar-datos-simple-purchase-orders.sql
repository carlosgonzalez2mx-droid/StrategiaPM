-- Script simple para verificar datos en purchase_orders
-- Solo usa columnas que sabemos que existen

-- Paso 1: Ver cuántos registros hay en total
SELECT COUNT(*) as total_records FROM purchase_orders;

-- Paso 2: Ver una muestra de los datos (solo columnas básicas)
SELECT 
    id, 
    number,
    supplier,
    description,
    status,
    created_at
FROM purchase_orders 
LIMIT 5;

-- Paso 3: Ver qué columnas de proyecto tienen datos
SELECT 
    COUNT(project_id) as project_id_count,
    COUNT(projectId) as projectId_count,
    COUNT(projectid) as projectid_count
FROM purchase_orders;

-- Paso 4: Ver una muestra de los IDs de proyecto
SELECT DISTINCT project_id FROM purchase_orders WHERE project_id IS NOT NULL LIMIT 3;
SELECT DISTINCT projectId FROM purchase_orders WHERE projectId IS NOT NULL LIMIT 3;
SELECT DISTINCT projectid FROM purchase_orders WHERE projectid IS NOT NULL LIMIT 3;
