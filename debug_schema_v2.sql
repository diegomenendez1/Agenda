-- Run this query to see the columns of the relevant tables.
-- This helps us verify if 'organization_id' exists or if it's named differently.

SELECT 
    table_name, 
    column_name, 
    data_type, 
    ordinal_position
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('team_invitations', 'team_members', 'profiles', 'invitations')
ORDER BY 
    table_name, 
    ordinal_position;
