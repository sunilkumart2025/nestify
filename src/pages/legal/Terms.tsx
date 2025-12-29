
import { Navbar } from '../../components/Navbar';
import { Shield, FileText, Scale, AlignLeft } from 'lucide-react';

export function Terms() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 pt-32 pb-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold mb-6">
                        <Scale className="w-4 h-4" /> Legal Center
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Terms of Service</h1>
                    <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                        Please read these terms carefully before using the Nestify platform. They define your rights and responsibilities.
                    </p>
                    <div className="flex items-center gap-4 mt-8 text-sm text-slate-400 font-medium">
                        <span>Last Updated: December 14, 2025</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span>Version 2.1</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-12">

                {/* Sidebar Navigation (Hidden on mobile) */}
                <div className="hidden md:block col-span-3">
                    <div className="sticky top-32 space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4 px-3">Table of Contents</span>
                        {['1. Acceptance', '2. Services', '3. User Accounts', '4. Payments', '5. Data Privacy', '6. Termination'].map((item) => (
                            <a key={item} href={`#section-${item.split('.')[0]}`} className="block px-3 py-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                {item}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Main Text */}
                <div className="col-span-1 md:col-span-9 space-y-16">

                    {/* Section 1 */}
                    <section id="section-1" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">1</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Acceptance of Terms</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                By accessing or using the Nestify platform ("Service"), accessible from nestify.com, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
                            </p>
                            <p>
                                These Terms apply to all visitors, users, and others who wish to access or use the Service, including Hostel Owners ("Admins") and Tenants ("Residents").
                            </p>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 2 */}
                    <section id="section-2" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">2</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Description of Service</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                Nestify provides a property management software solution designed for hostels and co-living spaces. Our key features include:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Tenant onboarding and identity verification.</li>
                                <li>Automated rent invoicing and payment collection.</li>
                                <li>Complaint management ticketing system.</li>
                                <li>Digital community features (events, polls).</li>
                            </ul>
                            <p className="mt-4">
                                Nestify reserves the right to modify, suspend, or discontinue the Service at any time, with or without notice.
                            </p>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 3 */}
                    <section id="section-3" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">3</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">User Accounts</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                When you create an account with us, you guarantee that the information you provide is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account.
                            </p>
                            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 my-6">
                                <h4 className="flex items-center gap-2 font-bold text-yellow-800 mb-2">
                                    <Shield className="w-4 h-4" /> Account Security
                                </h4>
                                <p className="text-sm text-yellow-700 m-0">
                                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 4 */}
                    <section id="section-4" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">4</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Payments & Refunds</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                Nestify facilitates payments between Tenants and Hostel Owners. We integrate with third-party payment gateways (Razorpay, Cashfree).
                            </p>
                            <p>
                                <strong>Transaction Fees:</strong> Platform fees may be applied to transactions. These are non-refundable.
                                <br />
                                <strong>Refunds:</strong> Refund requests for rent payments must be directed to your Hostel Owner. Nestify is not responsible for refunding rent payments once settled to the Owner.
                            </p>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 5 */}
                    <section id="section-5" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">5</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Data Privacy</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                Your privacy is critically important to us. Our use of your personal information is governed by our <a href="/privacy" className="text-blue-600 font-bold hover:underline">Privacy Policy</a>. By using Nestify, you consent to the collection and use of your data as outlined therein.
                            </p>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 6 */}
                    <section id="section-6" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <span className="font-bold text-lg">6</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Termination</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                            </p>
                            <p>
                                Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.
                            </p>
                        </div>
                    </section>

                </div>
            </div>

            {/* Footer Placeholder for visual balance */}
            <div className="py-12 bg-white border-t border-slate-200 text-center text-slate-400 text-sm">
                &copy; 2025 Nestify Inc. All legal rights reserved.
            </div>
        </div>
    );
}
