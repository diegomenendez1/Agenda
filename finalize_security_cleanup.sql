-- FINAL SECURITY FIX & CLEANUP
-- 1. Standardization: Ensure get_my_org_id reads from the correct table (profiles)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$;

-- 2. Fallback Policy: Ensure I can ALWAYS see invites I created themselves
-- This acts as a safety net if the Org-based policy has edge cases.
DROP POLICY IF EXISTS "Inviter can see own created invites" ON team_invitations;

CREATE POLICY "Inviter can see own created invites" ON team_invitations
FOR SELECT
USING (
  invited_by = auth.uid()
);

-- 3. Policy Refresh: Re-apply the Org-based view just in case (Idempotent)
DROP POLICY IF EXISTS "View Invitations" ON team_invitations;

CREATE POLICY "View Invitations" ON team_invitations FOR SELECT USING (
  public.check_is_member_of(organization_id)
);

-- 4. Fix permissions explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON team_invitations TO authenticated;
GRANT SELECT ON profiles TO authenticated;
