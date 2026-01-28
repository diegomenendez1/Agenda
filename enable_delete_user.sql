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

  -- Prevent deleting yourself
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account from here.';
  END IF;

  -- Unlink Profile from Organizations (Circular Dependency Break)
  -- 1. Unlink the user's OWN profile from any organization (in case they are viewing one)
  UPDATE public.profiles SET organization_id = NULL WHERE id = target_user_id;
  
  -- 2. Unlink OTHER profiles that might be viewing the organization we are about to delete
  UPDATE public.profiles 
  SET organization_id = NULL 
  WHERE organization_id IN (SELECT id FROM public.organizations WHERE owner_id = target_user_id);

  -- Delete data from related tables
  DELETE FROM public.notes WHERE user_id = target_user_id;
  DELETE FROM public.inbox_items WHERE user_id = target_user_id;
  DELETE FROM public.tasks WHERE user_id = target_user_id;
  DELETE FROM public.projects WHERE user_id = target_user_id;
  DELETE FROM public.habits WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.activity_logs WHERE user_id = target_user_id;

  -- Clean up Storage (Avatars, File Attachments)
  -- Uses the storage schema directly to remove files owned by the user
  DELETE FROM storage.objects WHERE owner = target_user_id;
  
  -- Delete Team Memberships
  DELETE FROM public.team_memberships WHERE manager_id = target_user_id OR member_id = target_user_id;
  
  -- Delete Organizations owned by the user
  DELETE FROM public.organizations WHERE owner_id = target_user_id;

  -- Delete the profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
