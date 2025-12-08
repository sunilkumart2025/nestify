import { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday,
    addDays // Added
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    DollarSign,
    Wrench,
    AlertCircle,
    PartyPopper
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'custom' | 'invoice' | 'holiday' | 'maintenance' | 'inspection';
    meta?: any;
    color: string;
}

export function TenureCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    // Removed unused loading state

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        // Removed setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get Tenure Info first to find Admin ID
            const { data: tenure } = await supabase
                .from('tenures')
                .select('admin_id')
                .eq('id', user.id)
                .single();

            if (!tenure) return;

            const startDate = startOfMonth(currentDate).toISOString();
            const endDate = endOfMonth(currentDate).toISOString();

            // 1. Fetch Admin's Public Events
            const { data: adminEvents } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('admin_id', tenure.admin_id)
                .gte('event_date', startDate)
                .lte('event_date', endDate);

            // 2. Fetch MY Pending Invoice Due Dates
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id, total_amount, due_date')
                .eq('tenure_id', user.id)
                .eq('status', 'pending')
                .gte('due_date', startDate)
                .lte('due_date', endDate);

            // Transform into unified Event format
            const mappedEvents: CalendarEvent[] = [];

            // Map Admin Events
            adminEvents?.forEach(evt => {
                let color = 'bg-slate-100 text-slate-700 border-slate-200';
                if (evt.event_type === 'maintenance') color = 'bg-orange-100 text-orange-700 border-orange-200';
                if (evt.event_type === 'inspection') color = 'bg-blue-100 text-blue-700 border-blue-200';
                if (evt.event_type === 'holiday') color = 'bg-purple-100 text-purple-700 border-purple-200';

                mappedEvents.push({
                    id: evt.id,
                    title: evt.title,
                    date: new Date(evt.event_date),
                    type: evt.event_type,
                    meta: evt,
                    color: color
                });
            });

            // Map Invoices
            invoices?.forEach((inv: any) => {
                if (inv.due_date) {
                    mappedEvents.push({
                        id: inv.id,
                        title: `Rent Due`,
                        date: new Date(inv.due_date),
                        type: 'invoice',
                        meta: inv,
                        color: 'bg-rose-100 text-rose-700 border-rose-200'
                    });
                }
            });

            setEvents(mappedEvents);

        } catch (error) {
            console.error(error);
            toast.error('Failed to load calendar events');
        } finally {
            // Removed setLoading(false)
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            formattedDate = format(day, dateFormat);
            const cloneDay = day;

            // Filter events for this day
            const dayEvents = events.filter(e => isSameDay(e.date, cloneDay));
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            days.push(
                <div
                    key={day.toString()}
                    className={cn(
                        "min-h-[80px] sm:min-h-[100px] border-b border-r border-slate-100 p-1 sm:p-2 transition-colors cursor-pointer relative",
                        !isSameMonth(day, monthStart) ? "bg-slate-50/50 text-slate-400" : "bg-white",
                        isSelected ? "ring-2 ring-inset ring-primary/50" : "",
                        "hover:bg-slate-50"
                    )}
                    onClick={() => {
                        setSelectedDate(cloneDay);
                    }}
                >
                    <div className="flex justify-between items-start">
                        <span className={cn(
                            "text-xs sm:text-sm font-medium h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full",
                            isTodayDate ? "bg-primary text-white" : "text-slate-700"
                        )}>
                            {formattedDate}
                        </span>
                    </div>

                    {/* Events List (Truncated) */}
                    <div className="mt-1 sm:mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((evt, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "text-[8px] sm:text-[10px] px-1 py-0.5 rounded truncate font-medium border",
                                    evt.color
                                )}
                                title={evt.title}
                            >
                                {evt.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
            day = addDays(day, 1);
        }
        rows.push(
            <div className="grid grid-cols-7" key={day.toString()}>
                {days}
            </div>
        );
        days = [];
    }

    // Selected Date Details
    const selectedDayEvents = events.filter(e => isSameDay(e.date, selectedDate));

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Events & Schedule</h1>
                    <p className="text-slate-500">View upcoming maintenance and payment dates</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* Calendar Grid */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-slate-400" />
                            {format(currentDate, "MMMM yyyy")}
                        </h2>
                        <div className="flex gap-1">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                        {daysOfWeek.map(d => (
                            <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 overflow-y-auto">
                        {rows}
                    </div>
                </div>

                {/* Sidebar Details Panel */}
                <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="font-semibold text-slate-900 flex items-center">
                            {format(selectedDate, "EEEE, MMMM do")}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {selectedDayEvents.length} events scheduled
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedDayEvents.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No events for this day</p>
                            </div>
                        ) : (
                            selectedDayEvents.map(evt => (
                                <div key={evt.id} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-1">
                                        <div className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded", evt.color)}>
                                            {evt.type}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {format(evt.date, 'h:mm a')}
                                        </div>
                                    </div>
                                    <h4 className="font-medium text-slate-900">{evt.title}</h4>
                                    {evt.type === 'invoice' && (
                                        <div className="flex items-center text-xs text-rose-600 mt-2 gap-1 font-medium">
                                            <DollarSign className="h-3 w-3" />
                                            Payment Due
                                        </div>
                                    )}
                                    {evt.type === 'maintenance' && (
                                        <div className="flex items-center text-xs text-orange-600 mt-2 gap-1 font-medium">
                                            <Wrench className="h-3 w-3" />
                                            Scheduled Maintenance
                                        </div>
                                    )}
                                    {evt.type === 'holiday' && (
                                        <div className="flex items-center text-xs text-purple-600 mt-2 gap-1 font-medium">
                                            <PartyPopper className="h-3 w-3" />
                                            Holiday
                                        </div>
                                    )}
                                    {evt.type === 'inspection' && (
                                        <div className="flex items-center text-xs text-blue-600 mt-2 gap-1 font-medium">
                                            <AlertCircle className="h-3 w-3" />
                                            Hostel Inspection
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
