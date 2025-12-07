import { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export function AdminMaintenance() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchComplaints = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('complaints')
                .select('*, tenure:tenures(full_name, room:rooms(room_number))')
                .eq('admin_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComplaints(data || []);
        } catch (error) {
            console.error('Error loading complaints:', error);
            toast.error('Failed to load maintenance requests');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('complaints')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Complaint marked as ${newStatus.replace('_', ' ')}`);
            // Optimistic update
            setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const filteredComplaints = filterStatus === 'all'
        ? complaints
        : complaints.filter(c => c.status === filterStatus);

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'emergency': return 'bg-red-100 text-red-800 ring-red-600/20';
            case 'high': return 'bg-orange-100 text-orange-800 ring-orange-600/20';
            case 'medium': return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
            default: return 'bg-blue-100 text-blue-800 ring-blue-600/20';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Maintenance Requests</h1>
                    <p className="text-slate-600">Track and resolve tenant issues</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    {['all', 'open', 'in_progress', 'resolved'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterStatus === status
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredComplaints.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
                        <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No complaints found</h3>
                        <p className="mt-1 text-slate-500">Great job! Everything is under control.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredComplaints.map((complaint) => (
                            <div key={complaint.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ring-1 ring-inset ${getPriorityBadge(complaint.priority)}`}>
                                                {complaint.priority}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {formatDate(complaint.created_at)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">{complaint.title}</h3>
                                        <p className="text-slate-600 text-sm mb-4">{complaint.description}</p>

                                        <div className="flex items-center gap-3 text-sm border-t border-slate-50 pt-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {complaint.tenure?.full_name?.substring(0, 1) || '?'}
                                                </div>
                                                <span className="font-medium text-slate-700">{complaint.tenure?.full_name}</span>
                                            </div>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-slate-500">Room {complaint.tenure?.room?.room_number || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="flex md:flex-col justify-end gap-2 min-w-[140px]">
                                        {complaint.status !== 'resolved' && (
                                            <>
                                                {complaint.status === 'open' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleStatusUpdate(complaint.id, 'in_progress')}
                                                        className="w-full justify-start"
                                                    >
                                                        <Clock className="w-4 h-4 mr-2 text-blue-500" /> Start Work
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStatusUpdate(complaint.id, 'resolved')}
                                                    className="w-full bg-green-600 hover:bg-green-700 justify-start"
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                                                </Button>
                                            </>
                                        )}
                                        {complaint.status === 'resolved' && (
                                            <div className="flex items-center justify-center py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Resolved
                                            </div>
                                        )}
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
