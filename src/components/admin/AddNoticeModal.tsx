
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Bell, AlertTriangle, Info, Calendar } from 'lucide-react';

const noticeSchema = z.object({
    title: z.string().min(3, 'Title is too short'),
    content: z.string().min(5, 'Content is too short'),
    category: z.enum(['general', 'maintenance', 'event', 'urgent']),
});

type NoticeFormData = z.infer<typeof noticeSchema>;

interface AddNoticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddNoticeModal({ isOpen, onClose, onSuccess }: AddNoticeModalProps) {
    const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<NoticeFormData>({
        resolver: zodResolver(noticeSchema),
        defaultValues: {
            category: 'general'
        }
    });

    const selectedCategory = watch('category');

    const onSubmit = async (data: NoticeFormData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('notices')
                .insert({
                    admin_id: user.id,
                    title: data.title,
                    content: data.content,
                    category: data.category
                });

            if (error) throw error;

            toast.success('Notice posted successfully!');
            reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to post notice');
        }
    };

    const categories = [
        { value: 'general', label: 'General', icon: Info, color: 'text-blue-600 bg-blue-50' },
        { value: 'urgent', label: 'Urgent', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
        { value: 'maintenance', label: 'Maintenance', icon: Bell, color: 'text-orange-600 bg-orange-50' },
        { value: 'event', label: 'Event', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Post New Notice"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Category</label>
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.value}
                                type="button"
                                onClick={() => setValue('category', cat.value as any)}
                                className={`flex items-center p-3 rounded-lg border transition-all ${selectedCategory === cat.value
                                    ? `border-current ring-1 ring-current ${cat.color}`
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                            >
                                <cat.icon className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Input
                    label="Notice Title"
                    placeholder="e.g. Water Tank Cleaning"
                    {...register('title')}
                    error={errors.title?.message}
                />

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Content</label>
                    <textarea
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                        placeholder="Enter the details of the announcement..."
                        {...register('content')}
                    />
                    {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Post Notice
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
