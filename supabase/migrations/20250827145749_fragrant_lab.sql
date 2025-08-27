/*
  # Debug and fix foreign key constraints for projects table

  1. Diagnostic Information
    - Check if contractor exists
    - List all contractors for debugging
    - Show current foreign key constraints
    - Check uploaded_files table structure

  2. Fix Foreign Key Constraints
    - Remove old foreign key constraint on auth.users
    - Add correct foreign key constraint on local users table
    - Clean up invalid data

  3. Security and Performance
    - Recreate indexes for performance
    - Ensure RLS policies are correct
*/

-- 1. Diagnostic queries
DO $$
DECLARE
    contractor_exists BOOLEAN;
    contractor_name TEXT;
    fk_count INTEGER;
    column_exists BOOLEAN;
BEGIN
    -- Check if specific contractor exists
    SELECT EXISTS(
        SELECT 1 FROM contractors 
        WHERE id = 'd720716b-3ccf-4964-901c-cd8c09172863'
    ) INTO contractor_exists;
    
    IF contractor_exists THEN
        SELECT name INTO contractor_name 
        FROM contractors 
        WHERE id = 'd720716b-3ccf-4964-901c-cd8c09172863';
        
        RAISE NOTICE 'Contractor EXISTS: % (ID: d720716b-3ccf-4964-901c-cd8c09172863)', contractor_name;
    ELSE
        RAISE NOTICE 'Contractor NOT FOUND with ID: d720716b-3ccf-4964-901c-cd8c09172863';
    END IF;
    
    -- Show all contractors
    RAISE NOTICE 'All contractors in database:';
    FOR contractor_name IN 
        SELECT name || ' (ID: ' || id || ')' 
        FROM contractors 
        ORDER BY created_at 
        LIMIT 10
    LOOP
        RAISE NOTICE '  - %', contractor_name;
    END LOOP;
    
    -- Check current foreign key constraints on projects table
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'projects' 
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Current foreign key constraints on projects table: %', fk_count;
    
    -- Check if object_type column exists in uploaded_files
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploaded_files' 
        AND column_name = 'object_type'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'Column object_type EXISTS in uploaded_files table';
    ELSE
        RAISE NOTICE 'Column object_type NOT FOUND in uploaded_files table';
    END IF;
END $$;

-- 2. Clean up invalid created_by references
UPDATE projects 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = projects.created_by
);

-- 3. Drop existing foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_created_by_fkey' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT projects_created_by_fkey;
        RAISE NOTICE 'Dropped existing projects_created_by_fkey constraint';
    END IF;
END $$;

-- 4. Add correct foreign key constraint to local users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_created_by_users_fkey' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_created_by_users_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added new foreign key constraint projects_created_by_users_fkey';
    END IF;
END $$;

-- 5. Recreate index for created_by column
DROP INDEX IF EXISTS idx_projects_created_by;
CREATE INDEX idx_projects_created_by ON projects(created_by) 
WHERE created_by IS NOT NULL;

-- 6. Show final state
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'projects' 
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE 'Final foreign key constraints count: %', constraint_count;
    
    -- List all foreign key constraints
    FOR constraint_count IN 
        SELECT constraint_name
        FROM information_schema.table_constraints 
        WHERE table_name = 'projects' 
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        RAISE NOTICE 'Foreign key constraint: %', constraint_count;
    END LOOP;
END $$;