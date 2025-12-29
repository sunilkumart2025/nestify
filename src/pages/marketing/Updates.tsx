import { Navbar } from '../../components/Navbar';

export function Updates() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Header Section */}
            <div className="pt-32 pb-12 max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Product Updates
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                    Follow the latest improvements, fixes, and new features added to Nestify.
                </p>
            </div>

            {/* Updates Timeline */}
            <div className="max-w-4xl mx-auto px-6 pb-24 space-y-12">

                {/* Update 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md hover:shadow-xl transition">
                    <span className="text-sm text-blue-600 font-semibold">Jan 2025</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-3">
                        Nestify v2.0 Launch – Faster, Smarter & More Powerful
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        We've re-engineered the entire platform for improved performance and smoother user experience.
                        From billing automation to tenant management, everything is now faster and more reliable.
                    </p>
                </div>

                {/* Update 2 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md hover:shadow-xl transition">
                    <span className="text-sm text-blue-600 font-semibold">Dec 2024</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-3">
                        Introducing Smart UPI Links
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        Tenants can now pay rent using secure UPI links with instant confirmation.
                        No manual accounting needed—payments sync automatically to your dashboard.
                    </p>
                </div>

                {/* Update 3 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md hover:shadow-xl transition">
                    <span className="text-sm text-blue-600 font-semibold">Nov 2024</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-3">
                        New Complaint Management System
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        Tenants can now submit issues directly from their portal.
                        Owners get instant alerts and can track progress effortlessly.
                    </p>
                </div>

                {/* Update 4 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md hover:shadow-xl transition">
                    <span className="text-sm text-blue-600 font-semibold">Oct 2024</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-3">
                        Dashboard Redesign – Cleaner & More Informative
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        The new dashboard layout gives you real-time insights, quick-access actions,
                        and a redesigned analytics section for better decision-making.
                    </p>
                </div>

                {/* Update 5 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md hover:shadow-xl transition">
                    <span className="text-sm text-blue-600 font-semibold">Sep 2024</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-3">
                        Multi-Building Management Support
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                        Hostels with multiple buildings can now manage rooms, bills, and occupancy under a unified system.
                    </p>
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-4xl mx-auto px-6 pb-32 text-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-14 shadow-xl text-white">
                    <h2 className="text-3xl font-bold mb-3">Stay Updated</h2>
                    <p className="text-base opacity-90 max-w-xl mx-auto mb-6">
                        Subscribe to receive the latest Nestify features, improvements, and announcements.
                    </p>
                    <a
                        href="mailto:updates@nestify.xyz"
                        className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        updates@nestify.xyz
                    </a>
                </div>
            </div>
        </div>
    );
}
