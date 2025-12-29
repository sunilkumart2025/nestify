// create-order: Creates a Razorpay Order using either Platform Keys or Admin's Own Keys
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decrypt } from '../_shared/crypto.ts'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Env Variables (Platform Defaults)
const PLATFORM_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const PLATFORM_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth Check & Parse Request
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } }
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const { invoice_id } = await req.json()
        if (!invoice_id) throw new Error('Missing invoice_id')

        // 2. Fetch Invoice & Admin Payment Config
        // We need to use Service Role to fetch encrypted secrets if needed, 
        // but RLS might block reading 'razorpay_key_secret' if we don't allow it.
        // Better to use Service Role client for fetching sensitive config.
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select(`
                total_amount, id, admin_id,
                admins (
                    payment_mode,
                    razorpay_key_id,
                    razorpay_key_secret
                )
            `)
            .eq('id', invoice_id)
            .single()

        if (invoiceError || !invoice) throw new Error('Invoice not found')

        // 3. Determine Keys
        let keyId = PLATFORM_KEY_ID
        let keySecret = PLATFORM_KEY_SECRET
        let isPlatform = true

        const adminConfig = invoice.admins

        if (adminConfig?.payment_mode === 'OWN') {
            if (!adminConfig.razorpay_key_id || !adminConfig.razorpay_key_secret) {
                throw new Error('Admin has enabled Own Gateway but keys are missing')
            }

            try {
                keyId = adminConfig.razorpay_key_id
                // Decrypt the secret
                keySecret = await decrypt(adminConfig.razorpay_key_secret)
                isPlatform = false
            } catch (err) {
                console.error('Decryption failed:', err)
                throw new Error('Failed to decrypt payment keys')
            }
        }

        if (!keyId || !keySecret) {
            throw new Error('Server Config Error: Missing Payment Keys')
        }

        // 4. Create Razorpay Order
        const amountInPaise = Math.round(invoice.total_amount * 100)
        const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`

        const notes: any = {
            source: 'nestify_dual',
            invoice_id: invoice.id,
            admin_id: invoice.admin_id, // Crucial for webhook verification
            payment_mode: isPlatform ? 'PLATFORM' : 'OWN'
        }

        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: "INR",
                receipt: invoice.id,
                notes: notes
            })
        })

        const orderData = await razorpayResponse.json()

        if (!razorpayResponse.ok) {
            console.error('Razorpay Order Error:', orderData)
            throw new Error(orderData.error?.description || 'Failed to create order')
        }

        // 5. Return Order Details to Frontend
        return new Response(
            JSON.stringify({
                success: true,
                order_id: orderData.id,
                amount: orderData.amount,
                key_id: keyId // Return the correct Key ID (Platform or Own)
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error: any) {
        console.error('Create Order Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
