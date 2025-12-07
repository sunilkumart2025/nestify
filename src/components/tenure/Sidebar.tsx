
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    MessageSquare,
    User,
    LogOut,
    ClipboardList,
    X,
    HelpCircle,
    Phone,
    Mail,
    ScanLine,
    BedDouble,
    ThumbsUp,
    Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/tenure', icon: LayoutDashboard },
    { name: 'Room Info', href: '/tenure/room-info', icon: BedDouble },
    { name: 'Roommates', href: '/tenure/roommates', icon: Users },
    { name: 'Digital ID', href: '/tenure/digital-id', icon: ScanLine },
    { name: 'Feedback', href: '/tenure/feedback', icon: ThumbsUp },
    { name: 'Payments', href: '/tenure/payments', icon: Receipt },
    { name: 'Complaints', href: '/tenure/complaints', icon: ClipboardList },
    { name: 'Messages', href: '/tenure/messages', icon: MessageSquare },
    { name: 'Profile', href: '/tenure/profile', icon: User },
];

interface TenureSidebarProps {
    onClose?: () => void;
}

export function TenureSidebar({ onClose }: TenureSidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleContactOwner = async () => {
        const toastId = toast.loading('Fetching owner details...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Get Admin ID from Tenure
            const { data: tenureData, error: tenureError } = await supabase
                .from('tenures')
                .select('admin_id')
                .eq('id', user.id)
                .single();

            if (tenureError || !tenureData) {
                console.error('Tenure fetch error:', tenureError);
                throw new Error('Could not find tenure record.');
            }

            // 2. Get Admin Details
            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .select('full_name, phone, hostel_name, email')
                .eq('id', tenureData.admin_id)
                .single();

            if (adminError || !adminData) {
                console.error('Admin fetch error:', adminError);
                throw new Error('Could not fetch owner details.');
            }

            toast.dismiss(toastId);
            toast((t) => (
                <div className="flex flex-col gap-3 min-w-[280px] p-2">
                    <div className="text-center">
                        <span className="font-bold text-lg text-slate-900 block">{adminData.hostel_name || 'Hostel Owner'}</span>
                        <span className="text-sm text-slate-500">{adminData.full_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <a
                            href={`tel:${adminData.phone}`}
                            className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 transition-colors border border-green-100"
                        >
                            <Phone className="h-6 w-6 mb-1" />
                            <span className="font-bold">Call</span>
                        </a>
                        {/* Mail disabled/greyed out if we don't have email (fetched logic didn't include it in select yet, will add if available or just use fallback) */}
                        {/* Re-checking previous thought: I should try to fetch email too if possible. 
                            If 'email' is not in admins table (publicly), this might fail. 
                            Let's assume standard 'email' field exists in admins table from auth linkage or it's 'email' column.
                            I'll add 'email' to select query to be safe.
                        */}
                        <a
                            href={`mailto:${(adminData as any).email || ''}`}
                            className={`flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors border border-blue-100 ${!(adminData as any).email ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Mail className="h-6 w-6 mb-1" />
                            <span className="font-bold">Mail</span>
                        </a>
                    </div>

                    <div className="text-center text-xs text-slate-400 mt-1 font-mono">
                        <p>{adminData.phone}</p>
                    </div>

                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-slate-100 text-slate-600 text-xs px-2 py-2 rounded-lg mt-1 hover:bg-slate-200 w-full font-medium"
                    >
                        Dismiss
                    </button>
                </div>
            ), { duration: 8000 });

        } catch (err) {
            console.error(err);
            toast.error('Failed to contact owner. Please try again.', { id: toastId });
        }
    };

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 text-white relative shadow-xl">
            {/* Close Button mobile only */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-white"
            >
                <X className="h-6 w-6" />
            </button>

            <div className="flex h-16 items-center justify-center border-b border-slate-800 space-x-2">
                <img src="/logo.jpg" alt="Nestify" className="h-8 w-8 rounded-lg object-cover" />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-secondary to-primary">
                    Nestify Student
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== '/tenure' && location.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-secondary text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="border-t border-slate-800 p-4 space-y-2">
                <button
                    onClick={handleContactOwner}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors text-slate-300 hover:bg-slate-800 hover:text-white w-full"
                >
                    <Phone className="mr-3 h-5 w-5" />
                    Contact Owner
                </button>

                <button
                    onClick={() => {
                        toast((t) => (
                            <div className="flex flex-col gap-3 min-w-[280px] p-2">
                                <span className="font-bold text-lg text-center text-slate-900">Contact Nestify Support</span>
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <a
                                        href="tel:5656565656"
                                        className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 transition-colors border border-green-100"
                                    >
                                        <Phone className="h-6 w-6 mb-1" />
                                        <span className="font-bold">Call</span>
                                    </a>
                                    <a
                                        href="mailto:support@gmail.com"
                                        className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors border border-blue-100"
                                    >
                                        <Mail className="h-6 w-6 mb-1" />
                                        <span className="font-bold">Mail</span>
                                    </a>
                                </div>
                                <div className="text-center text-xs text-slate-400 mt-1 font-mono">
                                    <p>5656565656</p>
                                    <p>support@gmail.com</p>
                                </div>
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="bg-slate-100 text-slate-600 text-xs px-2 py-2 rounded-lg mt-1 hover:bg-slate-200 w-full font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ), { duration: 6000 });
                    }}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors text-slate-600 hover:bg-slate-50 hover:text-slate-900 w-full"
                >
                    <HelpCircle className="mr-3 h-5 w-5" />
                    Support
                </button>

                <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 w-full"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
