
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, LogIn, CreditCard, Trash2, Edit, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export function AuditLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch logs linked to this Admin (includes self and tenants)
            const { data } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('admin_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) setLogs(data);
            setIsLoading(false);
        };

        fetchLogs();
    }, []);

    const getIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LogIn className="h-4 w-4 text-blue-500" />;
        if (action.includes('PAYMENT')) return <CreditCard className="h-4 w-4 text-green-500" />;
        if (action.includes('DELETE')) return <Trash2 className="h-4 w-4 text-red-500" />;
        if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit className="h-4 w-4 text-orange-500" />;
        return <FileText className="h-4 w-4 text-slate-500" />;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-slate-600">Timeline of critical activities and security events</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {logs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No logs found</h3>
                        <p className="mt-1 text-slate-500">Activity will appear here once recorded.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                                <div className="mt-1 p-2 bg-slate-100 rounded-lg h-fit">
                                    {getIcon(log.action)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {JSON.stringify(log.details) === '{}' ? 'No details' : JSON.stringify(log.details).substring(0, 100)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-slate-500">
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400 font-mono">
                                        <span>User: {log.user_id?.substring(0, 8)}...</span>
                                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
