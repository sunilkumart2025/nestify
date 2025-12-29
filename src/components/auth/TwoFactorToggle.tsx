import { useState } from 'react';
import { Shield, Info } from 'lucide-react';
import { TwoFactorLearnMore } from './TwoFactorLearnMore';
import { OTPVerification } from './OTPVerification';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface TwoFactorToggleProps {
    isEnabled: boolean;
    email: string;
    userType: 'admin' | 'tenure';
    onUpdate: (newState: boolean) => void;
}

export function TwoFactorToggle({ isEnabled, email, userType, onUpdate }: TwoFactorToggleProps) {
    const [showLearnMore, setShowLearnMore] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const [pendingState, setPendingState] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = () => {
        setPendingState(!isEnabled);
        setShowOTP(true);
    };

    const handleVerified = async () => {
        setIsLoading(true);
        setShowOTP(false); // Close OTP immediately to show loading state on toggle

        try {
            const table = userType === 'admin' ? 'admins' : 'tenures';
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from(table)
                .update({ two_factor_enabled: pendingState })
                .eq('id', user.id);

            if (error) throw error;

            toast.success(`2FA has been ${pendingState ? 'enabled' : 'disabled'} successfully`);
            onUpdate(pendingState);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to update 2FA settings');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                            <Shield className={`h-6 w-6 ${isEnabled ? 'text-green-600' : 'text-slate-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Two-Factor Authentication</h3>
                            <p className="text-sm text-slate-500">
                                {isEnabled ? 'Your account is secured with 2FA' : 'Add an extra layer of security'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowLearnMore(true);
                        }}
                        className="flex items-center text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                    >
                        <Info className="h-4 w-4 mr-1.5" />
                        Learn more about 2FA
                    </button>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={handleToggle}
                            disabled={isLoading}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            {/* Modals */}
            <TwoFactorLearnMore
                isOpen={showLearnMore}
                onClose={() => setShowLearnMore(false)}
            />

            {showOTP && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <OTPVerification
                        email={email}
                        onVerified={handleVerified}
                        onCancel={() => setShowOTP(false)}
                        actionLabel={pendingState ? "Verify & Enable 2FA" : "Verify & Disable 2FA"}
                    />
                </div>
            )}
        </div>
    );
}
