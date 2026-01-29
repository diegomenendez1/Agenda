CREATE OR REPLACE FUNCTION public.handle_email_notification_trigger()
RETURNS TRIGGER AS $$
DECLARE
    target_email text;
    target_name text;
    api_url text := 'https://dovmyyrnhudfwvrlrzmw.functions.supabase.co/send-email';
    anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
    payload jsonb;
BEGIN
    -- Only trigger for assignments
    IF NEW.type = 'assignment' THEN
        -- Get user email and name
        SELECT email, full_name INTO target_email, target_name 
        FROM public.profiles 
        WHERE id = NEW.user_id;
        
        IF target_email IS NOT NULL THEN
            -- Construct Payload to verify debugging
            payload := json_build_object(
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
            );

            -- LOG THE PAYLOAD
            RAISE LOG 'EMAIL_TRIGGER_PAYLOAD: %', payload::text;

            -- Call Edge Function via extensions.http
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
                        payload::text
                    )::extensions.http_request);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Email notification failed for user %: %', target_email, SQLERRM;
            END;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
