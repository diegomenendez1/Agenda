-- Enable RLS for Activity Logs Update
-- Created by Agent on 2026-01-22

-- This policy allows users to update their own activity logs (messages)
CREATE POLICY "Users can update their own activities" 
ON activity_logs 
FOR UPDATE 
USING (auth.uid() = user_id);
