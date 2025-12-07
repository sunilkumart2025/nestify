
import { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AMENITY_CATEGORIES } from '../../lib/amenities';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AmenitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: any;
    onSuccess: () => void;
}

export function AmenitiesModal({ isOpen, onClose, room, onSuccess }: AmenitiesModalProps) {
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [customAmenity, setCustomAmenity] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(AMENITY_CATEGORIES[0].id);

    useEffect(() => {
        if (room?.amenities) {
            setSelectedAmenities(room.amenities);
        } else {
            setSelectedAmenities([]);
        }
    }, [room]);

    const toggleAmenity = (item: string) => {
        if (selectedAmenities.includes(item)) {
            setSelectedAmenities(selectedAmenities.filter(a => a !== item));
        } else {
            setSelectedAmenities([...selectedAmenities, item]);
        }
    };

    const addCustomAmenity = () => {
        if (!customAmenity.trim()) return;
        if (!selectedAmenities.includes(customAmenity.trim())) {
            setSelectedAmenities([...selectedAmenities, customAmenity.trim()]);
            toast.success("Added custom amenity");
        }
        setCustomAmenity('');
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('rooms')
                .update({ amenities: selectedAmenities })
                .eq('id', room.id);

            if (error) throw error;
            toast.success("Amenities updated successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!room) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Amenities: Room ${room.room_number}`}>
            <div className="h-[60vh] flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2">
                    {/* Categories Tabs - Mobile Friendly Loop */}
                    <div className="flex flex-wrap gap-2 mb-4 sticky top-0 bg-white z-10 py-2 border-b">
                        {AMENITY_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === cat.id
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat.title.split(' ')[0]} {/* Show Icon/First Word */}
                            </button>
                        ))}
                    </div>

                    {AMENITY_CATEGORIES.map(category => (
                        <div key={category.id} className={activeTab === category.id ? 'block' : 'hidden'}>
                            <h3 className="font-bold text-slate-900 mb-3">{category.title}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                                {category.items.map(item => (
                                    <div
                                        key={item}
                                        onClick={() => toggleAmenity(item)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedAmenities.includes(item)
                                                ? 'bg-green-50 border-green-200 text-green-700'
                                                : 'border-slate-100 hover:border-slate-300 text-slate-600'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedAmenities.includes(item) ? 'bg-green-500 border-green-500' : 'border-slate-300'
                                            }`}>
                                            {selectedAmenities.includes(item) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Custom Section */}
                    <div className="mt-4 pt-4 border-t">
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Add Custom Amenity</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. Smart TV"
                                value={customAmenity}
                                onChange={(e) => setCustomAmenity(e.target.value)}
                            />
                            <Button onClick={addCustomAmenity} variant="outline" size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        {/* Show Selected (Custom Only mainly, or all) */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {selectedAmenities
                                .filter(a => !AMENITY_CATEGORIES.some(c => c.items.includes(a)))
                                .map(item => (
                                    <span key={item} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                                        {item}
                                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => toggleAmenity(item)} />
                                    </span>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t mt-auto flex justify-end gap-3 bg-white">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} isLoading={isLoading}>Save Amenities</Button>
                </div>
            </div>
        </Modal>
    );
}
