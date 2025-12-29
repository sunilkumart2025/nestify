// Supabase Edge Function to send emails via Resend
// Deploy this to Supabase Dashboard: Edge Functions → Create Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { to, subject, html } = await req.json();

        // Get Resend API key from environment
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const senderEmail = Deno.env.get('RESEND_SENDER_EMAIL') || 'onboarding@resend.dev';

        if (!resendApiKey) {
            throw new Error('RESEND_API_KEY not configured');
        }

        // Call Resend API from the server
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: `Nestify <${senderEmail}>`,
                to: [to],
                subject: subject,
                html: html,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Resend API Error:', data);
            return new Response(
                JSON.stringify({ error: data.message || 'Failed to send email' }),
                {
                    status: res.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        return new Response(
            JSON.stringify({ success: true, id: data.id }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Email function error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
