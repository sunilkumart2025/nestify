import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, TrendingUp, ThumbsDown, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface FeedbackItem {
    id: string;
    rating: number;
    category: string;
    message: string;
    created_at: string;
    tenure: {
        full_name: string;
        room_number: string;
    };
}

export function AdminFeedback() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterRating, setFilterRating] = useState<number | 'all'>('all');

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch feedback for this Admin
        const { data, error } = await supabase
            .from('feedback')
            .select(`
                *,
                tenure:tenures(full_name)
            `)
            .eq('admin_id', user.id)
            .eq('target', 'hostel') // Only show Hostel feedback
            .order('created_at', { ascending: false });

        if (!error && data) {
            setFeedback(data);
        }
        setIsLoading(false);
    };

    // Analytics
    const totalReviews = feedback.length;
    const averageRating = totalReviews > 0
        ? (feedback.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
        : '0.0';

    const positiveCount = feedback.filter(f => f.rating >= 4).length;
    const negativeCount = feedback.filter(f => f.rating <= 2).length;
    const sentimentScore = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;

    const filteredFeedback = filterRating === 'all'
        ? feedback
        : feedback.filter(f => f.rating === filterRating);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Feedback & Reputation</h1>
                <p className="text-slate-600">See what your tenants are saying</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Average Rating</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-4xl font-bold text-slate-900">{averageRating}</span>
                            <Star className="h-6 w-6 text-yellow-400 fill-current" />
                        </div>
                    </div>
                    {Number(averageRating) >= 4.5 && (
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Reviews</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalReviews}</p>
                    <p className="text-xs text-slate-400 mt-2">All time stats</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Sentiment</p>
                    <div className="flex items-center gap-3 mt-1">
                        <div>
                            <p className="text-3xl font-bold text-slate-900">{sentimentScore}%</p>
                            <p className="text-xs text-slate-400">Positive</p>
                        </div>
                        <div className="h-10 w-px bg-slate-200 mx-2"></div>
                        <div>
                            <p className="text-3xl font-bold text-red-500">{negativeCount}</p>
                            <p className="text-xs text-slate-400">Issues</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Recent Reviews</h3>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            className="bg-white border border-slate-200 text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20"
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredFeedback.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No feedback found matching criteria.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredFeedback.map((item) => (
                            <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${item.rating >= 4 ? 'bg-green-100 text-green-700' :
                                            item.rating <= 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            <span className="font-bold text-lg">{item.rating}</span>
                                            <span className="text-xs ml-0.5">/5</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900">{item.tenure?.full_name || 'Anonymous Tenant'}</h4>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-xs text-slate-400 mt-1">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {item.rating < 3 && <ThumbsDown className="h-4 w-4 text-red-300" />}
                                    </div>
                                </div>
                                <p className="text-slate-700 leading-relaxed pl-[4.5rem]">
                                    {item.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
