-- Add assignee_ids column as text array (to support multiple UUIDs)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_ids text[] DEFAULT '{}';

-- Migrate existing assignee_id to the new array column
UPDATE tasks 
SET assignee_ids = ARRAY[assignee_id::text] 
WHERE assignee_id IS NOT NULL;

-- (Optional) We keep assignee_id for now to avoid breaking other things immediately, 
-- but the app will primarily use assignee_ids going forward.
