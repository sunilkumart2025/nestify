import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { ArrowLeft, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminDue {
    admin_id: string;
    admin_name: string;
    hostel_name: string;
    amount_due: number;
    last_payment_at: string | null;
    updated_at: string;
}

export function MonitorPayments() {
    const navigate = useNavigate();
    const [dues, setDues] = useState<AdminDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, admins: 0, avgDue: 0 });

    useEffect(() => {
        fetchDues();
    }, []);

    const fetchDues = async () => {
        try {
            const { data, error } = await supabase
                .from('platform_dues')
                .select(`
                    admin_id,
                    amount_due,
                    last_payment_at,
                    updated_at,
                    admin:admins(full_name, hostel_name)
                `)
                .gt('amount_due', 0)
                .order('amount_due', { ascending: false });

            if (error) throw error;

            const formatted = data?.map((d: any) => ({
                admin_id: d.admin_id,
                admin_name: d.admin?.full_name || 'Unknown',
                hostel_name: d.admin?.hostel_name || 'N/A',
                amount_due: d.amount_due,
                last_payment_at: d.last_payment_at,
                updated_at: d.updated_at
            })) || [];

            setDues(formatted);

            const total = formatted.reduce((sum, d) => sum + d.amount_due, 0);
            setStats({
                total,
                admins: formatted.length,
                avgDue: formatted.length > 0 ? total / formatted.length : 0
            });
        } catch (err) {
            console.error(err);
            toast.error('Failed to load payment data');
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
                <h1 className="text-2xl font-bold text-green-500 uppercase tracking-widest">Platform Revenue Control</h1>
                <p className="text-slate-500 text-sm">Admin Payment Tracking & Collection</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-green-900/30 p-4 rounded-sm">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs uppercase">Total Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(stats.total)}</div>
                </div>
                <div className="bg-slate-900/50 border border-blue-900/30 p-4 rounded-sm">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-xs uppercase">Admins with Dues</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats.admins}</div>
                </div>
                <div className="bg-slate-900/50 border border-purple-900/30 p-4 rounded-sm">
                    <div className="flex items-center gap-2 text-purple-500 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs uppercase">Average Due</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(stats.avgDue)}</div>
                </div>
            </div>

            {/* Dues Table */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-sm overflow-hidden">
                <div className="bg-slate-900/80 px-6 py-3 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Outstanding Payments</h2>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-slate-600">LOADING_DATA...</div>
                ) : dues.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-slate-500">All dues cleared. System nominal.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/50 text-slate-500 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left">Admin</th>
                                <th className="px-6 py-3 text-left">Hostel</th>
                                <th className="px-6 py-3 text-right">Amount Due</th>
                                <th className="px-6 py-3 text-left">Last Payment</th>
                                <th className="px-6 py-3 text-left">Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {dues.map((due) => (
                                <tr key={due.admin_id} className="hover:bg-slate-900/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{due.admin_name}</td>
                                    <td className="px-6 py-4 text-slate-400">{due.hostel_name}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-green-500">
                                            {formatCurrency(due.amount_due)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {due.last_payment_at
                                            ? new Date(due.last_payment_at).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(due.updated_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
