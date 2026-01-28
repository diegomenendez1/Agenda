-- SECURITY REMEDIATION: MULTI-TENANCY ISOLATION
-- This script transforms the database into a multi-tenant system.

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    owner_id uuid REFERENCES auth.users(id)
);

-- 2. Create Default Organization for Existing Data (Prevent Data Loss)
-- We insert a default org if none exists
DO $$ 
DECLARE 
    default_org_id uuid;
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1) THEN
        INSERT INTO public.organizations (name, owner_id)
        VALUES ('Default Organization', auth.uid()) -- Owner will be null if run by system, handling below
        RETURNING id INTO default_org_id;
    ELSE
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    END IF;

    -- Store it in a temp variable for subsequent ALTERs if needed, 
    -- but usually we just set the default on the column directly first.
END $$;


-- 3. Add organization_id to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Backfill Profiles: Assign all existing profiles to the first found organization
UPDATE public.profiles 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;


-- 4. Add organization_id to Core Tables
-- TASKS
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.tasks 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.tasks ALTER COLUMN organization_id SET NOT NULL; -- Enforce it after backfill


-- PROJECTS
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.projects 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.projects ALTER COLUMN organization_id SET NOT NULL;


-- NOTES
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.notes 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.notes ALTER COLUMN organization_id SET NOT NULL;


-- INBOX ITEMS
ALTER TABLE public.inbox_items 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.inbox_items 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.inbox_items ALTER COLUMN organization_id SET NOT NULL;


-- NOTIFICATIONS
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

UPDATE public.notifications 
SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.notifications ALTER COLUMN organization_id SET NOT NULL;


-- TEAM INVITATIONS
-- Existing table might be 'team_invitations' or likely we just created invite logic in store without a table?
-- Let's check if the table exists. If so, update it.
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_invitations') THEN
        ALTER TABLE public.team_invitations 
        ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
        
        UPDATE public.team_invitations 
        SET organization_id = (SELECT id FROM public.organizations LIMIT 1)
        WHERE organization_id IS NULL;
    END IF;
END $$;


-- 5. FUNCTION to get current user's organization
-- This helper function makes RLS policies cleaner and faster
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid 
LANGUAGE sql 
SECURITY DEFINER -- Runs with privs of creator (admin) to ensure it can read profiles safely
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;


-- 6. UPDATE RLS POLICIES [THE CRITICAL FIX]

-- Enable RLS on Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own org" ON public.organizations;
CREATE POLICY "Members can view their own org" ON public.organizations
FOR SELECT USING (
    id = public.get_my_org_id()
);


-- PROFILES (Critical for listing team members)
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Org Members View Profiles" ON public.profiles;

CREATE POLICY "Org Members View Profiles" ON public.profiles
FOR SELECT USING (
    organization_id = public.get_my_org_id() 
    -- OR id = auth.uid() -- Users can always see themselves (covered by get_my_org_id usually, but safety net)
);

-- PROJECTS
DROP POLICY IF EXISTS "Project View Policy" ON public.projects;
DROP POLICY IF EXISTS "Project Edit Policy" ON public.projects;

CREATE POLICY "Org Isolated Project View" ON public.projects
FOR SELECT USING (
    organization_id = public.get_my_org_id() AND (
        visibility = 'team' OR 
        visibility = 'public' OR -- 'public' here implies 'organization-wide public' not world public
        auth.uid() = user_id OR
        auth.uid()::text = ANY(members)
    )
);

CREATE POLICY "Org Isolated Project Edit" ON public.projects
FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
);

CREATE POLICY "Org Isolated Project Update" ON public.projects
FOR UPDATE USING (
    organization_id = public.get_my_org_id() AND (
        auth.uid() = user_id OR 
        auth.uid()::text = ANY(members)
    )
);

-- TASKS
DROP POLICY IF EXISTS "Task Collaboration Policy" ON public.tasks;

CREATE POLICY "Org Isolated Task View" ON public.tasks
FOR SELECT USING (
    organization_id = public.get_my_org_id() AND (
        auth.uid() = user_id OR
        assignee_id = auth.uid()::text OR
        visibility = 'team' OR
        EXISTS ( -- Check if it belongs to a project the user can see
            SELECT 1 FROM public.projects 
            WHERE id = tasks.project_id 
            AND organization_id = public.get_my_org_id()
            AND (visibility = 'team' OR auth.uid()::text = ANY(members))
        )
    )
);

CREATE POLICY "Org Isolated Task Modification" ON public.tasks
FOR ALL USING (
     organization_id = public.get_my_org_id() AND (
        auth.uid() = user_id OR 
        assignee_id = auth.uid()::text OR
        visibility = 'team' -- Allow team edits if shared? Or stricter? Keeping permissive-team for now.
     )
);


-- NOTES
DROP POLICY IF EXISTS "Note Collaboration Policy" ON public.notes;

CREATE POLICY "Org Isolated Note View" ON public.notes
FOR SELECT USING (
    organization_id = public.get_my_org_id()
);

CREATE POLICY "Org Isolated Note Edit" ON public.notes
FOR ALL USING (
    organization_id = public.get_my_org_id() AND user_id = auth.uid()
);

