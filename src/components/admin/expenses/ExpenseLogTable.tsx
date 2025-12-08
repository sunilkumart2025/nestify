import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../lib/utils';
import { Calendar, Search } from 'lucide-react';

export function ExpenseLogTable() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('expenses')
            .select('*, vendor:vendors(name)')
            .eq('admin_id', user.id)
            .order('expense_date', { ascending: false });

        if (error) console.error('Error fetching expenses:', error);
        setExpenses(data || []);
        setLoading(false);
    };

    if (loading) return <div className="text-center py-10">Loading...</div>;

    if (expenses.length === 0) {
        return (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500">No expenses logged yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                    {new Date(expense.expense_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-medium text-slate-900">{expense.title}</p>
                                    {expense.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{expense.notes}</p>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {expense.vendor?.name || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                    {formatCurrency(expense.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
