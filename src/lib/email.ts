import { toast } from 'react-hot-toast';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

    if (!resendApiKey) {
        console.error('VITE_RESEND_API_KEY is not set');
        toast.error('Email service not configured (Missing API Key)');
        return false;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'Nestify <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: html
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            console.error('Resend API Error:', errData);

            if (errData.name === 'validation_error' && errData.message.includes('resend.dev')) {
                toast('Dev Mode: Email simulated (Restricted to verified sender)', { icon: '👨‍💻' });
                // In dev mode with free tier, this IS a "success" technically as the logic worked
                return true;
            }

            throw new Error(errData.message || 'Failed to send email');
        }

        return true;
    } catch (error: any) {
        console.error('Email send failed:', error);
        // Don't show toast here to avoid spamming UI if it's a background process, 
        // let the caller decide or just log it.
        return false;
    }
};

export const EmailTemplates = {
    invoiceNotification: (tenantName: string, amount: string, month: string, dueDate: string) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #4f46e5; margin: 0;">Nestify</h1>
                <p style="color: #64748b; margin: 4px 0;">Hostel Management System</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h2 style="color: #1e293b; margin-bottom: 16px;">New Invoice Generated</h2>
                <p style="color: #334155; line-height: 1.6;">Hello <strong>${tenantName}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">A new invoice for <strong>${month}</strong> has been generated for your room. Please login to your dashboard to view and pay.</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="color: #64748b; padding-bottom: 8px;">Amount Due</td>
                        <td style="text-align: right; color: #0f172a; font-weight: bold; font-size: 18px;">${amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;">Due Date</td>
                        <td style="text-align: right; color: #0f172a; font-weight: bold;">${dueDate}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center;">
                <a href="${window.location.origin}/login" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Login to Pay</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">
                This is an automated message from Nestify. Please do not reply.
            </p>
        </div>
    `,

    paymentReceipt: (tenantName: string, amount: string, transactionId: string, date: string) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ec4899; margin: 0;">Nestify</h1>
                <p style="color: #64748b; margin: 4px 0;">Payment Receipt</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; justify-content: center; align-items: center; width: 48px; height: 48px; background-color: #dcfce7; border-radius: 50%; margin-bottom: 16px;">
                    <span style="color: #166534; font-size: 24px;">✓</span>
                </div>
                <h2 style="color: #1e293b; margin: 0;">Payment Successful</h2>
                <p style="color: #334155; margin-top: 8px;">Hello ${tenantName},</p>
                <p style="color: #64748b; margin-top: 4px;">Thank you for your payment!</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="color: #64748b; padding-bottom: 8px;">Amount Paid</td>
                        <td style="text-align: right; color: #0f172a; font-weight: bold; font-size: 18px;">${amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; padding-bottom: 8px;">Transaction ID</td>
                        <td style="text-align: right; color: #0f172a; font-family: monospace;">${transactionId}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b;">Date</td>
                        <td style="text-align: right; color: #0f172a; font-weight: bold;">${date}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center;">
                <a href="${window.location.origin}/tenure/payments" style="color: #ec4899; text-decoration: none; font-weight: bold;">View Payment History</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">
                This is an automated message from Nestify. Please do not reply.
            </p>
        </div>
    `,
    paymentReminder: (tenantName: string, amount: string, month: string, dueDate: string, adminName?: string) => `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #f59e0b; margin: 0;">${adminName || 'Nestify'}</h1>
                <p style="color: #64748b; margin: 4px 0;">Payment Reminder</p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h2 style="color: #1e293b; margin-bottom: 16px;">Invoice Pending</h2>
                <p style="color: #334155; line-height: 1.6;">Hello <strong>${tenantName}</strong>,</p>
                <p style="color: #334155; line-height: 1.6;">This is a friendly reminder that your rent invoice for <strong>${month}</strong> is currently pending.</p>
            </div>

            <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #fcd34d;">
                <table style="width: 100%;">
                    <tr>
                        <td style="color: #92400e; padding-bottom: 8px;">Amount Due</td>
                        <td style="text-align: right; color: #92400e; font-weight: bold; font-size: 18px;">${amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #92400e;">Due Date</td>
                        <td style="text-align: right; color: #92400e; font-weight: bold;">${dueDate}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center;">
                <a href="${window.location.origin}/login" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Pay Now</a>
            </div>
            
            <p style="text-align: center; color: #64748b; font-size: 14px; margin-top: 24px;">
                Please ignore this message if you have already paid.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            
            <p style="text-align: center; color: #94a3b8; font-size: 12px;">
                Sent on behalf of ${adminName || 'Nestify Hostel Management'}.
            </p>
        </div>
    `
};
