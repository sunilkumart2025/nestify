import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Timer } from 'lucide-react';

interface OTPVerificationProps {
    email: string;
    onVerified: (code: string) => void;
    onCancel: () => void;
    actionLabel?: string;
    shouldDelete?: boolean; // New prop
}

export function OTPVerification({ email, onVerified, onCancel, actionLabel = "Verify & Create Account", shouldDelete = true }: OTPVerificationProps) {
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    // Fix for double firing in Strict Mode
    const hasSentRef = useRef(false);

    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

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
        if (!resendApiKey) {
            toast.error('Resend API Key is missing. Check .env file.');
            console.error('VITE_RESEND_API_KEY is not set');
            return;
        }

        setIsSending(true);
        // Start timer immediately to prevent "0:00" flash and disable button
        setTimeLeft(120);

        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // 1. Store OTP in Database
            const { error: dbError } = await supabase
                .from('otp_codes')
                .insert({
                    email,
                    code,
                    expires_at: expiresAt.toISOString()
                });

            if (dbError) throw dbError;

            // 2. Send Email via Resend
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: 'Nestify <onboarding@resend.dev>',
                    to: [email],
                    subject: 'Your Nestify Verification Code',
                    html: `<p>Your verification code is: <strong style="font-size: 24px;">${code}</strong></p><p>This code expires in 10 minutes.</p>`
                })
            });

            // 3. Always log for Dev/Testing convenience
            console.log('%c [DEV] Generated OTP: ' + code, 'background: #222; color: #bada55; padding: 4px; border-radius: 4px;');

            if (!res.ok) {
                const errData = await res.json();
                console.error('Resend API Error:', errData);

                if (errData.name === 'validation_error' && errData.message.includes('resend.dev')) {
                    toast('Resend Test Mode: Check Console for OTP', { icon: '⚠️' });
                } else {
                    toast.error('Email failed. Check Console for OTP.');
                    // Don't reset timer here if we want to prevent spam even on failure?
                    // User said: "AFTER IT BACME 0 THEN THE USER CAN ABLE TO RESEND"
                    // But if it fails, they should probably be able to retry?
                    // Or maybe the failure is "fake" (dev mode) so we keep timer?
                    // If it's a REAL failure, we should probably let them retry.
                    // But for now, let's keep timer running to match "resend disabled while timer running".
                    // Actually, if it failed, they CAN'T get the OTP (unless dev console).
                    // So if it's a real error, we should probably stop timer?
                    // However, the user request emphasizes disabling the button. 
                    // Let's stick to: Timer runs -> Button disabled.
                }
            } else {
                toast.success('OTP sent! (Check console if using Test Mode)');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to send OTP');
            setTimeLeft(0); // Reset timer on critical error so they can try again
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
            const { data, error } = await supabase
                .from('otp_codes')
                .select('*')
                .eq('email', email)
                .eq('code', otp)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                throw new Error('Invalid or expired OTP');
            }

            // OTP is valid
            if (shouldDelete) {
                await supabase.from('otp_codes').delete().eq('id', data.id);
            }

            toast.success('Email verified successfully!');
            onVerified(otp);
        } catch (error: any) {
            toast.error(error.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-send on mount, but only once
    useEffect(() => {
        if (!hasSentRef.current) {
            hasSentRef.current = true;
            sendOTP();
        }
    }, []);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Timer className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Verify your Email</h3>
                <p className="text-sm text-slate-600 mt-2">
                    We've sent a 6-digit code to <br /><strong>{email}</strong>
                </p>
            </div>

            <div className="space-y-6">
                {/* Large Visual Timer */}
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
                    className="w-full h-12 text-lg"
                >
                    {actionLabel}
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
                            : 'text-primary hover:text-primary-hover bg-primary/5 hover:bg-primary/10'
                            }`}
                    >
                        {timeLeft > 0 ? `Wait ${formatTime(timeLeft)}` : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    );
}
