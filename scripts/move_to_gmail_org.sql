
-- SQL Script to MOVE/LINK Karol and Erick to the Gmail Organization (Diego Verified)
-- Running this will ensure they are visible if you are logged in as diegomenendez1@gmail.com

DO $$
DECLARE
    gmail_diego_id UUID;
    gmail_org_id UUID;
    karol_id UUID;
    erick_id UUID;
BEGIN
    -- 1. Find the Gmail Diego (Diego Verified)
    SELECT id, organization_id INTO gmail_diego_id, gmail_org_id
    FROM profiles 
    WHERE email ILIKE '%diegomenendez1@gmail.com%' 
    LIMIT 1;

    -- 2. Find Karol
    SELECT id INTO karol_id 
    FROM profiles 
    WHERE full_name ILIKE '%Karol Enciso%' 
    LIMIT 1;

    -- 3. Find Erick
    SELECT id INTO erick_id 
    FROM profiles 
    WHERE full_name ILIKE '%Erick Lameda%' 
    LIMIT 1;

    -- Checks
    IF gmail_diego_id IS NULL THEN
        RAISE EXCEPTION 'Could not find Gmail Diego';
    END IF;

    -- 4. Move Karol -> Reports To Gmail Diego
    UPDATE profiles 
    SET reports_to = gmail_diego_id,
        organization_id = gmail_org_id,
        role = 'manager' -- Ensure she is Manager
    WHERE id = karol_id;
    
    -- 5. Move Erick -> Reports To Karol
    UPDATE profiles 
    SET reports_to = karol_id,
        organization_id = gmail_org_id,
        role = 'member'
    WHERE id = erick_id;

    RAISE NOTICE '✅ Moved Team to Gmail Org (%s)', gmail_org_id;

END $$;
