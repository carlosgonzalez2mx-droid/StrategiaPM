-- Corregir tipos de datos de ID en tablas advances e invoices
-- Cambiar de UUID a TEXT para que coincida con los IDs que envía la aplicación

-- Corregir tabla advances
ALTER TABLE advances ALTER COLUMN "id" TYPE TEXT;

-- Corregir tabla invoices  
ALTER TABLE invoices ALTER COLUMN "id" TYPE TEXT;

-- También asegurar que owner_id sea TEXT (no UUID)
ALTER TABLE advances ALTER COLUMN "owner_id" TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN "owner_id" TYPE TEXT;

-- Asegurar que project_id sea TEXT también
ALTER TABLE advances ALTER COLUMN "project_id" TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN "project_id" TYPE TEXT;
