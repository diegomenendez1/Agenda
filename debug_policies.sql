-- List all policies on relevant tables to check for circular logic
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename IN ('profiles', 'team_invitations', 'team_members')
ORDER BY 
    tablename, policyname;
