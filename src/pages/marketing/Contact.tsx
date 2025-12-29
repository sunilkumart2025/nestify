import { Navbar } from '../../components/Navbar';
import { motion } from "framer-motion";

export function Contact() {
    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            <Navbar />

            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-white to-purple-100/40 pointer-events-none" />

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="pt-32 pb-16 max-w-3xl mx-auto px-4 text-center"
            >
                <h1 className="text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Contact Sales
                </h1>
                <p className="text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
                    Transform your hostel with India's most advanced automation system.
                    Our experts will connect with you instantly.
                </p>
            </motion.div>

            {/* Cards Section */}
            <div className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-10">

                {/* EMAIL CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="backdrop-blur-xl bg-white/60 border border-white/40 shadow-2xl rounded-3xl p-10 text-center hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all"
                >
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Email Us</h3>
                    <p className="text-slate-600 mb-4">For sales, onboarding & partnerships</p>
                    <a href="mailto:sales@nestify.xyz" className="text-blue-600 text-lg font-semibold">
                        sales@nestify.xyz
                    </a>
                </motion.div>

                {/* PHONE CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                    viewport={{ once: true }}
                    className="backdrop-blur-xl bg-white/60 border border-white/40 shadow-2xl rounded-3xl p-10 text-center hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all"
                >
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Call Us</h3>
                    <p className="text-slate-600 mb-4">Speak directly with the Nestify team</p>
                    <p className="font-bold text-slate-900 text-lg">+91 98765 43210</p>
                </motion.div>

                {/* SUPPORT CARD */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="backdrop-blur-xl bg-white/60 border border-white/40 shadow-2xl rounded-3xl p-10 text-center hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all"
                >
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Support</h3>
                    <p className="text-slate-600 mb-4">Need help or technical assistance?</p>
                    <a href="mailto:support@nestify.xyz" className="text-blue-600 text-lg font-semibold">
                        support@nestify.xyz
                    </a>
                </motion.div>
            </div>

            {/* Premium CTA Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto px-6 pb-32 text-center"
            >
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-4xl p-16 shadow-2xl text-white relative overflow-hidden">

                    {/* Floating BG Animations */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-purple-500/20 blur-3xl rounded-full animate-[pulse_6s_ease-in-out_infinite]"></div>

                    <h2 className="text-4xl font-bold mb-4">Let’s Build the Future of Hostels</h2>
                    <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
                        Join hundreds of owners using Nestify to automate billing, payments, tenant management,
                        and financial operations with unmatched accuracy and speed.
                    </p>

                    <a
                        href="mailto:sales@nestify.xyz"
                        className="inline-block px-10 py-4 rounded-full bg-white text-slate-900 font-semibold text-lg hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        Talk to Sales
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
