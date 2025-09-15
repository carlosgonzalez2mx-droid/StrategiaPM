-- Script para debuggear el problema de fechas en purchase_orders
-- Este script nos ayudará a entender qué está pasando

-- Paso 1: Verificar si las columnas de fecha existen
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND table_schema = 'public'
AND column_name IN ('requestDate', 'approvalDate', 'expectedDate', 'requestdate', 'approvaldate', 'expecteddate')
ORDER BY column_name;

-- Paso 2: Verificar si hay datos en la tabla
SELECT COUNT(*) as total_orders FROM purchase_orders;

-- Paso 3: Ver una muestra de datos (si existen)
SELECT 
    id, 
    "requestDate", 
    "approvalDate", 
    "expectedDate",
    requestdate, 
    approvaldate, 
    expecteddate
FROM purchase_orders 
LIMIT 5;

-- Paso 4: Probar insertar una fecha de prueba
-- (Solo ejecutar si no hay datos importantes)
-- INSERT INTO purchase_orders (id, "requestDate", "approvalDate", "expectedDate") 
-- VALUES ('test-001', '2024-01-15', '2024-01-20', '2024-01-25');
