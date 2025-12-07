import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Phone, Mail, FileText, User, Calendar, Home } from 'lucide-react';
import type { Tenure } from '../../lib/types';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

interface TenureProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenure: Tenure | null;
}

export function TenureProfileModal({ isOpen, onClose, tenure }: TenureProfileModalProps) {
    if (!tenure) return null;

    const handleDownloadProfile = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Tenure Profile: ${tenure.full_name}`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Email: ${tenure.email}`, 14, 32);
        doc.text(`Phone: ${tenure.phone}`, 14, 38);
        doc.text(`Status: ${tenure.status}`, 14, 44);
        doc.text(`Assigned Room: ${tenure.room ? tenure.room.room_number : 'None'}`, 14, 50);
        doc.text(`Joined: ${new Date(tenure.created_at).toLocaleDateString()}`, 14, 56);

        doc.save(`${tenure.full_name.replace(/\s+/g, '_')}_profile.pdf`);
        toast.success('Profile downloaded');
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-slate-100">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary" />
                                        Tenant Profile
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center mb-8">
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-3xl mb-4 border-4 border-white shadow-lg">
                                        {tenure.full_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">{tenure.full_name}</h2>
                                    <span className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${tenure.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {tenure.status.charAt(0).toUpperCase() + tenure.status.slice(1)}
                                    </span>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                                        <Mail className="h-5 w-5 text-slate-400 mr-3" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                                            <p className="text-slate-900 font-medium">{tenure.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                                        <Phone className="h-5 w-5 text-slate-400 mr-3" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Phone</p>
                                            <p className="text-slate-900 font-medium">{tenure.phone}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                                        <Home className="h-5 w-5 text-slate-400 mr-3" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Room</p>
                                            <p className="text-slate-900 font-medium">
                                                {tenure.room ? `Room ${tenure.room.room_number} (${tenure.room.type})` : 'No Room Assigned'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                                        <Calendar className="h-5 w-5 text-slate-400 mr-3" />
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Joined</p>
                                            <p className="text-slate-900 font-medium">{new Date(tenure.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <a
                                        href={`tel:${tenure.phone}`}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                    >
                                        <Phone className="h-6 w-6 mb-1" />
                                        <span className="text-xs font-bold">Call</span>
                                    </a>

                                    <a
                                        href={`mailto:${tenure.email}`}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        <Mail className="h-6 w-6 mb-1" />
                                        <span className="text-xs font-bold">Email</span>
                                    </a>

                                    <button
                                        onClick={handleDownloadProfile}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                    >
                                        <FileText className="h-6 w-6 mb-1" />
                                        <span className="text-xs font-bold">PDF</span>
                                    </button>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
