import { PaymentSettings } from '../../components/admin/PaymentSettings';

export function PayoutSettings() {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Gateway Settings</h1>
                <p className="text-slate-500">Configure how you receive payments from tenants.</p>
            </div>

            <PaymentSettings />
        </div>
    );
}
