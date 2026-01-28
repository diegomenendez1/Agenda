-- Check get_my_org_id definition
SELECT pg_get_functiondef('public.get_my_org_id'::regproc);

-- Check if the owner has an organization_id
SELECT email, organization_id, role 
FROM profiles 
WHERE email = 'diegomenendez1@gmail.com';
