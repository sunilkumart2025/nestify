import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const {
            invoice_id,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature
        } = await req.json()

        // 1. Fetch Invoice and Admin Details
        const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .select('*, admin:admins(id, payment_mode, razorpay_key_secret)')
            .eq('id', invoice_id)
            .single()

        if (invError || !invoice) {
            throw new Error('Invoice not found')
        }

        // 2. Determine Secret Key
        let secretKey = ''
        if (invoice.admin.payment_mode === 'PLATFORM') {
            secretKey = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
        } else {
            secretKey = invoice.admin.razorpay_key_secret
        }

        if (!secretKey) {
            throw new Error('Payment configuration missing (Secret Key)')
        }

        // 3. Verify Signature
        // HMAC SHA256: order_id + "|" + payment_id
        const text = `${razorpay_order_id}|${razorpay_payment_id}`

        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secretKey),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(text)
        );

        const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        if (generatedSignature !== razorpay_signature) {
            throw new Error('Invalid Razorpay Signature')
        }

        // 4. Record Success in DB (Bypassing RPC signature check by using a special flag or service role)
        // We will call the RPC, but we need to update the RPC to trust us.
        // OR, since we are Service Role here, we can just do the INSERT directly.
        // But RPC handles logic. Let's call RPC and pass 'VERIFIED_BY_EDGE_FUNCTION' as signature?
        // We need to update RPC to accept that.

        // For now, let's update the RPC in the next step.
        const { data: rpcData, error: rpcError } = await supabase.rpc('record_payment_success', {
            p_invoice_id: invoice.id,
            p_tenure_id: invoice.tenure_id,
            p_admin_id: invoice.admin_id,
            p_gateway_name: 'razorpay',
            p_gateway_payment_id: razorpay_payment_id,
            p_gateway_order_id: razorpay_order_id,
            p_gateway_signature: 'VERIFIED_BY_EDGE_FUNCTION', // Special flag
            p_amount: invoice.total_amount,
            p_payment_mode: 'online',
            p_customer_name: 'Tenant', // We could fetch this
            p_customer_email: 'email@example.com'
        })

        if (rpcError) throw rpcError

        return new Response(
            JSON.stringify({ success: true, data: rpcData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
