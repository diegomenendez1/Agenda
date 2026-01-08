-- FUNCTION: claim_task
-- This function handles the "First to Claim" logic atomically to prevent race conditions.
-- It ensures that a task is only assigned if it currently has NO assignees.

CREATE OR REPLACE FUNCTION claim_task(task_id uuid, user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_assignees text[];
  result_json json;
BEGIN
  -- lock the row to prevent race conditions
  SELECT assignee_ids INTO current_assignees
  FROM public.tasks
  WHERE id = task_id
  FOR UPDATE;

  -- Check if already assigned
  IF current_assignees IS NOT NULL AND array_length(current_assignees, 1) > 0 THEN
    -- Already taken
    result_json := json_build_object('success', false, 'message', 'Task already assigned');
    RETURN result_json;
  END IF;

  -- Perform the update
  UPDATE public.tasks
  SET 
    assignee_ids = ARRAY[user_id::text],
    status = 'todo',       -- Move to active status for the claimer
    accepted_at = NOW(),   -- Mark the acceptance timestamp
    updated_at = NOW(),
    visibility = 'team'    -- Ensure it remains visible to team (or 'private' if you want to steal it completely, but usually 'team' so others see it's taken)
  WHERE id = task_id;

  result_json := json_build_object('success', true, 'message', 'Task claimed successfully');
  RETURN result_json;
END;
$$;
