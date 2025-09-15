-- Script para corregir TODAS las restricciones NOT NULL en purchase_orders
-- El problema es que varias columnas son NOT NULL pero la aplicación envía null

-- Paso 1: Verificar qué columnas tienen restricción NOT NULL
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND is_nullable = 'NO'
ORDER BY column_name;

-- Paso 2: Cambiar TODAS las columnas NOT NULL para que permitan NULL
-- (Excepto la clave primaria id que debe mantenerse)

-- Cambiar po_number para que permita NULL
ALTER TABLE purchase_orders ALTER COLUMN po_number DROP NOT NULL;

-- Cambiar vendor para que permita NULL
ALTER TABLE purchase_orders ALTER COLUMN vendor DROP NOT NULL;

-- Cambiar amount para que permita NULL (si es NOT NULL)
ALTER TABLE purchase_orders ALTER COLUMN amount DROP NOT NULL;

-- Paso 3: Verificar que los cambios se aplicaron
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
AND column_name IN ('po_number', 'vendor', 'amount', 'id')
ORDER BY column_name;
