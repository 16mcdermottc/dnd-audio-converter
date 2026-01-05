import React, { useState, useEffect } from 'react';
import { Highlight, Quote, Persona } from '../types';
import { X, Save, User as UserIcon } from 'lucide-react';

interface EditItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Highlight | Quote | null;
    personas: Persona[];
    onSave: (updatedItem: Highlight | Quote) => Promise<void>;
}

export default function EditItemModal({ isOpen, onClose, item, personas, onSave }: EditItemModalProps) {
    const [text, setText] = useState('');
    const [personaId, setPersonaId] = useState<number | undefined>(undefined);
    const [speakerName, setSpeakerName] = useState<string>(''); // Only for quotes
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (item) {
            setText(item.text);
            setPersonaId(item.persona_id);
            if ('speaker_name' in item) {
                setSpeakerName(item.speaker_name || '');
            }
        }
    }, [item]);

    if (!isOpen || !item) return null;

    const isQuote = 'speaker_name' in item;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = { ...item, text, persona_id: personaId };
            if (isQuote) {
                (updated as Quote).speaker_name = speakerName || undefined; // Handle empty string
            }
            await onSave(updated);
            onClose();
        } catch (error) {
            console.error("Failed to save item", error);
            alert("Failed to save changes.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        Edit {isQuote ? 'Quote' : 'Highlight'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Content</label>
                        <textarea 
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 min-h-[100px]"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assigned Persona</label>
                        <div className="relative">
                            <select 
                                value={personaId || ''}
                                onChange={e => setPersonaId(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white appearance-none focus:outline-none focus:border-purple-500"
                            >
                                <option value="">(None / General)</option>
                                {personas.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <UserIcon className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {isQuote && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Speaker Name (Override)</label>
                            <input 
                                type="text"
                                value={speakerName}
                                onChange={e => setSpeakerName(e.target.value)}
                                placeholder="E.g. Random Guard #3"
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">Leave blank to use Persona's name.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50"
                        >
                            <Save size={18} className="mr-2" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
