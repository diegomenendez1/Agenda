-- CRITICAL SECURITY FIX: DROP LEAKING RLS POLICIES (IDEMPOTENT)

-- 1. TASKS
DROP POLICY IF EXISTS "Hierarchical Task Visibility" ON public.tasks;
DROP POLICY IF EXISTS "Task Collaboration Policy" ON public.tasks; 
DROP POLICY IF EXISTS "Org Isolated Task View" ON public.tasks; -- Drop ours to recreate
DROP POLICY IF EXISTS "Org Isolated Task Edit" ON public.tasks;

CREATE POLICY "Org Isolated Task View" ON public.tasks FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Org Isolated Task Edit" ON public.tasks FOR ALL USING (organization_id = public.get_my_org_id());

-- 2. PROJECTS
DROP POLICY IF EXISTS "Project Team View" ON public.projects;
DROP POLICY IF EXISTS "Project View Policy" ON public.projects; 
DROP POLICY IF EXISTS "Org Isolated Project View" ON public.projects;
DROP POLICY IF EXISTS "Org Isolated Project Edit" ON public.projects;

CREATE POLICY "Org Isolated Project View" ON public.projects FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Org Isolated Project Edit" ON public.projects FOR ALL USING (organization_id = public.get_my_org_id());

-- 3. NOTES
DROP POLICY IF EXISTS "Note Collaboration Policy" ON public.notes;
DROP POLICY IF EXISTS "Org Isolated Note View" ON public.notes;
DROP POLICY IF EXISTS "Org Isolated Note Edit" ON public.notes;

CREATE POLICY "Org Isolated Note View" ON public.notes FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Org Isolated Note Edit" ON public.notes FOR ALL USING (organization_id = public.get_my_org_id());

-- 4. INBOX ITEMS
DROP POLICY IF EXISTS "Inbox Access" ON public.inbox_items;
DROP POLICY IF EXISTS "Org Isolated Inbox" ON public.inbox_items;

CREATE POLICY "Org Isolated Inbox" ON public.inbox_items FOR ALL USING (organization_id = public.get_my_org_id());

-- 5. NOTIFICATIONS
DROP POLICY IF EXISTS "Notification Access" ON public.notifications;
DROP POLICY IF EXISTS "Org Isolated Notifications" ON public.notifications;

CREATE POLICY "Org Isolated Notifications" ON public.notifications FOR ALL USING (organization_id = public.get_my_org_id());
