-- FIX: Update Task Collaboration Policy to support Multiple Assignees and Delete actions
-- This script replaces the old policy that used the singular 'assignee_id' 
-- with one that checks the 'assignee_ids' array.

BEGIN;

-- 1. Drop old policies
DROP POLICY IF EXISTS "Team Access Policy" ON public.tasks;
DROP POLICY IF EXISTS "Task Collaboration Policy" ON public.tasks;

-- 2. Create the unified Collaboration Policy
-- This grants ALL permissions (SELECT, INSERT, UPDATE, DELETE) to:
--   a) The Owner (creator)
--   b) Any user in the assignee_ids array
--   c) Users for tasks explicitly shared with 'team'
--   d) Users who have access to the parent project

CREATE POLICY "Task Collaboration Policy" ON public.tasks
FOR ALL USING (
    auth.uid() = user_id OR                     -- Creator (Owner)
    auth.uid()::text = ANY(assignee_ids) OR     -- Member of Assignee Array (Fixed)
    assignee_id = auth.uid()::text OR           -- Legacy single assignee support
    visibility = 'team' OR                      -- Explicitly shared task
    project_id IN (                             -- Task belongs to a shared project
        SELECT id FROM public.projects 
        WHERE visibility = 'team' OR auth.uid()::text = ANY(members)
    )
);

COMMIT;
