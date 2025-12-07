import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export function AdminAnalysis() {
    const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
    const [occupancyData, setOccupancyData] = useState<any[]>([]);
    const [topRooms, setTopRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const COLORS = ['#6366f1', '#e2e8f0'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Revenue Data (Invoices)
                const { data: invoices } = await supabase
                    .from('invoices')
                    .select('month, total_amount, status')
                    .eq('admin_id', user.id)
                    .eq('status', 'paid');

                // Aggregate revenue by month
                const revenueMap: { [key: string]: number } = {};
                invoices?.forEach(inv => {
                    const month = inv.month.substring(0, 3);
                    revenueMap[month] = (revenueMap[month] || 0) + Number(inv.total_amount);
                });

                const revenueChartData = Object.keys(revenueMap).map(key => ({
                    name: key,
                    amount: revenueMap[key]
                }));
                // Sort by month (simple logic for now, ideally use date objects)
                const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                revenueChartData.sort((a, b) => monthsOrder.indexOf(a.name) - monthsOrder.indexOf(b.name));
                setMonthlyRevenue(revenueChartData);

                // 2. Fetch Occupancy Data (Rooms & Tenures)
                // Fetch full room details including capacity
                const { data: fullRooms } = await supabase
                    .from('rooms')
                    .select('id, room_number, capacity, type, price')
                    .eq('admin_id', user.id);

                const { count: tenantCount } = await supabase
                    .from('tenures')
                    .select('*', { count: 'exact', head: true })
                    .eq('admin_id', user.id)
                    .eq('status', 'active');

                const totalSpots = fullRooms?.reduce((sum, room) => sum + room.capacity, 0) || 0;
                const occupiedSpots = tenantCount || 0;
                const vacantSpots = Math.max(0, totalSpots - occupiedSpots);

                setOccupancyData([
                    { name: 'Occupied', value: occupiedSpots },
                    { name: 'Vacant', value: vacantSpots }
                ]);

                // 3. Top Performing Rooms (Mock logic for now as we don't track per-room revenue easily without complex joins)
                // We can list rooms with most tenants or highest price * occupancy
                // For this demo, let's just list the most expensive occupied rooms
                const activeRooms = fullRooms?.map(room => {
                    // This is an approximation. Real logic needs to join tenures and sum payments.
                    return {
                        room: room.room_number,
                        type: room.type,
                        revenue: room.price * (room.capacity), // Potential revenue
                        rate: '100%' // Placeholder
                    };
                }).slice(0, 5) || [];
                setTopRooms(activeRooms);

                setIsLoading(false);

            } catch (error) {
                console.error('Error fetching analysis:', error);
                toast.error('Failed to load analysis data');
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Analysis & Reports</h1>
                <p className="text-slate-600">Insights into your hostel's performance</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Monthly Revenue (Paid Invoices)</h3>
                    <div className="h-80">
                        {monthlyRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No revenue data available yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Occupancy Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Current Occupancy</h3>
                    <div className="h-80 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={occupancyData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {occupancyData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-8 mt-4">
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                            <span className="text-sm text-slate-600">Occupied ({occupancyData[0]?.value})</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-slate-200 mr-2"></div>
                            <span className="text-sm text-slate-600">Vacant ({occupancyData[1]?.value})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Room Potential (Top 5)</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-3 text-sm font-medium text-slate-500">Room</th>
                                <th className="text-left py-3 text-sm font-medium text-slate-500">Type</th>
                                <th className="text-left py-3 text-sm font-medium text-slate-500">Potential Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topRooms.map((row, i) => (
                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                    <td className="py-4 text-sm font-medium text-slate-900">Room {row.room}</td>
                                    <td className="py-4 text-sm text-slate-600">{row.type}</td>
                                    <td className="py-4 text-sm text-slate-900 font-bold">{formatCurrency(row.revenue)}</td>
                                </tr>
                            ))}
                            {topRooms.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-4 text-center text-slate-500">No rooms found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
