
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Phone, MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';

interface Roommate {
    full_name: string;
    phone: string;
    created_at: string;
}

export function Roommates() {
    const [roommates, setRoommates] = useState<Roommate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRoommates = async () => {
            setIsLoading(true);
            try {
                // Use the secure RPC we just created
                const { data, error } = await supabase.rpc('get_roommates');

                if (error) throw error;
                setRoommates(data || []);
            } catch (error) {
                console.error('Error fetching roommates:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoommates();
    }, []);

    // Utility to get initials
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Utility for colorful avatars
    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-red-100 text-red-600',
            'bg-green-100 text-green-600',
            'bg-blue-100 text-blue-600',
            'bg-yellow-100 text-yellow-600',
            'bg-purple-100 text-purple-600',
            'bg-pink-100 text-pink-600',
            'bg-indigo-100 text-indigo-600',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Roommates</h1>
                <p className="text-slate-600">People sharing your space</p>
            </div>

            {roommates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No Roommates Yet</h3>
                    <p className="text-slate-500 mt-1">You are currently the only one in this room.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roommates.map((person, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group"
                        >
                            <div className="p-6 text-center">
                                <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4 ${getAvatarColor(person.full_name)}`}>
                                    {getInitials(person.full_name)}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{person.full_name}</h3>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">
                                    Joined {format(new Date(person.created_at), 'MMM yyyy')}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                                <a
                                    href={`tel:${person.phone}`}
                                    className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 transition-colors"
                                >
                                    <Phone className="h-4 w-4" />
                                    Call
                                </a>
                                <a
                                    href={`sms:${person.phone}`}
                                    className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Message
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {roommates.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-900 text-sm">
                    <User className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>
                        <strong>Privacy Notice:</strong> This information is visible only to verified tenants of this room to facilitate communication.
                        Please respect each other's privacy.
                    </p>
                </div>
            )}
        </div>
    );
}
