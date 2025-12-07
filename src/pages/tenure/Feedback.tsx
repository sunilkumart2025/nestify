
import { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, CheckCircle2, Building2, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-hot-toast';

type FeedbackTarget = 'hostel' | 'nestify';

export function TenureFeedback() {
    const [activeTab, setActiveTab] = useState<FeedbackTarget>('hostel');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Admin ID to link feedback to
    const [adminId, setAdminId] = useState<string | null>(null);

    const HOSTEL_CATEGORIES = ['Maintenance', 'Food', 'Hygiene', 'Staff', 'Security', 'Other'];
    const APP_CATEGORIES = ['App Speed', 'Feature Request', 'Bug Report', 'Ease of Use', 'Other'];

    useEffect(() => {
        // Fetch Admin ID for this tenure
        const fetchAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('tenures').select('admin_id').eq('id', user.id).single();
                if (data) setAdminId(data.admin_id);
            }
        };
        fetchAdmin();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return toast.error('Please select a rating');
        if (!category) return toast.error('Please select a category');
        if (!message.trim()) return toast.error('Please write a message');

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.from('feedback').insert({
                tenure_id: user.id,
                admin_id: activeTab === 'hostel' ? adminId : null, // Only link to admin if it's for them
                target: activeTab,
                rating,
                category,
                message,
                is_read: false
            });

            if (error) throw error;

            setSubmitted(true);
            toast.success('Feedback sent!');

            // Reset after 3 seconds or allow user to reset
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSubmitted(false);
        setRating(0);
        setMessage('');
        setCategory('');
    };

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto py-16 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Thank You!</h2>
                <p className="text-slate-600 max-w-md mx-auto">
                    Your feedback has been received. {activeTab === 'hostel' ? "Your hostel owner will be notified." : "The Nestify team appreciates your input!"}
                </p>
                <Button onClick={resetForm} variant="outline">
                    Send Another Response
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Feedback & Suggestions</h1>
                <p className="text-slate-600">Help us improve your experience</p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100/80 rounded-2xl backdrop-blur-sm">
                <button
                    onClick={() => { setActiveTab('hostel'); resetForm(); }}
                    className={`flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'hostel'
                            ? 'bg-white shadow-md text-primary scale-[1.02]'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <Building2 className="h-5 w-5" />
                    Review Hostel
                </button>
                <button
                    onClick={() => { setActiveTab('nestify'); resetForm(); }}
                    className={`flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'nestify'
                            ? 'bg-white shadow-md text-purple-600 scale-[1.02]'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                >
                    <Smartphone className="h-5 w-5" />
                    Review Nestify
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-10 transition-all">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-slate-800">
                            {activeTab === 'hostel' ? "How's your stay properly?" : "How is the Nestify App?"}
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {activeTab === 'hostel' ? "Rate the facilities, food, and overall vibe." : "Rate the app performance and features."}
                        </p>
                    </div>

                    {/* Star Rating */}
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                            >
                                <Star
                                    className={`h-10 w-10 transition-colors duration-200 ${star <= (hoverRating || rating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-slate-200'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-center text-sm font-medium text-slate-600 animate-in fade-in">
                            {rating === 5 ? "Excellent! 😍" : rating >= 4 ? "Good! 🙂" : rating >= 3 ? "Okay 😐" : "Needs Improvement 😕"}
                        </p>
                    )}

                    {/* Categories */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">What is this regarding?</label>
                        <div className="flex flex-wrap gap-2">
                            {(activeTab === 'hostel' ? HOSTEL_CATEGORIES : APP_CATEGORIES).map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${category === cat
                                            ? activeTab === 'hostel' ? 'bg-primary/10 border-primary text-primary' : 'bg-purple-100 border-purple-500 text-purple-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Detailed Feedback</label>
                        <div className="relative">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary focus:ring-primary sm:text-sm pl-4 pr-4 py-3 bg-slate-50/50 resize-none"
                                placeholder={activeTab === 'hostel' ? "Tell us about your experience..." : "Found a bug? Have a suggestion?"}
                            />
                            <MessageSquare className="absolute right-3 top-3 h-5 w-5 text-slate-300 pointer-events-none" />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        className={`w-full py-6 text-lg font-bold shadow-xl ${activeTab === 'nestify' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25' : ''
                            }`}
                        disabled={rating === 0 || !category || !message.trim()}
                    >
                        {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                        {!isSubmitting && <Send className="ml-2 h-5 w-5" />}
                    </Button>

                </form>
            </div>

            <p className="text-center text-xs text-slate-400">
                {activeTab === 'hostel'
                    ? "This feedback is visible directly to your Hostel Owner."
                    : "This feedback is sent sent directly to the Nestify Product Team."}
            </p>
        </div>
    );
}
