import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PostCard } from '../../components/community/PostCard';
import { PollCard } from '../../components/community/PollCard';
import type { CommunityPost } from '../../types/community';
import { Megaphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function TenureCommunity() {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Posts and My Votes
            const { data: postsData, error } = await supabase
                .from('community_posts')
                .select(`
                    *,
                    options:poll_options(*),
                    my_votes:poll_votes!left(option_id) 
                `)
                .order('created_at', { ascending: false });
            // Note: The `my_votes` join uses the foreign key and filters implicitly by Auth UID via RLS? 
            // No, standard join syntax doesn't filter by RLS automatically on the LEFT JOIN side unless explicitly scoped or using view.
            // Actually supabase-js filters are powerful. But simpler to fetch votes separately or rely on RLS if we trust it.
            // Let's rely on a separate query or better logic if RLS enabled.

            // To get "did I vote on this", we need a cleaner approach.
            // Let's fetch posts first.

            if (error) throw error;

            // 2. Fetch User's Votes
            const { data: userVotes } = await supabase
                .from('poll_votes')
                .select('post_id, option_id')
                .eq('user_id', user.id);

            const voteMap = new Map();
            userVotes?.forEach(v => voteMap.set(v.post_id, v.option_id));

            // Merge
            const formattedPosts = postsData.map((p: any) => ({
                ...p,
                user_vote_id: voteMap.get(p.id)
            }));

            setPosts(formattedPosts || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load community feed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = (postId: string, optionId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;

            // Update UI optimistically
            const updatedOptions = p.options?.map(opt =>
                opt.id === optionId ? { ...opt, vote_count: (opt.vote_count || 0) + 1 } : opt
            );

            return {
                ...p,
                options: updatedOptions,
                user_vote_id: optionId
            };
        }));
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Community Board</h1>
                <p className="text-slate-600">Events, announcements, and polls from your hostel.</p>
            </div>

            <div className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-12 text-slate-400">Loading updates...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">All Quiet</h3>
                        <p className="text-slate-500">No new announcements yet.</p>
                    </div>
                ) : (
                    posts.map(post => (
                        <div key={post.id}>
                            {post.type === 'poll' ? (
                                <PollCard post={post} onVote={handleVote} userVoteId={post.user_vote_id} />
                            ) : (
                                <PostCard post={post} />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
