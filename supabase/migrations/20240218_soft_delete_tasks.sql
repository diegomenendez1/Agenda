-- Add archived column to tasks for soft delete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Update RLS policies if necessary (optional, but good practice)
-- Ensure archived tasks are still visible to owners/assignees but maybe filtered in UI
-- For now, default policies usually allow read if user has access, which is fine.

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
