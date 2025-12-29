import { useState, useMemo } from 'react';
import { sendEmail, EmailTemplates } from '../../lib/email';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Users, Search, CheckSquare, Square } from 'lucide-react';
import type { Tenure } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';

interface BulkGenerateBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenures: Tenure[];
    onSuccess: () => void;
}

export function BulkGenerateBillModal({ isOpen, onClose, tenures, onSuccess }: BulkGenerateBillModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [formData, setFormData] = useState({
        rent: '',
        electricity: '',
        water: '',
        maintenance: '',
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0]
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter tenures for selection list
    const filteredTenures = useMemo(() => {
        return tenures.filter(t =>
            t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.room?.room_number.toString().includes(searchQuery)
        );
    }, [tenures, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTenures.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set(filteredTenures.map(t => t.id));
            setSelectedIds(newSet);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.size === 0) {
            toast.error('Please select at least one tenant');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate Totals and Items (Common for all for now)
            const rent = parseFloat(formData.rent) || 0;
            const electricity = parseFloat(formData.electricity) || 0;
            const water = parseFloat(formData.water) || 0;
            const maintenance = parseFloat(formData.maintenance) || 0;

            if (rent <= 0) throw new Error("Rent amount is required");

            const items = [
                { description: 'Room Rent', amount: rent },
                ...(electricity > 0 ? [{ description: 'Electricity Charges', amount: electricity }] : []),
                ...(water > 0 ? [{ description: 'Water Charges', amount: water }] : []),
                ...(maintenance > 0 ? [{ description: 'Maintenance Charges', amount: maintenance }] : [])
            ];

            const subtotal = rent + electricity + water + maintenance;

            // Fee Calculation (Same as Billing.tsx)
            const BILLING_RULES = {
                FIXED_FEE: 5,
                PLATFORM_PERCENT: 0.006, // 0.6%
                DEV_PERCENT: 0.0005,     // 0.05%
                SUPPORT_PERCENT: 0.0015, // 0.15%
                MAINT_PERCENT: 0.002,    // 0.2%
                GATEWAY_PERCENT: 0.0015  // 0.15%
            };

            const platformShare = Math.round(subtotal * BILLING_RULES.PLATFORM_PERCENT);
            const devShare = Math.round(subtotal * BILLING_RULES.DEV_PERCENT);
            const supportShare = Math.round(subtotal * BILLING_RULES.SUPPORT_PERCENT);
            const maintShare = Math.round(subtotal * BILLING_RULES.MAINT_PERCENT);
            const gatewayFee = Math.round(subtotal * BILLING_RULES.GATEWAY_PERCENT);
            const fixedFee = BILLING_RULES.FIXED_FEE;

            const totalFees = fixedFee + platformShare + devShare + supportShare + maintShare + gatewayFee;
            const total = subtotal + totalFees;

            // Update Items with Fees
            const fullItems = [
                ...items,
                { description: 'Fixed Service Fee', amount: fixedFee, type: 'fee' },
                { description: `Platform Share (${(BILLING_RULES.PLATFORM_PERCENT * 100).toFixed(1)}%)`, amount: platformShare, type: 'fee' },
                { description: `Development Share (${(BILLING_RULES.DEV_PERCENT * 100).toFixed(2)}%)`, amount: devShare, type: 'fee' },
                { description: `Support Share (${(BILLING_RULES.SUPPORT_PERCENT * 100).toFixed(2)}%)`, amount: supportShare, type: 'fee' },
                { description: `System Maintenance (${(BILLING_RULES.MAINT_PERCENT * 100).toFixed(1)}%)`, amount: maintShare, type: 'fee' },
                { description: `Gateway Fee (${(BILLING_RULES.GATEWAY_PERCENT * 100).toFixed(2)}%)`, amount: gatewayFee, type: 'fee' }
            ];

            // Prepare Batch Payload
            const invoicesToInsert = Array.from(selectedIds).map(tenureId => ({
                admin_id: user.id,
                tenure_id: tenureId,
                month: formData.month,
                due_date: formData.due_date,
                year: new Date(formData.due_date).getFullYear(),
                status: 'pending',
                items: fullItems,
                subtotal: subtotal,
                total_amount: total
            }));

            const { error } = await supabase
                .from('invoices')
                .insert(invoicesToInsert);

            if (error) throw error;

            // Send Emails in Parallel
            toast.loading(`Sending ${selectedIds.size} emails...`, { duration: 3000 });

            const emailPromises = Array.from(selectedIds).map(async (tenureId) => {
                const tenant = tenures.find(t => t.id === tenureId);
                if (!tenant?.email) return;

                try {
                    await sendEmail({
                        to: tenant.email,
                        subject: `New Invoice: ${formData.month} Rent`,
                        html: EmailTemplates.invoiceNotification(
                            tenant.full_name,
                            formatCurrency(total),
                            formData.month,
                            new Date(formData.due_date).toLocaleDateString()
                        )
                    });
                } catch (err) {
                    console.error("Failed to email", tenant.email, err);
                }
            });

            await Promise.all(emailPromises);

            toast.success(`Generated ${selectedIds.size} invoices & sent emails!`);
            onSuccess();
            onClose();
            setSelectedIds(new Set());
            setFormData(prev => ({ ...prev, rent: '', electricity: '', water: '', maintenance: '' }));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculated total for display
    const currentTotal = (parseFloat(formData.rent) || 0) + (parseFloat(formData.electricity) || 0) + (parseFloat(formData.water) || 0) + (parseFloat(formData.maintenance) || 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Bulk Bill Generation"
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-[550px]">

                {/* 1. SELECTION AREA */}
                <div className="flex-1 min-h-0 flex flex-col mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">Select Tenants ({selectedIds.size})</label>
                        <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-xs text-primary hover:text-primary-hover font-medium flex items-center"
                        >
                            {selectedIds.size === filteredTenures.length ? <CheckSquare className="h-3 w-3 mr-1" /> : <Square className="h-3 w-3 mr-1" />}
                            {selectedIds.size === filteredTenures.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or room..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {filteredTenures.map(tenure => (
                            <div
                                key={tenure.id}
                                onClick={() => toggleSelection(tenure.id)}
                                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedIds.has(tenure.id)
                                    ? 'bg-blue-100 border border-blue-200'
                                    : 'hover:bg-white border border-transparent'
                                    }`}
                            >
                                <div className={`h-4 w-4 mr-3 rounded border flex items-center justify-center ${selectedIds.has(tenure.id) ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                                    }`}>
                                    {selectedIds.has(tenure.id) && <Users className="h-3 w-3" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-slate-900">{tenure.full_name}</div>
                                    <div className="text-xs text-slate-500">Room {tenure.room?.room_number || 'N/A'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. COMMON DATA */}
                <div className=" pt-2 space-y-4">
                    <div className="text-sm font-medium text-slate-700 border-b border-slate-100 pb-1 mb-2">Common Billing Details</div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Room Rent</label>
                            <Input type="number" value={formData.rent} onChange={(e) => setFormData({ ...formData, rent: e.target.value })} placeholder="0.00" required className="h-9" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Electricity</label>
                            <Input type="number" value={formData.electricity} onChange={(e) => setFormData({ ...formData, electricity: e.target.value })} placeholder="0.00" className="h-9" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Water</label>
                            <Input type="number" value={formData.water} onChange={(e) => setFormData({ ...formData, water: e.target.value })} placeholder="0.00" className="h-9" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Maintenance</label>
                            <Input type="number" value={formData.maintenance} onChange={(e) => setFormData({ ...formData, maintenance: e.target.value })} placeholder="0.00" className="h-9" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Billing Month</label>
                            <Input type="text" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} required className="h-9" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                            <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required className="h-9" />
                        </div>
                    </div>
                </div>

                {/* 3. ACTIONS */}
                <div className="flex gap-3 pt-6 mt-auto">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || selectedIds.size === 0} className="flex-1">
                        {loading
                            ? 'Generating...'
                            : `Generate ${selectedIds.size} Bills (${formatCurrency(currentTotal)} each)`
                        }
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
