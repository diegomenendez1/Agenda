
-- Update remove_team_member to cleanup tasks
CREATE OR REPLACE FUNCTION remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Remove Membership
    DELETE FROM public.team_memberships 
    WHERE manager_id = auth.uid() AND member_id = p_member_id AND status = 'active';

    -- 2. Cleanup Assignments: Remove p_member_id from any task assigned to them inside this workspace/team context
    -- Since tasks don't explicitly belong to a 'team', we assume we remove them from ANY task 
    -- where the current AUTH user (manager) is the owner OR the task is in a project managed by auth user.
    -- Simplification: Remove p_member_id from ALL tasks shared by auth.uid().
    
    UPDATE public.tasks
    SET assignee_ids = array_remove(assignee_ids, p_member_id::text)
    WHERE user_id = auth.uid() AND assignee_ids @> ARRAY[p_member_id::text];

    -- 3. Cleanup: If a task becomes unassigned and was 'team' visible solely due to assignment, 
    -- we might want to reset it? No, keep it as 'private' or 'team' based on owner's wish.
    -- But usually unassigned + team visible is fine if we allow it.
    -- However, the code logic sets visibility = private if no assignees.
    -- We can force update visibility if we want strictness:
    -- UPDATE public.tasks SET visibility = 'private' WHERE user_id = auth.uid() AND cardinality(assignee_ids) = 0;
    -- For now, let's just remove the assignee.

END;
$$;

-- Update leave_team to cleanup tasks
CREATE OR REPLACE FUNCTION leave_team(p_manager_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Remove Membership
    DELETE FROM public.team_memberships 
    WHERE manager_id = p_manager_id AND member_id = auth.uid() AND status = 'active';

    -- 2. Cleanup Assignments: Remove MYSELF (auth.uid()) from tasks owned by p_manager_id
    UPDATE public.tasks
    SET assignee_ids = array_remove(assignee_ids, auth.uid()::text)
    WHERE user_id = p_manager_id AND assignee_ids @> ARRAY[auth.uid()::text];

END;
$$;

-- FIX: Add get_my_invitations function if it doesn't exist to make fetching easy
CREATE OR REPLACE FUNCTION get_my_invitations()
RETURNS TABLE (
    id uuid,
    manager_id uuid,
    manager_name text,
    manager_avatar text,
    status text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.manager_id,
        p.full_name as manager_name,
        p.avatar_url as manager_avatar,
        tm.status,
        tm.created_at
    FROM public.team_memberships tm
    JOIN public.profiles p ON tm.manager_id = p.id
    WHERE tm.member_id = auth.uid() AND tm.status = 'pending';
END;
$$;

-- FIX: Add get_sent_invitations function for Managers
CREATE OR REPLACE FUNCTION get_sent_invitations()
RETURNS TABLE (
    id uuid,
    member_id uuid,
    member_name text,
    member_email text,
    member_avatar text,
    status text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.member_id,
        p.full_name as member_name,
        p.email as member_email,
        p.avatar_url as member_avatar,
        tm.status,
        tm.created_at
    FROM public.team_memberships tm
    JOIN public.profiles p ON tm.member_id = p.id
    WHERE tm.manager_id = auth.uid() AND tm.status = 'pending';
END;
$$;
