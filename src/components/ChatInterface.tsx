import { useEffect, useState, useRef } from 'react';
import { Send, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read?: boolean;
}

interface ChatInterfaceProps {
    currentUserId: string;
    otherUserId: string;
    otherUserName: string;
    onBack?: () => void;
}

export function ChatInterface({ currentUserId, otherUserId, otherUserName, onBack }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);

            // Mark unread messages from other user as read
            const unreadIds = data
                .filter(m => m.sender_id === otherUserId && !m.is_read)
                .map(m => m.id);

            if (unreadIds.length > 0) {
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .in('id', unreadIds);
            }
        }
    };

    useEffect(() => {
        fetchMessages();

        // Real-time subscription
        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUserId}`
            }, async (payload) => {
                if (payload.new.sender_id === otherUserId) {
                    setMessages(prev => [...prev, payload.new as Message]);
                    // Mark as read immediately if chat is open
                    await supabase
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', payload.new.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, otherUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            sender_id: currentUserId,
            receiver_id: otherUserId,
            content: newMessage,
        };

        // Optimistic update
        const tempId = Math.random().toString();
        setMessages(prev => [...prev, { ...msg, id: tempId, created_at: new Date().toISOString() }]);
        setNewMessage('');

        const { error } = await supabase.from('messages').insert(msg);

        if (error) {
            console.error('Error sending message:', error);
            // Rollback on error (simplified)
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
                {onBack && (
                    <button onClick={onBack} className="mr-3 md:hidden p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </button>
                )}
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                    <User className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">{otherUserName}</h3>
                    <p className="text-xs text-green-600 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span> Online
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${isMe
                                    ? 'bg-primary text-white rounded-br-none'
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                                    }`}
                            >
                                <p className="text-sm">{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
