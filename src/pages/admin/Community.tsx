import { useState, useEffect } from 'react';
// Force rebuild
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PostCard } from '../../components/community/PostCard';
import { PollCard } from '../../components/community/PollCard';
import type { CommunityPost } from '../../types/community';
import { Plus, Megaphone, Calendar, BarChart2, X, Trash2, Filter, Search, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function AdminCommunity() {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'announcement' | 'event' | 'poll'>('all');

    // Create Form State
    const [postType, setPostType] = useState<'announcement' | 'event' | 'poll'>('announcement');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: postsData, error } = await supabase
                .from('community_posts')
                .select(`*, options:poll_options(*)`)
                .eq('admin_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(postsData || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to refresh feed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            const { data: post, error } = await supabase
                .from('community_posts')
                .insert({
                    admin_id: user.id,
                    type: postType,
                    title,
                    content,
                    event_date: postType === 'event' ? new Date(eventDate).toISOString() : null
                })
                .select()
                .single();

            if (error) throw error;

            if (postType === 'poll') {
                const validOptions = pollOptions.filter(o => o.trim() !== '');
                if (validOptions.length < 2) throw new Error("Polls need at least 2 options");

                const optionsToInsert = validOptions.map(opt => ({
                    post_id: post.id,
                    option_text: opt
                }));

                const { error: optError } = await supabase.from('poll_options').insert(optionsToInsert);
                if (optError) throw optError;
            }

            toast.success("Published successfully!");
            setShowCreateModal(false);
            resetForm();
            fetchPosts();

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setEventDate('');
        setPollOptions(['', '']);
        setPostType('announcement');
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        try {
            await supabase.from('community_posts').delete().eq('id', id);
            setPosts(prev => prev.filter(p => p.id !== id));
            toast.success("Deleted post");
        } catch (e) { toast.error("Failed to delete"); }
    };

    const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.type === filter);

    // Stats
    const totalViews = posts.length * 45; // Fake "Views" for demo
    const totalVotes = posts.reduce((acc, p) => acc + (p.options?.reduce((oa, o) => oa + (o.vote_count || 0), 0) || 0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Community Hub</h1>
                    <p className="text-slate-500 mt-1">Manage announcements, events, and polls for your tenants.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchPosts} variant="secondary" className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600">
                        Refresh
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                        <Plus className="h-4 w-4 mr-2" /> New Post
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{posts.length}</div>
                        <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Posts</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalViews}+</div>
                        <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Est. Views</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <BarChart2 className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{totalVotes}</div>
                        <div className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Votes</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'all', label: 'All Posts', icon: Search },
                    { id: 'announcement', label: 'Announcements', icon: Megaphone },
                    { id: 'event', label: 'Events', icon: Calendar },
                    { id: 'poll', label: 'Polls', icon: BarChart2 },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setFilter(item.id as any)}
                        className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filter === item.id
                            ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/20'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Feed Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-48 bg-white rounded-xl shadow-sm border border-slate-100 animate-pulse" />
                        ))
                    ) : filteredPosts.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <Megaphone className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">No posts found</h3>
                            <p className="text-slate-500">Try changing filters or create a new post.</p>
                        </div>
                    ) : (
                        filteredPosts.map(post => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={post.id}
                                className="relative group"
                            >
                                <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 bg-white/90 backdrop-blur shadow-sm rounded-full text-red-500 hover:bg-red-50 border border-slate-100 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                {post.type === 'poll' ? (
                                    <PollCard post={post} onVote={() => { }} />
                                ) : (
                                    <PostCard post={post} />
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-900">Create Update</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                {/* Type Selector */}
                                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                                    {(['announcement', 'event', 'poll'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setPostType(t)}
                                            className={`flex flex-row items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-all ${postType === t ? 'bg-white shadow text-indigo-600 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                        >
                                            {t === 'announcement' && <Megaphone className="h-4 w-4 mr-2" />}
                                            {t === 'event' && <Calendar className="h-4 w-4 mr-2" />}
                                            {t === 'poll' && <BarChart2 className="h-4 w-4 mr-2" />}
                                            <span className="capitalize hidden sm:inline">{t}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <Input
                                        label="Headline"
                                        placeholder={postType === 'poll' ? "Ask a question..." : "Enter title"}
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        required
                                        className="text-lg font-medium"
                                    />

                                    {postType !== 'poll' && (
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Details</label>
                                            <textarea
                                                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[120px] resize-none"
                                                placeholder="Write your message here..."
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {postType === 'event' && (
                                        <Input label="Event Date" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                                    )}

                                    {postType === 'poll' && (
                                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <label className="text-sm font-semibold text-slate-700 block">Voting Options</label>
                                            <div className="space-y-2">
                                                {pollOptions.map((opt, i) => (
                                                    <div key={i} className="flex gap-2 items-center group">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                                        <input
                                                            className="flex-1 bg-transparent border-b border-slate-300 focus:border-indigo-500 focus:outline-none py-1 text-sm transition-colors"
                                                            placeholder={`Option ${i + 1}`}
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...pollOptions];
                                                                newOpts[i] = e.target.value;
                                                                setPollOptions(newOpts);
                                                            }}
                                                        />
                                                        {i > 1 && (
                                                            <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button"
                                                onClick={() => setPollOptions([...pollOptions, ''])}
                                                className="text-sm text-indigo-600 font-bold hover:text-indigo-700 flex items-center mt-2 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors w-fit"
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> Add Another Option
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <Button type="button" variant="ghost" className="flex-1 text-slate-500 hover:text-slate-800" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                                    <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" isLoading={isSubmitting}>Publish</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
