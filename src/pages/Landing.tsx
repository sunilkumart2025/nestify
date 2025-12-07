import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CreditCard, Users, ArrowRight, CheckCircle2, Building2, Play, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export function Landing() {
    const [isDemoOpen, setIsDemoOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob" />
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000" />
                    <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-4000" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-primary/20 bg-white/50 backdrop-blur-sm text-primary text-sm font-semibold mb-8 shadow-sm">
                                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                                The #1 Rated Hostel Management System
                            </span>
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                                Manage your property with <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-secondary animate-gradient-x">Unmatched Confidence</span>
                            </h1>
                            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                                Nestify simplifies hostel operations with automated billing, bank-grade secure payments, and seamless tenant communication.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    to="/signup-admin"
                                    className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center"
                                >
                                    Start Now <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                                <button
                                    onClick={() => setIsDemoOpen(true)}
                                    className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 rounded-full font-bold text-lg transition-all flex items-center justify-center group"
                                >
                                    <Play className="w-5 h-5 mr-2 text-slate-400 group-hover:text-primary transition-colors fill-current" />
                                    View Demo
                                </button>
                            </div>

                            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 font-medium">
                                <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> No credit card required</div>
                                <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> 14-day free trial</div>
                                <div className="flex items-center"><CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> Cancel anytime</div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Trusted By Section (New) */}
            <section className="py-10 border-y border-slate-100 bg-white/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8">Trusted by 500+ Innovative Hostels</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Placeholder Logos - simpler to just use text for now or generic shapes */}
                        {['Stanza Living', 'Zolo Stays', 'Oxford Hostels', 'Elite Livings', 'Campus Ville'].map((name, i) => (
                            <span key={i} className="text-xl md:text-2xl font-bold font-serif text-slate-400 hover:text-slate-600 cursor-default">{name}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-primary font-semibold tracking-wide uppercase text-sm">Features</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-4">Everything you need to run your hostel</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Powerful features designed for modern property managers who demand efficiency.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <CreditCard className="h-8 w-8 text-white" />,
                                title: "Automated Billing",
                                desc: "Generate bills automatically with split payments for rent, electricity, and maintenance.",
                                color: "bg-blue-500"
                            },
                            {
                                icon: <Shield className="h-8 w-8 text-white" />,
                                title: "Secure Payments",
                                desc: "Integrated with Razorpay & Cashfree for safe, direct-to-owner transaction settlement.",
                                color: "bg-green-500"
                            },
                            {
                                icon: <Users className="h-8 w-8 text-white" />,
                                title: "Tenant Management",
                                desc: "Digital onboarding, document storage, and real-time occupancy tracking.",
                                color: "bg-purple-500"
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials (New) */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Loved by Property Managers</h2>
                        <p className="text-lg text-slate-600">Don't just take our word for it.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                quote: "Nestify cut my administrative time by 80%. The automated billing is a lifesaver.",
                                author: "Rahul Sharma",
                                role: "Owner, Sharma Residency",
                                rating: 5
                            },
                            {
                                quote: "Finally a system that my tenants actually like using. The app is super smooth.",
                                author: "Priya Patel",
                                role: "Manager, Campus Hub",
                                rating: 5
                            },
                            {
                                quote: "Support is fantastic. They helped me migrate 200 tenants in a single day.",
                                author: "Amit Kumar",
                                role: "Director, Elite Stays",
                                rating: 5
                            }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex mb-4 text-yellow-400">
                                    {[...Array(item.rating)].map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}
                                </div>
                                <p className="text-slate-700 italic mb-6">"{item.quote}"</p>
                                <div>
                                    <h4 className="font-bold text-slate-900">{item.author}</h4>
                                    <p className="text-sm text-slate-500">{item.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-24 bg-slate-900 text-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for scale and reliability</h2>
                            <p className="text-slate-400 text-lg mb-8">
                                Whether you manage one hostel or a chain of properties, Nestify scales with your needs.
                            </p>
                            <div className="space-y-4">
                                {[
                                    "99.9% Uptime Guarantee",
                                    "Bank-grade Security",
                                    "24/7 Priority Support",
                                    "Automated Daily Backups"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center">
                                        <CheckCircle2 className="h-5 w-5 text-primary mr-3" />
                                        <span className="text-slate-300">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-20 blur-3xl rounded-full" />
                            <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl">
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-4xl font-bold text-white mb-2">10k+</div>
                                        <div className="text-slate-400">Active Tenants</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-bold text-white mb-2">₹50M+</div>
                                        <div className="text-slate-400">Processed Securely</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-bold text-white mb-2">500+</div>
                                        <div className="text-slate-400">Hostels Managed</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-bold text-white mb-2">4.9/5</div>
                                        <div className="text-slate-400">User Rating</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section (New) */}
            <section className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { q: "Is there a free trial?", a: "Yes, we offer a 14-day full access free trial. No credit card required." },
                            { q: "How secure is the payment processing?", a: "We use bank-grade encryption via Razorpay and Cashfree. We do not store card details." },
                            { q: "Can I manage multiple hostels?", a: "Absolutely. Our admin dashboard allows you to switch between properties seamlessly." },
                            { q: "What happens to my data?", a: "Your data is yours. We perform daily backups and you can export your data at any time." }
                        ].map((item, index) => (
                            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex justify-between items-center p-4 text-left font-medium text-slate-900 hover:bg-slate-50 transition-colors"
                                >
                                    {item.q}
                                    {openFaq === index ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                                </button>
                                {openFaq === index && (
                                    <div className="p-4 pt-0 text-slate-600 bg-slate-50/50">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 pt-20 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                        {/* Brand Column */}
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="bg-primary p-2 rounded-xl">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold text-white">Nestify</span>
                            </div>
                            <p className="text-slate-400 mb-8 max-w-sm leading-relaxed">
                                Empowering hostel owners with the tools they need to succeed in the digital age. Simple, secure, and scalable.
                            </p>
                        </div>

                        {/* Links Columns */}
                        <div>
                            <h4 className="font-bold text-white mb-6">Product</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/topic/features" className="hover:text-primary transition-colors">Features</Link></li>
                                {/* Removed Pricing Link as requested */}
                                <li><Link to="/topic/security" className="hover:text-primary transition-colors">Security</Link></li>
                                <li><Link to="/topic/mobile-app" className="hover:text-primary transition-colors">Mobile App</Link></li>
                                <li><Link to="/topic/integrations" className="hover:text-primary transition-colors">Integrations</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6">Resources</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/topic/documentation" className="hover:text-primary transition-colors">Documentation</Link></li>
                                <li><Link to="/topic/help-center" className="hover:text-primary transition-colors">Help Center</Link></li>
                                <li><Link to="/topic/blog" className="hover:text-primary transition-colors">Blog</Link></li>
                                <li><Link to="/topic/community" className="hover:text-primary transition-colors">Community</Link></li>
                                <li><Link to="/topic/status" className="hover:text-primary transition-colors">Status</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6">Company</h4>
                            <ul className="space-y-4 text-sm">
                                <li><Link to="/topic/about-us" className="hover:text-primary transition-colors">About Us</Link></li>
                                <li><Link to="/topic/careers" className="hover:text-primary transition-colors">Careers</Link></li>
                                <li><Link to="/topic/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                                <li><Link to="/topic/legal" className="hover:text-primary transition-colors">Legal</Link></li>
                                <li><Link to="/topic/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-slate-500">
                            <div className="flex flex-col gap-1 mb-2 md:mb-0">
                                <span>© 2025 Nestify HMS. All rights reserved.</span>
                                <span className="text-xs">Support: support@gmail.com | 5656565656</span>
                            </div>
                        </div>

                        {/* Social Icons */}
                        <div className="flex items-center gap-6">
                            <a href="#" className="text-slate-400 hover:text-white transition-colors">
                                <span className="sr-only">Twitter</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </a>
                            <a href="#" className="text-slate-400 hover:text-white transition-colors">
                                <span className="sr-only">GitHub</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                </svg>
                            </a>
                            <a href="#" className="text-slate-400 hover:text-white transition-colors">
                                <span className="sr-only">LinkedIn</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Demo Modal */}
            {isDemoOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setIsDemoOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="aspect-video w-full bg-slate-900 flex items-center justify-center relative group cursor-pointer">
                            {/* Placeholder for actual video */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20" />
                            <div className="text-center z-10">
                                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                                    <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[24px] border-l-white border-b-[12px] border-b-transparent ml-2" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Watch Product Tour</h3>
                                <p className="text-slate-300">Experience the power of Nestify (1:45)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
