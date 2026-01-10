-- FINAL STANDARDIZATION: Convert all Date/Time columns to TIMESTAMPTZ
-- This aligns with modern Supabase standards and resolves all "Digital Stress Test" persistence crashes.

BEGIN;

-- 1. Helper Function to convert bigint (ms) to timestamptz safely
-- Usage: to_timestamp(col / 1000.0)

-- 2. FIX TASKS
ALTER TABLE public.tasks 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN due_date TYPE TIMESTAMPTZ USING to_timestamp(due_date / 1000.0),
  ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING to_timestamp(completed_at / 1000.0);

-- updated_at and deadline might already be timestamptz (if not, this ensures it)
ALTER TABLE public.tasks ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
ALTER TABLE public.tasks ALTER COLUMN deadline TYPE TIMESTAMPTZ;

-- 3. FIX PROJECTS
ALTER TABLE public.projects 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0);
-- updated_at handled similarly if it exists
DO $$ BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='updated_at') THEN
    ALTER TABLE public.projects ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);
  END IF;
END $$;

-- 4. FIX INBOX ITEMS
ALTER TABLE public.inbox_items 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0);

-- 5. FIX NOTES
ALTER TABLE public.notes 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);

-- 6. FIX HABITS
ALTER TABLE public.habits 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ; -- already likely timestamptz from setup

COMMIT;
