DO $$
DECLARE
    col_name text;
    table_list text[] := ARRAY['team_invitations', 'team_members'];
    t text;
BEGIN
    FOREACH t IN ARRAY table_list
    LOOP
        RAISE NOTICE 'Table: %', t;
        FOR col_name IN 
            SELECT column_name::text 
            FROM information_schema.columns 
            WHERE table_name = t
        LOOP
            RAISE NOTICE ' - %', col_name;
        END LOOP;
    END LOOP;
END $$;
