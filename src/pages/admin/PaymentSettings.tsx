import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CreditCard, CheckCircle2, RefreshCw, DollarSign, Calendar, Info, Zap, Droplets, Wrench } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { PaymentSettings as GatewayConfig } from '../../components/admin/PaymentSettings';

const paymentSchema = z.object({
    lateFeeDailyPercent: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export function PaymentSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'none' | 'success' | 'failed'>('none');
    const [platformDues, setPlatformDues] = useState(0);
    const [showLearnMore, setShowLearnMore] = useState(false);
    const [showConfirmEnable, setShowConfirmEnable] = useState(false);

    const { register, handleSubmit, setValue, watch } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            lateFeeDailyPercent: '0'
        }
    });

    const formValues = watch();

    useEffect(() => {
        fetchSettings();
        fetchPlatformDues();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error(error);
            toast.error('Failed to load settings');
        } else if (data) {
            setValue('lateFeeDailyPercent', data.late_fee_daily_percent?.toString() || '');
        }
        setIsLoading(false);
    };

    const fetchPlatformDues = async () => {
        try {
            const { data } = await supabase.rpc('get_my_platform_dues');
            setPlatformDues(data || 0);
        } catch (err) {
            console.error('Failed to fetch platform dues:', err);
        }
    };

    const loadScript = (src: string) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayPlatformDues = async () => {
        if (platformDues <= 0) {
            toast.success("No dues to pay!");
            return;
        }

        const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!res) {
            toast.error('Razorpay SDK failed to load');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const { data: adminData } = await supabase.from('admins').select('full_name, phone').eq('id', user?.id).single();

        const options = {
            key: import.meta.env.VITE_PLATFORM_RAZORPAY_KEY || "rzp_test_YourKeyHere",
            amount: platformDues * 100,
            currency: "INR",
            name: "Nestify Platform",
            description: "Platform Service Fees",
            handler: async function () {
                const toastId = toast.loading("Verifying Payment...");
                try {
                    const { error } = await supabase.rpc('clear_platform_dues', { p_amount: platformDues });
                    if (error) throw error;
                    toast.success("Payment Successful! Dues Cleared.", { id: toastId });
                    fetchPlatformDues();
                } catch (err: any) {
                    toast.error("Failed to update: " + err.message, { id: toastId });
                }
            },
            prefill: { name: adminData?.full_name, contact: adminData?.phone },
            theme: { color: "#10b981" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const onSubmit = async (data: PaymentFormData) => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('admins')
                .update({
                    late_fee_daily_percent: data.lateFeeDailyPercent ? parseFloat(data.lateFeeDailyPercent) : 0
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Settings saved successfully');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunAutopilot = async () => {
        const toastId = toast.loading("Running Late Fee Engine...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");
            const { data, error } = await supabase.rpc('process_automated_late_fees', { p_admin_id: user.id });
            if (error) throw error;
            toast.success(`Done! Processed ${data.processed_count} items.`, { id: toastId });
        } catch (error: any) {
            toast.error("Failed: " + error.message, { id: toastId });
        }
    };





    if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 relative">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Payment & Automation</h1>
                <p className="text-slate-600">Configure gateways and automated billing rules.</p>
            </div>

            {platformDues > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 rounded-lg">
                                <DollarSign className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-900 text-lg mb-1">Platform Service Fees Due</h3>
                                <p className="text-red-700 text-sm mb-2">
                                    You have outstanding platform fees for invoice processing and services.
                                </p>
                                <div className="text-3xl font-bold text-red-900">
                                    {formatCurrency(platformDues)}
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={handlePayPlatformDues}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-lg whitespace-nowrap"
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay Now
                        </Button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Gateway Configuration (New Dual System) */}
                <GatewayConfig />

                {/* Autopilot Settings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div> Autopilot Late Fees
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input label="Daily Late Fee (%)" type="number" step="0.1" placeholder="e.g. 0.5" {...register('lateFeeDailyPercent')} />
                            </div>
                            <Button type="button" onClick={handleRunAutopilot} disabled={isSaving} className="mb-0.5 bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200">
                                Run Now ⚡
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
                        Save Automation Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
