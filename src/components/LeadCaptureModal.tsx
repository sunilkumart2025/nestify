import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, Phone, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeadCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LeadCaptureModal = ({ isOpen, onClose }: LeadCaptureModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const { data, error: submitError } = await supabase.functions.invoke('submit-lead', {
                body: formData
            });

            if (submitError) {
                throw new Error(submitError.message || 'Failed to submit. Please try again.');
            }

            setSubmitted(true);
            setTimeout(() => {
                onClose();
                setSubmitted(false);
                setFormData({ name: '', email: '', phone: '', company: '' });
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden grid md:grid-cols-2 min-h-[600px]"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-black/5 md:hover:bg-slate-100 transition-colors z-20"
                        >
                            <X className="w-6 h-6 text-slate-400 md:text-slate-600" />
                        </button>

                        {/* Left Side - Image & Value Prop */}
                        <div className="relative hidden md:block w-full h-full">
                            <img
                                src="/lead-magnet.png"
                                alt="Nestify Support"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/40 to-transparent" />

                            {/* Content Overlay */}
                            <div className="absolute bottom-0 left-0 w-full p-10 text-white">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-900 bg-slate-200" />
                                        ))}
                                    </div>
                                    <span className="text-blue-100 font-medium text-sm pl-2">Join 500+ Owners</span>
                                </div>
                                <h3 className="text-3xl font-bold mb-3 leading-tight">
                                    Transform Your Hostel Operations
                                </h3>
                                <p className="text-blue-100 leading-relaxed text-sm">
                                    "Switching to Nestify saved us 20 hours a week and increased collection by 15% in just one month."
                                </p>
                            </div>
                        </div>

                        {/* Right Side - Form */}
                        <div className="p-8 md:p-12 flex flex-col justify-center overflow-y-auto">
                            {submitted ? (
                                // Success State
                                <div className="text-center py-12">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                    >
                                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                                    </motion.div>
                                    <h3 className="text-3xl font-bold text-slate-900 mb-4">You're All Set!</h3>
                                    <p className="text-slate-600 text-lg mb-8">
                                        Our onboarding specialist will contact you shortly to setup your account.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
                                    >
                                        Return to website
                                    </button>
                                </div>
                            ) : (
                                // Form State
                                <>
                                    <div className="mb-8">
                                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 md:hidden">
                                            <Mail className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <h3 className="text-3xl font-bold text-slate-900 mb-3">Get Started Free</h3>
                                        <p className="text-slate-600">
                                            Fill out the form below to schedule your personalized demo and onboarding call.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Name */}
                                        <div>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                                                    placeholder="Full Name"
                                                />
                                            </div>
                                        </div>

                                        {/* Row for Email & Phone */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                                                    placeholder="Email Address"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    required
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                                                    placeholder="Phone Number"
                                                />
                                            </div>
                                        </div>

                                        {/* Company */}
                                        <div>
                                            <div className="relative group">
                                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                                <input
                                                    type="text"
                                                    name="company"
                                                    required
                                                    value={formData.company}
                                                    onChange={handleChange}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                                                    placeholder="Hostel / Company Name"
                                                />
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                                <p className="text-sm text-red-600 font-medium">{error}</p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                'Submit Request'
                                            )}
                                        </button>

                                        <p className="text-xs text-center text-slate-400 mt-4 leading-relaxed">
                                            Trusted by modern hostels across India. <br />
                                            No credit card required.
                                        </p>
                                    </form>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
