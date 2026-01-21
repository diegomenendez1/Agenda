-- RPC to safely remove an assignee (Self-leave or Owner-kick) 
-- FIX: Changed requester_org_id to UUID to match schema and avoid type mismatch error.

CREATE OR REPLACE FUNCTION remove_task_assignee(task_id uuid, target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  task_record tasks%ROWTYPE;
  new_assignees uuid[];
  new_visibility text;
  requester_org_id uuid; -- FIXED: Changed from text to uuid
BEGIN
  current_user_id := auth.uid();

  -- 1. Get Requester Org (Tenant Isolation)
  SELECT organization_id INTO requester_org_id FROM profiles WHERE id = current_user_id;

  -- 2. Get the task
  SELECT * INTO task_record FROM tasks WHERE id = task_id;
  
  IF task_record IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 3. Tenant Check
  -- Now both are UUIDs, so the comparison works
  IF task_record.organization_id IS DISTINCT FROM requester_org_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 4. Validate Permissions
  -- Allow if:
  -- A) target is self (Leaving)
  -- B) current user is owner (Kicking)
  -- C) current user is Head/Admin? (Let's assume owner is enough for now, or check profiles role)
  
  IF (current_user_id <> target_user_id) AND (current_user_id <> task_record.user_id) THEN
     -- Check if head? 
     IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id AND role IN ('owner', 'head')) THEN
         RAISE EXCEPTION 'Permission denied: You can only remove yourself or managed users if you are the owner/head.';
     END IF;
  END IF;

  -- 5. Check if target is actually an assignee
  IF NOT (task_record.assignee_ids @> ARRAY[target_user_id]) THEN
     RETURN; -- Nothing to do
  END IF;

  -- 6. Calculate new assignees
  SELECT array_agg(elem) INTO new_assignees
  FROM unnest(task_record.assignee_ids) elem
  WHERE elem <> target_user_id;
  
  IF new_assignees IS NULL THEN
    new_assignees := '{}';
  END IF;

  -- 7. Calculate new visibility
  -- If there are other assignees (who are not the owner), it stays 'team'.
  -- If only owner is left (or no one), it reverts to 'private' (unless owner manually changes it later).
  IF EXISTS (SELECT 1 FROM unnest(new_assignees) u WHERE u <> task_record.user_id) THEN
    new_visibility := 'team';
  ELSE
    new_visibility := 'private'; 
  END IF;

  -- 8. Update (Bypassing RLS via Security Definer)
  UPDATE tasks 
  SET 
    assignee_ids = new_assignees,
    visibility = new_visibility,
    updated_at = now()
  WHERE id = task_id;

END;
$$;
