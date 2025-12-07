import { } from 'react';
import { MoreVertical, Edit, Trash2, Info, Wind, Fan, Bed, Settings } from 'lucide-react';
import type { Room } from '../../lib/types';
import { formatCurrency } from '../../lib/utils';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface RoomCardProps {
    room: Room;
    onEdit: (room: Room) => void;
    onDelete: (room: Room) => void;
    onViewDetails: (room: Room) => void;
    onAmenities: (room: Room) => void;
}

export function RoomCard({ room, onEdit, onDelete, onViewDetails, onAmenities }: RoomCardProps) {
    const occupancyPercentage = ((room.occupancy || 0) / room.capacity) * 100;

    let statusColor = 'bg-green-500';
    if (occupancyPercentage >= 100) statusColor = 'bg-red-500';
    else if (occupancyPercentage >= 50) statusColor = 'bg-yellow-500';

    const TypeIcon = room.type === 'AC' ? Wind : room.type === 'Non-AC' ? Fan : Bed;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <TypeIcon className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Room {room.room_number}</h3>
                        <p className="text-sm text-slate-500">{room.type}</p>
                    </div>
                </div>

                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                        <MoreVertical className="h-5 w-5" />
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="px-1 py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onEdit(room)}
                                            className={`${active ? 'bg-primary text-white' : 'text-slate-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onViewDetails(room)}
                                            className={`${active ? 'bg-primary text-white' : 'text-slate-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <Info className="mr-2 h-4 w-4" />
                                            Details
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onAmenities(room)}
                                            className={`${active ? 'bg-primary text-white' : 'text-slate-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <Settings className="mr-2 h-4 w-4" />
                                            Amenities
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                            <div className="px-1 py-1">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onDelete(room)}
                                            className={`${active ? 'bg-red-500 text-white' : 'text-red-600'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Occupancy</span>
                    <span className="font-medium text-slate-900">{room.occupancy || 0} / {room.capacity}</span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${statusColor} transition-all duration-500`}
                        style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                    />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Rent/Month</span>
                    <span className="font-bold text-slate-900">{formatCurrency(room.price)}</span>
                </div>
            </div>
        </div>
    );
}
