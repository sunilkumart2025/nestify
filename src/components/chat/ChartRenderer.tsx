import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export interface ChartPayload {
    type: 'bar' | 'line' | 'pie';
    title: string;
    data: any[];
    dataKey: string;      // The key for the numerical value (e.g., "amount")
    categoryKey: string;  // The key for the label (e.g., "month")
    color?: string;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#ef4444', '#f59e0b', '#10b981'];

export function ChartRenderer({ payload }: { payload: ChartPayload }) {
    if (!payload || !payload.data || payload.data.length === 0) {
        return <div className="p-4 text-sm text-slate-500 italic">No data available for this chart.</div>;
    }

    const { type, title, data, dataKey, categoryKey } = payload;
    const chartColor = payload.color || COLORS[0];

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey={categoryKey}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f1f5f9' }}
                            />
                            <Bar dataKey={dataKey} fill={chartColor} radius={[4, 4, 0, 0]} animationDuration={1000} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey={categoryKey}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={chartColor}
                                strokeWidth={3}
                                dot={{ fill: chartColor, r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey={dataKey}
                                nameKey={categoryKey}
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    return (
        <div className="w-full bg-white rounded-xl border border-slate-100 p-2 my-2 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{title}</h4>
            {renderChart()}
        </div>
    );
}
