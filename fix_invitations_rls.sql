BEGIN;

-- Update RLS Policy for Viewing Invitations
-- Issue: Recipients (who are not yet members) cannot see invitations sent to their email.
-- Fix: Allow SELECT if `email = auth.email()`.

DROP POLICY IF EXISTS "View Invitations" ON public.team_invitations;

CREATE POLICY "View Invitations" ON public.team_invitations
FOR SELECT USING (
    organization_id = public.get_my_org_id() -- Members of the org
    OR invited_by = auth.uid() -- The person who sent it
    OR email = auth.email() -- The person receiving it
);

COMMIT;
