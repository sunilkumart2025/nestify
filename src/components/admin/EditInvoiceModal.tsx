import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Invoice } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';

interface EditInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    onSuccess: () => void;
}

export function EditInvoiceModal({ isOpen, onClose, invoice, onSuccess }: EditInvoiceModalProps) {
    const [formData, setFormData] = useState({
        rent: '',
        electricity: '',
        water: '',
        maintenance: '',
        month: '',
        due_date: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (invoice) {
            // Parse existing items to populate fields
            let rent = 0;
            let electricity = 0;
            let water = 0;
            let maintenance = 0;

            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach((item: any) => {
                    const desc = item.description.toLowerCase();
                    if (desc.includes('rent')) rent = item.amount;
                    else if (desc.includes('electricity') || desc.includes('eb')) electricity = item.amount;
                    else if (desc.includes('water')) water = item.amount;
                    else if (desc.includes('maintenance')) maintenance = item.amount;
                    else {
                        // Fallback: if it's a single item legacy invoice, assign to rent
                        if (rent === 0) rent = item.amount;
                    }
                });
            } else {
                // Fallback for very old data
                rent = invoice.total_amount;
            }

            // Date parsing
            let formattedDate = '';
            try {
                if (invoice.due_date) {
                    formattedDate = new Date(invoice.due_date).toISOString().split('T')[0];
                } else {
                    formattedDate = new Date().toISOString().split('T')[0];
                }
            } catch (e) {
                formattedDate = new Date().toISOString().split('T')[0];
            }

            setFormData({
                rent: rent.toString(),
                electricity: electricity > 0 ? electricity.toString() : '',
                water: water > 0 ? water.toString() : '',
                maintenance: maintenance > 0 ? maintenance.toString() : '',
                month: invoice.month || '',
                due_date: formattedDate
            });
        }
    }, [invoice]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;

        setLoading(true);
        try {
            const rent = parseFloat(formData.rent) || 0;
            const electricity = parseFloat(formData.electricity) || 0;
            const water = parseFloat(formData.water) || 0;
            const maintenance = parseFloat(formData.maintenance) || 0;

            if (rent <= 0) throw new Error("Rent amount is required");

            // Rebuild Items
            const items = [
                { description: 'Room Rent', amount: rent },
                ...(electricity > 0 ? [{ description: 'Electricity Charges', amount: electricity }] : []),
                ...(water > 0 ? [{ description: 'Water Charges', amount: water }] : []),
                ...(maintenance > 0 ? [{ description: 'Maintenance Charges', amount: maintenance }] : [])
            ];

            const subtotal = rent + electricity + water + maintenance;
            const total = subtotal;

            const { error } = await supabase
                .from('invoices')
                .update({
                    total_amount: total,
                    subtotal: subtotal,
                    items: items,
                    month: formData.month,
                    due_date: formData.due_date,
                    // safe to update year too if needed, but usually year follows due_date
                    year: new Date(formData.due_date).getFullYear()
                })
                .eq('id', invoice.id);

            if (error) throw error;

            toast.success('Invoice details updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!invoice) return null;

    const currentTotal = (parseFloat(formData.rent) || 0) + (parseFloat(formData.electricity) || 0) + (parseFloat(formData.water) || 0) + (parseFloat(formData.maintenance) || 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Invoice #${invoice.id.substring(0, 6)}`}
        >
            <form onSubmit={handleUpdate} className="space-y-4">

                {/* Detailed Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Room Rent</label>
                        <Input type="number" value={formData.rent} onChange={(e) => setFormData({ ...formData, rent: e.target.value })} required placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Electricity Bill</label>
                        <Input type="number" value={formData.electricity} onChange={(e) => setFormData({ ...formData, electricity: e.target.value })} placeholder="0.00" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Water Charges</label>
                        <Input type="number" value={formData.water} onChange={(e) => setFormData({ ...formData, water: e.target.value })} placeholder="0.00" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance</label>
                        <Input type="number" value={formData.maintenance} onChange={(e) => setFormData({ ...formData, maintenance: e.target.value })} placeholder="0.00" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billing Month</label>
                    <Input
                        type="text"
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        required
                    />
                </div>

                <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center text-sm font-medium text-slate-900">
                    <span>New Total:</span>
                    <span>{formatCurrency(currentTotal)}</span>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
