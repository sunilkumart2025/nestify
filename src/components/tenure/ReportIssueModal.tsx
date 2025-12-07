
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertCircle, AlertTriangle, Clock, Info } from 'lucide-react';

const complaintSchema = z.object({
    title: z.string().min(3, 'Title is too short'),
    description: z.string().min(10, 'Please provide more details'),
    priority: z.enum(['low', 'medium', 'high', 'emergency']),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

interface ReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ReportIssueModal({ isOpen, onClose, onSuccess }: ReportIssueModalProps) {
    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ComplaintFormData>({
        resolver: zodResolver(complaintSchema),
        defaultValues: {
            priority: 'medium'
        }
    });

    const selectedPriority = watch('priority');

    const onSubmit = async (data: ComplaintFormData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch tenant details to get admin_id
            const { data: tenure } = await supabase
                .from('tenures')
                .select('admin_id')
                .eq('id', user.id)
                .single();

            if (!tenure) throw new Error('Tenant profile not found');

            const { error } = await supabase
                .from('complaints')
                .insert({
                    tenure_id: user.id,
                    admin_id: tenure.admin_id,
                    title: data.title,
                    description: data.description,
                    priority: data.priority,
                    status: 'open'
                });

            if (error) throw error;

            toast.success('Issue reported successfully!');
            reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to report issue');
        }
    };

    const priorities = [
        { value: 'low', label: 'Low', icon: Info, color: 'text-blue-600 bg-blue-50' },
        { value: 'medium', label: 'Medium', icon: Clock, color: 'text-orange-600 bg-orange-50' },
        { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
        { value: 'emergency', label: 'Urgent', icon: AlertCircle, color: 'text-rose-700 bg-rose-100 ring-rose-500' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Report an Issue"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Priority Level</label>
                    <div className="grid grid-cols-2 gap-3">
                        {priorities.map((p) => (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => setValue('priority', p.value as any)}
                                className={`flex items-center p-3 rounded-lg border transition-all ${selectedPriority === p.value
                                    ? `border-current ring-1 ring-current ${p.color}`
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                            >
                                <p.icon className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">{p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Input
                    label="Issue Title"
                    placeholder="e.g. Leaky Tap in Bathroom"
                    {...register('title')}
                    error={errors.title?.message}
                />

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Description</label>
                    <textarea
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                        placeholder="Please describe the issue in detail..."
                        {...register('description')}
                    />
                    {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} className={selectedPriority === 'emergency' ? 'bg-red-600 hover:bg-red-700' : ''}>
                        Submit Report
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
