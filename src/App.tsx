import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Landing } from './pages/Landing';
import { Login } from './pages/auth/Login';
import { SignupAdmin } from './pages/auth/SignupAdmin';
import { SignupTenure } from './pages/auth/SignupTenure';
import { AdminDashboard } from './pages/admin/Dashboard';
import { TenureDashboard } from './pages/tenure/Dashboard';
import { TopicPage } from './pages/TopicPage';
import { MonitorLayout } from './components/monitor/MonitorLayout';
import { MonitorLogin } from './pages/monitor/Login';
import { MonitorDashboard } from './pages/monitor/Dashboard';
import { MonitorRegistry } from './pages/monitor/Registry';
import { MonitorLedger } from './pages/monitor/Ledger';
import { MonitorPayments } from './pages/monitor/Payments';
import { supabase } from './lib/supabase';

// Session Manager Component
function SessionManager() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const localToken = localStorage.getItem(`session_token_${user.id}`);
      if (!localToken) return;

      // 1. Initial Check: Am I already invalid?
      const { data: dbSession } = await supabase
        .from('user_sessions')
        .select('current_session_token')
        .eq('user_id', user.id)
        .single();

      if (dbSession && dbSession.current_session_token !== localToken) {
        toast.error("Session expired (Logged in elsewhere).", { duration: 4000 });
        await supabase.auth.signOut();
        window.location.href = '/login';
        return;
      }

      // 2. Listen for Realtime Changes
      const channel = supabase
        .channel('public:user_sessions')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'user_sessions', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            console.log('Session Update:', payload);
            if (payload.new.current_session_token && payload.new.current_session_token !== localToken) {
              toast.error("Logged in on another device. Logging out...", { duration: 5000, icon: '🔒' });
              await supabase.auth.signOut();
              window.location.href = '/login';
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    checkSession();
  }, [navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <SessionManager />
      <Toaster
        position="top-center"
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            padding: '16px',
            fontSize: '14px',
            maxWidth: '500px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #10b981',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup-admin" element={<SignupAdmin />} />
        <Route path="/signup-tenure" element={<SignupTenure />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/tenure/*" element={<TenureDashboard />} />
        <Route path="/monitor" element={<MonitorLayout />}>
          <Route path="login" element={<MonitorLogin />} />
          <Route path="registry" element={<MonitorRegistry />} />
          <Route path="ledger" element={<MonitorLedger />} />
          <Route path="payments" element={<MonitorPayments />} />
          <Route index element={<MonitorDashboard />} />
          <Route path="*" element={<MonitorDashboard />} />
        </Route>
        <Route path="/topic/:slug" element={<TopicPage />} />
      </Routes>
    </Router>
  );
}

export default App;
