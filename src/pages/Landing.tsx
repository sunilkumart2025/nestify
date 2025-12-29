import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import {
    Shield, CreditCard, Users, ArrowRight, CheckCircle2, Building2, Play,
    Zap, BarChart3, Lock, Smartphone, Globe, Star, ChevronDown, ChevronUp,
    Menu, X, MoveRight, Receipt, MessageSquare, AlertCircle, FileCheck, Server,
    Megaphone, Calendar, Wallet, RefreshCw, Bell, Bot, Home, User, Wrench, Droplets,
    Brush, Clock, Database, Activity, Cloud
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { LeadCaptureModal } from '../components/LeadCaptureModal';

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

const AudienceSection = () => (
    <section className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs mb-6 uppercase tracking-wider">
                Who is Nestify For?
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-16">Built for people like you</h2>
            <div className="grid md:grid-cols-4 gap-8">
                {[
                    { title: "Single Hostel Owners", desc: "10–50 rooms", icon: <Building2 className="w-8 h-8 text-blue-600" /> },
                    { title: "Multi-Property Operators", desc: "100+ beds across cities", icon: <Globe className="w-8 h-8 text-purple-600" /> },
                    { title: "Managers & Wardens", desc: "Daily operations & staff", icon: <Users className="w-8 h-8 text-green-600" /> },
                    { title: "Modern Tenants", desc: "Payments & transparency", icon: <Smartphone className="w-8 h-8 text-orange-600" /> },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-all group cursor-default"
                    >
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                            {item.icon}
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-2">{item.title}</h3>
                        <p className="text-slate-500 font-medium">{item.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);

const OnboardingTimeline = () => (
    <section className="py-24 bg-slate-900 text-white overflow-hidden border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Your first 24 hours with Nestify</h2>
                <p className="text-slate-400 max-w-2xl mx-auto">Setup isn't a headache. It's a sprint.</p>
            </div>
            <div className="relative">
                {/* Connecting Line */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 z-0" />

                <div className="grid md:grid-cols-4 gap-8 relative z-10">
                    {[
                        { time: "5 min", title: "Create Property", desc: "Set up rooms & beds", color: "bg-blue-500" },
                        { time: "10 min", title: "Import Tenants", desc: "Bulk upload via Excel", color: "bg-purple-500" },
                        { time: "2 min", title: "Connect WhatsApp", desc: "Scan QR code", color: "bg-green-500" },
                        { time: "Same Day", title: "Collect Rent", desc: "First payment received", color: "bg-yellow-500 text-slate-900" },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center hover:border-slate-600 transition-colors"
                        >
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${item.color} shadow-lg`}>
                                {item.time}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                            <p className="text-slate-400 text-sm">{item.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

const ComparisonSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
    };

    return (
        <section ref={ref} className="py-24 bg-slate-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Stop managing your hostel on WhatsApp</h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Manual tracking leads to lost revenue and frustrated tenants. Upgrade to a system built for scale.
                    </p>
                </motion.div>
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Old Way */}
                    <motion.div
                        initial={{ opacity: 0, x: -50, rotateY: -5 }}
                        animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="bg-red-50 p-8 rounded-3xl border border-red-100 relative overflow-hidden group hover:shadow-lg transition-shadow"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-9xl text-red-900 rotate-12 select-none">X</div>
                        <h3 className="text-2xl font-bold text-red-900 mb-6">The Old Way</h3>
                        <motion.ul
                            className="space-y-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                        >
                            {[
                                "Chasing payments via random WhatsApp messages",
                                "Lost excel sheets and calculation errors",
                                "Tenants calling at midnight for complaints",
                                "No visibility into monthly profits"
                            ].map((item, i) => (
                                <motion.li key={i} variants={itemVariants} className="flex items-start text-red-800">
                                    <X className="w-5 h-5 mr-3 mt-1 shrink-0" />
                                    <span>{item}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </motion.div>

                    {/* Nestify Way */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, rotateY: 5 }}
                        animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
                        className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl relative overflow-hidden group transform md:scale-105 z-10"
                    >
                        <motion.div
                            initial={{ x: 100 }}
                            animate={isInView ? { x: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            className="absolute top-0 right-0 p-4 bg-blue-600 text-white text-xs font-bold rounded-bl-2xl"
                        >
                            RECOMMENDED
                        </motion.div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-9xl text-blue-900 rotate-12 select-none">✓</div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            The Nestify Way <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}><Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" /></motion.span>
                        </h3>
                        <motion.ul
                            className="space-y-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate={isInView ? "visible" : "hidden"}
                        >
                            {[
                                "Automated reminders & payment links",
                                "Centralized dashboard for all data",
                                "Digital complaint ticketing system",
                                "Real-time financial analytics"
                            ].map((item, i) => (
                                <motion.li key={i} variants={itemVariants} className="flex items-start text-slate-700">
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={isInView ? { scale: 1 } : {}}
                                        transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                                    >
                                        <CheckCircle2 className="w-5 h-5 mr-3 mt-1 text-green-500 shrink-0" />
                                    </motion.span>
                                    <span>{item}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

const TenantExperience = () => (
    <section className="py-24 bg-white overflow-hidden border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="relative order-2 lg:order-1"
                >
                    <div className="bg-slate-900 rounded-[2.5rem] p-4 border-[8px] border-slate-800 shadow-2xl max-w-sm mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                        <div className="bg-slate-50 h-[600px] rounded-[2rem] overflow-hidden flex flex-col relative">
                            {/* App Header */}
                            <div className="bg-indigo-600 p-6 text-white pt-8">
                                <div className="text-xs opacity-70 uppercase tracking-wider mb-1">Welcome back</div>
                                <div className="font-bold text-xl">Sunil Kumar</div>
                            </div>
                            {/* App Content */}
                            <div className="p-4 space-y-4 flex-1 overflow-hidden bg-slate-50">
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="text-xs text-slate-400 font-bold uppercase mb-2">Current Due</div>
                                    <div className="text-3xl font-bold text-slate-900">₹0</div>
                                    <div className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Rent paid for October
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="font-bold text-slate-700">History</div>
                                    </div>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex justify-between text-sm py-3 border-b border-slate-50 last:border-0 items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                                                <span className="text-slate-600 font-medium">Rent Payment</span>
                                            </div>
                                            <span className="font-mono font-bold text-slate-900">-₹8,500</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold">!</div>
                                    <div>
                                        <div className="text-sm font-bold text-orange-900">Ticket #204</div>
                                        <div className="text-xs text-orange-700">Fan repair scheduled</div>
                                    </div>
                                </div>
                            </div>
                            {/* Bottom Nav */}
                            <div className="bg-white border-t border-slate-200 p-4 flex justify-around">
                                <div className="w-6 h-6 bg-indigo-600 rounded-full"></div>
                                <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                                <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="order-1 lg:order-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs mb-6 uppercase tracking-wider">
                        Tenant App
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">What your tenants see</h2>
                    <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                        Give them a professional app to pay rent, view history, and raise complaints. No more endless WhatsApp chats or "I paid you cash yesterday" arguments.
                    </p>
                    <div className="p-6 bg-green-50 rounded-2xl border border-green-100 mb-8">
                        <h4 className="font-bold text-green-900 mb-2">The Nestify Promise</h4>
                        <p className="text-green-800 font-medium italic">"Happy tenants = fewer calls, fewer fights, faster payments."</p>
                    </div>
                    <ul className="space-y-4">
                        {['Instant Payment Receipts', 'Transparent Ledger History', 'Status of Complaints'].map((item, i) => (
                            <li key={i} className="flex items-center text-slate-700 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" /> {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </section>
);

const IndianContext = () => (
    <section className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-orange-50 via-white to-green-50 rounded-[3rem] p-12 border border-slate-100 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-white to-green-500 opacity-50" />

                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Built for Indian Operations 🇮🇳</h2>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12">
                    Not a foreign tool adapted for India. <span className="font-bold text-slate-900">Built in India, for India.</span>
                </p>

                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {[
                        { title: "UPI First", desc: "Integrates with PhonePe, GPay & Paytm.", icon: "₹" },
                        { title: "WhatsApp First", desc: "We know Indian tenants live on WhatsApp.", icon: "💬" },
                        { title: "Hostel Culture", desc: "Designed for PGs, Co-living & Hostels.", icon: "🏠" },
                    ].map((item, i) => (
                        <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:scale-105 transition-transform">
                            <div className="text-4xl mb-4">{item.icon}</div>
                            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                            <p className="text-slate-500 text-sm">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

const FounderStory = () => (
    <section className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">Why Nestify Exists</h2>
            <div className="relative">
                <span className="text-9xl text-slate-200 absolute -top-16 -left-10 font-serif leading-none opacity-50">"</span>
                <p className="text-2xl text-slate-700 font-medium leading-relaxed relative z-10">
                    Nestify was built because managing hostels on WhatsApp and Excel was <span className="text-red-500 bg-red-50 px-2 rounded">chaotic</span>, stressful, and unfair to both owners and tenants. We wanted to bring transparency and peace of mind to the industry.
                </p>
                <div className="mt-8 text-sm font-bold text-slate-400 uppercase tracking-widest">— Team Nestify</div>
            </div>
        </div>
    </section>
);

const ScalabilityPath = () => (
    <section className="py-24 bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-900/50 text-blue-300 font-bold text-xs mb-6 uppercase tracking-wider border border-blue-500/20">
                Future Proof
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Start small. Grow big.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-16">
                Nestify scales as you scale. Upgrade seamlessly as your empire grows.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative">
                {/* Line */}
                <div className="hidden md:block absolute top-[28px] left-10 right-10 h-0.5 bg-slate-700 -z-0"></div>

                {[
                    { step: 1, title: "1 Hostel", desc: "Basic Rent Collection" },
                    { step: 2, title: "Multiple Buildings", desc: "Centralized Dashboard" },
                    { step: 3, title: "Add Staff", desc: "Role Management" },
                    { step: 4, title: "Add Analytics", desc: "Revenue Optimization" },
                    { step: 5, title: "Full Automation", desc: "Autopilot Mode" },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        className="bg-slate-950 p-6 rounded-2xl border border-slate-800 w-full md:w-48 relative z-10 hover:border-blue-500 transition-colors group"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center font-bold text-lg mb-4 mx-auto group-hover:bg-blue-600 transition-colors">
                            {item.step}
                        </div>
                        <h3 className="font-bold text-white mb-1">{item.title}</h3>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);

const AntiFeatures = () => (
    <section className="py-24 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-12">What Nestify will <span className="text-red-600">NEVER</span> do</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
                {[
                    { title: "Spam your tenants", desc: "We never send ads or irrelevant messages to your residents." },
                    { title: "Lock your data", desc: "Export your tenant list and payment history anytime. It's yours." },
                    { title: "Force unnecessary features", desc: "Turn off modules you don't need. Keep it simple." },
                    { title: "Charge hidden fees", desc: "One flat subscription price. No surprises." },
                ].map((item, i) => (
                    <div key={i} className="flex items-start p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <X className="w-6 h-6 text-red-500 mr-4 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                            <p className="text-slate-500 mt-1">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

const FeatureDeepDiveOne = ({ onLearnMore }: { onLearnMore: () => void }) => (
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
                    <button onClick={onLearnMore} className="text-blue-600 font-bold flex items-center group">
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

const StickyCTA = () => (
    <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-50 hidden md:flex items-center gap-4 p-4 pr-6 bg-slate-900 rounded-full text-white shadow-2xl border border-slate-700 hover:scale-105 transition-transform cursor-pointer group"
    >
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
            <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div className="text-sm font-bold">
            Still managing rent manually? <span className="text-blue-400 group-hover:underline">Fix it in 15 mins</span>
        </div>
        <Link to="/signup-admin" className="absolute inset-0 w-full h-full" aria-label="Sign up"></Link>
    </motion.div>
);

const TICKER_ITEMS = [
    { text: "₹3,200 rent paid via UPI", icon: <Wallet className="w-4 h-4" /> },
    { text: "Rent payment completed — Room 204", icon: <CreditCard className="w-4 h-4" /> },
    { text: "Late fee auto-collected", icon: <Receipt className="w-4 h-4" /> },
    { text: "Invoice #INV-2481 paid successfully", icon: <FileCheck className="w-4 h-4" /> },
    { text: "Monthly rent cycle started", icon: <Calendar className="w-4 h-4" /> },
    { text: "Rent reminder sent on WhatsApp", icon: <MessageSquare className="w-4 h-4" /> },
    { text: "Payment link delivered to tenant", icon: <Bell className="w-4 h-4" /> },
    { text: "Read receipt received from tenant", icon: <CheckCircle2 className="w-4 h-4" /> },
    { text: "Auto-follow-up sent", icon: <Bot className="w-4 h-4" /> },
    { text: "WhatsApp reminder scheduled", icon: <Smartphone className="w-4 h-4" /> },
    { text: "New property onboarded — Chennai", icon: <Building2 className="w-4 h-4" /> },
    { text: "New tenant added — Room 312", icon: <User className="w-4 h-4" /> },
    { text: "Tenant room updated", icon: <Home className="w-4 h-4" /> },
    { text: "Second building linked", icon: <Building2 className="w-4 h-4" /> },
    { text: "AC issue resolved — Room 105", icon: <Wrench className="w-4 h-4" /> },
    { text: "Tap leakage ticket closed", icon: <Droplets className="w-4 h-4" /> },
    { text: "Housekeeping request completed", icon: <Brush className="w-4 h-4" /> },
    { text: "Maintenance task assigned", icon: <Clock className="w-4 h-4" /> },
    { text: "New complaint logged", icon: <AlertCircle className="w-4 h-4" /> },
    { text: "Announcement published", icon: <Megaphone className="w-4 h-4" /> },
    { text: "Monthly report generated", icon: <BarChart3 className="w-4 h-4" /> },
    { text: "Staff role updated", icon: <Shield className="w-4 h-4" /> },
    { text: "Secure login verified", icon: <Lock className="w-4 h-4" /> },
    { text: "Backup completed successfully", icon: <Database className="w-4 h-4" /> },
    { text: "System running smoothly", icon: <Activity className="w-4 h-4" /> },
    { text: "Secure UPI transaction verified", icon: <Shield className="w-4 h-4" /> },
    { text: "Revenue updated in dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { text: "Activity synced in real time", icon: <RefreshCw className="w-4 h-4" /> },
    { text: "Data backup completed", icon: <Cloud className="w-4 h-4" /> }
];

const LiveActivityTicker = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
        }, 3500); // 3.5s per item
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 h-[36px] overflow-hidden flex items-center justify-center relative z-40">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-center gap-3 text-sm font-medium text-slate-600"
                >
                    <span className="text-blue-600 flex items-center justify-center">{TICKER_ITEMS[index].icon}</span>
                    <span className="tracking-wide">{TICKER_ITEMS[index].text}</span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const TodayFeed = () => {
    const [index, setIndex] = useState(0);
    const feedItems = [
        { text: "Rent paid – Room 204 (UPI)", icon: "✅", time: "2m ago" },
        { text: "Complaint assigned – AC Issue", icon: "🕒", time: "5m ago" },
        { text: "Announcement posted – Water", icon: "📢", time: "12m ago" },
        { text: "New tenant onboarded", icon: "🏠", time: "1h ago" },
    ];

    // Auto-scroll effect
    // In a real app we'd use useEffect to cycle index

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="absolute -right-4 top-24 z-20 hidden lg:block"
        >
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 w-72">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today on Nestify</div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="space-y-3">
                    {feedItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm">
                                {item.icon}
                            </div>
                            <div>
                                <div className="font-bold text-slate-700">{item.text}</div>
                                <div className="text-xs text-slate-400">{item.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Page ---

export function Landing() {
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 500], [0, 150]);
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

    // Show lead capture modal after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLeadModalOpen(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-blue-500/20">
            <Navbar />

            {/* Live Activity Ticker (Top, underneath Navbar) */}
            <div className="pt-20"> {/* Offset for Fixed Navbar */}
                <LiveActivityTicker />
            </div>

            <StickyCTA />

            {/* Lead Capture Modal */}
            <LeadCaptureModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} />

            {/* Demo Modal */}
            <AnimatePresence>
                {isDemoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsDemoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">Nestify Platform Demo</h2>
                                        <p className="text-blue-100 mt-1">See how Nestify transforms hostel management</p>
                                    </div>
                                    <button
                                        onClick={() => setIsDemoOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Demo Content */}
                            <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                                {/* Video Player */}
                                <div className="bg-slate-900 rounded-2xl overflow-hidden mb-8 shadow-2xl">
                                    <video
                                        className="w-full aspect-video"
                                        controls
                                        autoPlay
                                        poster="/demo-thumbnail.jpg"
                                    >
                                        <source src="/demo.mp4" type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>

                                {/* Feature Highlights */}
                                <h3 className="text-xl font-bold text-slate-900 mb-6">Key Features Walkthrough</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        { icon: <Receipt className="w-5 h-5" />, title: "Automated Billing", desc: "Generate invoices & send payment links automatically every month." },
                                        { icon: <MessageSquare className="w-5 h-5" />, title: "WhatsApp Reminders", desc: "Send rent reminders directly to tenant's WhatsApp." },
                                        { icon: <Users className="w-5 h-5" />, title: "Tenant Management", desc: "Onboard, verify, and manage all tenants from one dashboard." },
                                        { icon: <BarChart3 className="w-5 h-5" />, title: "Analytics & Reports", desc: "Track occupancy, revenue, and payment trends in real-time." },
                                    ].map((feature, i) => (
                                        <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors border border-slate-100">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                {feature.icon}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{feature.title}</h4>
                                                <p className="text-sm text-slate-500 mt-1">{feature.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link
                                        to="/signup-admin"
                                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-center transition-colors"
                                        onClick={() => setIsDemoOpen(false)}
                                    >
                                        Start Free 14-Day Trial
                                    </Link>
                                    <Link
                                        to="/contact"
                                        className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-center transition-colors"
                                        onClick={() => setIsDemoOpen(false)}
                                    >
                                        Schedule Live Demo
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO */}
            <section className="relative pt-12 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-white">
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
                            <TodayFeed />

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

            <AudienceSection />
            <OnboardingTimeline />
            <ComparisonSection />
            <TenantExperience />

            <FeatureDeepDiveOne onLearnMore={() => setIsDemoOpen(true)} />
            <IndianContext />
            <CommunityFeature />
            <FounderStory />
            <FeatureDeepDiveTwo />

            <SecuritySection />
            <AntiFeatures />
            <ScalabilityPath />

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
                                The  Hostel Management Platform in India. Built for speed, security, and scale.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/features" className="hover:text-blue-400 transition-colors">Features</Link></li>
                                <li><Link to="/integrations" className="hover:text-blue-400 transition-colors">Integrations</Link></li>
                                <li><Link to="/updates" className="hover:text-blue-400 transition-colors">Updates</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/about" className="hover:text-blue-400 transition-colors">About</Link></li>
                                <li><Link to="/blog" className="hover:text-blue-400 transition-colors">Blog</Link></li>
                                <li><Link to="/careers" className="hover:text-blue-400 transition-colors">Careers</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6">Legal</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy</Link></li>
                                <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 mt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                        <span className="text-sm text-slate-500">
                            © 2025 Nestify. All rights reserved.
                        </span>

                        {/* Legal Links in Footer Bottom */}
                        <div className="flex items-center gap-6 text-sm">
                            <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</Link>
                            <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
                        </div>

                        <div className="flex items-center gap-4">

                            {/* LinkedIn */}
                            <a href="#" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-700 transition">
                                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                    <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7.5 0H12v2.2h.1c.6-1 2.1-2.2 4.4-2.2 4.7 0 5.5 3.1 5.5 7.1V24h-5V15.4c0-2.1 0-4.9-3-4.9-3 0-3.4 2.3-3.4 4.7V24h-5V8z" />
                                </svg>
                            </a>

                            {/* Instagram */}
                            <a href="#" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-700 transition">
                                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                    <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.4.6.6.3 1 .7 1.4 1.4.3.5.5 1.2.6 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.6 2.4-.3.6-.7 1-1.4 1.4-.5.3-1.2.5-2.4.6-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.4-.6-.6-.3-1-.7-1.4-1.4-.3-.5-.5-1.2-.6-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.6-2.4.3-.6.7-1 1.4-1.4.5-.3 1.2-.5 2.4-.6C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.4 0-4.6.1-1 .1-1.6.2-2 .4s-.7.5-.9.9c-.2.4-.4 1-.4 2-.1 1.2-.1 1.5-.1 4.6s0 3.4.1 4.6c.1 1 .2 1.6.4 2 .2.4.5.7.9.9.4.2 1 .4 2 .4 1.2.1 1.5.1 4.6.1s3.4 0 4.6-.1c1-.1 1.6-.2 2-.4.4-.2.7-.5.9-.9.2-.4.4-1 .4-2 .1-1.2.1-1.5.1-4.6s0-3.4-.1-4.6c-.1-1-.2-1.6-.4-2-.2-.4-.5-.7-.9-.9-.4-.2-1-.4-2-.4-1.2-.1-1.5-.1-4.6-.1zm0 3.3a4.7 4.7 0 110 9.4 4.7 4.7 0 010-9.4zm0 7.7a3 3 0 100-6 3 3 0 000 6zm5-8.5a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2z" />
                                </svg>
                            </a>

                            {/* YouTube */}
                            <a href="#" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-700 transition">
                                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                    <path d="M23.5 6.2s-.2-1.7-.9-2.4c-.8-.9-1.7-.9-2.1-1C17.3 2.5 12 2.5 12 2.5h-.1s-5.3 0-8.5.3c-.4.1-1.3.1-2.1 1C.7 4.5.5 6.2.5 6.2S0 8.1 0 10v1.9c0 1.9.5 3.8.5 3.8s.2 1.7.9 2.4c.8.9 1.8.9 2.2 1 1.6.2 6.4.3 8.4.3h.1c0 0 5.3 0 8.5-.3.4-.1 1.3-.1 2.1-1 .7-.7.9-2.4.9-2.4s.5-1.9.5-3.8V10c0-1.9-.5-3.8-.5-3.8zM9.7 14.6V8.8l5.8 2.9-5.8 2.9z" />
                                </svg>
                            </a>

                            {/* Mail */}
                            <a href="mailto:support@nestify.xyz" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-700 transition">
                                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                            </a>

                            {/* WhatsApp */}
                            <a href="#" className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-700 transition">
                                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                                    <path d="M20 3.9A10 10 0 003.5 17.7L2 22l4.5-1.4A10 10 0 1020 3.9zm-8 15.1c-3.9 0-7-3.1-7-7 0-3.9 3.1-7 7-7a7 7 0 010 14zm3.8-5.2c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.3-.6.7-.7.9-.1.1-.2.1-.4 0-.2-.1-1-.4-1.9-1.3-.7-.7-1.3-1.6-1.4-1.8-.1-.2 0-.3.1-.4.1-.1.3-.3.4-.5.1-.2.1-.3 0-.5-.1-.1-.5-1.2-.7-1.6-.2-.4-.4-.3-.5-.3h-.4c-.2 0-.5.1-.7.3-.2.3-.9.8-.9 2s.9 2.3 1 2.4c.1.2 1.7 2.5 4.1 3.5.6.3 1.1.5 1.4.6.6.2 1.1.2 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" />
                                </svg>
                            </a>

                        </div>
                    </div>

                </div>
            </footer>
        </div>
    );
}
