import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Invoice } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CheckCircle2, ShieldCheck, CreditCard, Smartphone, Loader2, Lock } from 'lucide-react';
import { sendEmail, EmailTemplates } from '../../lib/email';
import { generateReceiptPDF } from '../../lib/pdf';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onSuccess: () => void;
}

type PaymentStep = 'method' | 'processing' | 'success';

export function PaymentModal({ isOpen, onClose, invoice, onSuccess }: PaymentModalProps) {
    const [step, setStep] = useState<PaymentStep>('method');
    const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cashfree'>('razorpay');
    const [lastTransactionId, setLastTransactionId] = useState<string>('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('method');
            setLastTransactionId('');
        }
    }, [isOpen]);

    if (!invoice) return null;

    const loadScript = (src: string) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleRazorpayPayment = async () => {
        setStep('processing');
        try {
            // 1. Create Order Session (Server-Side)
            const { data: orderData, error: orderError } = await supabase.rpc('create_razorpay_order', {
                p_invoice_id: invoice.id
            });

            if (orderError || !orderData?.success) {
                throw new Error(orderData?.message || 'Failed to initialize payment');
            }

            // 2. Load SDK
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                throw new Error('Razorpay SDK failed to load. Are you online?');
            }

            // 3. Initialize Razorpay Options
            const options = {
                key: orderData.key_id,
                amount: orderData.amount, // from server
                currency: "INR",
                name: "Nestify Hostel",
                description: `Invoice #${invoice.id.substring(0, 8).toUpperCase()}`,
                image: "https://cdn-icons-png.flaticon.com/512/2111/2111646.png",
                order_id: orderData.order_id, // Server-Side Order ID
                handler: async function (response: any) {
                    // Success Callback
                    try {
                        const { data: rpcData, error: rpcError } = await supabase.rpc('record_payment_success', {
                            p_invoice_id: invoice.id,
                            p_tenure_id: invoice.tenure_id,
                            p_admin_id: invoice.admin_id,
                            p_gateway_name: 'razorpay',
                            p_gateway_payment_id: response.razorpay_payment_id,
                            p_gateway_order_id: response.razorpay_order_id,
                            p_gateway_signature: response.razorpay_signature,
                            p_amount: invoice.total_amount, // Still pass for double-check
                            p_payment_mode: 'online',
                            p_customer_name: invoice.tenure?.full_name || 'Tenant',
                            p_customer_email: invoice.tenure?.email || 'email@example.com'
                        });

                        if (rpcError || (rpcData && !rpcData.success)) {
                            console.error('DB Update Failed:', rpcError || rpcData);
                            toast.error(rpcData?.error || 'Payment verification failed.');
                            return;
                        }

                        setLastTransactionId(response.razorpay_payment_id);
                        setStep('success');

                        // Auto Email
                        sendReceiptEmail(invoice, response.razorpay_payment_id);

                    } catch (dbErr) {
                        console.error(dbErr);
                        toast.error('Critical Error saving payment.');
                    }
                },
                prefill: {
                    name: invoice.tenure?.full_name,
                    email: invoice.tenure?.email,
                    contact: invoice.tenure?.phone
                },
                theme: { color: "#2563EB" },
                modal: {
                    ondismiss: function () {
                        setStep('method');
                        toast.error('Payment cancelled');
                    }
                }
            };

            const paymentObject = new (window as any).Razorpay(options);
            paymentObject.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            toast.error(error.message);
            setStep('method');
        }
    };

    const handleCashfreePayment = async () => {
        setStep('processing');
        try {
            // 1. Load SDK (v3)
            const res = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
            if (!res) {
                throw new Error('Cashfree SDK failed to load');
            }

            // 2. Create Order (Server-Side)
            const { data: orderData, error: orderError } = await supabase.rpc('create_cashfree_order', {
                p_invoice_id: invoice.id,
                p_amount: invoice.total_amount,
                p_customer_id: invoice.tenure_id, // Use tenure_id as customer_id
                p_customer_name: invoice.tenure?.full_name || 'Tenant',
                p_customer_email: invoice.tenure?.email || 'email@example.com',
                p_customer_phone: invoice.tenure?.phone || '9999999999',
                p_admin_id: invoice.admin_id,
                p_return_url: window.location.href // Redirect back to same page
            });

            if (orderError || !orderData?.success) {
                console.error('Order Creation Failed:', orderData);
                throw new Error(orderData?.message || 'Failed to initialize Cashfree');
            }

            // 3. Initialize Cashfree
            const cashfree = new (window as any).Cashfree({
                mode: "sandbox" // explicit sandbox for now based on RPC
            });

            // 4. Checkout
            cashfree.checkout({
                paymentSessionId: orderData.payment_session_id,
                returnUrl: window.location.href, // Redundant but good for safety
                redirectTarget: "_self" // Redirect behavior
            });

            // Note: Cashfree redirects away, so 'success' handling happens on page reload or webhook.
            // But for SPA, if it opens in popup (if configured) or redirects, we lose state.
            // For this implementation, we assume redirect. We won't setStep('success') immediately.

        } catch (error: any) {
            console.error('Cashfree Error:', error);
            toast.error(error.message);
            setStep('method');
        }
    };

    const sendReceiptEmail = async (inv: Invoice, txId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                await sendEmail({
                    to: user.email,
                    subject: `Payment Receipt: ${inv.month} Rent`,
                    html: EmailTemplates.paymentReceipt(
                        inv.tenure?.full_name || 'Valued Tenant',
                        formatCurrency(inv.total_amount),
                        txId,
                        new Date().toLocaleDateString()
                    )
                });
            }
        } catch (err) {
            console.error('Failed to send receipt email', err);
        }
    };

    const handleDownloadReceipt = () => {
        if (invoice && lastTransactionId) {
            generateReceiptPDF({
                invoiceId: invoice.id,
                transactionId: lastTransactionId,
                tenantName: invoice.tenure?.full_name || 'Tenant',
                amount: invoice.total_amount,
                date: new Date(),
                month: invoice.month,
                hostelName: 'Nestify Hostel'
            });
        }
        handleClose();
    };

    const handleClose = () => {
        if (step === 'success') {
            onSuccess();
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={step === 'success' ? 'Payment Successful' : 'Secure Checkout'}
            maxWidth="max-w-md"
        >
            <div className="min-h-[400px] flex flex-col">

                {/* Header Summary (Hidden on Success) */}
                {step !== 'success' && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-6 relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Total Payable Amount</p>
                                <p className="text-3xl font-bold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                            </div>
                            <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Secure
                            </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <CreditCard className="h-32 w-32" />
                        </div>
                    </div>
                )}

                {/* STEP 1: METHOD SELECTION */}
                {step === 'method' && (
                    <div className="space-y-6 flex-1">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-3 block">Select Payment Method</label>
                            <div className="space-y-3">
                                {/* Razorpay Option */}
                                <button
                                    onClick={() => setPaymentMethod('razorpay')}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'razorpay'
                                        ? 'border-blue-600 bg-blue-50/50'
                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${paymentMethod === 'razorpay' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <CreditCard className="h-6 w-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-700">Cards & Netbanking</div>
                                            <div className="text-xs text-slate-500">Powered by Razorpay (Real)</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'razorpay' ? 'border-blue-600' : 'border-slate-300'
                                        }`}>
                                        {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                    </div>
                                </button>

                                {/* Cashfree Option */}
                                <button
                                    onClick={() => setPaymentMethod('cashfree')}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'cashfree'
                                        ? 'border-pink-600 bg-pink-50/50'
                                        : 'border-slate-200 hover:border-pink-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${paymentMethod === 'cashfree' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Smartphone className="h-6 w-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-900 group-hover:text-pink-700">UPI & Wallets</div>
                                            <div className="text-xs text-slate-500">Powered by Cashfree (Test Mode)</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cashfree' ? 'border-pink-600' : 'border-slate-300'
                                        }`}>
                                        {paymentMethod === 'cashfree' && <div className="w-2.5 h-2.5 rounded-full bg-pink-600" />}
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-4">
                                <Lock className="h-3 w-3" />
                                256-bit SSL Encrypted Connection
                            </div>
                            <Button
                                onClick={paymentMethod === 'razorpay' ? handleRazorpayPayment : handleCashfreePayment}
                                className="w-full h-12 text-lg shadow-lg shadow-primary/20"
                            >
                                Pay {formatCurrency(invoice.total_amount)}
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: PROCESSING */}
                {step === 'processing' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                            <div className="relative bg-white p-4 rounded-full shadow-lg border border-slate-100">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Connecting to Gateway...</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">
                            Please wait while we initialize the secure payment session.
                        </p>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 'success' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center pt-8">
                        <div className="bg-green-100 p-4 rounded-full mb-6 animate-bounce-short">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
                        <p className="text-slate-600 mb-8">
                            Your payment of <span className="font-bold text-slate-900">{formatCurrency(invoice.total_amount)}</span> has been received.
                        </p>

                        <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-100 mb-8 max-w-xs">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500">Transaction ID</span>
                                <span className="font-mono text-slate-900">{lastTransactionId || 'Pending'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Date</span>
                                <span className="text-slate-900">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleDownloadReceipt}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            Download Receipt
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
