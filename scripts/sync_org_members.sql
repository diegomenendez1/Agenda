
-- Sync Profiles into Organization Members
-- This fixes the RLS issue where get_my_org_id() fails because organization_members is empty.

INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
    p.organization_id, 
    p.id, 
    p.role
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (organization_id, user_id) 
DO UPDATE SET role = EXCLUDED.role;

RAISE NOTICE '✅ Synced all profiles to organization_members';
