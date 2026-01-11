-- ==========================================
-- FIX for "Equipo Mixto Forzado" Simulation
-- ==========================================

-- 1. Fix: Missing 'comment' type in activity_logs
-- The previous constraint restricted types to just 'creation', 'status_change', etc.
-- We are expanding it to include social interactions.

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_type_check;

ALTER TABLE activity_logs 
  ADD CONSTRAINT activity_logs_type_check 
  CHECK (type IN (
    'creation', 
    'status_change', 
    'assignment', 
    'comment',        -- Essential for social tests
    'message', 
    'system', 
    'alert', 
    'debug',
    'voice_memo'
  ));

-- 2. Fix: Verify RLS policies (Optional - applying a broad read policy for team visibility)
-- Ensures that if a task is marked 'team', any authenticated user can see it.
-- This helps prevent "Ghost Data" where a task exists but is invisible to others.

DROP POLICY IF EXISTS "Team Visibility" ON tasks;

CREATE POLICY "Team Visibility" ON tasks
    FOR SELECT
    USING (
        visibility = 'team' 
        OR auth.uid() = user_id 
        OR auth.uid() = ANY(assignee_ids)
    );
