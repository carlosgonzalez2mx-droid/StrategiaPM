-- Script para debuggear la carga de órdenes de compra
-- Verificar exactamente qué datos hay y cómo se están cargando

-- Paso 1: Ver todos los datos de la orden de compra
SELECT 
    id,
    project_id,
    number,
    supplier,
    description,
    status,
    created_at,
    updated_at
FROM purchase_orders 
WHERE project_id = '0573f29c-ddb7-4dec-bc7d-693a65424a76';

-- Paso 2: Verificar si hay datos en otras columnas de proyecto
SELECT 
    project_id,
    projectId,
    projectid,
    owner_id
FROM purchase_orders 
WHERE project_id = '0573f29c-ddb7-4dec-bc7d-693a65424a76';

-- Paso 3: Verificar si hay datos para otros proyectos
SELECT 
    project_id,
    COUNT(*) as count
FROM purchase_orders 
GROUP BY project_id;
