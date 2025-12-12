import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TenureSidebar } from '../tenure/Sidebar';
import { Menu } from 'lucide-react';
import { useDeviceTracker } from '../../hooks/useDeviceTracker'; // Import Hook
import { WelcomeBanner } from '../tenure/WelcomeBanner';
import { ChatWidget } from '../../components/chat/ChatWidget';

export function TenureLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Activate Fortress Protocol (Device Tracking for Tenants)
    useDeviceTracker();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 relative">
            <WelcomeBanner />
            {/* ... (rest of simple layout) */}
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <TenureSidebar onClose={() => setIsSidebarOpen(false)} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center p-4 bg-white border-b border-slate-200 shadow-sm">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="ml-3 font-semibold text-slate-900">Nestify Student</span>
                </div>

                <div className="flex-1 overflow-auto">
                    <main className="p-4 lg:p-8">
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* NestBot Integration */}
            <ChatWidget userType="tenure" />
        </div>
    );
}
