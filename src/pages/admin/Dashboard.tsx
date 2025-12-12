
import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../../components/layouts/AdminLayout';
import { AdminHome } from './Home';
import { AdminRooms } from './Rooms';
import { AdminTenures } from './Tenures';
import { AdminBilling } from './Billing';
import { AdminMessages } from './Messages';
import { AdminAnalysis } from './Analysis';
import { AdminProfile } from './Profile';
import { AdminMaintenance } from './Maintenance';
import { AdminCommunity } from './Community';

import { PaymentSettings } from './PaymentSettings';
import { Expenses } from './Expenses';
import { VerifyID } from './VerifyID';
import { AuditLogs } from './AuditLogs';
import { AdminFeedback } from './Feedback';
import { AdminNotifications } from './Notifications';
import { SmartCalendar } from './Calendar';
import { SecuritySettings } from './SecuritySettings';


import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { VerificationPopup } from '../../components/common/VerificationPopup';

export function AdminDashboard() {
    // Lazy Cron: Trigger daily automations when admin visits dashboard
    useEffect(() => {
        const runAutomations = async () => {
            // Fire and forget, don't block UI
            supabase.rpc('run_daily_automations').then(({ error }) => {
                if (error) console.error('Automation Error:', error);
            });
        };
        runAutomations();
    }, []);

    const [showVerifyPopup, setShowVerifyPopup] = useState(false);

    useEffect(() => {
        const checkVerification = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase.from('admins').select('nestid_status').eq('id', user.id).single();
            if (data && data.nestid_status !== 'verified') {
                // Show popup with a slight delay for better UX
                setTimeout(() => setShowVerifyPopup(true), 1500);
            }
        };
        checkVerification();
    }, []);

    return (
        <>
            <VerificationPopup
                isOpen={showVerifyPopup}
                onClose={() => setShowVerifyPopup(false)}
                userType="admin"
            />
            <Routes>
                <Route element={<AdminLayout />}>
                    <Route index element={<AdminHome />} />
                    <Route path="rooms" element={<AdminRooms />} />
                    <Route path="tenures" element={<AdminTenures />} />
                    <Route path="billing" element={<AdminBilling />} />
                    <Route path="maintenance" element={<AdminMaintenance />} />
                    <Route path="community" element={<AdminCommunity />} />
                    <Route path="messages" element={<AdminMessages />} />
                    <Route path="analysis" element={<AdminAnalysis />} />
                    <Route path="audit-logs" element={<AuditLogs />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="calendar" element={<SmartCalendar />} />
                    <Route path="feedback" element={<AdminFeedback />} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="payments" element={<PaymentSettings />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="security" element={<SecuritySettings />} />
                    <Route path="verify-id" element={<VerifyID />} />
                </Route>
            </Routes>
        </>
    );
}
