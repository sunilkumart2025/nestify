import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface VerificationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    userType: 'admin' | 'tenure';
}

export function VerificationPopup({ isOpen, onClose, userType }: VerificationPopupProps) {
    const navigate = useNavigate();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none px-4 pb-4 sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto relative"
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                    <Shield className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Verification Required</h3>
                                    <p className="text-orange-100 text-sm">Secure your account</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="bg-orange-50 p-3 rounded-full flex-shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        Your identity verification (NestID) is pending.
                                        {userType === 'admin'
                                            ? ' You won\'t be able to generate bills or collect payments.'
                                            : ' You won\'t be able to make rent payments.'
                                        }
                                        <br />
                                        <span className="font-semibold text-slate-800 mt-2 block">
                                            Please verify your identity in your profile settings.
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={onClose}>
                                    Remind Later
                                </Button>
                                <Button
                                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
                                    onClick={() => {
                                        onClose();
                                        navigate(userType === 'admin' ? '/admin/profile' : '/tenure/profile');
                                    }}
                                >
                                    Go to Profile <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
