-- RPC: Decline Invitation
-- Allows a user to decline a pending invitation using their authenticated email.

CREATE OR REPLACE FUNCTION public.decline_invitation(invite_id uuid)
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

  -- 2. Mark Invitation as Declined
  UPDATE team_invitations
  SET status = 'declined'
  WHERE id = invite_id;

  RETURN true;
END;
$$;
