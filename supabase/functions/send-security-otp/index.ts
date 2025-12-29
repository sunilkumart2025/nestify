import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const debugLog: string[] = []
    const log = (msg: string, data?: any) => {
        const entry = `${new Date().toISOString()} - ${msg} ${data ? JSON.stringify(data) : ''}`
        console.log(entry)
        debugLog.push(entry)
    }

    try {
        log('Function started')

        // 1. Initialize Supabase Client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 2. Get User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No Authorization header')

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            log('Auth Error', authError)
            throw new Error('Unauthorized: ' + (authError?.message || 'No user found'))
        }
        log('User authenticated', { id: user.id, email: user.email })

        // 3. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        log('OTP generated', { otp }) // Logged for debug, remove in prod if strict security needed

        // 4. Insert into DB
        log('Attempting DB Insert...')
        const { data: insertData, error: dbError } = await supabase
            .from('verification_codes')
            .insert({
                user_id: user.id,
                code: otp,
                type: 'PAYMENT_CONFIG',
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
            })
            .select()
            .single()

        if (dbError) {
            log('DB Insert Failed', dbError)
            throw new Error('Database Insert Failed: ' + dbError.message)
        }
        log('DB Insert Success', insertData)

        // 5. Check Email Config
        if (!RESEND_API_KEY) {
            log('RESEND_API_KEY missing')
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'OTP Generated (Email Config Missing)',
                    debug_otp: otp,
                    logs: debugLog
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6. Send Email
        log('Sending Email via Resend...', { from: RESEND_FROM_EMAIL, to: user.email })
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: `Nestify Security <${RESEND_FROM_EMAIL}>`,
                to: [user.email],
                subject: 'Your Security Verification Code',
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Security Verification</h2>
            <p>You requested to change your payment gateway settings.</p>
            <p>Please use the following OTP to verify this action:</p>
            <div style="background: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
              ${otp}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you did not request this, please contact support immediately.</p>
          </div>
        `
            })
        })

        const emailData = await res.json()
        log('Resend API Response', emailData)

        if (!res.ok) {
            log('Email Send Failed')
            return new Response(
                JSON.stringify({
                    success: true, // We still return success because OTP is in DB
                    message: 'OTP Generated but Email Failed',
                    debug_otp: otp,
                    email_error: emailData,
                    logs: debugLog
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        log('Email Sent Successfully')
        return new Response(
            JSON.stringify({
                success: true,
                message: 'OTP sent successfully',
                logs: debugLog
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        log('Critical Error', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                logs: debugLog
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
