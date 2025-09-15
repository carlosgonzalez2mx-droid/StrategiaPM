-- Script para verificar qué datos hay en purchase_orders y cómo están organizados

-- Paso 1: Ver cuántos registros hay en total
SELECT COUNT(*) as total_records FROM purchase_orders;

-- Paso 2: Ver una muestra de los datos
SELECT 
    id, 
    project_id, 
    projectId, 
    projectid,
    number,
    supplier,
    description,
    total_amount,
    status,
    created_at
FROM purchase_orders 
LIMIT 5;

-- Paso 3: Ver qué valores únicos hay en las columnas de proyecto
SELECT DISTINCT project_id FROM purchase_orders WHERE project_id IS NOT NULL;
SELECT DISTINCT projectId FROM purchase_orders WHERE projectId IS NOT NULL;
SELECT DISTINCT projectid FROM purchase_orders WHERE projectid IS NOT NULL;
