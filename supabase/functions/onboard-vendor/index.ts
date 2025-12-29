// onboard-vendor: Creates a Linked Account on Razorpay for a Hostel Owner
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Env Variables
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Validate Env
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error('Server Config Error: Missing Razorpay Keys')
        }

        // 2. Parse Request
        const payload = await req.json()
        console.log('Received Payload:', JSON.stringify(payload))

        const { name, email, phone, businessName, adminId } = payload

        if (!name || !email || !businessName || !adminId) {
            throw new Error(`Missing fields. Received: ${JSON.stringify(payload)}`)
        }

        console.log(`Creating Linked Account for: ${email} (${businessName})`)

        // 3. Create Linked Account on Razorpay
        const authHeader = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`

        const razorpayResponse = await fetch('https://api.razorpay.com/v1/accounts', {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone, // Optional but good for OTP
                tnc_accepted: true,
                account_details: {
                    business_name: businessName,
                    business_type: 'individual' // As requested
                },
                notes: {
                    internal_admin_id: adminId
                }
            })
        })

        const accountData = await razorpayResponse.json()

        if (!razorpayResponse.ok) {
            console.error('Razorpay API Error:', JSON.stringify(accountData))

            // Handle 404 specifically (Route not enabled)
            if (razorpayResponse.status === 404) {
                throw new Error('Razorpay Route is NOT enabled on your account. Please enable "Route" in your Razorpay Dashboard.')
            }

            throw new Error(`Razorpay Rejected: ${accountData.error?.description || JSON.stringify(accountData)}`)
        }

        const linkedAccountId = accountData.id
        console.log(`Success! Linked Account Created: ${linkedAccountId}`)

        // 4. Return the ID to frontend (Frontend calls Database Update via RPC or directly)
        // Alternatively, we could update the database here directly using Supabase Admin Client
        return new Response(
            JSON.stringify({
                success: true,
                accountId: linkedAccountId,
                message: 'Vendor onboarding successful'
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error: any) {
        console.error('Onboard Vendor Error Full:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                details: error.description || 'Check function logs',
                inputs: 'Payload received, validation failed or API error'
            }),
            {
                status: 200, // Return 200 to ensure frontend receives the JSON body
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
