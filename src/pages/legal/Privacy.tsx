
import { Navbar } from '../../components/Navbar';
import { Shield, Lock, Eye, Database } from 'lucide-react';

export function Privacy() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Navbar />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 pt-32 pb-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-6">
                        <Shield className="w-4 h-4" /> Privacy & Security
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Privacy Policy</h1>
                    <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
                        Your privacy matters to us. This policy explains how we collect, use, and protect your personal information.
                    </p>
                    <div className="flex items-center gap-4 mt-8 text-sm text-slate-400 font-medium">
                        <span>Last Updated: December 14, 2025</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span>Effective Date: January 1, 2025</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-12">

                {/* Sidebar */}
                <div className="hidden md:block col-span-3">
                    <div className="sticky top-32 space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4 px-3">Quick Links</span>
                        {['1. Data We Collect', '2. How We Use Data', '3. Data Sharing', '4. Your Rights', '5. Security'].map((item) => (
                            <a key={item} href={`#section-${item.split('.')[0]}`} className="block px-3 py-2 text-sm text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                {item}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="col-span-1 md:col-span-9 space-y-16">

                    {/* Section 1 */}
                    <section id="section-1" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <Database className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Information We Collect</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                We collect information to provide better services to all our users. The types of information we collect include:
                            </p>
                            <h4 className="font-bold text-slate-900 mt-6">Personal Information</h4>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Account Data:</strong> Name, email address, phone number</li>
                                <li><strong>Identity Verification:</strong> Government ID, photo (for NestID)</li>
                                <li><strong>Financial Data:</strong> Payment methods, transaction history</li>
                            </ul>
                            <h4 className="font-bold text-slate-900 mt-6">Usage Information</h4>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Device information (IP address, browser type)</li>
                                <li>Activity logs (pages visited, features used)</li>
                            </ul>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 2 */}
                    <section id="section-2" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <Eye className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">How We Use Your Data</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                Nestify uses the collected data for the following purposes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>Service Delivery:</strong> Facilitate rent payments, complaints, and communication.</li>
                                <li><strong>Identity Verification:</strong> Verify tenant identities for security purposes.</li>
                                <li><strong>Communication:</strong> Send transactional emails (payment reminders, receipts).</li>
                                <li><strong>Analytics:</strong> Improve our platform based on usage patterns.</li>
                            </ul>
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 my-6">
                                <h4 className="flex items-center gap-2 font-bold text-blue-800 mb-2">
                                    <Lock className="w-4 h-4" /> We Never Sell Your Data
                                </h4>
                                <p className="text-sm text-blue-700 m-0">
                                    Nestify does not sell your personal information to third parties. Your data is used solely to operate and improve the platform.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 3 */}
                    <section id="section-3" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <span className="font-bold text-lg">3</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Data Sharing & Disclosure</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                We may share your information in the following limited circumstances:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>With Your Hostel Owner:</strong> Your name, room number, and payment status are visible to your Admin.</li>
                                <li><strong>Payment Processors:</strong> Transaction data is shared with Razorpay/Cashfree to process payments.</li>
                                <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights.</li>
                            </ul>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 4 */}
                    <section id="section-4" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <span className="font-bold text-lg">4</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Your Privacy Rights</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                You have the following rights regarding your personal data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>Access:</strong> Request a copy of your personal data.</li>
                                <li><strong>Correction:</strong> Update inaccurate information via your profile settings.</li>
                                <li><strong>Deletion:</strong> Request deletion of your account and associated data.</li>
                                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (transactional emails cannot be disabled).</li>
                            </ul>
                            <p className="mt-6">
                                To exercise these rights, contact us at <a href="mailto:privacy@nestify.xyz" className="text-green-600 font-bold hover:underline">privacy@nestify.xyz</a>
                            </p>
                        </div>
                    </section>

                    <div className="w-full h-px bg-slate-200" />

                    {/* Section 5 */}
                    <section id="section-5" className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <Lock className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Data Security</h2>
                        </div>
                        <div className="prose prose-slate prose-lg text-slate-600 leading-relaxed">
                            <p>
                                We implement industry-standard security measures to protect your data:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="bg-slate-100 p-4 rounded-xl">
                                    <h5 className="font-bold text-slate-900 mb-2">🔒 AES-256 Encryption</h5>
                                    <p className="text-sm m-0">All data is encrypted in transit and at rest.</p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-xl">
                                    <h5 className="font-bold text-slate-900 mb-2">🛡️ Daily Backups</h5>
                                    <p className="text-sm m-0">Automated backups to prevent data loss.</p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-xl">
                                    <h5 className="font-bold text-slate-900 mb-2">👥 Access Controls</h5>
                                    <p className="text-sm m-0">Strict role-based permissions.</p>
                                </div>
                                <div className="bg-slate-100 p-4 rounded-xl">
                                    <h5 className="font-bold text-slate-900 mb-2">🔐 Secure Payments</h5>
                                    <p className="text-sm m-0">PCI-DSS compliant gateway integration.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* Footer */}
            <div className="py-12 bg-white border-t border-slate-200 text-center text-slate-400 text-sm">
                Questions? Contact us at <a href="mailto:privacy@nestify.xyz" className="text-green-600 font-bold hover:underline">privacy@nestify.xyz</a>
            </div>
        </div>
    );
}
