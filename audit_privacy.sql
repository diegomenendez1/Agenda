
-- AUDIT PRIVACY BREACH
-- Find users who have an organization_id but NO accepted invitation
-- and are NOT the owner of said organization.

SELECT 
    p.id as user_id, 
    p.email, 
    p.organization_id, 
    p.role,
    o.name as org_name
FROM public.profiles p
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE 
    p.organization_id IS NOT NULL 
    AND p.role != 'owner' -- Owners don't need invites
    AND p.role != 'admin' -- Assume admins are safe? Maybe not.
    AND NOT EXISTS (
        SELECT 1 
        FROM public.team_invitations i 
        WHERE i.email = p.email 
        AND i.organization_id = p.organization_id 
        AND i.status = 'accepted'
    );
