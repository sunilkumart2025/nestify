
export const generatePaymentReminderLink = (
    phone: string,
    tenantName: string,
    month: string,
    amount: string,
    dueDate: string,
    payLink: string = 'https://nestify-app.com/pay' // Placeholder
) => {
    // 1. Sanitize Phone (Remove spaces, dashes, ensure country code)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Assume India if 10 digits

    // 2. Craft Message
    const message = `
Hey ${tenantName} 👋,

Your rent for *${month}* of *${amount}* is due on *${dueDate}*.

Please pay to avoid late fees 💸.
Pay here: ${payLink}

Thanks!
`.trim();

    // 3. Return WhatsApp API Link
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
