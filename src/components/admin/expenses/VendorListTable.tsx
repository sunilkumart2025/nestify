import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Phone, Mail } from 'lucide-react';

export function VendorListTable() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('admin_id', user.id)
            .order('name');

        if (error) console.error(error);
        setVendors(data || []);
        setLoading(false);
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    if (vendors.length === 0) {
        return (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No vendors added yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
                <div key={vendor.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">{vendor.name}</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md mt-1 inline-block">
                                {vendor.category}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {vendor.phone && (
                            <div className="flex items-center text-sm text-slate-600">
                                <Phone className="h-4 w-4 mr-2 text-slate-400" />
                                {vendor.phone}
                            </div>
                        )}
                        {vendor.email && (
                            <div className="flex items-center text-sm text-slate-600">
                                <Mail className="h-4 w-4 mr-2 text-slate-400" />
                                {vendor.email}
                            </div>
                        )}
                        {vendor.gst_number && (
                            <div className="text-xs text-slate-400 pt-2 border-t border-slate-50 mt-2">
                                GST: {vendor.gst_number}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
