import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';
import { Shield, CreditCard, Lock, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw, Smartphone, ArrowDownLeft, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';

type ViewState = 'VIEW' | 'SELECT' | 'CONFIG_OWN' | 'OTP';

export function PaymentSettings() {
    const [viewState, setViewState] = useState<ViewState>('VIEW');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data State
    const [currentMode, setCurrentMode] = useState<'PLATFORM' | 'OWN'>('PLATFORM');

    const [selectedMode, setSelectedMode] = useState<'PLATFORM' | 'OWN'>('PLATFORM');
    const [autoBillingEnabled, setAutoBillingEnabled] = useState(false);

    // Billing Config State
    const [billingDay, setBillingDay] = useState(1);
    const [fixedMaintenance, setFixedMaintenance] = useState('');
    const [fixedElectricity, setFixedElectricity] = useState('');
    const [fixedWater, setFixedWater] = useState('');

    // Late Fee State
    const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
    const [lateFeePercent, setLateFeePercent] = useState('');

    // Platform Settlements State
    const [platformDues, setPlatformDues] = useState({ collected: 0, settled: 0, due: 0 });
    const [settlementHistory, setSettlementHistory] = useState<any[]>([]);

    // Form State
    const [keyId, setKeyId] = useState('');
    const [keySecret, setKeySecret] = useState('');
    const [otp, setOtp] = useState('');

    // Verification State
    const [isTestLoading, setIsTestLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [infoModal, setInfoModal] = useState<'AUTO_BILLING' | 'LATE_FEE' | 'SETTLEMENTS' | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('admins')
                .select('payment_mode, razorpay_key_id, auto_billing_enabled, billing_cycle_day, fixed_maintenance, fixed_electricity, fixed_water, late_fee_enabled, late_fee_daily_percent')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setCurrentMode(data.payment_mode as 'PLATFORM' | 'OWN');
                setCurrentMode(data.payment_mode as 'PLATFORM' | 'OWN');
                setKeyId(data.razorpay_key_id || '');
                setAutoBillingEnabled(data.auto_billing_enabled || false);
                setBillingDay(data.billing_cycle_day || 1);
                setFixedMaintenance(data.fixed_maintenance?.toString() || '');
                setFixedElectricity(data.fixed_electricity?.toString() || '');
                setFixedWater(data.fixed_water?.toString() || '');
                setLateFeeEnabled(data.late_fee_enabled || false);
                setLateFeePercent(data.late_fee_daily_percent?.toString() || '');

                // Fetch Platform Dues
                fetchPlatformDues(user.id);
            }
        } catch (error) {
            console.error('Error fetching payment config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartChange = () => {
        setViewState('SELECT');
        setSelectedMode(currentMode); // Default to current
    };

    const sendOtp = async () => {
        console.log('🔐 Requesting OTP...');
        const toastId = toast.loading("Sending Security OTP...");
        try {
            const { data, error } = await supabase.functions.invoke('send-security-otp');

            console.log('📨 OTP Response:', data);
            if (data?.logs) {
                console.log('📋 Server Logs:');
                console.table(data.logs);
            }

            if (error) {
                console.error('❌ OTP Error:', error);
                throw error;
            }

            if (!data?.success) {
                throw new Error(data?.error || 'Failed to generate OTP');
            }

            if (data.debug_otp) {
                // Security: Do not log OTP to console in production
                toast.success(`OTP sent to your email`, { id: toastId, duration: 10000 });
            } else {
                toast.success("OTP Sent to your email", { id: toastId });
            }

            setViewState('OTP');
        } catch (error: any) {
            console.error('💥 Critical OTP Error:', error);
            toast.error("Failed to send OTP: " + (error.message || error), { id: toastId });
        }
    };

    const handleModeSelect = (mode: 'PLATFORM' | 'OWN') => {
        setSelectedMode(mode);
        if (mode === 'OWN') {
            setViewState('CONFIG_OWN');
        } else {
            // If switching to Platform, send OTP
            sendOtp();
        }
    };

    const handleConfigSubmit = () => {
        if (!keyId || !keySecret) {
            toast.error("Please enter both Key ID and Secret");
            return;
        }
        // Send OTP after validating keys
        sendOtp();
    };

    const handleVerifyAndSave = async () => {
        if (otp.length < 4) {
            toast.error("Please enter a valid OTP");
            return;
        }

        setIsSaving(true);
        // Simulate OTP Verification
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real app, we would verify the OTP against the backend here.
        // For now, we assume success if they entered something.

        try {
            const { error } = await supabase.functions.invoke('save-payment-config', {
                body: {
                    payment_mode: selectedMode,
                    key_id: selectedMode === 'OWN' ? keyId : null,
                    key_secret: selectedMode === 'OWN' ? keySecret : null,
                    otp: otp
                }
            });

            if (error) throw error;

            toast.success('Security Verification Successful! Settings Saved.');
            setCurrentMode(selectedMode);
            setViewState('VIEW');
            setOtp('');
            setKeySecret('');
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestGateway = async () => {
        setIsTestLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Load Razorpay SDK
            const loadScript = (src: string) => new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });

            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                toast.error('Failed to load Razorpay SDK');
                return;
            }

            // Create Order
            const { data, error } = await supabase.rpc('create_razorpay_order', {
                p_amount: 1.00, // 1 Rupee
                p_admin_id: user.id
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message || 'Failed to create order');

            const options = {
                key: data.key_id,
                amount: 100,
                currency: "INR",
                name: "Nestify Test",
                description: "Gateway Test Transaction (₹1)",
                order_id: data.order_id,
                handler: function () {
                    toast.success('Test Transaction Successful! Gateway is working.');
                },
                theme: { color: "#2563EB" }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            toast.error(error.message || "Test failed");
        } finally {
            setIsTestLoading(false);
        }
    };

    const handleToggleAutoBilling = async () => {
        const newValue = !autoBillingEnabled;
        setAutoBillingEnabled(newValue); // Optimistic update
        const toastId = toast.loading(newValue ? 'Enabling Auto-Billing...' : 'Disabling Auto-Billing...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('admins')
                .update({ auto_billing_enabled: newValue })
                .eq('id', user.id);

            if (error) throw error;

            toast.success(newValue ? 'Auto-Billing Enabled' : 'Auto-Billing Disabled', { id: toastId });
        } catch (error: any) {
            console.error('Error updating auto-billing:', error);
            toast.error('Failed to update setting', { id: toastId });
            setAutoBillingEnabled(!newValue); // Revert
        }
    };

    const handleGenerateNow = async () => {
        if (!confirm('This will generate invoices for ALL your active tenures based on your saved configuration. Continue?')) return;

        const toastId = toast.loading('Generating bills...');
        setIsGenerating(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('auto-generate-monthly-bills', {
                body: {
                    manual: true,
                    admin_id: user.id
                }
            });

            if (error) throw error;

            if (data.success) {
                toast.success(
                    `✅ Generated ${data.invoices_generated} invoices in ${(data.execution_time_ms / 1000).toFixed(2)}s`,
                    { id: toastId, duration: 5000 }
                );
            } else {
                throw new Error(data.message || 'Generation failed');
            }
        } catch (error: any) {
            console.error('Generation error:', error);
            toast.error('Failed to generate bills: ' + error.message, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };



    const fetchPlatformDues = async (adminId: string) => {
        try {
            // 1. Get Invoice IDs for this Admin
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id')
                .eq('admin_id', adminId);

            const invoiceIds = invoices?.map(i => i.id) || [];

            let collected = 0;

            if (invoiceIds.length > 0) {
                // 2. Get Payments for these Invoices (Platform Mode)
                const { data: payments } = await supabase
                    .from('payments')
                    .select('vendor_payout')
                    .in('invoice_id', invoiceIds)
                    .eq('payment_status', 'SUCCESS')
                    .not('vendor_payout', 'is', null);

                collected = payments?.reduce((sum, p: any) => sum + Number(p.vendor_payout), 0) || 0;
            }

            // 3. Total Settled
            const { data: settled } = await supabase
                .from('platform_settlements')
                .select('*')
                .eq('admin_id', adminId)
                .order('created_at', { ascending: false });

            const settledAmount = settled?.reduce((sum, s: any) => sum + Number(s.amount), 0) || 0;

            setPlatformDues({
                collected,
                settled: settledAmount,
                due: collected - settledAmount
            });
            setSettlementHistory(settled || []);

        } catch (err) {
            console.error('Error fetching dues:', err);
        }
    };

    const handleSaveBillingConfig = async () => {
        const toastId = toast.loading('Saving billing configuration...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('admins')
                .update({
                    billing_cycle_day: billingDay,
                    fixed_maintenance: parseFloat(fixedMaintenance) || 0,
                    fixed_electricity: parseFloat(fixedElectricity) || 0,
                    fixed_water: parseFloat(fixedWater) || 0,
                    late_fee_enabled: lateFeeEnabled,
                    late_fee_daily_percent: parseFloat(lateFeePercent) || 0
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Billing configuration saved!', { id: toastId });
        } catch (error: any) {
            console.error('Error saving billing config:', error);
            toast.error('Failed to save configuration', { id: toastId });
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-48 bg-slate-100 rounded-xl"></div>;
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <CreditCard className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Payment Gateway</h3>
                    <p className="text-sm text-slate-500">Configure how you receive payments from tenants</p>
                </div>
            </div>

            {/* Auto-Billing Toggle Section */}
            <div className="mb-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${autoBillingEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                            <RefreshCw className={`h-5 w-5 ${autoBillingEnabled ? '' : ''}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">Automated Monthly Billing</h4>
                                <button
                                    onClick={() => setInfoModal('AUTO_BILLING')}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">Automatically generate and email invoices every month.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${autoBillingEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                            {autoBillingEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                            onClick={handleToggleAutoBilling}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoBillingEnabled ? 'bg-green-500' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoBillingEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Advanced Configuration (Only visible when enabled) */}
                {autoBillingEnabled && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-slate-200 p-4 bg-white"
                    >
                        <h5 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-500" /> Billing Rules
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Bill Generation Day
                                </label>
                                <select
                                    value={billingDay}
                                    onChange={(e) => setBillingDay(parseInt(e.target.value))}
                                    className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                >
                                    {[1, 5, 8, 10, 15, 20, 25, 28].map(day => (
                                        <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">Invoices will be generated on this day.</p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Fixed Maintenance Charge (₹)"
                                    type="number"
                                    placeholder="0"
                                    value={fixedMaintenance}
                                    onChange={(e) => setFixedMaintenance(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Fixed Electricity (₹)"
                                        type="number"
                                        placeholder="0"
                                        value={fixedElectricity}
                                        onChange={(e) => setFixedElectricity(e.target.value)}
                                    />
                                    <Input
                                        label="Fixed Water (₹)"
                                        type="number"
                                        placeholder="0"
                                        value={fixedWater}
                                        onChange={(e) => setFixedWater(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            <Button
                                variant="outline"
                                onClick={handleGenerateNow}
                                isLoading={isGenerating}
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> Generate Bills Now
                            </Button>

                            <Button onClick={handleSaveBillingConfig} size="sm">
                                Save Configuration
                            </Button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Late Fee Configuration Section */}
            <div className="mb-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${lateFeeEnabled ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                            <AlertTriangle className={`h-5 w-5 ${lateFeeEnabled ? '' : ''}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">Smart Late Fee Automation</h4>
                                <button
                                    onClick={() => setInfoModal('LATE_FEE')}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">Automatically apply daily penalties to overdue invoices.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${lateFeeEnabled ? 'text-orange-600' : 'text-slate-500'}`}>
                            {lateFeeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                            onClick={() => setLateFeeEnabled(!lateFeeEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${lateFeeEnabled ? 'bg-orange-500' : 'bg-slate-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lateFeeEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {lateFeeEnabled && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-slate-200 p-4 bg-white"
                    >
                        <div className="max-w-md">
                            <Input
                                label="Daily Late Fee Percentage (%)"
                                type="number"
                                placeholder="e.g. 0.5"
                                step="0.1"
                                value={lateFeePercent}
                                onChange={(e) => setLateFeePercent(e.target.value)}
                                icon={<span className="text-slate-500 font-bold">%</span>}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Fee = (Total Invoice Amount) × (Percentage / 100) per day.
                                <br />
                                Example: For a ₹10,000 invoice, 0.5% = ₹50/day.
                            </p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleSaveBillingConfig} size="sm">
                                Save Late Fee Settings
                            </Button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Platform Settlements Section */}
            <div className="mb-8 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                            <ArrowDownLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">Platform Settlements</h4>
                                <button
                                    onClick={() => setInfoModal('SETTLEMENTS')}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">Track funds collected by Nestify on your behalf.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold">Due from Nestify</p>
                        <p className={`text-xl font-bold font-mono ${platformDues.due > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(platformDues.due)}
                        </p>
                    </div>
                </div>

                {/* Settlement History */}
                {settlementHistory.length > 0 && (
                    <div className="border-t border-slate-200">
                        <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 uppercase">Recent Payouts Received</div>
                        <div className="divide-y divide-slate-100">
                            {settlementHistory.slice(0, 3).map((s) => (
                                <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            Received {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(s.amount)}
                                        </p>
                                        <p className="text-xs text-slate-500">Ref: {s.reference_id} • {new Date(s.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        PAID
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* VIEW MODE */}
                {viewState === 'VIEW' && (
                    <motion.div
                        key="view"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="p-6 rounded-xl border-2 border-green-100 bg-green-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">
                                        {currentMode === 'PLATFORM' ? 'Nestify Common Gateway' : 'Your Own Gateway'}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            ● Live
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            Currently active and processing payments
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={handleTestGateway}
                                    isLoading={isTestLoading}
                                    className="flex-1 md:flex-none border-green-200 text-green-700 hover:bg-green-100"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" /> Test Gateway (₹1)
                                </Button>
                                <Button onClick={handleStartChange} className="flex-1 md:flex-none">
                                    Change
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* SELECTION MODE */}
                {viewState === 'SELECT' && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <h4 className="font-semibold text-slate-900 mb-4">Select Payment Mode</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => handleModeSelect('PLATFORM')}
                                className="cursor-pointer relative p-5 md:p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-600 active:border-indigo-600 active:bg-indigo-50/50 hover:bg-indigo-50/30 transition-all group overflow-hidden touch-manipulation"
                            >
                                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">
                                    RECOMMENDED
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                        <Shield className="h-6 w-6 text-indigo-700" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2">Nestify Common Gateway</h3>
                                <p className="text-sm text-slate-500 mb-4 leading-relaxed">Hassle-free payments managed by us. Perfect for getting started instantly.</p>

                                <ul className="space-y-2.5">
                                    {[
                                        "Instant Activation (No Setup)",
                                        "Automatic Split Settlements",
                                        "Zero Maintenance Required",
                                        "Best for: Small to Medium Hostels"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start text-xs text-slate-600">
                                            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div
                                onClick={() => handleModeSelect('OWN')}
                                className="cursor-pointer p-5 md:p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-600 active:border-indigo-600 active:bg-indigo-50/50 hover:bg-indigo-50/30 transition-all group touch-manipulation"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                                        <Lock className="h-6 w-6 text-slate-700" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2">My Own Gateway</h3>
                                <p className="text-sm text-slate-500 mb-4 leading-relaxed">Use your own Razorpay credentials for direct control over funds.</p>

                                <ul className="space-y-2.5">
                                    {[
                                        "Direct Settlements to Your Bank",
                                        "Use Your Own Brand Name",
                                        "Full Control Over Refunds",
                                        "Best for: Registered Businesses"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start text-xs text-slate-600">
                                            <CheckCircle2 className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 mr-2 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => setViewState('VIEW')} className="mt-4">Cancel</Button>
                    </motion.div>
                )}

                {/* CONFIG OWN MODE */}
                {viewState === 'CONFIG_OWN' && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2 mb-4 text-slate-900 font-semibold">
                            <Button variant="ghost" size="sm" onClick={() => setViewState('SELECT')} className="p-0 h-auto hover:bg-transparent">
                                <ArrowRight className="h-4 w-4 rotate-180 mr-1" /> Back
                            </Button>
                            <span>Configure Razorpay</span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                            <p className="text-sm text-slate-600 flex gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                You will be redirected to OTP verification after entering keys.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Razorpay Key ID"
                                placeholder="rzp_live_..."
                                value={keyId}
                                onChange={(e) => setKeyId(e.target.value)}
                            />
                            <Input
                                label="Razorpay Key Secret"
                                type="password"
                                placeholder="Enter Key Secret"
                                value={keySecret}
                                onChange={(e) => setKeySecret(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleConfigSubmit}>
                                Proceed to Verify <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* OTP MODE */}
                {viewState === 'OTP' && (
                    <motion.div
                        key="otp"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-md mx-auto text-center space-y-6 py-4"
                    >
                        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Smartphone className="h-8 w-8 text-indigo-600" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Security Verification</h3>
                            <p className="text-slate-500 mt-2">
                                To change critical payment settings, please enter the OTP sent to your registered email/phone.
                            </p>
                        </div>

                        <div className="max-w-xs mx-auto">
                            <Input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                className="text-center text-2xl tracking-widest font-mono"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.toUpperCase())}
                            />
                            <p className="text-xs text-slate-400 mt-2">Check your email for the code</p>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button variant="ghost" onClick={() => setViewState('SELECT')}>Cancel</Button>
                            <Button
                                onClick={handleVerifyAndSave}
                                isLoading={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                            >
                                Verify & Save
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info Modals */}
            <Modal
                isOpen={!!infoModal}
                onClose={() => setInfoModal(null)}
                title={
                    infoModal === 'AUTO_BILLING' ? 'Automated Monthly Billing' :
                        infoModal === 'LATE_FEE' ? 'Smart Late Fee Automation' :
                            'Platform Settlements'
                }
                maxWidth="max-w-lg"
            >
                <div className="space-y-4 text-slate-600">
                    {infoModal === 'AUTO_BILLING' && (
                        <>
                            <p>
                                Nestify's <strong>Automated Billing System</strong> simplifies rent collection by generating and sending invoices automatically.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                                <li>
                                    <strong>Schedule:</strong> Invoices are generated on your chosen day (e.g., 1st of every month).
                                </li>
                                <li>
                                    <strong>Components:</strong> The invoice includes the tenant's base rent plus any fixed charges you configure (Maintenance, Water, Electricity).
                                </li>
                                <li>
                                    <strong>Delivery:</strong> Tenants receive an email with a secure payment link immediately upon generation.
                                </li>
                                <li>
                                    <strong>Reminders:</strong> The system sends automatic payment reminders 3 days before the due date and on the due date itself.
                                </li>
                            </ul>
                        </>
                    )}

                    {infoModal === 'LATE_FEE' && (
                        <>
                            <p>
                                Encourage timely payments with our <strong>Smart Late Fee</strong> system.
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                                <h4 className="font-semibold text-slate-900 mb-2">How it works:</h4>
                                <p>
                                    If an invoice remains unpaid after the due date, a daily penalty is automatically added to the total due amount.
                                </p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p><strong>Calculation Example:</strong></p>
                                <p>
                                    If Rent = ₹10,000 and Late Fee = 0.5% per day:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                                    <li>Day 1 Overdue: ₹10,000 + ₹50 = ₹10,050</li>
                                    <li>Day 2 Overdue: ₹10,050 + ₹50 = ₹10,100</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {infoModal === 'SETTLEMENTS' && (
                        <>
                            <p>
                                When you use the <strong>Nestify Common Gateway</strong>, we collect payments on your behalf and settle them to your bank account.
                            </p>
                            <div className="grid grid-cols-1 gap-4 mt-4">
                                <div className="flex gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg h-fit">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">T+2 Settlement Cycle</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Funds are typically settled to your registered bank account within 2 business days (T+2) after the transaction.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg h-fit">
                                        <Shield className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">Secure & Automated</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            No manual intervention needed. We handle the reconciliation and transfer automatically.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={() => setInfoModal(null)}>
                        Got it
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
