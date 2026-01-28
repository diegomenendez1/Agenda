-- CRITICAL PRIVACY FIX
-- 1. Audits and cleans up invalid organization access.
-- 2. Hardens get_my_org_id() to enforce strict membership checks.

BEGIN;

-- 1. HARDENED HELPER FUNCTION
-- This is the "Digital Lock". It replaces the naive function.
-- It only returns an ID if the user is the VERIFIED owner or a CONFIRMED member.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid 
LANGUAGE sql 
STABLE
SECURITY DEFINER
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  -- Join to check real ownership
  LEFT JOIN public.organizations o ON p.organization_id = o.id
  WHERE p.id = auth.uid()
  AND (
      -- CASE A: User is the direct owner of the organization
      o.owner_id = auth.uid()
      OR 
      -- CASE B: User has an ACCEPTED invitation for this organization
      EXISTS (
        SELECT 1 FROM public.team_invitations i
        WHERE i.email = p.email 
        AND i.organization_id = p.organization_id
        AND i.status = 'accepted'
      )
  );
$$;

-- 2. DATA CLEANUP (The Purge)
-- Remove organization_id from profiles that do not meet the criteria.
-- This ensures the Frontend doesn't try to load a team the user can't see.

UPDATE public.profiles p
SET organization_id = NULL,
    role = 'user' -- Reset role to basic user if they are kicked out
WHERE 
    p.organization_id IS NOT NULL
    AND NOT EXISTS (
        -- Is Owner?
        SELECT 1 FROM public.organizations o 
        WHERE o.id = p.organization_id AND o.owner_id = p.id
    )
    AND NOT EXISTS (
        -- Is Accepted Member?
        SELECT 1 FROM public.team_invitations Ti 
        WHERE Ti.email = p.email 
        AND Ti.organization_id = p.organization_id 
        AND Ti.status = 'accepted'
    );

-- 3. RE-VERIFY RLS POLICIES
-- Ensure critical tables use the new hardened function.
-- (This is redundant if they already call get_my_org_id(), but safe to ensure)

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their own org" ON public.organizations;
CREATE POLICY "Members can view their own org" ON public.organizations
FOR SELECT USING (
    id = public.get_my_org_id()
);

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org Members View Profiles" ON public.profiles;
CREATE POLICY "Org Members View Profiles" ON public.profiles
FOR SELECT USING (
    organization_id = public.get_my_org_id() 
    OR id = auth.uid() -- Always see self
);

-- Tasks
-- (Assuming tasks already uses get_my_org_id() from previous scripts, but let's be sure)
-- If the previous policies are utilizing the function, they are now automatically hardened.

COMMIT;
