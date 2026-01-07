-- ==============================================================================
-- SECURITY REMEDIATION SCRIPT (FIX VULN-01, VULN-02, VULN-03)
-- "De pies a cabeza" Audit Fixes
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- HELPER: Secure Admin Check (Avoids Recursion)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean AS $$
BEGIN
  -- Returns true if the current user has the 'owner' or 'admin' role in profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- FIX VULN-01: Privacy Lockdown (Brecha de Privacidad)
-- ------------------------------------------------------------------------------
-- OLD: "Public Profiles Access" allowed everyone to see everyone.
-- NEW: 
-- 1. Owners/Admins see ALL.
-- 2. Regular users see THEMSELVES.
-- 3. (Optional future proofing) Regular users could see people they share tasks with (not implemented here to strict lockdown).

DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Owner Manage Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Profiles Visibility: Self" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
);

CREATE POLICY "Profiles Visibility: Admin" ON public.profiles
FOR SELECT USING (
  public.is_app_admin() = true
);

CREATE POLICY "Profiles Update: Owner Only" ON public.profiles
FOR UPDATE USING (
  public.is_app_admin() = true -- Strictly, maybe only Owner, but Admin is acceptable for "Management"
);

-- ------------------------------------------------------------------------------
-- FIX VULN-02 & VULN-03: Task Security & Schema Mismatch
-- ------------------------------------------------------------------------------
-- 1. Ensure the column exists before creating policies (VULN-03 Fix)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_ids text[] DEFAULT '{}';

-- Optional: Migrate data if singular assignee_id exists and has data
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assignee_id') THEN
        UPDATE public.tasks SET assignee_ids = ARRAY[assignee_id::text] 
        WHERE assignee_id IS NOT NULL AND (assignee_ids IS NULL OR assignee_ids = '{}');
    END IF;
END $$;

-- DROP OLD POLICIES
DROP POLICY IF EXISTS "Task Collaboration Policy" ON public.tasks;
DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team Access Policy" ON public.tasks;
DROP POLICY IF EXISTS "Task View Policy" ON public.tasks;
DROP POLICY IF EXISTS "Task Owner Control" ON public.tasks;
DROP POLICY IF EXISTS "Task Assignee Update" ON public.tasks;

-- POLICY 1: VIEW (Who can see a task?)
-- - Owner (Creator)
-- - Assignees (Checking the ARRAY column 'assignee_ids', fixing VULN-03)
-- - Team Members (via 'visibility' flag or Shared Project)
CREATE POLICY "Task View Policy" ON public.tasks
FOR SELECT USING (
  auth.uid() = user_id 
  OR
  auth.uid()::text = ANY(assignee_ids)
  OR
  visibility = 'team'
  OR
  project_id IN (
    SELECT id FROM public.projects 
    WHERE visibility = 'team' OR auth.uid()::text = ANY(members)
  )
  OR
  public.is_app_admin() = true -- Admins should see all tasks for auditing
);

-- POLICY 2: FULL CONTROL (Owner Only)
-- - Can Delete, Insert, Update everything
CREATE POLICY "Task Owner Control" ON public.tasks
FOR ALL USING (
  auth.uid() = user_id
);

-- POLICY 3: COLLABORATION (Assignees)
-- - Can UPDATE specific things (Status, Notes)
-- - CANNOT DELETE (VULN-02 Fix)
CREATE POLICY "Task Assignee Update" ON public.tasks
FOR UPDATE USING (
  auth.uid()::text = ANY(assignee_ids)
);

-- ------------------------------------------------------------------------------
-- TRIGGER: Prevent Privilege Escalation (The "Colaborador" Risk)
-- ------------------------------------------------------------------------------
-- Even with "Task Assignee Update", an assignee could maliciously change the 'assignee_ids' 
-- to invite others or 'project_id' to move it.
-- This trigger locks down critical columns for non-owners.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_task_changes()
RETURNS trigger AS $$
BEGIN
  -- If the user is NOT the owner
  IF auth.uid() != OLD.user_id THEN
    -- Prevent changing the Owner
    IF NEW.user_id != OLD.user_id THEN
      RAISE EXCEPTION 'Only the Owner can transfer task ownership.';
    END IF;

    -- Prevent changing Assignees (Privilege Escalation)
    IF NEW.assignee_ids IS DISTINCT FROM OLD.assignee_ids THEN
       RAISE EXCEPTION 'Only the Owner can manage assignees.';
    END IF;

    -- Prevent changing Project (Scope change)
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
       RAISE EXCEPTION 'Only the Owner can move tasks between projects.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_task_fields ON public.tasks;
CREATE TRIGGER trg_protect_task_fields
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_task_changes();


COMMIT;
