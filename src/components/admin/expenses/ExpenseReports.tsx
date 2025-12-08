import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function ExpenseReports() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPnL();
    }, []);

    const fetchPnL = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.rpc('get_monthly_pnl', { p_admin_id: user.id });

        if (error) console.error(error);
        if (data) {
            // Reverse to show oldest to newest left to right
            setData([...data].reverse());
        }
        setLoading(false);
    };

    if (loading) return <div className="text-center py-10">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Last Month Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                        {data.length > 0 ? formatCurrency(data[data.length - 1].income) : '₹0'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Last Month Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                        {data.length > 0 ? formatCurrency(data[data.length - 1].expense) : '₹0'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Net Profit</p>
                    <p className={`text-2xl font-bold ${data.length > 0 && data[data.length - 1].profit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {data.length > 0 ? formatCurrency(data[data.length - 1].profit) : '₹0'}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Income vs Expense (6 Months)</h3>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
