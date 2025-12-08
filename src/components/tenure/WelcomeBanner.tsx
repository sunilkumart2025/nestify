import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type BannerType = 'WELCOME' | 'DAILY' | null;

export function WelcomeBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [bannerType, setBannerType] = useState<BannerType>(null);

    useEffect(() => {
        checkBannerStatus();
    }, []);

    const checkBannerStatus = () => {
        // 1. Priority: Welcome Banner (Once per lifetime)
        const hasSeenWelcome = localStorage.getItem('nestify_welcome_seen');

        if (!hasSeenWelcome) {
            setBannerType('WELCOME');
            setIsVisible(true);
            return;
        }

        // 2. Secondary: Daily/Promo Banner (Once per session)
        const hasSeenDaily = sessionStorage.getItem('nestify_daily_banner_seen');

        if (!hasSeenDaily) {
            setBannerType('DAILY');
            setIsVisible(true);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        if (bannerType === 'WELCOME') {
            localStorage.setItem('nestify_welcome_seen', 'true');
        } else if (bannerType === 'DAILY') {
            sessionStorage.setItem('nestify_daily_banner_seen', 'true');
        }
    };

    if (!isVisible || !bannerType) return null;

    const bannerConfig = {
        WELCOME: {
            image: '/welcome-banner.jpg',
            fallback: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80',
            title: 'Welcome Back!',
            text: 'Check your dashboard for new updates and announcements.',
            link: null,
            buttonText: null
        },
        DAILY: {
            image: '/promo-banner.jpg',
            fallback: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
            title: '', // Removed as requested
            text: '',  // Removed as requested
            link: 'http://localhost:5173/',
            buttonText: 'Visit Offer'
        }
    };

    const currentBanner = bannerConfig[bannerType];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* 16:9 Image Container */}
                <div className="aspect-video w-full relative bg-slate-100 group">
                    <img
                        src={currentBanner.image}
                        alt="Banner"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = currentBanner.fallback;
                        }}
                    />

                    {/* Overlay Content */}
                    {(currentBanner.title || currentBanner.link) && (
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white flex flex-col items-start gap-4">
                            {currentBanner.title && (
                                <div>
                                    <h2 className="text-3xl font-bold mb-2">{currentBanner.title}</h2>
                                    <p className="text-lg opacity-90">{currentBanner.text}</p>
                                </div>
                            )}

                            {currentBanner.link && (
                                <a
                                    href={currentBanner.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleDismiss}
                                    className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors shadow-lg transform hover:scale-105 active:scale-95"
                                >
                                    {currentBanner.buttonText || 'Learn More'}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
