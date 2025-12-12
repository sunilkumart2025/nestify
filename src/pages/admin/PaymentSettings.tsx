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

const paymentSchema = z.object({
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    cashfreeAppId: z.string().optional(),
    cashfreeSecretKey: z.string().optional(),
    lateFeeDailyPercent: z.string().optional(),
    // Recurring Billing
    autoBillEnabled: z.boolean(),
    autoBillDay: z.string().optional(),
    chargeMaintenance: z.string().optional(),
    chargeWater: z.string().optional(),
    chargeElectricity: z.string().optional(),
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
            autoBillEnabled: false,
            autoBillDay: '1',
            chargeMaintenance: '0',
            chargeWater: '0',
            chargeElectricity: '0'
        }
    });

    const formValues = watch();
    const hasRazorpay = !!formValues.razorpayKeyId && !!formValues.razorpayKeySecret;
    const hasCashfree = !!formValues.cashfreeAppId && !!formValues.cashfreeSecretKey;

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
            setValue('razorpayKeyId', data.razorpay_key_id || '');
            setValue('razorpayKeySecret', data.razorpay_key_secret || '');
            setValue('cashfreeAppId', data.cashfree_app_id || '');
            setValue('cashfreeSecretKey', data.cashfree_secret_key || '');
            setValue('lateFeeDailyPercent', data.late_fee_daily_percent?.toString() || '');

            // Recurring
            setValue('autoBillEnabled', data.auto_bill_enabled || false);
            setValue('autoBillDay', data.auto_bill_day?.toString() || '1');
            setValue('chargeMaintenance', data.charge_maintenance?.toString() || '0');
            setValue('chargeWater', data.charge_water?.toString() || '0');
            setValue('chargeElectricity', data.charge_electricity?.toString() || '0');
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
                    razorpay_key_id: data.razorpayKeyId,
                    razorpay_key_secret: data.razorpayKeySecret,
                    cashfree_app_id: data.cashfreeAppId,
                    cashfree_secret_key: data.cashfreeSecretKey,
                    late_fee_daily_percent: data.lateFeeDailyPercent ? parseFloat(data.lateFeeDailyPercent) : 0,
                    // Recurring
                    auto_bill_enabled: data.autoBillEnabled,
                    auto_bill_day: parseInt(data.autoBillDay || '1'),
                    charge_maintenance: parseFloat(data.chargeMaintenance || '0'),
                    charge_water: parseFloat(data.chargeWater || '0'),
                    charge_electricity: parseFloat(data.chargeElectricity || '0')
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

    const handleRunRecurring = async () => {
        const toastId = toast.loading("Generating Monthly Bills...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");
            const { data, error } = await supabase.rpc('generate_recurring_invoices', { p_admin_id: user.id, p_force: true });
            if (error) throw error;
            toast.success(`Success! Generated: ${data.generated}, Skipped: ${data.skipped_duplicates}`, { id: toastId });
        } catch (error: any) {
            toast.error("Failed: " + error.message, { id: toastId });
        }
    };

    const testConnectionRazorpay = async () => {
        setIsVerifying(true);
        setVerificationStatus('none');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const loadScript = (src: string) => {
                return new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    document.body.appendChild(script);
                });
            };

            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                toast.error('Failed to load Razorpay SDK');
                setIsVerifying(false);
                return;
            }

            const { data, error } = await supabase.rpc('create_razorpay_order', {
                p_amount: 1.00,
                p_admin_id: user.id
            });

            if (error) throw error;
            if (!data.success) {
                throw new Error(data.message || 'Failed to create Razorpay order');
            }

            toast.success('Credentials Valid! Opening Gateway...');

            const options = {
                key: data.key_id,
                amount: 100, // paise
                currency: "INR",
                name: "Nestify Verification",
                description: "Test Transaction (₹1)",
                order_id: data.order_id,
                handler: function () {
                    setVerificationStatus('success');
                    toast.success('Payment Verification Successful!');
                },
                modal: {
                    ondismiss: function () {
                        // Considers verify check if opened
                    }
                },
                theme: { color: "#2563EB" }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function () {
                toast.error('Payment failed, but credentials seem correct!');
            });
            rzp.open();
            setVerificationStatus('success');

        } catch (error: any) {
            console.error('Razorpay Verification Failed:', error);
            setVerificationStatus('failed');
            toast.error(error.message || 'Verification failed');
        } finally {
            setIsVerifying(false);
        }
    };


    const testConnectionCashfree = async () => {
        setIsVerifying(true);
        setVerificationStatus('none');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const loadScript = (src: string) => {
                return new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => resolve(true);
                    script.onerror = () => resolve(false);
                    document.body.appendChild(script);
                });
            };

            const res = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
            if (!res) {
                toast.error('Failed to load Cashfree SDK');
                setIsVerifying(false);
                return;
            }

            const { data, error } = await supabase.rpc('create_cashfree_order', {
                p_invoice_id: `TEST-${Date.now()}`,
                p_amount: 1.00,
                p_customer_id: 'test_admin',
                p_customer_name: 'Admin Verification',
                p_customer_email: user.email || 'test@example.com',
                p_customer_phone: '9999999999',
                p_admin_id: user.id,
                p_return_url: window.location.href
            });

            if (error) throw error;

            if (data && data.payment_session_id) {
                setVerificationStatus('success');
                toast.success('Connection verified! Opening gateway...');
                const cashfree = new (window as any).Cashfree({ mode: "sandbox" });
                cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_blank",
                });
            } else {
                setVerificationStatus('failed');
                toast.error(data?.message || 'Connection failed. Check credentials.');
            }

        } catch (error: any) {
            console.error('Info: Verification failed', error);
            setVerificationStatus('failed');
            toast.error('Verification failed. Please check your keys.');
        } finally {
            setIsVerifying(false);
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

                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${hasRazorpay ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${hasRazorpay ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Razorpay</h3>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hasRazorpay ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {hasRazorpay ? 'Active' : 'Not Configured'}
                                    </span>
                                </div>
                            </div>
                            {hasRazorpay && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${hasCashfree ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${hasCashfree ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}>
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Cashfree</h3>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hasCashfree ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {hasCashfree ? 'Active' : 'Not Configured'}
                                    </span>
                                </div>
                            </div>
                            {hasCashfree && <CheckCircle2 className="h-5 w-5 text-purple-600" />}
                        </div>
                    </div>
                </div>

                {/* Recurring Billing - NEW */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div> Automated Monthly Billing (Advanced)
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowLearnMore(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                        >
                            <Info className="h-4 w-4" /> Learn More
                        </button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <span className="text-sm font-medium text-slate-700">Enable Auto-Generation</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        {...register('autoBillEnabled')}
                                        onClick={(e) => {
                                            const target = e.target as HTMLInputElement;
                                            // If we are turning it ON (it was false, now clicking to true)
                                            // But wait, React Hook Form updates on change. 
                                            // Intercept via onClick prevents the native toggle if we call preventDefault
                                            if (target.checked) { // Boolean logic: it's not checked yet in UI visual if we prevent?
                                                // Actually click happens before change. 
                                                // If current value is false, clicking it makes it true.
                                                if (!formValues.autoBillEnabled) {
                                                    e.preventDefault();
                                                    setShowConfirmEnable(true);
                                                }
                                            }
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            <Input label="Generate on Day of Month" type="number" min="1" max="28" placeholder="e.g. 1" {...register('autoBillDay')} icon={<Calendar className="h-4 w-4" />} />
                        </div>
                        <div className="space-y-4 border-l pl-6 border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Run Manually</h4>
                            <p className="text-sm text-slate-500 mb-2">Trigger generation now for testing or missed dates.</p>
                            <Button type="button" onClick={handleRunRecurring} className="w-full bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 shadow-sm">
                                <Zap className="h-4 w-4 mr-2 text-indigo-500" /> Generate Bills Now
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2"><div className="w-1 h-4 bg-indigo-500 rounded-full"></div> Fixed Monthly Charges</h4>
                        <p className="text-xs text-slate-500 mb-4">These amounts will be added to the base rent for every tenant.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Maintenance (₹)" type="number" placeholder="0" {...register('chargeMaintenance')} icon={<Wrench className="h-4 w-4" />} />
                            <Input label="Water Charges (₹)" type="number" placeholder="0" {...register('chargeWater')} icon={<Droplets className="h-4 w-4" />} />
                            <Input label="Electricity Fixed (₹)" type="number" placeholder="0" {...register('chargeElectricity')} icon={<Zap className="h-4 w-4" />} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-8">
                    {/* Razorpay Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Razorpay
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <Input label="Key ID" type="password" placeholder="..." {...register('razorpayKeyId')} />
                            <Input label="Key Secret" type="password" placeholder="..." {...register('razorpayKeySecret')} />
                        </div>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Cashfree Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div> Cashfree
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <Input label="App ID" type="password" placeholder="..." {...register('cashfreeAppId')} />
                            <Input label="Secret Key" type="password" placeholder="..." {...register('cashfreeSecretKey')} />
                        </div>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Autopilot Settings */}
                    <div>
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
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button type="button" variant="ghost" onClick={testConnectionRazorpay} isLoading={isVerifying} disabled={!hasRazorpay} className="flex-1">
                            <CreditCard className="h-4 w-4 mr-2" /> Verify Razorpay
                        </Button>
                        <Button type="button" variant="ghost" onClick={testConnectionCashfree} isLoading={isVerifying} disabled={!hasCashfree} className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" /> Verify Cashfree
                        </Button>
                    </div>
                    <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
                        Save All Settings
                    </Button>
                </div>
            </form>

            <AnimatePresence>
                {showConfirmEnable && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
                        >
                            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-4 mx-auto">
                                <Zap className="h-6 w-6 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Enable Recurring Billing?</h2>
                            <p className="text-slate-600 text-center mb-6">
                                Are you sure you want to enable automatic bill generation? This will create pending invoices for all active tenants on the {formValues.autoBillDay || '1'}st of every month.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setShowConfirmEnable(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => {
                                        setValue('autoBillEnabled', true);
                                        setShowConfirmEnable(false);
                                        toast.success("Feature Enabled!");
                                    }}
                                >
                                    Yes, Enable It
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLearnMore && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
                        >
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center"><Zap className="h-6 w-6 text-indigo-500 mr-2" /> Automated Billing</h2>
                            <p className="text-slate-600 mb-4">
                                Nestify will automatically generate invoices for all your active tenants on your chosen day.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 text-sm font-mono text-slate-700 space-y-2">
                                <div className="flex justify-between"><span>Base Rent (Dynamic)</span> <span>₹5,000</span></div>
                                <div className="flex justify-between text-indigo-600"><span>+ Maintenance</span> <span>₹{formValues.chargeMaintenance || 0}</span></div>
                                <div className="flex justify-between text-blue-600"><span>+ Water</span> <span>₹{formValues.chargeWater || 0}</span></div>
                                <div className="flex justify-between text-yellow-600"><span>+ Electricity</span> <span>₹{formValues.chargeElectricity || 0}</span></div>
                                <div className="border-t border-slate-300 pt-2 font-bold flex justify-between">
                                    <span>Total Invoice</span>
                                    <span>₹{5000 + parseFloat(formValues.chargeMaintenance || '0') + parseFloat(formValues.chargeWater || '0') + parseFloat(formValues.chargeElectricity || '0')}</span>
                                </div>
                            </div>
                            <ul className="text-xs text-slate-500 list-disc ml-4 space-y-1 mb-6">
                                <li>Skips tenants who already have an invoice for the current month.</li>
                                <li>Rent is auto-fetched from the Room price assigned to the tenant.</li>
                                <li>Invoices are created as "Pending" with a default 5-day due date.</li>
                            </ul>
                            <div className="flex justify-end">
                                <Button onClick={() => setShowLearnMore(false)}>Got it, thanks!</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
