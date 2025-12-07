// ... imports
import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Download } from 'lucide-react'; // Added Icons
import { Button } from '../../components/ui/Button';
import { RoomCard } from '../../components/admin/RoomCard';
import { AddRoomModal } from '../../components/admin/AddRoomModal';
import { RoomDetailsModal } from '../../components/admin/RoomDetailsModal';
import { AmenitiesModal } from '../../components/admin/AmenitiesModal'; // Added
import { supabase } from '../../lib/supabase';
import type { Room } from '../../lib/types';
import { toast } from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<Room | null>(null);
    const [viewingRoom, setViewingRoom] = useState<Room | null>(null);

    // Amenities State
    const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
    const [selectedRoomForAmenities, setSelectedRoomForAmenities] = useState<Room | null>(null);

    const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // ... fetchRooms (same)
    const fetchRooms = async () => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('rooms')
                .select(`*, tenures:tenures(count)`)
                .eq('admin_id', user.id)
                .order('room_number', { ascending: true });

            if (error) throw error;

            const transformedRooms = data.map((room: any) => ({
                ...room,
                occupancy: room.tenures?.[0]?.count || 0
            }));

            setRooms(transformedRooms);
        } catch (error: any) {
            toast.error('Failed to load rooms');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleDelete = async () => {
        if (!deleteConfirmRoom) return;
        try {
            const { error } = await supabase.from('rooms').delete().eq('id', deleteConfirmRoom.id);
            if (error) throw error;
            toast.success('Room deleted successfully');
            fetchRooms();
            setDeleteConfirmRoom(null);
        } catch (error: any) {
            toast.error('Failed to delete room');
        }
    };

    const handleViewDetails = (room: Room) => {
        setViewingRoom(room);
    };

    const handleExport = () => {
        if (!rooms.length) return toast.error('No data');
        const headers = ['Room Number', 'Type', 'Price', 'Capacity', 'Occupancy'];
        const csvContent = [headers.join(','), ...rooms.map(r => [r.room_number, r.type, r.price, r.capacity, r.occupancy].join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Nestify_Rooms_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('Export downloaded');
    };

    // --- Premium PDF Generator ---
    const handleDownloadPremium = async (room: any) => {
        const doc = new jsPDF();

        // Fetch Admin Info for Header
        const { data: { user } } = await supabase.auth.getUser();
        const { data: admin } = await supabase.from('admins').select('*').eq('id', user?.id).single();
        const hostelName = admin?.hostel_name || 'Nestify Hostel'; // Fallback
        const address = admin?.hostel_address || 'Address not listed';
        const contact = admin?.phone || '';

        // HEADER
        doc.setFillColor(37, 99, 235); // Primary Blue
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(hostelName.toUpperCase(), 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(address, 105, 30, { align: 'center' });

        // ROOM TITLE
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(`ROOM ${room.room_number}`, 14, 55);
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(1.5);
        doc.line(14, 59, 60, 59);

        // SPECS TABLE
        const rentAmount = `Rs. ${room.price}/month`; // Assuming price field exists on room from fetched data
        const type = room.type === 'ac' ? 'AC Room' : 'Non-AC Room';

        autoTable(doc, {
            startY: 65,
            head: [['Property', 'Details']],
            body: [
                ['Room Type', type],
                ['Capacity', `${room.capacity} Persons`],
                ['Monthly Rent', rentAmount],
                ['Floor', room.floor_number || 'N/A'],
                ['Current Occupancy', `${room.occupancy} / ${room.capacity}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 11, cellPadding: 4, textColor: [50, 50, 50] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });

        // AMENITIES SECTION
        const startY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.setFont('helvetica', 'bold');
        doc.text('INCLUDED AMENITIES', 14, startY);

        if (room.amenities && room.amenities.length > 0) {
            let x = 14;
            let y = startY + 10;
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);

            room.amenities.forEach((item: string, index: number) => {
                // Bullet
                doc.setFillColor(37, 99, 235);
                doc.circle(x, y - 1, 1.5, 'F');
                doc.text(item, x + 5, y);

                // 2-Column Grid
                if (index % 2 === 0) {
                    x = 110;
                } else {
                    x = 14;
                    y += 10;
                }
            });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');
            doc.text('No specific amenities listed.', 14, startY + 10);
        }

        // FOOTER
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Nestify HMS', 105, pageHeight - 10, { align: 'center' });

        doc.save(`Room_${room.room_number}_Overview.pdf`);
    };


    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filterStatus === 'all' ? true :
                filterStatus === 'occupied' ? (room.occupancy || 0) > 0 :
                    (room.occupancy || 0) === 0; // vacant

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Room Management</h1>
                    <p className="text-slate-600">Manage your hostel rooms and occupancy</p>
                </div>
                <Button onClick={() => { setEditingRoom(null); setIsAddModalOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Room
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Button variant="outline" className="sm:w-auto" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                        <Filter className="mr-2 h-4 w-4" />
                        {filterStatus === 'all' ? 'All Rooms' : filterStatus === 'occupied' ? 'Occupied Only' : 'Vacant Only'}
                    </Button>
                    {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden">
                            <button onClick={() => { setFilterStatus('all'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">All Rooms</button>
                            <button onClick={() => { setFilterStatus('occupied'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Occupied Only</button>
                            <button onClick={() => { setFilterStatus('vacant'); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">Vacant Only</button>
                        </div>
                    )}
                </div>
                <Button variant="outline" className="sm:w-auto" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export All
                </Button>
            </div>

            {/* Room Grid */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredRooms.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No rooms found. Add your first room!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRooms.map((room) => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            onEdit={(r) => { setEditingRoom(r); setIsAddModalOpen(true); }}
                            onDelete={(r) => setDeleteConfirmRoom(r)}
                            onViewDetails={handleViewDetails}
                            onAmenities={(r) => { setSelectedRoomForAmenities(r); setShowAmenitiesModal(true); }}
                        />
                    ))}
                    {/* Wait, adding tool-bar below RoomCard breaks the grid layout if not containerized.
                        Better to edit RoomCard.ts OR just render a custom container.
                        I'll stick to updating AdminRooms logic, and since I can't easily modify RoomCard props in this single step without verifying `RoomCard` file first...
                        I will check RoomCard content in next step and then modify it to accept `onAmenities` and `onDownloadPDF`.
                    */}
                </div>
            )}

            {/* Custom Amenities Action Buttons Injection (TEMPORARY: until RoomCard updated) --> 
                Actually, I'll update RoomCard in next step. For now, this file expects RoomCard to accept extra props? 
                If typescript errors, I'll fix in next step. I'll allow "any" for now or just pass them.
            */}

            <AmenitiesModal
                isOpen={showAmenitiesModal}
                onClose={() => setShowAmenitiesModal(false)}
                room={selectedRoomForAmenities}
                onSuccess={fetchRooms}
            />

            <AddRoomModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchRooms}
                roomToEdit={editingRoom}
            />

            <RoomDetailsModal
                isOpen={!!viewingRoom}
                onClose={() => setViewingRoom(null)}
                room={viewingRoom}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirmRoom}
                onClose={() => setDeleteConfirmRoom(null)}
                title="Delete Room"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete Room <span className="font-bold">{deleteConfirmRoom?.room_number}</span>?
                        This action cannot be undone and will remove all associated data.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setDeleteConfirmRoom(null)}>Cancel</Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white shadow-red-500/25"
                            onClick={handleDelete}
                        >
                            Delete Room
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
