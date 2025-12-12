import { Calendar, Megaphone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import type { CommunityPost } from '../../types/community';

interface PostCardProps {
    post: CommunityPost;
}

export function PostCard({ post }: PostCardProps) {
    const isEvent = post.type === 'event';
    const icon = isEvent ? <Calendar className="h-5 w-5 text-indigo-600" /> : <Megaphone className="h-5 w-5 text-orange-600" />;
    const bgClass = isEvent ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100';

    return (
        <div className={`p-5 rounded-xl border ${bgClass} shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full bg-white shadow-sm shrink-0`}>
                    {icon}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1 block">
                                {post.type}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                {post.title}
                            </h3>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                            {format(new Date(post.created_at), 'MMM d')}
                        </span>
                    </div>

                    {post.content && (
                        <p className="text-slate-600 text-sm leading-relaxed">
                            {post.content}
                        </p>
                    )}

                    {isEvent && post.event_date && (
                        <div className="flex items-center gap-2 mt-3 text-sm font-medium text-indigo-700 bg-white/60 px-3 py-2 rounded-lg inline-flex">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(post.event_date), 'EEEE, MMMM do @ h:mm a')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
