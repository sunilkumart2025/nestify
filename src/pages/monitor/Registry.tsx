import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Users, Shield, Search, ChevronLeft, ChevronRight,
    Database, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MonitorRegistry() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'admins' | 'tenants'>('admins');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchData();
    }, [activeTab, page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const rpcName = activeTab === 'admins' ? 'get_global_admins' : 'get_global_tenants';
            const { data: res, error } = await supabase.rpc(rpcName, { page_number: page, page_size: 20 });

            if (error) throw error;
            if (res) {
                setData(res.data);
                setTotal(res.total);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-green-500 tracking-widest flex items-center gap-2">
                        <Database className="w-6 h-6" /> GLOBAL_REGISTRY
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">ACCESS LEVEL: GOD_MODE</p>
                </div>
                <button
                    onClick={() => navigate('/monitor')}
                    className="text-xs border border-slate-700 px-4 py-2 hover:bg-slate-800 transition-colors"
                >
                    BACK_TO_DASHBOARD
                </button>
            </header>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 mb-6">
                <button
                    onClick={() => { setActiveTab('admins'); setPage(1); }}
                    className={`px-6 py-2 text-sm transition-colors ${activeTab === 'admins' ? 'border-b-2 border-green-500 text-green-500 bg-green-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    ADMIN_DB ({total > 0 && activeTab === 'admins' ? total : '...'})
                </button>
                <button
                    onClick={() => { setActiveTab('tenants'); setPage(1); }}
                    className={`px-6 py-2 text-sm transition-colors ${activeTab === 'tenants' ? 'border-b-2 border-green-500 text-green-500 bg-green-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    SUBJECT_DB ({total > 0 && activeTab === 'tenants' ? total : '...'})
                </button>
            </div>

            {/* Content Grid */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-sm overflow-hidden min-h-[500px]">
                {loading ? (
                    <div className="flex items-center justify-center h-[400px] text-green-500 animate-pulse">
                        SCANNING_DATABASE...
                    </div>
                ) : (
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="p-4">ID_HASH</th>
                                <th className="p-4">IDENTITY</th>
                                <th className="p-4">{activeTab === 'admins' ? 'CONTACT' : 'HOSTEL_NODE'}</th>
                                <th className="p-4">STATUS</th>
                                <th className="p-4 text-right">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.map((item, i) => (
                                <tr key={i} className="hover:bg-green-500/5 transition-colors group">
                                    <td className="p-4 font-mono text-slate-600 group-hover:text-green-500/50">
                                        {item.id.substring(0, 8)}...
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-200">{item.full_name}</div>
                                        {activeTab === 'admins' && <div className="text-slate-500">{item.hostel_name}</div>}
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {activeTab === 'admins' ? item.email : item.hostel_name}
                                    </td>
                                    <td className="p-4">
                                        {activeTab === 'tenants' ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${item.trust_score >= 70 ? 'text-green-500' :
                                                        item.trust_score >= 40 ? 'text-yellow-500' : 'text-red-500'
                                                    }`}>
                                                    SCORE: {item.trust_score}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-green-500 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> VERIFIED
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="px-3 py-1 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-[10px] uppercase">
                                            Investigate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 text-xs text-slate-500">
                <span>PAGE {page}</span>
                <div className="flex gap-2">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="p-2 border border-slate-800 disabled:opacity-50 hover:bg-slate-900"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        disabled={data.length < 20}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 border border-slate-800 disabled:opacity-50 hover:bg-slate-900"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
