import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Home, User } from 'lucide-react';
import { OTPVerification } from '../../components/auth/OTPVerification';
import { TwoFactorToggle } from '../../components/auth/TwoFactorToggle';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name is required'),
    phone: z.string().min(10, 'Phone is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function TenureProfile() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [roomDetails, setRoomDetails] = useState<any>(null);
    const [showOTP, setShowOTP] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [pendingData, setPendingData] = useState<ProfileFormData | null>(null);
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || '');

            const { data, error } = await supabase
                .from('tenures')
                .select('*, room:rooms(*)')
                .eq('id', user.id)
                .single();

            if (error) {
                toast.error('Failed to load profile');
                return;
            }

            setValue('fullName', data.full_name);
            setValue('phone', data.phone);
            setRoomDetails(data.room);
            setIs2FAEnabled(data.is_2fa_enabled || false);
            setIsLoading(false);
        };

        fetchProfile();
    }, [setValue]);

    const onSubmit = async (data: ProfileFormData) => {
        setPendingData(data);
        setShowOTP(true);
    };

    const handleVerified = async () => {
        if (!pendingData) return;
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('tenures')
                .update({
                    full_name: pendingData.fullName,
                    phone: pendingData.phone,
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Profile updated successfully');
            setShowOTP(false);
        } catch (error: any) {
            toast.error('Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
        );
    }

    if (showOTP) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <OTPVerification
                    email={userEmail}
                    onVerified={handleVerified}
                    onCancel={() => setShowOTP(false)}
                    actionLabel="Verify & Update Profile"
                />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                <p className="text-slate-600">Manage your personal information</p>
            </div>

            {/* Room Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <Home className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">
                        {roomDetails ? `Room ${roomDetails.room_number}` : 'No Room Assigned'}
                    </h3>
                    <p className="text-sm text-slate-500">
                        {roomDetails ? `${roomDetails.type} • ₹${roomDetails.price}/month` : 'Contact your admin to assign a room'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <User className="h-5 w-5 text-slate-400" />
                    <h3 className="font-bold text-slate-900">Personal Details</h3>
                </div>

                <div className="space-y-4">
                    <Input
                        label="Full Name"
                        {...register('fullName')}
                        error={errors.fullName?.message}
                    />
                    <Input
                        label="Phone Number"
                        {...register('phone')}
                        error={errors.phone?.message}
                    />
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <TwoFactorToggle
                        isEnabled={is2FAEnabled}
                        email={userEmail}
                        userType="tenure"
                        onUpdate={setIs2FAEnabled}
                    />
                </div>

                <div className="pt-4">
                    <Button type="submit" isLoading={isSaving} className="w-full bg-secondary hover:bg-secondary-hover">
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    );
}
