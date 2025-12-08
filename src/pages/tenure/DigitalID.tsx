import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { User, Phone, Zap, ShieldCheck, Heart, Flame, Smartphone, RotateCw } from 'lucide-react';

// Icon mapping helper
const IconMap: any = {
    Zap, ShieldCheck, Heart, Flame, Smartphone
};

export function DigitalID() {
    const [profile, setProfile] = useState<any>(null);
    const [badges, setBadges] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Profile
            const { data } = await supabase
                .from('tenures')
                .select('*, room:rooms(*), admin:admins(hostel_name, hostel_address)')
                .eq('id', user.id)
                .single();

            setProfile(data);

            // 2. Fetch Badges
            const { data: badgeData } = await supabase
                .from('user_badges')
                .select('*, badge:badges(*)')
                .eq('user_id', user.id);

            setBadges(badgeData || []);
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
        );
    }

    if (!profile) return <div>Data not found</div>;

    const qrData = JSON.stringify({
        id: profile.id,
        adminId: profile.admin_id,
        name: profile.full_name,
        type: 'nestify_id'
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 perspective-1000">
            <div className="mb-8 text-center animate-in slide-in-from-top-4 duration-700">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                    {isFlipped ? 'Your Achievements' : 'Digital ID Card'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {isFlipped ? 'Badges earned for being an awesome tenant' : 'Tap the card to view badges'}
                </p>
            </div>

            {/* 3D Card Container */}
            <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative w-full max-w-sm h-[500px] cursor-pointer group"
                style={{ perspective: '1000px' }}
            >
                {/* Inner Flicker Container */}
                <div
                    className="relative w-full h-full text-left transition-all duration-700 ease-in-out transform shadow-2xl rounded-2xl"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    {/* FRONT SIDE */}
                    <div
                        className="absolute inset-0 w-full h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden backface-hidden border border-slate-200 dark:border-slate-700"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {/* Header */}
                        <div className="h-32 bg-secondary relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary opacity-90"></div>
                            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white opacity-10 rounded-full"></div>
                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                                <div className="text-white text-opacity-90">
                                    <p className="text-xs font-bold tracking-widest uppercase">Student Identity</p>
                                    <p className="text-lg font-bold truncate max-w-[200px]">{profile.admin?.hostel_name}</p>
                                </div>
                                <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur" />
                            </div>
                        </div>

                        {/* Profile Image & Info */}
                        <div className="relative -mt-16 text-center">
                            <div className="inline-block p-1 bg-white dark:bg-slate-800 rounded-full shadow-lg">
                                <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-300 border-4 border-slate-50 dark:border-slate-800 overflow-hidden relative">
                                    <User className="w-12 h-12" />
                                </div>
                            </div>
                            <div className="mt-3 px-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.full_name}</h2>
                                <p className="text-sm text-secondary font-medium">Room {profile.room?.room_number || 'N/A'}</p>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center my-4">
                            <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl">
                                <QRCodeSVG value={qrData} size={120} level="H" />
                            </div>
                        </div>

                        {/* Mini Details */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700 absolute bottom-0 w-full">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                    <Phone className="w-3 h-3" /> {profile.phone}
                                </div>
                                <div className="flex items-center gap-1 text-slate-500">
                                    <RotateCw className="w-3 h-3 animate-spin-slow" /> Flip for Badges
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BACK SIDE (Badges) */}
                    <div
                        className="absolute inset-0 w-full h-full bg-slate-900 text-white rounded-2xl overflow-hidden backface-hidden border border-slate-700"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            backgroundImage: 'radial-gradient(circle at 50% 120%, #1e1b4b, #0f172a)'
                        }}
                    >
                        <div className="p-6 h-full flex flex-col">
                            <h3 className="text-center font-bold text-xl mb-1 text-yellow-400">Trophy Case</h3>
                            <p className="text-center text-xs text-slate-400 mb-6">Earn badges by paying on time & staying active</p>

                            <div className="grid grid-cols-3 gap-3">
                                {badges.map((b: any) => {
                                    const Icon = IconMap[b.badge.icon] || Zap;
                                    return (
                                        <div key={b.id} className="aspect-square bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center p-2 text-center hover:bg-white/10 transition-colors group/badge relative">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center mb-2 shadow-lg"
                                                style={{ background: b.badge.color }}
                                            >
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-bold leading-tight">{b.badge.name}</span>

                                            {/* Tooltip */}
                                            <div className="absolute opacity-0 group-hover/badge:opacity-100 bottom-full mb-2 bg-black text-white text-xs px-2 py-1 rounded w-32 left-1/2 -translate-x-1/2 pointer-events-none z-50 transition-opacity">
                                                {b.badge.description}
                                            </div>
                                        </div>
                                    )
                                })}

                                {badges.length === 0 && (
                                    <div className="col-span-3 text-center py-8 text-slate-500 text-sm">
                                        No badges yet.
                                        <br />Pay your next bill on time to earn the "Early Bird" badge!
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-6 text-center">
                                <p className="text-xs text-slate-500">Tap card to see ID</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
