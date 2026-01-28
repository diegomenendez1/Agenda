
-- FIX INVITATION LOGIC & HIERARCHY PERSISTENCE
-- 1. Add `reports_to` to invitations
-- 2. Update invite RPC to support Managers & ReportsTo
-- 3. Update User Trigger to auto-link hierarchy on SignUp

BEGIN;

-- 1. Add Column
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES profiles(id);

-- 2. Update invite_user_direct signature and logic
DROP FUNCTION IF EXISTS invite_user_direct(text, text); -- Drop old signature

-- Create new signature with optional reports_to
CREATE OR REPLACE FUNCTION invite_user_direct(
    invite_email text, 
    invite_role text, 
    invite_reports_to uuid DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_org_id uuid;
  current_user_role text;
  new_id uuid;
BEGIN
  -- Check Permissions (Owner, Admin, Manager)
  SELECT role INTO current_user_role FROM profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('owner', 'admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to invite users.';
  END IF;

  -- Get Org ID (Managers might need to use their own org)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update handle_new_user to process invitations
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_record record;
BEGIN
  -- Check for pending invitation by email
  SELECT * INTO invite_record 
  FROM team_invitations 
  WHERE email = new.email 
  AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
      -- Found invite: Use its data
      insert into public.profiles (
          id, 
          email, 
          full_name, 
          avatar_url, 
          organization_id, 
          role, 
          reports_to -- LINK HIERARCHY
      )
      values (
          new.id, 
          new.email, 
          new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'avatar_url',
          invite_record.organization_id, -- Join Org
          invite_record.role,            -- Assigned Role
          invite_record.reports_to       -- Assigned Manager
      );

      -- Add to organization_members for RLS consistency
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (invite_record.organization_id, new.id, invite_record.role)
      ON CONFLICT DO NOTHING;

      -- Mark invitation as accepted
      UPDATE team_invitations 
      SET status = 'accepted' 
      WHERE id = invite_record.id;
  ELSE
      -- No invite: Create default profile (Solo)
      insert into public.profiles (id, email, full_name, avatar_url)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  END IF;

  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMIT;
