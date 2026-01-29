-- FIX TRIGGER TO USE CORRECT EXTENSION SCHEMA AND HANDLE ERRORS
CREATE OR REPLACE FUNCTION public.handle_email_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
    target_email text;
    target_name text;
    api_url text := 'https://dovmyyrnhudfwvrlrzmw.functions.supabase.co/send-email';
    -- Get the service_role key or anon key (In a trigger we shouldn't hardcode keys if possible, but for http extension we need headers)
    -- BETTER APPROACH: Use vault or secrets. For now, we assume the edge function is protected by Anon Key or Service Role.
    -- Since we can't easily access process.env in PL/PGSQL without vault, we will try to rely on the fact that we are calling it.
    -- However, Supabase Edge Functions REQUIRE an Authorization header.
    
    -- TRICK: We will fetch the anon key from a settings table or hardcode it TEMPORARILY for this fix if vault is not available.
    -- Given the constraint, we will pass the anon key directly.
    anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
BEGIN
    -- Only trigger for assignments
    IF NEW.type = 'assignment' THEN
        -- Get user email and name
        SELECT email, full_name INTO target_email, target_name 
        FROM public.profiles 
        WHERE id = NEW.user_id;
        
        IF target_email IS NOT NULL THEN
            -- Call Edge Function via extensions.http
            -- Important: We use BEGIN/EXCEPTION to ensure the transaction doesn't fail even if the email trigger fails
            BEGIN
                PERFORM
                    extensions.http((
                        'POST',
                        api_url,
                        ARRAY[
                            extensions.http_header('Content-Type', 'application/json'),
                            extensions.http_header('Authorization', 'Bearer ' || anon_key)
                        ],
                        'application/json',
                        json_build_object(
                            'to', target_email,
                            'subject', COALESCE(NEW.title, 'Nueva Notificación'),
                            'html', format(
                                '<div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 8px;">' ||
                                '<h2 style="color: #6366f1;">Hola %s,</h2>' ||
                                '<p style="font-size: 16px; line-height: 1.5;">%s</p>' ||
                                '<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">' ||
                                'Enviado automáticamente por Agenda App.' ||
                                '</div>' ||
                                '</div>',
                                COALESCE(target_name, 'Usuario'),
                                COALESCE(NEW.message, 'Tienes una nueva notificación en tu Agenda.')
                            )
                        )::text
                    )::extensions.http_request);
            EXCEPTION WHEN OTHERS THEN
                -- Log error to Postgres logs but let the notification insertion proceed
                RAISE WARNING 'Email notification failed for user %: %', target_email, SQLERRM;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
