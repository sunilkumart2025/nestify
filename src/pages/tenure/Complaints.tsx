import { useEffect, useState } from 'react';
import { Plus, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ReportIssueModal } from '../../components/tenure/ReportIssueModal';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export function TenureComplaints() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const fetchComplaints = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('complaints')
                .select('*')
                .eq('tenure_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComplaints(data || []);
        } catch (error) {
            console.error('Error loading complaints:', error);
            toast.error('Failed to load complaints');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'emergency': return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'high': return <AlertCircle className="h-5 w-5 text-orange-500" />;
            default: return <Wrench className="h-5 w-5 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Complaints & Issues</h1>
                    <p className="text-slate-600">Report and track maintenance requests</p>
                </div>
                <Button onClick={() => setIsReportModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Report Issue
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No issues reported</h3>
                        <p className="mt-1 text-slate-500">Everything seems to be working perfectly!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {complaints.map((complaint) => (
                            <div key={complaint.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="mt-1 p-2 bg-slate-100 rounded-lg">
                                            {getPriorityIcon(complaint.priority)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">{complaint.title}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                                                    {complaint.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm mb-2">{complaint.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span>Reported on {formatDate(complaint.created_at)}</span>
                                                <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                                    {complaint.priority} Priority
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                onSuccess={fetchComplaints}
            />
        </div>
    );
}
