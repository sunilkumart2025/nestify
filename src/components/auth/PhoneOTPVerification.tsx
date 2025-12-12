import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Timer, Smartphone } from 'lucide-react';

interface PhoneOTPVerificationProps {
    phone: string;
    onVerified: () => void;
    onCancel: () => void;
}

export function PhoneOTPVerification({ phone, onVerified, onCancel }: PhoneOTPVerificationProps) {
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const hasSentRef = useRef(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const sendOTP = async () => {
        setIsSending(true);
        setTimeLeft(120); // 2 minutes cooldown

        try {
            const { data, error } = await supabase.rpc('send_phone_verification_otp');

            if (error) throw error;
            if (data && data.status === 'error') throw new Error(data.message);

            toast.success('OTP sent to WhatsApp!');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to send OTP');
            setTimeLeft(0);
        } finally {
            setIsSending(false);
        }
    };

    const verifyOTP = async () => {
        if (otp.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('verify_phone_otp', { p_code: otp });

            if (error) throw error;
            if (data && data.status === 'error') throw new Error(data.message);

            toast.success('Phone Verified Successfully!');
            onVerified();
        } catch (error: any) {
            toast.error(error.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-send on mount
    useEffect(() => {
        if (!hasSentRef.current) {
            hasSentRef.current = true;
            sendOTP();
        }
    }, []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Verify Phone Number</h3>
                <p className="text-sm text-slate-600 mt-2">
                    We've sent a 6-digit code to your WhatsApp number ending in <strong>{phone.slice(-4)}</strong>
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4">
                    <div className={`text-4xl font-mono font-bold transition-colors ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">time remaining</p>
                </div>

                <div>
                    <Input
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-3xl tracking-[0.5em] font-bold h-14"
                        maxLength={6}
                    />
                </div>

                <Button
                    onClick={verifyOTP}
                    isLoading={isLoading}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                >
                    Verify Phone
                </Button>

                <div className="flex justify-between items-center text-sm pt-2">
                    <button
                        onClick={onCancel}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={sendOTP}
                        disabled={timeLeft > 0 || isSending}
                        className={`font-medium transition-colors px-3 py-1 rounded-md ${timeLeft > 0
                            ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-50'
                            : 'text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                    >
                        {timeLeft > 0 ? `Wait ${formatTime(timeLeft)}` : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    );
}
