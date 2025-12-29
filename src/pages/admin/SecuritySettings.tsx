import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Key, Lock, AlertTriangle, History, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyVaultManager } from '../../lib/securityManager';
import { Setup2FA } from '../../components/auth/Setup2FA'; // New Import
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export function SecuritySettings() {
    const [isLoading, setIsLoading] = useState(false);
    const [keys, setKeys] = useState<any[]>([]);

    // Key Management
    const [selectedKeyType, setSelectedKeyType] = useState<string>('razorpay_key');
    const [keyValue, setKeyValue] = useState('');

    // Stats
    const [lockoutStats, setLockoutStats] = useState({ lockedAccounts: 0, recentFailures: 0 });
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load key rotation status
            const keyStatus = await KeyVaultManager.checkRotationStatus();
            setKeys(keyStatus);

            // Load 2FA status
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: admin } = await supabase
                    .from('admins')
                    .select('two_factor_enabled')
                    .eq('id', user.id)
                    .single();
                if (admin) setIs2FAEnabled(admin.two_factor_enabled || false);
            }

            // Mock stats (since we don't have an endpoint for this yet)
            // In a real app, we'd fetch from an admin RPC
            setLockoutStats({ lockedAccounts: 0, recentFailures: 2 });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggle2FA = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const newValue = !is2FAEnabled;

            const { error } = await supabase
                .from('admins')
                .update({ two_factor_enabled: newValue })
                .eq('id', user.id);

            if (error) throw error;

            setIs2FAEnabled(newValue);
            toast.success(`2FA ${newValue ? 'Enabled' : 'Disabled'} Successfully`);
        } catch (error: any) {
            toast.error(error.message || "Failed to update 2FA settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveKey = async () => {
        if (!keyValue) return toast.error("Please enter a key value");

        setIsLoading(true);
        try {
            const result = await KeyVaultManager.storeKey(selectedKeyType as any, keyValue);

            if (result.success) {
                toast.success("Key encrypted and stored securely!");
                setKeyValue('');
                loadData(); // Refresh list
            } else {
                toast.error(result.error || "Failed to store key");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="h-8 w-8 text-indigo-600" />
                    Security Center
                </h1>
                <p className="text-slate-600">Manage encryption keys, monitor threats, and configure firewall rules.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="wait">
                    {/* 1. 2FA Configuration */}
                    <motion.div
                        layout
                        key="2fa-config"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-indigo-600" />
                                    Two-Factor Authentication (2FA)
                                </h2>
                                <p className="text-slate-600 text-sm mt-1">
                                    Secure your account with email-based OTP verification.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${is2FAEnabled ? 'text-green-600' : 'text-slate-500'}`}>
                                    {is2FAEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <button
                                    onClick={toggle2FA}
                                    disabled={isLoading}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${is2FAEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Key Vault Management */}
                    <motion.div
                        layout
                        key="key-vault"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Key className="h-5 w-5 text-amber-500" />
                                Payment Key Vault
                            </h2>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Lock className="h-3 w-3" /> Encrypted (AES-256)
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 mb-4">
                                Keys are stored using <strong>pgcrypto</strong> encryption. Plain text keys are never visible after storage.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Key Type</label>
                                    <select
                                        className="w-full rounded-lg border-slate-200 p-2.5 text-sm"
                                        value={selectedKeyType}
                                        onChange={(e) => setSelectedKeyType(e.target.value)}
                                    >
                                        <option value="razorpay_key">Razorpay Key ID</option>
                                        <option value="razorpay_secret">Razorpay Secret</option>
                                        <option value="cashfree_app">Cashfree App ID</option>
                                        <option value="cashfree_secret">Cashfree Secret Key</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">New Value</label>
                                    <Input
                                        type="password"
                                        placeholder="Enter secret key..."
                                        value={keyValue}
                                        onChange={(e) => setKeyValue(e.target.value)}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSaveKey}
                                isLoading={isLoading}
                                className="w-full md:w-auto"
                            >
                                Encrypt & Store Key
                            </Button>

                            {/* Stored Keys Status */}
                            <div className="mt-6">
                                <h3 className="text-sm font-medium text-slate-900 mb-3">Key Rotation Status</h3>
                                <div className="space-y-2">
                                    {keys.length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">No keys stored in vault yet.</p>
                                    ) : (
                                        keys.map((key: any, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-full ${key.needs_rotation ? 'bg-red-100' : 'bg-green-100'}`}>
                                                        {key.needs_rotation ? (
                                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 capitalize">
                                                            {key.key_type.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            Rotated {key.days_old} days ago
                                                        </p>
                                                    </div>
                                                </div>
                                                {key.needs_rotation && (
                                                    <Button size="sm" variant="outline" className="text-xs h-7">
                                                        Rotate Now
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. Threat Monitor & Audit - Wrapped in a div to maintain grid layout */}
                    <div className="space-y-6">
                        <motion.div
                            layout
                            key="threat-monitor"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                        >
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Threat Monitor
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-slate-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-slate-900">{lockoutStats.lockedAccounts}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Locked Accounts</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-slate-900">{lockoutStats.recentFailures}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Failed Logins (24h)</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-slate-900">Active Rate Limit Rules</h3>
                                {[
                                    { name: 'Login Protection', limit: '5 attempts / 15m', status: 'Active' },
                                    { name: 'Payment API', limit: '3 txns / 5m', status: 'Active' },
                                    { name: 'Invoice Gen', limit: '10 / hr', status: 'Active' },
                                ].map((rule, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                        <span className="text-slate-600">{rule.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-slate-500">{rule.limit}</span>
                                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            layout
                            key="audit-log"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                        >
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <History className="h-5 w-5 text-indigo-500" />
                                Recent Security Events
                            </h2>

                            <div className="space-y-4">
                                <div className="flex gap-3 text-sm">
                                    <div className="mt-1">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">Admin Login</p>
                                        <p className="text-slate-500">Successful login from 192.168.1.1</p>
                                        <p className="text-xs text-slate-400 mt-1">Just now</p>
                                    </div>
                                </div>

                                {/* Placeholder for real audit logs */}
                                <div className="text-center py-4">
                                    <Button variant="outline" size="sm" className="text-xs">
                                        View Full Audit Log
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>
            </div>
        </div>
    );
}
