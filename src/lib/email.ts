import { toast } from 'react-hot-toast';
import { supabase } from './supabase';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
    try {
        // STRATEGY: 
        // 1. Try Local Proxy (Works in Dev)
        // 2. Fallback to Supabase Edge Function (Works in Prod/Android)

        let success = false;
        const replyTo = import.meta.env.VITE_RESEND_REPLY_TO || 'support@nestify.xyz';

        // Attempt 1: Vite Proxy (Dev Mode)
        // Only try proxy if we are likely in a Dev environment or if we want to try it first
        // But since we can't detect 'Network' availability easily, we try it if import.meta.env.DEV is true
        if (import.meta.env.DEV) {
            try {
                // Use Local Proxy for Web App
                const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
                const senderEmail = import.meta.env.VITE_RESEND_SENDER_EMAIL || 'onboarding@resend.dev';

                console.log("📧 Sending email (Proxy) to:", to);

                const res = await fetch('/api/resend', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendApiKey}`
                    },
                    body: JSON.stringify({
                        from: `Nestify <${senderEmail}>`,
                        to: [to],
                        reply_to: replyTo,
                        subject: subject,
                        html: html
                    })
                });

                const responseData = await res.json();

                if (res.ok) {
                    console.log('✅ Email PROXY Success! ID:', responseData.id);
                    toast.success(`Mail Sent! ID: ${responseData.id}`, { className: 'text-xs' }); // Temporary debug toast
                    success = true;
                    return true;
                }

                const errData = responseData;
                console.warn('Proxy Email failed:', errData);

                // Handle Dev Mode Limitation gracefully
                if (errData.name === 'validation_error' && errData.message.includes('only send testing emails')) {
                    toast('📧 Resend Dev Mode: Can only send to admin email', { icon: '⚠️' });
                    return true;
                }
            } catch (proxyErr) {
                console.warn('Proxy unreachable, trying Edge Function...');
            }
        }

        // Attempt 2: Supabase Edge Function (Prod / Fallback)
        if (!success) {
            console.log("📧 Sending email (Edge Function) to:", to);
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to, subject, html, reply_to: replyTo }
            });

            if (error) {
                console.error('Edge Function Email failed:', error);

                if (error instanceof Error && error.message.includes('403')) {
                    throw new Error('Email Service Permission Denied (403). Check Supabase Edge Function Secrets.');
                }
                throw error;
            }
            return true;
        }

        return true;
    } catch (error: any) {
        console.error('Email send failed:', error);
        throw error;
    }
};

const emailStyles = {
    container: 'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;',
    header: 'background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 20px; text-align: center;',
    logoText: 'color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;',
    logoSub: 'color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;',
    body: 'padding: 40px 32px;',
    h2: 'color: #1e293b; margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 600; text-align: center;',
    text: 'color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 24px;',
    otpBox: 'background-color: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;',
    otpCode: 'font-family: monospace; font-size: 36px; font-weight: 700; color: #4f46e5; letter-spacing: 8px;',
    otpSub: 'display: block; color: #64748b; font-size: 13px; margin-top: 12px;',
    button: 'display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; text-align: center;',
    buttonContainer: 'text-align: center; margin: 32px 0;',
    infoBox: 'background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;',
    infoRow: 'display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;',
    infoLabel: 'color: #64748b; font-size: 14px;',
    infoValue: 'color: #0f172a; font-weight: 600; font-size: 14px;',
    footer: 'background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;',
    footerText: 'color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;',
    footerLink: 'color: #64748b; text-decoration: none; font-size: 13px; margin: 0 8px;',
};

export const EmailTemplates = {
    otpVerification: (code: string) => `
        <div style="${emailStyles.container}">
            <div style="${emailStyles.header}">
                <h1 style="${emailStyles.logoText}">Nestify</h1>
                <p style="${emailStyles.logoSub}">Secure Access</p>
            </div>
            <div style="${emailStyles.body}">
                <h2 style="${emailStyles.h2}">Verification Code</h2>
                <p style="${emailStyles.text}">Hello,</p>
                <p style="${emailStyles.text}">Use the following offline verification code to verify your identity. This code is valid for 10 minutes.</p>
                
                <div style="${emailStyles.otpBox}">
                    <span style="${emailStyles.otpCode}">${code}</span>
                    <span style="${emailStyles.otpSub}">Do not share this code with anyone</span>
                </div>

                <p style="${emailStyles.text}">If you didn't request this code, you can safely ignore this email.</p>
            </div>
            <div style="${emailStyles.footer}">
                <p style="${emailStyles.footerText}">© ${new Date().getFullYear()} Nestify Hostel Management</p>
                <p style="${emailStyles.footerText}">
                    <a href="#" style="${emailStyles.footerLink}">Help Center</a> • 
                    <a href="#" style="${emailStyles.footerLink}">Privacy Policy</a>
                </p>
            </div>
        </div>
    `,

    invoiceNotification: (tenantName: string, amount: string, month: string, dueDate: string) => `
        <div style="${emailStyles.container}">
            <div style="${emailStyles.header}">
                <h1 style="${emailStyles.logoText}">Nestify</h1>
                <p style="${emailStyles.logoSub}">Billing & Payments</p>
            </div>
            <div style="${emailStyles.body}">
                <h2 style="${emailStyles.h2}">New Invoice Generated</h2>
                <p style="${emailStyles.text}">Hello <strong>${tenantName}</strong>,</p>
                <p style="${emailStyles.text}">A new invoice for <strong>${month}</strong> has been generated for your room.</p>

                <div style="${emailStyles.infoBox}">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Amount Due</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 700; font-size: 18px; border-bottom: 1px solid #f1f5f9;">${amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Due Date</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${dueDate}</td>
                        </tr>
                    </table>
                </div>

                <div style="${emailStyles.buttonContainer}">
                    <a href="https://nestify.xyz/login" style="${emailStyles.button}">Login to Pay</a>
                </div>
            </div>
            <div style="${emailStyles.footer}">
                <p style="${emailStyles.footerText}">Automated billing message from Nestify</p>
            </div>
        </div>
    `,

    paymentReceipt: (tenantName: string, amount: string, transactionId: string, date: string) => `
        <div style="${emailStyles.container}">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 20px; text-align: center;">
                <div style="background: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; line-height: 48px; font-size: 24px;">✓</div>
                <h1 style="${emailStyles.logoText}">Payment Successful</h1>
                <p style="${emailStyles.logoSub}">Receipt</p>
            </div>
            <div style="${emailStyles.body}">
                <p style="${emailStyles.text}">Hello <strong>${tenantName}</strong>,</p>
                <p style="${emailStyles.text}">We have received your payment. Thank you for paying on time!</p>

                <div style="${emailStyles.infoBox}">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Amount Paid</td>
                            <td style="padding: 8px 0; text-align: right; color: #10b981; font-weight: 700; font-size: 18px; border-bottom: 1px solid #f1f5f9;">${amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Date</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${date}</td>
                        </tr>
                         <tr>
                            <td style="padding: 8px 0; color: #64748b;">Transaction ID</td>
                            <td style="padding: 8px 0; text-align: right; color: #64748b; font-family: monospace;">${transactionId}</td>
                        </tr>
                    </table>
                </div>

                <div style="${emailStyles.buttonContainer}">
                    <a href="https://nestify.xyz/tenure/payments" style="color: #4f46e5; text-decoration: none; font-weight: 600;">View Payment History →</a>
                </div>
            </div>
             <div style="${emailStyles.footer}">
                <p style="${emailStyles.footerText}">© ${new Date().getFullYear()} Nestify</p>
            </div>
        </div>
    `,

    paymentReminder: (tenantName: string, amount: string, month: string, dueDate: string, adminName?: string) => `
        <div style="${emailStyles.container}">
             <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 20px; text-align: center;">
                <h1 style="${emailStyles.logoText}">Payment Reminder</h1>
                <p style="${emailStyles.logoSub}">${adminName || 'Nestify Hostel'}</p>
            </div>
            <div style="${emailStyles.body}">
                <p style="${emailStyles.text}">Hello <strong>${tenantName}</strong>,</p>
                <p style="${emailStyles.text}">This is a friendly reminder that your rent invoice for <strong>${month}</strong> is pending.</p>

                <div style="${emailStyles.infoBox}">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Amount Due</td>
                            <td style="padding: 8px 0; text-align: right; color: #d97706; font-weight: 700; font-size: 18px; border-bottom: 1px solid #f1f5f9;">${amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Due Date</td>
                            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">${dueDate}</td>
                        </tr>
                    </table>
                </div>

                <div style="${emailStyles.buttonContainer}">
                    <a href="https://nestify.xyz/login" style="${emailStyles.button}">Pay Now</a>
                </div>
                
                 <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
                    Please ignore this message if you have already paid.
                </p>
            </div>
             <div style="${emailStyles.footer}">
                <p style="${emailStyles.footerText}">Sent on behalf of ${adminName || 'Nestify Hostel Management'}</p>
            </div>
        </div>
    `
};
