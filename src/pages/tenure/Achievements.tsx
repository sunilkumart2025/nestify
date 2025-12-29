import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, Zap, Flame, Smartphone, Heart, Lock } from 'lucide-react';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'payment' | 'profile' | 'community' | 'special';
    color: string;
    points: number;
    awarded_at?: string; // If null, it's locked
}

interface UserScore {
    total_points: number;
    current_rank: string;
    badge_count: number;
}

export function Achievements() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [score, setScore] = useState<UserScore>({ total_points: 0, current_rank: 'Rookie', badge_count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAchievements();
    }, []);

    const loadAchievements = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch User Score (from View)
            const { data: scoreData } = await supabase
                .from('user_scores')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (scoreData) {
                setScore({
                    total_points: scoreData.total_points,
                    current_rank: scoreData.current_rank,
                    badge_count: scoreData.badge_count
                });
            }

            // 2. Fetch All Badges + User Status
            const { data: allBadges } = await supabase.from('badges').select('*').order('points', { ascending: true });
            const { data: userBadges } = await supabase.from('user_badges').select('badge_id, awarded_at').eq('user_id', user.id);

            const userBadgeMap = new Map(userBadges?.map(ub => [ub.badge_id, ub.awarded_at]));

            const mergedBadges = allBadges?.map(b => ({
                ...b,
                awarded_at: userBadgeMap.get(b.id) // undefined if not earned
            })) || [];

            setBadges(mergedBadges);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (iconName: string, className: string) => {
        switch (iconName) {
            case 'Zap': return <Zap className={className} />;
            case 'Flame': return <Flame className={className} />;
            case 'ShieldCheck': return <Shield className={className} />;
            case 'Smartphone': return <Smartphone className={className} />;
            case 'Heart': return <Heart className={className} />;
            default: return <Star className={className} />;
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Achievements...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header / Scorecard */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy size={140} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">NestPoints Rewards</h1>
                        <p className="opacity-90">Earn badges and points for being an awesome resident.</p>
                    </div>

                    <div className="flex gap-6 text-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                            <div className="text-2xl font-bold">{score.total_points}</div>
                            <div className="text-xs uppercase tracking-wider opacity-80">Points</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[120px]">
                            <div className="text-2xl font-bold text-yellow-300">{score.current_rank}</div>
                            <div className="text-xs uppercase tracking-wider opacity-80">Rank</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[100px]">
                            <div className="text-2xl font-bold">{score.badge_count}</div>
                            <div className="text-xs uppercase tracking-wider opacity-80">Badges</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2">
                <Star className="text-yellow-500" fill="currentColor" /> Your Collection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {badges.map((badge) => (
                    <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.02 }}
                        className={`relative rounded-xl border p-5 transition-all ${badge.awarded_at
                                ? 'bg-white border-indigo-100 shadow-sm'
                                : 'bg-gray-50 border-gray-100 opacity-60'
                            }`}
                    >
                        {/* Status Icon */}
                        <div className="absolute top-3 right-3">
                            {badge.awarded_at ? (
                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Unlocked</span>
                            ) : (
                                <Lock className="w-4 h-4 text-gray-400" />
                            )}
                        </div>

                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${badge.awarded_at ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-400'
                            }`}>
                            {getIcon(badge.icon, "w-6 h-6")}
                        </div>

                        <h3 className={`font-bold mb-1 ${badge.awarded_at ? 'text-gray-900' : 'text-gray-500'}`}>
                            {badge.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3 min-h-[40px]">{badge.description}</p>

                        <div className="flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                            +{badge.points} pts
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
