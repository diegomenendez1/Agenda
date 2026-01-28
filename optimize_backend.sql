-- 1. Performance: Add Missing Indexes on Foreign Keys

-- Activity Logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON public.activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

-- Inbox Items
CREATE INDEX IF NOT EXISTS idx_inbox_items_user_id ON public.inbox_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_org_id ON public.inbox_items(organization_id);

-- Notes
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_org_id ON public.notes(organization_id);

-- Tasks (Critical for filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids ON public.tasks USING gin(assignee_ids); -- GIN index for array

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON public.notifications(organization_id);


-- 2. Security: Fix Notifications RLS

-- Drop insecure/redundant policies
DROP POLICY IF EXISTS "Users and System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Org Isolated Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications; -- Re-creating to be sure
DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON public.notifications;

-- Create strict policies

-- SELECT: Only see your own
CREATE POLICY "View own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Can create if it belongs to your Organization (e.g. assigning a task to a colleague)
-- AND the organization_id on the row matches your own.
CREATE POLICY "Insert notifications for org" ON public.notifications
FOR INSERT WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- UPDATE: Only your own (Mark as read)
CREATE POLICY "Update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Only your own
CREATE POLICY "Delete own notifications" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);
