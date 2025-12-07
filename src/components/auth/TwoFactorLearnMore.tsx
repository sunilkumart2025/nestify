import { Shield, Smartphone, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TwoFactorLearnMoreProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TwoFactorLearnMore({ isOpen, onClose }: TwoFactorLearnMoreProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-8 text-center border-b border-slate-100">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm mx-auto flex items-center justify-center mb-4">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Two-Factor Authentication</h2>
                        <p className="text-slate-600 mt-2">Add an extra layer of security to your account</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-start space-x-4">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Lock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Why use 2FA?</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Even if someone guesses your password, they can't access your account without the unique code sent to your email.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="bg-purple-50 p-2 rounded-lg">
                                <Smartphone className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">How it works</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    1. You enter your password as usual.<br />
                                    2. We send a 6-digit code to your registered email.<br />
                                    3. You enter the code to verify it's really you.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
