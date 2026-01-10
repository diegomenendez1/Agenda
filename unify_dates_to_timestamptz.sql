-- Migration: Unify all date columns to TIMESTAMPTZ
-- This ensures consistency across all tables and avoids 'out of range' or 'invalid syntax' errors.

BEGIN;

-- 1. FIX PROJECTS
ALTER TABLE public.projects 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);

-- 2. FIX TASKS
ALTER TABLE public.tasks 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING to_timestamp(completed_at / 1000.0),
  ALTER COLUMN due_date TYPE TIMESTAMPTZ USING to_timestamp(due_date / 1000.0);

-- Also fix accepted_at if it exists (it was added via claim_task logic potentially)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='accepted_at') THEN
    ALTER TABLE public.tasks ALTER COLUMN accepted_at TYPE TIMESTAMPTZ USING to_timestamp(accepted_at / 1000.0);
  END IF;
END $$;

-- 3. FIX INBOX ITEMS
ALTER TABLE public.inbox_items 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0);

-- 4. FIX NOTES
ALTER TABLE public.notes 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at / 1000.0),
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);

COMMIT;
