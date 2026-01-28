-- IMPLEMENTATION OF ROLE-BASED INVITATIONS V2

-- 1. Helper to check if user is admin/owner
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'admin')
  );
$$;

-- 2. RPC: Request Invitation (For standard members)
CREATE OR REPLACE FUNCTION public.request_invitation(invite_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_org_id uuid;
  inviter_id uuid;
  new_id uuid;
BEGIN
  inviter_id := auth.uid();
  current_org_id := public.get_my_org_id();

  IF current_org_id IS NULL THEN
    RAISE EXCEPTION 'User is not in an organization';
  END IF;

  -- Check if already exists
  IF EXISTS (SELECT 1 FROM team_invitations WHERE email = invite_email AND organization_id = current_org_id) THEN
    RAISE EXCEPTION 'Invitation for this email already exists';
  END IF;

  INSERT INTO team_invitations (
    email,
    role,
    status,
    organization_id,
    invited_by,
    token
  ) VALUES (
    invite_email,
    'member', -- Default role, will be changed by admin upon approval
    'approval_needed',
    current_org_id,
    inviter_id,
    gen_random_uuid()::text -- Generate token but don't send it yet
  ) RETURNING id INTO new_id;

  RETURN json_build_object('id', new_id, 'status', 'approval_needed');
END;
$$;

-- 3. RPC: Approve Invitation (For Admins/Owners)
CREATE OR REPLACE FUNCTION public.approve_invitation(invite_id uuid, assigned_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check permissions
  IF NOT public.is_org_admin() THEN
    RAISE EXCEPTION 'Only admins can approve invitations';
  END IF;

  -- Update status and role
  UPDATE team_invitations
  SET status = 'pending',
      role = assigned_role,
      token = gen_random_uuid()::text -- Regenerate token just in case
  WHERE id = invite_id
  AND organization_id = public.get_my_org_id(); -- Ensure same org

  IF FOUND THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Invitation not found or not in your organization';
  END IF;
END;
$$;

-- 4. RPC: Reject/Delete Invitation (For Admins or Self-Cancel)
CREATE OR REPLACE FUNCTION public.delete_invitation(target_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM team_invitations
  WHERE id = target_invite_id
  AND organization_id = public.get_my_org_id()
  AND (
    public.is_org_admin() -- Admin can delete any
    OR invited_by = auth.uid() -- Inviter can cancel their own
  );

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- 5. RPC: Direct Invite (For Admins) - Overwrites previous logic if needed
CREATE OR REPLACE FUNCTION public.invite_user_direct(invite_email text, invite_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_org_id uuid;
  new_id uuid;
BEGIN
  -- Check permissions
  IF NOT public.is_org_admin() THEN
    RAISE EXCEPTION 'Only admins can send direct invitations';
  END IF;

  current_org_id := public.get_my_org_id();

  INSERT INTO team_invitations (
    email,
    role,
    status,
    organization_id,
    invited_by,
    token
  ) VALUES (
    invite_email,
    invite_role,
    'pending', -- Direct to pending
    current_org_id,
    auth.uid(),
    gen_random_uuid()::text
  ) RETURNING id INTO new_id;

  RETURN json_build_object('id', new_id, 'status', 'pending');
END;
$$;

-- 6. Update RLS policies for team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org Isolated Invitations View" ON team_invitations;
CREATE POLICY "Org Isolated Invitations View" ON team_invitations
FOR SELECT USING (
  organization_id = public.get_my_org_id()
);

-- Allow inserting own requests
DROP POLICY IF EXISTS "Members can request invites" ON team_invitations;
CREATE POLICY "Members can request invites" ON team_invitations
FOR INSERT WITH CHECK (
  organization_id = public.get_my_org_id()
  AND invited_by = auth.uid()
);

-- Allow admins to update (approve)
DROP POLICY IF EXISTS "Admins can update invites" ON team_invitations;
CREATE POLICY "Admins can update invites" ON team_invitations
FOR UPDATE USING (
  organization_id = public.get_my_org_id()
  AND public.is_org_admin()
);

-- Allow delete (Admins or Own)
DROP POLICY IF EXISTS "Admins/Owners can delete" ON team_invitations;
CREATE POLICY "Admins/Owners can delete" ON team_invitations
FOR DELETE USING (
  organization_id = public.get_my_org_id()
  AND (public.is_org_admin() OR invited_by = auth.uid())
);
