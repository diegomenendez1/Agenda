BEGIN;

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    owner_id uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Create Team Invitations (Safe check)
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    role text,
    status text DEFAULT 'pending',
    invited_by uuid REFERENCES auth.users(id),
    token text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Add necessary columns if they don't exist
ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.team_invitations 
ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id);

-- 3. Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 4. Create Member Junction
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'member', -- owner, admin, member
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 5. Fix Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  invite_record record;
  new_org_id uuid;
BEGIN
  -- Check for pending invitation
  SELECT * INTO invite_record 
  FROM team_invitations 
  WHERE email = new.email 
  AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
      -- Accepted Invite
      insert into public.profiles (id, email, full_name, avatar_url, organization_id, role, reports_to)
      values (
          new.id, 
          new.email, 
          new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'avatar_url',
          invite_record.organization_id,
          invite_record.role,
          invite_record.reports_to
      );

      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (invite_record.organization_id, new.id, invite_record.role)
      ON CONFLICT DO NOTHING;

      UPDATE team_invitations SET status = 'accepted' WHERE id = invite_record.id;
  ELSE
      -- No Invite: Create Personal Workspace
      INSERT INTO public.organizations (name, owner_id)
      VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'My') || '''s Workspace', new.id)
      RETURNING id INTO new_org_id;

      insert into public.profiles (id, email, full_name, avatar_url, organization_id, role)
      values (
          new.id, 
          new.email, 
          new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'avatar_url',
          new_org_id,
          'owner'
      );

      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (new_org_id, new.id, 'owner');
  END IF;

  return new;
END;
$$ language plpgsql security definer;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
