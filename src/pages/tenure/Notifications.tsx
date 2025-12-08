import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-hot-toast';
import type { Notification } from '../../lib/types';

export function TenureNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            setNotifications(data || []);
        }
        setIsLoading(false);
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const markAllAsRead = async () => {
        const { error } = await supabase.rpc('mark_all_notifications_as_read');
        if (error) {
            toast.error('Failed to mark all as read');
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            toast.success('All marked as read');
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Notification removed');
        }
    };

    // Filter logic
    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.is_read);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="h-6 w-6 text-primary" />
                        Start Your Day
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadCount} New
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-600">Latest updates from your Hostel Admin</p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white rounded-lg border border-slate-200 p-1 flex">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'unread' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Unread
                        </button>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead} className="text-sm">
                            <Check className="mr-2 h-4 w-4" /> Mark all read
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Bell className="h-12 w-12 mb-2 opacity-20" />
                        <p>You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 sm:p-6 hover:bg-slate-50 transition-colors flex gap-4 ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                            >
                                <div className={`mt-1 flex-shrink-0 p-2 rounded-full ${!notification.is_read ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-sm font-semibold ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                        {notification.message}
                                    </p>
                                    <div className="flex gap-4 mt-3">
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                            >
                                                Mark as read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" /> Dismiss
                                        </button>
                                    </div>
                                </div>
                                {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
