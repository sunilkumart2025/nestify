
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BedDouble,
    Users,
    Receipt,
    MessageSquare,
    BarChart3,
    Settings,
    LogOut,
    Wrench,
    X,
    CreditCard,
    HelpCircle,
    Phone,
    Mail,
    ScanLine,
    FileClock,
    ThumbsUp,
    Bell,
    Calendar // Added
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Verify ID', href: '/admin/verify-id', icon: ScanLine },
    { name: 'Rooms', href: '/admin/rooms', icon: BedDouble },
    { name: 'Tenures', href: '/admin/tenures', icon: Users },
    { name: 'Billing', href: '/admin/billing', icon: Receipt },
    { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare },
    { name: 'Analysis', href: '/admin/analysis', icon: BarChart3 },
    { name: 'Feedback', href: '/admin/feedback', icon: ThumbsUp },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileClock },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Expenses', href: '/admin/expenses', icon: Receipt }, // Added
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
    { name: 'Profile', href: '/admin/profile', icon: Settings },
];

interface AdminSidebarProps {
    onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
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
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                    Nestify Admin
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-white'
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
