import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TOTPManager } from '../../lib/totp';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import { BackupCodesModal } from './BackupCodesModal';

interface Setup2FAProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function Setup2FA({ onComplete, onCancel }: Setup2FAProps) {
    const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'success' | 'backup'>('intro');
    const [secret, setSecret] = useState('');
    const [uri, setUri] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            setEmail(user.email);
            // Generate secret immediately (in memory only for now)
            const newSecret = TOTPManager.generateSecret();
            setSecret(newSecret);
            setUri(TOTPManager.generateURI(newSecret, user.email));
        }
    };

    const handleVerifyParams = async () => {
        setIsLoading(true);
        try {
            const isValid = await TOTPManager.verifyTOTP(verifyCode, secret);

            if (isValid) {
                // Save to DB (Encrypted via RPC)
                const { error } = await supabase.rpc('enable_totp', {
                    p_secret: secret,
                    p_encryption_key: import.meta.env.VITE_VAULT_MASTER_KEY // Used for encryption before storage
                });

                if (error) throw error;

                // 2. Generate Backup Codes
                const codes = TOTPManager.generateBackupCodes();
                setBackupCodes(codes);

                // 3. Save to DB (Plaintext sent, DB hashes it)
                const { error: backupError } = await supabase.rpc('save_backup_codes', {
                    p_plain_codes: codes
                });

                if (backupError) {
                    console.error("Backup codes error:", backupError);
                    toast.error("2FA enabled, but failed to save backup codes.");
                }

                // IMPORTANT: Update Metadata for Login Check
                await supabase.auth.updateUser({
                    data: { is_2fa_enabled: true }
                });

                setStep('success');
                toast.success("2FA Enabled Successfully!");
                // No timeout here, we want them to click "Next"
            } else {
                toast.error("Invalid code. Please try again.");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to enable 2FA");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(secret);
        toast.success("Secret copied to clipboard");
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-lg w-full mx-auto">
            {step === 'intro' && (
                <div className="text-center space-y-6">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Secure Your Account</h2>
                        <p className="text-slate-600 mt-2">
                            Two-Factor Authentication (2FA) adds an extra layer of security by requiring a code from your phone when you log in.
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="outline" onClick={onCancel}>Maybe Later</Button>
                        <Button onClick={() => setStep('scan')}>Start Setup</Button>
                    </div>
                </div>
            )}

            {step === 'scan' && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Scan QR Code</h3>
                        <div className="text-sm text-slate-600 mt-2 space-y-2">
                            <p className="font-semibold text-indigo-600">📱 Download an Authenticator App first:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                    <p className="font-bold text-blue-700">Google Authenticator</p>
                                    <p className="text-blue-600">iOS & Android</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                    <p className="font-bold text-green-700">Microsoft Authenticator</p>
                                    <p className="text-green-600">iOS & Android</p>
                                </div>
                            </div>
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                                ⚠️ <strong>Don't use Google Lens!</strong> Open the authenticator app and tap "+" to scan.
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center p-4 bg-slate-50 border-2 border-indigo-100 rounded-xl">
                        {uri && <QRCodeSVG value={uri} size={200} level="H" />}
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-slate-500 mb-2 font-semibold">Can't scan? Enter this code manually:</p>
                        <div className="flex items-center justify-center gap-2">
                            <code className="bg-slate-100 px-3 py-2 rounded text-sm font-mono text-slate-700 border border-slate-200">
                                {secret.match(/.{1,4}/g)?.join(' ')}
                            </code>
                            <button onClick={copyToClipboard} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <Copy className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <Button className="w-full" onClick={() => setStep('verify')}>
                        Next: Verify Code
                    </Button>
                </div>
            )}

            {step === 'verify' && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900">Enter Verification Code</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Enter the 6-digit code from your authenticator app to confirm setup.
                        </p>
                    </div>

                    <div className="py-4">
                        <Input
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000 000"
                            className="text-center text-3xl tracking-[0.5em] font-mono h-14"
                            maxLength={6}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setStep('scan')}>Back</Button>
                        <Button className="flex-1" onClick={handleVerifyParams} isLoading={isLoading}>Enable 2FA</Button>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="text-center space-y-6 py-8">
                    <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">You're All Set!</h2>
                        <p className="text-slate-600 mt-2">
                            Two-Factor Authentication is now enabled.
                        </p>
                    </div>
                    <Button onClick={() => setStep('backup')} className="w-full">
                        Next: Get Backup Codes
                    </Button>
                </div>
            )}

            {step === 'backup' && (
                <BackupCodesModal
                    codes={backupCodes}
                    onClose={() => {
                        onComplete();
                    }}
                    onDownload={() => {
                        // Create text file for download
                        const element = document.createElement("a");
                        const file = new Blob([`Nestify Backup Codes\n\n${backupCodes.join('\n')}\n\nKeep these safe! If you lose your phone, these are your only recovery option.\nGenerated on: ${new Date().toLocaleString()}`], { type: 'text/plain' });
                        element.href = URL.createObjectURL(file);
                        element.download = "nestify-backup-codes.txt";
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                    }}
                />
            )}
        </div>
    );
}
