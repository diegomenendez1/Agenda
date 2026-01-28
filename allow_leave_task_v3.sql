-- RPC to safely remove an assignee (Self-leave or Owner-kick) 
-- FIX 3: Use array_remove for consistent ordering and type safety to satisfy the Trigger check.

CREATE OR REPLACE FUNCTION remove_task_assignee(task_id uuid, target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  task_record tasks%ROWTYPE;
  new_assignees text[];
  new_visibility text;
  requester_org_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- 1. Get Requester Org
  SELECT organization_id INTO requester_org_id FROM profiles WHERE id = current_user_id;

  -- 2. Get the task
  SELECT * INTO task_record FROM tasks WHERE id = task_id;
  
  IF task_record IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- 3. Tenant Check
  IF task_record.organization_id IS DISTINCT FROM requester_org_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 4. Validate Permissions
  IF (current_user_id <> target_user_id) AND (current_user_id <> task_record.user_id) THEN
     IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id AND role IN ('owner', 'head')) THEN
         RAISE EXCEPTION 'Permission denied';
     END IF;
  END IF;

  -- 5. Check existence
  IF NOT (task_record.assignee_ids @> ARRAY[target_user_id::text]) THEN
     RETURN; 
  END IF;

  -- 6. Calculate new assignees using array_remove to match Trigger logic
  new_assignees := array_remove(task_record.assignee_ids, target_user_id::text);
  
  IF new_assignees IS NULL THEN
    new_assignees := '{}';
  END IF;

  -- 7. Calculate new visibility
  -- Since array_remove preserves everything else, simply check if any non-owner remains
  IF EXISTS (SELECT 1 FROM unnest(new_assignees) u WHERE u <> task_record.user_id::text) THEN
    new_visibility := 'team';
  ELSE
    new_visibility := 'private'; 
  END IF;

  -- 8. Update
  UPDATE tasks 
  SET 
    assignee_ids = new_assignees,
    visibility = new_visibility,
    updated_at = now()
  WHERE id = task_id;

END;
$$;
