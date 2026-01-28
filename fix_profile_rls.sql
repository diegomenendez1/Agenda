-- Fix Profiles RLS to ensure users can always see themselves
BEGIN;

-- 1. Ensure RLS is enabled (should be already)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting or restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "View own profile" ON public.profiles;

-- 3. Create the permissive policy for OWN profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING ( auth.uid() = id );

-- 4. Create policy for UPDATING own profile (needed for onboarding likely)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- 5. Diagnostic: Check if profile exists (will show in SQL Editor output)
DO $$
DECLARE
    target_email TEXT := 'diegomenendez1@gmail.com';
    count_profiles INT;
BEGIN
    SELECT COUNT(*) INTO count_profiles
    FROM public.profiles
    WHERE email = target_email;
    
    RAISE NOTICE 'Profile count for %: %', target_email, count_profiles;
END $$;

COMMIT;
