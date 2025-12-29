import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { ArrowLeft, DollarSign, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSettlement {
    admin_id: string;
    admin_name: string;
    hostel_name: string;
    total_collected: number;
    total_settled: number;
    balance_due: number;
}

export function MonitorSettlements() {
    const navigate = useNavigate();
    const [settlements, setSettlements] = useState<AdminSettlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminSettlement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchSettlements();
    }, []);

    const fetchSettlements = async () => {
        try {
            // 1. Get Total Collected (Vendor Payouts from Payments)
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('invoice_id, vendor_payout, invoice:invoices(admin_id, admins(full_name, hostel_name))')
                .eq('payment_status', 'SUCCESS')
                .not('vendor_payout', 'is', null);

            if (payError) throw payError;

            // 2. Get Total Settled (Manual Settlements)
            const { data: settled, error: setError } = await supabase
                .from('platform_settlements')
                .select('admin_id, amount');

            if (setError) throw setError;

            // 3. Aggregate Data
            const adminMap = new Map<string, AdminSettlement>();

            // Process Collections
            payments?.forEach((p: any) => {
                const adminId = p.invoice?.admin_id;
                if (!adminId) return;

                if (!adminMap.has(adminId)) {
                    adminMap.set(adminId, {
                        admin_id: adminId,
                        admin_name: p.invoice?.admins?.full_name || 'Unknown',
                        hostel_name: p.invoice?.admins?.hostel_name || 'N/A',
                        total_collected: 0,
                        total_settled: 0,
                        balance_due: 0
                    });
                }
                const current = adminMap.get(adminId)!;
                current.total_collected += Number(p.vendor_payout);
            });

            // Process Settlements
            settled?.forEach((s: any) => {
                if (adminMap.has(s.admin_id)) {
                    const current = adminMap.get(s.admin_id)!;
                    current.total_settled += Number(s.amount);
                }
            });

            // Calculate Balance
            const result: AdminSettlement[] = [];
            adminMap.forEach(item => {
                item.balance_due = item.total_collected - item.total_settled;
                if (item.balance_due > 1) { // Only show if due > 1 to avoid floating point dust
                    result.push(item);
                }
            });

            setSettlements(result.sort((a, b) => b.balance_due - a.balance_due));

        } catch (err) {
            console.error(err);
            toast.error('Failed to load settlement data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-6">
            <header className="mb-8">
                <button
                    onClick={() => navigate('/monitor')}
                    className="flex items-center gap-2 text-green-500 hover:text-green-400 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> BACK_TO_DASHBOARD
                </button>
                <h1 className="text-2xl font-bold text-green-500 uppercase tracking-widest">Settlement Management</h1>
                <p className="text-slate-500 text-sm">Track and clear dues to Admins</p>
            </header>

            <div className="bg-slate-900/30 border border-slate-800 rounded-sm overflow-hidden">
                <div className="bg-slate-900/80 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pending Settlements</h2>
                    <span className="text-xs text-slate-500">{settlements.length} Admins Pending</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-600">LOADING_DATA...</div>
                ) : settlements.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-slate-500">All caught up! No pending settlements.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/50 text-slate-500 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left">Admin</th>
                                <th className="px-6 py-3 text-right">Total Collected</th>
                                <th className="px-6 py-3 text-right">Already Paid</th>
                                <th className="px-6 py-3 text-right text-white">Balance Due</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {settlements.map((item) => (
                                <tr key={item.admin_id} className="hover:bg-slate-900/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{item.admin_name}</div>
                                        <div className="text-xs text-slate-500">{item.hostel_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-400">
                                        {formatCurrency(item.total_collected)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-400">
                                        {formatCurrency(item.total_settled)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-green-400 text-lg">
                                            {formatCurrency(item.balance_due)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                setSelectedAdmin(item);
                                                setIsModalOpen(true);
                                            }}
                                            className="bg-green-600 hover:bg-green-500 text-black px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide"
                                        >
                                            Settle Now
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <SettleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                admin={selectedAdmin}
                onSuccess={() => {
                    setIsModalOpen(false);
                    fetchSettlements();
                }}
            />
        </div>
    );
}

function SettleModal({ isOpen, onClose, admin, onSuccess }: any) {
    const [amount, setAmount] = useState('');
    const [refId, setRefId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (admin) setAmount(admin.balance_due.toString());
    }, [admin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from('platform_settlements').insert({
                admin_id: admin.admin_id,
                amount: parseFloat(amount),
                reference_id: refId,
                notes: notes
            });

            if (error) throw error;
            toast.success('Settlement Recorded!');
            onSuccess();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen || !admin) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full p-6 shadow-2xl"
            >
                <h2 className="text-xl font-bold text-white mb-1">Record Settlement</h2>
                <p className="text-slate-400 text-sm mb-6">For {admin.admin_name} ({admin.hostel_name})</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount to Settle (₹)</label>
                        <input
                            type="number"
                            required
                            max={admin.balance_due}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none font-mono text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference ID (Bank/UPI)</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. UPI-123456789"
                            value={refId}
                            onChange={e => setRefId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-green-500 outline-none h-20 text-sm"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded text-sm font-bold"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-black py-2 rounded text-sm font-bold"
                        >
                            {submitting ? 'SAVING...' : 'CONFIRM SETTLEMENT'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
