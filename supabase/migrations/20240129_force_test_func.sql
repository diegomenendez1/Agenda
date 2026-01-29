-- FUNCTION: force_test_notification
-- Creates a dummy notification directly in the DB to test the trigger.
-- Usage: SELECT public.force_test_notification('diegomenendez1@gmail.com');

CREATE OR REPLACE FUNCTION public.force_test_notification(target_email text)
RETURNS text AS $$
DECLARE
    target_user_id uuid;
    target_org_id uuid;
    new_notif_id uuid;
BEGIN
    -- 1. Find user by email
    SELECT id, organization_id INTO target_user_id, target_org_id
    FROM public.profiles
    WHERE email = target_email
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RETURN 'Error: User not found for email ' || target_email;
    END IF;

    -- 2. Insert Notification manually
    -- This MUST fire the trigger trg_email_on_assignment
    INSERT INTO public.notifications (
        id,
        user_id,
        organization_id,
        type,
        title,
        message,
        link,
        read,
        created_at
    ) VALUES (
        gen_random_uuid(),
        target_user_id,
        target_org_id,
        'assignment',
        'TEST DB TRIGGER',
        'This is a forced test from the database to verify email delivery.',
        '/dashboard',
        false,
        now()
    ) RETURNING id INTO new_notif_id;

    RETURN 'Success: Notification created with ID ' || new_notif_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
