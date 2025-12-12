import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, CreditCard, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface NestIDVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    userType: 'admin' | 'tenure';
}

export function NestIDVerificationModal({ isOpen, onClose, onVerified, userType }: NestIDVerificationModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        dob: '',
        altPhone: '', // Admin only
        commAddress: '', // Admin only
        permAddress: '', // Admin only
        aadharNumber: '',
        panNumber: '', // Admin only
    });

    const isStep1Valid = () => {
        if (!formData.dob) return false;
        if (userType === 'admin') {
            return formData.altPhone && formData.commAddress && formData.permAddress;
        }
        return true;
    };

    const isStep2Valid = () => {
        if (formData.aadharNumber.length !== 12) return false;
        if (userType === 'admin') {
            return formData.panNumber.length === 10;
        }
        return true;
    };

    const handleVerify = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            // --- Mock API Call ---
            // In real world: Call server -> Cashfree API

            const table = userType === 'admin' ? 'admins' : 'tenures';

            const updateData: any = {
                nestid_status: 'verified',
                dob: formData.dob,
                aadhar_number: formData.aadharNumber,
                nestid_verified_at: new Date().toISOString()
            };

            if (userType === 'admin') {
                updateData.alt_phone = formData.altPhone;
                updateData.communication_address = formData.commAddress;
                updateData.permanent_address = formData.permAddress;
                updateData.pan_number = formData.panNumber;
            }

            const { error } = await supabase.from(table).update(updateData).eq('id', user.id);

            if (error) throw error;

            toast.success('Identity Verified Successfully! 🎉');
            onVerified();
            onClose();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
                >
                    {/* Header */}
                    <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="h-6 w-6 text-green-400" />
                            <div>
                                <h2 className="text-xl font-bold">NestID Verification</h2>
                                <p className="text-slate-400 text-xs">Step {step} of 2</p>
                            </div>
                        </div>
                        <div className="h-2 w-20 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full bg-green-500 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
                        </div>
                    </div>

                    <div className="p-6 min-h-[400px]">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <User className="h-5 w-5 text-indigo-500" /> Personal Details
                                </h3>

                                <Input
                                    label="Date of Birth"
                                    type="date"
                                    value={formData.dob}
                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                />

                                {userType === 'admin' && (
                                    <>
                                        <Input
                                            label="Alternative Phone"
                                            value={formData.altPhone}
                                            onChange={e => setFormData({ ...formData, altPhone: e.target.value })}
                                            placeholder="+91..."
                                        />
                                        <Input
                                            label="Communication Address"
                                            value={formData.commAddress}
                                            onChange={e => setFormData({ ...formData, commAddress: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" id="sameAddr"
                                                onChange={(e) => {
                                                    if (e.target.checked) setFormData(p => ({ ...p, permAddress: p.commAddress }))
                                                }}
                                                className="rounded border-slate-300"
                                            />
                                            <label htmlFor="sameAddr" className="text-sm text-slate-600">Permanent Address same as above</label>
                                        </div>
                                        <Input
                                            label="Permanent Address"
                                            value={formData.permAddress}
                                            onChange={e => setFormData({ ...formData, permAddress: e.target.value })}
                                        />
                                    </>
                                )}
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-indigo-500" /> Identity Proofs
                                </h3>

                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                                    Please ensure the details match your government ID exactly.
                                </div>

                                <Input
                                    label="Aadhar Number"
                                    value={formData.aadharNumber}
                                    onChange={e => setFormData({ ...formData, aadharNumber: e.target.value.replace(/\D/g, '') })}
                                    placeholder="12 Digit Number"
                                    maxLength={12}
                                />

                                {userType === 'admin' && (
                                    <Input
                                        label="PAN Number"
                                        value={formData.panNumber}
                                        onChange={e => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                    />
                                )}
                            </motion.div>
                        )}
                    </div>

                    <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
                        {step === 1 ? (
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        ) : (
                            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                        )}

                        {step === 1 ? (
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!isStep1Valid()}
                                className="bg-slate-900 text-white"
                            >
                                Next Step <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleVerify}
                                disabled={!isStep2Valid()}
                                isLoading={isLoading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                Verify Identity
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
