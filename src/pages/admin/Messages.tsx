import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { ChatInterface } from '../../components/ChatInterface';
import { supabase } from '../../lib/supabase';
import type { Tenure } from '../../lib/types';
import { toast } from 'react-hot-toast';

export function AdminMessages() {
    const [tenures, setTenures] = useState<Tenure[]>([]);
    const [selectedTenure, setSelectedTenure] = useState<Tenure | null>(null);
    const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTenures = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentAdminId(user.id);

            const { data, error } = await supabase
                .from('tenures')
                .select('*')
                .eq('admin_id', user.id)
                .order('full_name');

            if (error) {
                toast.error('Failed to load contacts');
            } else {
                // Fetch unread counts
                const { data: unreadData } = await supabase
                    .from('messages')
                    .select('sender_id')
                    .eq('receiver_id', user.id)
                    .eq('is_read', false); // Requires Migration

                const counts: Record<string, number> = {};
                unreadData?.forEach((msg: any) => {
                    counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
                });

                setTenures(data.map((t: any) => ({ ...t, unread_count: counts[t.id] || 0 })));
            }
        };
        fetchTenures();
    }, []);

    const filteredTenures = tenures.filter(t =>
        t.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${selectedTenure ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredTenures.map((tenure) => {
                        const unreadCount = tenures.find(t => t.id === tenure.id)?.unread_count || 0;
                        return (
                            <button
                                key={tenure.id}
                                onClick={() => setSelectedTenure(tenure)}
                                className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-50 transition-colors text-left ${selectedTenure?.id === tenure.id ? 'bg-slate-50 border-r-2 border-primary' : ''
                                    }`}
                            >
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                        {tenure.full_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className={`font-medium ${unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-900'}`}>{tenure.full_name}</h3>
                                    <p className={`text-xs truncate max-w-[180px] ${unreadCount > 0 ? 'text-primary font-medium' : 'text-slate-500'}`}>
                                        {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Click to chat'}
                                    </p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 bg-slate-50 ${selectedTenure ? 'flex' : 'hidden md:flex'}`}>
                {selectedTenure && currentAdminId ? (
                    <div className="h-full w-full md:p-4">
                        <ChatInterface
                            currentUserId={currentAdminId}
                            otherUserId={selectedTenure.id}
                            otherUserName={selectedTenure.full_name}
                            onBack={() => setSelectedTenure(null)}
                        />
                    </div>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <p>Select a tenant to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
}
