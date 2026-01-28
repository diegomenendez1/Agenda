-- Detach User from Teams Script
-- Usage: Run this in Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'diegomenendez1@gmail.com';
    target_uid UUID;
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_uid FROM auth.users WHERE email = target_email;

    IF target_uid IS NULL THEN
        RAISE NOTICE 'User % not found. Nothing to do.', target_email;
        RETURN;
    END IF;

    RAISE NOTICE 'Detaching user: % (ID: %)', target_email, target_uid;

    -- 2. Clear Profile Organization & Hierarchy
    UPDATE public.profiles
    SET 
        organization_id = NULL,
        reports_to = NULL
    WHERE id = target_uid;

    -- 3. Remove from Teams (New Schema)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_members') THEN
        DELETE FROM public.team_members WHERE user_id = target_uid;
        RAISE NOTICE 'Removed from team_members';
    END IF;

    -- 4. Remove from Team Memberships (Old/Alt Schema)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_memberships') THEN
        DELETE FROM public.team_memberships WHERE member_id = target_uid OR manager_id = target_uid;
        RAISE NOTICE 'Removed from team_memberships';
    END IF;

    -- 5. Revoke/Remove Invitations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_invitations') THEN
        DELETE FROM public.team_invitations WHERE email = target_email;
        RAISE NOTICE 'Removed team_invitations';
    END IF;

    RAISE NOTICE 'User % is now a free agent.', target_email;

END $$;
