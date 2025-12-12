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
    shouldDelete?: boolean;
    customVerifier?: (code: string) => Promise<boolean>; // Support for TOTP or other logic
}

export function OTPVerification({ email, onVerified, onCancel, actionLabel = "Verify & Create Account", shouldDelete = true, customVerifier }: OTPVerificationProps) {
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
        // If using custom verifier (e.g. TOTP), we might NOT want to send email?
        // But this component assumes Email OTP UI (Resend button etc).
        // For TOTP, we don't 'send' anything. 
        // If customVerifier is present, we disable auto-send?
        if (customVerifier) return;

        if (!resendApiKey) {
            toast.error('Resend API Key is missing. Check .env file.');
            return;
        }

        setIsSending(true);
        setTimeLeft(120);

        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            const { error: dbError } = await supabase
                .from('otp_codes')
                .insert({
                    email,
                    code,
                    expires_at: expiresAt.toISOString()
                });

            if (dbError) throw dbError;

            await fetch('https://api.resend.com/emails', {
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
            console.log('%c [DEV] Generated OTP: ' + code, 'background: #222; color: #bada55; padding: 4px; border-radius: 4px;');
            toast.success('OTP sent!');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to send OTP');
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
            if (customVerifier) {
                // Use Custom Logic (e.g. TOTP)
                const isValid = await customVerifier(otp);
                if (isValid) {
                    toast.success("Verified Successfully!");
                    onVerified(otp);
                } else {
                    toast.error("Invalid Code");
                }
            } else {
                // Default DB Logic
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

                if (shouldDelete) {
                    await supabase.from('otp_codes').delete().eq('id', data.id);
                }

                toast.success('Verified successfully!');
                onVerified(otp);
            }
        } catch (error: any) {
            toast.error(error.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-send on mount, but only if NOT custom verifier
    useEffect(() => {
        if (!hasSentRef.current && !customVerifier) {
            hasSentRef.current = true;
            sendOTP();
        }
    }, [customVerifier]);

    // --- Backup Code Mode Logic ---
    const [isBackupMode, setIsBackupMode] = useState(false);
    const [backupCode, setBackupCode] = useState('');

    const verifyBackupCode = async () => {
        if (backupCode.length < 8) {
            toast.error("Invalid backup code format");
            return;
        }
        setIsLoading(true);
        try {
            // Call RPC to verify backup code
            const { data: isValid, error } = await supabase.rpc('verify_backup_code', {
                p_code_input: backupCode
            });

            if (error) throw error;

            if (isValid) {
                toast.success("Verified with Backup Code!");
                onVerified(backupCode); // Signal success
            } else {
                toast.error("Invalid or used backup code.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Timer className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                    {customVerifier ? 'Security Check' : 'Verify your Email'}
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                    {customVerifier
                        ? (isBackupMode ? 'Enter one of your 8-character backup codes' : 'Enter the code from your Authenticator App')
                        : <>We've sent a 6-digit code to <br /><strong>{email}</strong></>
                    }
                </p>
            </div>

            <div className="space-y-6">
                {!customVerifier && (
                    <div className="flex flex-col items-center justify-center py-4">
                        <div className={`text-4xl font-mono font-bold transition-colors ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">time remaining</p>
                    </div>
                )}

                <div>
                    {isBackupMode ? (
                        <Input
                            placeholder="XXXXX-XXXXX"
                            value={backupCode}
                            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                            className="text-center text-xl font-mono font-bold h-14 uppercase"
                        />
                    ) : (
                        <Input
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center text-3xl tracking-[0.5em] font-bold h-14"
                            maxLength={6}
                        />
                    )}
                </div>

                <Button
                    onClick={isBackupMode ? verifyBackupCode : verifyOTP}
                    isLoading={isLoading}
                    className="w-full h-12 text-lg"
                >
                    {isBackupMode ? "Verify Backup Code" : actionLabel}
                </Button>

                {customVerifier && (
                    <button
                        onClick={() => setIsBackupMode(!isBackupMode)}
                        className="w-full text-sm text-indigo-600 hover:text-indigo-800 underline"
                    >
                        {isBackupMode ? "Use Authenticator App instead" : "I lost my phone / Use Backup Code"}
                    </button>
                )}

                <div className="flex justify-between items-center text-sm pt-2">
                    <button
                        onClick={onCancel}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </button>

                    {!customVerifier && (
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
                    )}
                </div>
            </div>
        </div>
    );
}
