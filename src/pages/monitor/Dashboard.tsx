import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Activity, Shield, Users, Database, Globe,
    Wifi, Cpu, AlertOctagon, Terminal, Pause, Zap, DollarSign, ArrowDownLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// --- Types ---
interface PlatformStats {
    total_admins: number;
    total_tenants: number;
    total_revenue: number;
    alert_count: number;
    recent_activities: ActivityLog[];
    high_risk_tenants: HighRiskTenant[];
}

interface ActivityLog {
    created_at: string;
    message: string;
    type: 'info' | 'error' | 'auth' | 'warning';
}

interface HighRiskTenant {
    full_name: string;
    trust_score: number;
    status: string;
}

// --- Components ---

const StatCard = ({ label, value, icon, trend, color = "blue", onClick }: any) => (
    <div
        onClick={onClick}
        className={`bg-slate-900/50 border border-slate-800 p-4 rounded-sm relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-slate-600' : ''}`}
    >
        <div className={`absolute inset-0 bg-${color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
        <div className="flex justify-between items-start mb-2">
            <span className="text-slate-500 text-xs uppercase tracking-widest font-mono">{label}</span>
            <div className={`text-${color}-500 opacity-80`}>{icon}</div>
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {value}
        </div>
        {trend && (
            <div className="text-[10px] text-green-500 mt-1 font-mono">
                ▲ {trend}% from last 24h
            </div>
        )}
        {/* Scanning line effect */}
        <motion.div
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`absolute left-0 right-0 h-[1px] bg-${color}-500/30 shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
        />
    </div>
);



const RiskRadar = ({ tenants }: { tenants: HighRiskTenant[] }) => (
    <div className="bg-slate-900/30 border border-red-900/30 rounded-sm p-4 h-full relative overflow-hidden">
        <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" /> Global Risk Radar
        </h3>
        <div className="space-y-3 relative z-10">
            {tenants.map((t, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-red-900/20 pb-2">
                    <span className="text-slate-300 font-mono uppercase">{t.full_name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-red-500 font-bold">{t.trust_score} / 100</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                </div>
            ))}
            {tenants.length === 0 && <span className="text-slate-600 text-xs">No anomalies detected. Sector clear.</span>}
        </div>
        {/* Background Radar Effect */}
        <div className="absolute -right-10 -bottom-10 w-32 h-32 border-4 border-red-500/10 rounded-full animate-ping" />
    </div>
);

const TerminalLog = ({ logs, onCommand }: { logs: ActivityLog[], onCommand: (cmd: string) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        onCommand(input);
        setInput('');
    };

    return (
        <div className="bg-black border border-slate-800 rounded-sm p-4 font-mono text-xs h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-6 bg-slate-900/80 border-b border-slate-800 flex items-center px-2 text-slate-500 select-none z-10">
                <Terminal className="w-3 h-3 mr-2" /> SYSTEM_CLI :: ROOT_ACCESS
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto mt-6 mb-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-slate-600">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                        <span className={`
                            ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                            ${log.type === 'warning' ? 'text-yellow-500' : ''}
                            ${log.type === 'auth' ? 'text-purple-500' : ''}
                            ${log.type === 'info' ? 'text-green-500' : ''}
                        `}>
                            {log.type.toUpperCase()}
                        </span>
                        <span className="text-slate-300">
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 items-center border-t border-slate-800 pt-2">
                <span className="text-green-500 font-bold">{'>'}</span>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    className="flex-1 bg-transparent focus:outline-none text-white placeholder-slate-700"
                    placeholder="Type command (try 'ping', 'clear', 'scan')..."
                    autoFocus
                />
            </form>
        </div>
    );
};

// --- Main Page ---

export function MonitorDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [isLive, setIsLive] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [latency, setLatency] = useState<number | null>(null);

    // Auth Check
    useEffect(() => {
        const checkAuth = () => {
            const isAuth = localStorage.getItem('monitor_auth');
            if (!isAuth) navigate('/monitor/login');
        };
        checkAuth();
    }, [navigate]);

    // Data Fetching
    const fetchStats = async () => {
        try {
            const start = performance.now();
            const { data, error } = await supabase.rpc('get_platform_stats');
            const end = performance.now();
            setLatency(Math.round(end - start));

            if (error) throw error;
            if (data) setStats(data as PlatformStats);
        } catch (err) {
            console.error("Fetch stats failed", err);
        }
    };

    useEffect(() => {
        if (!isLive) return;
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [isLive, refreshTrigger]);

    // CLI Handler
    const handleCommand = (cmd: string) => {
        // Add fake log
        const newLog: ActivityLog = { created_at: new Date().toISOString(), message: `EXEC CMD: ${cmd}`, type: 'info' };
        setStats(prev => prev ? ({ ...prev, recent_activities: [...prev.recent_activities, newLog] }) : null);

        if (cmd === 'clear') {
            setStats(prev => prev ? ({ ...prev, recent_activities: [] }) : null);
        } else if (cmd === 'ping') {
            setTimeout(() => {
                const pongLog: ActivityLog = { created_at: new Date().toISOString(), message: `PONG! Latency: ${latency}ms`, type: 'info' };
                setStats(prev => prev ? ({ ...prev, recent_activities: [...prev.recent_activities, pongLog] }) : null);
            }, 300);
        } else if (cmd === 'scan') {
            toast('Initiating Deep Scan...', { icon: '🔍', style: { borderRadius: '0px', background: '#333', color: '#fff' } });
            setTimeout(() => setRefreshTrigger(p => p + 1), 1000);
        } else {
            const errLog: ActivityLog = { created_at: new Date().toISOString(), message: `Command not found: ${cmd}`, type: 'error' };
            setStats(prev => prev ? ({ ...prev, recent_activities: [...prev.recent_activities, errLog] }) : null);
        }
    };

    // Realtime Listener
    useEffect(() => {
        const channel = supabase.channel('monitor_global')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                toast('New System Event: ' + payload.new.action, {
                    icon: '📡',
                    style: { background: '#0f172a', color: '#10b981', fontFamily: 'monospace' }
                });
                setRefreshTrigger(prev => prev + 1);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const logout = () => {
        localStorage.removeItem('monitor_auth');
        navigate('/monitor/login');
    };

    const [booting, setBooting] = useState(true);

    // Boot Sequence
    useEffect(() => {
        const timer = setTimeout(() => setBooting(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (booting) {
        return (
            <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center">
                <div className="w-64 space-y-2">
                    <div className="h-1 bg-green-900 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2 }}
                            className="h-full bg-green-500"
                        />
                    </div>
                    <div className="text-xs flex justify-between">
                        <span>SYSTEM_INIT</span>
                        <span>LOADING_MODULES...</span>
                    </div>
                    <div className="text-[10px] text-green-800 pt-4">
                        {['MOUNTING_DRIVES...', 'ESTABLISHING_CONSTANTS...', 'VERIFYING_ADMIN_HASH...', 'CONNECTING_GRID...'].map((txt, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.4 }}
                            >
                                {'> '}{txt}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-mono overflow-hidden flex flex-col selection:bg-green-500/20 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-500">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold tracking-widest text-sm">NESTIFY.AUTHORITY</span>
                    </div>
                    <div className="h-4 w-px bg-slate-800" />
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Globe className="w-3 h-3" />
                        <span>REGION: ASIA-SOUTH-1</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Zap className={`w-3 h-3 ${latency && latency > 200 ? 'text-red-500' : 'text-yellow-500'}`} />
                        <span>LATENCY: {latency ? `${latency}ms` : '--'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setIsLive(!isLive)} className={`flex items-center gap-2 text-xs border border-slate-700 px-3 py-1 rounded-sm ${isLive ? 'text-green-500 bg-green-500/10' : 'text-slate-500'}`}>
                        {isLive ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> LIVE</> : <Pause className="w-3 h-3" />}
                    </button>
                    {/* Payments Link */}
                    <button
                        onClick={() => navigate('/monitor/payments')}
                        className="flex items-center gap-2 text-xs border border-blue-700 px-3 py-1 rounded-sm text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                    >
                        <DollarSign className="w-3 h-3" /> PAYMENTS
                    </button>
                    <button
                        onClick={() => navigate('/monitor/settlements')}
                        className="flex items-center gap-2 text-xs border border-purple-700 px-3 py-1 rounded-sm text-purple-500 bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                        <ArrowDownLeft className="w-3 h-3" /> SETTLEMENTS
                    </button>
                    {/* Threat Level Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-sm border ${(stats?.alert_count || 0) > 50 ? 'border-red-500 text-red-500 bg-red-500/10' :
                        (stats?.alert_count || 0) > 10 ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                            'border-blue-500 text-blue-500 bg-blue-500/10'
                        }`}>
                        <AlertOctagon className="w-3 h-3" />
                        <span className="text-xs font-bold tracking-wider">
                            DEFCON: {(stats?.alert_count || 0) > 50 ? '1' : (stats?.alert_count || 0) > 10 ? '3' : '5'}
                        </span>
                    </div>
                    <button onClick={logout} className="text-xs hover:text-white transition-colors">LOGOUT</button>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 p-4 grid grid-cols-12 grid-rows-6 gap-4 overflow-hidden">

                {/* 1. Key Metrics Row */}
                <div className="col-span-12 row-span-1 grid grid-cols-4 gap-4">
                    <StatCard
                        label="Total Admins"
                        value={stats?.total_admins || 0}
                        icon={<Database className="w-4 h-4" />}
                        color="blue"
                        onClick={() => navigate('/monitor/registry')}
                    />
                    <StatCard
                        label="Active Tenants"
                        value={stats?.total_tenants || 0}
                        icon={<Users className="w-4 h-4" />}
                        color="green"
                        trend={2.4}
                        onClick={() => navigate('/monitor/registry')}
                    />
                    <StatCard
                        label="Platform Revenue"
                        value={`₹${(stats?.total_revenue || 0).toLocaleString()}`}
                        icon={<Activity className="w-4 h-4" />}
                        color="purple"
                        onClick={() => navigate('/monitor/payments')}
                    />
                    <StatCard
                        label="Security Alerts"
                        value={stats?.alert_count || 0}
                        icon={<AlertOctagon className="w-4 h-4" />}
                        color="red"
                    />
                </div>

                {/* 2. World Map / Visual (Center) */}
                <div className="col-span-8 row-span-3 bg-slate-900/30 border border-slate-800 rounded-sm relative p-4 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Wifi className="w-4 h-4" /> Global Network Topology
                    </h3>
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {/* CSS Radar Animation */}
                        <div className="absolute w-[500px] h-[500px] border border-slate-800 rounded-full opacity-20" />
                        <div className="absolute w-[300px] h-[300px] border border-slate-800 rounded-full opacity-30" />
                        <div className="absolute w-[100px] h-[100px] border border-slate-700 rounded-full opacity-50 flex items-center justify-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,1)]" />
                        </div>
                        <div className="absolute w-[500px] h-[500px] animate-spin-slow">
                            <div className="w-1/2 h-full border-r border-green-500/20 bg-gradient-to-r from-transparent to-green-500/5 origin-right absolute right-1/2" />
                        </div>
                        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-purple-500 rounded-full animate-ping delay-75" />
                    </div>
                </div>

                {/* 3. Server Health & Risk Radar (Right Side) */}
                <div className="col-span-4 row-span-3 grid grid-rows-2 gap-4">
                    {/* Node Status */}
                    <div className="bg-slate-900/30 border border-slate-800 rounded-sm p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Cpu className="w-4 h-4" /> Node Status
                        </h3>
                        <div className="space-y-3">
                            {['Auth Server', 'Database', 'Redis'].map((name, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded hover:bg-slate-800 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-xs text-slate-400 group-hover:text-white">{name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-600">OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Risk Radar */}
                    <RiskRadar tenants={stats?.high_risk_tenants || []} />
                </div>

                {/* 4. Terminal Log (Bottom Full Width) */}
                <div className="col-span-12 row-span-2">
                    <TerminalLog logs={stats?.recent_activities || []} onCommand={handleCommand} />
                </div>
            </main>
        </div>
    );
}

// Custom CSS
const style = document.createElement('style');
style.textContent = `
    .animate-spin-slow { animation: spin 4s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);
