import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Home, User, Shield, BadgeCheck, AlertCircle } from 'lucide-react';
import { OTPVerification } from '../../components/auth/OTPVerification';
import { TwoFactorToggle } from '../../components/auth/TwoFactorToggle';
import { ActiveSessionsList } from '../../components/auth/ActiveSessionsList';
import { ThemeSelector } from '../../components/ui/ThemeSelector';
import { NestIDVerificationModal } from '../../components/admin/NestIDVerificationModal';
// Ideally move Modal to common if shared, but path works.

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
            setIs2FAEnabled(data.two_factor_enabled || false);
            setNestIdStatus(data.nestid_status || 'unverified');
            setNestIdData({
                dob: data.dob || '',
                aadharNumber: data.aadhar_number || ''
            });
            setIsLoading(false);
        };

        fetchProfile();
    }, [setValue]);

    // NestID State
    const [nestIdStatus, setNestIdStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [nestIdData, setNestIdData] = useState({
        dob: '',
        aadharNumber: ''
    });

    const handleNestIdSuccess = async () => {
        // Reload
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('tenures').select('*').eq('id', user.id).single();
        if (data) {
            setNestIdStatus('verified');
            setNestIdData({
                dob: data.dob,
                aadharNumber: data.aadhar_number
            });
        }
    };

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

            {/* NestID Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-secondary" /> Identity Verification
                    </h3>
                    {nestIdStatus === 'verified' && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <BadgeCheck className="h-4 w-4" /> VERIFIED
                        </span>
                    )}
                </div>

                {nestIdStatus === 'verified' ? (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <VerifiedField label="Aadhar Linked" value={`XXXX-XXXX-${nestIdData.aadharNumber.slice(-4)}`} />
                            <VerifiedField label="Date of Birth" value={nestIdData.dob} />
                        </div>
                    </div>
                ) : (
                    <div className="bg-orange-50 rounded-xl p-8 text-center border border-orange-100">
                        <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                            <Shield className="h-8 w-8 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Verify Your Identity</h3>
                        <p className="text-slate-600 max-w-md mx-auto mb-6">
                            Verify your identity to enable payments and secure your stay.
                        </p>
                        <Button
                            type="button"
                            onClick={() => setIsVerifyModalOpen(true)}
                            className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 px-8 py-3 h-auto text-base"
                        >
                            Start Verification
                        </Button>
                    </div>
                )}
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

            <ActiveSessionsList hideIp={true} />

            <ThemeSelector />

            <NestIDVerificationModal
                isOpen={isVerifyModalOpen}
                onClose={() => setIsVerifyModalOpen(false)}
                onVerified={handleNestIdSuccess}
                userType="tenure"
            />
        </div>
    );
}

function VerifiedField({ label, value, fullWidth }: { label: string, value: string, fullWidth?: boolean }) {
    return (
        <div className={fullWidth ? "col-span-full" : ""}>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1">{label}</span>
            <div className="text-slate-900 font-medium font-mono bg-white/50 px-3 py-2 rounded-lg border border-transparent">
                {value || 'Not Provided'}
            </div>
        </div>
    );
}
