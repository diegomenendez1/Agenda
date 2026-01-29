
-- 1. Enable Http Extension
create extension if not exists "http" with schema "extensions";

-- 2. Create Email Function (Direct DB -> Resend)
create or replace function send_email_via_resend(
    to_email text, 
    subject text, 
    html_body text,
    api_key text
) returns void as $$
declare
    response_status integer;
    response_body text;
begin
    select 
        status, 
        content::text 
    into 
        response_status, 
        response_body
    from 
        http((
            'POST', 
            'https://api.resend.com/emails', 
            ARRAY[
                http_header('Authorization', 'Bearer ' || api_key),
                http_header('Content-Type', 'application/json')
            ], 
            'application/json', 
            json_build_object(
                'from', 'Agenda App <onboarding@resend.dev>',
                'to', ARRAY[to_email],
                'subject', subject,
                'html', html_body
            )::text
        )::http_request);

    if response_status > 299 then
        raise warning 'Email failed: %', response_body;
    else 
        raise notice 'Email sent successfully';
    end if;
end;
$$ language plpgsql security definer;
