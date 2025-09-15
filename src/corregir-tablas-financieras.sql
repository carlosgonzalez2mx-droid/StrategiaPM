-- Corregir tablas financieras (advances e invoices) - agregar columnas faltantes
DO $$
BEGIN
    RAISE NOTICE 'Iniciando corrección de tablas financieras...';
    
    -- ===== CORREGIR TABLA ADVANCES =====
    RAISE NOTICE 'Corrigiendo tabla advances...';
    
    -- Agregar columna 'number' si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'number'
    ) THEN
        ALTER TABLE advances ADD COLUMN "number" TEXT;
        RAISE NOTICE '✅ Columna number agregada a advances';
    ELSE
        RAISE NOTICE 'ℹ️ Columna number ya existe en advances';
    END IF;

    -- Agregar otras columnas comunes que podrían faltar en advances
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'supplier'
    ) THEN
        ALTER TABLE advances ADD COLUMN "supplier" TEXT;
        RAISE NOTICE '✅ Columna supplier agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'amount'
    ) THEN
        ALTER TABLE advances ADD COLUMN "amount" DECIMAL(15,2);
        RAISE NOTICE '✅ Columna amount agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'paymentDate'
    ) THEN
        ALTER TABLE advances ADD COLUMN "paymentDate" DATE;
        RAISE NOTICE '✅ Columna paymentDate agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'description'
    ) THEN
        ALTER TABLE advances ADD COLUMN "description" TEXT;
        RAISE NOTICE '✅ Columna description agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE advances ADD COLUMN "project_id" TEXT;
        RAISE NOTICE '✅ Columna project_id agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE advances ADD COLUMN "owner_id" TEXT;
        RAISE NOTICE '✅ Columna owner_id agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE advances ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Columna created_at agregada a advances';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advances' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE advances ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Columna updated_at agregada a advances';
    END IF;

    -- ===== CORREGIR TABLA INVOICES =====
    RAISE NOTICE 'Corrigiendo tabla invoices...';
    
    -- Agregar columna 'dueDate' si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'dueDate'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "dueDate" DATE;
        RAISE NOTICE '✅ Columna dueDate agregada a invoices';
    ELSE
        RAISE NOTICE 'ℹ️ Columna dueDate ya existe en invoices';
    END IF;

    -- Agregar otras columnas comunes que podrían faltar en invoices
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'number'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "number" TEXT;
        RAISE NOTICE '✅ Columna number agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'supplier'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "supplier" TEXT;
        RAISE NOTICE '✅ Columna supplier agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "amount" DECIMAL(15,2);
        RAISE NOTICE '✅ Columna amount agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'description'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "description" TEXT;
        RAISE NOTICE '✅ Columna description agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "project_id" TEXT;
        RAISE NOTICE '✅ Columna project_id agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "owner_id" TEXT;
        RAISE NOTICE '✅ Columna owner_id agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Columna created_at agregada a invoices';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Columna updated_at agregada a invoices';
    END IF;

    RAISE NOTICE '🎉 Corrección de tablas financieras completada exitosamente!';
    
END $$;
