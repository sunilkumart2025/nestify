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
    addDays
} from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Clock,
    Users,
    DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'custom' | 'invoice' | 'tenure' | 'complaint';
    meta?: any; // For storing original object details
    color: string;
}

export function SmartCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    // Removed unused loading state

    // Form State
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        type: 'meeting'
    });

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        // Removed setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const startDate = startOfMonth(currentDate).toISOString();
            const endDate = endOfMonth(currentDate).toISOString();

            // 1. Fetch Custom Events
            const { data: customEvents } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('admin_id', user.id)
                .gte('event_date', startDate)
                .lte('event_date', endDate);

            // 2. Fetch Pending Invoice Due Dates
            const { data: invoices } = await supabase
                .from('invoices')
                .select('id, total_amount, due_date, tenure:tenures(full_name)')
                .eq('admin_id', user.id)
                .eq('status', 'pending')
                .gte('due_date', startDate)
                .lte('due_date', endDate);

            // 3. Fetch New Tenures (Move-ins)
            const { data: newTenures } = await supabase
                .from('tenures')
                .select('id, full_name, created_at, room:rooms(room_number)')
                .eq('admin_id', user.id)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            // Transform into unified Event format
            const mappedEvents: CalendarEvent[] = [];

            // Map Custom Events
            customEvents?.forEach(evt => {
                mappedEvents.push({
                    id: evt.id,
                    title: evt.title,
                    date: new Date(evt.event_date),
                    type: 'custom',
                    meta: evt,
                    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
                });
            });

            // Map Invoices
            invoices?.forEach((inv: any) => {
                if (inv.due_date) {
                    mappedEvents.push({
                        id: inv.id,
                        title: `Due: ${inv.tenure?.full_name || 'Unknown'}`,
                        date: new Date(inv.due_date),
                        type: 'invoice',
                        meta: inv,
                        color: 'bg-rose-100 text-rose-700 border-rose-200'
                    });
                }
            });

            // Map Tenures
            newTenures?.forEach((t: any) => {
                mappedEvents.push({
                    id: t.id,
                    title: `Joined: ${t.full_name}`,
                    date: new Date(t.created_at),
                    type: 'tenure',
                    meta: t,
                    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
                });
            });

            setEvents(mappedEvents);

        } catch (error) {
            console.error(error);
            toast.error('Failed to load calendar events');
        } finally {
            // Removed setLoading(false)
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Combine date and time
            const fullDate = new Date(`${newEvent.date}T${newEvent.time}:00`);

            const { error } = await supabase.from('calendar_events').insert({
                admin_id: user.id,
                title: newEvent.title,
                description: newEvent.description,
                event_date: fullDate.toISOString(),
                event_type: newEvent.type
            });

            if (error) throw error;

            toast.success('Event added successfully');
            setIsAddModalOpen(false);
            fetchEvents();
        } catch (error: any) {
            toast.error(error.message);
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
                        "min-h-[80px] sm:min-h-[100px] border-b border-r border-slate-100 p-1 sm:p-2 transition-colors cursor-pointer relative group",
                        !isSameMonth(day, monthStart) ? "bg-slate-50/50 text-slate-400" : "bg-white",
                        isSelected ? "ring-2 ring-inset ring-primary/50" : "",
                        "hover:bg-slate-50"
                    )}
                    onClick={() => {
                        setSelectedDate(cloneDay);
                        setNewEvent(prev => ({ ...prev, date: format(cloneDay, 'yyyy-MM-dd') }));
                    }}
                >
                    <div className="flex justify-between items-start">
                        <span className={cn(
                            "text-xs sm:text-sm font-medium h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full",
                            isTodayDate ? "bg-primary text-white" : "text-slate-700"
                        )}>
                            {formattedDate}
                        </span>
                        {/* Add button appears on hover */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(cloneDay);
                                setNewEvent(prev => ({ ...prev, date: format(cloneDay, 'yyyy-MM-dd') }));
                                setIsAddModalOpen(true);
                            }}
                            className="hidden group-hover:flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-500"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>

                    {/* Events List (Truncated) */}
                    <div className="mt-1 sm:mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((evt, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate font-medium border",
                                    evt.color
                                )}
                                title={evt.title}
                            >
                                {evt.title}
                            </div>
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="text-[9px] sm:text-[10px] text-slate-400 pl-1">
                                +{dayEvents.length - 3} more
                            </div>
                        )}
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
                    <h1 className="text-2xl font-bold text-slate-900">Smart Calendar</h1>
                    <p className="text-slate-500">Manage schedules, payments, and events</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Add Event
                    </Button>
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
                                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setIsAddModalOpen(true)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add One
                                </Button>
                            </div>
                        ) : (
                            selectedDayEvents.map(evt => (
                                <div key={evt.id} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-shadow group">
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
                                        <div className="flex items-center text-xs text-slate-500 mt-2 gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            Pending Payment
                                        </div>
                                    )}
                                    {evt.type === 'tenure' && (
                                        <div className="flex items-center text-xs text-slate-500 mt-2 gap-1">
                                            <Users className="h-3 w-3" />
                                            Room {evt.meta?.room?.room_number}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Calendar Event"
            >
                <form onSubmit={handleAddEvent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                        <Input
                            value={newEvent.title}
                            onChange={(e: any) => setNewEvent({ ...newEvent, title: e.target.value })}
                            placeholder="e.g., Weekly Inspection"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <Input
                                type="date"
                                value={newEvent.date}
                                onChange={(e: any) => setNewEvent({ ...newEvent, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                            <Input
                                type="time"
                                value={newEvent.time}
                                onChange={(e: any) => setNewEvent({ ...newEvent, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <Input
                            value={newEvent.description}
                            onChange={(e: any) => setNewEvent({ ...newEvent, description: e.target.value })}
                            placeholder="Optional details..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            value={newEvent.type}
                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                        >
                            <option value="meeting">Meeting</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inspection">Inspection</option>
                            <option value="holiday">Holiday</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Event
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
