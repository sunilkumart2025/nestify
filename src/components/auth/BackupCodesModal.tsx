
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Download, Copy, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BackupCodesModalProps {
    codes: string[];
    onClose: () => void;
    onDownload: () => void;
}

export function BackupCodesModal({ codes, onClose, onDownload }: BackupCodesModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(codes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Codes copied to clipboard");
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Save Your Backup Codes</h3>
                            <p className="text-sm text-slate-600">
                                If you lose your phone, these codes are the <strong>only way</strong> to access your account.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 mb-6">
                        <div className="grid grid-cols-2 gap-4 font-mono text-lg text-slate-800 text-center">
                            {codes.map((code, index) => (
                                <div key={index} className="bg-white py-2 px-3 rounded shadow-sm border border-slate-200">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={onDownload}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Download Codes (PDF)
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            className="w-full flex items-center justify-center gap-2"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied!" : "Copy to Clipboard"}
                        </Button>
                    </div>

                    <div className="mt-6 flex items-start gap-2 text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
                        <div className="min-w-4 pt-0.5">ℹ️</div>
                        <p>
                            Each code can only be used once. Keep them in a safe place like a password manager or physical safe.
                            We do not store these codes in plain text, so we cannot recover them for you if lost.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <Button onClick={onClose}>
                        I have saved them
                    </Button>
                </div>
            </div>
        </div>
    );
}
