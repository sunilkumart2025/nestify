
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { User, MapPin, Phone } from 'lucide-react';

export function DigitalID() {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('tenures')
                .select('*, room:rooms(*), admin:admins(hostel_name, hostel_address)')
                .eq('id', user.id)
                .single();

            setProfile(data);
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

    // QR Data Security: Encode minimal info but enough for verification
    const qrData = JSON.stringify({
        id: profile.id,
        adminId: profile.admin_id,
        name: profile.full_name,
        type: 'nestify_id'
    });

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-slate-900">Digital ID Card</h1>
                <p className="text-slate-600">Show this QR code at the hostel entry</p>
            </div>

            {/* ID Card Container */}
            <div className="w-full max-w-sm relative group perspective-1000">
                {/* Background Blur/Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary to-primary rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                {/* The Card */}
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
                    {/* Header with Pattern */}
                    <div className="h-32 bg-secondary relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-primary opacity-90"></div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white opacity-10 rounded-full"></div>
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                            <div className="text-white text-opacity-90">
                                <p className="text-xs font-bold tracking-widest uppercase">Student Identity</p>
                                <p className="text-lg font-bold">{profile.admin?.hostel_name}</p>
                            </div>
                            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur" />
                        </div>
                    </div>

                    {/* Profile Image Area */}
                    <div className="relative -mt-16 text-center">
                        <div className="inline-block p-1 bg-white rounded-full shadow-lg">
                            <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border-4 border-slate-50 overflow-hidden relative">
                                {/* Placeholder for user image if we had one */}
                                <User className="w-12 h-12" />
                            </div>
                        </div>
                        <div className="mt-3 px-4">
                            <h2 className="text-2xl font-bold text-slate-900">{profile.full_name}</h2>
                            <p className="text-sm text-secondary font-medium">Room {profile.room?.room_number || 'N/A'}</p>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="flex justify-center my-6">
                        <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-xl">
                            <QRCodeSVG
                                value={qrData}
                                size={140}
                                level="H"
                                includeMargin={true}
                                fgColor="#0f172a"
                            />
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 font-medium uppercase">Phone</span>
                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                    <Phone className="w-3 h-3" /> {profile.phone}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-400 font-medium uppercase">Status</span>
                                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-bold capitalize ${profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {profile.status}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs text-slate-400 font-medium uppercase">Valid At</span>
                                <div className="flex items-center gap-1 text-slate-700">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{profile.admin?.hostel_address}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-900 py-3 text-center">
                        <p className="text-[10px] text-slate-400 font-mono tracking-widest">
                            NESTIFY SECURE ID • {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>

            <p className="mt-4 text-xs text-slate-400 text-center max-w-xs">
                This digital ID is generated live. Screenshots may be accepted at warden's discretion.
            </p>
        </div>
    );
}
