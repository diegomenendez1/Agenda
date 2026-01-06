-- COMPREHENSIVE COLLABORATION ENABLEMENT SCRIPT
-- This script ensures all major modules (Projects, Tasks, Notes) support multi-user access.

-- 1. PROFILES (People)
-- Ensure everyone can see everyone else's name/avatar (needed for assignment and team boards)
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
CREATE POLICY "Public Profiles Access" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. PROJECTS (The Container)
-- Add sharing columns if they don't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private', -- 'private', 'team', 'public'
ADD COLUMN IF NOT EXISTS members text[] DEFAULT '{}';       -- Array of user UUIDs

-- Reset Project Policies
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;
DROP POLICY IF EXISTS "Project View Policy" ON public.projects;
DROP POLICY IF EXISTS "Project Edit Policy" ON public.projects;

-- VIEW: Managers (Owner), Team Projects, or Member of Project
CREATE POLICY "Project View Policy" ON public.projects
FOR SELECT USING (
    user_id = auth.uid() OR                  -- Owner
    visibility = 'team' OR                   -- Global Team Projects
    auth.uid()::text = ANY(members)          -- Explicit Member
);

-- EDIT: Owner or Member
CREATE POLICY "Project Edit Policy" ON public.projects
FOR ALL USING ( -- Using ALL for Insert/Update/Delete simplification, though Delete usually restricted to owner
    user_id = auth.uid() OR 
    auth.uid()::text = ANY(members)
);


-- 3. TASKS (The Work)
-- Ensure 'visibility' column exists (from previous fix)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

-- Create Index for performance (optional but good)
-- CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON public.tasks(visibility);

DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team Access Policy" ON public.tasks;

-- VIEW/EDIT: Owner, Assignee, Team Task, OR Task belongs to a Team Project
CREATE POLICY "Task Collaboration Policy" ON public.tasks
FOR ALL USING (
    auth.uid() = user_id OR                     -- Creator
    assignee_id = auth.uid()::text OR           -- Assignee
    visibility = 'team' OR                      -- Explicitly shared task
    project_id IN (                             -- Task is inside a Shared/Team Project
        SELECT id FROM public.projects 
        WHERE visibility = 'team' OR auth.uid()::text = ANY(members)
    )
);


-- 4. NOTES (The Knowledge)
-- Add visibility column
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

DROP POLICY IF EXISTS "Users can CRUD own notes" ON public.notes;

-- VIEW/EDIT: Owner, Shared values, or Linked to Shared Project
CREATE POLICY "Note Collaboration Policy" ON public.notes
FOR ALL USING (
    auth.uid() = user_id OR
    visibility = 'team' OR
    project_id IN (                             -- Note linked to a Shared/Team Project
        SELECT id FROM public.projects 
        WHERE visibility = 'team' OR auth.uid()::text = ANY(members)
    )
);
