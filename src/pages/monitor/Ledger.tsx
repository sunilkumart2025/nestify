import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Activity, DollarSign, RefreshCw, ArrowUpRight,
    CreditCard, Check, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MonitorLedger() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(fetchTransactions, 10000); // 10s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase.rpc('get_global_transactions', { limit_count: 50 });
            if (error) throw error;
            if (data) setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-6 selection:bg-green-900 selection:text-white">
            <header className="mb-8 flex justify-between items-center border-b border-green-900/50 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-widest flex items-center gap-2">
                        <Activity className="w-6 h-6 animate-pulse" /> GLOBAL_LEDGER
                    </h1>
                    <p className="text-xs text-green-800 mt-1">REALTIME FINANCIAL STREAM</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-xs text-green-800">TOTAL VOLUME (24H)</div>
                        <div className="text-xl font-bold">₹{(transactions.reduce((acc, t) => acc + (t.status === 'paid' ? t.amount : 0), 0)).toLocaleString()}</div>
                    </div>
                    <button
                        onClick={() => navigate('/monitor')}
                        className="text-xs border border-green-900 px-4 py-2 hover:bg-green-900/20 transition-colors"
                    >
                        EXIT_STREAM
                    </button>
                </div>
            </header>

            {/* Stream Container */}
            <div className="border border-green-900/30 rounded-sm bg-black relative max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-green-900">
                <div className="sticky top-0 bg-black/90 backdrop-blur border-b border-green-900/30 p-2 grid grid-cols-12 text-xs text-green-800 font-bold uppercase z-10">
                    <div className="col-span-2">TIMESTAMP</div>
                    <div className="col-span-3">TRANSACTION_ID</div>
                    <div className="col-span-3">SUBJECT</div>
                    <div className="col-span-2">AMOUNT</div>
                    <div className="col-span-2 text-right">STATUS</div>
                </div>

                <div className="divide-y divide-green-900/20">
                    {transactions.map((tx, i) => (
                        <div key={i} className="grid grid-cols-12 p-3 text-sm hover:bg-green-900/10 transition-colors cursor-crosshair">
                            <div className="col-span-2 text-green-700 text-xs flex items-center">
                                {new Date(tx.created_at).toLocaleTimeString()}
                            </div>
                            <div className="col-span-3 font-mono text-green-600 truncate pr-4" title={tx.id}>
                                {tx.id}
                            </div>
                            <div className="col-span-3">
                                <div>{tx.tenant_name}</div>
                                <div className="text-[10px] text-green-800">{tx.hostel_name}</div>
                            </div>
                            <div className="col-span-2 font-bold">
                                ₹{tx.amount.toLocaleString()}
                            </div>
                            <div className="col-span-2 text-right flex justify-end">
                                <span className={`px-2 py-0.5 text-[10px] uppercase border ${tx.status === 'paid' ? 'border-green-800 text-green-500' :
                                        'border-red-900 text-red-700'
                                    }`}>
                                    {tx.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="p-4 text-center text-green-800 animate-pulse">
                            SYNCING_BLOCKCHAIN_NODE...
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between text-[10px] text-green-900">
                <div>NODE: ASIA_FIN_01</div>
                <div>ENCRYPTION: AES-256</div>
            </div>
        </div>
    );
}
