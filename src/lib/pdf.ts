import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './utils';
import type { Invoice } from './types';

interface HostelDetails {
    name: string;
    address: string;
    phone: string;
    email?: string;
}

interface InvoicePDFOptions {
    invoice: Invoice;
    paymentDetails?: any;
    isReceipt?: boolean;
    hostel?: HostelDetails;
}

export const generateInvoicePDF = ({ invoice, paymentDetails, isReceipt = false, hostel }: InvoicePDFOptions) => {
    const doc = new jsPDF();

    // --- COLORS ---
    const BRAND_BLUE = [37, 99, 235]; // #2563EB
    // const ACCENT_GRAY = [241, 245, 249]; // #F1F5F9 - Unused
    const TEXT_PRIMARY = [15, 23, 42]; // #0F172A
    const TEXT_SECONDARY = [100, 116, 139]; // #64748B

    // Helper for page width
    const PAGE_WIDTH = doc.internal.pageSize.width; // 210
    const MARGIN = 14;
    const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    // ==========================================
    // PAGE 1: INVOICE SUMMARY & BREAKDOWN
    // ==========================================

    // --- 1. SUPER HEADER (Business Suite) ---
    doc.setFillColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.rect(0, 0, PAGE_WIDTH, 12, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setCharSpace(2);
    doc.text('NESTIFY BUSINESS SUITE • PREMIUM HOSTEL MANAGEMENT', MARGIN, 8);

    // --- 2. BRANDING & TITLE ---
    // Logo Placeholder (Text for now)
    doc.setFontSize(24);
    doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.setFont('helvetica', 'bold');
    doc.setCharSpace(0);
    doc.text('NESTIFY', MARGIN, 30);

    doc.setFontSize(8);
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text('Elevating the Living Experience', MARGIN, 35);

    // Document Title (Right Aligned)
    doc.setFontSize(36);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.text(isReceipt ? 'RECEIPT' : 'INVOICE', PAGE_WIDTH - MARGIN, 30, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text(`#${invoice.id.substring(0, 8).toUpperCase()}`, PAGE_WIDTH - MARGIN, 37, { align: 'right' });

    // --- 3. STATUS BAR ---
    const statusY = 45;
    const statusText = invoice.status.toUpperCase();
    const statusColor = invoice.status === 'paid' ? [34, 197, 94] : [234, 179, 8]; // Green or Yellow

    doc.setDrawColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]); // Fill
    doc.roundedRect(PAGE_WIDTH - MARGIN - 40, statusY, 40, 8, 1, 1, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, PAGE_WIDTH - MARGIN - 20, statusY + 5.5, { align: 'center' });

    // --- 4. DETAILS GRID (Property vs Tenure) ---
    const gridY = 60;
    const colWidth = (CONTENT_WIDTH / 2) - 4;

    // Col 1: PROPERTY DETAILS
    doc.setFontSize(9);
    doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.text('PROPERTY DETAILS', MARGIN, gridY);

    doc.setFontSize(11);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.text(hostel?.name || 'Nestify Hostel', MARGIN, gridY + 6);

    doc.setFontSize(9);
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text(hostel?.address || 'Managed Property', MARGIN, gridY + 11);
    doc.text(hostel?.phone || '', MARGIN, gridY + 16);
    if (hostel?.email) doc.text(hostel.email, MARGIN, gridY + 21);

    // Col 2: TENURE DETAILS
    const col2X = MARGIN + colWidth + 8;
    doc.setFontSize(9);
    doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.text('TENURE DETAILS', col2X, gridY);

    doc.setFontSize(11);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.text(invoice.tenure?.full_name || 'Resident', col2X, gridY + 6);

    doc.setFontSize(9);
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text(`Room: ${invoice.tenure?.room?.room_number || 'N/A'}`, col2X, gridY + 11);
    doc.text(`Email: ${invoice.tenure?.email || 'N/A'}`, col2X, gridY + 16);
    doc.text(`Billing Month: ${invoice.month} ${invoice.year}`, col2X, gridY + 21);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, gridY + 30, PAGE_WIDTH - MARGIN, gridY + 30);

    // --- 5. INVOICE SUMMARY ---
    const summaryY = gridY + 40;

    doc.setFontSize(9);
    doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.text('INVOICE SUMMARY', MARGIN, summaryY);

    const summaryData = [
        ['Invoice Date', new Date(invoice.created_at).toLocaleDateString()],
        ['Due Date', invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate'],
        ['Billing Cycle', `${invoice.month} ${invoice.year}`],
        // ['Payment Method', isReceipt && paymentDetails ? (paymentDetails.payment_mode || 'Online').toUpperCase() : 'Pending']
    ];

    let sumX = MARGIN;
    summaryData.forEach(([label, value]) => {
        doc.setFontSize(8);
        doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
        doc.text(label!.toUpperCase(), sumX, summaryY + 8);

        doc.setFontSize(10);
        doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
        doc.text(value!, sumX, summaryY + 14);

        sumX += 45;
    });

    // --- 6. CHARGES BREAKDOWN TABLE ---
    const tableY = summaryY + 25;

    const tableBody = invoice.items.map((item) => [
        item.description,
        item.type?.toUpperCase() || 'GENERAL',
        formatCurrency(item.amount)
    ]);

    const subtotal = invoice.subtotal || invoice.total_amount;
    const fees = invoice.total_amount - subtotal;

    autoTable(doc, {
        startY: tableY,
        head: [['DESCRIPTION', 'CATEGORY', 'AMOUNT']],
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 9,
            cellPadding: 6,
            textColor: TEXT_PRIMARY as any,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [248, 250, 252], // Slate-50
            textColor: TEXT_SECONDARY as any,
            fontStyle: 'bold',
            halign: 'left',
            lineWidth: 0
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40 },
            2: { cellWidth: 40, halign: 'right' }
        },
        foot: [
            ['', 'SUBTOTAL', formatCurrency(subtotal)],
            ['', 'PLATFORM FEES', formatCurrency(fees)],
            ['', 'TOTAL AMOUNT', formatCurrency(invoice.total_amount)]
        ],
        footStyles: {
            fillColor: [255, 255, 255],
            textColor: TEXT_PRIMARY as any,
            fontStyle: 'bold',
            halign: 'right',
            lineWidth: 0
        }
    });

    // ==========================================
    // PAGE 2: TERMS, PAYMENT, NOTES (If needed or push to bottom)
    // ==========================================

    // Check if we have space, else new page
    let currentY = (doc as any).lastAutoTable.finalY + 20;
    if (currentY > 220) {
        doc.addPage();
        currentY = 20;
    }

    // --- 7. AUTOMATED BILLING NOTES ---
    doc.setFillColor(248, 250, 252); // Slate-50 background box
    doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 25, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOMATED BILLING NOTES', MARGIN + 4, currentY + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    const noteText = "This invoice includes automated platform charges for digital infrastructure usage. A convenience fee of 0.6% is applied to cover gateway and server maintenance costs.";
    doc.text(noteText, MARGIN + 4, currentY + 12, { maxWidth: CONTENT_WIDTH - 8 });

    currentY += 35;

    // --- 8. PAYMENT INSTRUCTIONS ---
    doc.setFontSize(9);
    doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INSTRUCTIONS', MARGIN, currentY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text('1. Scan the QR code in the Tenant Portal.', MARGIN, currentY + 6);
    doc.text('2. Or use the "Pay Now" button to pay via UPI/Card.', MARGIN, currentY + 11);
    doc.text('3. For cash payments, please collect a physical receipt from the warden.', MARGIN, currentY + 16);

    if (isReceipt && paymentDetails) {
        currentY += 25;
        // Payment Confirmation Box
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.5);
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, 20);

        doc.setTextColor(21, 128, 61); // Green-700
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT SUCCESSFUL', MARGIN + 4, currentY + 8);

        doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ref: ${paymentDetails.gateway_payment_id || 'N/A'} • Via: ${paymentDetails.gateway_name?.toUpperCase()}`, MARGIN + 4, currentY + 14);
    }

    // --- 9. ACKNOWLEDGEMENT ---
    const bottomY = 240;

    doc.setFontSize(8);
    doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
    doc.text('TENURE ACKNOWLEDGEMENT (If signing physically)', MARGIN, bottomY);
    doc.line(MARGIN, bottomY + 15, MARGIN + 60, bottomY + 15); // Sign line
    doc.text('Signature / Date', MARGIN, bottomY + 20);

    // --- 10. SUPPORT & FOOTER ---
    const pageHeight = doc.internal.pageSize.height;

    // Support Box
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, pageHeight - 30, PAGE_WIDTH, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPORT & ASSISTANCE', MARGIN, pageHeight - 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${hostel?.email || 'support@nestify.app'} • Phone: ${hostel?.phone || '+91 99999 99999'}`, MARGIN, pageHeight - 14);

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text('Thank You for Being a Part of Nestify! Your Comfort, Convenience & Experience — Elevated.', PAGE_WIDTH - MARGIN, pageHeight - 14, { align: 'right' });

    // Save
    doc.save(`${isReceipt ? 'Receipt' : 'Bill'}_${invoice.id.substring(0, 8)}.pdf`);
};

export const generateReceiptPDF = generateInvoicePDF; // Alias
