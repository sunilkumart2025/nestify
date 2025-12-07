import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Mail, CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { Invoice } from '../../lib/types';

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onSendReminder?: () => void;
}

export function PaymentDetailsModal({ isOpen, onClose, invoice, onSendReminder }: PaymentDetailsModalProps) {
    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<any>(null);

    useEffect(() => {
        async function fetchPaymentDetails() {
            if (!invoice || !isOpen) return;

            setLoading(true);
            try {
                // Fetch the MOST RECENT successful payment for this invoice
                const { data, error } = await supabase
                    .from('payments') // Using our new table
                    .select('*')
                    .eq('invoice_id', invoice.id)
                    .eq('payment_status', 'SUCCESS')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') { // Ignore 'row not found'
                    console.error('Error fetching payment:', error);
                }
                setPayment(data || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchPaymentDetails();
    }, [invoice, isOpen]);

    if (!invoice) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Invoice Details"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Header Summary */}
                <div className={`p-4 rounded-xl border ${invoice.status === 'paid'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                    }`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                            <div className="flex items-center mt-2 space-x-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {invoice.status.toUpperCase()}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {invoice.month}
                                </span>
                            </div>
                        </div>
                        {invoice.status === 'paid' ? (
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        ) : (
                            <XCircle className="h-8 w-8 text-yellow-500" />
                        )}
                    </div>
                </div>

                {/* COST BREAKDOWN TABLE */}
                <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-slate-400" />
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Bill Breakdown</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium">Description</th>
                                <th className="px-4 py-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoice.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="group hover:bg-slate-50/50">
                                    <td className="px-4 py-2 text-slate-600 group-hover:text-slate-900">{item.description}</td>
                                    <td className="px-4 py-2 text-right font-mono text-slate-600">{formatCurrency(item.amount)}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-medium">
                                <td className="px-4 py-2 text-slate-900">Total</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-900">{formatCurrency(invoice.total_amount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* PAYMENT INFO OR REMINDER */}
                {loading ? (
                    <div className="py-8 flex justify-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : payment ? (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Payment Record</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                <span className="text-xs text-slate-500 block">Gateway Ref</span>
                                <span className="font-mono text-xs">{payment.gateway_payment_id}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                <span className="text-xs text-slate-500 block">Paid On</span>
                                <span className="font-medium">{new Date(payment.created_at).toLocaleString()}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                                <span className="text-xs text-slate-500 block">Method</span>
                                <span className="capitalize">{payment.gateway_name} ({payment.payment_mode || 'Online'})</span>
                            </div>
                        </div>
                    </div>
                ) : invoice.status !== 'paid' ? (
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                <p>Payment is currently pending.</p>
                                <p className="text-xs">Due Date: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            {onSendReminder && (
                                <Button onClick={onSendReminder} variant="outline" className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200">
                                    <Mail className="h-4 w-4 mr-2" /> Send Reminder
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p>Marked as <strong>PAID</strong> manually.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
