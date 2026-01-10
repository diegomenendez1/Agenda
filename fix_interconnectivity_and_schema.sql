-- ==============================================================================
-- FIX: Interconnectivity, Schema, and Visibility (Deep Check)
-- Issues Found:
-- 1. 'profiles' RLS was too strict, hiding team members for assignment.
-- 2. 'projects' table was missing 'visibility' and 'members' columns required by Task policies.
-- 3. 'projects' RLS was too strict, hiding project context for assignees.
-- ==============================================================================

BEGIN;

-- 1. FIX PROFILES VISIBILITY (Allow seeing colleagues)
DROP POLICY IF EXISTS "Profiles Visibility: Self" ON public.profiles;
CREATE POLICY "Profiles Visibility: Team" ON public.profiles
FOR SELECT USING (
  auth.role() = 'authenticated'
);


-- 2. FIX PROJECTS SCHEMA (Add missing columns logic)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private', -- 'private', 'team'
ADD COLUMN IF NOT EXISTS members text[] DEFAULT '{}';


-- 3. FIX PROJECTS VISIBILITY (Share Projects)
DROP POLICY IF EXISTS "Users can CRUD own projects" ON public.projects;

-- Policy: Owner has full control
CREATE POLICY "Project Owner Control" ON public.projects
FOR ALL USING (
  auth.uid() = user_id
);

-- Policy: Team/Members can View
CREATE POLICY "Project Team View" ON public.projects
FOR SELECT USING (
  visibility = 'team' 
  OR 
  auth.uid()::text = ANY(members)
);


-- 4. RE-APPLY TASK POLICIES (Ensure they use the now-valid Project columns)
-- (We allow the previous faulty policy to stand as it now links to valid columns, 
--  but we ensure the dependency is resolved).

COMMIT;
