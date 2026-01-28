-- AGGRESSIVE CLEANUP: Drop ALL conflicting policies identified in logs
-- We found duplicates like "View Org Invitations", "Org Isolated Invitations View", etc.

-- 1. Clean 'team_invitations'
DROP POLICY IF EXISTS "Admins can update invites" ON team_invitations;
DROP POLICY IF EXISTS "Admins/Owners can delete" ON team_invitations;
DROP POLICY IF EXISTS "Create Org Invitations" ON team_invitations;
DROP POLICY IF EXISTS "Create invitations for my team" ON team_invitations;
DROP POLICY IF EXISTS "Invitations visibility" ON team_invitations; -- permissive 'true' policy?!
DROP POLICY IF EXISTS "Inviter can see own created invites" ON team_invitations;
DROP POLICY IF EXISTS "Manage sent invitations" ON team_invitations;
DROP POLICY IF EXISTS "Members can request invites" ON team_invitations;
DROP POLICY IF EXISTS "Org Isolated Invitations View" ON team_invitations;
DROP POLICY IF EXISTS "View Invitations" ON team_invitations;
DROP POLICY IF EXISTS "View Org Invitations" ON team_invitations;
DROP POLICY IF EXISTS "View invitations for my team" ON team_invitations; -- Likely recursion source

-- 2. Clean 'team_members'
DROP POLICY IF EXISTS "Members see other members" ON team_members;
DROP POLICY IF EXISTS "View Team Members" ON team_members;

-- 3. APPLY SINGLE SOURCE OF TRUTH POLICIES (Minimal & Secure)

-- A. Team Invitations: Visibility
CREATE POLICY "View Invitations" ON team_invitations FOR SELECT USING (
  -- 1. Users in the same org
  (organization_id = public.get_my_org_id())
  OR
  -- 2. Fallback: I created it (Safety net)
  (invited_by = auth.uid())
);

-- B. Team Invitations: Management (Admins Only)
CREATE POLICY "Manage Invitations" ON team_invitations FOR ALL USING (
  organization_id = public.get_my_org_id() 
  AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
);
-- Allow creation by anyone (service request) but only admins approve? 
-- Actually, let's allow "Create" for everyone in Org, backend checks role.
CREATE POLICY "Create Invitations" ON team_invitations FOR INSERT WITH CHECK (
  organization_id = public.get_my_org_id() 
);


-- C. Team Members: Visibility
CREATE POLICY "View Team Members" ON team_members FOR SELECT USING (
  -- Check via Profile connection (since table lacks org_id)
  EXISTS (
    SELECT 1 FROM profiles auth_user, profiles target_user
    WHERE auth_user.id = auth.uid()
    AND target_user.id = team_members.user_id
    AND auth_user.organization_id = target_user.organization_id
  )
);

-- D. Profiles: Simplification (Avoid Recursion)
-- Ensure 'get_my_org_id' is definitely SECURITY DEFINER (already done, but verified)
-- Drop potential conflicting profile policies if needed, but for now focus on the team tables which were crashing.
