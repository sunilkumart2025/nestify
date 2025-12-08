import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Room } from '../../lib/types';

const roomSchema = z.object({
    roomNumber: z.string().min(1, 'Room number is required'),
    floorNumber: z.string().optional(), // Changed to string for flexibility
    capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
    type: z.string().min(1, 'Room type is required'),
    price: z.coerce.number().min(0, 'Price must be positive'),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    roomToEdit?: Room | null;
}

export function AddRoomModal({ isOpen, onClose, onSuccess, roomToEdit }: AddRoomModalProps) {
    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(roomSchema),
    });

    useEffect(() => {
        if (roomToEdit) {
            setValue('roomNumber', roomToEdit.room_number);
            setValue('floorNumber', String(roomToEdit.floor_number || ''));
            setValue('capacity', String(roomToEdit.capacity) as any);
            setValue('type', roomToEdit.type);
            setValue('price', String(roomToEdit.price) as any);
        } else {
            reset({
                roomNumber: '',
                floorNumber: '',
                capacity: 1 as any,
                type: 'Non-AC', // Default matching DB
                price: 0 as any,
            });
        }
    }, [roomToEdit, setValue, reset, isOpen]);

    const onSubmit = async (data: RoomFormData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (roomToEdit) {
                const { error } = await supabase
                    .from('rooms')
                    .update({
                        room_number: data.roomNumber,
                        floor_number: data.floorNumber, // Now text
                        capacity: data.capacity,
                        type: data.type,
                        price: data.price,
                    })
                    .eq('id', roomToEdit.id);
                if (error) throw error;
                toast.success('Room updated successfully');
            } else {
                // Ensure admin profile exists
                const { data: adminProfile } = await supabase
                    .from('admins')
                    .select('id')
                    .eq('id', user.id)
                    .single();

                if (!adminProfile) {
                    throw new Error('Admin profile not found. Please re-login or contact support.');
                }

                const { error } = await supabase
                    .from('rooms')
                    .insert({
                        admin_id: user.id,
                        room_number: data.roomNumber,
                        floor_number: data.floorNumber, // Now text
                        capacity: data.capacity,
                        type: data.type,
                        price: data.price,
                    });
                if (error) throw error;
                toast.success('Room added successfully');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save room');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={roomToEdit ? 'Edit Room' : 'Add New Room'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Room Number"
                        placeholder="e.g. 101"
                        {...register('roomNumber')}
                        error={errors.roomNumber?.message}
                    />
                    <Input
                        label="Floor"
                        type="text" // Changed to text input
                        placeholder="e.g. 1st Floor"
                        {...register('floorNumber')}
                        error={errors.floorNumber?.message}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Capacity"
                        type="number"
                        placeholder="e.g. 2"
                        {...register('capacity')}
                        error={errors.capacity?.message}
                    />
                    <Input
                        label="Price (Monthly Rent)"
                        type="number"
                        placeholder="e.g. 5000"
                        {...register('price')}
                        error={errors.price?.message}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Room Type</label>
                    <select
                        {...register('type')}
                        className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    >
                        <option value="Non-AC">Non-AC</option>
                        <option value="AC">AC</option>
                        <option value="Dormitory">Dormitory</option>
                    </select>
                    {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        {roomToEdit ? 'Save Changes' : 'Add Room'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
