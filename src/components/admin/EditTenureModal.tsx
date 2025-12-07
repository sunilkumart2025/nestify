import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Tenure, Room } from '../../lib/types';

const tenureSchema = z.object({
    roomId: z.string().optional(),
    status: z.enum(['pending', 'active']),
});

type TenureFormData = z.infer<typeof tenureSchema>;

interface EditTenureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenure: Tenure | null;
}

export function EditTenureModal({ isOpen, onClose, onSuccess, tenure }: EditTenureModalProps) {
    const [rooms, setRooms] = useState<Room[]>([]);

    const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm<TenureFormData>({
        resolver: zodResolver(tenureSchema),
    });

    useEffect(() => {
        if (isOpen) {
            const fetchRooms = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('admin_id', user.id)
                    .order('room_number');

                if (data) setRooms(data);
            };
            fetchRooms();
        }
    }, [isOpen]);

    useEffect(() => {
        if (tenure) {
            setValue('roomId', tenure.room_id || '');
            setValue('status', tenure.status);
        }
    }, [tenure, setValue]);

    const onSubmit = async (data: TenureFormData) => {
        if (!tenure) return;

        try {
            const { error } = await supabase
                .from('tenures')
                .update({
                    room_id: data.roomId || null,
                    status: data.status,
                })
                .eq('id', tenure.id);

            if (error) throw error;

            toast.success('Tenure updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update tenure');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Tenure: ${tenure?.full_name}`}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Assign Room</label>
                    <select
                        {...register('roomId')}
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                        <option value="">No Room Assigned</option>
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>
                                Room {room.room_number} ({room.type}) - ₹{room.price}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <select
                        {...register('status')}
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                    </select>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
