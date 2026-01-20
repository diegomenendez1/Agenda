-- RPC: Accept Invitation
-- Allows a user to accept a pending invitation using their authenticated email.

CREATE OR REPLACE FUNCTION public.accept_invitation(invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record record;
BEGIN
  -- 1. Get Invite (Ensure it matches auth.email and is pending)
  SELECT * INTO invite_record
  FROM team_invitations
  WHERE id = invite_id
  AND email = auth.email()
  AND status = 'pending';

  IF invite_record IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or not valid for this user';
  END IF;

  -- 2. Add to Org Members
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (invite_record.organization_id, auth.uid(), invite_record.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = invite_record.role;

  -- 3. Switch User to New Org (Optional but improved UX)
  UPDATE profiles
  SET organization_id = invite_record.organization_id,
      role = invite_record.role, -- Sync role to match the new context
      reports_to = invite_record.reports_to -- Auto-assign manager
  WHERE id = auth.uid();

  -- 4. Mark Invite Accepted
  UPDATE team_invitations
  SET status = 'accepted'
  WHERE id = invite_id;

  RETURN true;
END;
$$;
