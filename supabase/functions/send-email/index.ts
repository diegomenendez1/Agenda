import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    taskTitle?: string;
    dueDate?: string;
    assignerName?: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { to, subject, html, taskTitle, dueDate, assignerName }: EmailPayload = await req.json();

        if (!to || !subject || !html) {
            throw new Error('Missing required fields: to, subject, html');
        }

        // Use default 'testing' sender if no verified domain is available yet.
        // In production, we would use 'Agenda App <notifications@yourdomain.com>'
        const from = 'Agenda App <onboarding@resend.dev>';

        const emailData = {
            from,
            to: [to], // Resend expects an array
            subject,
            html: html,
        };

        console.log(`Sending email to ${to} with subject: ${subject}`);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(emailData),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend API Error:', data);
            return new Response(JSON.stringify({ error: data }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Edge Function Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
