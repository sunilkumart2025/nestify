import { useState } from 'react';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import type { CommunityPost } from '../../types/community';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface PollCardProps {
    post: CommunityPost;
    onVote: (postId: string, optionId: string) => void;
    userVoteId?: string; // ID of the option the user voted for
}

export function PollCard({ post, onVote, userVoteId }: PollCardProps) {
    const [isVoting, setIsVoting] = useState(false);

    // Calculate total votes for percentage
    const totalVotes = post.options?.reduce((acc, opt) => acc + (opt.vote_count || 0), 0) || 0;

    const handleVote = async (optionId: string) => {
        if (userVoteId) return; // Already voted
        setIsVoting(true);
        try {
            const { error } = await supabase.rpc('vote_on_poll', {
                p_post_id: post.id,
                p_option_id: optionId
            });

            if (error) throw error;
            toast.success("Vote Recorded!");
            onVote(post.id, optionId);
        } catch (err: any) {
            toast.error("Failed to vote: " + err.message);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="p-5 rounded-xl border bg-white border-slate-200 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-full bg-blue-50 text-blue-600 shrink-0">
                    <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                        Community Poll
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                        {post.title}
                    </h3>
                    {post.content && <p className="text-sm text-slate-500 mt-1">{post.content}</p>}
                </div>
            </div>

            <div className="space-y-3 pl-0 sm:pl-16">
                {post.options?.map((option) => {
                    const percent = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
                    const isSelected = userVoteId === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={!!userVoteId || isVoting}
                            className={`relative w-full text-left p-3 rounded-lg border transition-all overflow-hidden group ${isSelected
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                        >
                            {/* Progress Bar Background */}
                            {(!!userVoteId || isSelected) && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    className={`absolute top-0 left-0 h-full opacity-10 ${isSelected ? 'bg-blue-600' : 'bg-slate-400'}`}
                                />
                            )}

                            <div className="relative flex justify-between items-center z-10">
                                <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {option.text}
                                </span>
                                {!!userVoteId && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">{percent}%</span>
                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}

                <div className="text-xs text-slate-400 text-right pt-1">
                    {totalVotes} votes total
                </div>
            </div>
        </div>
    );
}
