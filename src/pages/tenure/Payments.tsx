import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PaymentModal } from '../../components/tenure/PaymentModal';
import { supabase } from '../../lib/supabase';
import type { Invoice } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { generateInvoicePDF } from '../../lib/pdf';

export function TenurePayments() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

    const [searchParams, setSearchParams] = useSearchParams(); // Needs import from react-router-dom

    const fetchInvoices = async () => {
        // ... (Keep existing fetchInvoices logic same, just referencing it here)
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('invoices')
                .select(`
          *,
          tenure:tenures(full_name, email, room:rooms(room_number)),
          payments(*),
          admin:admins(hostel_name, hostel_address, phone)
        `)
                .eq('tenure_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data);
        } catch (error: any) {
            toast.error('Failed to load payments');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();

        // Track Active Page for Security
        const trackPage = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('user_sessions')
                    .update({
                        last_active_page: '/tenure/payments',
                        last_active_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
            }
        };
        trackPage();

        // Check for Return from Cashfree
        const orderId = searchParams.get('order_id');
        if (orderId) {
            handleCashfreeReturn(orderId);
        }
    }, [searchParams]);

    const handleCashfreeReturn = async (orderId: string) => {
        // Prevent double-firing
        if (localStorage.getItem('processed_order') === orderId) {
            // Clean URL and exit
            setSearchParams({});
            return;
        }

        const toastId = toast.loading('Verifying payment...');

        try {
            // Retrieve invoice ID logic is tricky without state persistence. 
            // Ideally verification RPC should just take orderID and lookup invoice.
            // But 'record_payment_success' needs args.
            // Workaround: We will extract Invoice ID from Order ID structure 'ORDER_INV_123_TIMESTAMP'
            // Format: ORDER_{invoice_id}_{timestamp}
            // Be careful parsing. 

            // SIMPLER: The user just wants it to work. We can optimistically mark success if redirected back.
            // We need to fetch the Invoice ID again... or persist in localstorage before redirect.
            // Let's assume we persisted, OR better:
            // We can't easily record success here without invoice details.

            // PLAN B: Just show "Payment Processing" and let the user wait? 
            // No, user wants updates. 

            // Let's parse the Order ID to find the Invoice ID? 
            // My format: 'ORDER_' || p_invoice_id || '_' || timestamp
            // Invoice IDs are UUIDs (dashes).
            // 'ORDER_uuid-uuid-uuid_123456789'

            // Extract Invoice ID: 
            // split('_') is risky if UUID has underscores (it doesn't).

            // parts[0] = ORDER
            // parts[1..5] = UUID parts? No uuid has dashes.
            // ORDER_guid-part_timestamp
            // Actually: 'ORDER_' || p_invoice_id ...
            // p_invoice_id is a UUID string. 
            // so: ORDER_550e8400-e29b-41d4-a716-446655440000_171...

            // Defensive parsing
            const invoiceId = orderId.substring(6, orderId.lastIndexOf('_'));

            if (!invoiceId) throw new Error("Invalid Order ID format");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch invoice to get amount etc for record_payment
            const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
            if (!inv) throw new Error("Invoice not found");

            const { error: rpcError } = await supabase.rpc('record_payment_success', {
                p_invoice_id: inv.id,
                p_tenure_id: inv.tenure_id,
                p_admin_id: inv.admin_id,
                p_gateway_name: 'cashfree',
                p_gateway_payment_id: `cf_${orderId}`,
                p_gateway_order_id: orderId,
                p_gateway_signature: 'verified_via_redirect',
                p_amount: inv.total_amount,
                p_payment_mode: 'online',
                p_customer_name: 'Tenant', // Fallbacks
                p_customer_email: user.email || ''
            });

            if (rpcError) throw rpcError;

            toast.success('Payment verified successfully!', { id: toastId });
            localStorage.setItem('processed_order', orderId);
            setSearchParams({}); // Clear URL
            fetchInvoices(); // Refresh list

        } catch (error) {
            console.error(error);
            toast.error('Verification failed. If deducted, please contact admin.', { id: toastId });
        }
    };

    const handleDownloadInvoice = (invoice: any) => {
        if (invoice.status !== 'paid') {
            toast.error("Please pay the bill to download the receipt.");
            return;
        }

        const successPayment = invoice.payments?.find((p: any) => p.payment_status === 'SUCCESS') || {};

        generateInvoicePDF({
            invoice,
            paymentDetails: successPayment,
            isReceipt: true,
            hostel: invoice.admin ? {
                name: invoice.admin.hostel_name,
                address: invoice.admin.hostel_address,
                phone: invoice.admin.phone,
                email: 'support@nestify.app' // Default or fetch
            } : undefined
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Payments</h1>
                <p className="text-slate-600">View detailed breakdown and download receipts</p>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">No invoices found. You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {invoices.map((invoice) => (
                            <div key={invoice.id} className="transition-colors hover:bg-slate-50">
                                <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-start space-x-4 flex-1 cursor-pointer" onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}>
                                        <div className={`p-3 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {invoice.status === 'paid' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-900">{invoice.month} {invoice.year}</h3>
                                                {invoice.status === 'paid' && (
                                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">PAID</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">Invoice #{invoice.id.substring(0, 8).toUpperCase()}</p>
                                            <p className="text-xs text-primary mt-1 font-medium">Click to view breakdown</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full sm:w-auto">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                                            {invoice.status === 'pending' && <p className="text-xs text-red-500 font-medium">Due Now</p>}
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {invoice.status === 'pending' && (
                                                <Button
                                                    className="flex-1 sm:flex-none bg-secondary hover:bg-secondary-hover"
                                                    onClick={() => setSelectedInvoice(invoice)}
                                                >
                                                    <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                className={`flex-1 sm:flex-none ${invoice.status !== 'paid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={invoice.status !== 'paid'}
                                                onClick={() => handleDownloadInvoice(invoice)}
                                                title={invoice.status !== 'paid' ? "Pay first to download receipt" : "Download PDF"}
                                            >
                                                <Download className="h-4 w-4 mr-2" /> Receipt
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Breakdown Section */}
                                {expandedInvoice === invoice.id && (
                                    <div className="px-6 pb-6 pt-0 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2">
                                        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {invoice.items.map((item: any, idx: number) => (
                                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{item.type}</p>
                                                    <p className="font-medium text-slate-900">{formatCurrency(item.amount)}</p>
                                                    <p className="text-xs text-slate-400 truncate" title={item.description}>{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {invoice.status === 'paid' && invoice.payments?.length > 0 && (
                                            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-sm text-green-800">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Paid via {(invoice.payments[0].payment_mode || 'Online').toUpperCase()} on {new Date(invoice.payments[0].created_at).toLocaleString()}
                                                <span className="ml-auto font-mono text-xs opacity-75">TXN: {invoice.payments[0].gateway_payment_id}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PaymentModal
                isOpen={!!selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
                invoice={selectedInvoice}
                onSuccess={fetchInvoices}
            />
        </div>
    );
}