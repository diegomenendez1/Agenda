-- ENABLE MULTI-WORKSPACE SUPPORT
-- 1. Create organization_members table for Many-to-Many relationship
-- 2. Migrate existing profile connections
-- 3. Update Policies to respect membership

BEGIN;

-- 1. CREATE MEMBERSHIP TABLE
CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text DEFAULT 'member', -- owner, admin, member, observer
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 2. BACKFILL (Migrate current "Active" org to a permanent membership)
-- Insert everyone who is currently linked in profiles
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT p.organization_id, p.id, COALESCE(p.role, 'member')
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role; 
-- (Conflict handling just in case, though technically new table should be empty)

-- Also ensure Owners are in their orgs
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organizations o
WHERE o.owner_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;


-- 3. UPDATE HELPERS & POLICIES
-- NOTE: profiles.organization_id now means "CURRENTLY SELECTED WORKSPACE".
-- It acts as a session variable stored in DB.

-- Helper: Get list of my orgs (for UI)
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS TABLE (org_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
$$;

-- Helper: Get Safe Current Org ID
-- Replaces previous logic. Returns profile.organization_id ONLY IF user is a member.
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid 
LANGUAGE sql 
STABLE
SECURITY DEFINER
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  JOIN public.organization_members om ON om.user_id = p.id AND om.organization_id = p.organization_id
  WHERE p.id = auth.uid()
$$;

-- 4. RLS UPDATES
-- Members can view their memberships
CREATE POLICY "View own memberships" ON public.organization_members
FOR SELECT USING (user_id = auth.uid());

-- RLS policies for core tables (Tasks, Projects, etc) remain valid 
-- because they rely on `get_my_org_id()`, which we just updated 
-- to verify against the new `organization_members` table.

-- 5. RPC: Switch Workspace
-- Allows user to change their "Active" workspace
CREATE OR REPLACE FUNCTION public.switch_workspace(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify membership
    IF NOT EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE user_id = auth.uid() AND organization_id = target_org_id
    ) THEN
        RAISE EXCEPTION 'Access Denied: Not a member of this workspace';
    END IF;

    -- Update Profile (Session State)
    UPDATE public.profiles
    SET organization_id = target_org_id
    WHERE id = auth.uid();

    RETURN true;
END;
$$;

COMMIT;
