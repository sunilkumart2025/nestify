
import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Camera, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function VerifyID() {
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [tenantDetails, setTenantDetails] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);

    // We use a ref to control the scanner region
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Initial check for current admin
    const [adminId, setAdminId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setAdminId(data.user.id);
        });

        // Cleanup function for scanner
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, []);

    const startScanner = () => {
        setIsScanning(true);
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
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

    const onScanSuccess = async (decodedText: string) => {
        // Stop scanning immediately on success
        stopScanner();
        verifyToken(decodedText);
    };

    const onScanFailure = () => {
        // console.warn(error); // Ignore frame failures
    };

    const resetVerification = () => {
        setVerificationStatus('idle');
        setTenantDetails(null);
        setErrorMessage('');
    };

    const verifyToken = async (tokenString: string) => {
        setVerificationStatus('loading');
        try {
            let data;
            try {
                data = JSON.parse(tokenString);
            } catch (e) {
                throw new Error("Invalid QR Code format");
            }

            if (!data.id || !data.adminId) {
                throw new Error("Invalid QR Code data");
            }

            // Check if this student belongs to this hostel
            if (adminId && data.adminId !== adminId) {
                setErrorMessage("This Student belongs to another Hostel.");
                setVerificationStatus('failed');
                return;
            }

            // Fetch latest status
            const { data: tenure, error } = await supabase
                .from('tenures')
                .select('*, room:rooms(*)')
                .eq('id', data.id)
                .single();

            if (error || !tenure) {
                throw new Error("Student record not found");
            }

            if (tenure.status !== 'active') {
                setTenantDetails(tenure);
                setErrorMessage("Student is NOT currently active.");
                setVerificationStatus('failed');
                return;
            }

            setTenantDetails(tenure);
            setVerificationStatus('success');

        } catch (error: any) {
            console.error(error);
            setErrorMessage(error.message || "Verification Failed");
            setVerificationStatus('failed');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const imageFile = e.target.files[0];
            const html5QrCode = new Html5Qrcode("file-reader");
            try {
                const decodedText = await html5QrCode.scanFile(imageFile, true);
                verifyToken(decodedText);
            } catch (err) {
                console.error(err);
                toast.error("Could not find QR code in this image.");
            }
            setErrorMessage('');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">Verify Student ID</h1>
                <p className="text-slate-600">Scan QR code to verify authorized entry</p>
            </div>

            {/* Results Area */}
            {verificationStatus !== 'idle' && (
                <div className={`p-6 rounded-2xl border-2 text-center transition-all ${verificationStatus === 'success' ? 'bg-green-50 border-green-200' :
                    verificationStatus === 'failed' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                    {verificationStatus === 'loading' && <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}

                    {verificationStatus === 'success' && (
                        <div className="space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-green-800">Verified Access</h2>
                                <p className="text-green-600">Student is Active and Authorized</p>
                            </div>
                            {tenantDetails && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 text-left inline-block w-full max-w-sm">
                                    <p className="font-bold text-lg text-slate-800">{tenantDetails.full_name}</p>
                                    <p className="text-slate-600">Room {tenantDetails.room?.room_number}</p>
                                    <p className="text-xs text-slate-400 mt-2">ID: {tenantDetails.id.substring(0, 8)}...</p>
                                </div>
                            )}
                            <button onClick={resetVerification} className="block mx-auto text-sm text-green-700 underline mt-4">Scan Another</button>
                        </div>
                    )}

                    {verificationStatus === 'failed' && (
                        <div className="space-y-4">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-red-800">Verification Failed</h2>
                                <p className="text-red-700 font-medium">{errorMessage}</p>
                            </div>
                            {tenantDetails && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 text-left inline-block w-full max-w-sm opacity-75">
                                    <p className="font-bold text-lg text-slate-800">{tenantDetails.full_name}</p>
                                    <p className="text-slate-600">Room {tenantDetails.room?.room_number}</p>
                                </div>
                            )}
                            <button onClick={resetVerification} className="block mx-auto text-sm text-red-700 underline mt-4">Try Again</button>
                        </div>
                    )}
                </div>
            )}

            {/* Scanner Controls - Hide if showing results */}
            {verificationStatus === 'idle' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    {!isScanning ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={startScanner}
                                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <div className="p-4 bg-slate-100 rounded-full group-hover:bg-primary/10 mb-3">
                                    <Camera className="w-8 h-8 text-slate-500 group-hover:text-primary" />
                                </div>
                                <span className="font-bold text-slate-700">Open Camera</span>
                                <span className="text-xs text-slate-400 mt-1">Scan live QR code</span>
                            </button>

                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-secondary hover:bg-secondary/5 transition-all group cursor-pointer">
                                <div className="p-4 bg-slate-100 rounded-full group-hover:bg-secondary/10 mb-3">
                                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-secondary" />
                                </div>
                                <span className="font-bold text-slate-700">Upload Image</span>
                                <span className="text-xs text-slate-400 mt-1">Select from gallery</span>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    ) : (
                        <div className="relative">
                            <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
                            <button
                                onClick={stopScanner}
                                className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
                            >
                                Cancel Scanning
                            </button>
                        </div>
                    )}
                    {/* Hidden div for file scanner instantiation */}
                    <div id="file-reader" className="hidden"></div>
                </div>
            )}
        </div>
    );
}
