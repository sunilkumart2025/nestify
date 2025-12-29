// auto-apply-late-fees: Automatically applies daily late fees to overdue invoices
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'billing@nestify.app'

interface AdminConfig {
    id: string
    late_fee_enabled: boolean
    late_fee_daily_percent: number
    hostel_name: string
}

interface Invoice {
    id: string
    admin_id: string
    tenure_id: string
    total_amount: number
    due_date: string
    items: any[]
    tenure: {
        full_name: string
        email: string
    }
    admins: AdminConfig
}

serve(async (req) => {
    const startTime = Date.now()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Parse manual trigger
        let isManual = false
        let triggeredBy: string | null = null

        if (req.method === 'POST') {
            try {
                const body = await req.json()
                isManual = body.manual === true
                triggeredBy = body.admin_id || null
            } catch {
                const url = new URL(req.url)
                isManual = url.searchParams.get('manual') === 'true'
                triggeredBy = url.searchParams.get('admin_id') || null
            }
        }

        console.log(`🚀 Starting Late Fee Run (${isManual ? 'MANUAL' : 'AUTO'})...`)

        // 1. Get Today's Date (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0]

        // 2. Fetch Overdue Invoices
        // Criteria: Status = 'pending', Due Date < Today
        let query = supabase
            .from('invoices')
            .select(`
                id,
                admin_id,
                tenure_id,
                total_amount,
                due_date,
                items,
                tenure:tenures(full_name, email),
                admins!inner(
                    id,
                    late_fee_enabled,
                    late_fee_daily_percent,
                    hostel_name
                )
            `)
            .eq('status', 'pending')
            .lt('due_date', today)
            .eq('admins.late_fee_enabled', true) // Only if enabled by admin

        if (isManual && triggeredBy) {
            query = query.eq('admin_id', triggeredBy)
        }

        const { data: invoicesData, error: fetchError } = await query

        if (fetchError) throw fetchError

        const invoices = (invoicesData || []) as unknown as Invoice[]
        console.log(`found ${invoices.length} overdue invoices eligible for late fees`)

        let processedCount = 0
        const errors: any[] = []
        const emailPromises: Promise<any>[] = []

        for (const invoice of invoices) {
            try {
                // Calculate Fee
                // Fee = Total Amount * (Percent / 100)
                // We should calculate on the *original* amount or *current* amount?
                // Usually late fee is on the outstanding balance.
                // To avoid compounding interest on interest, we could try to find the base amount,
                // but for simplicity, we'll apply it to the current total (simple compounding) or just the base.
                // Let's stick to the user request: "percentage of total".

                const percent = invoice.admins.late_fee_daily_percent || 0
                if (percent <= 0) continue

                // Check if we already applied a fee for TODAY to avoid duplicates on re-runs
                const alreadyAppliedToday = invoice.items.some((item: any) =>
                    item.type === 'late_fee' && item.date === today
                )

                if (alreadyAppliedToday) {
                    console.log(`Skipping ${invoice.id} - fee already applied today`)
                    continue
                }

                const feeAmount = Math.round(invoice.total_amount * (percent / 100))
                if (feeAmount <= 0) continue

                // Update Invoice
                const newItem = {
                    description: `Late Fee (${percent}%) - ${today}`,
                    amount: feeAmount,
                    type: 'late_fee',
                    date: today
                }

                const newItems = [...invoice.items, newItem]
                const newTotal = invoice.total_amount + feeAmount

                const { error: updateError } = await supabase
                    .from('invoices')
                    .update({
                        items: newItems,
                        total_amount: newTotal
                    })
                    .eq('id', invoice.id)

                if (updateError) throw updateError

                processedCount++
                console.log(`✅ Applied ₹${feeAmount} late fee to invoice ${invoice.id}`)

                // Send Email
                if (invoice.tenure.email && RESEND_API_KEY) {
                    emailPromises.push(sendLateFeeEmail(
                        invoice.tenure.email,
                        invoice.tenure.full_name,
                        feeAmount,
                        newTotal,
                        invoice.admins.hostel_name
                    ))
                }

            } catch (err: any) {
                console.error(`Error processing invoice ${invoice.id}:`, err)
                errors.push({ id: invoice.id, error: err.message })
            }
        }

        // Send emails
        if (emailPromises.length > 0) {
            await Promise.allSettled(emailPromises)
        }

        return new Response(JSON.stringify({
            success: true,
            processed: processedCount,
            errors: errors,
            execution_time_ms: Date.now() - startTime
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Fatal error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

async function sendLateFeeEmail(to: string, name: string, fee: number, newTotal: number, hostelName: string) {
    if (!RESEND_API_KEY) return

    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e11d48;">Late Fee Applied</h2>
            <p>Dear ${name},</p>
            <p>This is a reminder that your rent payment is overdue.</p>
            <p>A late fee of <strong>₹${fee}</strong> has been added to your invoice.</p>
            <h3 style="margin-top: 20px;">New Total Due: ₹${newTotal}</h3>
            <p>Please pay immediately to avoid further penalties.</p>
            <p>Regards,<br>${hostelName}</p>
        </div>
    `

    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [to],
            subject: `Action Required: Late Fee Applied`,
            html: html
        })
    })
}
