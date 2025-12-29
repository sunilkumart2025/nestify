import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import {
    Wallet, ArrowDownLeft, ArrowUpRight, Clock,
    CheckCircle2, XCircle, ChevronRight, TrendingUp
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export function PayoutsDashboard() {
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        pendingSettlement: 0,
        nextPayoutDate: '',
        paidOut: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetchPayoutData();
    }, []);

    const fetchPayoutData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Check Connection Status
            const { data: admin } = await supabase
                .from('admins')
                .select('razorpay_account_id')
                .eq('id', user.id)
                .single();

            if (!admin?.razorpay_account_id) {
                setIsConnected(false);
                setLoading(false);
                return;
            }
            setIsConnected(true);

            // 2. Fetch Invoices managed by this admin
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id')
                .eq('admin_id', user.id);

            const invoiceIds = invoices?.map(inv => inv.id) || [];

            if (invoiceIds.length > 0) {
                // Fetch Payments for these invoices
                const { data: payments } = await supabase
                    .from('payments')
                    .select('*')
                    .in('invoice_id', invoiceIds)
                    .order('created_at', { ascending: false });

                if (payments) {
                    processStats(payments);
                    setTransactions(payments);
                }
            }
        } catch (error) {
            console.error('Error fetching payout data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processStats = (payments: any[]) => {
        let total = 0;
        let pending = 0;
        let paid = 0;

        payments.forEach(p => {
            if (p.vendor_payout) {
                const amount = Number(p.vendor_payout);
                total += amount;

                if (p.settlement_status === 'SETTLED' || p.settlement_status === 'TRANSFERRED') {
                    paid += amount;
                } else if (p.settlement_status === 'PENDING') {
                    pending += amount;
                }
            }
        });

        setStats({
            totalEarnings: total,
            pendingSettlement: pending,
            paidOut: paid,
            nextPayoutDate: 'T+2 Days' // Hardcoded logic for now
        });
    };

    if (loading) return <div className="p-8"><div className="animate-spin h-6 w-6 border-2 border-blue-600 rounded-full border-t-transparent"></div></div>;

    if (!isConnected) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-lg mx-auto"
                >
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Payout Account</h2>
                    <p className="text-slate-500 mb-8">
                        To receive your earnings, you must connect your bank account via Razorpay Route.
                    </p>
                    <a
                        href="/admin/connect-payout"
                        className="inline-flex items-center justify-center w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200"
                    >
                        Connect Now <ChevronRight className="w-5 h-5 ml-2" />
                    </a>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Earnings & Payouts</h1>
                <p className="text-slate-500">Track your revenue and settlements in real-time.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={stats.totalEarnings}
                    icon={<Wallet className="w-6 h-6 text-blue-600" />}
                    bg="bg-blue-50"
                    trend="+12% this month"
                />
                <StatCard
                    title="Pending Settlement"
                    value={stats.pendingSettlement}
                    icon={<Clock className="w-6 h-6 text-amber-600" />}
                    bg="bg-amber-50"
                    subtitle={`Est. Arrival: ${stats.nextPayoutDate}`}
                />
                <StatCard
                    title="Total Paid Out"
                    value={stats.paidOut}
                    icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
                    bg="bg-green-50"
                    subtitle="Direct to Bank Account"
                />
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
                    <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-left">Date</th>
                                <th className="px-6 py-4 text-left">Transaction ID</th>
                                <th className="px-6 py-4 text-left">Amount</th>
                                <th className="px-6 py-4 text-left">Fees</th>
                                <th className="px-6 py-4 text-left">Net Payout</th>
                                <th className="px-6 py-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(tx.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-900 font-mono">
                                                {tx.gateway_payment_id?.substring(4)}...
                                            </span>
                                            <span className="text-xs text-slate-400">Order: {tx.gateway_order_id?.substring(6)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {formatCurrency(tx.order_amount)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-red-500">
                                        - {formatCurrency(tx.platform_fee)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                                        {formatCurrency(tx.vendor_payout)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={tx.settlement_status} />
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, bg, trend, subtitle }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bg}`}>
                    {icon}
                </div>
                {trend && (
                    <div className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {trend}
                    </div>
                )}
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(value)}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        'PENDING': 'bg-amber-100 text-amber-700',
        'SETTLED': 'bg-green-100 text-green-700',
        'TRANSFERRED': 'bg-blue-100 text-blue-700',
        'FAILED': 'bg-red-100 text-red-700'
    };

    const labels: any = {
        'PENDING': 'Processing',
        'SETTLED': 'Deposited',
        'TRANSFERRED': 'In Transit',
        'FAILED': 'Failed'
    };

    const defaultStyle = 'bg-slate-100 text-slate-600';

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles[status] || defaultStyle}`}>
            {labels[status] || status || 'Pending'}
        </span>
    );
}
