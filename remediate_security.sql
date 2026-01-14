-- SECURITY REMEDIATION PATCH
-- Audit Finding: "Team Visibility" policy is too broad/permissive.
-- Target: Apply Strict RLS based on 'team_memberships'.

-- 1. Ensure team_memberships exists (Idempotent check)
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES public.profiles(id) NOT NULL,
  member_id uuid REFERENCES public.profiles(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, member_id)
);

-- Enable RLS on memberships just in case
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- 2. Drop Vulnerable Policies on TASKS
DROP POLICY IF EXISTS "Team Access" ON public.tasks;
DROP POLICY IF EXISTS "Private Access" ON public.tasks;
DROP POLICY IF EXISTS "Team Visibility" ON public.tasks; -- Handle potential naming vars

-- 3. Create STRICT Policies

-- POLICY A: Private Tasks
-- Only accessible by the Owner OR explicit Assignees
CREATE POLICY "Strict Private Access" ON public.tasks
FOR ALL
USING (
    visibility = 'private' 
    AND (
        auth.uid() = user_id 
        OR (assignee_ids IS NOT NULL AND auth.uid() = ANY(assignee_ids))
    )
);

-- POLICY B: Team Tasks (The Fix)
-- Accessible if:
-- 1. User is Owner
-- 2. User is Assigned
-- 3. User is in a 'team_memberships' relationship with the Owner (active status)
CREATE POLICY "Strict Team Access" ON public.tasks
FOR SELECT
USING (
    visibility = 'team'
    AND (
        -- I am the owner
        auth.uid() = user_id 
        
        -- OR I am assigned
        OR (assignee_ids IS NOT NULL AND auth.uid() = ANY(assignee_ids))
        
        -- OR I am a Manager of the Owner
        OR EXISTS (
            SELECT 1 FROM public.team_memberships 
            WHERE manager_id = auth.uid() AND member_id = tasks.user_id AND status = 'active'
        )
        
        -- OR I am a Member of the Owner (Owner is my Manager)
        OR EXISTS (
            SELECT 1 FROM public.team_memberships 
            WHERE member_id = auth.uid() AND manager_id = tasks.user_id AND status = 'active'
        )
    )
);

-- Allow Insert/Update/Delete based on similar logic
-- For simplicity in this patch, we apply the same USING logic for ALL (Select/Update/Delete) for simplicity
-- barring that Update usually requires being owner or assignee potentially.
-- Expanding Policy B to FOR ALL for now to maintain functionality, 
-- but ideally Write access should be stricter. 
-- For this Agile iteration, ensuring Read Security is the priority.

CREATE POLICY "Strict Team Management" ON public.tasks
FOR INSERT
WITH CHECK (
    auth.uid() = user_id -- Only create tasks as yourself
);

CREATE POLICY "Strict Team Updates" ON public.tasks
FOR UPDATE
USING (
    -- Standard: Owner or Assignee can update
    auth.uid() = user_id 
    OR (assignee_ids IS NOT NULL AND auth.uid() = ANY(assignee_ids))
);

CREATE POLICY "Strict Team Delete" ON public.tasks
FOR DELETE
USING (
    auth.uid() = user_id -- Only owner deletes
);

-- 4. Fix Project RLS (Bonus from Audit Context)
-- Ensure Projects follow similar rules if needed, but scope is Tasks.

-- 5. Helper Index for Performance (Since we do joins in RLS)
CREATE INDEX IF NOT EXISTS idx_team_memberships_manager ON public.team_memberships(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_member ON public.team_memberships(member_id);
-- Index on Tasks user_id is properly handled by PK/FK usually, but worth checking.
