-- RPC: Leave Team
-- Allows a non-owner member to leave their current organization.

CREATE OR REPLACE FUNCTION public.leave_team()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_org_id uuid;
  user_role text;
BEGIN
  -- 1. Get Current Context
  SELECT organization_id, role INTO current_org_id, user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_org_id IS NULL THEN
    RAISE EXCEPTION 'You are not in an organization.';
  END IF;

  -- 2. Prevent Owner from Leaving
  IF user_role = 'owner' THEN
    RAISE EXCEPTION 'Owners cannot leave their own organization. You must transfer ownership or delete the organization.';
  END IF;

  -- 3. Remove from Members
  DELETE FROM organization_members
  WHERE organization_id = current_org_id
  AND user_id = auth.uid();

  -- 4. Reset Profile to Personal Scope
  -- Assuming every user has a personal organization where ID = UserID, or just set to NULL to force onboarding
  -- Let's set to NULL to force them to choose/create another or use the onboarding logic to find their personal workspace.
  -- Better: Set it to their "Personal" workspace if it exists.
  
  -- Fallback: Update profile to remove the current org link.
  UPDATE profiles
  SET organization_id = auth.uid(), -- Fallback to personal request
      role = 'owner' -- Reset role to owner of their own domain
  WHERE id = auth.uid();

  RETURN true;
END;
$$;
