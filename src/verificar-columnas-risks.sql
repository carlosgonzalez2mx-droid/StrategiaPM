-- Script para verificar las columnas existentes en la tabla risks
-- Ejecuta este script primero para ver qué columnas existen

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'risks' 
AND table_schema = 'public'
ORDER BY column_name;
