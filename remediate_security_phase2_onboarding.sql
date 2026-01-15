-- PHASE 2: ONBOARDING SECURITY PERMISSIONS

-- 1. Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create orgs" ON public.organizations
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    owner_id = auth.uid()
);

-- 2. Allow users to update their own profile (specifically organization_id)
-- We need to check existing policies on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (
    id = auth.uid()
);

-- 3. Trigger to Auto-Assign Organization Owner? 
-- Not strictly needed if we handle it in frontend/RPC.
-- But let's create a Helper RPC to "create_organization_for_user" to be transactional and safe.

CREATE OR REPLACE FUNCTION public.create_new_organization(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id uuid;
BEGIN
    -- 1. Create Org
    INSERT INTO public.organizations (name, owner_id)
    VALUES (org_name, auth.uid())
    RETURNING id INTO new_org_id;

    -- 2. Update Profile
    UPDATE public.profiles
    SET organization_id = new_org_id,
        role = 'owner' -- The creator is the owner
    WHERE id = auth.uid();

    RETURN new_org_id;
END;
$$;
