-- CRITICAL FIX: Break Infinite Recursion in RLS Policies
-- This script fixes the "infinite recursion detected in policy" error that prevents invitations/team members from loading.

-- 1. Create a secure helper function (Bypasses RLS to check membership safely)
CREATE OR REPLACE FUNCTION public.check_is_member_of(_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- IMPORTANT: This runs with owner permissions, bypassing the infinite loop
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND organization_id = _org_id
  );
END;
$$;

-- 2. Apply to 'team_members' (The source of the recursion)
DROP POLICY IF EXISTS "Team Visibility" ON team_members;
DROP POLICY IF EXISTS "View Team Members" ON team_members;
DROP POLICY IF EXISTS "Read Team Members" ON team_members;

CREATE POLICY "View Team Members" ON team_members FOR SELECT USING (
  -- Check if the user in the row belongs to the same organization as the current user
  EXISTS (
    SELECT 1 FROM profiles auth_user, profiles target_user
    WHERE auth_user.id = auth.uid()
    AND target_user.id = team_members.user_id
    AND auth_user.organization_id = target_user.organization_id
  )
);

-- 3. Apply to 'team_invitations' (Also affected)
DROP POLICY IF EXISTS "Invitation Visibility" ON team_invitations;
DROP POLICY IF EXISTS "View Invitations" ON team_invitations;

CREATE POLICY "View Invitations" ON team_invitations FOR SELECT USING (
  -- Users in the org can see the invites (organization_id column EXISTS here)
  public.check_is_member_of(organization_id)
);

-- 4. Apply to 'active_invitations' view if it relies on these tables (It should work automatically if tables are fixed)
