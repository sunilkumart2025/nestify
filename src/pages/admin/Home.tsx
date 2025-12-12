import { useEffect, useState } from 'react';
import { Users, BedDouble, Wallet, Plus, Trash2, Megaphone, AlertTriangle as HelperAlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { AddNoticeModal } from '../../components/admin/AddNoticeModal';

export function AdminHome() {
    const [stats, setStats] = useState({
        totalBeds: 0,
        occupiedBeds: 0,
        occupancyRate: 0,
        revenueMonth: 0,
        pendingDues: 0,
        openIssues: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Pulse Stats (RPC)
            const { data: pulseData, error: rpcError } = await supabase
                .rpc('get_admin_dashboard_stats', { p_admin_id: user.id });

            if (rpcError) throw rpcError;

            if (pulseData) {
                setStats({
                    totalBeds: pulseData.total_beds,
                    occupiedBeds: pulseData.occupied_beds,
                    occupancyRate: pulseData.occupancy_rate,
                    revenueMonth: pulseData.revenue_month,
                    pendingDues: pulseData.pending_dues,
                    openIssues: pulseData.open_issues
                });
            }

            // 2. Recent Transactions
            const { data: transactions } = await supabase
                .from('invoices')
                .select(`
                    id, total_amount, status, created_at,
                    tenure:tenures(full_name, room:rooms(room_number))
                `)
                .eq('admin_id', user.id)
                .eq('status', 'paid')
                .order('updated_at', { ascending: false })
                .limit(5);

            setRecentTransactions(transactions || []);

            // 3. Pending Payments
            const { data: pending } = await supabase
                .from('invoices')
                .select(`
                    id, total_amount, month,
                    tenure:tenures(full_name, room:rooms(room_number))
                `)
                .eq('admin_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(5);

            setPendingInvoices(pending || []);

            // 4. Notices
            const { data: noticesData } = await supabase
                .from('notices')
                .select('*')
                .eq('admin_id', user.id)
                .order('created_at', { ascending: false });

            setNotices(noticesData || []);

            setIsLoading(false);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            toast.error('Failed to load dashboard data');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleDeleteNotice = async (id: string) => {
        try {
            const { error } = await supabase.from('notices').delete().eq('id', id);
            if (error) throw error;
            toast.success('Notice deleted');
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to delete notice');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const statCards = [
        {
            name: 'Occupancy Pulse',
            value: `${stats.occupancyRate}%`,
            change: `${stats.occupiedBeds}/${stats.totalBeds} Beds`,
            changeType: stats.occupancyRate > 90 ? 'increase' : 'neutral',
            icon: Users,
            desc: 'Live Occupancy Rate',
            color: 'text-blue-600 bg-blue-100'
        },
        {
            name: 'Monthly Revenue',
            value: formatCurrency(stats.revenueMonth),
            change: 'This Month',
            changeType: 'increase',
            icon: Wallet,
            desc: 'Total Collection',
            color: 'text-emerald-600 bg-emerald-100'
        },
        {
            name: 'Risk Exposure',
            value: formatCurrency(stats.pendingDues),
            change: 'Pending Dues',
            changeType: stats.pendingDues > 0 ? 'decrease' : 'increase',
            icon: HelperAlertTriangle,
            desc: 'Action Required',
            color: 'text-rose-600 bg-rose-100' // Custom helper needed for icon
        },
    ];

    const getNoticeBadgeColor = (category: string) => {
        switch (category) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'maintenance': return 'bg-orange-100 text-orange-800';
            case 'event': return 'bg-purple-100 text-purple-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome back, Admin 👋</h1>
                <p className="text-slate-600">Here's what's happening in your hostel today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((item) => (
                    <div key={item.name} className="bg-white overflow-hidden rounded-xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <item.icon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-slate-500 truncate">{item.name}</dt>
                                    <dd>
                                        <div className="flex items-baseline">
                                            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                                            <p className="ml-2 flex items-baseline text-sm font-semibold text-slate-600">{item.change}</p>
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column (Transactions & Pending) */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Recent Transactions */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {recentTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-slate-500">No recent transactions.</td>
                                        </tr>
                                    ) : (
                                        recentTransactions.map((tx) => (
                                            <tr key={tx.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-slate-900">{tx.tenure?.full_name || 'Unknown'}</div>
                                                    <div className="text-sm text-slate-500">Room {tx.tenure?.room?.room_number || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                    {formatCurrency(tx.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        {tx.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {formatDate(tx.created_at)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pending Payments */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">Pending Payments</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {pendingInvoices.length === 0 ? (
                                    <p className="text-center text-slate-500">No pending payments.</p>
                                ) : (
                                    pendingInvoices.map((inv) => (
                                        <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                    {inv.tenure?.full_name?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{inv.tenure?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">Room {inv.tenure?.room?.room_number || 'N/A'} • {inv.month}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900">{formatCurrency(inv.total_amount)}</p>
                                                <button className="text-xs text-primary hover:text-primary-hover font-medium">Send Reminder</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Notice Board) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                            <Megaphone className="h-5 w-5 mr-2 text-primary" /> Notice Board
                        </h3>
                        <Button size="sm" onClick={() => setIsNoticeModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" /> Post
                        </Button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto max-h-[600px]">
                        {notices.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <p>No notices posted.</p>
                                <p className="text-sm mt-1">Announcements will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notices.map((notice) => (
                                    <div key={notice.id} className="p-4 rounded-lg border border-slate-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getNoticeBadgeColor(notice.category)}`}>
                                                {notice.category}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteNotice(notice.id)}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <h4 className="font-bold text-slate-900 mb-1">{notice.title}</h4>
                                        <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{notice.content}</p>
                                        <p className="text-xs text-slate-400">{formatDate(notice.created_at)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddNoticeModal
                isOpen={isNoticeModalOpen}
                onClose={() => setIsNoticeModalOpen(false)}
                onSuccess={fetchDashboardData}
            />
        </div>
    );
}
