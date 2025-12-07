import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'react-hot-toast';

export function MonitorLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: FormEvent) => {
        e.preventDefault();

        const validUser = import.meta.env.VITE_MONITOR_USER;
        const validPass = import.meta.env.VITE_MONITOR_PASS;

        if (username === validUser && password === validPass) {
            localStorage.setItem('monitor_auth', 'true');
            toast.success('Access Granted');
            navigate('/monitor/dashboard');
        } else {
            toast.error('Invalid Credentials');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
                <div className="flex justify-center mb-8">
                    <div className="bg-red-500/10 p-4 rounded-full">
                        <Shield className="h-8 w-8 text-red-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-white mb-2">Restricted Access</h2>
                <p className="text-slate-400 text-center mb-8 text-sm">Platform Monitoring System</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        placeholder="System ID"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <Input
                        type="password"
                        placeholder="Access Key"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white">
                        <Lock className="h-4 w-4 mr-2" />
                        Authenticate
                    </Button>
                </form>
            </div>
        </div>
    );
}
