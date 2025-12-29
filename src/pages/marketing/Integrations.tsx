import { Navbar } from '../../components/Navbar';

export function Integrations() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Header Section */}
            <div className="pt-32 pb-12 max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Integrations
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                    Connect Nestify seamlessly with your favorite platforms to automate workflows
                    and enhance productivity.
                </p>
            </div>

            {/* Integration Cards */}
            <div className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-10">

                {/* WhatsApp */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">WhatsApp</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        Send automatic rent reminders, announcements, and payment confirmations
                        directly to your tenants.
                    </p>
                </div>

                {/* Tally */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Tally</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        Sync financial data, automate ledger entries, and keep your hostel accounts
                        accurate and up to date.
                    </p>
                </div>

                {/* Razorpay */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Razorpay</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        Accept secure UPI payments, track settlements, and automate rent collection
                        without manual effort.
                    </p>
                </div>

                {/* Cashfree */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Cashfree</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        Enable seamless payment links, subscriptions, and instant settlements across India.
                    </p>
                </div>

                {/* Google Sheets */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Google Sheets</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        Export data, analyze trends, and automate reporting in your custom spreadsheets.
                    </p>
                </div>

                {/* More Integrations */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-8 text-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-2xl mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">More Coming Soon</h3>
                    <p className="text-slate-600 text-base leading-relaxed">
                        We're constantly expanding our integration ecosystem with tools you already use.
                    </p>
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-4xl mx-auto px-6 pb-32 text-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-14 shadow-xl text-white">
                    <h2 className="text-3xl font-bold mb-3">Need a Custom Integration?</h2>
                    <p className="text-base opacity-90 max-w-xl mx-auto mb-6">
                        If your hostel relies on a different tool, we can build a tailored integration
                        specifically for your workflow.
                    </p>

                    <a
                        href="mailto:integrations@nestify.xyz"
                        className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        integrations@nestify.xyz
                    </a>
                </div>
            </div>
        </div>
    );
}
