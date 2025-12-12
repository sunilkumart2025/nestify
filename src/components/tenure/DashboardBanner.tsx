import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Building2, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DashboardBannerProps {
    adminDetails: {
        hostel_name: string;
        hostel_address: string;
        phone: string;
        email: string;
    } | null;
}

const SLIDES = [
    {
        id: 1,
        desktop: "/welcome-banner-pc.jpg",
        mobile: "/welcome-banner.jpg",
        title: "Welcome Home",
        subtitle: "Experience modern living",
        icon: Building2,
        action: "Call",
        isContact: true
    },
    {
        id: 2,
        desktop: "/promo-banner-pc.jpg",
        mobile: "/promo-banner.jpg",
        title: "Join the Community",
        subtitle: "Events, friends & more",
        icon: Users,
        action: "Learn More",
        isContact: false,
        link: "https://www.nestify.com"
    }
];

export function DashboardBanner({ adminDetails }: DashboardBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (!isVisible) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isVisible]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % SLIDES.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

    // If dismissed or no admin details (though robust fallback exists), handle gracefully
    if (!isVisible) return null;

    // Fallback data if adminDetails is missing
    const hostelName = adminDetails?.hostel_name || "Nestify";
    const hostelAddress = adminDetails?.hostel_address || "Welcome to your new home";
    const phone = adminDetails?.phone || "";
    const email = adminDetails?.email || "";

    const currentSlide = SLIDES[currentIndex];

    // Dynamic Content based on slide
    const slideTitle = currentSlide.isContact ? hostelName : currentSlide.title;
    const slideSubtitle = currentSlide.isContact ? hostelAddress : currentSlide.subtitle;

    const handleActionClick = () => {
        if (currentSlide.link) {
            window.open(currentSlide.link, '_blank');
        }
    };

    return (
        <div className="relative rounded-2xl overflow-hidden shadow-xl group h-[500px] md:h-[450px] bg-slate-200">
            {/* Carousel Images - Render ALL slides but change opacity for transition */}
            {SLIDES.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    {/* Desktop Image (16:9) */}
                    <div
                        className="hidden md:block w-full h-full bg-cover bg-center transition-transform duration-[5000ms] hover:scale-105"
                        style={{ backgroundImage: `url(${slide.desktop})` }}
                    />
                    {/* Mobile Image (9:16) */}
                    <div
                        className="block md:hidden w-full h-full bg-cover bg-center transition-transform duration-[5000ms] hover:scale-105"
                        style={{ backgroundImage: `url(${slide.mobile})` }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent md:bg-gradient-to-r md:from-slate-900/80 md:via-transparent" />
                </div>
            ))}

            {/* Content Layer (Always on top Z-20) - LEFT ALIGNED based on request ("Learn More in left bottom") */}
            <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-8 md:p-12 z-20 pointer-events-none">
                <div className="max-w-2xl space-y-4 pointer-events-auto">
                    <div className="flex items-center space-x-2 text-white/90 text-sm font-bold uppercase tracking-wider backdrop-blur-md bg-white/10 w-fit px-3 py-1 rounded-full border border-white/20">
                        <currentSlide.icon className="w-4 h-4" />
                        <span>{currentSlide.isContact ? "Your Residence" : "Promo"}</span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight transition-all duration-500">
                        {slideTitle}
                    </h2>

                    <div className="flex items-start text-slate-200">
                        {currentSlide.isContact && <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 mr-2 text-secondary" />}
                        <p className="max-w-md drop-shadow-md font-medium text-lg">
                            {slideSubtitle}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row gap-3 pt-6">
                        {currentSlide.isContact ? (
                            <>
                                {phone && (
                                    <a
                                        href={`tel:${phone}`}
                                        className="flex items-center space-x-2 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3.5 rounded-xl transition-all shadow-lg font-bold active:scale-95"
                                    >
                                        <Phone className="w-4 h-4" />
                                        <span>Call</span>
                                    </a>
                                )}
                                {email && (
                                    <a
                                        href={`mailto:${email}`}
                                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white px-6 py-3.5 rounded-xl transition-all font-medium active:scale-95"
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span>Email</span>
                                    </a>
                                )}
                            </>
                        ) : (
                            <button
                                onClick={handleActionClick}
                                className="flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-500 px-6 py-3.5 rounded-xl transition-all shadow-lg font-bold active:scale-95"
                            >
                                <span>{currentSlide.action}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Close Button (Top Right) */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-90"
                aria-label="Close Banner"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Navigation Dots */}
            <div className="absolute bottom-6 right-6 md:right-auto md:left-12 z-30 flex space-x-2">
                {SLIDES.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'
                            }`}
                    />
                ))}
            </div>

            {/* Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-30"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hidden md:flex z-30"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}
