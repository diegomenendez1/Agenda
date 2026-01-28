
CREATE OR REPLACE FUNCTION invite_user_direct(
  invite_email text, 
  invite_role text,
  invite_reports_to uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_org_id uuid;
  current_user_role text;
  new_id uuid;
BEGIN
  -- Check Permissions (Owner, Admin, Manager, Coordinator)
  SELECT role INTO current_user_role FROM profiles WHERE id = auth.uid();
  
  -- UPDATE: Added 'coordinator' to the allowed roles
  IF current_user_role NOT IN ('owner', 'admin', 'manager', 'coordinator') THEN
    RAISE EXCEPTION 'Insufficient permissions to invite users.';
  END IF;

  -- Get Org ID
  SELECT organization_id INTO current_org_id FROM profiles WHERE id = auth.uid();

  INSERT INTO team_invitations (
    email,
    role,
    status,
    organization_id,
    invited_by,
    token,
    reports_to -- Persist hierarchy
  ) VALUES (
    invite_email,
    invite_role,
    'pending', 
    current_org_id,
    auth.uid(),
    gen_random_uuid()::text,
    invite_reports_to
  ) RETURNING id INTO new_id;

  RETURN json_build_object('id', new_id, 'status', 'pending');
END;
$$;
