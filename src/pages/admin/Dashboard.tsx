
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

import { PaymentSettings } from './PaymentSettings';
import { VerifyID } from './VerifyID';
import { AuditLogs } from './AuditLogs';
import { AdminFeedback } from './Feedback';

export function AdminDashboard() {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="rooms" element={<AdminRooms />} />
                <Route path="tenures" element={<AdminTenures />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="maintenance" element={<AdminMaintenance />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="analysis" element={<AdminAnalysis />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="payments" element={<PaymentSettings />} />
                <Route path="verify-id" element={<VerifyID />} />
            </Route>
        </Routes>
    );
}
