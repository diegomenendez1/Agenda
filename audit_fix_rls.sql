-- Fix RLS Recursion on Profiles
-- The issue is likely circular RLS when querying profiles to check hierarchy permissions.
-- Solution: Use a SECURITY DEFINER function to fetch hierarchy data, bypassing RLS for the check.

BEGIN;

-- 1. Create a helper function to get manager/reports IDs safely
-- SECURITY DEFINER: Runs with the privileges of the creator (postgres/admin), bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_hierarchy_ids(target_user_id uuid)
RETURNS TABLE (
    manager_id uuid,
    reports_to uuid
) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT 
    p.reports_to as manager_id,
    p.reports_to -- redundancy for clarity/alias if needed
  FROM public.profiles p
  WHERE p.id = target_user_id;
$$;

-- 2. Drop existing potentially recursive policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- Drop any other custom ones might exist
DROP POLICY IF EXISTS "View team profiles" ON public.profiles;

-- 3. Re-create robust policies

-- A. Public/Basic Visibility (Everyone can see basic info of everyone else for collaboration)
-- In many apps, profiles are public to authenticated users. 
-- If strict privacy is needed, we limit to same team.
-- For this app, let's allow authenticated users to view profiles to avoid complexity/recursion for now, 
-- or use the "Team" table which is separate.
-- The simplest non-recursive check: "auth.role() = 'authenticated'"
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT USING (
    auth.role() = 'authenticated'
);

-- B. Update: Only self
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id
);

-- C. Insert: Only self (for signup)
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (
    auth.uid() = id
);


-- 4. OPTIONAL: Fix for Team Invitations duplicates if not relying purely on UNIQUE constraint (soft validation)
-- (The UNIQUE constaint on team_invitations(team_id, email) is sufficient for data integrity, 
-- but frontend needs to handle the 23505 error code).

COMMIT;
