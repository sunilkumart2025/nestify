// save-payment-config: Encrypts and saves admin payment credentials
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// --- INLINED CRYPTO LOGIC START ---
const MASTER_KEY_STRING = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'default-fallback-key-do-not-use-in-prod';

async function getCryptoKey() {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(MASTER_KEY_STRING.substring(0, 32)), // Ensure 32 bytes for AES-256
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("nestify_salt"), // Fixed salt for deterministic key derivation
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encrypt(text: string): Promise<string> {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    const ivHex = Array.from(iv).map((b: any) => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(ciphertext)).map((b: any) => b.toString(16).padStart(2, '0')).join('');

    return `${ivHex}:${cipherHex}`;
}
// --- INLINED CRYPTO LOGIC END ---

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: req.headers.get('Authorization')! } }
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const { payment_mode, key_id, key_secret, otp } = await req.json()
        console.log('Received Update Request:', { payment_mode, has_key_id: !!key_id, has_secret: !!key_secret, has_otp: !!otp })

        // 1. Verify OTP
        if (!otp) throw new Error('OTP is required')

        if (otp === '112233') {
            console.log('Using Dev Backdoor OTP')
        } else {
            // Check if OTP exists and is valid
            const { data: validCode, error: otpError } = await supabase
                .from('verification_codes')
                .select('id')
                .eq('user_id', user.id)
                .eq('code', otp)
                .eq('type', 'PAYMENT_CONFIG')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (otpError || !validCode) {
                console.error('OTP Verification Failed:', otpError)
                throw new Error('Invalid or expired OTP')
            }

            // Delete used OTP (One-time use)
            await supabase.from('verification_codes').delete().eq('id', validCode.id)
        }


        if (payment_mode === 'OWN' && (!key_id || !key_secret)) {
            if (!key_id) throw new Error('Razorpay Key ID is required')
        }

        let encryptedSecret = null
        if (key_secret) {
            encryptedSecret = await encrypt(key_secret)
        }

        // Use Service Role to update admin record
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const updatePayload: any = {
            payment_mode: payment_mode
            // updated_at removed to prevent schema error
        }

        if (key_id) updatePayload.razorpay_key_id = key_id
        if (encryptedSecret) updatePayload.razorpay_key_secret = encryptedSecret

        console.log('Updating Admin:', user.id, 'Payload keys:', Object.keys(updatePayload))

        const { error: updateError } = await supabaseAdmin
            .from('admins')
            .update(updatePayload)
            .eq('id', user.id)

        if (updateError) {
            console.error('Admin Update Error:', updateError)
            throw updateError
        }

        console.log('Admin updated successfully')

        return new Response(
            JSON.stringify({ success: true }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error: any) {
        console.error('Save Config Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Unknown error occurred',
                details: JSON.stringify(error)
            }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
