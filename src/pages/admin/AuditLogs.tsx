import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subHours, isWithinInterval, startOfHour } from 'date-fns';
import {
    Search,
    Filter,
    ShieldAlert,
    FileText,
    CreditCard,
    Trash2,
    Download,
    Activity,
    PauseCircle,
    PlayCircle,
    Terminal,
    Wifi
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    admin_id?: string;
}

export function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isLive, setIsLive] = useState(true);
    const [stats, setStats] = useState({ totalContext: 0, alerts: 0, activeNow: 0 });

    useEffect(() => {
        fetchLogs();

        // Real-time Subscription
        const channel = supabase
            .channel('audit-feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'audit_logs' },
                (payload) => {
                    if (isLive) {
                        const newLog = payload.new as AuditLog;
                        setLogs(prev => [newLog, ...prev]);
                        toast('New System Activity Detected', {
                            icon: '🛡️',
                            position: 'bottom-right',
                            className: 'bg-slate-900 text-white border border-slate-700'
                        });
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Connection established
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isLive]);

    useEffect(() => {
        // Calculate Live Stats
        const now = new Date();
        const last24h = logs.filter(l => new Date(l.created_at) > subHours(now, 24));
        const alertCount = last24h.filter(l => l.action.includes('FAIL') || l.action.includes('DELETE') || l.action.includes('ALERT')).length;

        setStats({
            totalContext: logs.length,
            alerts: alertCount,
            activeNow: 1 // Self (at least)
        });
    }, [logs]);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ['Timestamp', 'Action', 'Entity', 'Details'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => [
                `"${log.created_at}"`,
                `"${log.action}"`,
                `"${log.entity_type}"`,
                `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nestify_security_log_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getIcon = (action: string) => {
        if (action.includes('PAYMENT')) return <CreditCard className="h-4 w-4 text-emerald-400" />;
        if (action.includes('DELETE')) return <Trash2 className="h-4 w-4 text-red-400" />;
        if (action.includes('INVOICE')) return <FileText className="h-4 w-4 text-blue-400" />;
        return <Terminal className="h-4 w-4 text-slate-400" />;
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(filter.toLowerCase())
    );

    // Simple Histogram Data (Last 12 hours)
    const getHistogramData = () => {
        const hours = Array.from({ length: 12 }, (_, i) => i);
        return hours.map(h => {
            const t = subHours(new Date(), h);
            const count = logs.filter(l => isWithinInterval(new Date(l.created_at), {
                start: startOfHour(t),
                end: new Date(t.getTime() + 60 * 60 * 1000)
            })).length;
            return { hour: h, count };
        }).reverse();
    };

    const histogram = getHistogramData();

    return (
        <div className="space-y-6">
            {/* Header / HUD */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Activity className="w-64 h-64" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                                    System Monitor
                                </h1>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${isLive ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                                    <Wifi className={`w-3 h-3 ${isLive ? 'animate-pulse' : ''}`} />
                                    {isLive ? 'LIVE FEED' : 'PAUSED'}
                                </div>
                            </div>
                            <p className="text-slate-400">Real-time security surveillance center</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsLive(!isLive)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title={isLive ? "Pause Feed" : "Resume Feed"}
                            >
                                {isLive ? <PauseCircle className="w-6 h-6 text-slate-300" /> : <PlayCircle className="w-6 h-6 text-yellow-400" />}
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Events Logged</div>
                            <div className="text-2xl font-mono mobile-font-fix">{stats.totalContext}</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Security Alerts</div>
                            <div className="text-2xl font-mono text-white">{stats.alerts}</div>
                        </div>

                        {/* Activity Graph */}
                        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm flex items-end justify-between gap-1 h-24">
                            {histogram.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                                    <div
                                        className="w-full bg-blue-500/40 rounded-t-sm group-hover:bg-blue-400 transition-all"
                                        style={{ height: `${Math.max(10, Math.min(100, d.count * 10))}%` }}
                                    ></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                        {d.count} Events
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search system logs..."
                        className="pl-10 bg-white"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Filter className="h-4 w-4" /> Filters
                </button>
            </div>

            {/* Terminal Style List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold">Entity</th>
                                <th className="px-6 py-4 font-semibold">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">Initializing monitor...</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">System quiet. No logs found.</td></tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group font-mono text-xs">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getIcon(log.action)}
                                                <span className={`font-semibold ${log.action.includes('FAIL') ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {log.action}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                {log.entity_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 break-all">
                                            {JSON.stringify(log.details) === '{}' ? '-' :
                                                <span className="opacity-75">{JSON.stringify(log.details).slice(0, 100)}</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
