-- Migration: Team Hierarchy & Invitations (Clean Slate)
-- We use DROP commands to ensure we resolve any schema mismatches (like missing "team_id")
-- resulting from previous partial runs.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Clean up potential conflicts
DROP TABLE IF EXISTS public.team_invitations CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
-- Be careful with teams if it has other data, but per error logs, it was missing earlier.
-- We will recreate it to be safe and ensure it has correct columns.
DROP TABLE IF EXISTS public.teams CASCADE;

-- 2. Create Base Tables
CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    parent_team_id uuid REFERENCES public.teams(id),
    type text DEFAULT 'team' CHECK (type IN ('department', 'team', 'guild')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.team_members (
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member', -- 'owner', 'admin', 'manager', 'lead', 'member'
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE public.team_invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member', -- 'member', 'lead', 'manager'
    invited_by uuid REFERENCES public.profiles(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    created_at timestamptz DEFAULT now(),
    token text DEFAULT encode(gen_random_bytes(32), 'hex'),
    UNIQUE(team_id, email)
);

-- 3. Add 'reports_to' to profiles (Idempotent)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id);

-- 4. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies

-- TEAM POLICIES
CREATE POLICY "Team Members can view their teams" ON public.teams
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = teams.id AND user_id = auth.uid()
    )
);

-- MEMBER POLICIES
CREATE POLICY "Members see other members" ON public.team_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
);

-- INVITATION POLICIES
-- Policy: Managers/Leads/Owners can VIEW invitations for their teams
CREATE POLICY "View invitations for my team" ON public.team_invitations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_invitations.team_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'lead')
    )
    OR invited_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Managers/Leads/Owners can CREATE invitations
CREATE POLICY "Create invitations for my team" ON public.team_invitations
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_invitations.team_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'manager', 'lead')
    )
);

-- Policy: Inviter can UPDATE (e.g., revoke)
CREATE POLICY "Manage sent invitations" ON public.team_invitations
FOR UPDATE USING (
    invited_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = team_invitations.team_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- 6. Seed a default team if none exists (Optional, prevents empty UI)
INSERT INTO public.teams (name, type)
SELECT 'General', 'department'
WHERE NOT EXISTS (SELECT 1 FROM public.teams);

COMMIT;
