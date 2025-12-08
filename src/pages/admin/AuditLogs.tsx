import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import {
    Search,
    Filter,
    ShieldAlert,
    FileText,
    CreditCard,
    Trash2
} from 'lucide-react';
import { Input } from '../../components/ui/Input';


interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    user_email?: string; // Joined manually or via view
}

export function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('admin_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (action: string) => {
        if (action.includes('PAYMENT')) return <CreditCard className="h-4 w-4 text-green-600" />;
        if (action.includes('DELETE')) return <Trash2 className="h-4 w-4 text-red-600" />;
        if (action.includes('INVOICE')) return <FileText className="h-4 w-4 text-blue-600" />;
        return <ShieldAlert className="h-4 w-4 text-slate-600" />;
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Security Audit Logs</h1>
                    <p className="text-slate-500">Track all critical system activities and changes</p>
                </div>
                <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3" />
                    Security Monitor Active
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search logs by action or type..."
                        className="pl-10"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* Logs List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Action</th>
                                <th className="px-6 py-4 font-semibold">Details</th>
                                <th className="px-6 py-4 font-semibold">Entity</th>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading audit trail...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">No logs found</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white border border-slate-200 transition-colors">
                                                    {getIcon(log.action)}
                                                </div>
                                                <span className="font-medium text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="max-w-xs truncate">
                                                {JSON.stringify(log.details) === '{}' ? '-' :
                                                    Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                {log.entity_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
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
