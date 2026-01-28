-- Update Trigger to allow self-removal (Leaving a task)
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
       -- Check if it is a valid self-removal:
       -- The new array must be exactly the old array minus the current user's ID
       IF NEW.assignee_ids = array_remove(OLD.assignee_ids, auth.uid()::text) THEN
          -- Valid self-removal, allow
       ELSE
          RAISE EXCEPTION 'Only the Owner can manage assignees (you can only leave logic).';
       END IF;
    END IF;

    -- Prevent changing Project (Scope change)
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
       RAISE EXCEPTION 'Only the Owner can move tasks between projects.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
