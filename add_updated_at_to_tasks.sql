-- Add updated_at column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have updated_at = created_at
UPDATE public.tasks 
SET updated_at = created_at 
WHERE updated_at IS NULL;
