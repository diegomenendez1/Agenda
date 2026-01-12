-- Add ON DELETE CASCADE to team_memberships foreign keys
-- This ensures that if a user is deleted, their memberships are cleaned up automatically

-- 1. Drop existing constraints if they exist (need to know names or check dynamically)
-- Usually named 'team_memberships_manager_id_fkey' and 'team_memberships_member_id_fkey'

ALTER TABLE public.team_memberships
DROP CONSTRAINT IF EXISTS team_memberships_manager_id_fkey,
DROP CONSTRAINT IF EXISTS team_memberships_member_id_fkey;

ALTER TABLE public.team_memberships
ADD CONSTRAINT team_memberships_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE,
ADD CONSTRAINT team_memberships_member_id_fkey 
  FOREIGN KEY (member_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- Also ensure notifications and activity_logs have cascades (some already do, but verifying)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
