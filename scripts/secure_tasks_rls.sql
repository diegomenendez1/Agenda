
-- SECURE TASKS RLS MIGRATION
-- This script replaces permissive Organizaton-wide policies with Strict Hierarchy RLS.

BEGIN;

-- 1. Helper Function: Is Admin or Owner?
CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS BOOLEAN AS $$
DECLARE
    _role text;
BEGIN
    SELECT role INTO _role FROM profiles WHERE id = auth.uid();
    RETURN _role = 'admin' OR _role = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Is Manager Of (Recursive)
-- Returns true if 'target_user_id' reports to 'manager_user_id' (directly or indirectly)
CREATE OR REPLACE FUNCTION is_manager_of(manager_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    _reports_to UUID;
BEGIN
    -- Optimization: 1-level check first
    SELECT reports_to INTO _reports_to FROM profiles WHERE id = target_user_id;
    IF _reports_to = manager_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- If top level or no manager, false
    IF _reports_to IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Recursive Step (limited depth for safety)
    -- Actually, simpler: Does target_user_id have manager_user_id in their ancestry?
    -- To do this efficiently in RLS, we want to avoid deep recursion per row.
    -- Alternative: Just check Organization Owner/Admin status for global view, 
    -- and check 'reports_to' for direct manager view.
    -- Deep hierarchy support in RLS can be expensive.
    -- Current requirement: "Managers can see all tasks of their direct reports." (UI says Direct Reports).
    -- But UI `MyTeamView` calculates descendants.
    
    -- Let's stick to DIRECT REPORTS first to ensure performance, or implement a small recursive CTE.
    RETURN (
        WITH RECURSIVE hierarchy AS (
            SELECT id, reports_to FROM profiles WHERE id = target_user_id
            UNION ALL
            SELECT p.id, p.reports_to FROM profiles p
            INNER JOIN hierarchy h ON h.reports_to = p.id
        )
        SELECT EXISTS (SELECT 1 FROM hierarchy WHERE reports_to = manager_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. DROP Unsafe Policies
DROP POLICY IF EXISTS "Org Isolated Task View" ON tasks;
DROP POLICY IF EXISTS "Org Isolated Task Edit" ON tasks;
DROP POLICY IF EXISTS "Team Access Policy" ON tasks; -- We will replace this
DROP POLICY IF EXISTS "Task Owner Control" ON tasks;
DROP POLICY IF EXISTS "Task Assignee Update" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update relevant tasks" ON tasks;

-- 4. CREATE Strict Policies

-- A. SELECT (View)
-- 1. Admin/Owner: See ALL in Org
-- 2. Owner: See Own
-- 3. Assignee: See Assigned
-- 4. Manager: See Descendants' tasks
CREATE POLICY "Strict Task View" ON tasks
FOR SELECT
USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) -- Must be same org
    AND (
        auth.uid() = ownerId -- My task
        OR (assigneeIds::text[] @> ARRAY[auth.uid()::text]) -- Assigned to me (fixed cast)
        OR is_admin_or_owner() -- I am Admin
        OR (ownerId IS NOT NULL AND is_manager_of(auth.uid(), ownerId)) -- I manage the owner
    )
);

-- B. INSERT (Create)
-- Create task in own org.
CREATE POLICY "Strict Task Insert" ON tasks
FOR INSERT
WITH CHECK (
    auth.uid() = ownerId 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- C. UPDATE (Edit)
-- 1. Admin/Owner: Edit All
-- 2. Owner: Edit Own
-- 3. Assignee: Edit Assigned (Usually partial, but let's allow Update for now)
-- 4. Manager: Edit Descendants? (Usually yes, managers can intervene)
CREATE POLICY "Strict Task Update" ON tasks
FOR UPDATE
USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
        auth.uid() = ownerId
        OR (assigneeIds::text[] @> ARRAY[auth.uid()::text])
        OR is_admin_or_owner()
        OR (ownerId IS NOT NULL AND is_manager_of(auth.uid(), ownerId))
    )
);

-- D. DELETE
-- 1. Admin/Owner
-- 2. Owner
-- (Assignees usually cannot delete)
CREATE POLICY "Strict Task Delete" ON tasks
FOR DELETE
USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (
        auth.uid() = ownerId 
        OR is_admin_or_owner()
    )
);

COMMIT;
