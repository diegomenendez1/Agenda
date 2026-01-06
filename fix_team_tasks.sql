-- FIX 1: Add the missing 'visibility' column
-- The app logic expects this column to exist to show tasks on the Team Board.
-- Without it, tasks default to 'private' on reload and disappear from the shared board.

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

-- FIX 2: Update Access Permissions (RLS)
-- Currently, only the creator can see the task.
-- We need to allow the Assignee and the Team to see it too.

DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;

CREATE POLICY "Team Access Policy" ON public.tasks
FOR ALL USING (
    auth.uid() = user_id                   -- Creator (Owner)
    OR 
    assignee_id = auth.uid()::text         -- Person assigned to the task
    OR
    visibility = 'team'                    -- Tasks explicitly marked for the team
);
