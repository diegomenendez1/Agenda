-- Enable pgcrypto if not already enabled (usually is by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to allow Admin/Owner to manually set a user's password
-- This effectively allows "Taking Control" of the account
CREATE OR REPLACE FUNCTION admin_reset_password_by_owner(target_user_id uuid, new_password text)
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
    RAISE EXCEPTION 'Unauthorized: Only admins or owners can manage user credentials.';
  END IF;

  -- Prevent resetting owner's password by another admin (optional safeguard)
  -- Maybe only Owners can reset other Owners.
  -- For now, simple check:
  
  -- Update the user's password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  -- Update updated_at
  UPDATE auth.users
  SET updated_at = now()
  WHERE id = target_user_id;

END;
$$;
