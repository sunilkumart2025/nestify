import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

const expenseSchema = z.object({
    title: z.string().min(2, 'Title is required'),
    amount: z.string().min(1, 'Amount is required'), // Input as string, convert to number
    category: z.string().min(2, 'Category is required'),
    vendor_id: z.string().optional(),
    expense_date: z.string().min(1, 'Date is required'),
    payment_mode: z.string().min(1, 'Payment mode is required'),
    notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            expense_date: new Date().toISOString().split('T')[0],
            payment_mode: 'cash'
        }
    });

    useEffect(() => {
        if (isOpen) {
            fetchVendors();
        }
    }, [isOpen]);

    const fetchVendors = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('vendors').select('id, name').eq('admin_id', user.id);
        setVendors(data || []);
    };

    const onSubmit = async (data: ExpenseFormData) => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('expenses')
                .insert({
                    title: data.title,
                    amount: parseFloat(data.amount),
                    category: data.category,
                    vendor_id: data.vendor_id || null, // Handle empty string
                    expense_date: data.expense_date,
                    payment_mode: data.payment_mode,
                    notes: data.notes,
                    admin_id: user.id
                });

            if (error) throw error;

            toast.success('Expense logged successfully');
            reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to log expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log New Expense">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Description"
                    placeholder="e.g. Fan Repair Room 101"
                    {...register('title')}
                    error={errors.title?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label="Amount (₹)"
                        placeholder="0.00"
                        {...register('amount')}
                        error={errors.amount?.message}
                    />
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Date</label>
                        <input
                            type="date"
                            {...register('expense_date')}
                            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        />
                        {errors.expense_date && (
                            <p className="text-xs text-red-500">{errors.expense_date.message}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Category</label>
                        <select
                            {...register('category')}
                            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        >
                            <option value="">Select...</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Staff Salary">Staff Salary</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Water">Water</option>
                            <option value="Internet">Internet</option>
                            <option value="Food/Mess">Food / Mess</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Capex">Capex (Asset)</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.category && (
                            <p className="text-xs text-red-500">{errors.category.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Vendor (Optional)</label>
                        <select
                            {...register('vendor_id')}
                            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        >
                            <option value="">None</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                    <div className="flex gap-4 mt-1">
                        {['cash', 'upi', 'bank_transfer'].map((mode) => (
                            <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value={mode}
                                    {...register('payment_mode')}
                                    className="accent-primary"
                                />
                                <span className="text-sm capitalize">{mode.replace('_', ' ')}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Notes</label>
                    <textarea
                        {...register('notes')}
                        className="w-full min-h-[80px] px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        placeholder="Additional details..."
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} className="mr-2">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Log Expense
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
