import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Laptop, Smartphone, Globe, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

interface DeviceSession {
    id: string;
    device_name: string;
    ip_address: string;
    location: string;
    last_active: string;
    is_trusted: boolean;
}

interface ActiveSessionsListProps {
    hideIp?: boolean;
}

export function ActiveSessionsList({ hideIp = false }: ActiveSessionsListProps) {
    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_devices')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_trusted', true)
            .order('last_active', { ascending: false });

        setSessions(data || []);
        setLoading(false);
    };

    const revokeSession = async (deviceId: string) => {
        if (!confirm("Are you sure you want to revoke this device? It will be logged out.")) return;

        try {
            const { error } = await supabase.rpc('untrust_device', { p_device_id: deviceId });
            if (error) throw error;
            toast.success('Device revoked successfully');
            fetchSessions();
        } catch (err) {
            toast.error('Failed to revoke device');
        }
    };

    if (loading) return <div className="text-center py-4 text-slate-400">Loading active sessions...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Active Sessions (Fortress Protocol)</h3>
            <p className="text-sm text-slate-600 mb-6">Manage devices that are currently logged into your account.</p>

            <div className="space-y-4">
                {sessions.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No active sessions tracked.</p>
                ) : (
                    sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-full border border-slate-100 text-primary">
                                    {session.device_name.toLowerCase().includes('mobile') ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{session.device_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <Globe className="h-3 w-3" />
                                        {hideIp ? (
                                            <span className="text-slate-400 font-mono">IP Hidden</span>
                                        ) : (
                                            <span>{session.ip_address || 'Unknown IP'}</span>
                                        )}

                                        <span>•</span>
                                        <span>{session.location || 'Unknown Location'}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Last active: {new Date(session.last_active).toLocaleString()}</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                onClick={() => revokeSession(session.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke
                            </Button>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                    <strong>Security Note:</strong> Revoking a session marks the device as untrusted. They will remain logged in until their token expires, but the system will flag their access.
                </p>
            </div>
        </div>
    );
}
