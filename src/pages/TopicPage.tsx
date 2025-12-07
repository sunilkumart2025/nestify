import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Building2, ArrowLeft } from 'lucide-react';

export function TopicPage() {
    const { slug } = useParams<{ slug: string }>();

    const getTitle = (slug: string) => {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const title = slug ? getTitle(slug) : 'Info';

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Navbar />

            <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/" className="inline-flex items-center text-slate-500 hover:text-primary mb-8 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-100">
                        <div className="bg-primary/10 p-3 rounded-xl">
                            <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{title}</h1>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <p className="lead text-xl text-slate-600 mb-6">
                            This is a placeholder page for <strong>{title}</strong>.
                        </p>

                        <p className="mb-4">
                            At Nestify, we are committed to providing transparency and excellence.
                            This section would typically contain detailed information regarding our {title.toLowerCase()}.
                        </p>

                        <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Content Coming Soon</h3>
                        <p className="mb-4">
                            We are currently updating our documentation to better serve our users.
                            Please check back shortly for the full content of this page.
                        </p>

                        <p>
                            If you have immediate questions, please contact our support team at:
                        </p>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mt-6 not-prose">
                            <ul className="space-y-2 text-slate-700">
                                <li><strong>Email:</strong> support@gmail.com</li>
                                <li><strong>Phone:</strong> 5656565656</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Footer Replica */}
            <footer className="mt-20 border-t border-slate-200 py-12 text-center text-slate-500 text-sm">
                <p>© 2025 Nestify HMS. All rights reserved.</p>
            </footer>
        </div>
    );
}
