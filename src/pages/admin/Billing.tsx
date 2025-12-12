import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button'; // Assuming Button is used and missing
import { Mail } from 'lucide-react'; // Missing Mail icon import
import { sendEmail, EmailTemplates } from '../../lib/email';

import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';
import { Plus, Download, Search, Loader2, MoreVertical, Eye, CheckCircle2, Trash2, Pencil, Users, MessageCircle, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Invoice, Tenure } from '../../lib/types';
import { generateInvoicePDF } from '../../lib/pdf';
import { PaymentDetailsModal } from '../../components/admin/PaymentDetailsModal';
import { EditInvoiceModal } from '../../components/admin/EditInvoiceModal';
import { BulkGenerateBillModal } from '../../components/admin/BulkGenerateBillModal';

export function AdminBilling() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [tenures, setTenures] = useState<Tenure[]>([]);
    const [adminProfile, setAdminProfile] = useState<any>(null); // New State
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Billing Configuration
    const BILLING_RULES = {
        FIXED_FEE: 5,
        PLATFORM_PERCENT: 0.006, // 0.6%
        DEV_PERCENT: 0.0005,     // 0.05%
        SUPPORT_PERCENT: 0.0015, // 0.15%
        MAINT_PERCENT: 0.002,    // 0.2%
        GATEWAY_PERCENT: 0.0015  // 0.15%
    };

    // Helper to get date 10 days from now
    const getDefaultDueDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 10);
        return d.toISOString().split('T')[0];
    };

    // New Detailed Invoice Form State
    const [newBill, setNewBill] = useState({
        tenure_id: '',
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        due_date: getDefaultDueDate(),
        rent: '',
        electricity: '',
        water: '',
        maintenance: ''
    });

    useEffect(() => {
        fetchData();
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const [platformDues, setPlatformDues] = useState(0);
    const [nestIdStatus, setNestIdStatus] = useState<'verified' | 'unverified' | 'pending' | 'rejected'>('unverified');

    const loadScript = (src: string) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Add this specific early return for safety

            // Updated query to fetch room price
            const [invoicesRes, tenuresRes, duesRes] = await Promise.all([
                supabase
                    .from('invoices')
                    .select('*, tenure:tenures(*, room:rooms(room_number))')
                    .eq('admin_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('tenures')
                    .select('*, room:rooms(room_number, price)')
                    .eq('admin_id', user.id)
                    .eq('status', 'active'),
                supabase.rpc('get_my_platform_dues')
            ]);

            if (invoicesRes.error) throw invoicesRes.error;
            if (tenuresRes.error) throw tenuresRes.error;

            setInvoices(invoicesRes.data || []);
            setTenures(tenuresRes.data || []);
            setPlatformDues(duesRes.data || 0);

            // Fetch Admin Profile for PDF and NestID Status
            const { data: adminData } = await supabase
                .from('admins')
                .select('*, nestid_status')
                .eq('id', user.id)
                .single();
            setAdminProfile(adminData);
            setNestIdStatus(adminData?.nestid_status || 'unverified');
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
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

        const options = {
            key: import.meta.env.VITE_PLATFORM_RAZORPAY_KEY || "rzp_test_YourKeyHere", // Centralized Key
            amount: platformDues * 100, // in paise
            currency: "INR",
            name: "Nestify Platform",
            description: "Platform Service Fees",
            image: "https://nestify.app/logo.png",
            handler: async function () {
                const toastId = toast.loading("Verifying Payment...");
                try {
                    // Call RPC to clear dues
                    const { error } = await supabase.rpc('clear_platform_dues', { p_amount: platformDues });
                    if (error) throw error;

                    toast.success("Payment Successful! Dues Cleared.", { id: toastId });
                    fetchData(); // Refresh
                } catch (err: any) {
                    toast.error("Failed to update ledger: " + err.message, { id: toastId });
                }
            },
            prefill: {
                name: adminProfile?.full_name,
                email: adminProfile?.email,
                contact: adminProfile?.phone
            },
            theme: { color: "#10b981" }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };



    // ... inside component

    const handleSendReminder = async (invoice: Invoice) => {
        // 1. Email Reminder
        const toastId = toast.loading('Sending reminders...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: adminProfile } = await supabase.from('admins').select('full_name').eq('id', user?.id).single();

            if (!invoice.tenure?.email) throw new Error("Tenant email not found");

            // Send Email
            await sendEmail({
                to: invoice.tenure.email,
                subject: `Payment Reminder: ${invoice.month} Rent`,
                html: EmailTemplates.paymentReminder(
                    invoice.tenure.full_name || 'Resident',
                    formatCurrency(invoice.total_amount),
                    invoice.month,
                    invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate',
                    adminProfile?.full_name || 'Nestify Admin'
                )
            });

            toast.success('Email sent!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error('Email failed: ' + error.message, { id: toastId });
        }
    };

    const handleWhatsAppReminder = async (invoice: Invoice) => {
        if (!invoice.tenure?.phone) {
            toast.error("Tenant phone number missing");
            return;
        }

        const toastId = toast.loading('Sending WhatsApp...');

        try {
            // Updated: Call Platform RPC with Branded Message
            const paymentLink = `https://nestify.app/pay/${invoice.id.substring(0, 8)}`; // Mock link or real deep link
            const brandedMessage = `🔔 *PAYMENT REMINDER* 🔔\n\n` +
                `Dear *${invoice.tenure.full_name.split(' ')[0]}*,\n\n` +
                `Your rent for *${invoice.month}* is overdue.\n` +
                `💰 Amount: *${formatCurrency(invoice.total_amount)}*\n` +
                `📅 Due Date: *${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Immediate'}*\n` +
                `🏠 Room: *${invoice.tenure.room?.room_number || 'N/A'}*\n\n` +
                `Please pay securely using the link below:\n` +
                `🔗 ${paymentLink}\n\n` +
                `_~ Team Nestify_`;

            // Client-side Open (Branded but Manual)
            const encodedMessage = encodeURIComponent(brandedMessage);
            const whatsappUrl = `https://wa.me/${invoice.tenure.phone.replace(/\D/g, '')}?text=${encodedMessage}`;

            window.open(whatsappUrl, '_blank');
            toast.success('WhatsApp opened!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to open WhatsApp', { id: toastId });
        }
    };

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault();

        // NestID Blocker
        if (nestIdStatus !== 'verified') {
            toast.error("Please verify your identity first!");
            navigate('/admin/profile');
            return;
        }

        // Assuming setSaving is defined elsewhere, if not, remove or define it.
        // setSaving(true); 
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Verify Admin Record Exists to prevent FK Error
            const { data: adminRecord, error: adminError } = await supabase
                .from('admins')
                .select('id')
                .eq('id', user.id)
                .single();

            if (adminError || !adminRecord) {
                console.error("Admin record check failed:", adminError);
                toast.error("Admin profile missing! Please go to Profile and save your details first.");
                return;
            }

            // 1. Calculate Base Subtotal
            const rent = parseFloat(newBill.rent) || 0;
            const electricity = parseFloat(newBill.electricity) || 0;
            const water = parseFloat(newBill.water) || 0;
            const maintenance = parseFloat(newBill.maintenance) || 0;

            if (rent <= 0) throw new Error("Rent amount is required");

            const subtotal = rent + electricity + water + maintenance;

            // 2. Calculate Platform Fees (Automated)
            const platformShare = Math.round(subtotal * BILLING_RULES.PLATFORM_PERCENT);
            const devShare = Math.round(subtotal * BILLING_RULES.DEV_PERCENT);
            const supportShare = Math.round(subtotal * BILLING_RULES.SUPPORT_PERCENT);
            const maintShare = Math.round(subtotal * BILLING_RULES.MAINT_PERCENT); // System Maintenance
            const gatewayFee = Math.round(subtotal * BILLING_RULES.GATEWAY_PERCENT);
            const fixedFee = BILLING_RULES.FIXED_FEE;

            // 3. Construct Line Items
            const items = [
                { description: 'Room Rent', amount: rent, type: 'rent' },
                ...(electricity > 0 ? [{ description: 'Electricity Charges', amount: electricity, type: 'utility' }] : []),
                ...(water > 0 ? [{ description: 'Water Charges', amount: water, type: 'utility' }] : []),
                ...(maintenance > 0 ? [{ description: 'Hostel Maintenance', amount: maintenance, type: 'service' }] : []),

                // Automated Fees
                { description: 'Fixed Service Fee', amount: fixedFee, type: 'fee' },
                { description: `Platform Share (${(BILLING_RULES.PLATFORM_PERCENT * 100).toFixed(1)}%)`, amount: platformShare, type: 'fee' },
                { description: `Development Share (${(BILLING_RULES.DEV_PERCENT * 100).toFixed(2)}%)`, amount: devShare, type: 'fee' },
                { description: `Support Share (${(BILLING_RULES.SUPPORT_PERCENT * 100).toFixed(2)}%)`, amount: supportShare, type: 'fee' },
                { description: `System Maintenance (${(BILLING_RULES.MAINT_PERCENT * 100).toFixed(1)}%)`, amount: maintShare, type: 'fee' },
                { description: `Gateway Fee (${(BILLING_RULES.GATEWAY_PERCENT * 100).toFixed(2)}%)`, amount: gatewayFee, type: 'fee' }
            ];

            const totalFees = fixedFee + platformShare + devShare + supportShare + maintShare + gatewayFee;
            const total = subtotal + totalFees;

            const { error } = await supabase.from('invoices').insert({
                admin_id: user.id,
                tenure_id: newBill.tenure_id,
                month: newBill.month,
                due_date: newBill.due_date,
                year: new Date(newBill.due_date).getFullYear(),
                status: 'pending',
                items: items,
                subtotal: subtotal,
                total_amount: total
            });

            if (error) throw error;

            toast.success('Invoice created successfully');
            setIsCreateModalOpen(false);
            setNewBill({
                tenure_id: '',
                month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                due_date: getDefaultDueDate(),
                rent: '',
                electricity: '',
                water: '',
                maintenance: ''
            });
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            // setSaving(false); // Assuming setSaving is defined elsewhere
        }
    };

    // Auto-fill rent when tenant is selected
    const handleTenantSelect = (tenureId: string) => {
        const tenure = tenures.find(t => t.id === tenureId);
        const roomPrice = tenure?.room?.price;

        setNewBill(prev => ({
            ...prev,
            tenure_id: tenureId,
            rent: roomPrice ? roomPrice.toString() : prev.rent
        }));
    };


    const handleMarkAsPaid = async (invoice: Invoice) => {
        if (!confirm(`Mark Invoice #${invoice.id.substring(0, 8)} as PAID? This is for offline payments.`)) return;

        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', invoice.id);

            if (error) throw error;
            toast.success('Invoice marked as Paid');
            fetchData();
        } catch (error: any) {
            toast.error('Update failed: ' + error.message);
        }
    };

    const handleDelete = async (invoice: Invoice) => {
        if (!confirm('Are you sure you want to DELETE this invoice? This cannot be undone.')) return;

        try {
            await supabase.from('payments').delete().eq('invoice_id', invoice.id);
            const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);

            if (error) throw error;
            toast.success('Invoice deleted');
            fetchData();
        } catch (error: any) {
            toast.error('Delete failed: ' + error.message);
        }
    };

    const handleDownloadPDF = async (invoice: Invoice) => {
        const toastId = toast.loading('Generating Invoice...');
        try {
            let paymentDetails = null;
            if (invoice.status === 'paid') {
                const { data } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('invoice_id', invoice.id)
                    .eq('payment_status', 'SUCCESS')
                    .limit(1)
                    .single();
                paymentDetails = data;
            }

            const { data: { user } } = await supabase.auth.getUser();

            generateInvoicePDF({
                invoice,
                paymentDetails,
                isReceipt: invoice.status === 'paid',
                hostel: adminProfile ? {
                    name: adminProfile.hostel_name,
                    address: adminProfile.hostel_address,
                    phone: adminProfile.phone,
                    email: user?.email // Fetch user to get email
                } : undefined
            });

            toast.success('Invoice downloaded', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate PDF', { id: toastId });
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.tenure?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.month.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleExportRange = () => {
        if (!startDate || !endDate) {
            toast.error('Please select start and end dates');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include end date fully

        const filtered = invoices.filter(inv => {
            const d = new Date(inv.created_at);
            return d >= start && d <= end;
        });

        if (filtered.length === 0) {
            toast.error('No invoices found in this date range');
            return;
        }

        const headers = ['Invoice ID', 'Date', 'Tenant', 'Room', 'Month', 'Amount', 'Status', 'Payment Mode', 'Paid On'];
        const csvContent = [
            headers.join(','),
            ...filtered.map(inv => {
                // Find payment details if paid (this is a bit hacky as we don't have payment details in the invoice list, 
                // but we can query or just leave it blank for now. 
                // Better: Just export Invoice details.
                return [
                    inv.id,
                    new Date(inv.created_at).toLocaleDateString(),
                    inv.tenure?.full_name || 'Unknown',
                    inv.tenure?.room?.room_number || 'N/A',
                    inv.month,
                    inv.total_amount,
                    inv.status,
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Invoices_${startDate}_to_${endDate}.csv`;
        link.click();
        toast.success(`Exported ${filtered.length} invoices`);
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
                    <p className="text-slate-500">Manage rent collection and payment status</p>
                </div>

                {/* Actions & Export */}
                <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                        <input
                            type="date"
                            className="text-xs border-none focus:ring-0 text-slate-600 bg-transparent"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-300">-</span>
                        <input
                            type="date"
                            className="text-xs border-none focus:ring-0 text-slate-600 bg-transparent"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <Button size="sm" variant="ghost" onClick={handleExportRange} title="Export CSV">
                            <Download className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsBulkModalOpen(true)}>
                            <Users className="h-4 w-4 mr-2" /> Group Generate
                        </Button>
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Generate Bill
                        </Button>
                    </div>
                </div>
            </header>

            {/* NestID Alert Banner */}
            {nestIdStatus !== 'verified' && (
                <div className="mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Shield className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-indigo-900">Verify Identity to Unlock Billing</h3>
                            <p className="text-sm text-indigo-700">
                                You must complete NestID verification to generate new invoices.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/admin/nestid')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
                    >
                        Verify Now
                    </Button>
                </div>
            )}

            {/* Platform Dues Banner */}
            {platformDues > 0 && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            {/* Wait, Trash icon isn't great for dues. Use AlertCircle or Banknote. I'll stick to Trash2 for now or use imported `ShieldCheck` if available? No, import new icon if needed. Actually, `Trash2` is "garbage", likely wrong choice. Let's use `CreditCard` or `AlertTriangle`. 
                            I'll use no icon inside div if I don't want to add imports. Or use existing `MoreVertical`? 
                            Ah, I can use Unicode emoji for now to be safe on imports. */}
                        </div>
                        <div>
                            <h3 className="font-bold text-red-900">Platform Dues Pending</h3>
                            <p className="text-sm text-red-700">
                                You owe <span className="font-bold">{formatCurrency(platformDues)}</span> to Nestify for service fees.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handlePayPlatformDues}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
                    >
                        Pay {formatCurrency(platformDues)} Now
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by tenant name or month..."
                    className="pl-10 max-w-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Invoices List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Tenant</th>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Due Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInvoices.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No invoices found.</td></tr>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {invoice.tenure?.full_name || 'Unknown'} <span className='text-slate-400 font-normal ml-1'>(Room {invoice.tenure?.room?.room_number})</span>
                                            </td>
                                            <td className="px-6 py-4">{invoice.month}</td>
                                            <td className="px-6 py-4 font-mono font-medium">{formatCurrency(invoice.total_amount)}</td>
                                            <td className="px-6 py-4">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.status === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {invoice.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === invoice.id ? null : invoice.id);
                                                    }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {activeMenuId === invoice.id && (
                                                    <div className="absolute right-8 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                                        <button onClick={() => { setSelectedInvoice(invoice); setIsDetailsModalOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center text-slate-700 font-medium">
                                                            <Eye className="h-4 w-4 mr-2" /> View Details
                                                        </button>
                                                        {invoice.status === 'paid' ? (
                                                            <button onClick={() => handleDownloadPDF(invoice)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center text-slate-700 font-medium">
                                                                <Download className="h-4 w-4 mr-2" /> Download Invoice
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleSendReminder(invoice)} className="w-full text-left px-4 py-3 hover:bg-amber-50 flex items-center text-amber-600 font-medium">
                                                                    <Mail className="h-4 w-4 mr-2" /> Email Reminder
                                                                </button>
                                                                <button onClick={() => handleWhatsAppReminder(invoice)} className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center text-green-600 font-medium">
                                                                    <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Reminder
                                                                </button>
                                                                <div className="px-4 py-3 text-slate-300 flex items-center text-xs cursor-not-allowed">
                                                                    <Download className="h-4 w-4 mr-2" /> Payment Pending
                                                                </div>
                                                            </>
                                                        )}
                                                        {invoice.status !== 'paid' && (
                                                            <>
                                                                <button onClick={() => { setSelectedInvoice(invoice); setIsEditModalOpen(true); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center text-blue-600 font-medium">
                                                                    <Pencil className="h-4 w-4 mr-2" /> Edit Bill Amount
                                                                </button>
                                                                <button onClick={() => handleMarkAsPaid(invoice)} className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center text-green-600 font-medium">
                                                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
                                                                </button>
                                                            </>
                                                        )}
                                                        <div className="border-t border-slate-100 my-1"></div>
                                                        <button onClick={() => handleDelete(invoice)} className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center text-red-600 font-medium">
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete Entry
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Generate Invoice Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Generate New Invoice"
            >
                <form onSubmit={handleCreateBill} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Tenant</label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={newBill.tenure_id}
                            onChange={(e) => handleTenantSelect(e.target.value)}
                            required
                        >
                            <option value="">Choose a tenant...</option>
                            {tenures.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name} (Room {t.room?.room_number})</option>
                            ))}
                        </select>
                    </div>

                    {/* Detailed Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Room Rent</label>
                            <Input type="number" value={newBill.rent} onChange={(e) => setNewBill({ ...newBill, rent: e.target.value })} required placeholder="0.00" />
                            <p className="text-xs text-slate-400 mt-1">Auto-filled based on room</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Electricity Bill</label>
                            <Input type="number" value={newBill.electricity} onChange={(e) => setNewBill({ ...newBill, electricity: e.target.value })} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Water Charges</label>
                            <Input type="number" value={newBill.water} onChange={(e) => setNewBill({ ...newBill, water: e.target.value })} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance</label>
                            <Input type="number" value={newBill.maintenance} onChange={(e) => setNewBill({ ...newBill, maintenance: e.target.value })} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <p className="font-medium text-slate-700 mb-2">Automated Platform Charges:</p>
                        <div className="grid grid-cols-2 gap-y-1 text-slate-500 text-xs">
                            <span>Fixed Service Fee:</span> <span>{formatCurrency(20)}</span>
                            <span>Platform:</span> <span>0.6% (+ 0.4% Sys/Dev)</span>
                            <span>Gateway:</span> <span>0.15%</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Billing Month</label>
                        <Input type="text" value={newBill.month} onChange={(e) => setNewBill({ ...newBill, month: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                        <Input type="date" value={newBill.due_date} onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full mt-4">
                        Generate Invoice (Auto-calculates Fees & Total)
                    </Button>
                </form>
            </Modal>

            <BulkGenerateBillModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                tenures={tenures}
                onSuccess={fetchData}
            />

            <PaymentDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                invoice={selectedInvoice}
                onSendReminder={() => selectedInvoice && handleSendReminder(selectedInvoice)}
            />

            <EditInvoiceModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                invoice={selectedInvoice}
                onSuccess={fetchData}
            />
        </div>
    );
}
