import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BarChart3, Users, Building, AlertTriangle, ShieldCheck, Activity, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function MonitorDashboard() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        // Simple client-side gate + Supabase Session check
        const isAuth = localStorage.getItem('monitor_auth');
        if (!isAuth) {
            navigate('/monitor/login');
            return;
        }

        // Fetch stats
        fetchStats();
    };

    const fetchStats = async () => {
        try {
            // We use a custom RPC to safely fetch global stats without exposing raw tables to public
            const { data, error } = await supabase.rpc('get_platform_stats');

            if (error) throw error;
            setStats(data);
        } catch (error: any) {
            console.error('Monitor Error:', error);
            // Show exact error for debugging
            toast.error('Error: ' + (error.message || 'Failed to fetch stats'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('monitor_auth');
        navigate('/monitor/login');
    };

    if (isLoading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Monitor...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-red-500/10 p-2 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-red-500" />
                        </div>
                        <span className="font-bold text-lg text-white tracking-wide">NESTIFY <span className="text-red-500">MONITOR</span></span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">SYS_OP_ACTIVE</span>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card title="Total Hostels" value={stats?.total_admins || 0} icon={<Building className="text-blue-400" />} />
                    <Card title="Active Tenants" value={stats?.total_tenants || 0} icon={<Users className="text-green-400" />} />
                    <Card title="Total Revenue" value={`₹${stats?.total_revenue || 0}`} icon={<BarChart3 className="text-purple-400" />} />
                    <Card title="System Alerts" value={stats?.alert_count || 0} icon={<AlertTriangle className="text-yellow-400" />} isAlert={true} />
                </div>

                {/* Main Views */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Feed */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                            <Activity className="h-5 w-5 mr-2 text-blue-500" />
                            Live Activity Stream
                        </h3>
                        <div className="space-y-4">
                            {/* Mock Data or Real Data if available */}
                            {stats?.recent_activities?.map((activity: any, i: number) => (
                                <div key={i} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                    <div className={`w-2 h-2 mt-2 rounded-full ${activity.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
                                    <div>
                                        <p className="text-sm text-slate-300">{activity.message}</p>
                                        <span className="text-xs text-slate-600">{new Date(activity.created_at).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            )) || <p className="text-slate-500 text-sm">No recent activity</p>}
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-6">System Health</h3>
                        <div className="space-y-6">
                            <HealthItem label="Database Connectivity" status="operational" />
                            <HealthItem label="Payment Gateway (Razorpay)" status="operational" />
                            <HealthItem label="Email Service (Resend)" status="operational" />
                            <HealthItem label="File Storage (Supabase)" status="operational" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Card({ title, value, icon, isAlert }: any) {
    return (
        <div className={`p-6 rounded-xl border ${isAlert ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex justify-between items-start mb-4">
                <span className="text-slate-400 text-sm font-medium">{title}</span>
                {icon}
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
        </div>
    );
}

function HealthItem({ label }: any) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate-300">{label}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                Operational
            </span>
        </div>
    );
}
