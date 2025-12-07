import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Users, Wind, Fan, Bed } from 'lucide-react';
import type { Room } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

interface RoomDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: Room | null;
}

interface TenantDetails {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    created_at: string;
}

export function RoomDetailsModal({ isOpen, onClose, room }: RoomDetailsModalProps) {
    const [tenants, setTenants] = useState<TenantDetails[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isOpen && room) {
            fetchTenants();
        } else {
            setTenants([]);
        }
    }, [isOpen, room]);

    const fetchTenants = async () => {
        if (!room) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tenures')
                .select('id, full_name, email, phone, created_at')
                .eq('room_id', room.id)
                .eq('status', 'active');

            if (error) throw error;
            setTenants(data || []);
        } catch (error) {
            console.error('Error fetching tenants:', error);
            toast.error('Failed to load tenant details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadLog = async () => {
        if (!room) return;
        setIsDownloading(true);

        try {
            const doc = new jsPDF();

            // Fetch Admin/Hostel Details
            const { data: { user } } = await supabase.auth.getUser();
            const { data: admin } = await supabase.from('admins').select('*').eq('id', user?.id).single();
            const hostelName = admin?.hostel_name || 'Nestify Hostel';
            const address = admin?.hostel_address || 'Address not listed';

            // --- HEADER ---
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, 210, 45, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(hostelName.toUpperCase(), 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(address, 105, 30, { align: 'center' });
            doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 105, 38, { align: 'center' });

            // --- TITLE ---
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(`ROOM ${room.room_number} REPORT`, 14, 60);

            // --- SPECS GRID ---
            const occupancy = room.occupancy || 0;
            const status = occupancy >= room.capacity ? "FULL" : "AVAILABLE";

            autoTable(doc, {
                startY: 65,
                head: [['Room Details', 'Status']],
                body: [
                    [`Type: ${(room.type || '').toLowerCase() === 'ac' ? 'AC' : 'Non-AC'}\nFloor: ${room.floor_number || 'N/A'}\nPrice: ${formatCurrency(room.price)}/mo`,
                    `Capacity: ${room.capacity}\nOccupancy: ${occupancy}\nStatus: ${status}`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 4, valign: 'middle' },
                columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 'auto' } }
            });

            // --- AMENITIES SECTION ---
            let yPos = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('Included Amenities', 14, yPos);

            if (room.amenities && room.amenities.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(60, 70, 80);

                const items = room.amenities;
                let x = 14;
                let y = yPos + 8;

                items.forEach((item: string, i: number) => {
                    doc.text(`• ${item}`, x, y);
                    if (i % 2 !== 0) {
                        x = 14;
                        y += 6;
                    } else {
                        x = 110;
                    }
                });
                yPos = y + 10;
            } else {
                doc.setFontSize(10);
                doc.setTextColor(150, 150, 150);
                doc.text('(No amenities listed)', 14, yPos + 8);
                yPos += 15;
            }

            // --- TENANTS TABLE ---
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text('Active Occupants', 14, yPos);

            const tenantRows = tenants.map(t => [
                t.full_name,
                t.phone,
                t.email,
                new Date(t.created_at).toLocaleDateString()
            ]);

            if (tenantRows.length > 0) {
                autoTable(doc, {
                    startY: yPos + 5,
                    head: [['Name', 'Phone', 'Email', 'Joined']],
                    body: tenantRows,
                    theme: 'striped',
                    headStyles: { fillColor: [37, 99, 235] },
                    styles: { fontSize: 9 }
                });
            } else {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text("No active tenants found.", 14, yPos + 8);
            }

            // Footer
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Generated by Nestify HMS', 105, pageHeight - 10, { align: 'center' });

            doc.save(`Room_${room.room_number}_Report.pdf`);
            toast.success('Report downloaded successfully');

        } catch (error) {
            console.error('PDF Error:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    if (!room) return null;

    const TypeIcon = room.type === 'AC' ? Wind : room.type === 'Non-AC' ? Fan : Bed;
    const occupancy = room.occupancy || 0;
    const isFull = occupancy >= room.capacity;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Room ${room.room_number} Details`}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Room Stats */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Type</p>
                            <p className="font-bold text-slate-900">{room.type}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Occupancy</p>
                            <p className={`font-bold ${isFull ? 'text-red-600' : 'text-slate-900'}`}>
                                {occupancy} <span className="text-slate-400">/</span> {room.capacity}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <span className="font-bold text-lg leading-none">₹</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Price</p>
                            <p className="font-bold text-slate-900">{formatCurrency(room.price)}/mo</p>
                        </div>
                    </div>
                </div>

                {/* Tenants Table */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" /> Current Occupants
                        </h4>
                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                            {tenants.length} Active
                        </span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        {isLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : tenants.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Contact</th>
                                            <th className="px-4 py-3 text-right">Join Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tenants.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-900">{t.full_name}</td>
                                                <td className="px-4 py-3 space-y-0.5">
                                                    <div className="text-slate-700">{t.phone}</div>
                                                    <div className="text-slate-400 text-xs">{t.email}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500 bg-slate-50/50">
                                No active occupants found in this room.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        onClick={handleDownloadLog}
                        isLoading={isDownloading}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800"
                    >
                        <Download className="h-4 w-4" />
                        Download Log PDF
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
