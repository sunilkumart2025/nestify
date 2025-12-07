import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import type { Tenure } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { sendEmail, EmailTemplates } from '../../lib/email';

const invoiceItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().min(0, 'Amount must be positive'),
});

const invoiceSchema = z.object({
    tenureId: z.string().min(1, 'Tenant is required'),
    month: z.string().min(1, 'Month is required'),
    year: z.coerce.number(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface GenerateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GenerateInvoiceModal({ isOpen, onClose, onSuccess }: GenerateInvoiceModalProps) {
    const [tenures, setTenures] = useState<Tenure[]>([]);

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            items: [{ description: 'Monthly Rent', amount: 0 as any }],
            month: new Date().toLocaleString('default', { month: 'long' }),
            year: new Date().getFullYear() as any,
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const selectedTenureId = watch('tenureId');

    useEffect(() => {
        if (isOpen) {
            const fetchTenures = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('tenures')
                    .select('*, room:rooms(*)')
                    .eq('admin_id', user.id)
                    .eq('status', 'active');

                if (data) setTenures(data);
            };
            fetchTenures();
        } else {
            reset();
        }
    }, [isOpen, reset]);

    // Auto-fill rent when tenant is selected
    useEffect(() => {
        if (selectedTenureId) {
            const tenure = tenures.find(t => t.id === selectedTenureId);
            if (tenure && tenure.room) {
                setValue('items.0.amount', tenure.room.price as any);
            }
        }
    }, [selectedTenureId, tenures, setValue]);

    const calculateTotal = (items: any[]) => {
        return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    };

    const watchedItems = watch('items');
    const subtotal = calculateTotal(watchedItems);

    // Fee Calculation Logic (Mock)
    const FIXED_FEE = 100; // Example fixed platform fee
    const PLATFORM_PERCENT = 0.02; // 2%
    const platformShare = Math.round(subtotal * PLATFORM_PERCENT);
    const totalAmount = subtotal + FIXED_FEE + platformShare;

    const onSubmit = async (data: InvoiceFormData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const invoiceData = {
                admin_id: user.id,
                tenure_id: data.tenureId,
                month: data.month,
                year: data.year,
                items: data.items,
                subtotal: subtotal,
                fixed_fee: FIXED_FEE,
                platform_share_amount: platformShare,
                maintenance_share_amount: 0,
                support_share_amount: 0,
                development_share_amount: 0,
                gateway_fee_amount: 0,
                total_platform_fee: FIXED_FEE + platformShare,
                total_amount: totalAmount,
                status: 'pending'
            };

            const { error } = await supabase
                .from('invoices')
                .insert(invoiceData);

            if (error) throw error;

            // Send Email Notification
            const tenant = tenures.find(t => t.id === data.tenureId);
            if (tenant && tenant.email) {
                const emailSent = await sendEmail({
                    to: tenant.email,
                    subject: `New Invoice for ${data.month}`,
                    html: EmailTemplates.invoiceNotification(
                        tenant.full_name,
                        formatCurrency(totalAmount),
                        `${data.month} ${data.year}`,
                        new Date().toLocaleDateString()
                    )
                });

                if (emailSent) {
                    toast.success('Invoice generated & Email sent!');
                } else {
                    toast.success('Invoice generated (Email failed)');
                }
            } else {
                toast.success('Invoice generated successfully');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate invoice');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Invoice"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Select Tenant</label>
                    <select
                        {...register('tenureId')}
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                        <option value="">Select a tenant...</option>
                        {tenures.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.full_name} - Room {t.room?.room_number || 'N/A'}
                            </option>
                        ))}
                    </select>
                    {errors.tenureId && <p className="text-sm text-red-500">{errors.tenureId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Month</label>
                        <select
                            {...register('month')}
                            className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Year"
                        type="number"
                        {...register('year')}
                        error={errors.year?.message}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-700">Bill Items</label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => append({ description: '', amount: 0 as any })}>
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                        </Button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                            <div className="flex-1">
                                <Input
                                    placeholder="Description"
                                    {...register(`items.${index}.description`)}
                                    error={errors.items?.[index]?.description?.message}
                                />
                            </div>
                            <div className="w-32">
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    {...register(`items.${index}.amount`)}
                                    error={errors.items?.[index]?.amount?.message}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Platform Fee (Fixed)</span>
                        <span>{formatCurrency(FIXED_FEE)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Platform Share (2%)</span>
                        <span>{formatCurrency(platformShare)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                        <span>Total Amount</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Generate Invoice
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
