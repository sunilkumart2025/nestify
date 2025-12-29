import { Navbar } from '../../components/Navbar';

export function Careers() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <div className="pt-32 pb-12 max-w-3xl mx-auto px-6 text-center">
                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Join Our Team
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                    Help us build the future of hostel automation.
                    We're looking for passionate engineers, designers, and creators who want to make a real impact.
                </p>
            </div>

            {/* Why Work With Us */}
            <div className="max-w-6xl mx-auto px-6 pb-24">
                <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
                    Why Work at Nestify?
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Meaningful Impact</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Your work directly shapes the lives of thousands of hostel owners and residents across India.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Modern Tech Stack</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Work with the latest tools in web development, automation, cloud platforms, and AI-based insights.
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Startup Culture</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Zero bureaucracy. High ownership. Your ideas matter — and you’ll see them come to life fast.
                        </p>
                    </div>
                </div>
            </div>

            {/* Open Roles Section */}
            <div className="max-w-6xl mx-auto px-6 pb-24">
                <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Open Positions</h2>

                <div className="space-y-6 max-w-3xl mx-auto">
                    {/* Role 1 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-1">Frontend Engineer</h3>
                        <p className="text-slate-600 text-base mb-3">
                            Build beautiful UI and improve user experience across the platform.
                        </p>
                        <span className="text-sm text-slate-500">Skills: React, Tailwind, TypeScript</span>
                    </div>

                    {/* Role 2 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-1">Backend Engineer</h3>
                        <p className="text-slate-600 text-base mb-3">
                            Architect reliable systems and implement APIs powering core features.
                        </p>
                        <span className="text-sm text-slate-500">Skills: Node.js, Postgres, Cloud Functions</span>
                    </div>

                    {/* Role 3 */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition">
                        <h3 className="text-xl font-semibold text-slate-900 mb-1">UI/UX Designer</h3>
                        <p className="text-slate-600 text-base mb-3">
                            Design intuitive and modern interfaces that define the Nestify experience.
                        </p>
                        <span className="text-sm text-slate-500">Skills: Figma, Prototyping, Design Systems</span>
                    </div>

                    {/* More roles can be added here */}
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-4xl mx-auto px-6 pb-32 text-center">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-14 shadow-xl text-white">
                    <h2 className="text-3xl font-bold mb-3">Send Us Your Resume</h2>
                    <p className="text-base opacity-90 max-w-xl mx-auto mb-6">
                        Even if you don't see a perfect role listed above, great talent is always welcome at Nestify.
                    </p>
                    <a
                        href="mailto:careers@nestify.xyz"
                        className="inline-block px-8 py-3 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-100 transition shadow-lg hover:shadow-xl"
                    >
                        careers@nestify.xyz
                    </a>
                </div>
            </div>
        </div>
    );
}
