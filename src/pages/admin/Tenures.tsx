import { useEffect, useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TenureCard } from '../../components/admin/TenureCard';
import { EditTenureModal } from '../../components/admin/EditTenureModal';
import { TenureProfileModal } from '../../components/admin/TenureProfileModal';
import { supabase } from '../../lib/supabase';
import type { Tenure } from '../../lib/types';
import { toast } from 'react-hot-toast';

export function AdminTenures() {
    const [tenures, setTenures] = useState<Tenure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTenure, setEditingTenure] = useState<Tenure | null>(null);
    const [viewingTenure, setViewingTenure] = useState<Tenure | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const fetchTenures = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tenures')
                .select(`
          *,
          room:rooms(room_number, type)
        `)
                .eq('admin_id', user.id)
                .order('full_name', { ascending: true });

            if (error) throw error;
            setTenures(data);
        } catch (error: any) {
            toast.error('Failed to load tenures');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenures();
    }, []);

    const handleViewProfile = (tenure: Tenure) => {
        setViewingTenure(tenure);
    };

    const handleExport = () => {
        if (!tenures.length) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Full Name', 'Email', 'Phone', 'Room', 'Status', 'Joined Date'];
        const csvContent = [
            headers.join(','),
            ...tenures.map(t => [
                t.full_name,
                t.email,
                t.phone,
                t.room?.room_number || 'Unassigned',
                t.status,
                new Date(t.created_at).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Nestify_Tenants_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('Tenant list downloaded');
    };

    const filteredTenures = tenures.filter(tenure => {
        const matchesSearch =
            tenure.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tenure.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterStatus === 'all' ? true : tenure.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tenure Management</h1>
                    <p className="text-slate-600">Manage your tenants and room assignments</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tenures..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Button variant="outline" className="sm:w-auto" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                        <Filter className="mr-2 h-4 w-4" />
                        {filterStatus === 'all' ? 'All Status' : filterStatus === 'active' ? 'Active' : 'Inactive'}
                    </Button>
                    {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden">
                            <button onClick={() => { setFilterStatus('all'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">All</button>
                            <button onClick={() => { setFilterStatus('active'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Active</button>
                            <button onClick={() => { setFilterStatus('inactive'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Inactive</button>
                        </div>
                    )}
                </div>
                <Button variant="outline" className="sm:w-auto" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export All
                </Button>
            </div>

            {/* Tenure Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredTenures.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No tenures found. Share your StayKey to invite tenants!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTenures.map((tenure) => (
                        <TenureCard
                            key={tenure.id}
                            tenure={tenure}
                            onEdit={(t) => setEditingTenure(t)}
                            onViewDetails={handleViewProfile}
                        />
                    ))}
                </div>
            )}

            <EditTenureModal
                isOpen={!!editingTenure}
                onClose={() => setEditingTenure(null)}
                onSuccess={fetchTenures}
                tenure={editingTenure}
            />

            <TenureProfileModal
                isOpen={!!viewingTenure}
                onClose={() => setViewingTenure(null)}
                tenure={viewingTenure}
            />
        </div>
    );
}
