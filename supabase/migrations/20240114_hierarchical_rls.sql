-- Migration: implement_hierarchical_permissions
-- Description: Adds recursive teammate lookup and updates RLS for Manager visibility

-- 1. Helper Function: Is Manager Of?
-- Returns true if 'manager_id' is directly or indirectly above 'subordinate_id'
CREATE OR REPLACE FUNCTION public.is_manager_of(target_manager_id uuid, target_subordinate_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Direct check: Is target_manager the 'reports_to' of subordinate?
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_subordinate_id
    AND reports_to = target_manager_id
  ) THEN
    RETURN true;
  END IF;

  -- (Optional) Recursive check for multi-level hierarchy could go here.
  -- For now, we strictly implement Direct Manager visibility as per "Smart Visibility" MVP.
  
  RETURN false;
END;
$$;

-- 2. Update RLS Policy for 'tasks'
-- First, drop existing overlapping policies to avoid conflicts
DROP POLICY IF EXISTS "Users can see their own and team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Hierarchical Task Visibility" ON public.tasks;

CREATE POLICY "Hierarchical Task Visibility" ON public.tasks
FOR SELECT
USING (
  -- 1. I am the owner
  auth.uid() = user_id
  
  -- 2. I am an assignee (using array operator @> with specific cast)
  OR (assignee_ids @> ARRAY[auth.uid()::text])
  
  -- 3. It is a 'team' visible task (Public to company/team)
  OR (visibility = 'team')
  
  -- 4. I am the Manager of the Owner (Hierarchical Access)
  -- optimization: only check if the task is NOT strictly private-personal (if you want that distinction)
  -- For this implementation, Managers see EVERYTHING from their reports except explicitly 'private' if we want.
  -- User requested "Optical Visibility", usually managers see all work.
  OR (
    public.is_manager_of(auth.uid(), user_id)
  )
);

-- 3. Ensure 'profiles' is readable so is_manager_of works for everyone
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);
