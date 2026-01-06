
-- Run this script in your Supabase SQL Editor to see your current database structure
-- It will list all tables and their columns in the 'public' schema

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, 
    ordinal_position;
