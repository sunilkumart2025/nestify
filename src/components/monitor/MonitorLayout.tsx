import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export function MonitorLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        checkAuth();
    }, [location.pathname]);

    const checkAuth = () => {
        // Allow login page to pass through
        if (location.pathname === '/monitor/login') {
            setIsAuthorized(true);
            return;
        }

        const isAuth = localStorage.getItem('monitor_auth');

        if (!isAuth) {
            toast.error('ACCESS DENIED: AUTHORIZATION REQUIRED', {
                icon: '🔒',
                style: { background: '#000', color: '#ef4444', border: '1px solid #ef4444', fontFamily: 'monospace' }
            });
            navigate('/monitor/login', { replace: true });
        } else {
            setIsAuthorized(true);
        }
    };

    if (!isAuthorized && location.pathname !== '/monitor/login') {
        return <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center">VERIFYING_ACCESS...</div>;
    }

    return <Outlet />;
}
