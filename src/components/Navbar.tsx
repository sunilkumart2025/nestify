
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <img src="/logo.jpg" alt="Nestify" className="h-10 w-10 rounded-lg object-cover" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            Nestify
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/" className="text-slate-600 hover:text-primary transition-colors font-medium">
                            Home
                        </Link>
                        <Link to="/features" className="text-slate-600 hover:text-primary transition-colors font-medium">
                            Features
                        </Link>
                        <Link to="/about" className="text-slate-600 hover:text-primary transition-colors font-medium">
                            About
                        </Link>
                        <div className="flex items-center space-x-4 ml-4">
                            <Link
                                to="/login"
                                className="text-slate-900 hover:text-primary font-medium transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup-admin"
                                className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-slate-600 hover:text-slate-900 p-2"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            <Link
                                to="/"
                                className="block px-3 py-2 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-md font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                Home
                            </Link>
                            <Link
                                to="/features"
                                className="block px-3 py-2 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-md font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                Features
                            </Link>
                            <Link
                                to="/login"
                                className="block px-3 py-2 text-slate-600 hover:text-primary hover:bg-slate-50 rounded-md font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup-admin"
                                className="block px-3 py-2 text-primary font-bold hover:bg-slate-50 rounded-md"
                                onClick={() => setIsOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
