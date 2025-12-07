import { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CheckCircle2, Megaphone, MapPin, Phone, Mail, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

export function TenureHome() {
    const [profile, setProfile] = useState<any>(null);
    const [adminDetails, setAdminDetails] = useState<any>(null); // Separate state for robust fetch
    const [currentDue, setCurrentDue] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                console.log("Fetching dashboard for User ID:", user.id);

                // 1. Fetch Tenure Profile (with Room)
                const { data: tenure, error: tenureError } = await supabase
                    .from('tenures')
                    .select('*, room:rooms(*)')
                    .eq('id', user.id)
                    .single();

                if (tenureError) {
                    console.error("Error fetching tenure:", tenureError);
                    setIsLoading(false);
                    return;
                }

                setProfile(tenure);

                // 2. Fetch Admin Details (Robust separate fetch)
                if (tenure && tenure.admin_id) {
                    console.log("Fetching details for Admin ID:", tenure.admin_id);

                    const { data: adminData, error: adminError } = await supabase
                        .from('admins')
                        .select('full_name, hostel_name, hostel_address, phone, email')
                        .eq('id', tenure.admin_id)
                        .single();

                    if (adminError) {
                        console.error("Error fetching admin details:", adminError);
                    } else {
                        console.log("Admin details fetched:", adminData);
                        setAdminDetails(adminData);
                    }

                    // 3. Fetch Notices (Using valid admin_id)
                    const { data: noticesData, error: noticesError } = await supabase
                        .from('notices')
                        .select('*')
                        .eq('admin_id', tenure.admin_id)
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (noticesError) console.error("Error fetching notices:", noticesError);
                    setNotices(noticesData || []);
                }

                // 4. Fetch Current Due
                const { data: pending } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('tenure_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                setCurrentDue(pending);

                // 5. Fetch Recent Activity
                const { data: activity } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('tenure_id', user.id)
                    .eq('status', 'paid')
                    .order('updated_at', { ascending: false })
                    .limit(3);

                setRecentActivity(activity || []);

                setIsLoading(false);

            } catch (error) {
                console.error('Error fetching dashboard:', error);
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
        );
    }

    const getNoticeBadgeColor = (category: string) => {
        switch (category) {
            case 'urgent': return 'bg-red-100 text-red-800';
            case 'maintenance': return 'bg-orange-100 text-orange-800';
            case 'event': return 'bg-purple-100 text-purple-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name?.split(' ')[0] || 'Tenant'} 👋</h1>
                    <p className="text-slate-600">
                        {profile?.room ? `Room ${profile.room.room_number}` : 'No Room Assigned'} • {adminDetails?.hostel_name || 'Nestify Hostel'}
                    </p>
                </div>
            </div>

            {/* Hostel Details Card */}
            {adminDetails && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Building2 className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center space-x-2 text-slate-400 text-sm font-medium uppercase tracking-wider">
                                <Building2 className="w-4 h-4" />
                                <span>Your Residence</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white">{adminDetails.hostel_name}</h2>
                            <div className="flex items-start text-slate-300 space-x-2">
                                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>{adminDetails.hostel_address || 'Address not listed'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
                            <a
                                href={`tel:${adminDetails.phone}`}
                                className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 px-4 py-3 rounded-xl transition-all group"
                            >
                                <div className="bg-green-500/20 p-1.5 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                    <Phone className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400">Owner</p>
                                    <p className="text-sm font-bold text-white leading-tight">Call Now</p>
                                </div>
                            </a>

                            <a
                                href={`mailto:${adminDetails.email || ''}`}
                                className={`flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 px-4 py-3 rounded-xl transition-all group ${!adminDetails.email ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="bg-blue-500/20 p-1.5 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                    <Mail className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400">Support</p>
                                    <p className="text-sm font-bold text-white leading-tight">Email</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main Stats) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Current Due */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Due</h3>
                        {currentDue ? (
                            <>
                                <div className="flex items-baseline mb-4">
                                    <span className="text-4xl font-bold text-slate-900">{formatCurrency(currentDue.total_amount)}</span>
                                    <span className="ml-2 text-sm text-slate-500">for {currentDue.month} {currentDue.year}</span>
                                </div>
                                <Link to="/tenure/payments">
                                    <button className="w-full bg-secondary hover:bg-secondary-hover text-white py-3 rounded-lg font-medium transition-colors shadow-lg shadow-secondary/25">
                                        Pay Now
                                    </button>
                                </Link>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <p className="text-slate-900 font-medium">All caught up!</p>
                                <p className="text-sm text-slate-500">No pending dues at the moment.</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Rent Paid</p>
                                            <p className="text-xs text-slate-500">{item.month} {item.year} • {formatCurrency(item.total_amount)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No recent activity.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (Notice Board) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                            <Megaphone className="h-5 w-5 mr-2 text-secondary" /> Notice Board
                        </h3>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
                        {notices.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <p>No notices.</p>
                                <p className="text-sm mt-1">Check back later for updates.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notices.map((notice) => (
                                    <div key={notice.id} className="p-4 rounded-lg border border-slate-100 hover:shadow-md transition-shadow bg-slate-50/50">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getNoticeBadgeColor(notice.category)}`}>
                                                {notice.category}
                                            </span>
                                            <span className="text-xs text-slate-400">{formatDate(notice.created_at)}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 mb-1">{notice.title}</h4>
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{notice.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
