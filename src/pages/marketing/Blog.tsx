import { Navbar } from '../../components/Navbar';

export function Blog() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Header Section */}
            <div className="pt-32 pb-12 max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Nestify Blog
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                    Insights, guides, and strategies to help you run your hostel smarter and grow faster.
                </p>
            </div>

            {/* Blog Preview Grid */}
            <div className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-10">

                {/* Article Card 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-6 cursor-pointer">
                    <div className="h-40 bg-slate-100 rounded-xl mb-5" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        5 Ways to Automate Your Hostel Billing
                    </h3>
                    <p className="text-slate-600 text-base mb-4">
                        Discover how automation saves time and eliminates manual mistakes in hostel rent collection.
                    </p>
                    <span className="text-blue-600 font-medium text-sm">Read More →</span>
                </div>

                {/* Article Card 2 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-6 cursor-pointer">
                    <div className="h-40 bg-slate-100 rounded-xl mb-5" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Improving Tenant Experience with Smart Tech
                    </h3>
                    <p className="text-slate-600 text-base mb-4">
                        Small tech upgrades can drastically improve tenant satisfaction and retention.
                    </p>
                    <span className="text-blue-600 font-medium text-sm">Read More →</span>
                </div>

                {/* Article Card 3 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl transition p-6 cursor-pointer">
                    <div className="h-40 bg-slate-100 rounded-xl mb-5" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        How to Manage Complaints Effectively
                    </h3>
                    <p className="text-slate-600 text-base mb-4">
                        Learn the best practices to handle tenant complaints and maintain a positive environment.
                    </p>
                    <span className="text-blue-600 font-medium text-sm">Read More →</span>
                </div>

            </div>

            {/* Call to Action */}
            <div className="max-w-3xl mx-auto px-6 pb-32 text-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-12 shadow-xl text-white">
                    <h2 className="text-3xl font-bold mb-3">Get Notified When We Publish New Posts</h2>
                    <p className="text-base opacity-90 max-w-xl mx-auto mb-6">
                        Stay updated with the latest hostel management insights and product updates from Nestify.
                    </p>
                    <a
                        href="mailto:blog@nestify.xyz"
                        className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-semibold text-base hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        Subscribe
                    </a>
                </div>
            </div>
        </div>
    );
}
