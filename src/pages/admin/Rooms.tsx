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