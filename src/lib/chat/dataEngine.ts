import { supabase } from '../../lib/supabase';
import type { ChartIntent } from './parser';
import type { ChartPayload } from '../../components/chat/ChartRenderer';
import { format } from 'date-fns';

export const fetchChartData = async (intent: ChartIntent, role: 'admin' | 'tenure', userId?: string): Promise<ChartPayload | null> => {
    if (!intent.metric) return null;

    try {
        const { dateRange, block, room } = intent.filters || {};

        if (intent.metric === 'my_dues') {
            if (role !== 'tenure' || !userId) return null;

            // Fetch My Invoices
            const { data } = await supabase
                .from('invoices')
                .select('total_amount, status, created_at')
                .eq('tenure_id', userId)
                .order('created_at', { ascending: true });

            if (!data) return null;

            // Aggregate: Pending vs Paid
            const stats = { Pending: 0, Paid: 0 };
            data.forEach(inv => {
                if (inv.status === 'pending') stats.Pending += inv.total_amount;
                else if (inv.status === 'paid') stats.Paid += inv.total_amount;
            });

            const chartData = Object.entries(stats).map(([status, value]) => ({ name: status, value }));

            return {
                type: 'bar',
                title: 'My Payment Status',
                data: chartData,
                dataKey: 'value',
                categoryKey: 'name',
                color: '#f59e0b'
            };
        }

        if (intent.metric === 'revenue') {
            // ... (Existing Revenue Logic)
            if (role !== 'admin') return null;

            let query = supabase
                .from('invoices')
                .select('total_amount, created_at, status')
                .eq('status', 'paid');

            // Apply Date Range (Advanced)
            if (dateRange?.start) query = query.gte('created_at', dateRange.start.toISOString());
            if (dateRange?.end) query = query.lte('created_at', dateRange.end.toISOString());

            // Order by date
            const { data, error } = await query.order('created_at', { ascending: true });

            if (error || !data) return null;

            // Aggregation Logic
            const aggregatedData: Record<string, number> = {};

            data.forEach(inv => {
                // If Daily timeframe requested
                const fmt = intent.timeFrame === 'daily' ? 'dd MMM' : 'MMM yyyy';
                const label = format(new Date(inv.created_at), fmt);
                aggregatedData[label] = (aggregatedData[label] || 0) + (inv.total_amount || 0);
            });

            const chartData = Object.entries(aggregatedData).map(([name, value]) => ({
                name,
                value
            }));

            // Smart Title
            let title = 'Revenue Collections';
            if (dateRange?.label) title += ` (${dateRange.label})`;
            else title += ` (Last ${chartData.length} ${intent.timeFrame === 'daily' ? 'Days' : 'Months'})`;

            return {
                type: intent.chartType,
                title,
                data: chartData,
                dataKey: 'value',
                categoryKey: 'name',
                color: '#10b981'
            };
        }

        if (intent.metric === 'complaints') {
            const query = supabase.from('complaints').select('status, created_at');

            if (dateRange?.start) query.gte('created_at', dateRange.start.toISOString());
            if (dateRange?.end) query.lte('created_at', dateRange.end.toISOString());

            const { data } = await query;
            if (!data) return null;

            const stats: Record<string, number> = {};
            data.forEach(c => {
                stats[c.status] = (stats[c.status] || 0) + 1;
            });

            const chartData = Object.entries(stats).map(([status, count]) => ({
                status: status.toUpperCase(),
                count
            }));

            return {
                type: 'pie',
                title: `Complaint Status ${dateRange ? `(${dateRange.label})` : ''}`,
                data: chartData,
                dataKey: 'count',
                categoryKey: 'status'
            };
        }

        if (intent.metric === 'occupancy') {
            if (role !== 'admin') return null;
            // Fetch Rooms with simplified query
            const { data } = await supabase.from('rooms').select('type, capacity, occupancy_status');
            if (!data) return null;

            const stats: Record<string, number> = {};
            data.forEach(r => {
                stats[r.type] = (stats[r.type] || 0) + 1;
            });

            const chartData = Object.entries(stats).map(([type, count]) => ({
                type,
                count
            }));

            return {
                type: 'bar',
                title: 'Current Room Inventory',
                data: chartData,
                dataKey: 'count',
                categoryKey: 'type',
                color: '#6366f1'
            };
        }
    } catch (e) {
        console.error("Chart Data Fetch Error", e);
        return null;
    }

    return null;
};
