-- Corregir restricción NOT NULL de la columna vendor en tabla invoices
-- Eliminar restricción NOT NULL que está causando el error en facturas

-- ===== CORREGIR TABLA INVOICES =====
-- Eliminar restricción NOT NULL de vendor (que está causando el error)
ALTER TABLE invoices ALTER COLUMN "vendor" DROP NOT NULL;

-- También eliminar otras restricciones NOT NULL que podrían causar problemas similares
ALTER TABLE invoices ALTER COLUMN "number" DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN "amount" DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN "dueDate" DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN "description" DROP NOT NULL;
