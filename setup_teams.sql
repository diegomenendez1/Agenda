-- Create team_memberships table
create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.profiles(id) not null,
  member_id uuid references public.profiles(id) not null,
  status text not null default 'pending', -- 'pending', 'active'
  created_at timestamptz default now(),
  unique(manager_id, member_id)
);

-- Enable RLS
alter table public.team_memberships enable row level security;

-- Policies
create policy "Users can view their own memberships"
  on public.team_memberships for select
  using (auth.uid() = manager_id or auth.uid() = member_id);

create policy "Admins/Owners can insert memberships for themselves"
  on public.team_memberships for insert
  with check (auth.uid() = manager_id);

create policy "Users can update their own status (accept/reject)"
  on public.team_memberships for update
  using (auth.uid() = member_id or auth.uid() = manager_id);

-- Helper function to invite user
CREATE OR REPLACE FUNCTION invite_user_to_team(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name text;
BEGIN
  -- Check if already exists
  IF EXISTS (SELECT 1 FROM public.team_memberships WHERE manager_id = auth.uid() AND member_id = target_user_id) THEN
    -- If it exists and is pending, just re-notify? Or error?
    -- For now, simplify: do nothing if exists
    RETURN;
  END IF;

  -- Insert Membership
  INSERT INTO public.team_memberships (manager_id, member_id, status)
  VALUES (auth.uid(), target_user_id, 'pending');

  -- Get Sender Name
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = auth.uid();

  -- Create Notification for Target
  INSERT INTO public.notifications (user_id, type, title, message, link, read)
  VALUES (
    target_user_id,
    'system',
    'Team Invitation',
    sender_name || ' has invited you to join their team.',
    '/settings', -- They will accept in UserProfile (settings)
    false
  );
END;
$$;

-- Helper function to accept/reject
CREATE OR REPLACE FUNCTION respond_to_team_invite(membership_id uuid, accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_manager_id uuid;
  v_member_name text;
BEGIN
  -- Get membership details
  SELECT manager_id, member_id INTO v_manager_id
  FROM public.team_memberships
  WHERE id = membership_id;

  -- Verify auth (user must be the member)
  IF NOT EXISTS (SELECT 1 FROM public.team_memberships WHERE id = membership_id AND member_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF accept THEN
    UPDATE public.team_memberships SET status = 'active' WHERE id = membership_id;
    
    -- Notify Manager
    SELECT full_name INTO v_member_name FROM public.profiles WHERE id = auth.uid();
    
    INSERT INTO public.notifications (user_id, type, title, message, read)
    VALUES (
      v_manager_id,
      'system',
      'Invitation Accepted',
      v_member_name || ' accepted your team invitation.',
      false
    );
  ELSE
    DELETE FROM public.team_memberships WHERE id = membership_id;
    -- Optionally notify manager of rejection
  END IF;
END;
$$;
