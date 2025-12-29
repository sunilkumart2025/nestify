
import { Navbar } from '../../components/Navbar';

export function About() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                        About Nestify
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Building the most trusted operating system for modern co-living, hostels, and rental communities.
                    </p>
                </div>

                {/* Mission Section */}
                <div className="bg-white shadow-lg rounded-2xl p-10 mb-20 border border-slate-100">
                    <h2 className="text-3xl font-semibold text-slate-900 mb-4">Our Mission</h2>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        Nestify was created with a simple belief —
                        <span className="font-semibold text-slate-800"> managing a hostel or co-living space should be effortless. </span>
                        From bookings to payments, maintenance to communication, Nestify streamlines every workflow into one smart dashboard.
                        Our mission is to empower owners with automation and provide residents with a seamless living experience.
                    </p>
                </div>

                {/* What We Do */}
                <div className="grid md:grid-cols-2 gap-10 mb-20">

                    <div className="bg-white shadow-md rounded-2xl p-8 border border-slate-100">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">A Complete Management Suite</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Nestify centralizes bookings, payments, complaints, attendance, room allocation, and financial insights in one platform designed for speed and simplicity.
                        </p>
                    </div>

                    <div className="bg-white shadow-md rounded-2xl p-8 border border-slate-100">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-3">Designed for Every Hostel</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Whether you're running a small hostel or a large multi-building co-living setup, Nestify adapts to your workflow and grows with your business.
                        </p>
                    </div>
                </div>

                {/* Vision Section */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-12 mb-20 shadow-xl">
                    <h2 className="text-3xl font-semibold mb-4">Our Vision</h2>
                    <p className="text-lg opacity-90 leading-relaxed max-w-3xl">
                        We aim to redefine the future of shared living by building the most reliable automation-first ecosystem.
                        Nestify is not just a tool — it's the infrastructure powering the next generation of smart living communities.
                    </p>
                </div>

                {/* Stats Section */}
                <div className="grid md:grid-cols-3 gap-10 text-center mb-20">

                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
                        <h3 className="text-4xl font-bold text-slate-900 mb-2">1,000+</h3>
                        <p className="text-slate-600">Residents Managed</p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
                        <h3 className="text-4xl font-bold text-slate-900 mb-2">50+</h3>
                        <p className="text-slate-600">Hostels Onboarded</p>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
                        <h3 className="text-4xl font-bold text-slate-900 mb-2">99.9%</h3>
                        <p className="text-slate-600">System Uptime</p>
                    </div>

                </div>

                {/* Footer CTA */}
                <div className="text-center mt-20">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">We’re Just Getting Started</h2>
                    <p className="text-lg text-slate-600 mb-8">
                        Nestify continues to evolve with smarter tools, deeper automation, and a vision to digitize every hostel in India.
                    </p>
                    <a
                        href="/contact"
                        className="inline-block px-8 py-4 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
                    >
                        Talk to Us
                    </a>
                </div>
            </div>
        </div>
    );
}
