-- PATCH: Update RPCs to maintain organization_members
-- Necessary for Multi-Workspace Consistency

BEGIN;

-- 1. Update Create Organization RPC
CREATE OR REPLACE FUNCTION public.create_new_organization(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id uuid;
BEGIN
    -- 1. Create Org
    INSERT INTO public.organizations (name, owner_id)
    VALUES (org_name, auth.uid())
    RETURNING id INTO new_org_id;

    -- 2. Add to Memberships (CRITICAL FOR MULTI-ORG)
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, auth.uid(), 'owner');

    -- 3. Update Profile (Set as Active)
    UPDATE public.profiles
    SET organization_id = new_org_id,
        role = 'owner'
    WHERE id = auth.uid();

    RETURN new_org_id;
END;
$$;


-- 2. Update Accept Invitation RPC
CREATE OR REPLACE FUNCTION public.accept_team_invitation(token text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invite_record public.team_invitations%ROWTYPE;
BEGIN
    -- 1. Get and Validate Invite
    SELECT * INTO invite_record FROM public.team_invitations WHERE team_invitations.token = accept_team_invitation.token;
    
    IF invite_record IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    IF invite_record.status != 'pending' THEN
         RAISE EXCEPTION 'Invitation already processed';
    END IF;

    -- 2. Add to Memberships (CRITICAL FOR MULTI-ORG)
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (invite_record.organization_id, user_id, invite_record.role)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    -- 3. Update Profile (Set as Active Context)
    UPDATE public.profiles
    SET organization_id = invite_record.organization_id,
        role = invite_record.role
    WHERE id = user_id;

    -- 4. Mark Invite as Accepted
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = invite_record.id;

    RETURN true;
END;
$$;

COMMIT;
