-- ROLE HIERARCHY REFACTOR (BACKEND)

-- 1. Map existing roles to new hierarchy in public.profiles
UPDATE public.profiles SET role = 'head' WHERE role = 'admin';
UPDATE public.profiles SET role = 'lead' WHERE role = 'manager';
UPDATE public.profiles SET role = 'member' WHERE role = 'coordinator';

-- 2. Map existing roles in team_invitations (V2 system)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_invitations' AND table_schema = 'public') THEN
        UPDATE public.team_invitations SET role = 'head' WHERE role = 'admin';
        UPDATE public.team_invitations SET role = 'lead' WHERE role = 'manager';
        UPDATE public.team_invitations SET role = 'member' WHERE role = 'coordinator';
    END IF;
END $$;

-- 3. Update helper function for admin checks
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'head')
  );
$$;

-- 4. Update Hierarchical Visibility for tasks
DROP POLICY IF EXISTS "Hierarchical Task Visibility" ON public.tasks;

CREATE POLICY "Hierarchical Task Visibility" ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id -- Dueño
  OR (assignee_ids @> ARRAY[auth.uid()::text]) -- Asignado
  OR (visibility = 'team') -- Equipo
  OR (public.is_manager_of(auth.uid(), user_id)) -- Manager Directo o Indirecto
  OR (
    -- Los Heads/Owners pueden ver tareas en estado 'review' de cualquier usuario
    status = 'review' 
    AND public.is_org_admin()
  )
);

-- 5. Update invite_user_direct RPC to include Lead role for direct invites
CREATE OR REPLACE FUNCTION public.invite_user_direct(
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
  -- Check Permissions (Owner, Head, Lead)
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('owner', 'head', 'lead') THEN
    RAISE EXCEPTION 'Insufficient permissions to invite users.';
  END IF;

  -- Get Org ID
  SELECT organization_id INTO current_org_id FROM public.profiles WHERE id = auth.uid();

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_invitations' AND table_schema = 'public') THEN
      INSERT INTO public.team_invitations (
        email,
        role,
        status,
        organization_id,
        invited_by,
        token,
        reports_to
      ) VALUES (
        invite_email,
        invite_role,
        'pending', 
        current_org_id,
        auth.uid(),
        gen_random_uuid()::text,
        invite_reports_to
      ) RETURNING id INTO new_id;
  ELSE
      RAISE EXCEPTION 'Invitation system (v2) not found.';
  END IF;

  RETURN json_build_object('id', new_id, 'status', 'pending');
END;
$$;

-- 6. Update delete_user_by_admin RPC to include 'head'
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  SELECT role INTO requesting_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if the requester is an head or owner
  IF requesting_user_role NOT IN ('owner', 'head') THEN
    RAISE EXCEPTION 'Unauthorized: Only heads or owners can delete users.';
  END IF;

  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account from here.';
  END IF;

  DELETE FROM public.notes WHERE user_id = target_user_id;
  DELETE FROM public.inbox_items WHERE user_id = target_user_id;
  DELETE FROM public.tasks WHERE user_id = target_user_id;
  DELETE FROM public.projects WHERE user_id = target_user_id;
  DELETE FROM public.team_members WHERE user_id = target_user_id;
  DELETE FROM public.habits WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.team_memberships WHERE manager_id = target_user_id OR member_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 7. Update admin_reset_password_by_owner RPC
CREATE OR REPLACE FUNCTION public.admin_reset_password_by_owner(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_org_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only heads or owners can manage user credentials.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

-- 8. Update check constraint on public.profiles role
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'head', 'lead', 'member'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update role check constraint.';
END $$;
