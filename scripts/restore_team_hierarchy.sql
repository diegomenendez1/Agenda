
-- SQL Script to restore hierarchy for Karol Enciso and Erick Lameda
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
    diego_id UUID;
    karol_id UUID;
    erick_id UUID;
    diego_org UUID;
BEGIN
    -- 1. Find Diego
    SELECT id, organization_id INTO diego_id, diego_org 
    FROM profiles 
    WHERE full_name ILIKE '%Diego%' 
    ORDER BY created_at ASC -- Assume the first/oldest Diego is the owner
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

    -- Logic Checks
    IF diego_id IS NULL THEN
        RAISE EXCEPTION 'Could not find Diego';
    END IF;

    IF karol_id IS NULL THEN
        RAISE EXCEPTION 'Could not find Karol Enciso';
    END IF;

    IF erick_id IS NULL THEN
        RAISE EXCEPTION 'Could not find Erick Lameda';
    END IF;

    -- 4. Update Karol -> Reports To Diego
    UPDATE profiles 
    SET reports_to = diego_id,
        organization_id = diego_org -- Ensure they are in the same org
    WHERE id = karol_id;
    
    RAISE NOTICE '✅ Karol Enciso now reports to Diego (%s)', diego_id;

    -- 5. Update Erick -> Reports To Karol
    UPDATE profiles 
    SET reports_to = karol_id,
        organization_id = diego_org
    WHERE id = erick_id;

    RAISE NOTICE '✅ Erick Lameda now reports to Karol Enciso (%s)', karol_id;

END $$;
