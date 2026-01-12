-- Function to allow Admin/Owner to delete a user and all their data
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user_role text;
BEGIN
  -- Get the role of the user making the request
  SELECT role INTO requesting_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if the requester is an admin or owner
  IF requesting_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins or owners can delete users.';
  END IF;

  -- Prevent deleting yourself (optional, but good practice)
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account from here.';
  END IF;

  -- Delete data from related tables
  -- (Assuming foreign keys might not be set to CASCADE, we delete explicitly to be safe)
  DELETE FROM public.notes WHERE user_id = target_user_id;
  DELETE FROM public.inbox_items WHERE user_id = target_user_id;
  DELETE FROM public.tasks WHERE user_id = target_user_id;
  DELETE FROM public.projects WHERE user_id = target_user_id;
  DELETE FROM public.team_members WHERE user_id = target_user_id;
  DELETE FROM public.habits WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- Delete Team Memberships (where they are either manager or member)
  DELETE FROM public.team_memberships WHERE manager_id = target_user_id OR member_id = target_user_id;
  
  -- Delete the profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Finally, delete from auth.users
  -- This requires the function to be SECURITY DEFINER to access auth schema
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
