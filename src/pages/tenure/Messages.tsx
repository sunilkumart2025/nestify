import { useEffect, useState } from 'react';
import { ChatInterface } from '../../components/ChatInterface';
import { supabase } from '../../lib/supabase';

export function TenureMessages() {
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [adminId, setAdminId] = useState<string>('');
    const [adminName, setAdminName] = useState<string>('');

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);

                // Get Admin ID from tenure record
                const { data: tenure } = await supabase
                    .from('tenures')
                    .select('admin_id, admin:admins(full_name)')
                    .eq('id', user.id)
                    .single();

                if (tenure) {
                    setAdminId(tenure.admin_id);
                    const adminData = Array.isArray(tenure.admin) ? tenure.admin[0] : tenure.admin;
                    setAdminName(adminData?.full_name || 'Hostel Admin');
                }
            }
        };
        init();
    }, []);

    // Simple poll for unread messages from Admin
    const [hasUnread, setHasUnread] = useState(false);
    useEffect(() => {
        if (!currentUserId || !adminId) return;
        const checkUnread = async () => {
            const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('sender_id', adminId)
                .eq('receiver_id', currentUserId)
                .eq('is_read', false);
            setHasUnread((count || 0) > 0);
        };
        checkUnread();
        // Subscribe for new messages to update badge
        const channel = supabase
            .channel('unread:check')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, () => setHasUnread(true))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, adminId]);

    if (!currentUserId || !adminId) return (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
                    <p className="text-slate-600">Chat with your hostel manager</p>
                </div>
                {hasUnread && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        New Message
                    </span>
                )}
            </div>

            <ChatInterface
                currentUserId={currentUserId}
                otherUserId={adminId}
                otherUserName={adminName}
            />
        </div>
    );
}
