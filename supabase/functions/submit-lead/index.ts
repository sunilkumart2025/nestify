import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log('=== Submit Lead Function Called ===')

    try {
        // Check if Resend API key is configured
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY not configured')
            return new Response(
                JSON.stringify({ error: 'Server configuration error: Missing email API key' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const { name, email, phone, company } = await req.json()
        console.log('Received data:', { name, email, phone, company })

        // Validate input
        if (!name || !email || !phone || !company) {
            console.error('Validation failed: Missing fields')
            return new Response(
                JSON.stringify({ error: 'All fields are required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log('Sending email via Resend...')

        // Send email via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Nestify Leads <noreply@mynestify.online>',
                to: ['helpcenter.nestify@gmail.com'],
                subject: `New Lead: ${name} from ${company}`,
                html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #334155; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
                .field { margin-bottom: 20px; }
                .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .value { font-size: 16px; color: #0f172a; margin-top: 5px; }
                .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 24px;">🎯 New Lead Submission</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone is interested in Nestify!</p>
                </div>
                <div class="content">
                  <div class="field">
                    <div class="label">Full Name</div>
                    <div class="value">${name}</div>
                  </div>
                  <div class="field">
                    <div class="label">Email Address</div>
                    <div class="value"><a href="mailto:${email}" style="color: #3b82f6; text-decoration: none;">${email}</a></div>
                  </div>
                  <div class="field">
                    <div class="label">Phone Number</div>
                    <div class="value"><a href="tel:${phone}" style="color: #3b82f6; text-decoration: none;">${phone}</a></div>
                  </div>
                  <div class="field">
                    <div class="label">Company / Organization</div>
                    <div class="value">${company}</div>
                  </div>
                  <div class="footer">
                    <p>Received from Nestify Landing Page • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
            }),
        })

        console.log('Resend response status:', emailResponse.status)

        if (!emailResponse.ok) {
            const errorData = await emailResponse.json()
            console.error('Resend API error:', errorData)
            return new Response(
                JSON.stringify({
                    error: 'Failed to send email',
                    details: errorData
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const emailData = await emailResponse.json()
        console.log('Email sent successfully:', emailData)

        return new Response(
            JSON.stringify({ success: true, message: 'Lead submitted successfully' }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    } catch (error: any) {
        console.error('Error in submit-lead function:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Internal server error',
                type: error.name
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
    ```
