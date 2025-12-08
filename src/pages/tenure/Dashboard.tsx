
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

export function TenureDashboard() {
    return (
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
                <Route path="calendar" element={<TenureCalendar />} />
                <Route path="digital-id" element={<DigitalID />} />
                <Route path="profile" element={<TenureProfile />} />
            </Route>
        </Routes>
    );
}
