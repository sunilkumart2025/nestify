
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Camera, Upload, ShieldCheck, AlertTriangle, User, History, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import clsx from 'clsx';

// --- Sound Utility ---
const playSound = (type: 'success' | 'error') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            // High pitch positive bleep
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } else {
            // Low pitch error buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export function VerifyID() {
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [extraInfo, setExtraInfo] = useState<any>(null); // Payments, Badges
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [adminId, setAdminId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setAdminId(data.user.id);
        });

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []);

    const startScanner = () => {
        setIsScanning(true);
        setVerificationStatus('idle');
        setTenantDetails(null);
        setExtraInfo(null);
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            scanner.render(onScanSuccess, (err) => console.warn(err));
            scannerRef.current = scanner;
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const onScanSuccess = (decodedText: string) => {
        stopScanner();
        verifyToken(decodedText);
    };

    const logAuditEvent = async (status: 'success' | 'failed', details: string, tenantId?: string) => {
        if (!adminId) return;
        await supabase.from('audit_logs').insert({
            admin_id: adminId,
            action: 'security_scan',
            entity_type: 'scanner',
            entity_id: tenantId || 'unknown',
            details: JSON.stringify({ status, reason: details })
        });
    };

    const verifyToken = async (tokenString: string) => {
        setVerificationStatus('loading');
        try {
            let data;
            try { data = JSON.parse(tokenString); }
            catch { throw new Error("Invalid QR Format"); }

            if (!data.id || !data.adminId) throw new Error("Tampered or Invalid ID Data");

            // 1. Check Admin Match
            if (adminId && data.adminId) {
                // Normalize for comparison
                const qrAdminId = String(data.adminId).trim().toLowerCase();
                const currentAdminId = String(adminId).trim().toLowerCase();

                if (qrAdminId !== currentAdminId) {
                    console.error("ID Mismatch:", { qr: qrAdminId, session: currentAdminId });
                    throw new Error(`Hostel Mismatch! Tenant belongs to Admin ending in ...${qrAdminId.slice(-4)}`);
                }
            } else if (!data.adminId) {
                // Legacy support or broken data
                console.warn("QR code missing adminId field");
            }

            // 2. Fetch Tenure + Room
            const { data: tenure, error } = await supabase
                .from('tenures')
                .select('*, room:rooms(*)')
                .eq('id', data.id)
                .single();

            if (error || !tenure) throw new Error("Student record not found in system.");

            // 3. Status Check
            if (tenure.status !== 'active') {
                setTenantDetails(tenure);
                throw new Error(`Student marked as ${tenure.status.toUpperCase()}`);
            }

            // 4. Fetch Extra Info (Latest Payment & Badges)
            const { data: lastPayment } = await supabase
                .from('invoices')
                .select('*')
                .eq('tenure_id', tenure.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const { data: badges } = await supabase
                .from('user_badges')
                .select('*, badge:badges(*)')
                .eq('user_id', tenure.id);

            setTenantDetails(tenure);
            setExtraInfo({
                lastPayment,
                badges: badges || [],
                paymentStatus: lastPayment?.status === 'paid' ? 'clean' : 'due',
                amountDue: lastPayment?.status === 'pending' ? lastPayment.total_amount : 0
            });

            playSound('success');
            setVerificationStatus('success');
            logAuditEvent('success', 'Verified Access Granted', tenure.id);

        } catch (error: any) {
            console.error(error);
            playSound('error');
            setErrorMessage(error.message || "Access Denied");
            setVerificationStatus('failed');
            logAuditEvent('failed', error.message || 'Verification Failed', tenantDetails?.id);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const html5QrCode = new Html5Qrcode("file-reader");
            try {
                const decodedText = await html5QrCode.scanFile(e.target.files[0], true);
                verifyToken(decodedText);
            } catch (err) {
                toast.error("No QR code found in image");
            }
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                    <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Sentinel Scanner
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Secure Entry Verification System</p>
            </div>

            {/* SCANNER UI */}
            {verificationStatus === 'idle' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                    {!isScanning ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={startScanner} className="flex flex-col items-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                                <Camera className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mb-3" />
                                <span className="font-bold text-slate-700 dark:text-slate-300">Start Camera</span>
                            </button>
                            <label className="flex flex-col items-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all cursor-pointer group">
                                <Upload className="w-10 h-10 text-slate-400 group-hover:text-purple-500 mb-3" />
                                <span className="font-bold text-slate-700 dark:text-slate-300">Upload QR</span>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-xl bg-black">
                            <div id="reader" className="w-full"></div>
                            <button onClick={stopScanner} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-red-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-white transition-colors">
                                Stop Scanning
                            </button>
                        </div>
                    )}
                    <div id="file-reader" className="hidden"></div>
                </div>
            )}

            {/* LOADING */}
            {verificationStatus === 'loading' && (
                <div className="text-center py-12">
                    <span className="relative flex h-16 w-16 mx-auto">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-16 w-16 bg-blue-500 items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
                        </span>
                    </span>
                    <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">Verifying Identity...</p>
                </div>
            )}

            {/* RESULTS: SUCCESS */}
            {verificationStatus === 'success' && tenantDetails && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="bg-green-600 p-6 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-500/20 animate-pulse"></div>
                        <CheckCircle2 className="w-16 h-16 text-white mx-auto relative z-10 mb-2" />
                        <h2 className="text-2xl font-bold text-white relative z-10">ACCESS GRANTED</h2>
                        <p className="text-green-100 relative z-10">Identity Verified & Secure</p>
                    </div>

                    <div className="p-6">
                        <div className="flex items-start gap-5">
                            <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200">
                                <User className="w-12 h-12 text-slate-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{tenantDetails.full_name}</h3>
                                <div className="text-lg text-slate-600 dark:text-slate-400 mb-2">Room {tenantDetails.room?.room_number}</div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                                        ACTIVE RESIDENT
                                    </span>
                                    {extraInfo?.paymentStatus === 'due' && (
                                        <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> DUES: {formatCurrency(extraInfo.amountDue)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Badges */}
                        {extraInfo?.badges?.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Achievements</p>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {extraInfo.badges.map((b: any) => (
                                        <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 whitespace-nowrap">
                                            <span className="text-lg">🏆</span>
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.badge.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={startScanner} className="mt-6 w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg">
                            Scan Next Person
                        </button>
                    </div>
                </div>
            )}

            {/* RESULTS: FAILED */}
            {verificationStatus === 'failed' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in shake duration-300 border-2 border-red-500">
                    <div className="bg-red-600 p-6 text-center">
                        <XCircle className="w-16 h-16 text-white mx-auto mb-2" />
                        <h2 className="text-2xl font-bold text-white">ACCESS DENIED</h2>
                        <p className="text-red-100">{errorMessage}</p>
                    </div>

                    {tenantDetails && (
                        <div className="p-6 bg-red-50 dark:bg-red-900/10">
                            <div className="flex items-center gap-4 opacity-75 grayscale">
                                <div className="w-16 h-16 bg-slate-200 rounded-lg"></div>
                                <div>
                                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{tenantDetails.full_name}</div>
                                    <div>Room {tenantDetails.room?.room_number}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6">
                        <button onClick={startScanner} className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                            Return to Scanner
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
