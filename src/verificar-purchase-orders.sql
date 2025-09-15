-- Script para verificar el estado de la tabla purchase_orders
-- Ejecuta este script primero para ver qué existe

-- Verificar si la tabla existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'purchase_orders'
) as table_exists;

-- Si la tabla existe, mostrar su estructura
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND table_schema = 'public'
ORDER BY column_name;
