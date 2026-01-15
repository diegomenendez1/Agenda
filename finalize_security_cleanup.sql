-- FINAL SECURITY CLEANUP: DROP ALL LEAKING POLICIES IDENTIFIED IN AUDIT

-- ==============================================================================
-- 1. PROFILES (The "My Team" Leak)
-- ==============================================================================
-- Leak: "Authenticated users can view profiles" -> TRUE
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
-- Leak: "Public profiles are visible to everyone" -> TRUE
DROP POLICY IF EXISTS "Public profiles are visible to everyone" ON public.profiles;

-- Ensure Strict Policy
DROP POLICY IF EXISTS "Org Isolated Profiles" ON public.profiles;
CREATE POLICY "Org Isolated Profiles" ON public.profiles
FOR SELECT USING (
    organization_id = public.get_my_org_id()
);


-- ==============================================================================
-- 2. TASKS (The "My Tasks" Leak)
-- ==============================================================================
-- Leak: "Team Access" -> visibility='team' (GLOBAL)
DROP POLICY IF EXISTS "Team Access" ON public.tasks;

-- Leak: "Tasks visibility" -> visibility='team' OR assignee...
DROP POLICY IF EXISTS "Tasks visibility" ON public.tasks;

-- Leak: "Task View Policy" -> (probably old one)
DROP POLICY IF EXISTS "Task View Policy" ON public.tasks;

-- Leak: "Private Access" -> (probably old one, replace with org logic)
DROP POLICY IF EXISTS "Private Access" ON public.tasks;

-- Cleanup partials
DROP POLICY IF EXISTS "Org Isolated Task Modification" ON public.tasks;

-- Ensure Strict Policies (Re-apply to be sure)
DROP POLICY IF EXISTS "Org Isolated Task View" ON public.tasks;
CREATE POLICY "Org Isolated Task View" ON public.tasks FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Org Isolated Task Edit" ON public.tasks;
CREATE POLICY "Org Isolated Task Edit" ON public.tasks FOR ALL USING (organization_id = public.get_my_org_id());


-- ==============================================================================
-- 3. PROJECTS
-- ==============================================================================
-- Cleanup just in case
DROP POLICY IF EXISTS "Project Owner Control" ON public.projects;

-- Ensure Strict Policies
DROP POLICY IF EXISTS "Org Isolated Project View" ON public.projects;
CREATE POLICY "Org Isolated Project View" ON public.projects FOR SELECT USING (organization_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Org Isolated Project Edit" ON public.projects;
CREATE POLICY "Org Isolated Project Edit" ON public.projects FOR ALL USING (organization_id = public.get_my_org_id());

-- ==============================================================================
-- 4. VERIFICATION HELPER
-- ==============================================================================
-- We rely on the SQL query in previous steps to confirm via tool output.
