import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { OTPVerification } from '../../components/auth/OTPVerification';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name is required'),
    hostelName: z.string().min(2, 'Hostel name is required'),
    hostelAddress: z.string().min(5, 'Address is required'),
    phone: z.string().min(10, 'Phone is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

import { TwoFactorToggle } from '../../components/auth/TwoFactorToggle';

// ... existing imports

export function AdminProfile() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [stayKey, setStayKey] = useState('');
    const [copied, setCopied] = useState(false);
    const [isNewProfile, setIsNewProfile] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(false); // New State
    const [pendingData, setPendingData] = useState<ProfileFormData | null>(null);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserEmail(user.email || '');

            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error || !data) {
                setIsNewProfile(true);
                setIsLoading(false);
                return;
            }

            setValue('fullName', data.full_name);
            setValue('hostelName', data.hostel_name);
            setValue('hostelAddress', data.hostel_address);
            setValue('phone', data.phone);

            setStayKey(data.stay_key);
            setIs2FAEnabled(data.is_2fa_enabled || false); // Fetch 2FA state
            setIsLoading(false);
        };

        fetchProfile();
    }, [setValue]);

    // ... existing handlers (onSubmit, handleVerified, regenerateStayKey, copyToClipboard) ...

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

            if (isNewProfile) {
                // ... create profile logic
                const { error } = await supabase
                    .from('admins')
                    .insert({
                        id: user.id,
                        full_name: pendingData.fullName,
                        hostel_name: pendingData.hostelName,
                        hostel_address: pendingData.hostelAddress,
                        phone: pendingData.phone,

                        stay_key: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    });
                if (error) throw error;
                toast.success('Profile created successfully');
                setIsNewProfile(false);
                window.location.reload();
            } else {
                // ... update profile logic
                const { error } = await supabase
                    .from('admins')
                    .update({
                        full_name: pendingData.fullName,
                        hostel_name: pendingData.hostelName,
                        hostel_address: pendingData.hostelAddress,
                        phone: pendingData.phone,

                    })
                    .eq('id', user.id);

                if (error) throw error;
                toast.success('Profile updated successfully');
            }
            setShowOTP(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const regenerateStayKey = async () => {
        if (isNewProfile) {
            toast.error('Please save your profile first');
            return;
        }
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();

            const { error } = await supabase
                .from('admins')
                .update({ stay_key: newKey })
                .eq('id', user.id);

            if (error) throw error;
            setStayKey(newKey);
            toast.success('StayKey regenerated successfully');
        } catch (error) {
            toast.error('Failed to regenerate key');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(stayKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied to clipboard');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
                <p className="text-slate-600">Manage your account and payment configurations</p>
            </div>

            {isNewProfile && (
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                    <div>
                        <h3 className="font-bold text-yellow-800">Complete Your Profile</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Your account setup is incomplete. Please fill in the details below to activate your dashboard and generate your StayKey.
                        </p>
                    </div>
                </div>
            )}

            {/* StayKey Section */}
            {!isNewProfile && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-xl border border-primary/20">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Your StayKey</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Share this unique key with your tenants to let them sign up for your hostel.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="bg-white px-4 py-3 rounded-lg border border-slate-200 font-mono text-xl font-bold tracking-wider text-slate-800 min-w-[150px] text-center">
                            {stayKey}
                        </div>
                        <Button variant="outline" onClick={copyToClipboard}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" onClick={regenerateStayKey} className="text-slate-600 hover:text-primary">
                            <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
                        </Button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Personal & Hostel Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Input
                            label="Hostel Name"
                            {...register('hostelName')}
                            error={errors.hostelName?.message}
                        />
                        <Input
                            label="Hostel Address"
                            {...register('hostelAddress')}
                            error={errors.hostelAddress?.message}
                        />
                    </div>
                </div>

                {/* 2FA Section - Added here */}
                {!isNewProfile && (
                    <div className="space-y-4">
                        <TwoFactorToggle
                            isEnabled={is2FAEnabled}
                            email={userEmail}
                            userType="admin"
                            onUpdate={setIs2FAEnabled}
                        />
                    </div>
                )}



                <div className="flex justify-end">
                    <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
                        {isNewProfile ? 'Create Profile' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
