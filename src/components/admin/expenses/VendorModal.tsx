import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

const vendorSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    category: z.string().min(2, 'Category is required'),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    gst_number: z.string().optional(),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function VendorModal({ isOpen, onClose, onSuccess }: VendorModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<VendorFormData>({
        resolver: zodResolver(vendorSchema)
    });

    const onSubmit = async (data: VendorFormData) => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('vendors')
                .insert({
                    ...data,
                    admin_id: user.id
                });

            if (error) throw error;

            toast.success('Vendor added successfully');
            reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add vendor');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Vendor">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Vendor Name"
                    placeholder="e.g. A1 Electricals"
                    {...register('name')}
                    error={errors.name?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Category</label>
                        <select
                            {...register('category')}
                            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                        >
                            <option value="">Select...</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Supplies">Supplies</option>
                            <option value="Services">Services</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.category && (
                            <p className="text-xs text-red-500">{errors.category.message}</p>
                        )}
                    </div>
                    <Input
                        label="Phone"
                        placeholder="Optional"
                        {...register('phone')}
                    />
                </div>

                <Input
                    label="Email"
                    placeholder="Optional"
                    {...register('email')}
                    error={errors.email?.message}
                />

                <Input
                    label="GST Number"
                    placeholder="Optional"
                    {...register('gst_number')}
                />

                <div className="flex justify-end pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} className="mr-2">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Save Vendor
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
