import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, ThumbsDown, ThumbsUp, Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Highlight } from '../types';
import { MasonryGrid } from '../components/common/MasonryGrid';

const API_URL = 'http://localhost:8000';

export default function HighlightList() {
    const { id } = useParams();
    const campaignId = id ? parseInt(id) : null;
    const queryClient = useQueryClient();

    const [isCreating, setIsCreating] = useState(false);
    const [editingItem, setEditingItem] = useState<Highlight | null>(null);
    const [formData, setFormData] = useState<Partial<Highlight>>({ text: '', type: 'high' });
    const [search, setSearch] = useState('');

    const fetchHighlights = async () => {
        const res = await fetch(`${API_URL}/highlights/?campaign_id=${campaignId}`);
        if (!res.ok) throw new Error('Failed to fetch highlights');
        return res.json();
    };

    const { data: highlights = [], isLoading } = useQuery<Highlight[]>({
        queryKey: ['highlights', campaignId],
        queryFn: fetchHighlights,
        enabled: !!campaignId
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<Highlight>) => {
            const res = await fetch(`${API_URL}/highlights/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, campaign_id: campaignId })
            });
            if (!res.ok) throw new Error('Failed to create highlight');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['highlights', campaignId] });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({id, data}: {id: number, data: Partial<Highlight>}) => {
            const res = await fetch(`${API_URL}/highlights/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update highlight');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['highlights', campaignId] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (highlight: Highlight) => {
            if(!confirm("Delete this highlight?")) return;
            const res = await fetch(`${API_URL}/highlights/${highlight.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete highlight');
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highlights', campaignId] })
    });

    const resetForm = () => {
        setIsCreating(false);
        setEditingItem(null);
        setFormData({ text: '', type: 'high' });
    };

    const handleEdit = (item: Highlight) => {
        setEditingItem(item);
        setFormData(item);
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = () => {
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    // Filter by search term (case-insensitive match on text or name)
    const searchLower = search.toLowerCase().trim();
    const filtered = searchLower 
        ? highlights.filter(h => 
            h.text?.toLowerCase().includes(searchLower) || 
            h.name?.toLowerCase().includes(searchLower)
        )
        : highlights;

    const highPoints = filtered.filter(h => h.type === 'high');
    const lowPoints = filtered.filter(h => h.type === 'low');

    const renderCard = (item: Highlight) => (
        <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl hover:bg-slate-800 transition-all group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 rounded px-2 py-1">
                <button onClick={() => handleEdit(item)} className="text-slate-400 hover:text-white p-1"><Pencil size={14} /></button>
                <button onClick={() => deleteMutation.mutate(item)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={14} /></button>
            </div>
            <div className="flex items-start gap-3">
                <div className="min-w-[20px] pt-1">
                    {item.type === 'high' 
                        ? <ThumbsUp className="text-green-400" size={20} /> 
                        : <ThumbsDown className="text-red-400" size={20} />
                    }
                </div>
                <div>
                   {/* Name Prefix Logic */}
                   {item.name ? (
                       <span className="text-slate-200 leading-relaxed">
                           <span className={`font-bold ${item.type === 'high' ? 'text-green-300' : 'text-red-300'}`}>{item.name}</span> {item.text.charAt(0).toLowerCase() + item.text.slice(1)}
                       </span>
                   ) : (
                       <p className="text-slate-200 leading-relaxed">{item.text}</p>
                   )}
                </div>
            </div>
        </div>
    );

    if (isLoading) return <div className="p-12 text-center text-slate-500">Loading Highlights...</div>;

    return (
        <div className="py-8 px-8 w-full mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link to={`/campaigns/${campaignId}`} className="text-slate-400 hover:text-white flex items-center mb-2 transition-colors">
                        <ArrowLeft size={16} className="mr-2" /> Back to Campaign
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-amber-400" />
                        Campaign Highlights
                    </h1>
                    <p className="text-slate-400 mt-1">The highest highs and lowest lows of your adventure.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search highlights..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-purple-500 w-64 transition-all"
                        />
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button 
                        onClick={() => { setIsCreating(!isCreating); setEditingItem(null); setFormData({ text: '', type: 'high' }); }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/20 transition-all"
                    >
                        {isCreating ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                        {isCreating ? "Cancel" : "Add New"}
                    </button>
                </div>
            </div>

            {/* Form Area */}
            {isCreating && (
                <div className="mb-8 bg-slate-800 border border-slate-700 rounded-xl p-6 animate-in slide-in-from-top-4 max-w-2xl mx-auto shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-4">{editingItem ? 'Edit Highlight' : 'New Highlight'}</h2>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                            <select 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData?.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as 'high' | 'low' })}
                            >
                                <option value="high">High Point (Highlight)</option>
                                <option value="low">Low Point</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                            <textarea 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none min-h-[100px] focus:ring-2 focus:ring-purple-500"
                                value={formData?.text || ''}
                                onChange={e => setFormData({ ...formData, text: e.target.value })}
                                placeholder="What happened?"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={resetForm} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleSave} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                {/* Left Column: Highlights */}
                <div className="pr-0 lg:pr-4">
                    <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
                        <ThumbsUp size={20} /> Highlights
                    </h2>
                    <MasonryGrid<Highlight> items={highPoints} renderItem={renderCard} maxColumns={2} />
                    {highPoints.length === 0 && <p className="text-slate-600 italic">No highlights yet.</p>}
                </div>

                {/* Right Column: Low Points */}
                <div className="pl-0 lg:pl-4 pt-8 lg:pt-0">
                    <h2 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
                        <ThumbsDown size={20} /> Low Points
                    </h2>
                    <MasonryGrid<Highlight> items={lowPoints} renderItem={renderCard} maxColumns={2} />
                    {lowPoints.length === 0 && <p className="text-slate-600 italic">No low points yet.</p>}
                </div>
            </div>
        </div>
    );
}
