
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BedDouble, Wind, Fan, Users, Info, CheckCircle2 } from 'lucide-react';
import { AMENITY_CATEGORIES } from '../../lib/amenities';
import { formatCurrency } from '../../lib/utils'; // Assuming this util exists

export function RoomInfo() {
    const [room, setRoom] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRoom = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Tenure -> Room
            const { data: tenure } = await supabase
                .from('tenures')
                .select('room_id, room:rooms(*)')
                .eq('id', user.id)
                .single();

            if (tenure?.room) {
                setRoom(tenure.room);
            }
            setIsLoading(false);
        };

        fetchRoom();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="text-center py-16">
                <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <BedDouble className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No Room Assigned</h3>
                <p className="mt-1 text-slate-500">Please contact your admin to assign a room.</p>
            </div>
        );
    }

    const TypeIcon = room.type === 'AC' ? Wind : Fan;

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Room</h1>
                <p className="text-slate-600">Details and amenities of your living space</p>
            </div>

            {/* Main Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Room Number</p>
                        <h2 className="text-4xl font-bold mt-1">{room.room_number}</h2>
                    </div>
                    <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <TypeIcon className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Type</p>
                        <p className="font-semibold text-slate-900">{room.type === 'ac' ? 'AC' : 'Non-AC'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Floor</p>
                        <p className="font-semibold text-slate-900">{room.floor_number || 'Ground'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Capacity</p>
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-slate-400" />
                            <p className="font-semibold text-slate-900">{room.capacity} Persons</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 mb-1">Rent</p>
                        <p className="font-semibold text-slate-900 text-lg">{formatCurrency(room.price)}</p>
                    </div>
                </div>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-900">Included Amenities</h3>

                {(!room.amenities || room.amenities.length === 0) ? (
                    <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500">
                        No amenities listed for this room.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AMENITY_CATEGORIES.map(category => {
                            // Filter items in this category that are present in room.amenities
                            const presentItems = category.items.filter(item => room.amenities.includes(item));
                            if (presentItems.length === 0) return null;

                            return (
                                <div key={category.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                        {category.title.split(' ')[0]} {/* Icon */}
                                        <span>{category.title.substring(2)}</span>
                                    </h4>
                                    <ul className="space-y-2">
                                        {presentItems.map(item => (
                                            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}

                        {/* Custom Amenities (those not in any category) */}
                        {(() => {
                            const allCategoryItems = AMENITY_CATEGORIES.flatMap(c => c.items);
                            const customItems = room.amenities.filter((a: string) => !allCategoryItems.includes(a));

                            if (customItems.length === 0) return null;

                            return (
                                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide border-b pb-2">✨ Extra Amenities</h4>
                                    <ul className="space-y-2">
                                        {customItems.map((item: string) => (
                                            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                                                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-blue-800 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>These amenities are provided as part of your room package. If you find any item missing or damaged, please report it via the Complaints section.</p>
            </div>
        </div>
    );
}
