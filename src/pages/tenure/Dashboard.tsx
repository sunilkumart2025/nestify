
import { Routes, Route } from 'react-router-dom';
import { TenureLayout } from '../../components/layouts/TenureLayout';
import { TenureHome } from './Home';
import { TenurePayments } from './Payments';
import { TenureMessages } from './Messages';
import { TenureProfile } from './Profile';
import { TenureComplaints } from './Complaints';
import { DigitalID } from './DigitalID';
import { RoomInfo } from './RoomInfo';
import { TenureFeedback } from './Feedback';
import { Roommates } from './Roommates';
import { TenureNotifications } from './Notifications';
import { TenureCalendar } from './Calendar';
import { TenureCommunity } from './Community';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { VerificationPopup } from '../../components/common/VerificationPopup';

export function TenureDashboard() {
    const [showVerifyPopup, setShowVerifyPopup] = useState(false);

    useEffect(() => {
        const checkVerification = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase.from('tenures').select('nestid_status').eq('id', user.id).single();
            if (data && data.nestid_status !== 'verified') {
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
                userType="tenure"
            />
            <Routes>
                <Route element={<TenureLayout />}>
                    <Route index element={<TenureHome />} />

                    <Route path="payments" element={<TenurePayments />} />
                    <Route path="complaints" element={<TenureComplaints />} />
                    <Route path="messages" element={<TenureMessages />} />
                    <Route path="room-info" element={<RoomInfo />} />
                    <Route path="roommates" element={<Roommates />} />
                    <Route path="feedback" element={<TenureFeedback />} />
                    <Route path="notifications" element={<TenureNotifications />} />
                    <Route path="community" element={<TenureCommunity />} />
                    <Route path="calendar" element={<TenureCalendar />} />
                    <Route path="digital-id" element={<DigitalID />} />
                    <Route path="profile" element={<TenureProfile />} />
                </Route>
            </Routes>
        </>
    );
}
