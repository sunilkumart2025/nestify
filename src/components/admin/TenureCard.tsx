import { Fragment } from 'react';
import { MoreVertical, Edit, Info, Mail, Phone, Home } from 'lucide-react';
import type { Tenure } from '../../lib/types';
import { Menu, Transition } from '@headlessui/react';

interface TenureCardProps {
    tenure: Tenure;
    onEdit: (tenure: Tenure) => void;
    onViewDetails: (tenure: Tenure) => void;
}

export function TenureCard({ tenure, onEdit, onViewDetails }: TenureCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                        {tenure.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{tenure.full_name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tenure.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {tenure.status.charAt(0).toUpperCase() + tenure.status.slice(1)}
                        </span>
                        {/* Trust Score Badge */}
                        {tenure.trust_score !== undefined && (
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tenure.trust_score >= 70 ? 'bg-green-50 text-green-700 border-green-200' :
                                    tenure.trust_score >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                {tenure.trust_score >= 70 ? '🛡️' : tenure.trust_score >= 40 ? '⚠️' : '🚫'} Score: {tenure.trust_score}
                            </span>
                        )}
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
                                            onClick={() => onEdit(tenure)}
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
                                            onClick={() => onViewDetails(tenure)}
                                            className={`${active ? 'bg-primary text-white' : 'text-slate-900'
                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                        >
                                            <Info className="mr-2 h-4 w-4" />
                                            Profile
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            </div>

            <div className="space-y-3">
                <div className="flex items-center text-sm text-slate-600">
                    <Mail className="h-4 w-4 mr-2 text-slate-400" />
                    {tenure.email}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                    {tenure.phone}
                </div>
                <div className="flex items-center text-sm text-slate-600">
                    <Home className="h-4 w-4 mr-2 text-slate-400" />
                    {tenure.room ? `Room ${tenure.room.room_number} (${tenure.room.type})` : 'No Room Assigned'}
                </div>
            </div>
        </div>
    );
}
