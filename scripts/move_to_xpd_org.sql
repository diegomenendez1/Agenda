
-- SQL Script to MOVE/LINK Karol and Erick to the XPD Global Organization
-- Running this will ensure they are visible for diego.menendez@xpdglobal.com

DO $$
DECLARE
    xpd_diego_id UUID;
    xpd_org_id UUID;
    karol_id UUID;
    erick_id UUID;
BEGIN
    -- 1. Find the XPD Global Diego
    SELECT id, organization_id INTO xpd_diego_id, xpd_org_id
    FROM profiles 
    WHERE email ILIKE 'diego.menendez@xpdglobal.com' 
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
    IF xpd_diego_id IS NULL THEN
        RAISE EXCEPTION 'Could not find XPD Diego (diego.menendez@xpdglobal.com)';
    END IF;

    -- 4. Move Karol -> Reports To XPD Diego
    UPDATE profiles 
    SET reports_to = xpd_diego_id,
        organization_id = xpd_org_id,
        role = 'manager'
    WHERE id = karol_id;
    
    -- 5. Move Erick -> Reports To Karol
    UPDATE profiles 
    SET reports_to = karol_id,
        organization_id = xpd_org_id,
        role = 'member'
    WHERE id = erick_id;

    RAISE NOTICE '✅ Moved Team to XPD Org (%s)', xpd_org_id;

END $$;
