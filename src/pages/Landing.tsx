import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import {
    Shield, CreditCard, Users, ArrowRight, CheckCircle2, Building2, Play,
    Zap, BarChart3, Lock, Smartphone, Globe, Star, ChevronDown, ChevronUp,
    Menu, X, MoveRight, Receipt, MessageSquare, AlertCircle, FileCheck, Server,
    Megaphone, Calendar
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

// --- Visual Components ---

const LogoTicker = () => (
    <div className="w-full py-12 bg-white border-y border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Powering 500+ Premium Properties</p>
        </div>
        <div className="relative flex overflow-x-hidden group">
            <div className="animate-marquee whitespace-nowrap flex items-center space-x-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                {['Stanza Living', 'Zolo Stays', 'Oxford Hostels', 'Elite Livings', 'Campus Ville', 'Urban Nest', 'Student Housing Co', 'Metro Dorms'].map((logo, i) => (
                    <span key={i} className="text-3xl font-black font-sans text-slate-900 px-4">{logo}</span>
                ))}
                {['Stanza Living', 'Zolo Stays', 'Oxford Hostels', 'Elite Livings', 'Campus Ville', 'Urban Nest', 'Student Housing Co', 'Metro Dorms'].map((logo, i) => (
                    <span key={`dup-${i}`} className="text-3xl font-black font-sans text-slate-900 px-4">{logo}</span>
                ))}
            </div>
            <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-white to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-white to-transparent pointer-events-none" />
        </div>
    </div>
);

const ComparisonSection = () => (
    <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Stop managing your hostel on WhatsApp</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Manual tracking leads to lost revenue and frustrated tenants. Upgrade to a system built for scale.
                </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Old Way */}
                <div className="bg-red-50 p-8 rounded-3xl border border-red-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl text-red-900 rotate-12 select-none">X</div>
                    <h3 className="text-2xl font-bold text-red-900 mb-6">The Old Way</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start text-red-800">
                            <X className="w-5 h-5 mr-3 mt-1 shrink-0" />
                            <span>Chasing payments via random WhatsApp messages</span>
                        </li>
                        <li className="flex items-start text-red-800">
                            <X className="w-5 h-5 mr-3 mt-1 shrink-0" />
                            <span>Lost excel sheets and calculation errors</span>
                        </li>
                        <li className="flex items-start text-red-800">
                            <X className="w-5 h-5 mr-3 mt-1 shrink-0" />
                            <span>Tenants calling at midnight for complaints</span>
                        </li>
                        <li className="flex items-start text-red-800">
                            <X className="w-5 h-5 mr-3 mt-1 shrink-0" />
                            <span>No visibility into monthly profits</span>
                        </li>
                    </ul>
                </div>

                {/* Nestify Way */}
                <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl relative overflow-hidden group transform md:scale-105 z-10">
                    <div className="absolute top-0 right-0 p-4 bg-blue-600 text-white text-xs font-bold rounded-bl-2xl">RECOMMENDED</div>
                    <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-9xl text-blue-900 rotate-12 select-none">✓</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        The Nestify Way <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex items-start text-slate-700">
                            <CheckCircle2 className="w-5 h-5 mr-3 mt-1 text-green-500 shrink-0" />
                            <span>Automated reminders & payment links</span>
                        </li>
                        <li className="flex items-start text-slate-700">
                            <CheckCircle2 className="w-5 h-5 mr-3 mt-1 text-green-500 shrink-0" />
                            <span>Centralized dashboard for all data</span>
                        </li>
                        <li className="flex items-start text-slate-700">
                            <CheckCircle2 className="w-5 h-5 mr-3 mt-1 text-green-500 shrink-0" />
                            <span>Digital complaint ticketing system</span>
                        </li>
                        <li className="flex items-start text-slate-700">
                            <CheckCircle2 className="w-5 h-5 mr-3 mt-1 text-green-500 shrink-0" />
                            <span>Real-time financial analytics</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
);

const FeatureDeepDiveOne = () => (
    <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Text */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold mb-6">
                        <MessageSquare className="w-4 h-4" /> Smart Communication
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        "Hey, your rent is due." <br />
                        <span className="text-slate-400">Sent automatically.</span>
                    </h2>
                    <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                        Nestify integrates directly with Twilio & WhatsApp Business API. The system detects due dates, generates a personalized invoice link, and sends it to your tenant's phone.
                    </p>
                    <ul className="space-y-4 mb-8">
                        {['Customizable message templates', 'Direct payment links', 'Read receipts tracking'].map((item, i) => (
                            <li key={i} className="flex items-center text-slate-700 font-medium">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 text-green-600 text-xs">✓</div>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <button className="text-blue-600 font-bold flex items-center group">
                        Learn about automation <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Visual */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative"
                >
                    {/* Phone UI with Glow */}
                    <div className="relative z-10 mx-auto w-72 bg-slate-900 rounded-[3rem] p-3 border-4 border-slate-800 shadow-2xl">
                        <div className="h-full w-full bg-white rounded-[2.5rem] overflow-hidden">
                            <div className="bg-emerald-600 p-4 pt-10 text-white font-bold text-center">WhatsApp</div>
                            <div className="p-4 space-y-4 bg-emerald-50 h-full">
                                <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm text-xs text-slate-600">
                                    Hi Sunil, your rent invoice #INV-2045 is generated. Pay now: link/xY8z
                                </div>
                                <div className="bg-green-100 p-3 rounded-lg rounded-tr-none shadow-sm text-xs text-slate-600 ml-auto w-32 text-center">
                                    Paid via UPI ✅
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-200/50 rounded-full blur-3xl -z-10" />
                </motion.div>
            </div>
        </div>
    </section>
);

const CommunityFeature = () => (
    <section className="py-24 bg-indigo-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
                <div className="inline-block p-3 bg-indigo-800 rounded-full mb-6 border border-indigo-700">
                    <Users className="w-6 h-6 text-indigo-300" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Build a Thriving Community</h2>
                <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
                    More than just billing. Nestify connects you with your tenants through events, polls, and announcements.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    { title: "Digital Notice Board", desc: "Post announcements instantly. No more paper notices on walls.", icon: <Megaphone /> },
                    { title: "Events & Gatherings", desc: "Organize festivals, pizza nights, or meetings with RSVP tracking.", icon: <Calendar /> },
                    { title: "Live Polls", desc: "Ask tenants: 'New Wifi Plan?' or 'Sunday Lunch Menu?'. Get feedback.", icon: <BarChart3 /> },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-8 bg-indigo-800/50 backdrop-blur-sm rounded-2xl border border-indigo-700/50 hover:bg-indigo-800 hover:border-indigo-500 transition-all group"
                    >
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform">
                            {item.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                        <p className="text-indigo-200 leading-relaxed">{item.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);

const FeatureDeepDiveTwo = () => (
    <section className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                {/* Visual (Left this time) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative order-2 lg:order-1"
                >
                    <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative z-10">
                        {/* Fake Dashboard UI */}
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-lg font-bold">Maintenance Tickets</h4>
                            <div className="px-3 py-1 bg-blue-600 rounded-full text-xs font-bold">New: 3</div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { title: "AC Not Cooling", room: "302", status: "Pending", color: "bg-yellow-500" },
                                { title: "Tap Leaking", room: "105", status: "In Progress", color: "bg-blue-500" },
                                { title: "WiFi Issue", room: "201", status: "Resolved", color: "bg-green-500" }
                            ].map((ticket, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-12 rounded-full ${ticket.color}`} />
                                        <div>
                                            <div className="font-bold text-slate-200">{ticket.title}</div>
                                            <div className="text-xs text-slate-500">Room {ticket.room}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">{ticket.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500 rounded-full blur-2xl opacity-20" />
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20" />
                </motion.div>

                {/* Text */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="order-1 lg:order-2"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 text-blue-300 text-sm font-semibold mb-6 border border-blue-500/20">
                        <AlertCircle className="w-4 h-4" /> Issue Resolution
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        From "It's Broken" to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">"Fixed" in Record Time.</span>
                    </h2>
                    <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                        Tenants report issues via the app. You get notified instantly. Assign tasks to staff and track progress in real-time. No more lost sticky notes.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-3xl font-bold text-white mb-1">40%</div>
                            <div className="text-sm text-slate-400">Faster Resolution</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-3xl font-bold text-white mb-1">5/5</div>
                            <div className="text-sm text-slate-400">Tenant Satisfaction</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    </section>
);

const SecuritySection = () => (
    <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block p-3 bg-slate-100 rounded-full mb-6">
                <Shield className="w-8 h-8 text-slate-700" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Bank-Grade Security Standard</h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-12">We take your data seriously. Nestify is built with enterprise-grade security protocols.</p>

            <div className="grid md:grid-cols-4 gap-8">
                {[
                    { title: "SSL Encryption", desc: "256-bit AES encryption for all data in transit.", icon: <Lock /> },
                    { title: "Daily Backups", desc: "Automated backups to prevent data loss.", icon: <Server /> },
                    { title: "Role Access", desc: "Strict permission controls for admins & staff.", icon: <Users /> },
                    { title: "Secure Payments", desc: "PCI-DSS compliant gateway integrations.", icon: <CreditCard /> },
                ].map((item, i) => (
                    <div key={i} className="p-6 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-700">
                            {item.icon}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const TestimonialWall = () => (
    <section className="py-32 bg-slate-900 overflow-hidden">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Loved by 10,000+ Users</h2>
            <div className="flex justify-center gap-1 text-yellow-400">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="fill-current w-5 h-5" />)}
            </div>
        </div>

        {/* Infinite Scroll Rows */}
        <div className="space-y-8">
            {/* Row 1: Left */}
            <div className="flex space-x-6 animate-marquee">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="w-80 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm shrink-0">
                        <p className="text-slate-300 text-sm italic mb-4">"Nestify completely changed how we run our PG. The billing automation alone saves me 2 days of work."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700" />
                            <div>
                                <div className="font-bold text-white text-sm">Rohan Mehta</div>
                                <div className="text-xs text-slate-500">Owner, Stanza House</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Row 2: Right */}
            <div className="flex space-x-6 animate-marquee-reverse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="w-80 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm shrink-0">
                        <p className="text-slate-300 text-sm italic mb-4">"The mobile app for tenants is brilliant. They can see their dues and pay instantly. No more arguments."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-900 rounded-full" />
                            <div>
                                <div className="font-bold text-white text-sm">Priya Sharma</div>
                                <div className="text-xs text-slate-500">Manager, Girls Hostel Grid</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FaqSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    return (
        <section className="py-24 bg-white">
            <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {[
                        { q: "Can I migrate my existing tenant data?", a: "Yes! We provide a bulk Excel upload feature to import all your tenants, rooms, and balances in one go." },
                        { q: "Is WhatsApp integration included?", a: "Yes, automated reminders via WhatsApp are part of the core platform." },
                        { q: "How long does setup take?", a: "Most users are up and running within 15 minutes. Create rooms, add tenants, done." },
                        { q: "Do you support multiple buildings?", a: "Absolutely. You can manage unlimited buildings from a single Super Admin account." },
                        { q: "Is my data safe?", a: "We use bank-grade AES-256 encryption. Your data is backed up daily and you can export it anytime." }
                    ].map((item, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex justify-between items-center p-5 text-left font-bold text-slate-900 hover:bg-slate-50"
                            >
                                {item.q}
                                {openIndex === i ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </button>
                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-5 pt-0 text-slate-600 leading-relaxed bg-slate-50/50">
                                            {item.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const RoiCalculator = () => {
    const [rooms, setRooms] = useState(50);
    const rent = 8000;
    const leakagePercent = 0.05; // 5% manual error/leakage usually
    const annualSavings = Math.floor((rooms * rent * leakagePercent * 12) + (rooms * 200 * 12));

    return (
        <section className="py-24 bg-blue-50 border-y border-blue-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10" />

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs mb-4">ROI CALCULATOR</div>
                            <h3 className="text-3xl font-bold text-slate-900 mb-4">How much are you losing?</h3>
                            <p className="text-slate-600 mb-8">Manual billing leads to "leakage" — missed payments, forgotten late fees, and calculation errors. See what Nestify can save you.</p>

                            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="flex justify-between text-sm font-bold text-slate-700 mb-4">
                                    <span>Number of Rooms</span>
                                    <span className="text-blue-600 text-xl">{rooms}</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="500"
                                    step="10"
                                    value={rooms}
                                    onChange={(e) => setRooms(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                            <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Potential Annual Savings</div>
                            <div className="text-5xl font-extrabold text-green-400 mb-2 tracking-tight">
                                ₹{(annualSavings / 100000).toFixed(1)} Lakhs
                            </div>
                            <p className="text-xs text-slate-500 mb-6">Based on 5% revenue recovery & 200hrs admin time saved.</p>
                            <Link to="/signup-admin" className="inline-flex w-full justify-center px-6 py-3 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
                                Start Your Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- Main Page ---

export function Landing() {
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 500], [0, 150]);
    const [isDemoOpen, setIsDemoOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-blue-500/20">
            <Navbar />

            {/* HERO */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold mb-8 hover:bg-slate-100 transition-colors cursor-pointer">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                v2.0 is Live: WhatsApp Automation
                            </div>
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
                                The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Modern Hostels</span>
                            </h1>
                            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
                                Nestify replaces your messy spreadsheets with a powerful, automated platform. Collect rent faster, manage complaints, and delight your tenants.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/signup-admin"
                                    className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center group"
                                >
                                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <button
                                    onClick={() => setIsDemoOpen(true)}
                                    className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-bold text-lg transition-all flex items-center justify-center group"
                                >
                                    <Play className="w-5 h-5 mr-2 text-slate-400 fill-current group-hover:text-blue-500 transition-colors" /> View Demo
                                </button>
                            </div>
                            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
                                <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> No credit card needed</span>
                                <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> 14-day free trial</span>
                            </div>
                        </motion.div>

                        {/* 3D Dashboard Mockup */}
                        <motion.div
                            style={{ y: heroY }}
                            initial={{ opacity: 0, rotateX: 20, rotateY: -20, scale: 0.9 }}
                            animate={{ opacity: 1, rotateX: 10, rotateY: -10, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="relative hidden lg:block perspective-1000"
                        >
                            <div className="relative z-10 bg-slate-950 rounded-2xl shadow-2xl p-2 border border-slate-800 transform rotate-y-12 rotate-x-6 hover:rotate-y-0 transition-transform duration-700 ease-out preserve-3d">
                                {/* Fake UI Header */}
                                <div className="h-8 bg-slate-900 rounded-t-xl flex items-center px-4 gap-2 mb-2 border-b border-slate-800">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                {/* Content Area */}
                                <div className="bg-slate-950 rounded-b-xl p-6 h-[400px] grid grid-cols-12 gap-4">
                                    {/* Sidebar */}
                                    <div className="col-span-3 bg-slate-900/30 rounded-lg p-4 space-y-3 border border-slate-800/50">
                                        <div className="h-2 w-20 bg-slate-800 rounded mb-6" />
                                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-full bg-slate-800/30 rounded-lg" />)}
                                    </div>
                                    {/* Main */}
                                    <div className="col-span-9 space-y-4">
                                        {/* Top Stats */}
                                        <div className="grid grid-cols-3 gap-4">
                                            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                                                <div className="h-8 w-8 rounded-full bg-blue-500/10 mb-2" />
                                                <div className="h-4 w-16 bg-slate-800 rounded" />
                                            </div>)}
                                        </div>
                                        {/* Chart Area */}
                                        <div className="h-48 bg-slate-900/50 rounded-xl border border-slate-800 relative overflow-hidden flex items-end justify-between px-6 pb-4 gap-2">
                                            {[40, 60, 45, 70, 50, 80, 65, 85, 90, 75, 80, 95].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}%` }}
                                                    transition={{ delay: 1 + (i * 0.1), duration: 0.5 }}
                                                    className="w-full bg-gradient-to-t from-blue-600/50 to-blue-400/50 rounded-t-sm"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Floating Badge */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4 }}
                                    className="absolute -right-12 -bottom-12 bg-white p-4 rounded-xl shadow-2xl border border-slate-100 text-slate-900 z-20"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-lg">
                                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 font-bold uppercase">Revenue Collected</div>
                                            <div className="text-xl font-bold font-mono">₹1,24,000</div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                            {/* Glow */}
                            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] -z-10 rounded-full transform translate-y-12" />
                        </motion.div>
                    </div>
                </div>
            </section>

            <LogoTicker />

            <ComparisonSection />

            <FeatureDeepDiveOne />
            <CommunityFeature />
            <FeatureDeepDiveTwo />

            <SecuritySection />

            <RoiCalculator />

            <TestimonialWall />

            <FaqSection />

            {/* CTA */}
            <section className="py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/30 to-transparent" />

                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Ready to upgrade your property?</h2>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Join the new generation of property managers who are saving time and boosting profits.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/signup-admin" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition-all shadow-lg shadow-blue-900/50">
                            Start Free Trial
                        </Link>
                        <Link to="/contact" className="px-8 py-4 bg-transparent border border-slate-700 hover:bg-white/5 text-white rounded-full font-bold text-lg transition-all">
                            Talk to Sales
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 pt-20 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center space-x-2 mb-6">
                                <Building2 className="w-8 h-8 text-white" />
                                <span className="text-2xl font-bold text-white">Nestify</span>
                            </div>
                            <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">
                                The #1 Hostel Management Platform in India. Built for speed, security, and scale.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Features</Link></li>
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Integrations</Link></li>
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Updates</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">About</Link></li>
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Blog</Link></li>
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Careers</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Privacy</Link></li>
                                <li><Link to="#" className="hover:text-blue-400 transition-colors">Terms</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-900 flex justify-between items-center">
                        <span className="text-sm text-slate-600">© 2025 Nestify Inc. All rights reserved.</span>
                        <div className="flex gap-4">
                            {/* Social Icons Placeholder */}
                            <div className="w-6 h-6 bg-slate-800 rounded-full" />
                            <div className="w-6 h-6 bg-slate-800 rounded-full" />
                            <div className="w-6 h-6 bg-slate-800 rounded-full" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
