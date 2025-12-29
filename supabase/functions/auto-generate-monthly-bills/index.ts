// auto-generate-monthly-bills: Automatically generates rent invoices for active tenures based on admin configuration
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'billing@nestify.app'

// Billing configuration (matches Billing.tsx)
const BILLING_RULES = {
    FIXED_FEE: 20,
    PLATFORM_PERCENT: 0.006,
    DEV_PERCENT: 0.0005,
    SUPPORT_PERCENT: 0.0015,
    MAINT_PERCENT: 0.002,
    GATEWAY_PERCENT: 0.0015
}

interface AdminConfig {
    id: string
    payment_mode: 'PLATFORM' | 'OWN'
    hostel_name: string
    billing_cycle_day: number
    fixed_maintenance: number
    fixed_electricity: number
    fixed_water: number
}

interface Tenure {
    id: string
    admin_id: string
    full_name: string
    email: string
    room: {
        room_number: string
        price: number
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
        // Parse parameters (support both Body and URL params)
        let isManual = false
        let triggeredBy: string | null = null

        if (req.method === 'POST') {
            try {
                const body = await req.json()
                isManual = body.manual === true
                triggeredBy = body.admin_id || null
            } catch {
                // If body parsing fails, fall back to URL params
                const url = new URL(req.url)
                isManual = url.searchParams.get('manual') === 'true'
                triggeredBy = url.searchParams.get('admin_id') || null
            }
        } else {
            const url = new URL(req.url)
            isManual = url.searchParams.get('manual') === 'true'
            triggeredBy = url.searchParams.get('admin_id') || null
        }

        console.log(`🚀 Starting automated billing run (${isManual ? 'MANUAL' : 'AUTO'})...`)
        if (triggeredBy) console.log(`👤 Triggered by Admin: ${triggeredBy}`)

        // 1. Get current date details
        const now = new Date()
        const currentDay = now.getDate()
        const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' })
        const currentYear = now.getFullYear()
        const runDate = now.toISOString().split('T')[0]

        // 2. Check if billing already run today (Global Check)
        // Note: For daily runs, we might want to allow multiple runs if they are for different admins.
        // But to prevent duplicates, we should check if *this specific run* has happened.
        // For now, we'll rely on the invoice-level duplicate check.

        // 3. Create billing run record
        const { data: billingRun, error: runError } = await supabase
            .from('billing_runs')
            .insert({
                run_date: runDate,
                run_type: isManual ? 'manual' : 'auto',
                status: 'running',
                triggered_by: triggeredBy
            })
            .select()
            .single()

        if (runError) throw runError
        console.log(`📝 Created billing run: ${billingRun.id}`)

        // 4. Fetch Active Tenures
        // We need to filter tenures based on their Admin's billing configuration.
        // If Manual Trigger: Fetch ONLY tenures for that admin (ignore billing day).
        // If Auto Trigger: Fetch tenures where Admin's billing_cycle_day == currentDay AND auto_billing_enabled == true.

        let query = supabase
            .from('tenures')
            .select(`
                id,
                admin_id,
                full_name,
                email,
                room:rooms!inner(room_number, price),
                admins!inner(
                    id,
                    payment_mode,
                    hostel_name,
                    billing_cycle_day,
                    fixed_maintenance,
                    fixed_electricity,
                    fixed_water,
                    auto_billing_enabled
                )
            `)
            .eq('status', 'active')

        if (isManual && triggeredBy) {
            query = query.eq('admin_id', triggeredBy)
        } else {
            // Auto mode: Filter by billing day and enabled status
            // Note: PostgREST filtering on joined tables can be tricky.
            // We'll fetch all active tenures and filter in code for simplicity and flexibility,
            // or use !inner join filtering if possible.
            // Using !inner on admins allows filtering by admin properties.
            query = query
                .eq('admins.auto_billing_enabled', true)
                .eq('admins.billing_cycle_day', currentDay)
        }

        const { data: tenuresData, error: tenuresError } = await query

        if (tenuresError) throw tenuresError

        // Cast data to Tenure[]
        const tenures = (tenuresData || []) as unknown as Tenure[]

        if (tenures.length === 0) {
            console.log('ℹ️ No matching tenures found for billing today')
            await supabase.from('billing_runs').update({
                status: 'completed',
                invoices_generated: 0,
                completed_at: new Date().toISOString(),
                execution_time_ms: Date.now() - startTime
            }).eq('id', billingRun.id)

            return new Response(JSON.stringify({
                success: true,
                message: 'No active tenures to bill today',
                invoices_generated: 0
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log(`👥 Found ${tenures.length} tenures to process`)

        // 5. Generate invoices
        let invoicesGenerated = 0
        const errors: any[] = []
        const emailPromises: Promise<any>[] = []

        for (const tenure of tenures) {
            try {
                // Skip if invoice already exists for this month
                const { data: existingInvoice } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('admin_id', tenure.admin_id)
                    .eq('tenure_id', tenure.id)
                    .eq('month', currentMonth)
                    .eq('year', currentYear)
                    .single()

                if (existingInvoice) {
                    console.log(`⏭️  Skipping ${tenure.full_name} - invoice already exists`)
                    continue
                }

                // Calculate due date (10 days from now)
                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + 10)

                // Calculate Amounts
                const rent = tenure.room.price
                const fixedMaint = tenure.admins.fixed_maintenance || 0
                const fixedElec = tenure.admins.fixed_electricity || 0
                const fixedWater = tenure.admins.fixed_water || 0

                let subtotal = rent + fixedMaint + fixedElec + fixedWater

                // Build Line Items
                let items = [{ description: 'Room Rent', amount: rent, type: 'rent' }]

                if (fixedMaint > 0) items.push({ description: 'Maintenance Charges', amount: fixedMaint, type: 'service' })
                if (fixedElec > 0) items.push({ description: 'Electricity Charges', amount: fixedElec, type: 'utility' })
                if (fixedWater > 0) items.push({ description: 'Water Charges', amount: fixedWater, type: 'utility' })

                // Calculate Platform/Gateway Fees
                let totalFees = 0
                const paymentMode = tenure.admins.payment_mode

                if (paymentMode === 'OWN') {
                    const fixedFee = BILLING_RULES.FIXED_FEE
                    const platformShare = Math.round(subtotal * BILLING_RULES.PLATFORM_PERCENT)
                    const devShare = Math.round(subtotal * BILLING_RULES.DEV_PERCENT)
                    const supportShare = Math.round(subtotal * BILLING_RULES.SUPPORT_PERCENT)
                    const maintShare = Math.round(subtotal * BILLING_RULES.MAINT_PERCENT)

                    items.push(
                        { description: 'Platform Service Fee', amount: fixedFee, type: 'fee' },
                        { description: `Platform Share (${(BILLING_RULES.PLATFORM_PERCENT * 100).toFixed(1)}%)`, amount: platformShare, type: 'fee' },
                        { description: `Dev & Support Charges`, amount: devShare + supportShare + maintShare, type: 'fee' }
                    )

                    totalFees = fixedFee + platformShare + devShare + supportShare + maintShare
                } else {
                    const gatewayFee = Math.round(subtotal * BILLING_RULES.GATEWAY_PERCENT)
                    const platformShare = Math.round(subtotal * BILLING_RULES.PLATFORM_PERCENT)

                    items.push(
                        { description: 'Payment Gateway Fee', amount: gatewayFee, type: 'fee' },
                        { description: 'Platform Service Fee', amount: platformShare, type: 'fee' }
                    )

                    totalFees = gatewayFee + platformShare
                }

                const total = subtotal + totalFees

                // Insert invoice
                const { error: invoiceError } = await supabase.from('invoices').insert({
                    admin_id: tenure.admin_id,
                    tenure_id: tenure.id,
                    month: currentMonth,
                    year: currentYear,
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'pending',
                    items: items,
                    subtotal: subtotal,
                    total_amount: total
                })

                if (invoiceError) throw invoiceError

                invoicesGenerated++
                console.log(`✅ Generated invoice for ${tenure.full_name} - ₹${total}`)

                // Queue email notification
                if (tenure.email && RESEND_API_KEY) {
                    const emailPromise = sendInvoiceEmail(
                        tenure.email,
                        tenure.full_name,
                        total,
                        currentMonth,
                        dueDate.toLocaleDateString(),
                        tenure.admins.hostel_name
                    )
                    emailPromises.push(emailPromise)
                }

            } catch (err: any) {
                console.error(`❌ Error for ${tenure.full_name}:`, err.message)
                errors.push({
                    tenure_id: tenure.id,
                    tenure_name: tenure.full_name,
                    error: err.message
                })
            }
        }

        // 6. Send all emails in parallel
        if (emailPromises.length > 0) {
            console.log(`📧 Sending ${emailPromises.length} email notifications...`)
            const emailResults = await Promise.allSettled(emailPromises)
            const emailSuccesses = emailResults.filter(r => r.status === 'fulfilled').length
            console.log(`📬 Sent ${emailSuccesses}/${emailPromises.length} emails successfully`)
        }

        // 7. Update billing run status
        const finalStatus = errors.length > 0 ? 'failed' : 'completed'
        await supabase.from('billing_runs').update({
            status: finalStatus,
            invoices_generated: invoicesGenerated,
            errors: errors,
            completed_at: new Date().toISOString(),
            execution_time_ms: Date.now() - startTime
        }).eq('id', billingRun.id)

        console.log(`🎉 Billing run completed: ${invoicesGenerated} invoices, ${errors.length} errors`)

        return new Response(JSON.stringify({
            success: true,
            run_id: billingRun.id,
            invoices_generated: invoicesGenerated,
            errors: errors,
            execution_time_ms: Date.now() - startTime
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('💥 Fatal error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

// Helper function to send invoice email
async function sendInvoiceEmail(
    to: string,
    tenantName: string,
    amount: number,
    month: string,
    dueDate: string,
    hostelName: string
): Promise<void> {
    if (!RESEND_API_KEY) return

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 32px; font-weight: bold; color: #667eea; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 New Rent Invoice</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${tenantName}</strong>,</p>
                <p>Your rent invoice for <strong>${month}</strong> has been generated.</p>
                <div class="amount">₹${amount.toLocaleString()}</div>
                <p><strong>Due Date:</strong> ${dueDate}</p>
                <p><strong>Hostel:</strong> ${hostelName}</p>
                <p>Please make the payment before the due date to avoid late fees.</p>
                <a href="https://nestify.app/pay" class="button">Pay Now</a>
            </div>
            <div class="footer">
                <p>This is an automated email from Nestify.</p>
                <p>If you have any questions, please contact your hostel manager.</p>
            </div>
        </div>
    </body>
    </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [to],
            subject: `Rent Invoice - ${month}`,
            html: emailHtml
        })
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Email failed: ${error}`)
    }
}
