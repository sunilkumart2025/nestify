import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Plus, Briefcase, PieChart, Receipt } from 'lucide-react';
import { AddExpenseModal } from '../../components/admin/expenses/AddExpenseModal';
import { VendorModal } from '../../components/admin/expenses/VendorModal';
import { ExpenseLogTable } from '../../components/admin/expenses/ExpenseLogTable';
import { VendorListTable } from '../../components/admin/expenses/VendorListTable';
import { ExpenseReports } from '../../components/admin/expenses/ExpenseReports';

export function Expenses() {
    const [activeTab, setActiveTab] = useState<'expenses' | 'vendors' | 'reports'>('expenses');
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0); // To trigger re-fetches

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
                    <p className="text-slate-600">Track spending, manage vendors, and analyze profits.</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'vendors' ? (
                        <Button onClick={() => setIsVendorModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Vendor
                        </Button>
                    ) : activeTab === 'expenses' ? (
                        <Button onClick={() => setIsExpenseModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Log Expense
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'expenses'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Receipt className="h-4 w-4" />
                        Expenses
                    </button>
                    <button
                        onClick={() => setActiveTab('vendors')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'vendors'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Briefcase className="h-4 w-4" />
                        Vendors
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'reports'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <PieChart className="h-4 w-4" />
                        P&L Analysis
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'expenses' && <ExpenseLogTable key={refreshTrigger} />}
                {activeTab === 'vendors' && <VendorListTable key={refreshTrigger} />}
                {activeTab === 'reports' && <ExpenseReports key={refreshTrigger} />}
            </div>

            {/* Modals */}
            <AddExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSuccess={handleRefresh}
            />
            <VendorModal
                isOpen={isVendorModalOpen}
                onClose={() => setIsVendorModalOpen(false)}
                onSuccess={handleRefresh}
            />
        </div>
    );
}
