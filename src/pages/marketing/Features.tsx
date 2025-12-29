import { Navbar } from "../../components/Navbar";

export function Features() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* HEADER */}
            <div className="pt-32 pb-12 max-w-4xl mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Powerful Features for Modern Hostels
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                    Nestify v2.0 is built for performance, reliability, and automation — helping
                    hostel owners manage, scale, and secure their operations effortlessly.
                </p>
            </div>

            {/* SECTION 1: CORE SYSTEM UPGRADES */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Core Platform Enhancements</h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">TypeScript-Safe Build</h3>
                        <p className="text-slate-600">
                            Fully resolved TS errors, unused imports, and reference issues.
                            <br />Production-ready with <b>stable Vercel builds</b>.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Unified Branding</h3>
                        <p className="text-slate-600">
                            Updated Navbar, Sidebar, Login with <b>new Logo.jpg</b> and standardized brand identity.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Premium Notifications</h3>
                        <p className="text-slate-600">
                            Global toaster with <b>shadows, borders, custom colors</b> and
                            clear Success/Error states.
                        </p>
                    </div>
                </div>
            </div>

            {/* SECTION 2: SECURITY & AUTH */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Authentication & Security</h2>

                <div className="grid md:grid-cols-3 gap-8">

                    {/* 2FA */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Two-Factor Authentication</h3>
                        <p className="text-slate-600">
                            Admins & Tenants can enable/disable 2FA with OTP verification,
                            secure login interception, and session protection.
                        </p>
                    </div>

                    {/* Forgot Password */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Password Recovery</h3>
                        <p className="text-slate-600">
                            3-step OTP reset flow, 2-minute timers, spam-safe email checks,
                            and secure RPC password update mechanism.
                        </p>
                    </div>

                    {/* Profile Security */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Profile Verification</h3>
                        <p className="text-slate-600">
                            Changing phone numbers triggers OTP verification, ensuring
                            strong account integrity.
                        </p>
                    </div>
                </div>
            </div>

            {/* SECTION 3: BILLING SYSTEM */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Advanced Billing System</h2>

                <div className="space-y-8">

                    {/* Group Generate Bill */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">Group Bill Generation</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Multi-select UI with search, automatic cost breakdown (Rent, EB, Water, Maintenance),
                            and optimized batch insertion for high-volume billing operations.
                        </p>
                    </div>

                    {/* Edit Bill */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">Invoice Editing & Validation</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Correct mistakes instantly using “Edit Bill Amount” — update Rent, EB, Water, Maintenance,
                            with automatic recalculation of totals and subtotals.
                        </p>
                    </div>

                    {/* Smart Features */}
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">Smart Automation</h3>
                        <ul className="list-disc pl-5 text-slate-600 space-y-2">
                            <li>Auto-fills rent based on room price</li>
                            <li>Invoices include payment details once paid</li>
                            <li>Platform fees auto-calculated (₹20 + 0.6% + 0.4% + 0.15%)</li>
                            <li>No manual fee input required</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* SECTION 4: ROOM MANAGEMENT */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Room & Tenant Management</h2>

                <div className="grid md:grid-cols-3 gap-8">

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Room Details Modal</h3>
                        <p className="text-slate-600">
                            A clean, complete room overview with occupancy status, tenant list,
                            and contact information.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Tenant Profiles</h3>
                        <p className="text-slate-600">
                            Onboard, edit, and track all tenant records with robust Supabase-backed consistency.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Export PDF Logs</h3>
                        <p className="text-slate-600">
                            Generate professional, branded reports including room stats,
                            tenant tables, and footer signatures.
                        </p>
                    </div>
                </div>
            </div>

            {/* SECTION 5: TENANT PORTAL */}
            <div className="max-w-6xl mx-auto px-6 pb-20">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Tenant Portal</h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Online Payments</h3>
                        <p className="text-slate-600">
                            Razorpay-powered flow with secure RPC verification preventing tampering.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Dashboard Overview</h3>
                        <p className="text-slate-600">
                            Tenants can view room details, bills, and profile information in a clean UI.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Secure Invoices</h3>
                        <p className="text-slate-600">
                            Download Invoice only after successful payment, ensuring financial integrity.
                        </p>
                    </div>
                </div>
            </div>

            {/* SECTION 6: ARCHITECTURE */}
            <div className="max-w-6xl mx-auto px-6 pb-28">
                <h2 className="text-3xl font-bold text-slate-900 mb-8">Architecture & Reliability</h2>

                <div className="grid md:grid-cols-3 gap-8">

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Supabase Backend</h3>
                        <p className="text-slate-600">
                            PostgreSQL + Auth with strict RLS rules for maximum security.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">RPC-Driven Logic</h3>
                        <p className="text-slate-600">
                            Sensitive actions use <b>SECURITY DEFINER</b> functions for safe server-side execution.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">React + TypeScript</h3>
                        <p className="text-slate-600">
                            Fully typed, stable, scalable frontend powered by TailwindCSS for clean UI.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-4xl mx-auto px-6 pb-32 text-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-14 shadow-xl text-white">
                    <h2 className="text-3xl font-bold mb-3">Experience Nestify v2.0</h2>
                    <p className="text-base opacity-90 max-w-xl mx-auto mb-6">
                        A fully automated, secure, and scalable operating system for modern hostel management.
                    </p>
                    <a
                        href="/contact"
                        className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        Talk to Sales
                    </a>
                </div>
            </div>
        </div>
    );
}
