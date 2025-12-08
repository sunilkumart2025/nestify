import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { CreditCard, CheckCircle2, RefreshCw } from 'lucide-react';

const paymentSchema = z.object({
    razorpayKeyId: z.string().optional(),
    razorpayKeySecret: z.string().optional(),
    cashfreeAppId: z.string().optional(),
    cashfreeSecretKey: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export function PaymentSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'none' | 'success' | 'failed'>('none');

    const { register, handleSubmit, setValue, watch } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
    });

    const formValues = watch();
    const hasRazorpay = !!formValues.razorpayKeyId && !!formValues.razorpayKeySecret;
    const hasCashfree = !!formValues.cashfreeAppId && !!formValues.cashfreeSecretKey;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('admins')
            .select('razorpay_key_id, razorpay_key_secret, cashfree_app_id, cashfree_secret_key')
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
        }
        setIsLoading(false);
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
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Payment settings saved successfully');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const testConnectionRazorpay = async () => {
        setIsVerifying(true);
        setVerificationStatus('none');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Load Razorpay SDK
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

            // 2. Create Order (Server-Side - Proves Secret Key is valid)
            const { data, error } = await supabase.rpc('create_razorpay_order', {
                p_amount: 1.00,
                p_admin_id: user.id
            });

            if (error) throw error;
            if (!data.success) {
                throw new Error(data.message || 'Failed to create Razorpay order');
            }

            toast.success('Credentials Valid! Opening Gateway...');

            // 3. Open Gateway (Client-Side - Proves Key ID is valid)
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
                    // In a real scenario, we might verify signature here too.
                },
                modal: {
                    ondismiss: function () {
                        // We consider it "verified" if the modal opened successfully 
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

            // 1. Load Cashfree SDK
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

            // 2. Create Order
            const { data, error } = await supabase.rpc('create_cashfree_order', {
                p_invoice_id: `TEST-${Date.now()}`,
                p_amount: 1.00,
                p_customer_id: 'test_admin',
                p_customer_name: 'Admin Verification',
                p_customer_email: user.email || 'test@example.com',
                p_customer_phone: '9999999999',
                p_admin_id: user.id,
                // Return to this page
                p_return_url: window.location.href
            });

            if (error) throw error;

            if (data && data.payment_session_id) {
                setVerificationStatus('success');
                toast.success('Connection verified! Opening gateway...');

                // 3. Open Gateway
                const cashfree = new (window as any).Cashfree({
                    mode: "sandbox"
                });

                cashfree.checkout({
                    paymentSessionId: data.payment_session_id,
                    redirectTarget: "_blank", // Open in new tab as requested
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

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Payment Gateway Settings</h1>
                <p className="text-slate-600">Configure your payment providers to accept rent online.</p>
            </div>

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

                {/* Configuration Fields */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-8">
                    {/* Razorpay Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div> Razorpay Configuration
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Required for standard payments.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Key ID"
                                type="password"
                                placeholder="rzp_test_..."
                                {...register('razorpayKeyId')}
                            />
                            <Input
                                label="Key Secret"
                                type="password"
                                placeholder="Enter secret..."
                                {...register('razorpayKeySecret')}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Cashfree Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center">
                            <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div> Cashfree Configuration
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Required for Smart Split payments & Settlements.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="App ID"
                                type="password"
                                placeholder="Enter App ID..."
                                {...register('cashfreeAppId')}
                            />
                            <Input
                                label="Secret Key"
                                type="password"
                                placeholder="Enter Secret Key..."
                                {...register('cashfreeSecretKey')}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions & Verification */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={testConnectionRazorpay}
                            isLoading={isVerifying}
                            disabled={!hasRazorpay}
                            className={`flex-1 ${verificationStatus === 'success' ? 'text-green-600' : ''}`}
                        >
                            <CreditCard className="h-4 w-4 mr-2" /> Verify Razorpay
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={testConnectionCashfree}
                            isLoading={isVerifying}
                            disabled={!hasCashfree}
                            className={`flex-1 ${verificationStatus === 'success' ? 'text-green-600' : ''}`}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" /> Verify Cashfree
                        </Button>
                    </div>

                    <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
                        Save Configurations
                    </Button>
                </div>
            </form>
        </div>
    );
}
