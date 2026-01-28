BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public -- Force search path
AS $$
DECLARE
  invite_record record;
  new_org_id uuid;
BEGIN
  -- Check for pending invitation
  SELECT * INTO invite_record 
  FROM public.team_invitations 
  WHERE email = new.email 
  AND status = 'pending'
  ORDER BY created_at DESC 
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
      -- Accepted Invite
      INSERT INTO public.profiles (id, email, full_name, avatar_url, organization_id, role, reports_to)
      VALUES (
          new.id, 
          new.email, 
          new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'avatar_url',
          invite_record.organization_id,
          invite_record.role,
          invite_record.reports_to
      );

      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (invite_record.organization_id, new.id, invite_record.role)
      ON CONFLICT DO NOTHING;

      UPDATE public.team_invitations SET status = 'accepted' WHERE id = invite_record.id;
  ELSE
      -- No Invite: Create Personal Workspace
      INSERT INTO public.organizations (name, owner_id)
      VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'My') || '''s Workspace', new.id)
      RETURNING id INTO new_org_id;

      INSERT INTO public.profiles (id, email, full_name, avatar_url, organization_id, role)
      VALUES (
          new.id, 
          new.email, 
          new.raw_user_meta_data->>'full_name', 
          new.raw_user_meta_data->>'avatar_url',
          new_org_id,
          'owner'
      );

      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (new_org_id, new.id, 'owner');
  END IF;

  RETURN new;
END;
$$;

COMMIT;
